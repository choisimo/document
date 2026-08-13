# Docker Repository

Docker container, service stack과 development environment의 versioned template을 관리하는 repository입니다. 실제 배포 상태와 secret은 별도 환경에서 관리합니다.

## Repository Scope and Verification

- **Scope:** This repository contains Compose, image and stack templates. Pin Docker Engine/Compose, host OS and architecture, image tags or digests, enabled profiles, and the exact revision before use.
- **Assumptions:** Review `.env` values, secrets, published ports, networks, volumes, filesystem ownership and existing resource names. A template is not a production-ready deployment by itself.
- **Evidence:** Rendered Compose configuration, pulled image digests, container health, logs, endpoint checks and persistent data are evidence; successful `up` output alone is not completion.
- **Failure and completion:** Test missing secrets, port or subnet conflicts, unhealthy dependencies, restart, data restore and rollback. Completion requires intended services only, bounded exposure and a documented down/restore path.

---

## Quick Start

```bash
# Docker 설치
./scripts/docker-install.sh

# 또는 직접 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## Directory Structure

```
docker/
├── stacks/                     # 서비스 스택 (docker-compose 기반)
│   ├── automation/             # 자동화 도구
│   │   └── n8n/                # n8n 워크플로우 자동화
│   ├── databases/              # 데이터베이스
│   │   ├── mongodb/            # MongoDB (Replica Set)
│   │   ├── mariadb/            # MariaDB
│   │   └── supabase/           # Supabase (PostgreSQL + pgvector)
│   ├── devtools/               # 개발 도구
│   │   └── sourcebot/          # Sourcebot
│   ├── media/                  # 미디어 서비스
│   │   └── gluetun-qbittorrent/# VPN + qBittorrent
│   ├── storage/                # 스토리지
│   │   ├── droppy/             # Droppy 파일 서버
│   │   └── picoshare/          # PicoShare 파일 공유
│   └── misc/                   # 기타 서비스
│       ├── changedetection/    # 웹사이트 변경 감지
│       ├── ghost-blog/         # Ghost 블로그
│       └── kamai/              # Kimai 시간 추적
├── images/                     # 커스텀 Docker 이미지
│   ├── base/                   # 베이스 이미지
│   │   └── ubuntu-dev/         # Ubuntu 개발 환경 베이스
│   ├── dev-environments/       # 개발 환경 이미지
│   │   ├── node/               # Node.js
│   │   ├── python/             # Python
│   │   ├── go/                 # Go
│   │   ├── rust/               # Rust
│   │   ├── java/               # Java
│   │   └── flutter/            # Flutter
│   └── custom/                 # 커스텀 이미지
│       └── n8n-custom/         # n8n 커스텀 빌드
├── configs/                    # 공유 설정 파일
│   └── nginx/                  # Nginx 설정
├── docs/                       # 문서
├── scripts/                    # 유틸리티 스크립트
├── templates/                  # 새 스택 템플릿
│   └── stack-template/         # 스택 템플릿
├── tests/                      # 테스트 스크립트
└── archive/                    # 아카이브된 설정
```

## Usage Examples

### 서비스 스택 실행

```bash
# n8n 풀스택 실행
cd stacks/automation/n8n
cp .env.example .env  # 환경 설정
docker compose up -d

# MongoDB 실행
cd stacks/databases/mongodb
cp .env.example .env
./scripts/init-keyfile.sh  # 키파일 생성
docker compose up -d
```

### 개발 환경 실행

```bash
# Node.js 개발 환경
cd images/dev-environments/node
WORKSPACE_PATH=/path/to/your/project docker compose up -d
docker exec -it dev-node bash

# Python 개발 환경
cd images/dev-environments/python
WORKSPACE_PATH=/path/to/your/project docker compose up -d
```

### 새 스택 생성

```bash
# 템플릿 복사
cp -r templates/stack-template stacks/category/my-new-stack
cd stacks/category/my-new-stack
# 파일 수정 후 실행
docker compose up -d
```

## Documentation

- [Docker Network Guide](docs/DOCKER_NETWORK.md) - Docker 네트워크 설정 가이드
- [n8n Stack Guide](docs/services/n8n.md) - n8n 워크플로우 스택 가이드
- [Supabase Guide](docs/services/supabase.md) - Supabase 벡터 DB 가이드

## Stack Overview

| Category | Stack | Description |
|----------|-------|-------------|
| Automation | n8n | 워크플로우 자동화 (PostgreSQL, Redis, Worker) |
| Databases | MongoDB | NoSQL with Replica Set |
| Databases | MariaDB | MySQL-compatible RDBMS |
| Databases | Supabase | PostgreSQL + pgvector |
| Media | gluetun-qbittorrent | VPN 터널 + 토렌트 |
| Storage | droppy | 파일 서버 |
| Storage | picoshare | 파일 공유 |
| Misc | changedetection | 웹사이트 변경 감지 |
| Misc | ghost-blog | 블로그 플랫폼 |
| Misc | kamai | 시간 추적 |

## License

MIT License
