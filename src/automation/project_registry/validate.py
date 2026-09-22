#!/usr/bin/env python3
"""Validate the cross-project Forgejo registry without third-party dependencies."""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REPO_RE = re.compile(r"^[^/\\s]+/[^/\\s]+$")
SHA_RE = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")
DATE_RE = re.compile(r"^\\d{4}-\\d{2}-\\d{2}$")
ALLOWED_ROLES = {"platform","runtime","tooling","product","service","content","content-product","content-platform","infrastructure"}
ALLOWED_LIFECYCLES = {"active","review","maintenance","historical","temporary","archived"}
ALLOWED_RELATION_STATES = {"observed","planned","proposed","review"}
ROOT_KEYS = {"schema_version","observed_date","scope","authority","archive_policy","projects"}
PROJECT_KEYS = {"id","repository","role","lifecycle","canonical","last_observed_main","open_prs","source_of_truth","status_note","relations"}
RELATION_KEYS = {"project","kind","state"}

def _path_safe(value: str) -> bool:
    path = Path(value)
    return bool(value) and not path.is_absolute() and ".." not in path.parts

def validate_registry(data: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["root: expected object"]
    missing = ROOT_KEYS - set(data)
    extra = set(data) - ROOT_KEYS
    if missing: errors.append(f"root: missing keys {sorted(missing)}")
    if extra: errors.append(f"root: unexpected keys {sorted(extra)}")
    if data.get("schema_version") != 1: errors.append("schema_version: expected 1")
    observed_date = data.get("observed_date")
    if not isinstance(observed_date, str) or not DATE_RE.fullmatch(observed_date):
        errors.append("observed_date: expected YYYY-MM-DD")
    if not isinstance(data.get("scope"), str) or not data.get("scope"):
        errors.append("scope: expected non-empty string")

    authority = data.get("authority")
    if not isinstance(authority, dict):
        errors.append("authority: expected object")
    else:
        if set(authority) != {"registry_repository","rule"}:
            errors.append("authority: expected registry_repository and rule only")
        repo = authority.get("registry_repository")
        if not isinstance(repo, str) or not REPO_RE.fullmatch(repo):
            errors.append("authority.registry_repository: expected owner/repo")
        if not isinstance(authority.get("rule"), str) or not authority.get("rule"):
            errors.append("authority.rule: expected non-empty string")

    archive_policy = data.get("archive_policy")
    if not isinstance(archive_policy, dict):
        errors.append("archive_policy: expected object")
    else:
        if archive_policy.get("default_action") != "none":
            errors.append("archive_policy.default_action: expected 'none'")
        require_all = archive_policy.get("require_all")
        if not isinstance(require_all, list) or not require_all or not all(isinstance(item, str) and item for item in require_all):
            errors.append("archive_policy.require_all: expected non-empty string list")
        if not isinstance(archive_policy.get("delete_policy"), str) or not archive_policy.get("delete_policy"):
            errors.append("archive_policy.delete_policy: expected non-empty string")

    projects = data.get("projects")
    if not isinstance(projects, list) or not projects:
        errors.append("projects: expected non-empty array")
        return errors

    ids: set[str] = set()
    repositories: set[str] = set()
    for index, project in enumerate(projects):
        prefix = f"projects[{index}]"
        if not isinstance(project, dict):
            errors.append(f"{prefix}: expected object")
            continue
        missing = (PROJECT_KEYS - {"last_observed_main"}) - set(project)
        extra = set(project) - PROJECT_KEYS
        if missing: errors.append(f"{prefix}: missing keys {sorted(missing)}")
        if extra: errors.append(f"{prefix}: unexpected keys {sorted(extra)}")

        project_id = project.get("id")
        if not isinstance(project_id, str) or not ID_RE.fullmatch(project_id):
            errors.append(f"{prefix}.id: invalid project id")
        elif project_id in ids:
            errors.append(f"{prefix}.id: duplicate id {project_id}")
        else:
            ids.add(project_id)

        repository = project.get("repository")
        if not isinstance(repository, str) or not REPO_RE.fullmatch(repository):
            errors.append(f"{prefix}.repository: expected owner/repo")
        elif repository in repositories:
            errors.append(f"{prefix}.repository: duplicate repository {repository}")
        else:
            repositories.add(repository)

        if project.get("role") not in ALLOWED_ROLES: errors.append(f"{prefix}.role: invalid role")
        if project.get("lifecycle") not in ALLOWED_LIFECYCLES: errors.append(f"{prefix}.lifecycle: invalid lifecycle")
        if not isinstance(project.get("canonical"), bool): errors.append(f"{prefix}.canonical: expected boolean")

        sha = project.get("last_observed_main")
        if sha is not None and (not isinstance(sha, str) or not SHA_RE.fullmatch(sha)):
            errors.append(f"{prefix}.last_observed_main: expected lowercase SHA-1/SHA-256")

        open_prs = project.get("open_prs")
        if not isinstance(open_prs, list) or not all(isinstance(item, int) and not isinstance(item, bool) and item > 0 for item in open_prs):
            errors.append(f"{prefix}.open_prs: expected positive integer list")
        elif len(open_prs) != len(set(open_prs)):
            errors.append(f"{prefix}.open_prs: duplicates are not allowed")

        source_of_truth = project.get("source_of_truth")
        if not isinstance(source_of_truth, list) or not all(isinstance(item, str) and _path_safe(item) for item in source_of_truth):
            errors.append(f"{prefix}.source_of_truth: expected safe relative path list")
        elif len(source_of_truth) != len(set(source_of_truth)):
            errors.append(f"{prefix}.source_of_truth: duplicates are not allowed")

        if not isinstance(project.get("status_note"), str) or not project.get("status_note"):
            errors.append(f"{prefix}.status_note: expected non-empty string")

        relations = project.get("relations")
        if not isinstance(relations, list):
            errors.append(f"{prefix}.relations: expected array")
        else:
            seen_relations: set[tuple[str,str,str]] = set()
            for rel_index, relation in enumerate(relations):
                rel_prefix = f"{prefix}.relations[{rel_index}]"
                if not isinstance(relation, dict):
                    errors.append(f"{rel_prefix}: expected object")
                    continue
                if set(relation) != RELATION_KEYS:
                    errors.append(f"{rel_prefix}: expected project, kind, state only")
                    continue
                target, kind, state = relation.get("project"), relation.get("kind"), relation.get("state")
                if not isinstance(target, str) or not ID_RE.fullmatch(target): errors.append(f"{rel_prefix}.project: invalid project id")
                if not isinstance(kind, str) or not kind: errors.append(f"{rel_prefix}.kind: expected non-empty string")
                if state not in ALLOWED_RELATION_STATES: errors.append(f"{rel_prefix}.state: invalid relation state")
                key = (str(target),str(kind),str(state))
                if key in seen_relations: errors.append(f"{rel_prefix}: duplicate relation {key}")
                else: seen_relations.add(key)

        if project.get("canonical") is True and project.get("lifecycle") in {"historical","temporary","archived"}:
            errors.append(f"{prefix}: canonical project cannot be {project.get('lifecycle')}")

    for index, project in enumerate(projects):
        if not isinstance(project, dict): continue
        for rel_index, relation in enumerate(project.get("relations", [])):
            if not isinstance(relation, dict): continue
            target = relation.get("project")
            if isinstance(target, str) and target not in ids:
                errors.append(f"projects[{index}].relations[{rel_index}].project: unknown project {target}")
            if target == project.get("id"):
                errors.append(f"projects[{index}].relations[{rel_index}].project: self relation is not allowed")
    return errors

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("registry", nargs="?", type=Path, default=Path(__file__).resolve().parents[3] / "plans" / "project-registry.json")
    args = parser.parse_args(argv)
    try:
        data = json.loads(args.registry.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"registry read failed: {exc}", file=sys.stderr)
        return 2
    errors = validate_registry(data)
    if errors:
        for error in errors: print(error, file=sys.stderr)
        return 1
    print(f"OK: {len(data['projects'])} projects validated from {args.registry}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
