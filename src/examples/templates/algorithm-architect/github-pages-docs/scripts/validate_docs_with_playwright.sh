#!/usr/bin/env bash

set -euo pipefail

DOC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$DOC_ROOT/.pw-runtime"
PORT="${DOC_PORT:-8765}"

mkdir -p "$RUNTIME_DIR"

if [ ! -f "$RUNTIME_DIR/package.json" ]; then
  npm init -y --prefix "$RUNTIME_DIR" >/dev/null
fi

if [ ! -d "$RUNTIME_DIR/node_modules/playwright" ] || [ ! -d "$RUNTIME_DIR/node_modules/marked" ] || [ ! -d "$RUNTIME_DIR/node_modules/mermaid" ]; then
  npm install --prefix "$RUNTIME_DIR" playwright marked mermaid >/dev/null
fi

if [ ! -e "$DOC_ROOT/node_modules" ]; then
  ln -s "$RUNTIME_DIR/node_modules" "$DOC_ROOT/node_modules"
fi

npx --prefix "$RUNTIME_DIR" playwright install chromium >/dev/null

python3 -m http.server "$PORT" --directory "$DOC_ROOT" >/tmp/algorithm-architect-docs-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

DOC_ROOT="$DOC_ROOT" DOC_PORT="$PORT" \
  node "$DOC_ROOT/scripts/validate_docs_with_playwright.mjs"
