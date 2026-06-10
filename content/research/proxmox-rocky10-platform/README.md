# Proxmox Rocky 10 자동화 플랫폼 (Terraform + Ansible + Consul KV + Vault + Nginx + MinIO + Headscale)

이 문서는 아래 목표를 한 번에 수행하기 위한 코드와 실행 절차를 포함합니다.

- Proxmox VM 8대 자동 생성 (Rocky Linux 10)
- VM 초기 설정: `nodove` 유저 생성, SSH 공개키 적용
- Docker Engine + Docker Compose plugin 자동 설치
- 인프라 서비스 자동 배포
  - `infra-01`: Consul KV + Vault + Nginx
  - `infra-02`: MinIO
  - `infra-03`: Headscale
- 앱 노드 자동 배포
  - `app-01` ~ `app-05`
- Consul KV(비밀 아님) + Vault KV(비밀값) 기반으로 프로젝트 환경변수 생성 후 `docker compose up -d`

## 1. 디렉터리 구조

```text
research/proxmox-rocky10-platform/
├── terraform/
│   ├── main.tf
│   ├── outputs.tf
│   ├── provider.tf
│   ├── terraform.tfvars.example
│   ├── variables.tf
│   ├── versions.tf
│   └── templates/ansible-inventory.tftpl
├── ansible/
│   ├── ansible.cfg
│   ├── requirements.yml
│   ├── inventory/hosts.yml
│   ├── group_vars/all.yml
│   ├── playbooks/
│   │   ├── bootstrap.yml
│   │   ├── infra-services.yml
│   │   ├── bootstrap-secrets.yml
│   │   ├── deploy-project.yml
│   │   └── site.yml
│   └── roles/
│       ├── common/
│       ├── timesync/
│       ├── users/
│       ├── docker/
│       ├── infra_consul_vault_nginx/
│       ├── infra_minio/
│       ├── infra_headscale/
│       └── project_deploy/
└── scripts/
    ├── run_terraform.sh
    ├── generate_inventory.sh
    ├── run_ansible_site.sh
    ├── bootstrap_secrets.sh
    ├── deploy_project.sh
    └── full_pipeline.sh
```

## 2. VM 역할 설계 (8대)

| VM 이름 | 역할 | 예시 IP |
|---|---|---|
| infra-01 | Consul + Vault + Nginx | 10.10.10.11 |
| infra-02 | MinIO | 10.10.10.12 |
| infra-03 | Headscale | 10.10.10.13 |
| app-01 | Docker App Node | 10.10.10.21 |
| app-02 | Docker App Node | 10.10.10.22 |
| app-03 | Docker App Node | 10.10.10.23 |
| app-04 | Docker App Node | 10.10.10.24 |
| app-05 | Docker App Node | 10.10.10.25 |

## 3. 사전 준비

### 3.1 제어 노드(현재 작업 PC) 준비

- `terraform >= 1.6`
- `ansible`
- `python3`
- `jq`

### 3.2 Proxmox 준비

- API Token 발급
- 대상 노드, datastore 이름 확인 (`local`, `local-lvm` 등)
- VM 네트워크 브리지 (`vmbr0`) 확인

## 4. Terraform 설정

1. `terraform.tfvars.example`를 복사해 실값 입력

```bash
cd research/proxmox-rocky10-platform/terraform
cp terraform.tfvars.example terraform.tfvars
```

2. 최소 수정 항목

- `proxmox_endpoint`
- `proxmox_api_token`
- `proxmox_node_name`
- `ipv4_gateway`, `dns_servers`
- `vm_authorized_keys` (실제 공개키)
- `vm_definitions` (IP, VMID, 스펙)

참고: Rocky 10 GenericCloud URL은 2026-02-13 기준 아래 경로가 동작 확인됨.

- `https://dl.rockylinux.org/pub/rocky/10/images/x86_64/Rocky-10-GenericCloud-Base.latest.x86_64.qcow2`

## 5. 전체 실행 순서

### 5.1 VM 생성

```bash
cd research/proxmox-rocky10-platform
./scripts/run_terraform.sh
```

`run_terraform.sh`는 아래를 수행합니다.

- `terraform init`
- `terraform fmt -recursive`
- `terraform validate`
- `terraform apply -parallelism=1`

`-parallelism=1`을 사용한 이유: Proxmox VM 동시 clone 시 lock 오류를 줄이기 위함.

### 5.2 Terraform output으로 Ansible inventory 생성

```bash
./scripts/generate_inventory.sh
```

생성 파일: `ansible/inventory/hosts.yml`

### 5.3 기본 OS 설정 + Docker + 인프라 서비스 배포

```bash
./scripts/run_ansible_site.sh
```

적용 내용:

- 모든 VM: base 패키지, 시간 동기화, `nodove` 유저/키, Docker 설치
- infra-01: Consul, Vault, Nginx 배포
- infra-02: MinIO 배포
- infra-03: Headscale 배포

### 5.4 Vault 초기화 + Consul/Vault 시드 데이터 입력

```bash
./scripts/bootstrap_secrets.sh
```

적용 내용:

- Vault 1회 초기화 (`vault operator init`)
- unseal 수행
- `secret/` KV v2 엔진 활성화
- 샘플 프로젝트 키 주입
  - Consul KV: `projects/sample-app/*`
  - Vault KV: `secret/projects/sample-app`

초기화 결과 파일 저장 위치:

- `infra-01:/opt/platform/bootstrap/vault-init.json`

## 6. 프로젝트 배포/관리 방식

이 구조의 핵심 원칙:

- 비밀 아님: Consul KV
- 비밀값: Vault KV

### 6.1 Consul KV 구조 예시

- `projects/sample-app/repo_url`
- `projects/sample-app/repo_ref`
- `projects/sample-app/compose_file`
- `projects/sample-app/deploy_path`
- `projects/sample-app/env_public_json`

### 6.2 Vault KV 구조 예시

- `secret/projects/sample-app`
  - `DB_PASSWORD`
  - `JWT_SECRET`
  - 기타 민감값

### 6.3 앱 배포 실행

`VAULT_TOKEN`을 지정하고 실행:

```bash
cd research/proxmox-rocky10-platform
export VAULT_TOKEN='<vault-root-or-app-token>'
./scripts/deploy_project.sh sample-app
```

배포 시 플레이북이 자동 수행:

1. Consul에서 repo/배포경로/공개 env 조회
2. Vault에서 비밀 env 조회
3. 두 env 병합하여 `.env` 생성
4. Git pull/checkout
5. `docker compose pull && docker compose up -d --remove-orphans`

## 7. 운영 명령 예시

### 7.1 인프라 재배포

```bash
cd research/proxmox-rocky10-platform/ansible
ansible-playbook playbooks/infra-services.yml
```

### 7.2 특정 앱 노드만 배포

```bash
cd research/proxmox-rocky10-platform/ansible
ansible-playbook playbooks/deploy-project.yml -l app-01 -e project_name=sample-app -e vault_token="$VAULT_TOKEN"
```

### 7.3 Consul KV 직접 확인

```bash
curl "http://10.10.10.11:8500/v1/kv/projects/sample-app/repo_url?raw"
```

### 7.4 Vault KV 직접 확인

```bash
curl -H "X-Vault-Token: $VAULT_TOKEN" "http://10.10.10.11:8200/v1/secret/data/projects/sample-app"
```

## 8. 보안/운영 강화 권장사항 (실서비스)

현재 템플릿은 빠른 자동화와 검증을 위한 기본 구성이며, 실서비스 전에는 아래 항목을 적용한다.

- Vault/Nginx TLS 적용 (내부망 포함)
- Vault root token 상시 사용 금지, AppRole/정책 분리
- Consul ACL 및 gossip encryption 적용
- MinIO 키 주기적 회전 + 버킷 정책 최소권한
- Headscale 도메인/TLS 정식 구성
- 방화벽 소스 제한(관리망만 허용)
- Ansible secrets는 `ansible-vault` 또는 외부 시크릿 매니저 연동

## 9. 한 번에 실행

초기 구축 시:

```bash
cd research/proxmox-rocky10-platform
./scripts/full_pipeline.sh
```

그 후 프로젝트별 배포:

```bash
export VAULT_TOKEN='<token>'
./scripts/deploy_project.sh sample-app
```
