# Project implementation registry — 2026-09-22

Updated observation: **2026-09-26** (Asia/Seoul).

Purpose: keep one cross-project index of active work, canonical repositories, overlap/reuse boundaries and archive-review rules without copying repository-local implementation specifications.

Repository-local source, status and plan files remain authoritative. Machine-readable metadata is stored in `project-registry.json`, with its contract in `project-registry.schema.json`. The standard-library validator is `src/automation/project_registry/validate.py`.

## Current core project map

| Project | Repository | Lifecycle | Current pointer |
|---|---|---|---|
| ai-server | `admin_nodove/AI-server` | active | main `b97da169`; open PRs #80, #81, #82, #83, #84, #85 |
| ai-gateway | `admin_nodove/ai-gateway` | review | main `48766031`; open PRs none |
| filamai | `admin_nodove/filamai` | active | main `dc1d9fe1`; open PRs #3 |
| fcn | `admin_nodove/fcn` | active | main `20a2e65a`; open PRs #1, #2 |
| wlatch-sessionloop | `admin_nodove/wlatch-sessionloop` | active | main `7bf7e9fb`; open PRs #14 |
| auto-career | `admin_nodove/auto-career` | review | main `7ed08e85`; open PRs none |
| codex-chatgpt-web-main | `admin_nodove/codex-chatgpt-web-main` | active | main `e736a1b1`; open PRs none |
| community-refined-flutter | `admin_nodove/community-refined-flutter` | review | main `97919af1`; open PRs #2 |
| blog | `admin_nodove/blog` | active | main `18a15e12`; open PRs #1, #3 |
| writing | `admin_nodove/writing` | active | main `bf01a692`; open PRs none |
| document | `admin_nodove/document` | active | main `e1cfa987`; open PRs #1, #2 |
| media-mcp | `nodove/media-mcp` | active | main `5c5db69a`; open PRs #1, #2, #3, #4, #5, #6 |
| helm | `admin_nodove/helm` | review | main `b3ecce74`; open PRs none |
| forgejo-mcp | `nodove/forgejo_mcp` | active | main `bb06188b`; open PRs #18 |
| edu-connector | `nodove/Edu-connector` | active | main `f0052163`; open PRs #1, #2 |
| filamai-frontend | `admin_nodove/filamai-frontend` | active | main `172731fe`; open PRs none |
| filamai-backend | `admin_nodove/filamai-backend` | active | main `90c1503e`; open PRs none |
| intellialgo | `admin_nodove/IntelliAlgo` | active | main `59451515`; open PRs none |
| community | `admin_nodove/community` | review | main `008c6227`; open PRs none |

This table is an observation index, not deployment evidence. Exact runtime state continues to live in each repository's own current-state/runbook/evidence paths.

## Cross-project boundaries

### AI Server

`AI-server` remains the platform/runtime authority for its Smart Router, LiteLLM gateway assets, current ai-1 operating contract and related observability/auth foundations.

Do not create a second cross-project registry inside AI-server. Its own plan explicitly points cross-project tracking to `admin_nodove/document`.

Current authoritative pointers include `AGENTS.md`, `docs/operations/AI1_CURRENT_STATE.md` and `plan/IMPLEMENTATION_STATUS_20260922.md`. PR39 and PR44 are historical merged work. The observed open sequence is PR80–PR85; PR83/84 depend on PR81. Review the exact current head and checked-in implementation reports before restarting work.

The separate `admin_nodove/ai-gateway` repository contains a standalone TypeScript/Express gateway stack whose AGENTS metadata points to a 2026-02-22 source generation. AI-server's current root Compose consumes the published `ghcr.io/.../ai-server-gateway` image rather than a checkout of that repository. This is enough to mark the separate repository as **not the current ai-1 runtime authority**, but not enough to archive it: the producer/source provenance of the published image still needs to be proven.

### FilamAI and FCN

FilamAI is the workspace/meta repository and pins its authoritative backend/frontend submodules. Its own `CURRENT_STATE.md` still treats release readiness as gated.

FCN already documents FilamAI reuse as part of its product direction. The integration rule is therefore **reuse/adapter first**: do not introduce parallel authentication, workspace, file or API-client stacks merely to advance FCN screens.

### auto-career

The repository contains a Flutter product and backend directory, but the root README is still the default Flutter boilerplate while `pubspec.yaml` identifies an AI resume/application workspace.

Before expanding a separate career backend, resolve whether career evidence should consume FCN's evidence/capability model. This remains a **proposed integration boundary**, not a completed implementation claim.

### WLatch

WLatch remains an independent runtime/transport project. Preserve its hardened request/SSE/replay/readiness contracts and continue from PR14 and its follow-up architecture instead of replaying merged PR1–PR13.

### media-mcp

The verified baseline is Docker Compose, not K3s. PR1–PR6 share the same baseline and represent cumulative YTS automation slices. Treat them as stacked work when planning merge/rebase order.

### Document, Blog and Writing

`document` owns the cross-project registry and Docs Hub behavior. `writing` is the canonical long-form writing archive. `blog` remains the publishing/product surface. Shared behavior may be reused, but canonical content ownership should remain explicit.

## Repository lifecycle and archive policy

Repository cleanup is **archive-first, never delete-by-default**.

A repository may move from `review` to `historical/archived` only after all of the following are checked:

1. A canonical replacement or retained authority is identified.
2. No open PR still needs the repository.
3. No deployment, CI, submodule, gitlink or automation path references it.
4. Required rollback/evidence/history remains reachable.
5. The archive action is reviewed separately from feature implementation.

Snapshot-like repository families such as `AI-server-*`, `blog-pr-*`, `backend-marker-*`, `IntelliAlgo-*`, `.tmp-image-documentation-*` and `.opencode-tmp` are **review candidates only**. Their names are not sufficient evidence that they can be archived.

Deletion is intentionally outside this registry workflow.

## Machine-readable contract

`plans/project-registry.json` records only stable project/repository identity, role/lifecycle, canonicality, last observed main SHA when verified, open PR numbers, source-of-truth pointers, a short status note and cross-project relations with explicit state.

It does **not** duplicate full task specifications, runtime secrets, deployment manifests or mutable operational evidence.

Validation:

```bash
python3 src/automation/project_registry/validate.py
python3 -m unittest discover -s src/qa/project_registry -v
```

The validator has no third-party dependency. It rejects duplicate project/repository identities, unsafe source paths, unknown relation targets, duplicate PR/path entries and impossible canonical lifecycle combinations.

## Global completion rule

A plan item is not complete merely because a document exists, code exists on a branch, focused tests pass, or one UI renders.

Keep these states separate: code present, integration tested, runtime enabled, acceptance verified.

When later work changes a project, update its repository-local authoritative status/plan first, record the implementation PR/commit there, and update this registry only with the short pointer/status.

## Next cross-project work

After this registry contract is merged, the nearest non-duplicative follow-up is:

1. resolve `ai-gateway` ownership against `AI-server`,
2. classify `helm` as a real deployment source or placeholder,
3. review archive-candidate repositories only after dependency checks,
4. then move to the first repository-local unfinished implementation rather than adding another coordination layer.

## Observation limits and preserved reports

The 2026-09-26 audit enumerated 63 known repositories and 140 PRs. The repository-list endpoint returned 60 admin_nodove repositories; three known nodove repositories were queried directly. Default refs and PR heads were observed, but PR-less branches, private host worktrees, issue state and remote CI were not fully exposed. These counts are a timestamped observation, not a guarantee of server-wide completeness.

[Repository learning, troubleshooting and Kubernetes report](reports/Repository_Learning_Reports_20260926.html) preserves the existing 2026-09-26 analysis. Its embedded snapshots are historical; use current repository-local sources and this registry for observed refs. Upload does not imply runtime validation or publication of the website.
