# n8n 워크플로우용 종합 Docker Compose 스택

n8n 워크플로우에서 자주 사용되는 **Redis**를 포함한 모든 인기 컨테이너들을 한 번에 구성할 수 있는 **종합 `docker-compose.yml`** 파일을 제공합니다.

## 환경 변수 설정 (.env 파일)

```env
# 데이터베이스 설정
POSTGRES_USER=n8n
POSTGRES_PASSWORD=n8npass
POSTGRES_DB=n8n

# n8n 설정
N8N_USER=admin
N8N_PASS=adminpass
N8N_ENCRYPTION_KEY=your-encryption-key-here

# Redis 설정
REDIS_PASSWORD=redispass

# MongoDB 설정
MONGO_USER=mongouser
MONGO_PASSWORD=mongopass

# Qdrant 설정
QDRANT_API_KEY=qdrantkey

# MinIO 설정
MINIO_USER=minioadmin
MINIO_PASSWORD=minioadmin

# RabbitMQ 설정
RABBITMQ_USER=admin
RABBITMQ_PASS=adminpass

# Grafana 설정
GRAFANA_PASSWORD=grafanapass

# pgAdmin 설정
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=adminpass
```

## 실행 방법

```bash
# 1. 프로젝트 디렉토리 생성
mkdir n8n-complete-stack
cd n8n-complete-stack

# 2. 파일 생성
touch docker-compose.yml .env prometheus.yml

# 3. 전체 스택 실행
docker compose up -d

# 4. 특정 서비스만 실행 (예: 기본 스택)
docker compose up -d n8n postgres redis mongodb qdrant
```

## 각 서비스 접속 정보

| 서비스 | 접속 URL | 기본 계정 |
|---|---|---|
| **n8n** | `http://localhost:5678` | admin/adminpass |
| **pgAdmin** | `http://localhost:5050` | admin@example.com/adminpass |
| **Adminer** | `http://localhost:8080` | - |
| **Redis Insight** | `http://localhost:8001` | - |
| **Grafana** | `http://localhost:3000` | admin/grafanapass |
| **Prometheus** | `http://localhost:9090` | - |
| **MinIO Console** | `http://localhost:9001` | minioadmin/minioadmin |
| **RabbitMQ Management** | `http://localhost:15672` | admin/adminpass |
| **Nginx Proxy Manager** | `http://localhost:81` | admin@example.com/changeme |

## n8n에서 각 서비스 연결 방법

### 데이터베이스 연결
- **PostgreSQL**: Host `postgres`, Port `5432`
- **MongoDB**: Host `mongodb`, Port `27017`
- **Redis**: Host `redis`, Port `6379`

### 특수 서비스 연결
- **Qdrant**: URL `http://qdrant:6333/`, API Key `qdrantkey`
- **Elasticsearch**: Host `elasticsearch`, Port `9200`
- **MinIO**: Endpoint `http://minio:9000`
- **RabbitMQ**: Host `rabbitmq`, Port `5672`

## 주요 특징

- **종합 스택**: n8n 워크플로우에서 자주 사용되는 모든 서비스를 포함.
- **네트워크 연결**: 모든 서비스가 같은 네트워크에서 컨테이너 이름으로 통신 가능.
- **데이터 영속성**: 각 서비스의 데이터를 Docker 볼륨으로 보관.
- **환경 변수 관리**: `.env` 파일을 통한 중앙 집중식 설정 관리.
- **모니터링**: Prometheus + Grafana를 통한 시스템 모니터링.
- **관리 도구**: 각 데이터베이스별 전용 관리 도구 제공.

이 구성으로 **로컬 환경에서 n8n의 모든 기능을 활용할 수 있는 완전한 개발 환경**을 구축할 수 있습니다. 필요에 따라 일부 서비스만 선택적으로 사용하거나 추가 서비스를 확장할 수 있습니다.
