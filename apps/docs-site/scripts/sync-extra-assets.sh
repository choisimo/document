#!/usr/bin/env bash
# Compatibility entrypoint; implementation lives with the repository automation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
exec bash "${REPO_ROOT}/src/automation/site/sync-extra-assets.sh" "$@"
