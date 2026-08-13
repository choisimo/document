# docs-validator-rs

Rust CLI binary for the repository-configured documentation checks:

- Mermaid parsing using the pinned `merman_core::ParseOptions::strict()` behavior
- configured Markdown/HTML link resolution and anchor validation within the selected scope
- markdown format convention analysis (headings, blank lines, tabs, fenced code blocks)

## Validation Scope and Evidence

This tool enforces the configured Mermaid parser, link/anchor resolver and Markdown convention rules for a recorded binary version and root paths. A zero exit status proves only that the scanned files passed those checks; it does not prove factual correctness, source freshness, accessibility, security, or compatibility with every Markdown renderer. Completion requires known-good and known-bad fixtures for each rule, deterministic diagnostics, the intended scan manifest, CI exit-code handling and documented exclusions.

---

## Run

From repository root:

```bash
cargo run --manifest-path tools/docs-validator-rs/Cargo.toml
```

Default scope:

- `--root docs/books/cs-references`
- `--docs-base docs`
- `--check all`

### Useful options

```bash
# links only (larger cs-reference corpus)
cargo run --manifest-path tools/docs-validator-rs/Cargo.toml -- \
  --root docs/books/cs-reference \
  --docs-base docs \
  --check links

# mermaid only
cargo run --manifest-path tools/docs-validator-rs/Cargo.toml -- --check mermaid

# full-repo format analysis, summary only
cargo run --manifest-path tools/docs-validator-rs/Cargo.toml -- \
  --root . \
  --docs-base docs \
  --check format \
  --summary-only
```

## Tests

```bash
cargo test --manifest-path tools/docs-validator-rs/Cargo.toml
```
