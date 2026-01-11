# Development Environment Images

개발 환경용 Docker 이미지들입니다.

## Available Environments

| Language | Directory | Base | Ports |
|----------|-----------|------|-------|
| Node.js | `node/` | Ubuntu 22.04 + Node 20 | 3000, 5173 |
| Python | `python/` | Ubuntu 22.04 + Python 3 | 8888, 6006 |
| Go | `go/` | Ubuntu 22.04 + Go | 8080 |
| Rust | `rust/` | Ubuntu 22.04 + Rust | 8081 |
| Java | `java/` | Ubuntu 22.04 + JDK | 8080, 5005 |
| Flutter | `flutter/` | Ubuntu 22.04 + Flutter SDK | 8080, 9100, 5000 |

## Usage

```bash
# 예: Node.js 개발 환경 실행
cd images/dev-environments/node

# 워크스페이스 경로 설정 후 실행
WORKSPACE_PATH=/path/to/your/project docker compose up -d

# 컨테이너 접속
docker exec -it dev-node bash
```

## Environment Variable

- `WORKSPACE_PATH`: 호스트의 프로젝트 디렉토리 경로 (기본값: `./workspace`)

## Features

각 환경에는 다음이 포함됩니다:
- 비루트 사용자로 실행
- 의존성 캐시를 위한 명명된 볼륨
- 지속적인 실행을 위한 `sleep infinity` 명령

## Building Custom Image

```bash
# 이미지 빌드
docker compose build

# 또는 직접 빌드
docker build -t dev-node .
```
