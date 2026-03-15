#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"
ANSIBLE_INV="${SCRIPT_DIR}/../ansible/inventory/hosts.yml"

cd "${TF_DIR}"
terraform output -raw ansible_inventory_yaml > "${ANSIBLE_INV}"

echo "Inventory generated: ${ANSIBLE_INV}"
