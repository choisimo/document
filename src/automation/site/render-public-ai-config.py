#!/usr/bin/env python3
"""Serialize explicitly public browser configuration; never read private tokens."""

import argparse
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlsplit


def read_public_config() -> dict[str, object]:
    fields = {
        "PUBLIC_AI_API_BASE_URL": "apiBaseUrl",
        "PUBLIC_AI_API_TOKEN": "apiToken",
        "PUBLIC_AI_MODEL_NAME": "modelName",
        "PUBLIC_OPEN_NOTEBOOK_URL": "openNotebookUrl",
        "PUBLIC_OPEN_NOTEBOOK_TOKEN": "openNotebookToken",
    }
    config: dict[str, object] = {}
    for variable, field in fields.items():
        value = os.environ.get(variable, "")
        if not value:
            continue
        if field.endswith("Token") and any(char in value for char in "\r\n"):
            raise ValueError(f"{variable} must not contain line breaks")
        if field in ("apiBaseUrl", "openNotebookUrl"):
            try:
                url = urlsplit(value)
                hostname = url.hostname
                # Accessing port also validates its syntax and TCP range.
                port = url.port
            except ValueError:
                raise ValueError(f"{variable} is not a valid HTTPS base URL") from None
            if (
                url.scheme != "https"
                or not hostname
                or port == 0
                or url.username is not None
                or url.password is not None
                or "?" in value
                or "#" in value
                or "\\" in value
                or any(char.isspace() or ord(char) < 32 or ord(char) == 127 for char in value)
            ):
                raise ValueError(f"{variable} must be an HTTPS base URL without credentials, query or fragment")
            value = value.rstrip("/")
        config[field] = value

    enabled = os.environ.get("PUBLIC_OPEN_NOTEBOOK_ENABLED", "").lower()
    if enabled not in ("", "true", "false"):
        raise ValueError("PUBLIC_OPEN_NOTEBOOK_ENABLED must be true or false")
    config["openNotebookEnabled"] = enabled == "true"
    if config["openNotebookEnabled"] and "openNotebookUrl" not in config:
        raise ValueError("PUBLIC_OPEN_NOTEBOOK_URL is required when Open Notebook is enabled")
    ai_enabled = os.environ.get("PUBLIC_AI_ENABLED", "").lower()
    if ai_enabled not in ("", "true", "false"):
        raise ValueError("PUBLIC_AI_ENABLED must be true or false")
    config["enabled"] = ai_enabled == "true"
    if config["enabled"] and "apiBaseUrl" not in config:
        raise ValueError("PUBLIC_AI_API_BASE_URL is required when AI is enabled")
    # The master switch also disables optional retrieval in the public UI.
    if not config["enabled"]:
        config["openNotebookEnabled"] = False
    return config


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    try:
        config = read_public_config()
    except ValueError as error:
        parser.exit(1, f"Invalid public AI configuration: {error}\n")
    serialized = json.dumps(config, ensure_ascii=True, indent=2).replace("<", "\\u003c")
    # Write next to the destination and replace atomically after validation.
    payload = (
        "// Public build settings: every value in this file is visible to visitors.\n"
        f"window.PUBLIC_AI_CONFIG = {serialized};\n"
    )
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.output.parent,
                                         prefix=".ai-config-", delete=False) as file:
            temporary = Path(file.name)
            file.write(payload)
        temporary.chmod(0o644)
        temporary.replace(args.output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print("Public AI configuration generated (values omitted)")


if __name__ == "__main__":
    main()
