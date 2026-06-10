# Docker Compose Stacks 전체 색인 학습 노트

이 문서는 `infra/docker/stacks` 아래의 Compose 스택을 전체 카테고리 관점에서 정리한다. 각 카테고리 문서는 서비스별 실행 파일을 안내하고, 이 문서는 모든 스택에 공통으로 적용되는 실행 전 검증 절차를 담당한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Compose 스택은 `docker compose up -d` 한 줄로 실행되는 것처럼 보이지만, 스택마다 필요한 `.env`, 볼륨, 네트워크, 초기화 스크립트가 다르다. 스택 수가 늘어나면 어떤 서비스가 데이터베이스인지, 어떤 서비스가 프록시 뒤에 있어야 하는지, 어떤 서비스가 비밀값을 요구하는지 빠르게 파악하기 어렵다.

전체 색인은 이 문제를 카테고리별 탐색과 공통 실행 규칙으로 나누어 해결한다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks`에는 다음 카테고리가 있다.

- `automation`: Kimai, Langflow, n8n
- `databases`: MariaDB, MongoDB, Supabase
- `devtools`: Gitea, Sourcebot, Termix
- `media`: Ghost, Gluetun qBittorrent, qBittorrent 변형
- `misc`: ChangeDetection, Ghost Blog, Kamai
- `monitoring`: ChangeDetection, Prometheus Grafana
- `proxy`: Nginx
- `security`: Vaultwarden
- `storage`: Droppy, PicoShare

기존 문서는 카테고리 링크와 빠른 실행 명령을 제공했지만, 실제 소스 경로가 `docker/stacks`처럼 표현되어 현재 저장소 구조와 맞지 않았다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 모든 스택의 실제 저장소 경로를 `infra/docker/stacks` 기준으로 이해한다.
- 카테고리별 문서로 이동해 필요한 스택을 찾는다.
- 실행 전 `.env.example`, README, 보조 스크립트를 확인한다.
- 포트, 볼륨, 네트워크, 비밀값 검증을 공통 절차로 수행한다.
- 스택 변경 후 재시작과 데이터 보존 범위를 구분한다.

## 4. 시스템 번역 (Data Flow)

전체 스택 탐색 흐름은 다음과 같다.

```text
stacks/index.md
  -> category/index.md
  -> infra/docker/stacks/<category>/<stack>
  -> docker-compose.yaml
  -> .env 또는 config 파일
  -> docker compose config
  -> docker compose up -d
```

문서의 링크는 탐색을 돕고, 실제 실행은 `infra/docker/stacks` 아래에서 이루어진다. 따라서 문서와 Compose 파일이 서로 다르면 Compose 파일을 직접 확인해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 카테고리 | 문서 | 실제 스택 예시 |
| --- | --- | --- |
| Automation | [automation](automation/index.md) | `kimai`, `langflow`, `n8n` |
| Databases | [databases](databases/index.md) | `mariadb`, `mongodb`, `supabase` |
| Devtools | [devtools](devtools/index.md) | `gitea`, `sourcebot`, `termix` |
| Media | [media](media/index.md) | `ghost`, `gluetun-qbittorrent`, `qbittorrent-*` |
| Misc | [misc](misc/index.md) | `changedetection`, `ghost-blog`, `kamai` |
| Monitoring | [monitoring](monitoring/index.md) | `changedetection`, `prometheus-grafana` |
| Proxy | [proxy](proxy/index.md) | `nginx` |
| Security | [security](security/index.md) | `vaultwarden` |
| Storage | [storage](storage/index.md) | `droppy`, `picoshare` |

공통 실행 파일은 보통 다음 중 일부를 가진다.

- `docker-compose.yaml` 또는 `docker-compose.yml`
- `.env.example`
- `README.md`
- `config/`
- `scripts/`

## 6. 상태 전이 (State Transition)

스택 하나를 선택해 실행하는 상태 전이는 다음과 같다.

```text
카테고리 선택
  -> 스택 선택
  -> 파일 목록 확인
  -> 환경 변수 작성
  -> Compose 설정 렌더링
  -> 기동
  -> 상태와 데이터 보존 확인
```

상태별 확인 기준은 다음과 같다.

- 파일 목록 확인: README와 `.env.example`이 있는지 본다.
- 환경 변수 작성: 기본 비밀번호, 토큰, 도메인을 실제 값으로 바꾼다.
- 설정 렌더링: `docker compose config`가 실패하지 않아야 한다.
- 기동: `docker compose ps`에서 재시작 루프가 없어야 한다.
- 데이터 보존: named volume과 bind mount 경로를 확인한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 실제 실행 경로는 `infra/docker/stacks/<category>/<stack>`이다.
- `.env.example`은 실행용 비밀값 파일이 아니다.
- 스택 실행 전 `docker compose config`를 실행한다.
- 외부 네트워크를 참조하는 스택은 네트워크 존재 여부를 먼저 확인한다.
- 데이터 저장 서비스는 `docker compose down -v`의 영향을 이해한 뒤 종료한다.
- 외부 공개 포트는 필요한 서비스에만 제한한다.
- README가 있는 스택은 README 절차를 Compose 명령보다 먼저 따른다.

## 8. 가장 작은 예제 (Minimal Viable Example)

공통 실행 흐름은 다음과 같다.

```bash
cd infra/docker/stacks/automation/n8n
cp .env.example .env
docker compose config
docker compose up -d
docker compose ps
```

로그를 확인한다.

```bash
docker compose logs --tail=100
```

외부 네트워크가 필요한지 확인한다.

```bash
docker network ls
docker compose config | grep -n 'external: true'
```

정상 중지는 다음 명령으로 시작한다.

```bash
docker compose down
```

데이터 삭제가 목적일 때만 볼륨 제거를 포함한다.

```bash
docker compose down -v
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 문서 경로와 실행 경로를 혼동하는 것이다. 문서는 `content/docs/...`에 있지만 실제 Compose 실행은 `infra/docker/stacks/...`에서 해야 한다.

두 번째 실패는 외부 네트워크를 만들지 않고 실행하는 것이다. Compose 파일이 `external: true` 네트워크를 참조하면 네트워크가 없을 때 기동이 실패한다.

세 번째 실패는 여러 Compose 파일이 있는 스택에서 잘못된 파일을 실행하는 것이다. qBittorrent media manager처럼 역할별 Compose 파일이 나뉜 경우 목적에 맞는 파일을 선택해야 한다.

네 번째 실패는 스택 중지와 데이터 삭제를 구분하지 않는 것이다. `down`과 `down -v`는 운영 데이터에 미치는 영향이 다르다.

## 10. 뇌 확장하기 (Evolution & Variants)

스택 수가 늘어나면 공통 네트워크, 공통 프록시, 공통 로그 수집, 공통 백업 규칙을 별도 문서로 분리할 수 있다.

개발용 스택과 운영용 스택은 포트 공개와 비밀값 관리 기준이 달라야 한다. 개발용은 로컬 바인딩으로 충분할 수 있지만, 운영용은 TLS, 인증, 백업, 모니터링을 포함해야 한다.

Compose 파일이 복잡해지면 profile, override 파일, 공통 `.env` 전략을 도입할 수 있다. 다만 숨은 기본값이 늘어나므로 `docker compose config` 출력이 항상 최종 기준이어야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 필요한 카테고리 문서를 찾았다.
- [ ] 실제 실행 경로가 `infra/docker/stacks` 아래임을 확인했다.
- [ ] 스택별 README와 `.env.example`을 확인했다.
- [ ] `docker compose config`가 성공한다.
- [ ] 외부 네트워크와 포트 공개 범위를 확인했다.
- [ ] 볼륨과 bind mount 경로를 확인했다.
- [ ] `docker compose ps`와 로그로 정상 상태를 확인했다.
- [ ] 데이터 삭제 명령을 운영 스택에 실수로 사용하지 않는다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Docker Compose 스택 색인은 실행 버튼이 아니라 `__________`를 찾는 지도다. 실제 실행은 `__________` 아래에서 하고, 실행 전에는 `.env`, README, `__________` 출력을 확인한다.
