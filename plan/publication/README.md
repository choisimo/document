# Public extra-asset review

PR00b has two boundaries: the existing `sync-extra-assets.sh` entrypoint now
exports only exact reviewed files through `export_public_assets.py`, and
`publication_gate.py` inspects the finished site before Pages upload. This is not
an AI index, backend authorization layer, or complete secret-content scanner.
The historical source-to-public-path mappings and compatibility entrypoint remain
unchanged; a mapped directory is no longer permission to copy its contents.

## Current release state

`extra-assets.json` intentionally contains **zero approvals**. Live Forgejo reads
have recovered the current PR/base identity and relevant original source files,
but a full checkout and actual build corpus are still unavailable locally. No
actual publication asset, reviewer identity or approval digest was invented.

**Do not treat this change as merge-ready for deployment.** A build containing
`extra/` files will be blocked until the actual files are reviewed. Known mock
management pages and forbidden artifacts must be excluded at their source
publication boundary. MkDocs now excludes `extra/api-key-dashboard.html`, and
its navigation links point to the real AI operations guide. Its original local
source is retained. All other publication inputs and existing raw links still
require full-checkout review. No existing deployed site is changed by these commits.

## Review workflow

Use a clean, quiescent full checkout. Review intended original source files and
record their exact public paths and digests in the manifest before exporting.
Review generated indexes separately using the read-only `plan` command described
below. Then build MkDocs and run `bash src/automation/site/sync-extra-assets.sh`.
After all build steps (including headers/CNAME/metadata), run:

```bash
mkdir -p /tmp/docs-publication-review
python3 src/automation/site/publication_gate.py inventory \
  --site dist/site \
  --report /tmp/docs-publication-review/candidates.json
```

An inventory is **not approval**, even when the scan exits zero. Its schema is
incompatible with the approval manifest. There is no automatic approval command,
no glob, no directory approval and no `--allow-all` or bypass flag.

Inspect each intended public `extra/` file and its source. Remove operational
credentials/state and separate mock management interfaces in the full source,
not by deleting arbitrary output here. Check existing links and directory indexes
against the previous site before changing the export mapping. For each reviewed
file, add an entry with exactly these fields to `extra-assets.json`:

| Field | Required value |
| --- | --- |
| `path` | Exact site-relative path starting `extra/`; no traversal, URL encoding or wildcard |
| `sha256` | Lowercase SHA-256 of the exact reviewed bytes, from the inventory |
| `reviewedBy` | Actual reviewer identifier; no invented or default reviewer |
| `reviewedAt` | Actual review time in `YYYY-MM-DDTHH:MM:SSZ` form |
| `reason` | Why these contents and this public path were approved |

These fields record a review; they do not authenticate a person. Review the
manifest changes under the repository's normal access and PR review controls.
A hash proves equality with the recorded bytes, **not absence of secrets**.
Do not put tokens or copied secret contents in review reasons.

Then check the finished site:

```bash
python3 src/automation/site/publication_gate.py check \
  --site dist/site \
  --manifest plan/publication/extra-assets.json \
  --report /tmp/docs-publication-review/check.json
```

Zero is required for upload. Changed bytes, missing approvals, new paths and stale
approvals fail. All files under `extra/`, including generated directory indexes,
require their own review. Renaming or copying identical bytes does not transfer
approval. Keep the build tree unchanged between this check and artifact upload.
The checked file-list digest is not an atomic snapshot or signed deployment proof.

## Hard boundaries

Recognized environment/credential/key/database/log artifacts, private/runtime
folders, hidden state and the known `api-key-dashboard` mock are rejected across
the whole site. These checks cannot be overridden with an approval. File and
folder symlinks, symlink ancestors, hardlinks, special files, ambiguous path names
and case collisions are rejected. Reads use directory file descriptors with
`O_NOFOLLOW`; files/directories replaced during the walk cause failure. The tool
requires POSIX filesystem support, matching the existing Ubuntu CI runner.

Work is bounded to 50,000 entries, depth 64, 256 MiB per file and 2 GiB total
hashed bytes. Manifests are limited to 1 MiB. Reports retain at most 200 finding
entries and include the total plus a truncation flag; truncation never grants
approval. Unicode NFC names and ordinary spaces are supported.

The tool hashes regular-file bytes; it does not execute scripts, parse HTML,
contact APIs, query DNS or scan file contents for credentials. Its whole-site
filename checks are a second boundary, not a complete content-secret scanner.
Existing MkDocs document routes outside `extra/` do not receive individual review
approval from this manifest. Source-corpus approval and AI retrieval authorization
remain separate unfinished tasks.

## Evidence and recovery

Reports are written atomically with mode 0600, outside `dist/site`. They contain
paths, sizes and hashes, but not file contents or reviewer notes. Console output
contains only counts and diagnostic codes. Do not publish the reports or put them
under a path recursively copied by the exporter. In CI, reports go to `runner.temp`
and are not included in the Pages artifact.

`publication-check` includes the SHA-256 of the exact manifest bytes and a digest
of the sorted file inventory. Failed or partial scans must not be used as a
release attestation. `scanComplete` refers to this walk; `gatePassed` is the upload
decision. Always check the command's exit status, including report-write failures.

The gate does not mutate, quarantine or delete source or build files. Resolve
failures in the source/approval review, rebuild, and rerun the existing link and
navigation tests. Do not disable the gate, add blanket approvals or reintroduce
unsafe exports to make CI green. While review is incomplete, retain the existing
deployed site and keep AI disabled rather than deploying an unreviewed build.


## Source-side export and index planning

The shell entrypoint retains its default `dist/site/extra` output, optional output
argument, 13 directory mappings, two individual-file mappings and nine index
roots. The compatibility entrypoint still forwards arguments to it. The new
Python helper shares the publication gate's canonical-path, forbidden-name,
manifest and no-follow file-reading rules. There is no recursive source scan,
implicit approval, symlink following or automatic cleanup of stale output.

A reviewed original file must match its recorded SHA-256. Every selected original
and every required generated index is checked in a private staging directory
before any file is installed. Existing matching output, including MkDocs-generated
indexes, is preserved. Different output bytes cause failure, not overwrite.
Install uses exclusive links from complete temporary files, strips executable and
special mode bits, and never removes pre-existing destination files.

For one mapped collection, candidate index digests can be inspected privately:

```bash
python3 src/automation/site/export_public_assets.py plan \
  --repository "$PWD" --output "$PWD/dist/site/extra" \
  --manifest "$PWD/plan/publication/extra-assets.json" \
  --directory src/examples/architect-code algorithm-code/code \
  --index algorithm-code \
  --report /tmp/docs-publication-review/export-candidates.json
```

Pass the complete selected set of mapping/index arguments from the shell for a
full plan. This command reads only already-approved original-file paths, preserves
existing approved builder output, and reports required generated indexes. It does
not discover or approve original files. Inspect the deterministic `render_index`
output and child names before adding those index digests with a real review
record. HTML text and URL components are escaped separately. Candidate reports
cannot be supplied as an approval manifest. Without approvals no source is read
and nothing is copied; this is not a successful release check.

The install is not a multi-file filesystem transaction. Interruption or concurrent
output mutation can leave a subset of approved files; the separate final gate and
existing link/navigation checks must still pass on a fresh build. Unknown or
stale output is not silently deleted or endorsed. Do not generate reports in the
repository or public output. Both plan and sync report `releaseApproved: false`.
