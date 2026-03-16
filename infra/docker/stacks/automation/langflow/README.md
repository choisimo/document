# Langflow Stack

Langflow와 PostgreSQL을 함께 실행하는 Docker Compose 스택입니다. 원본 `docs/services/langflow.md`에 있던 구성 의도를 유지하면서, 실제로 바로 실행할 수 있는 템플릿과 환경 변수 예시로 정리했습니다.

## 구성 요소

| Service | Description |
|---------|-------------|
| Langflow | 워크플로우 UI 및 실행 서비스 |
| PostgreSQL | Langflow 메타데이터 저장소 |
| langflow-perms | Langflow 데이터 볼륨 권한을 보정하는 1회성 init 컨테이너 |
| cloudflared | Cloudflare Tunnel 연결용 선택 서비스 |

## Quick Start

```bash
cd stacks/automation/langflow
cp .env.example .env

# 필수 값 수정
# - POSTGRES_PASSWORD
# - TUNNEL_TOKEN (Cloudflare Tunnel 사용 시)

docker compose up -d
```

Cloudflare Tunnel까지 함께 올릴 때:

```bash
docker compose --profile tunnel up -d
```

## 기본 접속 정보

| Target | Value |
|--------|-------|
| Langflow URL | `http://127.0.0.1:7860` |
| Internal PostgreSQL Host | `postgres` |
| Internal PostgreSQL Port | `5432` |
| Database Name | `langflow` |

기본 포트 바인딩은 `127.0.0.1`에만 열리도록 설정되어 있습니다. 외부 네트워크에서 직접 접속해야 하면 `.env`의 `LANGFLOW_BIND_ADDRESS`를 변경하거나 리버스 프록시를 앞단에 두는 편이 안전합니다.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TZ` | No | 컨테이너 타임존 |
| `LANGFLOW_IMAGE` | No | Langflow 이미지 태그 |
| `LANGFLOW_CONTAINER_NAME` | No | Langflow 컨테이너 이름 |
| `LANGFLOW_PERMS_CONTAINER_NAME` | No | 권한 보정 init 컨테이너 이름 |
| `LANGFLOW_PORT` | No | 호스트에 노출할 Langflow 포트 |
| `LANGFLOW_BIND_ADDRESS` | No | Langflow 포트를 바인딩할 주소 |
| `POSTGRES_CONTAINER_NAME` | No | PostgreSQL 컨테이너 이름 |
| `POSTGRES_USER` | No | Langflow가 사용할 DB 사용자 |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL 비밀번호 |
| `POSTGRES_DB` | No | Langflow 메타데이터 DB 이름 |
| `CLOUDFLARED_CONTAINER_NAME` | No | Cloudflare Tunnel 컨테이너 이름 |
| `TUNNEL_TOKEN` | Tunnel 사용 시 Yes | Cloudflare Tunnel 토큰 |

## 운영 메모

- `langflow-perms`는 named volume이 root 권한으로 생성될 때 Langflow가 `/var/lib/langflow`에 쓰지 못하는 문제를 피하기 위한 init 서비스입니다.
- PostgreSQL은 내부 네트워크에만 연결되며 기본 템플릿에서는 호스트 포트를 열지 않습니다.
- `cloudflared`는 `tunnel` 프로필로 분리되어 있어, 토큰 없이 기본 스택만 먼저 기동할 수 있습니다.
- 프로덕션에서는 `latest` 대신 고정 버전 태그를 사용하는 편이 안전합니다.

## Files

- `docker-compose.yaml` - Langflow 실행 스택
- `.env.example` - 환경 변수 예시
- `README.md` - 실행 및 운영 설명
