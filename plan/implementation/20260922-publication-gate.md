# PR00b / publication gate — implementation state

Historical execution record. Current remote reconciliation and PR00b export work are recorded in [20260922-reviewed-export.md](20260922-reviewed-export.md); the connection failures below describe that earlier execution.


## Baseline and selected work

Baseline: `docs-nodove-ai-continuation-20260922.zip`, SHA-256
`1fb2836484c416bc09220eb9d2c1d070126a16b2394eaffa417edcf150dd3285`.
The archive exists, passed ZIP CRC validation and its 24 manifest checks. Its
`source/` has 12 files: this is cumulative previous work, not a full checkout.
All 100 existing AI/configuration/browser tests passed before this change.

Previous work preserved: explicit opt-in, endpoint/config snapshots, SSE framing,
terminal results, cancellation/reentrancy, response disposal, input/context/output
budgets, bounded Notebook JSON, safe error metadata and the existing test suites.
No AI transport code is replaced or reimplemented in this work.

Forgejo `main` and PR #1 reads both returned JSON-RPC 32600 / `Session terminated`.
The last recorded remote commit remains historical provenance only:
`005402c909bbf16e3d9380cfdf001bbe7d7654c5`. No current HEAD, CI status, branch status,
PR update, write, merge, provider call, deployment or runtime configuration change
is claimed.

The full-source Library snapshots were located but raw-file materialization was
refused (`does not have an authorized raw-byte materialization path`). Their
contents were not read or overlaid. Direct source hosts were also unreachable.
The verified 12-file continuation is the baseline; no older source overwrites it.

Selected item: **PR00b's read-only compiled-site publication gate**, after the
completed PR01 code work. Source export restructuring, mock-page exclusion and
corpus review need the unavailable full tree and remain open. This is not PR02.

## Implemented

The actual existing `.github/workflows/deploy-pages.yml` now runs the publication
tests and, after all site writes, inventory plus an enforced review check before
Pages setup/upload. Existing build/link/AI/browser/Rust checks remain in place.

`src/automation/site/publication_gate.py` implements a real, read-only filesystem
walk and CLI. `/extra/` assets require exact path/hash approvals. Known mock admin
surfaces and sensitive/runtime artifact names are hard denied, as are symlinks,
hardlinks and nonregular files. The scanner detects replacements during reads,
uses no-follow directory descriptors, bounds its work, emits private structured
evidence and fails on unreviewed, changed or stale approvals. Inventory cannot be
used as a manifest and cannot grant approval. Reports cannot be written into the
published tree or over the review manifest.

`plan/publication/extra-assets.json` is a valid deny-by-default policy with no
approvals. This is intentional, not a claim that the missing corpus was reviewed.
**The new pipeline will block builds with unreviewed extra files or the known
mock dashboard. Do not merge/deploy it as a completed publication migration.**
There is no bypass, no source deletion and no silently changed public URL.

Operating instructions and limits are in `plan/publication/README.md`. The public
AI operations document records the gate and its distinction from AI corpus and
server authorization.

## Verification and next work

The final exact results and environment are recorded in the archive's
`evidence/verification.json`; raw test logs accompany it. Tests operate on real
fixture directories and actual subprocess CLI calls, plus fault-injected
filesystem races. They are not a substitute for the full published site.

Before this can close PR00b:

1. Recover current full source and re-read remote main/PR #1. Reconcile the previous
   transport continuation and this gate against real blob identities.
2. Inspect the actual MkDocs/extra publication inputs and references. Separate the
   mock key-management page and operational/private artifacts at the source build
   boundary without silently breaking legitimate links.
3. Review intended exported files individually and fill the exact hash approval
   manifest. Rebuild and review changes to generated directory indexes too.
4. Run strict MkDocs, hooks/Rust/link checks, full Hub navigation, the repository's
   pinned Playwright version and the gate on the finished actual site. Verify
   deployed build identity only after an authorized deployment.
5. Then proceed to PR02: one shared search source, query/context separation and
   document/chunk revision contracts. Citation/partial-answer UI, summarization,
   translation and backend authority remain unimplemented.

Continuation archive contains every previous source file with this work applied,
plus tests, policy and documentation. It still must not be called a full repository
snapshot. No filename or latest-remote claim substitutes for that missing tree.
