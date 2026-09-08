"""Run with the Python environment from apps/docs-site/requirements.txt.

python -m unittest discover -s apps/docs-site/hooks/tests -v
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml
from mkdocs.config import load_config
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.exceptions import BuildError
from mkdocs.structure.files import File, Files, InclusionLevel
from mkdocs.structure.pages import Page

HOOKS = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("hub_data_tests", HOOKS / "hub_data.py")
assert SPEC is not None and SPEC.loader is not None
hub = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = hub
SPEC.loader.exec_module(hub)


class Fixture:
    def __init__(self, root: Path, site_url: str = "https://docs.example.test/manual/") -> None:
        self.root = root
        self.docs = root / "content/docs"
        self.site = root / "dist/site"
        self.config_path = root / "apps/docs-site/mkdocs.yml"
        self.write("content/docs/index.md", "# Home\n\nActual home paragraph.\n")
        self.write("content/docs/algorithms/algorithm-architect/index.md", "# Landing\n\nLanding body.\n")
        self.write("content/docs/algorithms/algorithm-architect/README.md", "# Catalog\n\nCatalog body.\n")
        self.write("content/docs/development/setup.md", """---
title: Setup & examples
description: Authored description
tags: [Python, CLI]
date: 2026-09-08
intent: howto
---
# Setup {#setup}

Actual setup paragraph with **formatting** and &amp; punctuation.

## Section *one* {#section-one}

[Database](../../databases/guide.md#target)

[Catalog](../../algorithms/algorithm-architect/README.md)

[Section](#section-one)

![Asset](../../asset.svg)

<a href="/raw/config.yaml">Raw configuration</a>

```html
<a href="literal">Code remains literal</a>
```

<svg viewBox="0 0 10 10"><foreignObject><p>SVG body</p></foreignObject></svg>
""".replace("../../", "../"))
        self.write("content/docs/databases/guide.md", "# Database\n\nFirst actual excerpt.\n\n## Target {#target}\n\nBody.\n")
        self.write("content/docs/tools/unlisted.md", "# Unlisted\n\nPublished outside the nav.\n")
        self.write("content/docs/asset.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>')
        config = {
            "site_name": "Hub fixture",
            "site_url": site_url,
            "docs_dir": "../../content/docs",
            "site_dir": "../../dist/site",
            "theme": "mkdocs",
            "exclude_docs": "/algorithms/algorithm-architect/README.md\n",
            "hooks": [str(HOOKS / "preserve_readme.py"), str(HOOKS / "hub_data.py")],
            "nav": [
                {"Home": "index.md"},
                {"Algorithms": [
                    {"Landing": "algorithms/algorithm-architect/index.md"},
                    {"Catalog": "algorithms/algorithm-architect/README.md"},
                ]},
                {"Development": [{"Setup": "development/setup.md"}]},
                {"Database": "databases/guide.md"},
            ],
            "markdown_extensions": ["attr_list", "toc", "fenced_code"],
            "validation": {"links": {"absolute_links": "info"}},
        }
        self.write("apps/docs-site/mkdocs.yml", yaml.safe_dump(config, allow_unicode=True))

    def write(self, relative: str, text: str) -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def config(self) -> MkDocsConfig:
        return load_config(str(self.config_path))

    def build(self, *options: str) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            [sys.executable, "-m", "mkdocs", "build", "--strict", "--config-file", str(self.config_path), *options],
            text=True, capture_output=True, check=False,
        )
        if result.returncode:
            raise AssertionError(result.stdout + result.stderr)
        return result

    def catalog(self) -> dict:
        return json.loads((self.site / "hub/catalog.json").read_text(encoding="utf-8"))


class HubDataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="document-hub-data-")
        self.addCleanup(self.temporary.cleanup)
        self.fixture = Fixture(Path(self.temporary.name))

    def test_all_source_prefixes_have_one_stable_category(self) -> None:
        groups = {
            "infrastructure": ["infrastructure", "k8s", "proxmox", "linux", "linux-extra", "nginx", "extra/docker"],
            "security": ["security"],
            "development": ["development", "java", "projects"],
            "databases": ["databases", "ai"],
            "computer-science": ["algorithms", "books", "compiler", "os"],
            "tools": ["tools", "prompts", "adr", "extra/memo", "new-section"],
        }
        self.assertEqual(set(groups), {category["id"] for category in hub.CATEGORIES})
        self.assertTrue(all(category["desc"] and category["icon"] for category in hub.CATEGORIES))
        for category, prefixes in groups.items():
            for prefix in prefixes:
                with self.subTest(prefix=prefix):
                    self.assertEqual(hub.category_for_source(prefix + "/index.md"), category)
        self.assertEqual(hub.category_for_source("index.md"), "tools")

    def test_url_rebasing_preserves_raw_markup_and_external_urls(self) -> None:
        config = self.fixture.config()
        cases = {
            "../other/?q=one&amp;two=2#topic": "/manual/development/other/?q=one&two=2#topic",
            "#topic": "/manual/development/setup/#topic",
            "/raw/file.yaml": "/manual/raw/file.yaml",
            "/manual/raw/file.yaml": "/manual/raw/file.yaml",
            "https://external.example/a": "https://external.example/a",
            "//cdn.example/a": "//cdn.example/a",
            "mailto:docs@example.test": "mailto:docs@example.test",
            "data:image/svg+xml;base64,AAAA": "data:image/svg+xml;base64,AAAA",
        }
        for value, expected in cases.items():
            with self.subTest(value=value):
                self.assertEqual(hub.rebase_url(value, "development/setup/", config), expected)
        self.assertEqual(hub.rebase_url("#home", "./", config), "/manual/#home")
        source = '''<!-- keep -->
<svg viewBox="0 0 10 10"><foreignObject><P>Mixed &amp; text</P></foreignObject></svg>
<p><a data-example='href="literal"' href="../other/?a=1&amp;b=2#x">Link</a><img src=../../asset.svg></p>
<script>const html = '<a href="untouched">';</script>
<code>&lt;a href="code-literal"&gt;</code>
'''
        reader = hub.ContentReader("development/setup/", config)
        reader.feed(source)
        expected = source.replace('href="../other/?a=1&amp;b=2#x"', 'href="/manual/development/other/?a=1&amp;b=2#x"')
        expected = expected.replace("src=../../asset.svg", 'src="/manual/asset.svg"')
        self.assertEqual(reader.rebased_html(), expected)
        self.assertNotIn("const html", " ".join(reader.text))
        config.site_url = "https://docs.example.test/"
        self.assertEqual(hub.rebase_url("../other/", "development/setup/", config), "/development/other/")

    def test_real_build_exports_every_page_with_content_and_distinct_readme_route(self) -> None:
        self.fixture.build()
        catalog = self.fixture.catalog()
        docs = {doc["source"]: doc for doc in catalog["docs"]}
        self.assertEqual(len(docs), 6)
        self.assertEqual(len(catalog["categories"]), 6)
        self.assertEqual(catalog["basePath"], "/manual/")
        self.assertEqual(catalog["searchIndexUrl"], "/manual/search/search_index.json")
        self.assertEqual(set(docs), {path.relative_to(self.fixture.docs).as_posix() for path in self.fixture.docs.rglob("*.md")})
        for source, doc in docs.items():
            self.assertEqual(doc["id"], hashlib.sha256(source.encode()).hexdigest()[:16])
            content_path = self.fixture.site / doc["contentUrl"].removeprefix("/manual/")
            content = json.loads(content_path.read_text(encoding="utf-8"))
            self.assertEqual(content["id"], doc["id"])
            self.assertEqual(content["url"], doc["url"])
            self.assertEqual(content["toc"], doc["toc"])
            self.assertTrue(content["html"].strip())
            self.assertNotIn("kind", doc)
            for entry in doc["toc"]:
                self.assertIn('id="' + entry["id"] + '"', content["html"])
            self.assertTrue(doc["minutesEstimated"])
        readme = docs["algorithms/algorithm-architect/README.md"]
        landing = docs["algorithms/algorithm-architect/index.md"]
        self.assertNotEqual(readme["id"], landing["id"])
        self.assertEqual(readme["url"], "algorithms/algorithm-architect/README/")
        self.assertEqual(landing["url"], "algorithms/algorithm-architect/")
        self.assertTrue((self.fixture.site / readme["url"] / "index.html").is_file())
        self.assertTrue((self.fixture.site / landing["url"] / "index.html").is_file())
        setup = docs["development/setup.md"]
        # Match the published page: an explicit nav title precedes source metadata.
        self.assertEqual(setup["title"], "Setup")
        self.assertEqual(setup["description"], "Authored description")
        self.assertEqual(setup["descriptionSource"], "metadata")
        self.assertEqual(setup["tags"], ["Python", "CLI"])
        self.assertEqual(setup["date"], "2026-09-08")
        self.assertFalse(setup["intentInferred"])
        self.assertEqual(setup["sections"], ["Section one"])
        payload = json.loads((self.fixture.site / setup["contentUrl"].removeprefix("/manual/")).read_text())
        self.assertIn('href="/manual/databases/guide/#target"', payload["html"])
        self.assertIn('href="/manual/algorithms/algorithm-architect/README/"', payload["html"])
        self.assertIn('href="/manual/development/setup/#section-one"', payload["html"])
        self.assertIn('src="/manual/asset.svg"', payload["html"])
        self.assertIn('href="/manual/raw/config.yaml"', payload["html"])
        self.assertIn("</foreignObject>", payload["html"])
        normal_page = (self.fixture.site / setup["url"] / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="../../databases/guide/#target"', normal_page)
        self.assertNotIn('href="/manual/databases/guide/#target"', normal_page)
        self.assertEqual(docs["databases/guide.md"]["description"], "First actual excerpt.")
        self.assertEqual(docs["databases/guide.md"]["descriptionSource"], "excerpt")
        self.assertEqual(docs["databases/guide.md"]["date"], "")
        self.assertTrue(docs["tools/unlisted.md"]["intentInferred"])
        self.assertEqual(set(catalog) & {"keyFixtures", "references", "snippets"}, set())

    def test_compose_metadata_uses_only_public_whitelisted_fields(self) -> None:
        fixture = self.fixture
        stack = "infra/docker/stacks/databases/example"
        fixture.write(stack + "/docker-compose.yaml", """services:
  database:
    image: postgres:17
    ports:
      - "127.0.0.1:5432:5432"
      - target: 5432
        published: "5433"
        protocol: tcp
    environment:
      PRIVATE_VALUE: compose-environment-sentinel
    env_file: .env
  worker:
    build: .
""")
        fixture.write(stack + "/docker-compose.dev.yaml", "services: {different: {image: alternate:1}}\n")
        fixture.write(stack + "/README.md", "# Actual **database**\n\nActual public explanation.\n")
        env_file = fixture.write(stack + "/.env", "services: {private: {image: private-env-sentinel}}\n")
        fixture.write(stack + "/.env.example", "example-not-exported-sentinel\n")
        fixture.write("infra/docker/stacks/databases/broken/compose.yaml", "services: [invalid yaml-sentinel\n")
        outside = fixture.write("outside/compose.yaml", "services: {outside: {image: outside-sentinel}}\n")
        fixture.write("infra/docker/stacks/.sourcebot/compose.yaml", "services: {ignored: {image: ignored-sentinel}}\n")
        fixture.write("infra/docker/stacks/target/compose.yaml", "services: {ignored: {image: ignored-target-sentinel}}\n")
        symlink_dir = fixture.root / "infra/docker/stacks/databases/symlinks"
        symlink_dir.mkdir()
        (symlink_dir / "compose.yaml").symlink_to(env_file)
        (symlink_dir / "compose.outside.yaml").symlink_to(outside)
        stacks = hub.collect_stacks(fixture.config(), [{"source": "extra/docker/stacks/databases/index.md", "id": "group-doc"}])
        self.assertEqual(len(stacks), 2)
        valid = next(item for item in stacks if item["title"] == "Actual database")
        self.assertEqual(valid["services"], 2)
        self.assertEqual(valid["images"], ["postgres:17"])
        self.assertEqual(valid["file"], "docker-compose.yaml")
        self.assertEqual(valid["desc"], "Actual public explanation.")
        self.assertEqual(valid["doc"], "group-doc")
        self.assertEqual(valid["serviceDetails"][0]["ports"], ["127.0.0.1:5432:5432", {"target": 5432, "published": "5433", "protocol": "tcp"}])
        self.assertIsNone(valid["serviceDetails"][1]["image"])
        self.assertEqual({item["name"] for item in valid["files"]}, {"docker-compose.yaml", "docker-compose.dev.yaml", "README.md"})
        self.assertTrue(all(item["url"].startswith("/manual/extra/docker/stacks/") for item in valid["files"]))
        broken = next(item for item in stacks if item["metadataStatus"] == "unavailable")
        self.assertIsNone(broken["services"])
        self.assertEqual(broken["serviceDetails"], [])
        self.assertNotIn("sentinel", json.dumps(stacks))

    def test_rebuild_removes_deleted_documents_and_old_content(self) -> None:
        self.fixture.build()
        old = next(doc for doc in self.fixture.catalog()["docs"] if doc["source"] == "tools/unlisted.md")
        (self.fixture.docs / old["source"]).unlink()
        self.fixture.build()
        self.assertEqual(len(self.fixture.catalog()["docs"]), 5)
        self.assertFalse((self.fixture.site / old["contentUrl"].removeprefix("/manual/")).exists())

    def test_incomplete_capture_fails_and_excluded_pages_are_not_exported(self) -> None:
        config = self.fixture.config()
        hub.on_pre_build(config)
        hub._state.expected = {"index.md"}
        with self.assertRaisesRegex(BuildError, "incomplete"):
            hub.on_post_build(config)
        self.assertFalse((self.fixture.site / "hub/catalog.json").exists())
        file = File("index.md", config.docs_dir, config.site_dir, True)
        file.inclusion = InclusionLevel.EXCLUDED
        page = Page("Excluded", file, config)
        self.assertEqual(hub.on_page_content("<p>Excluded content</p>", page, config, Files([file])), "<p>Excluded content</p>")
        self.assertEqual(hub._state.documents, {})


if __name__ == "__main__":
    unittest.main()
