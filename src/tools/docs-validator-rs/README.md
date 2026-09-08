# docs-validator-rs

Rust CLI binary for the repository-configured documentation checks:

- Mermaid parsing using the pinned `merman_core::ParseOptions::strict()` behavior
- configured Markdown/HTML link resolution and anchor validation within the selected scope
- markdown format convention analysis (headings, blank lines, tabs, fenced code blocks)

## Validation Scope and Evidence

This tool enforces the configured Mermaid parser, link/anchor resolver and Markdown convention rules for a recorded binary version and root paths. A zero exit status proves only that the scanned files passed those checks; it does not prove factual correctness, source freshness, accessibility, security, or compatibility with every Markdown renderer. Completion requires known-good and known-bad fixtures for each rule, deterministic diagnostics, the intended scan manifest, CI exit-code handling and documented exclusions.

---

## Run

From the repository root (the defaults also work from its subdirectories):

```bash
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml
```

Default scope:

- `--root content/docs`
- `--docs-base content/docs`
- `--link-root` is unset (source-only resolution)
- `--check all`

The repository's Compose indexes also link to generated raw assets. For the full
repository link check, build MkDocs, run `src/automation/site/sync-extra-assets.sh`,
and pass `--link-root dist/site`. A source-only run intentionally reports those
generated-only targets as missing.

### Useful options

```bash
# links only (larger cs-reference corpus)
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- \
  --root content/docs/books/cs-reference \
  --docs-base content/docs \
  --check links

# mermaid only
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --check mermaid

# source links plus published raw assets, after MkDocs build and asset sync
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- \
  --root content/docs --docs-base content/docs \
  --link-root dist/site --check links --list-files

# full-repo format analysis, summary only
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- \
  --root . \
  --docs-base content/docs \
  --check format \
  --summary-only
```

## Tests

```bash
cargo test --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml
```

## Manifest, failures, and exclusions

Relative input paths resolve from the discovered repository root, identified by `.git`
or the `content/docs` plus `apps/docs-site/mkdocs.yml` layout. Outside a repository,
paths resolve from the current directory. Explicit absolute paths remain absolute.

The default scans every regular `.md` file under `content/docs`, in sorted order.
It does not apply `.gitignore`; it does not follow directory symlinks. Archives,
rendered documents and other repository files are outside this published-source
scope unless explicitly selected with `--root`. The docs base supplies anchors for
cross-scope links without adding those files to the selected source manifest.

`--link-root` optionally supplies an existing generated-site directory, such as
`dist/site` after MkDocs and `sync-extra-assets.sh` have finished. Source-relative
links and `--docs-base` resolution run first, using the existing file, `.md` and
`index.md` candidates. Only an unresolved root-absolute link (`/extra/...`, not a
relative link or `//host/...`) can fall back to `--link-root`. The fallback requires
the exact file or a directory's `index.html`. It does not infer `.md` or `index.md`
aliases, because those files alone do not publish the requested URL. An empty
directory, typo, missing file, file URL with a trailing slash, traversal outside
the root or symlink to an outside file still fails. A missing or non-directory
`--link-root` is a configuration error.

An existing source target always owns its fragment check: a broken source anchor
cannot retry against a generated HTML page or another Markdown copy. Referenced
Markdown fragments in the additional root use the same heading/explicit-ID scanner,
loaded and cached on demand. Those files do not join the source manifest or the
Mermaid/format/link scan. Non-Markdown fragments, including rendered HTML IDs, still
require the separate rendered-site anchor check. Omitting `--link-root` preserves
the source-only policy; it does not silently search build output.

```bash
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- \
  --check all --list-files > validator-report.txt
```

`SCAN` lines list the actual source files even when validation finds issues.
Exit status is 0 only after the selected checks pass, and nonzero for issues,
missing or empty source roots, read/traversal errors, or invalid CLI arguments.
`--summary-only` suppresses issue detail, but preserves failure status and any
requested manifest. Capture stderr and the exit status as well as stdout in CI.

External HTTP/HTTPS and other recognized URI schemes are not fetched. Template
expressions are skipped. The current line-based resolver inspects inline Markdown
links and quoted HTML link attributes outside fenced code; reference-style links,
rendered HTML anchors and dynamic JavaScript routes need separate build/browser
checks. Mermaid validation uses the locked parser dependency, not the browser's
Mermaid renderer. Formatting rules express repository conventions rather than all
valid Markdown syntax. These limits must not be reported as whole-site correctness.

The CLI integration tests exercise the migrated defaults from root and nested
source checkouts, cross-scope anchors, the actual manifest, deterministic diagnostics,
nonzero status for malformed documents, summary-only failure, and missing/empty roots.
Library and CLI fixtures also cover the optional asset root, real static files and
directory indexes, source precedence, additional-root Markdown anchors, relative-link
typos, absent files, invalid roots, and unchanged source scope. Unix fixtures check
traversal and symlink boundaries using real temporary files.
