#!/usr/bin/env python3
"""Compatibility entry point for the project's Node/Playwright documentation QA.

Usage: python3 src/automation/screenshot_all_pages.py [output_dir] [QA options]
The optional first positional argument remains the screenshot output directory.
Use --path /route/ to select a page; all other options go to screenshot-pages.js.
"""

import os
from pathlib import Path
import shutil
import sys


def main() -> int:
    arguments = sys.argv[1:]
    runner = Path(__file__).resolve().parents[1] / "screenshot-pages.js"
    delegated = ["--docs-diagnostics"]
    if arguments and not arguments[0].startswith("-"):
        delegated.extend(["--output-dir", str(Path(arguments.pop(0)).resolve())])

    if "--help" in arguments or "-h" in arguments:
        print(__doc__, flush=True)
    node = shutil.which("node")
    if node is None:
        print("Node.js 20+ is required. Install Node, then run npm --prefix src ci and npm --prefix src run qa:install.", file=sys.stderr)
        return 127
    try:
        # Replace this process so Node's failure status and signals reach callers.
        os.execv(node, [node, str(runner), *delegated, *arguments])
    except OSError as error:
        print(f"Unable to start screenshot QA: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
