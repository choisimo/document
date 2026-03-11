# Markdown Format Analysis

Generated: 2026-03-11

## Scope

- Repository root: `/home/nodove/workspace/document`
- Analyzer: `tools/docs-validator-rs`
- Command:

```bash
tools/docs-validator-rs/target/debug/docs-validator-rs \
  --root . \
  --docs-base docs \
  --check format \
  --summary-only
```

## Summary

- Raw repository result: 3726 issues across 529 markdown files
- Repository content result excluding `.venv`, `.git`, `site`, `.ruff_cache`, `.sisyphus`, `tools/docs-validator-rs/target`: 3721 issues across 523 markdown files
- Files with at least one format issue: 354
- Main problem shape: fenced code block spacing dominates the failures

## Issues By Type

| Issue | Count |
| --- | ---: |
| missing blank line before fenced code block | 1891 |
| missing blank line after fenced code block | 425 |
| multiple consecutive blank lines | 388 |
| missing blank line before heading | 388 |
| multiple top-level headings | 362 |
| trailing whitespace | 134 |
| missing top-level heading (# ...) | 81 |
| tab character used for indentation/alignment | 33 |
| unclosed fenced code block | 11 |
| heading level jumps | 13 |

## Issues By Top-Level Directory

| Directory | Count |
| --- | ---: |
| `legacy` | 1944 |
| `docs` | 1220 |
| `proxmox` | 164 |
| `code` | 98 |
| `docker` | 80 |
| `configs` | 58 |
| `prompt` | 46 |
| `K8S-Study` | 43 |
| `project-docs` | 31 |
| `linux` | 31 |

## Primary Documentation Area

`docs/` is the main active publishing area and currently has 1220 issues across 235 files.

Top issue types inside `docs/`:

| Issue | Count |
| --- | ---: |
| missing blank line before fenced code block | 673 |
| missing blank line after fenced code block | 216 |
| multiple top-level headings | 103 |
| missing blank line before heading | 98 |
| multiple consecutive blank lines | 86 |
| trailing whitespace | 26 |
| unclosed fenced code block | 6 |
| missing top-level heading (# ...) | 6 |

Highest-issue files inside `docs/`:

| File | Count |
| --- | ---: |
| `docs/os/cpu-scheduling.md` | 188 |
| `docs/linux/filesystem.md` | 133 |
| `docs/development/docker/networking.md` | 59 |
| `docs/infrastructure/monitoring/prometheus-grafana-loki.md` | 57 |
| `docs/security/access/user-acl.md` | 44 |
| `docs/linux/proxmox/wireguard-vpn.md` | 34 |
| `docs/security/zerotrust/cloudflare.md` | 33 |
| `docs/infrastructure/storage/sshfs.md` | 32 |
| `docs/infrastructure/hardware/nano-pi-neo3.md` | 31 |
| `docs/infrastructure/storage/disk-format.md` | 23 |

## Supplemental Areas

- `legacy`: 1944 issues across 160 files
- `project-docs`: 31 issues across 10 files

Interpretation:

- `legacy` is the largest backlog and heavily inflates repository totals.
- `docs` is the highest-value cleanup target because it feeds the published site.
- `project-docs` is small enough to normalize quickly and can be used as a clean reference style.

## Priority Order

1. Normalize fenced code block spacing rules repository-wide.
2. Clean `docs/` high-issue files first, starting with `docs/os/cpu-scheduling.md` and `docs/linux/filesystem.md`.
3. Fix multiple top-level headings in published docs.
4. Clean trailing whitespace and consecutive blank lines as a mechanical pass.
5. Triage `legacy` separately so archive debt does not hide current-doc quality.

## Notes

- The current analyzer now supports `--check format` and `--summary-only`.
- The CLI exits with a non-zero status even in summary mode when issues are found, so it can be used in CI.
- Root-level scans include every markdown file under the selected root. For release gating, `docs/` should be treated as the primary target.
