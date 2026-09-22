"""Publication tests use real files, fd walks and the deployed CLI entry point."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / 'src/automation/site/publication_gate.py'
spec = importlib.util.spec_from_file_location('publication_gate', SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def sha(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def approval(path: str, content: bytes = b'public example') -> dict:
    return {'path': path, 'sha256': sha(content), 'reviewedBy': 'reviewer-fixture',
            'reviewedAt': '2026-09-22T00:00:00Z', 'reason': 'Reviewed public fixture, no operational values'}


class SiteCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / 'site'
        self.site.mkdir()
        self.put('index.html', b'<!doctype html><title>Docs</title>')
        self.manifest = self.root / 'approvals.json'
        self.report = self.root / 'report.json'
        self.write_manifest([])

    def put(self, path: str, content: bytes = b'public example') -> Path:
        file = self.site / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(content)
        return file

    def write_manifest(self, rows: list, **changes) -> Path:
        self.manifest.write_text(json.dumps({'schemaVersion': 1, 'scope': 'extra-assets',
                                             'approvals': rows, **changes}))
        return self.manifest

    def check(self, rows: list | None = None) -> dict:
        if rows is not None:
            self.write_manifest(rows)
        return gate.audit(self.site, gate.load_approvals(self.manifest))

    def codes(self, report: dict) -> set[str]:
        return {finding['code'] for finding in report['findings']}

    def cli(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)],
                              capture_output=True, text=True, timeout=10)


class InventoryAndApprovalTests(SiteCase):
    def test_existing_document_assets_remain_unchanged(self):
        self.put('javascripts/ai-client.js', b'// browser code')
        self.put('hub/catalog.json', b'{"docs":[]}')
        self.put('security/ssh/index.html', b'Published documentation')
        before = {p.relative_to(self.site).as_posix(): p.read_bytes() for p in self.site.rglob('*') if p.is_file()}
        result = self.check()
        self.assertTrue(result['gatePassed'])
        self.assertEqual(result['fileCount'], 4)
        self.assertEqual(before, {p.relative_to(self.site).as_posix(): p.read_bytes() for p in self.site.rglob('*') if p.is_file()})

    def test_extra_requires_explicit_review_even_with_no_manifest_entries(self):
        self.put('extra/docker/compose.yaml')
        result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertIn('UNREVIEWED_EXTRA_ASSET', self.codes(result))

    def test_extra_namespace_cannot_be_case_aliased(self):
        self.put('Extra/code.txt')
        self.assertIn('INVALID_EXTRA_NAMESPACE', self.codes(self.check()))

    def test_extra_root_cannot_be_an_unreviewed_file(self):
        self.put('extra')
        self.assertIn('INVALID_EXTRA_ROOT', self.codes(self.check()))

    def test_failed_scan_remains_incomplete_with_truncated_findings(self):
        for i in range(4):
            self.put(f'credentials-{i}.secret')
        with patch.object(gate, 'MAX_FINDINGS', 1):
            result = self.check()
        self.assertFalse(result['scanComplete'])
        self.assertFalse(result['gatePassed'])
        self.assertTrue(result['findingsTruncated'])

    def test_check_binds_exact_manifest_bytes_in_report(self):
        result = self.check()
        self.assertEqual(result['reviewManifestSha256'], sha(self.manifest.read_bytes()))
        self.assertIsNone(gate.audit(self.site)['reviewManifestSha256'])

    def test_exact_path_and_digest_pass(self):
        self.put('extra/docker/compose.yaml')
        result = self.check([approval('extra/docker/compose.yaml')])
        self.assertTrue(result['gatePassed'])
        self.assertEqual(result['extraAssetCount'], 1)

    def test_edited_file_needs_new_review(self):
        self.put('extra/docker/compose.yaml', b'changed')
        self.assertIn('APPROVAL_HASH_MISMATCH', self.codes(self.check([approval('extra/docker/compose.yaml')]))))

    def test_new_sibling_is_not_implicitly_approved(self):
        self.put('extra/docker/compose.yaml')
        self.put('extra/docker/new-config.yaml')
        result = self.check([approval('extra/docker/compose.yaml')])
        self.assertEqual(result['findingCount'], 1)
        self.assertEqual(result['findings'][0]['path'], 'extra/docker/new-config.yaml')

    def test_copying_approved_bytes_to_new_path_does_not_approve_it(self):
        self.put('extra/a.txt')
        self.put('extra/b.txt')
        result = self.check([approval('extra/a.txt')])
        self.assertIn('UNREVIEWED_EXTRA_ASSET', self.codes(result))

    def test_missing_approved_file_is_stale(self):
        self.assertIn('STALE_APPROVAL', self.codes(self.check([approval('extra/a.txt')]))))

    def test_generated_extra_indexes_also_require_review(self):
        self.put('extra/docker/index.html')
        self.assertFalse(self.check()['gatePassed'])
        self.assertTrue(self.check([approval('extra/docker/index.html')])['gatePassed'])

    def test_inventory_is_never_approval(self):
        self.put('extra/example.txt')
        inventory = gate.audit(self.site)
        self.assertEqual(inventory['kind'], 'publication-candidates')
        self.assertFalse(inventory['gatePassed'])
        self.assertTrue(inventory['scanComplete'])
        self.manifest.write_text(json.dumps(inventory))
        with self.assertRaisesRegex(gate.GateError, 'INVALID_MANIFEST_SCHEMA'):
            gate.load_approvals(self.manifest)

    def test_inventory_contains_hashes_but_not_contents(self):
        sentinel = b'sensitive-content-canary-must-not-appear'
        self.put('extra/source.txt', sentinel)
        report = gate.audit(self.site)
        self.assertNotIn(sentinel.decode(), json.dumps(report))
        row = next(row for row in report['files'] if row['path'] == 'extra/source.txt')
        self.assertEqual(row['sha256'], sha(sentinel))

    def test_mock_dashboard_blocked_everywhere(self):
        for path in ['extra/api-key-dashboard.html', 'archive/API-KEY-DASHBOARD.HTML', 'extra/api-key-dashboard/index.html']:
            with self.subTest(path=path):
                file = self.put(path)
                self.assertIn('MOCK_ADMIN_SURFACE', self.codes(self.check()))
                file.unlink()

    def test_forbidden_names_blocked_without_reading_bytes(self):
        for name in ['.env', '.env.example', 'ops.env.local.secret', 'service.authjs-secret', 'backup.rdb',
                     'owner.sqlite3', 'client.key', 'key.pem', 'id_ed25519', 'credentials.json', 'run.log']:
            with self.subTest(name=name):
                file = self.put(name, b'do-not-read-secret-canary')
                result = self.check()
                self.assertIn('SENSITIVE_ARTIFACT_NAME', self.codes(result))
                self.assertEqual(result['bytesHashed'], (self.site / 'index.html').stat().st_size)
                self.assertNotIn('do-not-read-secret-canary', json.dumps(result))
                file.unlink()

    def test_hidden_and_runtime_directories_are_rejected(self):
        self.put('.git/config')
        self.put('extra/node_modules/module/index.js')
        self.put('extra/.cache/output')
        result = self.check()
        self.assertIn('PRIVATE_OR_RUNTIME_PATH', self.codes(result))
        self.assertIn('HIDDEN_ARTIFACT', self.codes(result))
        self.assertEqual(result['fileCount'], 1)

    def test_hosting_dot_paths_remain_supported(self):
        self.put('.nojekyll', b'')
        self.put('.well-known/security.txt')
        self.assertTrue(self.check()['gatePassed'])

    def test_empty_or_wrong_root_fails(self):
        (self.site / 'index.html').unlink()
        self.assertIn('MISSING_SITE_INDEX', self.codes(self.check()))
        self.assertIn('UNREADABLE_SITE_ROOT', self.codes(gate.audit(self.root / 'absent', {})))

    def test_unicode_and_spaces_survive_exact_review(self):
        path = 'extra/문서/공개 예시.md'
        self.put(path)
        self.assertTrue(self.check([approval(path)])['gatePassed'])

    def test_case_collisions_are_rejected(self):
        self.put('docs/Foo.html')
        self.put('docs/foo.html')
        self.assertIn('CASE_COLLISION', self.codes(self.check()))

    def test_noncanonical_filesystem_names_are_rejected(self):
        for name in ['extra/x%2ey', 'extra/x?y', 'extra/x#y', 'extra/e\u0301.md', 'extra/a\\b.txt', 'extra/x\ny']:
            with self.subTest(name=name):
                file = self.put(name)
                self.assertIn('INVALID_PATH', self.codes(self.check()))
                file.unlink()

    def test_digest_is_stable_then_changes_with_file_bytes(self):
        first = self.check()['siteDigest']
        self.assertEqual(first, self.check()['siteDigest'])
        self.put('index.html', b'new source')
        self.assertNotEqual(first, self.check()['siteDigest'])

    def test_digest_binds_paths_as_well_as_content(self):
        file = self.put('a.txt')
        first = self.check()['siteDigest']
        file.rename(self.site / 'b.txt')
        self.assertNotEqual(first, self.check()['siteDigest'])


class ManifestTests(SiteCase):
    def test_missing_unreadable_or_non_json_manifest_fails(self):
        self.manifest.unlink()
        with self.assertRaisesRegex(gate.GateError, 'UNREADABLE_MANIFEST'):
            gate.load_approvals(self.manifest)
        self.manifest.write_bytes(b'not-json-sensitive-canary')
        with self.assertRaises(gate.GateError) as caught:
            gate.load_approvals(self.manifest)
        self.assertNotIn('canary', str(caught.exception))

    def test_duplicate_json_keys_rejected(self):
        self.manifest.write_text('{"schemaVersion":1,"scope":"extra-assets","approvals":[],"approvals":[]}')
        with self.assertRaisesRegex(gate.GateError, 'DUPLICATE_JSON_KEY'):
            gate.load_approvals(self.manifest)

    def test_schema_is_closed(self):
        cases = [[], {}, {'schemaVersion': True, 'scope': 'extra-assets', 'approvals': []},
                 {'schemaVersion': 1, 'scope': '*', 'approvals': []},
                 {'schemaVersion': 1, 'scope': 'extra-assets', 'approvals': [], 'allowAll': True},
                 {'schemaVersion': 1, 'scope': 'extra-assets', 'approvals': {}}]
        for value in cases:
            with self.subTest(value=value):
                self.manifest.write_text(json.dumps(value))
                with self.assertRaises(gate.GateError):
                    gate.load_approvals(self.manifest)

    def test_no_wildcards_traversal_encoded_or_outside_paths(self):
        for path in ['extra/*', '../extra/a', '/extra/a', 'extra/../a', 'extra//a', 'extra/a/', 'extra/a?b',
                     'extra/x%2fsecret', 'extra/x#y', 'extra/a\\b', 'C:/extra/x', 'index.html', 'extra']:
            with self.subTest(path=path):
                self.write_manifest([approval(path)])
                with self.assertRaises(gate.GateError):
                    gate.load_approvals(self.manifest)

    def test_hard_deny_cannot_be_overridden_by_review(self):
        for path in ['extra/api-key-dashboard.html', 'extra/.env', 'extra/id_rsa', 'extra/db.sqlite']:
            with self.subTest(path=path):
                self.write_manifest([approval(path)])
                with self.assertRaisesRegex(gate.GateError, 'FORBIDDEN_APPROVAL'):
                    gate.load_approvals(self.manifest)

    def test_duplicate_approvals_and_case_aliases_rejected(self):
        for second in ['extra/a.txt', 'extra/A.txt']:
            self.write_manifest([approval('extra/a.txt'), approval(second)])
            with self.assertRaisesRegex(gate.GateError, 'DUPLICATE_APPROVAL'):
                gate.load_approvals(self.manifest)

    def test_approval_fields_are_closed(self):
        for row in [None, {}, {**approval('extra/a'), 'approved': True},
                    {k: v for k, v in approval('extra/a').items() if k != 'reason'}]:
            self.write_manifest([row])
            with self.assertRaises(gate.GateError):
                gate.load_approvals(self.manifest)

    def test_digest_requires_exact_sha256(self):
        for digest in [None, 'f' * 63, 'z' * 64, 'A' * 64, '*', True]:
            self.write_manifest([{**approval('extra/a'), 'sha256': digest}])
            with self.assertRaisesRegex(gate.GateError, 'INVALID_APPROVAL_DIGEST'):
                gate.load_approvals(self.manifest)

    def test_review_metadata_is_required_and_validated(self):
        for field, value in [('reviewedBy', ''), ('reason', ' '), ('reviewedBy', 'x\ny'),
                             ('reason', 'x' * 1001), ('reviewedAt', '2026-02-30T00:00:00Z'),
                             ('reviewedAt', 'today'), ('reviewedAt', '2026-09-22')]:
            with self.subTest(field=field, value=value):
                self.write_manifest([{**approval('extra/a'), field: value}])
                with self.assertRaisesRegex(gate.GateError, 'INVALID_REVIEW_METADATA'):
                    gate.load_approvals(self.manifest)

    def test_manifest_size_and_entry_limits(self):
        with patch.object(gate, 'MAX_MANIFEST_BYTES', 8):
            with self.assertRaisesRegex(gate.GateError, 'MANIFEST_TOO_LARGE'):
                gate.load_approvals(self.manifest)
        self.write_manifest([approval('extra/a'), approval('extra/b')])
        with patch.object(gate, 'MAX_ENTRIES', 1):
            with self.assertRaisesRegex(gate.GateError, 'INVALID_MANIFEST_SCHEMA'):
                gate.load_approvals(self.manifest)

    def test_symlink_manifest_and_symlink_parent_fail(self):
        real = self.root / 'real.json'
        self.manifest.rename(real)
        self.manifest.symlink_to(real)
        with self.assertRaises(gate.GateError):
            gate.load_approvals(self.manifest)
        alias = self.root / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(gate.GateError):
            gate.load_approvals(alias / 'real.json')

    def test_hardlinked_manifest_rejected(self):
        os.link(self.manifest, self.root / 'duplicate.json')
        with self.assertRaisesRegex(gate.GateError, 'INVALID_MANIFEST_FILE'):
            gate.load_approvals(self.manifest)


class FilesystemBoundaryTests(SiteCase):
    def test_symlink_files_and_directories_are_not_followed(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (outside / 'secret').write_bytes(b'external-secret-canary')
        (self.site / 'alias.txt').symlink_to(outside / 'secret')
        (self.site / 'linked-directory').symlink_to(outside, target_is_directory=True)
        result = self.check()
        self.assertEqual(sum(f['code'] == 'SYMLINK' for f in result['findings']), 2)
        self.assertEqual(result['fileCount'], 1)
        self.assertNotIn('external-secret-canary', json.dumps(result))

    def test_site_root_symlink_or_symlink_ancestor_fail(self):
        alias = self.root / 'alias'
        alias.symlink_to(self.site, target_is_directory=True)
        self.assertIn('UNREADABLE_SITE_ROOT', self.codes(gate.audit(alias, {})))
        outer = self.root / 'parent-alias'
        outer.symlink_to(self.root, target_is_directory=True)
        self.assertIn('UNREADABLE_SITE_ROOT', self.codes(gate.audit(outer / 'site', {})))

    def test_fifo_does_not_block_the_walk(self):
        os.mkfifo(self.site / 'pipe')
        self.assertIn('SPECIAL_FILE', self.codes(self.check()))

    def test_hardlink_is_not_a_public_copy(self):
        target = self.root / 'outside.txt'
        target.write_bytes(b'not-public')
        os.link(target, self.site / 'hardlink.txt')
        result = self.check()
        self.assertIn('HARDLINK', self.codes(result))
        self.assertEqual(result['fileCount'], 1)

    def test_file_and_total_byte_limits(self):
        self.put('large.txt', b'x' * 100)
        with patch.object(gate, 'MAX_FILE_BYTES', 50):
            self.assertIn('FILE_BYTE_LIMIT', self.codes(self.check()))
        with patch.object(gate, 'MAX_TOTAL_BYTES', 50):
            self.assertIn('TOTAL_BYTE_LIMIT', self.codes(self.check()))

    def test_tree_entry_and_depth_limits(self):
        self.put('a/b/c/d.txt')
        with patch.object(gate, 'MAX_ENTRIES', 2):
            self.assertIn('TREE_ENTRY_LIMIT', self.codes(self.check()))
        with patch.object(gate, 'MAX_DEPTH', 1):
            self.assertIn('TREE_DEPTH_LIMIT', self.codes(self.check()))

    def test_reports_bound_findings_without_hiding_failure(self):
        for i in range(10):
            self.put(f'extra/{i}.txt')
        with patch.object(gate, 'MAX_FINDINGS', 3):
            result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertEqual(result['findingCount'], 10)
        self.assertEqual(len(result['findings']), 3)
        self.assertTrue(result['findingsTruncated'])

    def test_replaced_file_between_stat_and_open_is_rejected(self):
        victim = self.put('race.txt')
        secret = self.root / 'secret'
        secret.write_bytes(b'external-data')
        actual_open = gate.os.open
        def racing_open(name, flags, *args, **kwargs):
            if name == 'race.txt' and 'dir_fd' in kwargs:
                victim.unlink()
                victim.symlink_to(secret)
            return actual_open(name, flags, *args, **kwargs)
        with patch.object(gate.os, 'open', side_effect=racing_open):
            result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertIn('UNREADABLE_OR_REPLACED_ENTRY', self.codes(result))
        self.assertNotIn(sha(b'external-data'), json.dumps(result))

    def test_replaced_directory_between_stat_and_open_is_rejected(self):
        self.put('a/file.txt')
        outside = self.root / 'external'
        outside.mkdir()
        (outside / 'file.txt').write_bytes(b'outside-tree')
        actual_open = gate.os.open
        def racing_open(name, flags, *args, **kwargs):
            if name == 'a' and 'dir_fd' in kwargs:
                (self.site / 'a/file.txt').unlink()
                (self.site / 'a').rmdir()
                (self.site / 'a').symlink_to(outside, target_is_directory=True)
            return actual_open(name, flags, *args, **kwargs)
        with patch.object(gate.os, 'open', side_effect=racing_open):
            result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertIn('UNREADABLE_OR_REPLACED_ENTRY', self.codes(result))
        self.assertNotIn(sha(b'outside-tree'), json.dumps(result))

    def test_named_file_replaced_after_open_is_rejected(self):
        victim = self.put('race.txt')
        actual_fdopen = gate.os.fdopen
        class ReplacementReader:
            def __init__(self, stream):
                self.stream = stream
                self.changed = False
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return self.stream.__exit__(*args)
            def fileno(self):
                return self.stream.fileno()
            def read(self, n):
                result = self.stream.read(n)
                if result and not self.changed:
                    self.changed = True
                    victim.unlink()
                    victim.write_bytes(b'new bytes')
                return result
        def fdopen(fd, mode, *args, **kwargs):
            stream = actual_fdopen(fd, mode, *args, **kwargs)
            if os.readlink(f'/proc/self/fd/{fd}') == str(victim):
                return ReplacementReader(stream)
            return stream
        with patch.object(gate.os, 'fdopen', side_effect=fdopen):
            result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertIn('TREE_CHANGED_DURING_SCAN', self.codes(result))

    def test_read_error_is_a_block_not_a_success(self):
        actual_stat = gate.os.stat
        def denied(path, *args, **kwargs):
            if path == 'index.html' and kwargs.get('dir_fd') is not None:
                raise PermissionError('private-error-canary')
            return actual_stat(path, *args, **kwargs)
        with patch.object(gate.os, 'stat', side_effect=denied):
            result = self.check()
        self.assertFalse(result['gatePassed'])
        self.assertNotIn('private-error-canary', json.dumps(result))


class CLITests(SiteCase):
    def test_check_passes_with_reviewed_actual_files(self):
        self.put('extra/code.js')
        self.write_manifest([approval('extra/code.js')])
        done = self.cli('check', '--site', self.site, '--manifest', self.manifest, '--report', self.report)
        self.assertEqual(done.returncode, 0, done.stderr + done.stdout)
        self.assertTrue(json.loads(self.report.read_text())['gatePassed'])
        self.assertEqual(stat.S_IMODE(self.report.stat().st_mode), 0o600)
        self.assertFalse(list(self.root.glob('.publication-*.tmp')))

    def test_check_returns_one_and_private_report_on_unreviewed_file(self):
        self.put('extra/private-scope-title.txt', b'private-content-canary')
        done = self.cli('check', '--site', self.site, '--manifest', self.manifest, '--report', self.report)
        self.assertEqual(done.returncode, 1)
        self.assertIn('UNREVIEWED_EXTRA_ASSET', done.stdout)
        self.assertNotIn('private-scope-title', done.stdout + done.stderr)
        self.assertNotIn('private-content-canary', self.report.read_text() + done.stdout + done.stderr)
        self.assertEqual(self.put('other.txt').read_bytes(), b'public example')

    def test_check_requires_manifest(self):
        done = self.cli('check', '--site', self.site)
        self.assertEqual(done.returncode, 1)
        self.assertIn('MANIFEST_REQUIRED', done.stdout)

    def test_inventory_is_successful_scan_but_never_green_release(self):
        self.put('extra/a')
        done = self.cli('inventory', '--site', self.site, '--report', self.report)
        self.assertEqual(done.returncode, 0)
        value = json.loads(self.report.read_text())
        self.assertEqual(value['kind'], 'publication-candidates')
        self.assertFalse(value['gatePassed'])
        done = self.cli('check', '--site', self.site, '--manifest', self.report)
        self.assertEqual(done.returncode, 1)
        self.assertIn('INVALID_MANIFEST_SCHEMA', done.stdout)

    def test_inventory_rejects_approval_argument(self):
        done = self.cli('inventory', '--site', self.site, '--manifest', self.manifest)
        self.assertEqual(done.returncode, 1)
        self.assertIn('INVENTORY_CANNOT_APPROVE', done.stdout)

    def test_report_inside_site_is_never_created(self):
        path = self.site / 'publication-report.json'
        done = self.cli('check', '--site', self.site, '--manifest', self.manifest, '--report', path)
        self.assertEqual(done.returncode, 1)
        self.assertIn('REPORT_INSIDE_SITE', done.stdout)
        self.assertFalse(path.exists())

    def test_report_through_alias_into_site_is_not_created(self):
        alias = self.root / 'public-alias'
        alias.symlink_to(self.site, target_is_directory=True)
        done = self.cli('inventory', '--site', self.site, '--report', alias / 'leak.json')
        self.assertEqual(done.returncode, 1)
        self.assertFalse((self.site / 'leak.json').exists())

    def test_manifest_inside_site_is_not_accepted(self):
        path = self.site / 'reviews.json'
        path.write_bytes(self.manifest.read_bytes())
        done = self.cli('check', '--site', self.site, '--manifest', path)
        self.assertEqual(done.returncode, 1)
        self.assertIn('MANIFEST_INSIDE_SITE', done.stdout)

    def test_report_cannot_overwrite_manifest(self):
        before = self.manifest.read_bytes()
        done = self.cli('check', '--site', self.site, '--manifest', self.manifest, '--report', self.manifest)
        self.assertEqual(done.returncode, 1)
        self.assertIn('REPORT_OVERWRITES_MANIFEST', done.stdout)
        self.assertEqual(self.manifest.read_bytes(), before)

    def test_report_symlink_is_not_followed(self):
        target = self.root / 'do-not-modify.txt'
        target.write_bytes(b'untouched')
        self.report.symlink_to(target)
        done = self.cli('inventory', '--site', self.site, '--report', self.report)
        self.assertEqual(done.returncode, 1)
        self.assertIn('REPORT_WRITE_FAILED', done.stdout)
        self.assertEqual(target.read_bytes(), b'untouched')

    def test_invalid_manifest_replaces_old_green_report_with_failure(self):
        self.report.write_text('{"gatePassed":true}')
        self.manifest.write_text('{bad-json-sensitive-canary')
        done = self.cli('check', '--site', self.site, '--manifest', self.manifest, '--report', self.report)
        self.assertEqual(done.returncode, 1)
        value = json.loads(self.report.read_text())
        self.assertFalse(value['gatePassed'])
        self.assertNotIn('sensitive-canary', json.dumps(value) + done.stderr)

    def test_report_write_failure_is_nonzero(self):
        done = self.cli('inventory', '--site', self.site, '--report', self.root / 'absent' / 'report.json')
        self.assertEqual(done.returncode, 1)
        self.assertIn('REPORT_WRITE_FAILED', done.stdout)

    def test_rejected_fixture_is_never_removed(self):
        mock = self.put('extra/api-key-dashboard.html')
        env = self.put('extra/.env')
        before = [mock.read_bytes(), env.read_bytes()]
        done = self.cli('inventory', '--site', self.site, '--report', self.report)
        self.assertEqual(done.returncode, 1)
        self.assertEqual([mock.read_bytes(), env.read_bytes()], before)

    def test_full_smoke_review_edit_and_rereview(self):
        file = self.put('extra/compose.yaml')
        self.write_manifest([approval('extra/compose.yaml')])
        cmd = ('check', '--site', self.site, '--manifest', self.manifest, '--report', self.report)
        self.assertEqual(self.cli(*cmd).returncode, 0)
        file.write_bytes(b'review required after edit')
        self.assertEqual(self.cli(*cmd).returncode, 1)
        self.write_manifest([approval('extra/compose.yaml', file.read_bytes())])
        self.assertEqual(self.cli(*cmd).returncode, 0)


class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (ROOT / '.github/workflows/deploy-pages.yml').read_text()

    def test_gate_after_build_mutations_before_upload(self):
        steps = ['Build MkDocs site', 'Copy extra static content', 'Create CNAME file',
                 'Create cache headers configuration', 'Verify build output', 'Inventory finished public assets',
                 'Require reviewed extra assets before Pages upload', 'Setup Pages', 'Upload artifact']
        positions = [self.workflow.index(name) for name in steps]
        self.assertEqual(positions, sorted(positions))

    def test_gate_cannot_be_silently_skipped(self):
        text = self.workflow.split('- name: Require reviewed extra assets before Pages upload')[1].split('- name: Setup Pages')[0]
        self.assertIn('publication_gate.py check', text)
        for bypass in ['continue-on-error', 'if:', '|| true', 'exit 0']:
            self.assertNotIn(bypass, text)
        self.assertIn('--manifest plan/publication/extra-assets.json', text)
        self.assertIn('runner.temp', text)

    def test_prior_ai_and_document_test_commands_remain(self):
        for command in ['node --test src/qa/public-ai-config.test.js src/qa/ai-client.test.js',
                        'python -m unittest discover -s apps/docs-site/hooks/tests -v',
                        'cargo test --locked -q', 'npm --prefix src run qa:test', 'mkdocs build --clean --strict']:
            self.assertIn(command, self.workflow)
        self.assertIn('python -m unittest discover -s src/qa/publication -v', self.workflow)

    def test_repository_policy_grants_no_unverified_approvals(self):
        self.assertEqual(gate.load_approvals(ROOT / 'plan/publication/extra-assets.json'), {})


if __name__ == '__main__':
    unittest.main()
