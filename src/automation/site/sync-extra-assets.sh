#!/usr/bin/env bash
# Keep the public route mapping in one place; exports require exact byte review.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
if (( $# > 1 )); then
    echo "Usage: sync-extra-assets.sh [OUTPUT_ROOT]" >&2
    exit 2
fi
OUTPUT_ROOT="${1:-${REPO_ROOT}/dist/site/extra}"
ARGS=()
sync_dir() { ARGS+=(--directory "$1" "$2"); }
sync_file() { ARGS+=(--file "$1" "$2"); }
generate_indexes() { ARGS+=(--index "$1"); }

sync_dir "src/automation" "scripts"
sync_dir "infra/docker" "docker"
sync_dir "infra/configs" "configs"
sync_dir "content/rendered" "project-docs"
sync_dir "content/archive/legacy" "legacy"
sync_dir "content/prompts" "prompts-raw"
sync_dir "src/mcp" "mcp"
sync_dir "content/notes" "memo"
sync_dir "src/examples/simulator/javascript" "algorithm-simulator"
sync_dir "src/examples/data-structures" "algorithm-code/data-structures"
sync_dir "src/examples/architect-code" "algorithm-code/code"
sync_dir "src/examples/c-lang" "algorithm-code/C-lang"
sync_dir "src/examples/simulator" "algorithm-code/simulator"
sync_file "src/examples/README.md" "algorithm-code/README.md"
sync_file "src/examples/REVIEW_REPORT.md" "algorithm-code/REVIEW_REPORT.md"

generate_indexes "scripts"
generate_indexes "configs"
generate_indexes "project-docs"
generate_indexes "legacy"
generate_indexes "prompts-raw"
generate_indexes "mcp"
generate_indexes "memo"
generate_indexes "algorithm-code"
generate_indexes "docker"

exec python3 "${SCRIPT_DIR}/export_public_assets.py" sync \
    --repository "${REPO_ROOT}" --output "${OUTPUT_ROOT}" \
    --manifest "${REPO_ROOT}/plan/publication/extra-assets.json" "${ARGS[@]}"
