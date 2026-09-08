"""Publish the algorithm catalog separately from its sibling landing page."""

from pathlib import Path

from mkdocs.config.defaults import MkDocsConfig
from mkdocs.structure.files import File, Files, InclusionLevel


def on_files(files: Files, config: MkDocsConfig) -> Files:
    source = "algorithms/algorithm-architect/README.md"
    destination = "algorithms/algorithm-architect/README/index.html"
    if not (Path(config.docs_dir) / source).is_file():
        raise FileNotFoundError(f"Required algorithm catalog is missing: {source}")
    if any(file.dest_uri == destination for file in files):
        raise ValueError(f"Algorithm catalog output path is already occupied: {destination}")

    # MkDocs maps README.md to index.html and drops it when index.md exists.
    # The config excludes that automatic mapping; restore the same source at
    # its distinct public route so navigation and source edit links still work.
    existing = files.get_file_from_path(source)
    if existing is not None:
        files.remove(existing)
    catalog = File(source, config.docs_dir, config.site_dir, config.use_directory_urls)
    catalog.dest_uri = destination
    catalog.inclusion = InclusionLevel.INCLUDED
    files.append(catalog)
    return files
