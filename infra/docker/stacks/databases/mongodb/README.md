# MongoDB Stack

MongoDB 데이터베이스 스택입니다. Replica Set 구성을 지원합니다.

## Quick Start

```bash
cd stacks/databases/mongodb

# 키파일 생성 (Replica Set 인증용)
./scripts/init-keyfile.sh

# data 디렉토리 생성
mkdir -p data/mongodata

# 스택 실행
docker compose up -d
```

## Environment Variables

```env
MONGO_USERNAME=admin
MONGO_PASSWORD=STRONG_PASSWORD
```

## Files

- `docker-compose.yaml` - MongoDB 컨테이너 설정
- `scripts/mongo-init.js` - 초기화 스크립트 (DB, 사용자, 컬렉션 생성)
- `scripts/init-keyfile.sh` - Replica Set 키파일 생성 스크립트

## Network

기본적으로 `nodove-net` 외부 네트워크를 사용합니다.

```bash
# 네트워크가 없으면 생성
docker network create nodove-net
```

## Ports

- `27018:27017` - MongoDB (호스트 27018 → 컨테이너 27017)

## Initialization

`scripts/mongo-init.js`가 컨테이너 시작 시 자동 실행되어:
1. `n8n_chat-caching` 데이터베이스 생성
2. `n8n_user` 사용자 생성
3. `chat_history` 컬렉션 및 인덱스 생성
