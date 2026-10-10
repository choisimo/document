"""Real exporter/CLI tests on isolated repositories; no network or rsync needed."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
AUTOMATION = ROOT / 'src/automation/site'
sys.path.insert(0, str(AUTOMATION))
import export_public_assets as export
import publication_gate as gate


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def approval(path: str, data: bytes) -> dict[str, str]:
    return {'path': 'extra/' + path, 'sha256': digest(data), 'reviewedBy': 'test-fixture',
            'reviewedAt': '2026-09-22T00:00:00Z', 'reason': 'Explicit synthetic test approval, not production review.'}


class ExportFixture:
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='export-contract-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.site = self.repo / 'dist/site'
        self.output = self.site / 'extra'
        self.output.mkdir(parents=True)
        (self.site / 'index.html').write_text('<h1>Existing MkDocs site</h1>')
        self.manifest = self.repo / 'plan/publication/extra-assets.json'
        self.manifest.parent.mkdir(parents=True)
        self.rows = []
        self.maps = [export.Mapping('src/examples', 'code', True)]
        self.roots = []
        self.write_manifest()

    def write_manifest(self):
        self.manifest.write_text(json.dumps({'schemaVersion': 1, 'scope': 'extra-assets', 'approvals': self.rows}))

    def source(self, name, data=b'public fixture\n'):
        file = self.repo / 'src/examples' / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        return file

    def approve(self, name, data=b'public fixture\n'):
        self.rows.append(approval('code/' + name, data))
        self.write_manifest()

    def run_export(self, planning=False):
        return export.export_assets(self.repo, self.output, self.manifest, self.maps, self.roots, planning=planning)


class ExportTests(ExportFixture, unittest.TestCase):
    def test_empty_approvals_read_no_sources_and_write_nothing(self):
        self.source('.env', b'private-token-canary')
        scan = export.os.scandir
        def private_stage_cleanup_only(path):
            actual = Path(os.readlink(f'/proc/self/fd/{path}')) if isinstance(path, int) else Path(path)
            self.assertFalse(actual.resolve().is_relative_to(self.repo), 'Repository trees must not be enumerated')
            return scan(path)
        with mock.patch.object(export.os, 'scandir', side_effect=private_stage_cleanup_only), \
                mock.patch.object(export.Reads, 'reviewed', side_effect=AssertionError('No asset reads without approvals')):
            report = self.run_export()
        self.assertEqual(report['installed'], 0)
        self.assertFalse(report['releaseApproved'])
        self.assertEqual(list(self.output.iterdir()), [])

    def test_only_exact_approved_source_bytes_exported(self):
        self.source('a.py')
        self.source('b.py', b'not-reviewed')
        self.approve('a.py')
        self.assertEqual(self.run_export()['installed'], 1)
        self.assertEqual((self.output / 'code/a.py').read_bytes(), b'public fixture\n')
        self.assertFalse((self.output / 'code/b.py').exists())

    def test_changed_source_fails_before_any_output(self):
        self.source('a.py')
        self.source('z.py', b'changed')
        self.approve('a.py')
        self.approve('z.py')
        with self.assertRaisesRegex(gate.GateError, 'ASSET_REVIEW_HASH_MISMATCH'):
            self.run_export()
        self.assertEqual(list(self.output.iterdir()), [])

    def test_missing_approved_source_fails(self):
        self.approve('absent.py')
        with self.assertRaisesRegex(gate.GateError, 'MISSING_APPROVED_ASSET'):
            self.run_export()

    def test_source_symlink_is_refused(self):
        target = self.source('real.py')
        (target.parent / 'link.py').symlink_to(target)
        self.approve('link.py')
        with self.assertRaisesRegex(gate.GateError, 'UNSAFE_OR_UNREADABLE_ASSET'):
            self.run_export()

    def test_source_symlink_parent_is_refused(self):
        target = self.root / 'outside'
        target.mkdir()
        (target / 'a.py').write_bytes(b'public fixture\n')
        (self.repo / 'src').mkdir()
        (self.repo / 'src/examples').symlink_to(target, target_is_directory=True)
        self.approve('a.py')
        with self.assertRaisesRegex(gate.GateError, 'UNSAFE_OR_UNREADABLE_ASSET'):
            self.run_export()

    def test_source_hardlink_is_refused(self):
        file = self.source('a.py')
        os.link(file, file.parent / 'b.py')
        self.approve('a.py')
        with self.assertRaisesRegex(gate.GateError, 'UNSAFE_ASSET_TYPE'):
            self.run_export()

    def test_source_fifo_is_refused_without_blocking(self):
        directory = self.repo / 'src/examples'
        directory.mkdir(parents=True)
        os.mkfifo(directory / 'fifo.txt')
        self.approve('fifo.txt')
        with self.assertRaisesRegex(gate.GateError, 'UNSAFE_ASSET_TYPE'):
            self.run_export()

    def test_renamed_private_source_cannot_be_approved(self):
        self.source('.env')
        self.maps = [export.Mapping('src/examples', 'code', True)]
        self.rows = [approval('code/.env', b'public fixture\n')]
        self.write_manifest()
        with self.assertRaises(gate.GateError):
            self.run_export()
        with self.assertRaisesRegex(gate.GateError, 'FORBIDDEN_MAPPING'):
            export.Mapping('src/examples/.env', 'code/public.txt', False)

    def test_mock_approval_remains_forbidden(self):
        self.source('api-key-dashboard.html')
        self.approve('api-key-dashboard.html')
        with self.assertRaisesRegex(gate.GateError, 'FORBIDDEN_APPROVAL'):
            self.run_export()

    def test_output_conflict_does_not_overwrite_or_delete(self):
        self.source('a.py')
        target = self.output / 'code/a.py'
        target.parent.mkdir()
        target.write_bytes(b'existing-build-content')
        self.approve('a.py')
        with self.assertRaisesRegex(gate.GateError, 'ASSET_REVIEW_HASH_MISMATCH'):
            self.run_export()
        self.assertEqual(target.read_bytes(), b'existing-build-content')

    def test_idempotent_sync_preserves_existing_inode(self):
        self.source('a.py')
        self.approve('a.py')
        self.run_export()
        target = self.output / 'code/a.py'
        before = target.stat().st_ino
        self.assertEqual(self.run_export()['installed'], 0)
        self.assertEqual(target.stat().st_ino, before)

    def test_existing_builder_index_is_preserved(self):
        self.source('a.py')
        self.approve('a.py')
        index = self.output / 'code/index.html'
        index.parent.mkdir()
        index.write_bytes(b'<h1>Rendered documentation</h1>')
        self.rows.append(approval('code/index.html', index.read_bytes()))
        self.write_manifest()
        self.roots = ['code']
        self.run_export()
        self.assertEqual(index.read_bytes(), b'<h1>Rendered documentation</h1>')

    def test_unreviewed_existing_outputs_are_not_deleted_or_endorsed(self):
        file = self.output / 'unreviewed.txt'
        file.write_bytes(b'not-reviewed')
        self.run_export()
        self.assertTrue(file.exists())
        self.assertFalse(gate.audit(self.site, gate.load_approvals(self.manifest))['gatePassed'])

    def test_generated_indexes_require_separate_approval_before_writes(self):
        self.source('nested/a.py')
        self.approve('nested/a.py')
        self.roots = ['code']
        with self.assertRaisesRegex(gate.GateError, 'UNREVIEWED_GENERATED_INDEX'):
            self.run_export()
        self.assertEqual(list(self.output.iterdir()), [])

    def test_plan_is_read_only_and_is_not_approval(self):
        self.source('nested/a.py')
        self.approve('nested/a.py')
        self.roots = ['code']
        before = self.manifest.read_bytes()
        report = self.run_export(planning=True)
        self.assertEqual(report['kind'], 'export-candidates')
        self.assertEqual(report['installed'], 0)
        self.assertFalse(report['releaseApproved'])
        self.assertEqual(len(report['files']), 3)
        self.assertEqual(self.manifest.read_bytes(), before)
        self.assertEqual(list(self.output.iterdir()), [])
        self.manifest.write_text(json.dumps(report))
        with self.assertRaisesRegex(gate.GateError, 'INVALID_MANIFEST_SCHEMA'):
            self.run_export()

    def test_reviewed_sources_and_generated_indexes_pass_end_gate(self):
        self.source('nested/a.py')
        self.approve('nested/a.py')
        self.roots = ['code']
        # Explicit fixture review of the deterministic generated index candidates.
        for row in self.run_export(planning=True)['files']:
            if row['kind'] == 'generated-index':
                approved = approval('unused', b'')
                approved.update(path=row['path'], sha256=row['sha256'])
                self.rows.append(approved)
        self.write_manifest()
        self.assertEqual(self.run_export()['installed'], 3)
        result = gate.audit(self.site, gate.load_approvals(self.manifest))
        self.assertTrue(result['gatePassed'], result['findings'])
        index = (self.output / 'code/index.html').read_text()
        self.assertIn('href="nested/"', index)
        self.assertIn('href="../"', (self.output / 'code/nested/index.html').read_text())

    def test_generated_index_escapes_labels_and_encodes_urls(self):
        name = '<img onerror=x>&"한 글.py'
        result = export.render_index('code', [(name, False)], parent=False).decode()
        self.assertNotIn('<img onerror', result)
        self.assertIn('&lt;img', result)
        self.assertIn('%3Cimg%20onerror', result)
        self.assertIn('&quot;', result)
        self.assertNotIn('href="../"', result)

    def test_generation_is_deterministic(self):
        a = [('b.txt', False), ('a', True)]
        self.assertEqual(export.render_index('code', a, parent=True),
                         export.render_index('code', a[::-1], parent=True))

    def test_unicode_and_spaces_are_supported(self):
        self.source('한 글.py')
        self.approve('한 글.py')
        self.run_export()
        self.assertTrue((self.output / 'code/한 글.py').exists())

    def test_source_exec_and_special_mode_bits_not_copied(self):
        file = self.source('a.py')
        file.chmod(0o4755)
        self.approve('a.py')
        self.run_export()
        target = self.output / 'code/a.py'
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o644)
        self.assertEqual(target.stat().st_nlink, 1)
        self.assertEqual(list(target.parent.glob('.approved-export-*')), [])

    def test_exact_file_mapping(self):
        self.source('README.md')
        self.maps = [export.Mapping('src/examples/README.md', 'code/README.md', False)]
        self.approve('README.md')
        self.run_export()
        self.assertTrue((self.output / 'code/README.md').exists())

    def test_ambiguous_mapping_is_refused(self):
        self.source('nested/a.py')
        self.approve('nested/a.py')
        self.maps.append(export.Mapping('other', 'code/nested', True))
        with self.assertRaisesRegex(gate.GateError, 'AMBIGUOUS_SOURCE_MAPPING'):
            self.run_export()

    def test_duplicate_mapping_is_refused(self):
        self.maps.append(export.Mapping('other', 'CODE', True))
        with self.assertRaisesRegex(gate.GateError, 'DUPLICATE_SOURCE_MAPPING'):
            self.run_export()

    def test_mapping_traversal_and_hidden_names_are_refused(self):
        for source, destination in [('../outside', 'code'), ('src/examples', '../out'),
                                    ('src/.git', 'code'), ('src/examples', 'node_modules')]:
            with self.subTest(source=source, destination=destination), self.assertRaises(gate.GateError):
                export.Mapping(source, destination, True)

    def test_output_overlapping_sources_is_refused(self):
        for path in [self.repo, self.repo.parent, self.repo / 'src', self.repo / 'src/examples/export']:
            self.output = path
            with self.subTest(path=path), self.assertRaises(gate.GateError):
                self.run_export()

    def test_symlink_output_parent_is_refused(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (self.output / 'code').symlink_to(outside, target_is_directory=True)
        self.source('a.py')
        self.approve('a.py')
        with self.assertRaisesRegex(gate.GateError, 'UNSAFE_OR_UNREADABLE_ASSET'):
            self.run_export()
        self.assertEqual(list(outside.iterdir()), [])

    def test_target_appearing_after_preflight_is_not_overwritten(self):
        self.source('a.py')
        self.approve('a.py')
        install = export.install_new
        def race(stage, target):
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b'concurrent-contributor')
            install(stage, target)
        with mock.patch.object(export, 'install_new', side_effect=race), self.assertRaisesRegex(gate.GateError, 'OUTPUT_CHANGED_DURING_EXPORT'):
            self.run_export()
        self.assertEqual((self.output / 'code/a.py').read_bytes(), b'concurrent-contributor')

    def test_file_size_bound(self):
        self.source('a.py', b'12345')
        self.approve('a.py', b'12345')
        with mock.patch.object(gate, 'MAX_FILE_BYTES', 4), self.assertRaisesRegex(gate.GateError, 'FILE_BYTE_LIMIT'):
            self.run_export()

    def test_total_byte_bound(self):
        self.source('a.py', b'12345')
        self.approve('a.py', b'12345')
        with mock.patch.object(gate, 'MAX_TOTAL_BYTES', 4), self.assertRaisesRegex(gate.GateError, 'EXPORT_BYTE_LIMIT'):
            self.run_export()

    def test_generated_byte_bound(self):
        self.source('a.py', b'a')
        self.approve('a.py', b'a')
        self.roots = ['code']
        with mock.patch.object(gate, 'MAX_TOTAL_BYTES', 100), self.assertRaisesRegex(gate.GateError, 'EXPORT_BYTE_LIMIT'):
            self.run_export(planning=True)

    def test_depth_bound(self):
        self.approve('/'.join(['a'] * 66) + '.txt')
        with self.assertRaisesRegex(gate.GateError, 'TREE_DEPTH_LIMIT'):
            self.run_export()

    def test_derived_index_count_bound(self):
        self.source('a/b/c.py')
        self.approve('a/b/c.py')
        self.roots = ['code']
        with mock.patch.object(gate, 'MAX_ENTRIES', 2), self.assertRaisesRegex(gate.GateError, 'EXPORT_ENTRY_LIMIT'):
            self.run_export(planning=True)

    def test_case_colliding_directories_rejected_before_writes(self):
        self.source('A/one.py')
        self.source('a/two.py')
        self.approve('A/one.py')
        self.approve('a/two.py')
        with self.assertRaisesRegex(gate.GateError, 'CASE_COLLISION'):
            self.run_export()
        self.assertEqual(list(self.output.iterdir()), [])

    def test_unknown_builder_asset_must_exist(self):
        self.rows = [approval('index.html', b'builder')]
        self.write_manifest()
        with self.assertRaisesRegex(gate.GateError, 'MISSING_APPROVED_ASSET'):
            self.run_export()
        (self.output / 'index.html').write_bytes(b'builder')
        self.assertEqual(self.run_export()['installed'], 0)

    def test_plan_report_has_no_source_contents(self):
        self.source('a.py', b'private-content-sentinel')
        self.approve('a.py', b'private-content-sentinel')
        self.assertNotIn('private-content-sentinel', json.dumps(self.run_export(planning=True)))

    def test_source_change_during_read_is_detected(self):
        file = self.source('a.py')
        self.approve('a.py')
        original = export.os.fstat
        seen = 0
        def changed(fd):
            nonlocal seen
            result = original(fd)
            if result.st_ino == file.stat().st_ino:
                seen += 1
                if seen == 2:
                    file.write_bytes(b'changed-after-copy')
                    return original(fd)
            return result
        with mock.patch.object(export.os, 'fstat', side_effect=changed), self.assertRaisesRegex(gate.GateError, 'ASSET_CHANGED_DURING_READ'):
            self.run_export()
        self.assertEqual(list(self.output.iterdir()), [])


class CLITests(ExportFixture, unittest.TestCase):
    def cli(self, command='plan', *extra):
        return subprocess.run([sys.executable, str(AUTOMATION / 'export_public_assets.py'), command,
            '--repository', str(self.repo), '--output', str(self.output), '--manifest', str(self.manifest),
            '--directory', 'src/examples', 'code', *map(str, extra)], capture_output=True, text=True, timeout=10)

    def test_cli_failure_does_not_log_paths_or_contents(self):
        self.source('a.py', b'private-error-sentinel')
        self.approve('a.py')
        run = self.cli('sync')
        self.assertEqual(run.returncode, 1)
        self.assertIn('ASSET_REVIEW_HASH_MISMATCH', run.stderr)
        self.assertNotIn(str(self.repo), run.stderr)
        self.assertNotIn('private-error-sentinel', run.stdout + run.stderr)

    def test_cli_report_is_private_and_outside_repository(self):
        report = self.root / 'review.json'
        run = self.cli('plan', '--report', report)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(stat.S_IMODE(report.stat().st_mode), 0o600)
        self.assertFalse(json.loads(report.read_text())['releaseApproved'])

    def test_report_cannot_replace_source_or_manifest(self):
        before = self.manifest.read_bytes()
        for target in [self.manifest, self.repo / 'source.json', self.output / 'report.json']:
            run = self.cli('plan', '--report', target)
            self.assertEqual(run.returncode, 1)
        self.assertEqual(self.manifest.read_bytes(), before)

    def test_failed_plan_replaces_prior_success_report(self):
        report = self.root / 'review.json'
        report.write_text('{"oldSuccess":true}')
        self.approve('missing.py')
        run = self.cli('plan', '--report', report)
        self.assertEqual(run.returncode, 1)
        self.assertEqual(json.loads(report.read_text())['kind'], 'export-failure')


class EntrypointTests(unittest.TestCase):
    def test_shell_preserves_all_mapping_paths(self):
        text = (AUTOMATION / 'sync-extra-assets.sh').read_text()
        expected = [('src/automation', 'scripts'), ('infra/docker', 'docker'), ('infra/configs', 'configs'),
            ('content/rendered', 'project-docs'), ('content/archive/legacy', 'legacy'), ('content/prompts', 'prompts-raw'),
            ('src/mcp', 'mcp'), ('content/notes', 'memo'), ('src/examples/simulator/javascript', 'algorithm-simulator'),
            ('src/examples/data-structures', 'algorithm-code/data-structures'), ('src/examples/architect-code', 'algorithm-code/code'),
            ('src/examples/c-lang', 'algorithm-code/C-lang'), ('src/examples/simulator', 'algorithm-code/simulator')]
        self.assertEqual(re.findall(r'^sync_dir "([^\"]+)" "([^\"]+)"', text, re.M), expected)
        self.assertIn('export_public_assets.py" sync', text)
        self.assertNotIn('rsync', text)
        self.assertNotIn('find ', text)

    def test_real_shell_and_compatibility_wrapper_use_fixed_approval_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            for relative in ['src/automation/site/sync-extra-assets.sh', 'src/automation/site/export_public_assets.py',
                             'src/automation/site/publication_gate.py', 'apps/docs-site/scripts/sync-extra-assets.sh']:
                target = repo / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            manifest = repo / 'plan/publication/extra-assets.json'
            manifest.parent.mkdir(parents=True)
            manifest.write_text('{"schemaVersion":1,"scope":"extra-assets","approvals":[]}')
            secret = repo / 'content/notes/.env'
            secret.parent.mkdir(parents=True)
            secret.write_text('not-exported')
            output = repo / 'dist/site/extra'
            for entry in ['src/automation/site/sync-extra-assets.sh', 'apps/docs-site/scripts/sync-extra-assets.sh']:
                result = subprocess.run(['bash', str(repo / entry), str(output)], capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('installed=0', result.stdout)
                self.assertFalse(output.exists())
            run = subprocess.run(['bash', str(repo / 'src/automation/site/sync-extra-assets.sh'), str(output), 'ignored'], capture_output=True, timeout=10)
            self.assertEqual(run.returncode, 2)


    def test_mkdocs_excludes_mock_and_keeps_original_readme_hook_contract(self):
        config = (ROOT / 'apps/docs-site/mkdocs.yml').read_text()
        block = re.search(r'^exclude_docs: \|\n((?:[ \t]+.*\n)+)', config, re.M).group(1)
        self.assertIn('/extra/api-key-dashboard.html', block)
        self.assertIn('/algorithms/algorithm-architect/README.md', block)
        self.assertIn('  - hooks/preserve_readme.py', config)
        self.assertIn('  - hooks/hub_data.py', config)
        self.assertIn('docs_dir: ../../content/docs', config)

    def test_extra_navigation_no_longer_links_to_mock(self):
        text = (ROOT / 'content/docs/extra/index.md').read_text()
        self.assertNotRegex(text, r'\]\([^)]*api-key-dashboard\.html(?:[#?][^)]*)?\)')
        self.assertIn('[AI 연결과 공개 설정 안내](../tools/documentation/ai-operations.md)', text)
        self.assertTrue((ROOT / 'content/docs/tools/documentation/ai-operations.md').is_file())
        self.assertIn('# 도구와 보조 리소스 {#extra}', text)
        self.assertIn('/extra/algorithm-simulator/index.html', text)
        self.assertIn('docker/stacks/index.md', text)


if __name__ == '__main__':
    unittest.main()
