#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"

cd "${TF_DIR}"

if [[ ! -f terraform.tfvars ]]; then
  echo "terraform.tfvars not found. Copy terraform.tfvars.example first." >&2
  exit 1
fi

terraform init
terraform fmt -recursive
terraform validate

# Proxmox clone lock contention is common. Keep apply parallelism low.
terraform apply -parallelism=1 "$@"
