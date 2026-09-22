# Project implementation registry — 2026-09-22

Updated observation: **2026-09-23**.

Purpose: keep one cross-project index of active work, canonical repositories, overlap/reuse boundaries and archive-review rules without copying repository-local implementation specifications.

Repository-local source, status and plan files remain authoritative. Machine-readable metadata is stored in `project-registry.json`, with its contract in `project-registry.schema.json`. The standard-library validator is `src/automation/project_registry/validate.py`.

## Current core project map

| Project | Repository | Lifecycle | Current pointer |
|---|---|---|---|
| AI Server | `admin_nodove/AI-server` | active / canonical | main `9557084f`; PR39 conflict, PR44 mergeable |
| AI Gateway | `admin_nodove/ai-gateway` | review | standalone TypeScript/Express source; not the current ai-1 runtime authority; image provenance still needs proof |
| FilamAI | `admin_nodove/filamai` | active / canonical | main `ccea539d`; PR3 latest unfinished-plan publication |
| FCN | `admin_nodove/fcn` | active / canonical | main `20a2e65a`; PR1/PR2 open |
| WLatch | `admin_nodove/wlatch-sessionloop` | active / canonical | main `b4d7ed45`; PR6 latest unfinished-plan publication |
| auto-career | `admin_nodove/auto-career` | review / canonical repo | Flutter product exists, but product contract/documentation is still incomplete |
| Codex ChatGPT Web | `admin_nodove/codex-chatgpt-web-main` | active / canonical | main `e736a1b1`; no open PR |
| Community refined Flutter | `admin_nodove/community-refined-flutter` | review / canonical repo | main `97919af1`; PR2 open; Flutter build/analyze/runtime proof remains unverified in its README |
| Blog | `admin_nodove/blog` | active / canonical | main `18a15e12`; PR1/PR3 open |
| Writing | `admin_nodove/writing` | active / canonical | canonical writing archive; no open PR |
| Document / Docs Hub | `admin_nodove/document` | active / canonical | main `e1cfa987`; PR1/PR2 open; cross-project registry authority |
| media-mcp | `nodove/media-mcp` | active / canonical | main `5c5db69a`; PR1–PR5 are cumulative YTS automation work |
| Helm | `admin_nodove/helm` | review | current main tree is empty; ownership/source-of-truth decision required before use |

This table is an observation index, not deployment evidence. Exact runtime state continues to live in each repository's own current-state/runbook/evidence paths.

## Cross-project boundaries

### AI Server

`AI-server` remains the platform/runtime authority for its Smart Router, LiteLLM gateway assets, current ai-1 operating contract and related observability/auth foundations.

Do not create a second cross-project registry inside AI-server. Its own plan explicitly points cross-project tracking to `admin_nodove/document`.

Current authoritative pointers include `AGENTS.md`, `docs/operations/AI1_CURRENT_STATE.md` and `plan/IMPLEMENTATION_STATUS_20260922.md`. PR39 is still separate conflicting UI-01c work. PR44 is the latest documentation/status update.

The separate `admin_nodove/ai-gateway` repository contains a standalone TypeScript/Express gateway stack whose AGENTS metadata points to a 2026-02-22 source generation. AI-server's current root Compose consumes the published `ghcr.io/.../ai-server-gateway` image rather than a checkout of that repository. This is enough to mark the separate repository as **not the current ai-1 runtime authority**, but not enough to archive it: the producer/source provenance of the published image still needs to be proven.

### FilamAI and FCN

FilamAI is the workspace/meta repository and pins its authoritative backend/frontend submodules. Its own `CURRENT_STATE.md` still treats release readiness as gated.

FCN already documents FilamAI reuse as part of its product direction. The integration rule is therefore **reuse/adapter first**: do not introduce parallel authentication, workspace, file or API-client stacks merely to advance FCN screens.

### auto-career

The repository contains a Flutter product and backend directory, but the root README is still the default Flutter boilerplate while `pubspec.yaml` identifies an AI resume/application workspace.

Before expanding a separate career backend, resolve whether career evidence should consume FCN's evidence/capability model. This remains a **proposed integration boundary**, not a completed implementation claim.

### WLatch

WLatch remains an independent runtime/transport project. Preserve its hardened request/SSE/replay/readiness contracts and continue from PR6/local task state instead of replaying completed PRs.

### media-mcp

The verified baseline is Docker Compose, not K3s. PR1–PR5 share the same baseline and represent cumulative YTS automation slices. Treat them as stacked work when planning merge/rebase order.

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
