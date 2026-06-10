# Database Docker Stacks 학습 및 기록 노트

Database 카테고리는 MariaDB, MongoDB, Supabase 계열 Compose 스택을 모은다. 데이터베이스 스택은 컨테이너 기동보다 데이터 보존, 인증 변수, 포트 공개, 초기화 스크립트가 더 중요하다.

## 1. 왜 필요한가? (Pain Point & Motivation)

데이터베이스 컨테이너는 한 번 잘못 실행하면 빈 비밀번호, 잘못된 초기 사용자, 의도치 않은 외부 포트 공개, 삭제된 볼륨 같은 문제가 곧바로 데이터 손실이나 보안 사고로 이어진다. 특히 초기화 스크립트와 `.env` 값은 첫 실행 시점에 반영되는 경우가 많아, 나중에 바꿔도 기대한 대로 재초기화되지 않을 수 있다.

따라서 데이터베이스 스택은 실행 전에 `docker compose config`로 렌더링 결과를 확인하고, 인증 변수와 볼륨 경로를 먼저 검증해야 한다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/databases`에는 다음 스택이 있다.

- `mariadb`: MariaDB, 백업 컨테이너, Adminer 구성을 의도한 스택
- `mongodb`: Replica Set과 keyfile 인증을 사용하는 MongoDB 스택
- `supabase`: pgvector PostgreSQL과 PostgREST를 묶은 경량 Supabase 유사 스택

검증 중 확인한 현재 상태는 다음과 같다.

- MariaDB Compose는 `adminer`가 `networks` 아래에 렌더링되어 `docker compose config`가 실패한다.
- MongoDB `.env.example`은 `MONGO_USERNAME`, `MONGO_PASSWORD`를 제공하지만 Compose 파일은 `${username}`, `${password}`를 참조한다.
- Supabase Compose는 렌더링되지만 PostgreSQL `5432`와 PostgREST `3000`을 호스트에 공개한다.

이 상태에서는 문서가 단순 실행 가이드가 아니라 실행 전 검증 체크리스트 역할을 해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 데이터베이스 스택 실행 전 Compose 렌더링이 성공한다.
- `.env.example` 변수명과 Compose 변수명이 일치한다.
- 루트 비밀번호, 사용자 비밀번호, JWT secret이 기본값으로 남아 있지 않다.
- 데이터 볼륨과 백업 경로를 명확히 확인한다.
- DB 포트는 필요한 경우에만 호스트에 공개한다.
- 외부 네트워크 `nodove-net` 필요 여부를 실행 전에 확인한다.

## 4. 시스템 번역 (Data Flow)

데이터베이스 스택 흐름은 다음처럼 해석할 수 있다.

```text
애플리케이션 또는 관리 UI
  -> 호스트 공개 포트 또는 Docker 내부 네트워크
  -> 데이터베이스 컨테이너
  -> 데이터 볼륨
  -> 초기화 스크립트 또는 백업 경로
```

Supabase 계열 구성은 API 계층이 추가된다.

```text
클라이언트
  -> PostgREST
  -> PostgreSQL with pgvector
  -> named volume
```

MongoDB Replica Set 구성은 keyfile과 init 스크립트가 실행 전 준비되어야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 핵심 파일 | 주요 확인 |
| --- | --- | --- |
| MariaDB | `docker-compose.yaml`, `.env.example`, `README.md` | Compose 렌더링 오류, 볼륨, Adminer 위치 |
| MongoDB | `docker-compose.yaml`, `.env.example`, `scripts/init-keyfile.sh`, `scripts/mongo-init.js` | 변수명 불일치, keyfile, 외부 네트워크 |
| Supabase | `docker-compose.yaml`, `.env.example`, `scripts/supabase-jwt.py` | JWT secret, `nodove-net`, 공개 포트 |

민감 변수는 다음과 같다.

| 변수 | 의미 |
| --- | --- |
| `MARIADB_ROOT_PASSWORD` | MariaDB root 비밀번호 |
| `MARIADB_PASSWORD` | MariaDB 일반 사용자 비밀번호 |
| `MONGO_USERNAME`, `MONGO_PASSWORD` | MongoDB root 계정 후보 |
| `SUPABASE_DB_PASSWORD` | PostgreSQL 비밀번호 |
| `SUPABASE_JWT_SECRET` | PostgREST JWT 검증 키 |

## 6. 상태 전이 (State Transition)

데이터베이스 스택 실행 상태는 다음 순서로 이동한다.

```text
스택 선택
  -> 환경 변수 작성
  -> 초기화 파일 준비
  -> Compose 렌더링 검증
  -> 네트워크와 포트 확인
  -> 컨테이너 기동
  -> 데이터 쓰기와 재시작 검증
```

각 단계의 통과 기준은 다음과 같다.

- 환경 변수 작성: 기본 비밀번호와 빈 값이 없어야 한다.
- 초기화 파일 준비: MongoDB keyfile과 init script 경로가 실제로 존재해야 한다.
- 렌더링 검증: `docker compose config`가 오류 없이 끝나야 한다.
- 네트워크 확인: `nodove-net` 같은 external network가 존재해야 한다.
- 데이터 검증: 테스트 데이터를 쓴 뒤 재시작 후에도 남아 있어야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 데이터베이스 스택은 실행 전 반드시 `docker compose config`를 통과해야 한다.
- `.env.example`의 `changeme` 값은 실제 실행에 사용하지 않는다.
- DB root 계정과 애플리케이션 계정을 구분한다.
- named volume 또는 bind mount의 삭제 영향을 이해하지 않고 `down -v`를 실행하지 않는다.
- 관리 UI와 DB 포트는 필요한 네트워크에만 공개한다.
- MongoDB Replica Set keyfile은 첫 실행 전에 생성하고 권한을 확인한다.
- JWT secret은 충분히 긴 랜덤 값으로 만들고 운영 중 임의로 바꾸지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Supabase 스택의 최소 검증 흐름은 다음과 같다.

```bash
cd infra/docker/stacks/databases/supabase
cp .env.example .env
docker network ls
docker compose config
docker compose up -d
docker compose ps
```

MongoDB는 keyfile 준비가 먼저다.

```bash
cd infra/docker/stacks/databases/mongodb
./scripts/init-keyfile.sh
docker network ls
docker compose config
```

현재 MongoDB Compose는 `.env.example` 변수명과 맞지 않으므로, 실행 전 렌더링 결과에서 빈 사용자와 비밀번호가 없는지 확인한다.

```bash
docker compose --env-file .env.example config
```

MariaDB는 현재 Compose 구조가 검증을 통과하지 않으므로 먼저 config 오류를 확인한다.

```bash
cd infra/docker/stacks/databases/mariadb
docker compose --env-file .env.example config
```

정상 운영 중 데이터 삭제가 목적이 아니라면 볼륨 제거를 포함하지 않는다.

```bash
docker compose down
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 Compose 파일이 렌더링되지 않는 상태에서 실행을 시도하는 것이다. 현재 MariaDB 스택은 `networks.adminer` 아래에 서비스 속성이 들어간 형태로 해석되어 `docker compose config`가 실패한다.

두 번째 실패는 환경 변수 이름 불일치다. 현재 MongoDB Compose는 `${username}`, `${password}`를 참조하지만 `.env.example`은 `MONGO_USERNAME`, `MONGO_PASSWORD`를 제공한다. 그대로 렌더링하면 빈 인증값으로 해석된다.

세 번째 실패는 DB 포트를 공개 범위 없이 여는 것이다. Supabase 스택은 `5432:5432`, `3000:3000`을 공개한다. 운영 환경에서는 로컬 바인딩, 방화벽, 프록시 경계를 따로 확인해야 한다.

네 번째 실패는 초기화 파일 경로를 오해하는 것이다. MongoDB Compose의 bind mount 경로가 README의 스크립트 경로와 실제 상대 경로 기준에서 맞는지 실행 전 확인해야 한다.

다섯 번째 실패는 JWT secret을 예시값으로 두는 것이다. PostgREST 인증이 예측 가능한 토큰 기준으로 동작하게 된다.

## 10. 뇌 확장하기 (Evolution & Variants)

개발용 데이터베이스는 호스트 포트를 열어 편하게 접속할 수 있지만, 운영용 데이터베이스는 애플리케이션 네트워크 내부에만 두는 편이 안전하다.

백업이 필요한 데이터베이스는 Compose 파일에 백업 컨테이너가 있다고 끝나지 않는다. 백업 파일 생성, 복구 테스트, 보관 주기, 암호화 여부를 별도로 검증해야 한다.

Replica Set, pgvector, PostgREST처럼 기능이 추가될수록 초기화 순서가 중요해진다. 최초 실행 후 생성된 볼륨을 유지한 채 설정만 바꾸면 초기화 스크립트가 다시 실행되지 않을 수 있다.

데이터베이스 스택을 공통 네트워크에 붙일 때는 서비스 이름 충돌, 포트 충돌, 권한 범위를 함께 검토한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 DB 스택의 실제 경로를 확인했다.
- [ ] `.env.example`을 복사하고 기본 비밀번호를 교체했다.
- [ ] Compose 변수명과 `.env` 변수명이 일치한다.
- [ ] `docker compose config`가 오류 없이 끝난다.
- [ ] external network가 필요한 경우 미리 생성했다.
- [ ] DB 포트와 관리 UI 공개 범위를 검토했다.
- [ ] 데이터 볼륨과 백업 경로를 확인했다.
- [ ] 재시작 후 데이터가 유지되는지 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

데이터베이스 스택은 컨테이너 실행보다 `__________`, 인증 변수, 볼륨 보존이 먼저다. 실행 전 `__________`로 렌더링을 확인하고, DB 포트는 필요한 `__________`에만 공개한다.
