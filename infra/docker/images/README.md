# Custom Docker Images

Custom Docker image source와 build entry point의 index입니다. 실제 tag·digest와 registry publication은 build 결과에서 확인합니다.

## Image Build Contract

This directory is an index of custom image sources. Pin base-image digests, build platform, package repositories, build arguments and the repository revision; an image name or successful build does not prove provenance, vulnerability status or runtime compatibility. Completion requires reproducible build output, SBOM or dependency inventory, scoped secrets, smoke tests and a rollback tag.

---

## Directory Structure

```
images/
├── base/                   # 베이스 이미지
│   └── ubuntu-dev/         # Ubuntu 22.04 개발 환경 베이스
├── dev-environments/       # 개발 환경 이미지
│   ├── node/               # Node.js
│   ├── python/             # Python
│   ├── go/                 # Go
│   ├── rust/               # Rust
│   ├── java/               # Java
│   └── flutter/            # Flutter
└── custom/                 # 커스텀 이미지
    └── n8n-custom/         # n8n 커스텀 이미지
```

## Usage

### 개발 환경 실행

```bash
cd images/dev-environments/node
WORKSPACE_PATH=/your/project docker compose up -d
docker exec -it dev-node bash
```

### 베이스 이미지 빌드

```bash
cd images/base/ubuntu-dev
docker build -t ubuntu-dev-env .
docker run -it -v /path/to/project:/home/developer/workspace ubuntu-dev-env /bin/bash
```

자세한 내용은 각 디렉토리의 README를 참조하세요.
