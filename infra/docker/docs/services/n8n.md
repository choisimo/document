# n8n local-development Compose stack 예시

n8n과 repository에서 선택한 Redis·database·보조 service를 함께 실행하는 local-development Compose 예시입니다. 포함 여부가 일반적인 n8n 필요 service나 production architecture를 뜻하지 않습니다.

## 적용 범위와 보안 검증 기준

- **범위:** 이 구성은 특정 n8n·PostgreSQL·Redis 및 보조 service의 local-development 예시입니다. image version/digest, n8n execution mode, encryption key, queue·worker와 schema 호환성을 기록합니다.
- **보안 전제:** 예제 credential을 시작 전에 교체하고 UI·database·broker port를 trusted host/network로 제한합니다. 같은 network에 있다는 사실은 authorization이나 TLS를 제공하지 않습니다.
- **사실과 추론:** rendered Compose, migration/task log, health, workflow 실행과 persisted credential 복호화가 근거입니다. “모든 기능”이나 scale 효과는 실제 workflow test 전까지 가설입니다.
- **실패·완료:** dependency outage, retry·duplicate execution, worker restart, credential loss, database restore와 upgrade rollback을 시험해야 완료입니다.

---

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
| **n8n** | `http://localhost:5678` | repository의 local example credential이며 시작 전에 교체 |
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

- **선택 stack**: 이 repository가 예시로 고른 service를 포함하며 workflow별 dependency는 별도 결정.
- **network discovery**: 같은 Compose network에 연결되고 service가 healthy한 경우 service 이름으로 연결 가능. 이는 authorization·TLS를 제공하지 않음.
- **데이터 영속성**: 각 서비스의 데이터를 Docker 볼륨으로 보관.
- **환경 변수 관리**: `.env` 파일을 통한 중앙 집중식 설정 관리.
- **모니터링**: Prometheus + Grafana를 통한 시스템 모니터링.
- **관리 도구**: 각 데이터베이스별 전용 관리 도구 제공.

이 구성으로 **명시된 service를 시험할 수 있는 local development 시작 환경**을 구축할 수 있습니다. 필요에 따라 일부 서비스만 선택적으로 사용하거나 추가 서비스를 확장할 수 있습니다.
