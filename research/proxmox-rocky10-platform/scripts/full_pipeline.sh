#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/run_terraform.sh" "$@"
"${SCRIPT_DIR}/generate_inventory.sh"
"${SCRIPT_DIR}/run_ansible_site.sh"
"${SCRIPT_DIR}/bootstrap_secrets.sh"

echo "Pipeline complete. Use deploy_project.sh to deploy a project." 
