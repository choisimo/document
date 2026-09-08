# Hub build data

`hub_data.py` exports the pages MkDocs actually publishes. Keep the
`preserve_readme.py` hook registered before it: the algorithm catalog's
`README.md` and sibling `index.md` have different public URLs.

`on_nav` records the included source manifest and navigation topics.
`on_page_content` captures rendered Markdown and its final heading IDs without
changing the normal page HTML. `on_post_build` writes `hub/catalog.json` and
`hub/content/<id>.json`. The app loads the catalog as `window.NDHUB_DATA`.

The catalog has `schemaVersion: 1`, `basePath`, `generatedAt` (UTC build time),
`categories`, `intents`, `docs`, `stacks`, and `searchIndexUrl`. Categories are
the six source groups declared in the hook. A document appears once, including
published pages absent from navigation; unknown source groups use `tools`.

| Document field | Source and meaning |
| --- | --- |
| `id` | First 16 hexadecimal characters of SHA-256 over MkDocs `src_uri` |
| `source`, `path` | The same `src_uri`; `path` preserves the app data interface |
| `url` | Exact MkDocs `page.file.url`, relative to the site root |
| `contentUrl` | Site-root URL with the configured deployment base path |
| `title` | MkDocs page title: explicit nav title, metadata, H1, then filename |
| `description`, `descriptionSource` | Authored metadata or the first actual body paragraph, limited to 220 characters; source is `metadata` or `excerpt` |
| `category`, `topic` | Source-prefix category and closest navigation section, with the source directory as topic fallback |
| `tags` | Authored string list; empty when absent |
| `intent`, `intentInferred` | Authored supported intent or a conservative title/path inference, defaulting to `reference` |
| `minutes`, `minutesEstimated` | At least one minute, estimated using 220 whitespace-separated words per minute; always marked estimated |
| `date` | Authored date only, otherwise empty |
| `toc` | Actual heading `{id, title, level}` entries |
| `sections` | Actual TOC titles below H1, for app compatibility |

Each content JSON is `{id, html, toc, url}`. The HTML retains source markup,
including code and SVG. Its `href` and `src` attributes resolve relative to the
document's canonical URL, with the site's configured base path. External URLs
keep their destinations. Fragment-only links become the canonical document URL
plus the fragment; the app maps these to its reader route. The app must not add
the deployment prefix to `contentUrl`, `searchIndexUrl`, or stack URLs again.
The existing MkDocs search index remains available for lazy full-text search.

Stacks are grouped by actual directories below `infra/docker/stacks`. A primary
Compose file supplies `serviceDetails` (name, image, and ports), `services`, and
`images`. Prefer `docker-compose.yaml`, `docker-compose.yml`, `compose.yaml`,
then `compose.yml`; other variants use filename order. `files` lists the public
Compose variants and README with their synchronized `/extra/docker/stacks/`
URLs. `doc` links to the corresponding group's actual document ID when present.
Titles and descriptions come from the README or directory name. The remaining
display fields are `group`, `color`, `glyph`, `repo`, `path`, `file`, `tags`,
and `url`.

The hook never reads `.env` files, interpolates variables, or serializes Compose
environment settings. Hidden paths, generated `target` directories, and symlinks
to private or external paths are excluded from stack metadata. If the primary
file is unreadable, invalid YAML, or lacks a valid `services` mapping,
`metadataStatus` is `unavailable` and `services` is `null`; the source filename
is logged without parser input. Otherwise the status is `parsed`. Placeholder
ports and images remain the literal source strings.

Run a full build; an incomplete page capture fails instead of writing a partial
catalog. `--dirty` is unsupported. A full rebuild removes obsolete content JSON.
The later `sync-extra-assets.sh` step must run before validating public stack
file URLs or publishing the site.

With the dependencies from `apps/docs-site/requirements.txt` installed:

```sh
python -m unittest discover -s apps/docs-site/hooks/tests -v
python -m mkdocs build --clean --strict --config-file apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh dist/site/extra
```

Tests use temporary real Markdown, Compose, files, and MkDocs builds with the
existing hooks. No additional test dependency is required.
