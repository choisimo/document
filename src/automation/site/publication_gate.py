#!/usr/bin/env python3
"""Read-only gate for a finished MkDocs site and explicitly reviewed /extra assets.

Inventory is NOT approval. No file is copied, removed, served, fetched or executed.
Run after all build mutations and before upload, on a quiescent POSIX build tree.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Any

MAX_MANIFEST_BYTES = 1_048_576
MAX_ENTRIES = 50_000
MAX_DEPTH = 64
MAX_FILE_BYTES = 256 * 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
MAX_FINDINGS = 200
CHUNK_BYTES = 64 * 1024
FORBIDDEN_COMPONENTS = frozenset({
    '.git', '.hg', '.svn', '.ssh', '.aws', '.kube', '.sourcebot', '.pw-runtime',
    '__pycache__', 'node_modules',
})
FORBIDDEN_NAMES = frozenset({
    'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519',
    'credentials', 'credentials.json', 'credentials.yaml', 'credentials.yml',
})
FORBIDDEN_SUFFIXES = (
    '.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.secret',
    '.authjs-secret', '.rdb', '.db', '.sqlite', '.sqlite3', '.pyc', '.log', '.bak', '~',
)


class GateError(Exception):
    """A safe machine-readable error; never include file contents in the message."""
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def canonical_path(value: Any) -> str:
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise GateError('INVALID_PATH')
    if (value != value.strip() or value.startswith('/')
            or any(c in value for c in '\\%?#:*')
            or any(ord(c) < 32 or ord(c) == 127 or 0xD800 <= ord(c) <= 0xDFFF for c in value)
            or unicodedata.normalize('NFC', value) != value
            or any(p in ('', '.', '..') for p in value.split('/'))):
        raise GateError('INVALID_PATH')
    return value


def forbidden_reason(path: str) -> str | None:
    parts = path.casefold().split('/')
    if 'api-key-dashboard' in parts or 'api-key-dashboard.html' in parts:
        return 'MOCK_ADMIN_SURFACE'
    if any(p in FORBIDDEN_COMPONENTS for p in parts):
        return 'PRIVATE_OR_RUNTIME_PATH'
    name = parts[-1]
    if name == '.env' or name.startswith('.env.') or name in FORBIDDEN_NAMES or name.endswith(FORBIDDEN_SUFFIXES):
        return 'SENSITIVE_ARTIFACT_NAME'
    # Hidden build state is not an implicit public asset. These two names have
    # explicit static-hosting uses; contents under extra/ still need approval.
    if any(p.startswith('.') and p not in ('.nojekyll', '.well-known') for p in parts):
        return 'HIDDEN_ARTIFACT'
    return None


def _flags(directory: bool = False) -> int:
    if not all(hasattr(os, name) for name in ('O_NOFOLLOW', 'O_DIRECTORY', 'O_NONBLOCK')):
        raise GateError('UNSUPPORTED_FILESYSTEM_PLATFORM')
    return os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | (os.O_DIRECTORY if directory else 0)


def open_nofollow(path: Path, *, directory: bool = False) -> int:
    """Open every path component without following symlinks (including parents)."""
    absolute = Path(os.path.abspath(path))
    fd = os.open(absolute.anchor, _flags(True))
    try:
        for index, part in enumerate(absolute.parts[1:]):
            last = index == len(absolute.parts) - 2
            next_fd = os.open(part, _flags(directory if last else True), dir_fd=fd)
            os.close(fd)
            fd = next_fd
        return fd
    except BaseException:
        os.close(fd)
        raise


def fingerprint(info: os.stat_result) -> tuple[int, ...]:
    return (info.st_dev, info.st_ino, info.st_mode, info.st_nlink,
            info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise GateError('DUPLICATE_JSON_KEY')
        result[key] = value
    return result


class ReviewedApprovals(dict[str, str]):
    """Validated approval map, bound to the exact manifest bytes read."""
    source_sha256: str


def load_approvals(path: Path) -> ReviewedApprovals:
    """Read a closed schema; candidates, globs and stale digests grant nothing."""
    try:
        fd = open_nofollow(path)
        with os.fdopen(fd, 'rb') as stream:
            before = os.fstat(stream.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
                raise GateError('INVALID_MANIFEST_FILE')
            raw = stream.read(MAX_MANIFEST_BYTES + 1)
            if fingerprint(before) != fingerprint(os.fstat(stream.fileno())):
                raise GateError('MANIFEST_CHANGED_DURING_READ')
        if len(raw) > MAX_MANIFEST_BYTES:
            raise GateError('MANIFEST_TOO_LARGE')
        data = json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object)
    except GateError:
        raise
    except (OSError, UnicodeError, ValueError, RecursionError):
        raise GateError('UNREADABLE_MANIFEST') from None
    if (not isinstance(data, dict) or set(data) != {'schemaVersion', 'scope', 'approvals'}
            or type(data['schemaVersion']) is not int or data['schemaVersion'] != 1
            or data['scope'] != 'extra-assets' or not isinstance(data['approvals'], list)
            or len(data['approvals']) > MAX_ENTRIES):
        raise GateError('INVALID_MANIFEST_SCHEMA')
    result = ReviewedApprovals()
    result.source_sha256 = hashlib.sha256(raw).hexdigest()
    case_paths: set[str] = set()
    for row in data['approvals']:
        if not isinstance(row, dict) or set(row) != {'path', 'sha256', 'reviewedBy', 'reviewedAt', 'reason'}:
            raise GateError('INVALID_APPROVAL_SCHEMA')
        candidate = canonical_path(row['path'])
        if not candidate.startswith('extra/'):
            raise GateError('APPROVAL_OUTSIDE_EXTRA_SCOPE')
        if forbidden_reason(candidate):
            raise GateError('FORBIDDEN_APPROVAL')
        if candidate.casefold() in case_paths:
            raise GateError('DUPLICATE_APPROVAL')
        digest = row['sha256']
        if not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest):
            raise GateError('INVALID_APPROVAL_DIGEST')
        for key, limit in [('reviewedBy', 120), ('reason', 1000)]:
            value = row[key]
            if (not isinstance(value, str) or not value.strip() or len(value) > limit
                    or any(ord(c) < 32 or ord(c) == 127 for c in value)):
                raise GateError('INVALID_REVIEW_METADATA')
        timestamp = row['reviewedAt']
        if not isinstance(timestamp, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', timestamp):
            raise GateError('INVALID_REVIEW_METADATA')
        try:
            datetime.strptime(timestamp, '%Y-%m-%dT%H:%M:%SZ')
        except ValueError:
            raise GateError('INVALID_REVIEW_METADATA') from None
        result[candidate] = digest
        case_paths.add(candidate.casefold())
    return result


class SiteSnapshot:
    """Bounded directory-fd walk. Regular files are hashed, not interpreted."""
    def __init__(self) -> None:
        self.files: list[dict[str, Any]] = []
        self.findings: list[dict[str, Any]] = []
        self.finding_count = 0
        self.entries = 0
        self.bytes_read = 0
        self.seen: set[str] = set()

    def reject(self, code: str, path: str | None = None) -> None:
        self.finding_count += 1
        if len(self.findings) < MAX_FINDINGS:
            self.findings.append({'code': code, **({'path': path} if path is not None else {})})

    def read(self, root: Path) -> 'SiteSnapshot':
        try:
            fd = open_nofollow(root, directory=True)
            try:
                self._walk(fd, '', 0)
            finally:
                os.close(fd)
        except GateError as error:
            self.reject(error.code)
        except OSError:
            self.reject('UNREADABLE_SITE_ROOT')
        if not any(row['path'] == 'index.html' for row in self.files):
            self.reject('MISSING_SITE_INDEX')
        return self

    def _walk(self, fd: int, prefix: str, depth: int) -> None:
        if depth > MAX_DEPTH:
            raise GateError('TREE_DEPTH_LIMIT')
        before = os.fstat(fd)
        try:
            with os.scandir(fd) as scan:
                names = []
                for entry in scan:
                    self.entries += 1
                    if self.entries > MAX_ENTRIES:
                        raise GateError('TREE_ENTRY_LIMIT')
                    names.append(entry.name)
            for name in sorted(names):
                path = prefix + name
                try:
                    canonical_path(path)
                    if path.split('/')[0].casefold() == 'extra' and path.split('/')[0] != 'extra':
                        raise GateError('INVALID_EXTRA_NAMESPACE')
                    if path.casefold() in self.seen:
                        self.reject('CASE_COLLISION', path)
                        continue
                    self.seen.add(path.casefold())
                    info = os.stat(name, dir_fd=fd, follow_symlinks=False)
                    if stat.S_ISLNK(info.st_mode):
                        self.reject('SYMLINK', path)
                        continue
                    reason = forbidden_reason(path)
                    if reason:
                        self.reject(reason, path)
                        continue
                    if stat.S_ISDIR(info.st_mode):
                        child = os.open(name, _flags(True), dir_fd=fd)
                        try:
                            if fingerprint(info) != fingerprint(os.fstat(child)):
                                raise GateError('TREE_CHANGED_DURING_SCAN')
                            self._walk(child, path + '/', depth + 1)
                        finally:
                            os.close(child)
                        # Also catch replacement of the named directory itself.
                        if fingerprint(info) != fingerprint(os.stat(name, dir_fd=fd, follow_symlinks=False)):
                            raise GateError('TREE_CHANGED_DURING_SCAN')
                    elif stat.S_ISREG(info.st_mode):
                        if path == 'extra':
                            raise GateError('INVALID_EXTRA_ROOT')
                        self._file(fd, name, path, info)
                    else:
                        self.reject('SPECIAL_FILE', path)
                except GateError as error:
                    # Resource bounds stop the walk rather than doing more work.
                    if error.code in {'TREE_ENTRY_LIMIT', 'TREE_DEPTH_LIMIT', 'TOTAL_BYTE_LIMIT'}:
                        raise
                    self.reject(error.code, path)
                except OSError:
                    self.reject('UNREADABLE_OR_REPLACED_ENTRY', path)
        finally:
            if fingerprint(before) != fingerprint(os.fstat(fd)):
                self.reject('TREE_CHANGED_DURING_SCAN', prefix.rstrip('/') or None)

    def _file(self, parent: int, name: str, path: str, before: os.stat_result) -> None:
        if before.st_nlink != 1:
            raise GateError('HARDLINK')
        if before.st_size > MAX_FILE_BYTES:
            raise GateError('FILE_BYTE_LIMIT')
        fd = os.open(name, _flags(), dir_fd=parent)
        digest = hashlib.sha256()
        size = 0
        with os.fdopen(fd, 'rb') as stream:
            opened = os.fstat(stream.fileno())
            if not stat.S_ISREG(opened.st_mode) or fingerprint(before) != fingerprint(opened):
                raise GateError('TREE_CHANGED_DURING_SCAN')
            while chunk := stream.read(CHUNK_BYTES):
                size += len(chunk)
                self.bytes_read += len(chunk)
                if self.bytes_read > MAX_TOTAL_BYTES:
                    raise GateError('TOTAL_BYTE_LIMIT')
                if size > MAX_FILE_BYTES:
                    raise GateError('FILE_BYTE_LIMIT')
                digest.update(chunk)
            if (size != before.st_size or fingerprint(before) != fingerprint(os.fstat(stream.fileno()))
                    or fingerprint(before) != fingerprint(os.stat(name, dir_fd=parent, follow_symlinks=False))):
                raise GateError('TREE_CHANGED_DURING_SCAN')
        self.files.append({'path': path, 'sha256': digest.hexdigest(), 'bytes': size})


def audit(root: Path, approvals: dict[str, str] | None = None) -> dict[str, Any]:
    snapshot = SiteSnapshot().read(root)
    inventory = approvals is None
    scan_complete = snapshot.finding_count == 0
    files = sorted(snapshot.files, key=lambda row: row['path'])
    for row in files:
        if not inventory and row['path'].startswith('extra/'):
            if row['path'] not in approvals:
                snapshot.reject('UNREVIEWED_EXTRA_ASSET', row['path'])
            elif row['sha256'] != approvals[row['path']]:
                snapshot.reject('APPROVAL_HASH_MISMATCH', row['path'])
    if not inventory:
        present = {row['path'] for row in files}
        for path in sorted(approvals.keys() - present):
            snapshot.reject('STALE_APPROVAL', path)
    complete = snapshot.finding_count == 0
    tree_digest = hashlib.sha256(json.dumps(files, ensure_ascii=True, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return {
        'schemaVersion': 1,
        'kind': 'publication-candidates' if inventory else 'publication-check',
        'checkedAtUTC': datetime.now(timezone.utc).isoformat(),
        'scope': 'extra-assets',
        'gatePassed': complete and not inventory,
        'scanComplete': scan_complete,
        'reviewManifestSha256': getattr(approvals, 'source_sha256', None),
        'siteDigest': tree_digest,
        'fileCount': len(files), 'extraAssetCount': sum(row['path'].startswith('extra/') for row in files),
        'bytesHashed': snapshot.bytes_read,
        'findingCount': snapshot.finding_count,
        'findingsTruncated': snapshot.finding_count > len(snapshot.findings),
        'findings': snapshot.findings, 'files': files,
    }


def error_report(code: str, *, inventory: bool) -> dict[str, Any]:
    return {'schemaVersion': 1, 'kind': 'publication-candidates' if inventory else 'publication-check',
            'scope': 'extra-assets', 'gatePassed': False, 'scanComplete': False,
            'findingCount': 1, 'findingsTruncated': False, 'findings': [{'code': code}], 'files': []}


def outside_site(path: Path, site: Path, code: str) -> None:
    # Checking both prevents aliases through a symlink from placing the report
    # in a public tree. The eventual open separately forbids symlink components.
    for candidate, root in [(Path(os.path.abspath(path)), Path(os.path.abspath(site))),
                            (path.resolve(), site.resolve())]:
        if candidate == root or root in candidate.parents:
            raise GateError(code)


def write_report(path: Path, value: dict[str, Any]) -> None:
    parent = open_nofollow(path.parent, directory=True)
    temporary = '.publication-' + uuid.uuid4().hex + '.tmp'
    created = False
    try:
        try:
            old = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
            if not stat.S_ISREG(old.st_mode) or old.st_nlink != 1:
                raise GateError('INVALID_REPORT_FILE')
        except FileNotFoundError:
            pass
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent)
        created = True
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=True, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path.name, src_dir_fd=parent, dst_dir_fd=parent)
    finally:
        if created:
            try:
                os.unlink(temporary, dir_fd=parent)
            except FileNotFoundError:
                pass
        os.close(parent)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['inventory', 'check'])
    parser.add_argument('--site', required=True, type=Path)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--report', type=Path, help='Write path/hash evidence OUTSIDE the published site')
    args = parser.parse_args(argv)
    inventory = args.command == 'inventory'
    report_allowed = False
    try:
        if args.report:
            outside_site(args.report, args.site, 'REPORT_INSIDE_SITE')
            if args.manifest and args.report.resolve() == args.manifest.resolve():
                raise GateError('REPORT_OVERWRITES_MANIFEST')
            report_allowed = True
        if inventory and args.manifest:
            raise GateError('INVENTORY_CANNOT_APPROVE')
        if not inventory and args.manifest is None:
            raise GateError('MANIFEST_REQUIRED')
        if args.manifest:
            outside_site(args.manifest, args.site, 'MANIFEST_INSIDE_SITE')
        approvals = None if inventory else load_approvals(args.manifest)
        report = audit(args.site, approvals)
    except GateError as error:
        report = error_report(error.code, inventory=inventory)
    except (OSError, ValueError, RuntimeError):
        report = error_report('FILESYSTEM_ERROR', inventory=inventory)
    if args.report and report_allowed:
        try:
            write_report(args.report, report)
        except (OSError, ValueError, GateError):
            report = error_report('REPORT_WRITE_FAILED', inventory=inventory)
    # Logs contain counts and error codes, not paths, review notes or file bytes.
    passed = report['gatePassed'] or (inventory and report['findingCount'] == 0)
    codes = ','.join(sorted({item['code'] for item in report['findings']})) or 'none'
    print(f"Publication {args.command}: {'PASS' if passed else 'BLOCKED'}; "
          f"files={report.get('fileCount', 0)}; findings={report['findingCount']}; codes={codes}")
    return 0 if passed else 1


if __name__ == '__main__':
    sys.exit(main())
