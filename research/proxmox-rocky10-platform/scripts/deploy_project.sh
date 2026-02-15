#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <project_name> [additional ansible args...]" >&2
  exit 1
fi

PROJECT_NAME="$1"
shift

if [[ -z "${VAULT_TOKEN:-}" ]]; then
  echo "VAULT_TOKEN is required." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/../ansible"

cd "${ANSIBLE_DIR}"
ansible-playbook playbooks/deploy-project.yml -e "project_name=${PROJECT_NAME}" -e "vault_token=${VAULT_TOKEN}" "$@"
