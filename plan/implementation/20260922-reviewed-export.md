# PR00b — reviewed-source export and PR #1 reconciliation

## Status

WIP / not deployment-ready. No merge, live provider call, production setting
change or deployment was requested or performed. The production approval list
is still empty. Existing raw links and actual exported assets must be reviewed
and verified on a full checkout before this work can close PR00b.

## Baseline and remote identity

The latest available checkpoint was
`document-source-cumulative-pr00b-unsynced-20260922.zip` (395,886 bytes), SHA-256
`041d5b6993faad4bcf2491d2beed0383e1176bb8c89c613701dc425c3052a213`.
Its ZIP integrity, 29 package checksums and 17 source hashes were verified.
There was no `.git` directory: this is a cumulative source subset, not a full
checkout or a single already-published commit.

Live Forgejo access recovered during this execution. Before implementation:

- `main`: `e1cfa987838167d55b20d8a45c103c97e8b4c64d`.
- PR #1: open, unmerged, mergeable; source
  `feat/docs-ai-transport-20260921`, target `main`.
- PR head: `005402c909bbf16e3d9380cfdf001bbe7d7654c5`; merge base equals main.
- All 11 baseline PR files matched their recorded remote Git blob hashes.
- Five more original files were recovered from the pinned PR and hash-verified:
  the canonical and compatibility export scripts, MkDocs config, requirements,
  and the extra index. They were not reconstructed from an older checkout.

The same source branch was reused. Pre-push reads reconfirmed main and the PR
head. PR #2 appeared during the run, but its only change is
`plans/PROJECT_IMPLEMENTATION_REGISTRY_20260922.md`, with no overlapping paths.
It was not changed or merged. No duplicate PR or branch was created.

Direct Git `ls-remote` remained blocked by DNS resolution of git.nodove.com.
Library full-source materialization was denied: no authorized raw-byte path.
Therefore local commit ancestry, complete branch/tag enumeration and a full
repository snapshot are unavailable. Connector commits preserve the existing
remote tree/history instead of inventing local ancestry.

## Work preserved and reconciled

The prior PR00a opt-in, PR01 request snapshots/cancellation/SSE/budgets and
100-test suite were preserved. The previously unpublished hardening was
published as `da797cdcfbafaa97d34565454428a33a5d220e74` after per-file verification.
The prior read-only gate and enforced pre-upload checks were published as
`2ccbe79109ae7d7390e2e4d1813248ef068ffe29`. Hash verification caught two extra
parentheses introduced while transmitting the gate test; the tested source was
restored in normal commit `449058321c2bb1f23bd0702f7be4aff7af5fb307`.
No published history was rewritten and the corrected blob matches the local test.

New exporter/config/navigation changes were published as
`8bb4aede14a92958cb883a36782501ba0fe9c36b` and their five blobs match the tested
source exactly. The final branch head including this note is recorded by the
execution archive and the live PR, not hard-coded self-referentially here.

## New implementation

`export_public_assets.py` is called by the existing canonical shell entrypoint.
It reuses the publication gate's manifest/path/no-follow rules. It does not
recursively walk source trees: only explicitly approved paths are read. All
selected bytes and required deterministic index files are staged and checked
before installation. Index HTML labels and URL components are escaped separately.
Generated indexes require independent review; `plan` only returns candidates.

Matching existing outputs are retained; mismatches fail instead of overwriting.
Exclusive installation refuses a concurrently created target, strips source mode
bits, and cleans temporary links. Unknown existing files are neither deleted nor
endorsed. The final gate still checks the finished build. Installation is not a
multi-file transaction; interruptions require a clean rebuild and revalidation.

The shell keeps all 13 directory mappings, two individual-file mappings, nine
index roots, its default/optional output argument, and the existing compatibility
wrapper. Mappings now select origins; they no longer grant recursive publication.

MkDocs excludes the local `extra/api-key-dashboard.html` mock; the original file
is retained in the repository. The extra index links to the real AI operations
page instead. All other routes and the README-preservation hook are retained.
No AI search, citation, translation or server authorization is claimed complete.

## Verification

Commands from the available source root:

```sh
python -m unittest discover -s src/qa/publication -v
node --test src/qa/ai-client.test.js src/qa/public-ai-config.test.js src/qa/ai-browser-contracts.test.js
```

- Publication: 110 passed, 0 failed, 0 skipped (65 preserved + 45 new).
- AI/config/browser: 100 passed, 0 failed, 0 skipped. This is 80 transport,
  6 configuration, 13 browser child cases and their parent test; not 100
  independent end-to-end application scenarios.
- Six JavaScript files passed syntax checks; five Python files compiled;
  two shell entrypoints passed `bash -n`; two YAML files parsed.
- The new exporter test harness initially blocked temporary-directory cleanup
  with an overbroad scandir mock. The test was narrowed to forbid repository
  enumeration while allowing private staging cleanup, then all tests reran.
- A combined execution timed out without an implementation failure; suites
  were rerun separately to completion. Repeat runs are not additive coverage.

Node 22.16.0, Python 3.13.5, Chromium 144 and installed Playwright Core 1.57 beta
were used. The QA module alias is outside the source tree. Repository dependency
and lockfile versions were not changed. Browser requests were intercepted with
fixtures; no live AI service or charge was involved.

The exact full-build attempt:

```sh
python -m mkdocs build --clean --strict -f apps/docs-site/mkdocs.yml
```

Exit 1: `/opt/pyvenv/bin/python: No module named mkdocs`.
This is an environment failure, not a passing or code-failing MkDocs build.
The corpus/hooks/Rust/Hub application are also unavailable locally, so their full
checks and actual exported-site/link validation have not run. Pinned CI,
review comments and CI statuses are not exposed by the available connector reads;
no CI-success claim is made. PR mergeability must be read again after publication.

## Publication and source continuity

Writes use normal Forgejo Contents API commits on the existing branch, with
current blob SHA preconditions and read-back hash checks. Main is not modified.
No force push, merge, deletion or generated source archive is committed. The
existing PR advances with its branch; the available tool has no PR-description
update action. This checked-in note supplies current verification and WIP status.

The cumulative archive is named with the final verified PR commit prefix. Every
included source file must match the blob at that commit. All previous 17 source
files are retained, plus five recovered originals and the new exporter, test and
this note (25 total). It is explicitly a partial repository snapshot: it cannot
stand in for the missing full source, even when all included bytes match the PR.
The final execution report contains the exact archive name, SHA and receipt.

## Exact next unfinished work

1. Obtain a full checkout at the latest verified PR #1 head, then reread the
   current base/PRs. Do not replay already-published commits or create a duplicate.
2. Review all real source exports and rendered `extra/` pages individually,
   populate approvals with genuine reviews, and reconcile existing raw links.
   The empty manifest currently omits unapproved exports; generated-link checks
   and the final gate may fail by design. Do not suppress them to deploy.
3. Run pinned dependency tests, strict full MkDocs, hooks, Rust, all source/built
   link checks, full Hub navigation and the finished-site gate. Review any other
   references to the excluded mock throughout the full corpus.
4. Verify PR checks/mergeability and only deploy after explicit authorization.
5. Then PR02: shared search, question/context separation, document/chunk revisions.
   Citation/partial-answer UI, summaries, translation and backend adapter remain
   later tasks. Do not mark PR00b complete merely because its branch is published.
