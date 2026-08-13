# n8n Automation Stack

n8n queue-mode를 포함한 repository-specific automation stack example입니다.

## Deployment Contract

- **Scope:** Pin n8n, worker, PostgreSQL and Redis versions, execution/queue mode, encryption key, concurrency and the intended replica count.
- **Assumptions:** Three workers are a capacity example, not an availability or throughput guarantee. All replicas must share compatible database, queue and encryption configuration.
- **Evidence:** Queue depth, execution ownership, duplicate/retry behavior, health, logs and persisted workflow/credential recovery are required evidence.
- **Failure and completion:** Test broker/database outage, worker loss, rolling upgrade, restore and rollback; rotate every example credential before exposure.

---

## 구성 요소

### Core Services
- **n8n**: 워크플로우 자동화 엔진
- **n8n-worker**: queue worker이며 3 replicas는 example capacity 설정. concurrency와 수는 measured workload로 결정
- **PostgreSQL**: 메인 데이터베이스
- **Redis**: 캐시 및 큐 브로커

### Databases
- **MongoDB**: NoSQL 데이터베이스
- **Qdrant**: 벡터 데이터베이스
- **Elasticsearch**: 검색 엔진

### Storage & Messaging
- **MinIO**: S3 호환 객체 스토리지
- **RabbitMQ**: 메시지 브로커

### Monitoring
- **Prometheus**: 메트릭 수집
- **Grafana**: 대시보드

### Management Tools
- **pgAdmin**: PostgreSQL 관리
- **Adminer**: 범용 DB 관리
- **Redis Insight**: Redis 관리

## Quick Start

```bash
cd stacks/automation/n8n

# .env 파일 생성
cp .env.example .env

# 스택 실행
docker compose up -d
```

## Environment Variables

`.env` 파일 예시:

```env
# PostgreSQL
POSTGRES_DB=n8n
POSTGRES_USER=n8nuser
POSTGRES_PASSWORD=n8npass

# n8n
N8N_USER=admin
N8N_PASS=adminpass
N8N_ENCRYPTION_KEY=your-encryption-key

# Redis
REDIS_PASSWORD=redispass

# MongoDB
MONGO_USER=mongouser
MONGO_PASSWORD=mongopass

# Grafana
GRAFANA_PASSWORD=grafanapass
```

## Service URLs

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| n8n | http://localhost:5678 | admin/adminpass |
| pgAdmin | http://localhost:5050 | admin@example.com/adminpass |
| Grafana | http://localhost:3000 | admin/grafanapass |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| RabbitMQ | http://localhost:15672 | admin/adminpass |

## Files

- `docker-compose.yaml` - 종합 스택
- `docker-compose.simple.yaml` - 간단한 n8n 단독 구성
- `config/prometheus.yaml` - Prometheus 설정
