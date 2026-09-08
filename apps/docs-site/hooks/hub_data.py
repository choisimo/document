"""Export the published MkDocs pages and public Compose files for the hub UI."""

from __future__ import annotations

import hashlib
import html as html_lib
import json
import logging
import math
import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import quote, urljoin, urlsplit

import markdown
import yaml
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.exceptions import BuildError
from mkdocs.structure import StructureItem
from mkdocs.structure.files import Files, InclusionLevel
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page
from mkdocs.structure.toc import AnchorLink

log = logging.getLogger("mkdocs.hooks.hub_data")
CATEGORIES = [
    {"id": "infrastructure", "name": "인프라", "label": "인프라", "icon": "server", "desc": "서버·네트워크·가상화·운영"},
    {"id": "security", "name": "보안", "label": "보안", "icon": "shield", "desc": "인증·접근 제어·보안 점검"},
    {"id": "development", "name": "개발", "label": "개발", "icon": "code", "desc": "개발 환경·언어·프로젝트"},
    {"id": "databases", "name": "데이터베이스", "label": "데이터베이스", "icon": "database", "desc": "데이터 저장·검색·AI 활용"},
    {"id": "tools", "name": "도구", "label": "도구", "icon": "wrench", "desc": "개발 도구·자동화·작업 안내"},
    {"id": "computer-science", "name": "컴퓨터 과학", "label": "컴퓨터 과학", "icon": "book", "desc": "알고리즘·자료구조·컴퓨터 시스템"},
]
CATEGORY_BY_SOURCE = {
    **dict.fromkeys(("infrastructure", "k8s", "proxmox", "linux", "linux-extra", "nginx"), "infrastructure"),
    "security": "security",
    **dict.fromkeys(("development", "java", "projects"), "development"),
    **dict.fromkeys(("databases", "ai"), "databases"),
    **dict.fromkeys(("algorithms", "books", "compiler", "os"), "computer-science"),
}
INTENTS = [
    {"id": "all", "label": "전체", "icon": "search"},
    {"id": "howto", "label": "설정 방법", "icon": "route"},
    {"id": "reference", "label": "참조", "icon": "book"},
    {"id": "comparison", "label": "비교", "icon": "columns"},
    {"id": "troubleshooting", "label": "문제 해결", "icon": "lifebuoy"},
]
# Match entire attribute values so href text inside another attribute stays intact.
HTML_ATTRIBUTE = re.compile(
    r'''([^\s"'<>/=]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))'''
)
COMPOSE_NAME = re.compile(r"^(?:docker-)?compose(?:[.-][\w-]+)*\.ya?ml$", re.I)
JsonObject = dict[str, Any]


@dataclass
class BuildState:
    categories: dict[str, JsonObject] = field(default_factory=dict)
    topics: dict[str, str] = field(default_factory=dict)
    expected: set[str] = field(default_factory=set)
    documents: dict[str, JsonObject] = field(default_factory=dict)
    contents: dict[str, JsonObject] = field(default_factory=dict)


_state = BuildState()


def document_id(source: str) -> str:
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]


def category_for_source(source: str) -> str:
    if source.startswith("extra/docker/"):
        return "infrastructure"
    return CATEGORY_BY_SOURCE.get(source.split("/", 1)[0], "tools")


def base_path(config: MkDocsConfig) -> str:
    path = urlsplit(config.site_url or "/").path
    return "/" + path.strip("/") + "/" if path.strip("/") else "/"


def site_path(config: MkDocsConfig, relative: str) -> str:
    return base_path(config) + relative.lstrip("/")


def rebase_url(value: str, page_url: str, config: MkDocsConfig) -> str:
    """Keep external URLs; resolve local paths against the document, not the SPA."""
    value = html_lib.unescape(value)
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return value
    base = base_path(config)
    if value.startswith("/"):
        return value if base == "/" or value.startswith(base) else base + value.lstrip("/")
    document_url = urljoin("https://hub.invalid" + base, page_url)
    resolved = urlsplit(urljoin(document_url, value))
    return resolved.path + ("?" + resolved.query if resolved.query else "") + (
        "#" + resolved.fragment if resolved.fragment else ""
    )


class ContentReader(HTMLParser):
    """Preserve rendered markup while extracting plain text and rebasing URLs."""

    def __init__(self, page_url: str = "", config: MkDocsConfig | None = None) -> None:
        super().__init__(convert_charrefs=False)
        self.page_url, self.config = page_url, config
        self.source = ""
        self.line_offsets = [0]
        self.replacements: list[tuple[int, int, str]] = []
        self.text: list[str] = []
        self.paragraphs: list[str] = []
        self.paragraph: list[str] | None = None
        self.ignored = 0

    def feed(self, data: str) -> None:
        self.source += data
        self.line_offsets = [0] + [match.end() for match in re.finditer("\n", self.source)]
        super().feed(data)

    def rebased_html(self) -> str:
        """Change URL attributes without reserializing SVG, code, or other markup."""
        output = []
        previous = 0
        for start, end, replacement in self.replacements:
            output.extend((self.source[previous:start], replacement))
            previous = end
        output.append(self.source[previous:])
        return "".join(output)

    def _start(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        raw = self.get_starttag_text()
        if self.config is not None:
            def replace(match: re.Match[str]) -> str:
                if match[1].lower() not in {"href", "src"}:
                    return match[0]
                value = next(value for value in match.groups()[2:] if value is not None)
                value = rebase_url(value, self.page_url, self.config)
                delimiter = "'" if match[4] is not None else '"'
                return match[1] + match[2] + delimiter + html_lib.escape(value, quote=True) + delimiter
            replacement = HTML_ATTRIBUTE.sub(replace, raw)
            if replacement != raw:
                line, column = self.getpos()
                start = self.line_offsets[line - 1] + column
                self.replacements.append((start, start + len(raw), replacement))
        if tag in {"script", "style"}:
            self.ignored += 1
        if tag == "p" and not self.ignored:
            self.paragraph = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._start(tag, attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._start(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style"}:
            self.ignored = max(0, self.ignored - 1)
        if tag == "p" and self.paragraph is not None:
            self.paragraphs.append(" ".join(" ".join(self.paragraph).split()))
            self.paragraph = None

    def handle_data(self, data: str) -> None:
        if not self.ignored:
            self.text.append(data)
            if self.paragraph is not None:
                self.paragraph.append(data)

    def handle_entityref(self, name: str) -> None:
        self.handle_data("&" + name + ";")

    def handle_charref(self, name: str) -> None:
        self.handle_data("&#" + name + ";")

def plain_text(value: str) -> str:
    reader = ContentReader()
    reader.feed(value)
    return " ".join(html_lib.unescape(" ".join(reader.text)).split())


def flatten_toc(items: Iterable[AnchorLink]) -> list[JsonObject]:
    entries = []
    for item in items:
        entries.append({"id": item.id, "title": plain_text(item.title), "level": item.level})
        entries.extend(flatten_toc(item.children))
    return entries


def infer_intent(title: str, source: str) -> str:
    text = (title + " " + source).lower()
    if re.search(r"비교|comparison|versus|\bvs\b", text):
        return "comparison"
    if re.search(r"문제\s*해결|장애|오류|troubleshoot", text):
        return "troubleshooting"
    if re.search(r"설치|설정|구성|가이드|installation|setup|configuration|deployment|guide|tutorial|how.?to", text):
        return "howto"
    return "reference"


def on_pre_build(config: MkDocsConfig) -> None:
    global _state
    _state = BuildState()
    _state.categories = {category["id"]: dict(category) for category in CATEGORIES}


def on_nav(nav: Navigation, config: MkDocsConfig, files: Files) -> Navigation:
    _state.expected = {file.src_uri for file in files.documentation_pages(inclusion=InclusionLevel.is_included)}

    def walk(node: StructureItem, parents: list[str]) -> None:
        if getattr(node, "is_page", False):
            _state.topics[node.file.src_uri] = parents[-1] if parents else node.title
        for child in getattr(node, "children", None) or []:
            walk(child, parents + [node.title])

    for item in nav.items:
        walk(item, [])
    return nav


def on_page_content(html: str, page: Page, config: MkDocsConfig, files: Files) -> str:
    if not page.file.inclusion.is_included():
        return html
    source = page.file.src_uri
    identifier = document_id(source)
    existing = _state.documents.get(identifier)
    if existing and existing["source"] != source:
        raise BuildError("Hub document ID collision")
    reader = ContentReader(page.file.url, config)
    reader.feed(html)
    title = plain_text(str(page.title or source))
    toc = flatten_toc(page.toc)
    category = category_for_source(source)
    topic = _state.topics.get(source, Path(source).parent.name or "문서")
    description = page.meta.get("description")
    authored_description = isinstance(description, str) and bool(description.strip())
    if not authored_description:
        description = next((paragraph for paragraph in reader.paragraphs if paragraph), "")
    description = plain_text(str(description or ""))
    if len(description) > 220:
        description = description[:217].rstrip() + "…"
    tags = page.meta.get("tags", [])
    tags = [tag for tag in tags if isinstance(tag, str)] if isinstance(tags, list) else []
    intent = page.meta.get("intent")
    explicit_intent = intent in {item["id"] for item in INTENTS if item["id"] != "all"}
    published_date = page.meta.get("date", "")
    if isinstance(published_date, (date, datetime)):
        published_date = published_date.isoformat()
    if not isinstance(published_date, str):
        published_date = ""
    text = plain_text(" ".join(reader.text))
    document = {
        "id": identifier, "source": source, "path": source, "url": page.file.url,
        "contentUrl": site_path(config, f"hub/content/{identifier}.json"),
        "title": title, "description": description,
        "descriptionSource": "metadata" if authored_description else "excerpt",
        "category": category, "topic": plain_text(str(topic)), "tags": tags,
        "intent": intent if explicit_intent else infer_intent(title, source),
        "intentInferred": not explicit_intent,
        "minutes": max(1, math.ceil(len(text.split()) / 220)), "minutesEstimated": True,
        "date": published_date, "sections": [item["title"] for item in toc if item["level"] > 1], "toc": toc,
    }
    _state.documents[identifier] = document
    _state.contents[identifier] = {"id": identifier, "html": reader.rebased_html(), "toc": toc, "url": page.file.url}
    return html


def _public_file(path: Path, root: Path) -> bool:
    resolved_root = root.resolve()
    resolved = path.resolve()
    if not path.is_file() or not resolved.is_relative_to(resolved_root):
        return False
    # Restrict metadata to the public source mapping, including symlink targets.
    for relative in (path.relative_to(root), resolved.relative_to(resolved_root)):
        if any(part.startswith(".") or part in {"target", "__pycache__"} for part in relative.parts):
            return False
    return True


def collect_stacks(config: MkDocsConfig, documents: list[JsonObject]) -> list[JsonObject]:
    # This is the repository's verified sync-extra-assets.sh source mapping.
    repository = Path(config.docs_dir).resolve().parent.parent
    root = repository / "infra/docker/stacks"
    if not root.is_dir():
        return []
    grouped: dict[Path, list[Path]] = {}
    for file in sorted(root.rglob("*")):
        if COMPOSE_NAME.fullmatch(file.name) and _public_file(file, root):
            grouped.setdefault(file.parent, []).append(file)
    by_source = {doc["source"]: doc["id"] for doc in documents}
    stacks = []
    primary_names = ["docker-compose.yaml", "docker-compose.yml", "compose.yaml", "compose.yml"]
    for directory, compose_files in sorted(grouped.items()):
        relative = directory.relative_to(root).as_posix()
        group = relative.split("/")[0]
        compose_files.sort(key=lambda file: (primary_names.index(file.name) if file.name in primary_names else len(primary_names), file.name))
        primary = compose_files[0]
        details = None
        try:
            config_data = yaml.safe_load(primary.read_text(encoding="utf-8"))
            service_map = config_data.get("services") if isinstance(config_data, dict) else None
            if isinstance(service_map, dict) and all(isinstance(value, dict) for value in service_map.values()):
                details = []
                for name, service in service_map.items():
                    ports = []
                    for port in service.get("ports", []) if isinstance(service.get("ports", []), list) else []:
                        if isinstance(port, (str, int)):
                            ports.append(port)
                        elif isinstance(port, dict):
                            ports.append({key: value for key, value in port.items() if key in {"target", "published", "protocol", "mode", "host_ip"} and isinstance(value, (str, int))})
                    details.append({"name": str(name), "image": service.get("image") if isinstance(service.get("image"), str) else None, "ports": ports})
        except (OSError, UnicodeError, yaml.YAMLError):
            pass
        if details is None:
            log.info("Compose metadata unavailable: %s", primary.relative_to(repository))
        readme = directory / "README.md"
        title, description = directory.name, ""
        if _public_file(readme, root):
            readme_text = readme.read_text(encoding="utf-8")
            match = re.search(r"^#\s+(.+)$", readme_text, re.M)
            if match:
                title = plain_text(markdown.markdown(match[1]))
            reader = ContentReader()
            reader.feed(markdown.markdown(readme_text, extensions=["fenced_code", "tables"]))
            description = plain_text(next(iter(reader.paragraphs), ""))[:220]
        images = sorted({service["image"] for service in details or [] if service["image"]})
        public_files = list(compose_files) + ([readme] if _public_file(readme, root) else [])
        public_path = "extra/docker/stacks/" + quote(relative, safe="/") + "/"
        stacks.append({
            "id": document_id("infra/docker/stacks/" + relative),
            "title": title, "desc": description, "group": group,
            "color": "orange" if group == "monitoring" else "blue",
            "glyph": "activity" if group == "monitoring" else "layers",
            "repo": " · ".join(images), "path": "infra/docker/stacks/" + relative + "/",
            "file": primary.name, "doc": by_source.get(f"extra/docker/stacks/{group}/index.md"),
            "services": len(details) if details is not None else None,
            "serviceDetails": details or [], "images": images,
            "metadataStatus": "parsed" if details is not None else "unavailable",
            "tags": sorted({service["name"] for service in details or []}),
            "files": [{"name": file.name, "url": site_path(config, public_path + quote(file.name))} for file in public_files],
            "url": site_path(config, public_path),
        })
    return stacks


def _write_json(path: Path, value: JsonObject) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temporary.replace(path)


def on_post_build(config: MkDocsConfig) -> None:
    captured = {doc["source"] for doc in _state.documents.values()}
    if captured != _state.expected:
        raise BuildError("Hub page content is incomplete; run a full MkDocs build without --dirty")
    output = Path(config.site_dir) / "hub"
    documents = sorted(_state.documents.values(), key=lambda doc: doc["source"])
    catalog = {
        "schemaVersion": 1, "basePath": base_path(config),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "categories": list(_state.categories.values()), "intents": INTENTS,
        "docs": documents, "stacks": collect_stacks(config, documents),
        "searchIndexUrl": site_path(config, "search/search_index.json"),
    }
    for identifier, content in _state.contents.items():
        _write_json(output / "content" / f"{identifier}.json", content)
    for previous in (output / "content").glob("*.json"):
        if previous.stem not in _state.contents:
            previous.unlink()
    _write_json(output / "catalog.json", catalog)
    log.info("Hub data: %d documents, %d Compose stacks", len(documents), len(catalog["stacks"]))
