# docs-validator-rs

Rust CLI binary for strict documentation validation:

- strict Mermaid parsing (`merman_core::ParseOptions::strict()`)
- strict markdown/html document link resolution + anchor validation
- markdown format convention analysis (headings, blank lines, tabs, fenced code blocks)

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
