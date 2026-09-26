# 2026-09-26 source preservation and current-state audit

The audit published recovered work to the existing project branches or explicit preservation branches, then checked remote commit/blob identities. Existing main branches were not merged, rewritten, or deployed. ATLAS 360 was published as a new private repository with its original history.

The initial inventory covered 63 known repositories and 140 PRs with complete pagination. ATLAS brings the known repository count to 64. The 21 core repositories in the accompanying registry were re-read at 12:37 UTC, including open-PR pagination to the empty page. These are observations of accessible repositories, not claims about all private workspaces or all PR-less branches.

## Newly published work

| Project | Remote destination | Preserved content and verification |
|---|---|---|
| Blog Admin Studio | [PR4](https://git.nodove.com/admin_nodove/blog/pulls/4), `a99d8fc65097235c0999342f2108ddd59e647af5` | 160 implementation files + 7 validation records; 167/167 remote SHA and size matches. Draft/WIP; full application and runtime gates remain pending. |
| Blog editorial audit | [PR5](https://git.nodove.com/admin_nodove/blog/pulls/5), `408bb5ed31019eb0220e965906e58495d3285e2d` | Original 361,318-byte audit report; exact blob `107cf23136e8169147c7ac0fbabdae5f6b120419`. Report preservation does not revalidate all historical claims. |
| IntelliAlgo | [PR2](https://git.nodove.com/admin_nodove/IntelliAlgo/pulls/2), `aaecc531167fe1ec0e53fcbfaa147c3656a0dd9c` | 74 paths, 8,550,504 bytes; all remote SHA/size checks match. Includes game plans, 240 design questions, 50 candidate designs, prototype evidence, and the complete game plan produced during this audit. The 3,977,903-byte Selector HTML is preserved as a lossless three-part ZIP with a tested restoration command. |
| FCN documents/design | [PR2](https://git.nodove.com/admin_nodove/fcn/pulls/2), `68b42ca25ee4cb1ce3dc3f5f74fc330dad2b0b6e` | Original 247 missing files preserved: 242 in the PR branch and five large originals in dedicated asset branches. All original blobs match. The PR branch alone is not the original complete tree. See its `docs/fcn/REMOTE_PRESERVATION_20260926.json`. |
| FCN concept Site | [preservation branch](https://git.nodove.com/admin_nodove/fcn/src/branch/preserve/fcn-concept-explorer-20260926), `95a66c9cf15a961b3e0fb8b33bbcee8befe03211` | Original two-commit history and 32 tracked files, including the large preview image; exact commit/tree/file identities. Linked from FCN PR2. |
| Community | [PR1](https://git.nodove.com/admin_nodove/community/pulls/1), `1d0d3884b72c64427d20387286ecfa5569e1b887` | Original canonical source commit `f51afd7ed2c6c1cf34ebc52ef7bcf0a0e15b41e0`: 501/501 source paths/modes/blobs match the independent manifest. The final PR adds one publication record, for 502 paths; zero gitlinks. |
| Community older evidence | [archive branch](https://git.nodove.com/admin_nodove/community/src/branch/archive/design-evidence-20260921), `0bed898c045262b25019c9e0bff0476882cac785` | All 59 design/QA artifacts omitted from the slim source plus three older metadata versions preserved exactly, with one archive README. Source production files deleted between the full and slim snapshots: zero. Original full-history transport failed; the source and evidence contents are preserved across refs. |
| Pet-auto v3.2.0 | [PR1](https://git.nodove.com/admin_nodove/pet-auto-automation-v3.1.0/pulls/1), `e46cfbd602bcc9d8f7775d1379e6dca0441c21d5` | 39 original changes + 3 validation records; 42/42 remote SHA/size matches. Main remains v3.1.0. |
| ATLAS 360 | [private repository](https://git.nodove.com/admin_nodove/atlas-360), `71c85ab9c8d7f432ca750d479b32886a1dc47030` | Distinct from neuro-atlas: original WebGL Site, one commit, eight tracked files. Exact original commit/tree/file identities; Site deployment configuration unchanged. |
| FilamAI backend R1 patch | [PR1](https://git.nodove.com/admin_nodove/filamai-backend/pulls/1), `aa710cfdc672a5ab126202a8414c84d48fdb6a15` | Original 88,722-byte adapter patch and recovery README, two verified files. Patch syntax checked, but not applied to the newer baseline. |
| FilamAI frontend R1 patch | [PR1](https://git.nodove.com/admin_nodove/filamai-frontend/pulls/1), `2e865997f319980018219a2d4f5fce135cadf903` | Original 104,929-byte adapter patch and recovery README, two verified files. Patch syntax checked, but not applied to the newer baseline. |
| FilamAI recovery records | [PR3](https://git.nodove.com/admin_nodove/filamai/pulls/3), `2c163a214685ce9e95b976c34a9ba8d6090ff72a` | Canonical manifest, historical status and current publication blocker, three verified files. This is evidence preservation, not a completed canonical source upload. |
| Central registry | [Document PR2](https://git.nodove.com/admin_nodove/document/pulls/2) | Updated 21-project registry, this publication record, and original 325,849-byte repository learning report. Existing standard-library registry validator passes. Use the PR's current commit, rather than a self-referential SHA in this file. |

## FCN large original assets

| Branch | Exact commit |
|---|---|
| `preserve/fcn-docs-assets-20260926-1` | `3807ae3bb7a3354f81017987824c32fc1dbc0cd7` |
| `preserve/fcn-docs-assets-20260926-2` | `dfae10df08ce42e4d9e2b0561a3ff1a8fb463a87` |
| `preserve/fcn-docs-assets-20260926-3` | `43eb31f4fff507eba5d351727306fd286a5886a1` |
| `preserve/fcn-docs-assets-20260926-4` | `c1e1688d119bf1b8ce37774fc37f60bb1955a559` |
| `preserve/fcn-docs-assets-20260926-5` | `00bcfddbace4283f8aab1154120ac5303373db08` |

The original full FCN bundle exceeded practical connector transport limits. Cross-ref blob lookup could not assemble these five large files into the PR tree. Their bytes are uploaded and verified; combining them into the original paths requires a normal Git checkout that fetches all five refs. No destructive retry or forced branch replacement was used.

## Work already uploaded by other agents

| Project | Latest observed identity | Evidence |
|---|---|---|
| AI-server | PR85 `7306dad1f7910d5df5ff8026f49295cba81948f1`; PR81–85 open | Two available snapshots of 2,800 and 2,863 files match remote blobs; zero unmatched. These overlap and are not a unique combined file count. PR-specific changed-file checks: 15/3/13/5/99 matches. |
| Edu-connector | PR1 `d85cef3a3fb01b275222bc37683ea0d922eddfd0`; PR2 `8403cbfd7484ea8d65c6b8581622903467be3c54` | PR1 has 714/714 manifest path/mode/blob/size matches and exact tree identity. PR2 Flutter/server implementation exists. |
| WLatch | PR14 `ff0f485cc6bea978d9673471d3ae7bdbd9674657` | 15 changed remote paths exist; seven available evidence files match. Full latest ZIP download remains blocked; runtime wiring and settlement/publication integration remain separate implementation work. |
| Forgejo MCP | PR18 `0521b25a7b539ba2ef23c75f47d8cfc40cc6959e` | Implementation blob matches. Connected runtime remains main `bb06188b41b1c5651b141217ffb4132feafa3cc7`, version 2.2.0/27 tools; the PR's 29-tool candidate is unmerged and undeployed. |
| Document | PR1 `a9582848231e6ab3a45f3d1d7c16aa36799813fe` | Latest checked-in verification identity agrees with the head; PR body predates later commits. |
| media-mcp | PR6 `07ad7dca3687ff3062936387429b81975442cd90` | Latest source artifact identity agrees; this cumulative branch includes predecessors PR1–5. |
| Writing / Marson | Writing posts tree `f9bc8477a1ee198f2822808bb3c71c534df9c873`; Marson latest OW-00 manifest | Writing's 281 baseline Markdown posts have exact tree identity. Marson manifest and six selected source/evidence hashes match. This is not all later archives or manuscripts. |

Selected neuro-atlas checksum handling and fix_jb API configuration changes are already on their remote branches. Complete archive equality was not established for those projects or the codex-chatgpt-web ZIP candidates.

## Validation performed during this audit

- Blog: 23 client tests, contract typecheck for five roots, syntax checks for 30 files, and OpenAPI generation for 131 paths/156 operations passed. Full application/browser/runtime validation was not run.
- Pet-auto: 155 tests, 823 snippet checks and 82 package checksum checks passed.
- Community: contract checks and Git integrity passed. Flutter SDK was unavailable; no Flutter build, runtime or deployment check is claimed.
- IntelliAlgo: artifact integrity, exact bytes/hashes, ZIP CRC/path checks and Selector reconstruction passed. Prior product tests were not rerun.
- Central registry: existing validator passes for 21 projects. All newly uploaded deliverables were read back from remote by immutable commit or exact tree identity.

Recorded AI-server 5,783 pass/2 skip and Edu/Flutter test results belong to prior agents. They were not rerun during this audit. Some PR bodies retain old counts or commit references; checked-in reports and fresh heads are authoritative for this audit.

## Incomplete or blocked work

1. **FilamAI canonical source:** main still pins old frontend `172731fe` and backend `90c1503e`. The newer FE10/B1.2 bundle downloads return HTTP502; expected frontend `6ee69ea76482ba144558799d65d9ff671f23da8a` and backend `d22d99283e85b2d022a648fe2e4cfe2117e3ccad` could not be resolved remotely. Their documented 2,176 total paths are not a missing-change count. Source bytes and exact diff remain unavailable. Parent PR3 records the recovery targets; its main submodule URLs still reference the original GitHub owner.
2. **IntelliAlgo:** full PR03b source ZIP (31.7 MB), some spreadsheets and further binary archives remain inaccessible. Preserved prototypes and the reconstructed Selector do not establish full source parity. The previously merged Flutter PR's `CURRENT_SOURCE_*` regeneration remains separate pending work.
3. **Freelance application materials:** private source bundle/tar downloads return HTTP502. Known repository lookups return unavailable/not found. The 84-file manifest and recovery notes do not substitute for source inspection; no empty repository or unreviewed personal-material upload was created.
4. **Other archives:** 8,303 unique file metadata records were screened, including 1,964 archive/patch/bundle candidates with historical duplicates. This is metadata coverage, not all-byte verification. Canonical targets remain unresolved for several independent OpenCode, infrastructure, skills, demo, career and opaque archive families. These were not blindly assigned to unrelated repositories.
5. **Visibility:** other agents' inaccessible private checkouts, every PR-less branch, live CI/checks and deployments are outside the verified surface. Upload completion must not be conflated with product completion, merge readiness or runtime acceptance.

Next concrete recovery work is to restore readable FilamAI, IntelliAlgo and freelance original downloads; establish canonical destinations for unresolved archive families; and integrate the already-preserved FCN asset refs if a single complete PR tree is required. No existing main was merged or deployed as part of this task.
