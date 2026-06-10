# Custom Docker Images

커스텀 Docker 이미지 저장소입니다.

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
WORKSPACE_PATH=/path/to/project docker compose up -d
docker exec -it dev-node bash
```

### 베이스 이미지 빌드

```bash
cd images/base/ubuntu-dev
docker build -t ubuntu-dev-env .
docker run -it -v /path/to/project:/home/developer/workspace ubuntu-dev-env /bin/bash
```

자세한 내용은 각 디렉토리의 README를 참조한다.
