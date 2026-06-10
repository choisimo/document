# Misc Docker Stacks 학습 및 기록 노트

Misc 카테고리는 다른 카테고리로 분류되지 않은 보조 스택을 모은다. 현재는 ChangeDetection.io, Ghost Blog, Kamai 경로의 Kimai 스택이 있으며, 일부는 media나 monitoring 카테고리와 목적이 겹친다.

## 1. 왜 필요한가? (Pain Point & Motivation)

misc 스택은 실험용이나 업무 보조용으로 빠르게 추가되는 경우가 많다. 이 때문에 README의 설명과 실제 Compose 파일이 어긋나거나, 예시 비밀번호가 남아 있거나, 실행 경로에 따라 bind mount가 다른 위치를 가리킬 수 있다.

Misc 문서의 목적은 “잡다한 스택 모음”을 실행 전 점검 가능한 단위로 바꾸는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/misc`에는 다음 스택이 있다.

- `changedetection`: ChangeDetection.io와 Playwright Chrome
- `ghost-blog`: Caddy, Ghost, MySQL, backup
- `kamai`: Kimai와 MySQL 구성, 디렉터리명은 `kamai`이지만 서비스 문서는 Kimai를 가리킴

검증 중 확인한 현재 상태는 다음과 같다.

- ChangeDetection Compose는 `.env.example` 기준으로 렌더링된다.
- Ghost Blog Compose는 `.env.example` 기준으로 렌더링되지만 `changeme` 계열 비밀번호와 예시 SMTP 값이 남는다.
- Ghost Blog Compose는 `$PWD`를 bind mount에 사용하므로 실행 위치가 중요하다.
- Kamai Compose는 렌더링되지만 README의 포트 정보와 달리 실제 Compose에는 포트 매핑이 없다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Misc 스택도 실행 전 `docker compose config`를 통과한다.
- 예시 비밀번호와 SMTP 값이 실제 값으로 교체된다.
- `$PWD` 기반 bind mount가 의도한 스택 디렉터리를 가리킨다.
- README 설명과 Compose 파일의 차이를 실행 전에 확인한다.
- 같은 서비스가 다른 카테고리에도 있을 때 실제 운영 기준 문서를 하나로 정한다.

## 4. 시스템 번역 (Data Flow)

ChangeDetection 흐름은 다음과 같다.

```text
browser
  -> ChangeDetection UI
  -> datastore bind mount
  -> Playwright Chrome
  -> monitored websites
```

Ghost Blog 흐름은 다음과 같다.

```text
client
  -> Caddy 80/443
  -> Ghost
  -> MySQL
  -> content and backup bind mounts
```

Kimai 흐름은 다음과 같다.

```text
browser or proxy
  -> Kimai
  -> MySQL
  -> kimai data and plugin bind mounts
```

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 핵심 파일 | 실제 확인 지점 |
| --- | --- | --- |
| ChangeDetection | `docker-compose.yaml`, `.env.example`, `scripts/run.sh` | `DATASTORE_DIR`, `PORT`, Playwright URL |
| Ghost Blog | `docker-compose.yaml`, `.env.example`, `README.md` | Caddyfile, DB 비밀번호, SMTP, `$PWD` |
| Kamai/Kimai | `docker-compose.yaml`, `.env.example`, `README.md` | admin 계정, DB 비밀번호, 포트 매핑 없음 |

민감 값은 다음과 같다.

| 값 | 이유 |
| --- | --- |
| `GHOST_DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Ghost MySQL 접근 제어 |
| `MAIL_USER`, `MAIL_PASSWORD` | SMTP 계정 권한 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Kimai 초기 관리자 계정 |
| `kimaipassword`, `mysqlrootpasswd` | Kimai DB 인증 |

## 6. 상태 전이 (State Transition)

Misc 스택 실행 흐름은 다음과 같다.

```text
스택 선택
  -> README와 Compose 비교
  -> .env 작성
  -> 실행 경로 확인
  -> docker compose config
  -> 기동
  -> 웹 UI와 데이터 보존 확인
```

상태별 통과 기준은 다음과 같다.

- 비교: README의 포트와 Compose의 포트가 일치하는지 확인한다.
- 환경 변수: 기본 비밀번호와 예시 SMTP 값이 없어야 한다.
- 실행 경로: `$PWD` 기반 bind mount가 실제 스택 디렉터리를 가리킨다.
- 기동: healthcheck 또는 로그에서 정상 상태를 확인한다.
- 보존: datastore, content, DB 디렉터리가 재시작 후 유지된다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- misc 스택도 다른 스택과 동일하게 `docker compose config`를 먼저 실행한다.
- `changeme` 계열 비밀번호는 실제 실행에 사용하지 않는다.
- `$PWD`를 쓰는 Compose는 반드시 의도한 디렉터리에서 실행한다.
- README의 포트 설명보다 렌더링된 Compose 결과를 우선한다.
- Ghost의 Caddyfile은 컨테이너 시작 전에 준비한다.
- Kimai가 외부에서 보여야 하면 실제 Compose에 포트 또는 프록시 경로가 있어야 한다.
- ChangeDetection datastore는 삭제하지 않도록 별도 보존 경로를 둔다.

## 8. 가장 작은 예제 (Minimal Viable Example)

ChangeDetection은 다음처럼 확인한다.

```bash
cd infra/docker/stacks/misc/changedetection
cp .env.example .env
mkdir -p datastore
docker compose --env-file .env config
docker compose --env-file .env up -d
```

Ghost Blog는 실행 위치와 Caddyfile을 먼저 확인한다.

```bash
cd infra/docker/stacks/misc/ghost-blog
cp .env.example .env
mkdir -p caddy/conf caddy/site caddy/data caddy/config
mkdir -p ghost/content ghost-mysql/db ghost-mysql/config ghost-mysql/mysql-init
docker compose --env-file .env config
```

Kamai/Kimai는 포트 매핑이 없는 현재 상태를 먼저 확인한다.

```bash
cd infra/docker/stacks/misc/kamai
cp .env.example .env
docker compose --env-file .env config
docker compose --env-file .env up -d
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 Ghost Blog의 `$PWD`를 오해하는 것이다. 다른 디렉터리에서 `-f`로 실행하면 bind mount가 문서가 기대한 경로가 아니라 현재 작업 디렉터리 기준으로 잡힐 수 있다.

두 번째 실패는 예시 비밀번호를 그대로 두는 것이다. Ghost와 Kimai `.env.example`에는 `changeme` 계열 값이 포함되어 있다.

세 번째 실패는 Kamai/Kimai 포트를 열었다고 가정하는 것이다. README에는 `8001`, `3306` 포트가 적혀 있지만 현재 Compose 렌더링에는 포트 매핑이 없다.

네 번째 실패는 ChangeDetection의 Playwright 브라우저를 외부에 공개한다고 오해하는 것이다. 현재 Compose에서 Playwright는 내부 서비스로 사용되고, UI는 ChangeDetection 포트로 노출된다.

다섯 번째 실패는 같은 역할의 Ghost 스택이 media에도 있다는 점을 놓치는 것이다. 어느 스택을 운영 기준으로 삼을지 정하지 않으면 백업과 설정이 갈라진다.

## 10. 뇌 확장하기 (Evolution & Variants)

ChangeDetection을 상시 운영하려면 알림 채널, 접근 인증, datastore 백업을 추가로 설계한다.

Ghost Blog는 misc보다 media 또는 웹 서비스 운영 문서로 분리하는 편이 장기적으로 관리하기 쉽다. 도메인, TLS, SMTP, 백업이 모두 운영 요소이기 때문이다.

Kamai/Kimai는 automation 카테고리에도 유사 구성이 있으므로, 하나의 기준 스택을 정하고 나머지는 실험용으로 표시하는 것이 좋다.

Misc 카테고리는 시간이 지나면 중복과 임시 구성이 쌓이기 쉽다. 정기적으로 실제 실행되는 스택과 보관용 스택을 분리해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 misc 스택의 실제 경로를 확인했다.
- [ ] README와 Compose 포트가 일치하는지 확인했다.
- [ ] `.env.example`의 기본 비밀번호를 교체했다.
- [ ] `$PWD` 기반 bind mount가 의도한 경로인지 확인했다.
- [ ] `docker compose config`가 성공한다.
- [ ] Caddyfile이나 datastore 같은 선행 파일을 준비했다.
- [ ] 웹 UI 접근과 데이터 보존을 확인했다.
- [ ] 중복 스택 중 운영 기준을 하나로 정했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Misc 스택은 임시 모음일수록 `__________`와 실제 Compose를 비교해야 한다. `$PWD` 기반 볼륨은 실행 `__________`에 민감하고, 예시 `__________`는 운영 전에 반드시 교체한다.
