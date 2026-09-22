# Project implementation registry — 2026-09-22

Purpose: preserve the latest unfinished plans together with the work already completed, without duplicating implementation or treating old planning text as current source truth.

This is a cross-project index. Each repository's source and local plan remain authoritative for implementation details.

## 1. AI-server

Repository: `admin_nodove/AI-server`
Baseline main: `0658a31351d92bb1b471830dcc204d365d913b64`

Authoritative current plan work is on PR #38, branch `docs/remaining-plan-registry-20260922`, especially:
- `plan/IMPLEMENTATION_STATUS_20260922.md`
- `plan/AI_SERVER_DURABLE_HISTORY_ASSETS_IMPLEMENTATION_PLAN_20260921.md`
- `plan/AI_SERVER_DURABLE_HISTORY_REFACTOR_PROGRESS_20260921.md`
- `plan/AUTHENTICATION_SECURITY_IMPLEMENTATION_PLAN_20260920.md`
- `plan/GATEWAY_PRIVACY_REMAINING_IMPLEMENTATION_PLAN_20260920.md`
- `plan/FORGEJO_REQUIRED_GATE_REPAIR_20260922.md`

Latest completed work preserved:
- PR35 merged: image jobs allow up to 100 items with four rolling execution slots.
- PR36 merged: workspace durability foundation, account routes and image readiness integration.
- Previous merged work includes managed context compaction/retrieval, MinIO-compatible artifact foundation, privacy gateway foundation/controllers, admin/client workflow UX, image storage recovery and runtime recovery.

Still unfinished / acceptance pending:
- PR33: portal image job SSE/durable fallback integration.
- PR34: purpose-scoped portal/approval secret separation.
- PR37: portal session signing secret separation.
- AUTH-01 onward: stable identity/session/access, password, MFA, passkey, email/recovery/OIDC/QR/admin migration.
- HIST-00 onward: route/owner/storage acceptance, stable history owner, interaction ledger, durable stream journal, asset links, generated-result reconciliation, canonical server history.
- Privacy R04–R15 acceptance and final-hop enforcement.
- Image 12B/14B/15/16/17 follow-ups.
- SRW remaining-plan reconciliation.
- Provider data minimization, upstream resilience, audio and remaining admin/control-plane endpoint/UI coverage.
- Protected Forgejo CI/runner execution and final production acceptance.

Rule: use code-present, integration-tested, runtime-enabled and acceptance-verified as separate states.

## 2. FCN

Repository: `admin_nodove/fcn`
Baseline main: `20a2e65aaadfedd63adb271b8fd418306f275fb7`
Existing planning source includes `docs/IMPLEMENTATION_CONTRACT.md`, `docs/REQUIREMENTS_COVERAGE.md`, feature inventories and 20 design documents.
Open PR #1 adds long-tail manufacturing RFQ open-source landscape research.

Completed / already established:
- Core FCN product/feature inventory exists.
- Collaboration, community, file, account, adaptation and assistance feature documents exist.
- 20 design-family documents exist.
- FilamAI reuse contract is already part of the project direction: do not duplicate authentication/workspace/files/API-client functionality when FilamAI can provide it.

Unfinished latest product plan:
- Reframe FCN from a generic job marketplace into a temporary-company / execution-network system.
- A request should be able to create a temporary operating company/workspace, invite verified specialists and field workers, collect assets/specs, receive RFQ responses, assign execution and preserve evidence.
- Preserve direct outsourcing/RFQ flows, but connect them to team formation, task graph, evidence, trust and reusable asset/workflow records.
- Add workforce dispatch as an execution primitive, not a disconnected recruiting tab.
- Foreign-worker connection is a first-class capability: language, visa/work-eligibility metadata, region, skill evidence, availability and verified employer/worker history.
- Long-tail overseas manufacturing RFQ remains a major execution path: supplier discovery, quote normalization, sample order, milestone/evidence tracking, logistics handoff and dispute trail.
- Reuse FilamAI for temporary workspace/company creation, collaboration, planning and artifact flows.
- Define the mobile UX page-by-page before broad implementation: request creation, temporary company, team assembly, RFQ, workforce dispatch, supplier execution, evidence timeline, trust profile, payment/settlement and reusable assets.
- Resolve the current UX question backlog one decision at a time instead of adding disconnected screens.

Next implementation unit:
1. Freeze the domain model tying request -> temporary company -> participants -> execution graph -> evidence -> settlement.
2. Define FilamAI adapter boundaries.
3. Build one end-to-end vertical slice: RFQ request -> team/company creation -> supplier/worker assignment -> evidence -> completion.
4. Then expand to foreign workforce and cross-border manufacturing.

## 3. FilamAI

Repository: `admin_nodove/filamai`
Baseline main: `ccea539d162a52c69b0c3a3c3fdcc477c8c3495c`
PR1/PR2 for SYNC-001 are merged.

Completed / established:
- Forgejo source inventory and implementation-plan synchronization work is merged.
- Flutter is the target client surface.
- Existing authentication, workspace, API client, file and collaboration services should be reused by FCN rather than reimplemented.
- Design Lab/API/WS configuration direction has been defined.

Unfinished latest plan:
- Complete and connect the 20 mobile-first interactive prototypes to the real backend.
- Keep frontend/backend source synchronized and produce reproducible source snapshots.
- Finish high-fidelity production UX for user and admin surfaces rather than raw API/JSON panels.
- Admin scope: model add/edit/delete, routing, RPM/TPM, user key/IP controls, QR 2FA and operational status.
- User scope: chat, image generation/editing, collaborative chat, feed, notes, project/workspace, file/assets and settings.
- Preserve mobile full-screen flows and PC QR login.
- Keep page text minimal and commercial-product-level rather than prototype-heavy.
- Maintain Flutter SDK 3.44.0 compatibility and finish Android build/device validation.
- Add robust live backend data binding, offline/error/loading states and end-to-end acceptance.
- FCN integration must be adapter/reuse based, not a parallel stack.

Next implementation unit:
1. Inventory every current screen against a real endpoint/service.
2. Mark each as mock/partial/live/acceptance-verified.
3. Connect the highest-value incomplete user flows first.
4. Then finish admin operational controls and Android acceptance.

## 4. WLatch / session loop

Repository: `admin_nodove/wlatch-sessionloop`
Baseline main: `b4d7ed45e72b8595f61dac6718618875e4914bc5`
PR1–PR5 are merged.

Completed / established:
- Connection protocol R3 source integrated.
- Request/SSE/canary transport stabilization completed.
- Replay identities and response observer lifecycle isolation completed.
- Readiness bound to exact provider authentication revision.
- Restart-safe live canary receipts implemented.

Unfinished latest plan:
- Continue from the exact latest unfinished RICH/UI and recovery item; do not restart completed PRs.
- RICH track: common panel, Markdown, code/table/media/streaming, image viewer, upload/asset linking, non-destructive editing/versioning.
- Repair any regression before advancing.
- Resolve known reconciliation/readiness/lease/idempotency blockers instead of masking them.
- Preserve production release identity, native-host idempotency and runtime/source matching.
- Restore continuous-task behavior where loops can remain stuck at concurrency=1 or lease recovery gates.
- Complete UI release-identity and reconciliation backlog handling.
- Maintain exact API/SSE/replay contracts already hardened by PR1–PR5.

Next implementation unit:
1. Re-read the latest task/plan file and source tree.
2. Identify the first unfinished RICH/recovery acceptance item.
3. Implement only that next item with regression tests.
4. Publish as a new PR after verifying no duplicate/open branch exists.

## 5. Blog

Repository: `admin_nodove/blog`
Recent main: `18a15e125de1fef563355c306ad72e32e049fee1`

Completed / established:
- Integrated delivery/release docs, reader experience and SEO handoff docs exist.
- Admin Flutter app includes dashboard, AI, analytics, config, content, logs, RAG, secrets, workers and post creation surfaces.
- Validation workflows exist for backend, frontend visual, k3s and workers.

Unfinished latest plan:
- Compare recent local/blog work with Forgejo main before upload; never overwrite newer remote work.
- Finish reader UX cleanup and commercial-quality layout.
- Keep AI features explicitly activated and cancellation/SSE behavior correct.
- Continue admin/API surface connection so operational functions are rendered as usable components, not raw JSON.
- Preserve backend/content/deployment validation and avoid deploying stale generated artifacts.
- Reconcile open work with `document` project changes where shared docs/AI client behavior overlaps.

## 6. document / Docs Hub

Repository: `admin_nodove/document`
Baseline main: `e1cfa987838167d55b20d8a45c103c97e8b4c64d`
Open PR #1: explicit AI activation and request cancellation/SSE correctness.

Completed / established:
- Docs agent lab and 20 concept pages exist.
- Docs-site split view and AI client/chat modules exist.
- PR #1 contains the current AI transport correction work.

Unfinished latest plan:
- Finish PR #1 without weakening explicit activation, cancellation or SSE state correctness.
- Continue Docs Hub UI consolidation: reduce excessive top copy, tighten spacing, improve mobile layout and preserve a clean commercial presentation.
- Keep source/citation/evidence workflows central to the docs experience.
- Avoid duplicated plan text: use this registry only as a cross-project index and point to repository-local source plans.

## 7. Community / collaboration app

Repository: `admin_nodove/community-refined-flutter`
Recent active repository, last updated 2026-09-21.

Unfinished latest plan:
- Align collaboration/community flows with FilamAI/FCN rather than creating parallel identity/workspace/file systems.
- Keep refined mobile-first Flutter UX.
- Identify features that should become reusable shared components/services versus FCN-specific execution flows.
- Connect live backend services and add acceptance tests before expanding screens.

## 8. Forgejo / infrastructure work

Cross-project unfinished infrastructure:
- Keep Forgejo PR workflow as the publication boundary for implementation changes.
- Before writing: resolve default branch/head, inspect open PRs and avoid duplicate branches.
- For write conflicts or unknown outcomes: re-read Forgejo state before retrying.
- Complete protected CI runner/gate execution for AI-server.
- Keep k3s/Helm/service deployment changes separated from documentation-only PRs unless explicitly required.
- Forgejo SSH service must map the expected Forgejo SSH port correctly; do not confuse NodePort 30222 -> Pod 22 with internal Forgejo SSH 2222 expectations.
- Cloudflare Access/MCP public metadata exposure remains a separate gateway/infrastructure concern.

## 9. Global completion rule

A plan item is not complete merely because:
- a document exists,
- code exists on a branch,
- focused tests pass,
- or a feature appears in one UI.

Completion requires the repository-specific acceptance conditions, source/manifest consistency where applicable, integration tests and the required runtime/deployment verification.

When later work changes a plan:
1. update the repository-local authoritative plan/status file,
2. record the implementation PR/commit,
3. update this cross-project registry only with a short status/pointer,
4. never duplicate the full implementation specification here.
