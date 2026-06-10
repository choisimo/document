# Automation Docker Stacks 학습 및 기록 노트

Automation 카테고리는 워크플로우 자동화, 시간 추적, 시각적 AI 플로우 도구를 Docker Compose로 실행하기 위한 스택을 모은다. 실제 소스는 `infra/docker/stacks/automation` 아래에 있으며, 현재 `kimai`, `langflow`, `n8n` 스택이 있다.

## 1. 왜 필요한가? (Pain Point & Motivation)

자동화 도구는 외부 API 토큰, 웹훅 URL, 데이터베이스, 큐, 파일 저장소를 함께 다루는 경우가 많다. 컨테이너가 기동되어도 웹훅 URL이 틀리거나 암호화 키가 바뀌면 워크플로우 실행 이력과 credential 복호화가 깨질 수 있다.

따라서 자동화 스택은 “서비스가 뜨는지”보다 “비밀값, 외부 URL, 데이터 저장소가 안정적으로 유지되는지”를 먼저 확인해야 한다.

## 2. 현재 나의 상태 (Baseline)

현재 Automation 스택은 다음 파일 구성을 가진다.

- `kimai/docker-compose.yaml`: Kimai와 MySQL 구성, 별도 `.env.example` 없음
- `langflow/docker-compose.yaml`: Langflow, PostgreSQL, 권한 보정 init 컨테이너, 선택적 cloudflared 프로필
- `langflow/.env.example`: Langflow 포트, 바인딩 주소, PostgreSQL 비밀번호, Tunnel 토큰 예시
- `langflow/README.md`: 실행 절차와 환경 변수 설명
- `n8n/docker-compose.yaml`: PostgreSQL, n8n, worker, Redis, Qdrant 구성
- `n8n/docker-compose.simple.yaml`: 외부 `nodove-net` 네트워크를 사용하는 단순 n8n 구성
- `n8n/.env.example`: n8n과 여러 주변 서비스 환경 변수 예시
- `n8n/README.md`: 종합 스택 설명

기존 문서는 Kimai와 n8n만 카드로 보여 주고, 실제로 추가된 Langflow 스택과 파일 구성 차이를 반영하지 못했다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Automation 스택별 실행 경로와 필수 파일을 구분한다.
- `.env.example`의 기본 비밀번호를 실제 값으로 바꾼다.
- 웹훅 URL, 도메인, 터널 토큰을 실행 환경에 맞게 설정한다.
- 내부 데이터베이스와 큐 포트가 불필요하게 공개되지 않는지 확인한다.
- README 설명과 실제 Compose 파일이 다를 때 Compose 파일을 기준으로 재검증한다.

## 4. 시스템 번역 (Data Flow)

Automation 스택의 일반 흐름은 다음과 같다.

```text
브라우저 또는 외부 웹훅
  -> 자동화 서비스 UI/API
  -> 데이터베이스
  -> 큐 또는 워커
  -> 외부 API, 파일, 알림 채널
```

n8n full 스택은 다음처럼 더 많은 내부 의존성을 가진다.

```text
n8n main
  -> PostgreSQL
  -> Redis queue
  -> n8n worker
  -> Qdrant
```

Langflow는 PostgreSQL과 데이터 볼륨을 사용하고, cloudflared는 `tunnel` 프로필을 켰을 때만 함께 실행된다.

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 주요 서비스 | 주의할 파일 |
| --- | --- | --- |
| Kimai | `kimai`, `sqldb` | `docker-compose.yaml` 내부 환경 변수 주석 |
| Langflow | `langflow`, `postgres`, `langflow-perms`, `cloudflared` | `.env.example`, `README.md` |
| n8n full | `n8n`, `n8n-worker`, `postgres`, `redis`, `qdrant` | `.env.example`, `config/prometheus.yaml`, `README.md` |
| n8n simple | `n8n` | 외부 `nodove-net` 네트워크 |

확인해야 할 민감 값은 다음과 같다.

| 값 | 이유 |
| --- | --- |
| `POSTGRES_PASSWORD` | 데이터베이스 접근 제어 |
| `N8N_ENCRYPTION_KEY` | n8n credential 암호화 기준 |
| `N8N_USER`, `N8N_PASS` | n8n UI 인증 |
| `WEBHOOK_URL` | 외부 웹훅 콜백 주소 |
| `TUNNEL_TOKEN` | Cloudflare Tunnel 연결 권한 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Kimai 관리자 계정 |

## 6. 상태 전이 (State Transition)

Automation 스택 실행 흐름은 다음과 같다.

```text
스택 선택
  -> README와 Compose 파일 확인
  -> .env 또는 환경 변수 작성
  -> 포트와 외부 URL 검증
  -> docker compose config
  -> 기동
  -> 로그인과 워크플로우 저장 검증
```

각 단계의 통과 기준은 다음과 같다.

- 파일 확인: `.env.example`이 없으면 Compose 파일의 `${...}` 변수를 직접 찾는다.
- 비밀값 작성: `changeme`, `adminpass`, `example-encryption-key` 같은 기본값을 제거한다.
- 포트 검증: PostgreSQL, Redis, Qdrant 같은 내부 포트가 필요한 경우에만 공개된다.
- 기동 검증: healthcheck가 있는 서비스는 healthy 상태가 된다.
- 기능 검증: 로그인, 워크플로우 저장, 재시작 후 데이터 유지가 확인된다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- n8n의 `N8N_ENCRYPTION_KEY`는 운영 중 변경하지 않는다.
- 자동화 스택의 실제 비밀값은 저장소에 커밋하지 않는다.
- 웹훅 URL은 외부에서 접근 가능한 실제 주소와 일치해야 한다.
- PostgreSQL, Redis, Qdrant 포트는 공개 필요성이 있을 때만 바인딩한다.
- Langflow의 기본 바인딩 주소가 `127.0.0.1`인지 확인한 뒤 외부 노출 여부를 결정한다.
- Kimai는 `.env.example`이 없으므로 Compose 파일의 환경 변수 목록을 직접 채워야 한다.
- n8n simple 스택은 외부 `nodove-net` 네트워크가 없으면 실행되지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Langflow 실행 전 확인 흐름은 다음과 같다.

```bash
cd infra/docker/stacks/automation/langflow
cp .env.example .env
docker compose config
docker compose up -d
docker compose ps
```

Cloudflare Tunnel까지 함께 실행할 때는 프로필을 명시한다.

```bash
docker compose --profile tunnel up -d
```

n8n full 스택은 다음처럼 시작한다.

```bash
cd infra/docker/stacks/automation/n8n
cp .env.example .env
docker compose config
docker compose up -d
docker compose ps
```

n8n simple 스택은 외부 네트워크를 먼저 확인한다.

```bash
docker network ls
docker compose -f docker-compose.simple.yaml config
docker compose -f docker-compose.simple.yaml up -d
```

Kimai는 필요한 환경 변수를 직접 준비한 뒤 실행한다.

```bash
cd infra/docker/stacks/automation/kimai
docker compose config
docker compose up -d
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 n8n 암호화 키를 임시값으로 두는 것이다. credential 저장 후 키가 바뀌면 기존 credential을 복호화하지 못할 수 있다.

두 번째 실패는 README와 Compose 파일을 같은 것으로 가정하는 것이다. 현재 n8n README는 MinIO, RabbitMQ, Grafana 같은 서비스를 언급하지만 실제 `docker-compose.yaml`에는 PostgreSQL, n8n, worker, Redis, Qdrant가 정의되어 있다. 실행 전에는 Compose 파일을 기준으로 확인해야 한다.

세 번째 실패는 내부 데이터베이스 포트를 공개하는 것이다. n8n full 스택은 PostgreSQL `5432:5432`, Redis `6380:6379`, Qdrant 포트를 노출한다. 운영 환경에서는 방화벽이나 로컬 바인딩을 별도로 검토해야 한다.

네 번째 실패는 Langflow의 Tunnel 토큰 없이 tunnel 프로필을 실행하는 것이다. 기본 스택과 터널 프로필을 분리해서 먼저 기본 기동을 검증하는 편이 안전하다.

다섯 번째 실패는 Kimai에 포트 매핑이 없다는 점을 놓치는 것이다. 프록시나 포트 공개 설계를 하지 않으면 외부에서 접근할 수 없다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인 실험용 자동화 스택은 로컬 바인딩과 단일 사용자 인증으로 시작할 수 있다.

외부 웹훅을 받는 운영 스택은 TLS, 고정 도메인, 프록시 헤더, 웹훅 URL, 인증 로그를 함께 설계해야 한다.

n8n처럼 큐와 워커를 사용하는 구성은 단일 컨테이너 구성보다 복잡하지만, 긴 작업과 동시 실행을 분산하기 쉽다. 대신 Redis와 worker 상태까지 관측해야 한다.

Langflow처럼 데이터 볼륨 권한을 보정하는 init 컨테이너가 있는 스택은 named volume 권한 문제를 줄일 수 있지만, 실행 순서와 완료 상태를 확인해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 Automation 스택의 실제 경로를 확인했다.
- [ ] README와 Compose 파일을 모두 읽었다.
- [ ] `.env.example`의 기본 비밀번호와 토큰을 교체했다.
- [ ] n8n의 `N8N_ENCRYPTION_KEY`를 고정하고 보관했다.
- [ ] 외부 웹훅 URL과 실제 공개 도메인이 일치한다.
- [ ] 내부 데이터베이스와 큐 포트 노출 범위를 검토했다.
- [ ] `docker compose config`가 성공한다.
- [ ] 로그인, 데이터 저장, 재시작 후 상태 보존을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Automation 스택은 컨테이너보다 `__________`, 웹훅 URL, 데이터 저장소가 더 중요하다. n8n은 `__________`를 고정하고, Langflow는 `__________`와 터널 프로필을 분리해서 확인하며, Kimai는 Compose 안의 `__________`를 직접 채워야 한다.
