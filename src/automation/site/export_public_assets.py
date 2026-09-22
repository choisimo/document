#!/usr/bin/env python3
"""Export exact reviewed assets; never enumerate or recursively copy source trees.

The existing shell entrypoint supplies the repository's public path mapping.
`plan` reports candidates but never writes the site or grants approval. `sync`
stages and validates the complete selection before installing any file. Use a
clean, quiescent build tree; an interrupted install is not a release attestation.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import html
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import tempfile
from typing import Any
from urllib.parse import quote
import uuid

import publication_gate as gate


@dataclass(frozen=True)
class Mapping:
    source: str
    destination: str
    directory: bool

    def __post_init__(self) -> None:
        gate.canonical_path(self.source)
        gate.canonical_path(self.destination)
        if max(len(self.source.split('/')), len(self.destination.split('/'))) > gate.MAX_DEPTH:
            raise gate.GateError('TREE_DEPTH_LIMIT')
        if gate.forbidden_reason(self.source) or gate.forbidden_reason('extra/' + self.destination):
            raise gate.GateError('FORBIDDEN_MAPPING')

    def resolve(self, relative: str) -> str | None:
        if self.directory and relative.startswith(self.destination + '/'):
            return self.source + relative[len(self.destination):]
        if not self.directory and relative == self.destination:
            return self.source
        return None


def select_source(relative: str, mappings: list[Mapping]) -> str | None:
    matches = [value for mapping in mappings if (value := mapping.resolve(relative)) is not None]
    if len(matches) > 1:
        raise gate.GateError('AMBIGUOUS_SOURCE_MAPPING')
    return matches[0] if matches else None


def render_index(directory: str, children: list[tuple[str, bool]], *, parent: bool) -> bytes:
    """Only approved candidate names are rendered; HTML and URL contexts differ."""
    route = html.escape('/extra/' + directory, quote=True)
    links = ['    <li><a href="../">..</a></li>'] if parent else []
    for name, is_directory in sorted(children):
        suffix = '/' if is_directory else ''
        href = html.escape(quote(name, safe='') + suffix, quote=True)
        label = html.escape(name + suffix, quote=True)
        links.append(f'    <li><a href="{href}"><code>{label}</code></a></li>')
    return ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n'
            '  <meta charset="utf-8">\n'
            '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'  <title>{route}</title>\n'
            '  <style>\n'
            '    :root { color-scheme: light dark; }\n'
            '    body { font-family: ui-monospace, monospace; margin: 2rem auto; max-width: 960px; padding: 0 1rem; line-height: 1.6; }\n'
            '    h1 { font-size: 1.25rem; }\n'
            '    ul { list-style: none; padding: 0; }\n'
            '    li { margin: .35rem 0; }\n'
            '  </style>\n</head>\n<body>\n'
            f'  <h1>{route}</h1>\n'
            '  <p>검토된 공개 파일 목록입니다.</p>\n  <ul>\n'
            + '\n'.join(links) + '\n  </ul>\n</body>\n</html>\n').encode('utf-8')


class Reads:
    def __init__(self) -> None:
        self.total = 0

    def reviewed(self, path: Path, digest: str, stage: Path | None = None) -> int | None:
        """None means missing, not unreadable. Never follow links or trust stat size."""
        try:
            fd = gate.open_nofollow(path)
        except FileNotFoundError:
            return None
        except OSError:
            raise gate.GateError('UNSAFE_OR_UNREADABLE_ASSET') from None
        actual, size = hashlib.sha256(), 0
        with os.fdopen(fd, 'rb') as stream:
            before = os.fstat(stream.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
                raise gate.GateError('UNSAFE_ASSET_TYPE')
            if before.st_size > gate.MAX_FILE_BYTES:
                raise gate.GateError('FILE_BYTE_LIMIT')
            sink = stage.open('xb') if stage is not None else None
            try:
                while chunk := stream.read(gate.CHUNK_BYTES):
                    size += len(chunk)
                    self.total += len(chunk)
                    if size > gate.MAX_FILE_BYTES or self.total > gate.MAX_TOTAL_BYTES:
                        raise gate.GateError('EXPORT_BYTE_LIMIT')
                    actual.update(chunk)
                    if sink is not None:
                        sink.write(chunk)
                if (size != before.st_size
                        or gate.fingerprint(before) != gate.fingerprint(os.fstat(stream.fileno()))):
                    raise gate.GateError('ASSET_CHANGED_DURING_READ')
                if actual.hexdigest() != digest:
                    raise gate.GateError('ASSET_REVIEW_HASH_MISMATCH')
            finally:
                if sink is not None:
                    sink.close()
        return size


def output_directory(path: Path) -> int:
    """Create/open components using directory descriptors; reject symlink parents."""
    absolute = Path(os.path.abspath(path))
    fd = os.open(absolute.anchor, gate._flags(True))
    try:
        for part in absolute.parts[1:]:
            try:
                os.mkdir(part, mode=0o755, dir_fd=fd)
            except FileExistsError:
                pass
            next_fd = os.open(part, gate._flags(True), dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except BaseException:
        os.close(fd)
        raise


def install_new(stage: Path, target: Path) -> None:
    """No overwrite, even when a target appears after preflight. No source modes."""
    parent = output_directory(target.parent)
    temporary = '.approved-export-' + uuid.uuid4().hex
    created = False
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                     0o600, dir_fd=parent)
        created = True
        with os.fdopen(fd, 'wb') as output, stage.open('rb') as source:
            while chunk := source.read(gate.CHUNK_BYTES):
                output.write(chunk)
            output.flush()
            os.fsync(output.fileno())
            os.fchmod(output.fileno(), 0o644)
        # Link rather than replace: O_EXCL-like installation without exposing a
        # partially written public file. The temporary link is removed below.
        os.link(temporary, target.name, src_dir_fd=parent, dst_dir_fd=parent,
                follow_symlinks=False)
    except FileExistsError:
        raise gate.GateError('OUTPUT_CHANGED_DURING_EXPORT') from None
    finally:
        if created:
            os.unlink(temporary, dir_fd=parent)
        os.close(parent)


def export_assets(repository: Path, output: Path, manifest: Path,
                  mappings: list[Mapping], index_roots: list[str], *, planning: bool = False) -> dict[str, Any]:
    repository = Path(os.path.abspath(repository))
    output = Path(os.path.abspath(output))
    manifest = Path(os.path.abspath(manifest))
    gate.outside_site(manifest, output, 'MANIFEST_INSIDE_OUTPUT')
    if output == repository or output in repository.parents:
        raise gate.GateError('OUTPUT_OVERLAPS_REPOSITORY')
    for mapping in mappings:
        source = repository / mapping.source
        if output == source or output in source.parents or source in output.parents:
            raise gate.GateError('OUTPUT_OVERLAPS_SOURCE')
    for root in index_roots:
        gate.canonical_path(root)
        if gate.forbidden_reason('extra/' + root):
            raise gate.GateError('FORBIDDEN_INDEX_ROOT')
    if len({m.destination.casefold() for m in mappings}) != len(mappings):
        raise gate.GateError('DUPLICATE_SOURCE_MAPPING')
    roots = set(index_roots)
    approvals = gate.load_approvals(manifest)
    reads = Reads()
    existing: set[str] = set()
    candidates: dict[str, dict[str, Any]] = {}
    staged: dict[str, Path] = {}
    with tempfile.TemporaryDirectory(prefix='docs-reviewed-export-') as temporary:
        stage = Path(temporary)
        missing: set[str] = set()
        for asset, digest in sorted(approvals.items()):
            relative = asset[len('extra/'):]
            if len(relative.split('/')) > gate.MAX_DEPTH:
                raise gate.GateError('TREE_DEPTH_LIMIT')
            source = select_source(relative, mappings)
            if source is not None and gate.forbidden_reason(source):
                raise gate.GateError('FORBIDDEN_SOURCE_ASSET')
            present = reads.reviewed(output / relative, digest)
            if present is not None:
                existing.add(relative)
                candidates[relative] = {'sha256': digest, 'bytes': present, 'kind': 'existing'}
            prepared = stage / str(len(staged))
            size = reads.reviewed(repository / source, digest, prepared) if source is not None else None
            if size is not None:
                candidates[relative] = {'sha256': digest, 'bytes': size, 'kind': 'source'}
                # Existing outputs are rechecked but never overwritten.
                staged[relative] = prepared
            elif present is None:
                missing.add(relative)
        directories: set[str] = set()
        for relative in set(candidates) | missing:
            parent = PurePosixPath(relative).parent
            for root in roots:
                while parent.as_posix() == root or parent.as_posix().startswith(root + '/'):
                    directories.add(parent.as_posix())
                    if len(directories) > gate.MAX_ENTRIES:
                        raise gate.GateError('EXPORT_ENTRY_LIMIT')
                    parent = parent.parent
                parent = PurePosixPath(relative).parent
        generated = {directory + '/index.html' for directory in directories} - candidates.keys()
        if missing - generated:
            raise gate.GateError('MISSING_APPROVED_ASSET')
        names = set(candidates) | generated
        if len(names) > gate.MAX_ENTRIES:
            raise gate.GateError('EXPORT_ENTRY_LIMIT')
        folded: dict[str, str] = {}
        children_by_directory: dict[str, dict[str, bool]] = {name: {} for name in directories}
        for name in sorted(names):
            parts = name.split('/')
            for index in range(1, len(parts) + 1):
                prefix = '/'.join(parts[:index])
                if prefix.casefold() in folded and folded[prefix.casefold()] != prefix:
                    raise gate.GateError('CASE_COLLISION')
                folded[prefix.casefold()] = prefix
                if index < len(parts) and prefix in names:
                    raise gate.GateError('ASSET_DIRECTORY_COLLISION')
                if index < len(parts) and prefix in children_by_directory:
                    child = parts[index]
                    if child == 'index.html' and index == len(parts) - 1:
                        continue
                    children_by_directory[prefix][child] = index < len(parts) - 1
        for relative in sorted(generated):
            directory = str(PurePosixPath(relative).parent)
            children = children_by_directory[directory]
            payload = render_index(directory, list(children.items()), parent=directory not in roots)
            reads.total += len(payload)
            if len(payload) > gate.MAX_FILE_BYTES or reads.total > gate.MAX_TOTAL_BYTES:
                raise gate.GateError('EXPORT_BYTE_LIMIT')
            digest = hashlib.sha256(payload).hexdigest()
            if not planning and approvals.get('extra/' + relative) != digest:
                raise gate.GateError('UNREVIEWED_GENERATED_INDEX')
            path = stage / ('index-' + str(len(staged)))
            path.write_bytes(payload)
            staged[relative] = path
            candidates[relative] = {'sha256': digest, 'bytes': len(payload), 'kind': 'generated-index'}
        if len(candidates) > gate.MAX_ENTRIES:
            raise gate.GateError('EXPORT_ENTRY_LIMIT')
        # All sources/indices have now been verified, with no output mutations.
        installed = 0
        if not planning:
            for relative in sorted(existing):
                if reads.reviewed(output / relative, approvals['extra/' + relative]) is None:
                    raise gate.GateError('OUTPUT_CHANGED_DURING_EXPORT')
            for relative, path in sorted(staged.items()):
                if relative not in existing:
                    install_new(path, output / relative)
                    installed += 1
                    if reads.reviewed(output / relative, candidates[relative]['sha256']) is None:
                        raise gate.GateError('OUTPUT_CHANGED_DURING_EXPORT')
        return {'schemaVersion': 1, 'kind': 'export-candidates' if planning else 'reviewed-export',
                'releaseApproved': False, 'installed': installed,
                'reviewManifestSha256': approvals.source_sha256,
                'files': [{'path': 'extra/' + name, **row} for name, row in sorted(candidates.items())]}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['plan', 'sync'])
    parser.add_argument('--repository', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--directory', action='append', nargs=2, default=[], metavar=('SOURCE', 'DEST'))
    parser.add_argument('--file', action='append', nargs=2, default=[], metavar=('SOURCE', 'DEST'))
    parser.add_argument('--index', action='append', default=[])
    parser.add_argument('--report', type=Path)
    args = parser.parse_args(argv)
    report_allowed = False
    try:
        if args.report:
            gate.outside_site(args.report, args.output, 'REPORT_INSIDE_OUTPUT')
            # Do not replace source or approval files with review evidence.
            gate.outside_site(args.report, args.repository, 'REPORT_INSIDE_REPOSITORY')
            if args.report.resolve() == args.manifest.resolve():
                raise gate.GateError('REPORT_OVERWRITES_MANIFEST')
            report_allowed = True
        maps = [Mapping(s, d, True) for s, d in args.directory] + [Mapping(s, d, False) for s, d in args.file]
        report = export_assets(args.repository, args.output, args.manifest, maps, args.index,
                               planning=args.command == 'plan')
        if args.report:
            gate.write_report(args.report, report)
        print(f"Export {args.command}: PASS; candidates={len(report['files'])}; installed={report['installed']}; releaseApproved=false")
        return 0
    except (gate.GateError, OSError, ValueError) as error:
        code = error.code if isinstance(error, gate.GateError) else 'EXPORT_FILESYSTEM_ERROR'
        report = {'schemaVersion': 1, 'kind': 'export-failure', 'releaseApproved': False, 'code': code}
        if args.report and report_allowed:
            try:
                gate.write_report(args.report, report)
            except (gate.GateError, OSError, ValueError):
                code = 'REPORT_WRITE_FAILED'
        print(f'Export {args.command}: BLOCKED; code={code}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
