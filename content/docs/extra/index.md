# Extra 리소스 색인 학습 및 기록 노트

Extra 섹션은 일반 문서 본문과 별도로 제공되는 보조 리소스의 진입점이다. 현재 `content/docs/extra` 아래에서 확인되는 리소스는 API key dashboard HTML과 Docker Compose 컬렉션 문서다.

## 1. 왜 필요한가? (Pain Point & Motivation)

문서 사이트에는 Markdown 문서뿐 아니라 HTML 도구, Compose 스택, 설정 예시 같은 보조 리소스가 함께 들어갈 수 있다. 하지만 실제 파일이 없는 경로를 링크하면 사용자는 깨진 링크를 따라가게 되고, 보조 리소스가 문서보다 더 오래된 상태인지도 구분하기 어렵다.

Extra 색인의 목적은 실제 존재하는 리소스만 안내하고, 각 리소스의 운영 위험과 검증 위치를 분리하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `content/docs/extra`에서 확인되는 항목은 다음과 같다.

- `api-key-dashboard.html`: API key 관리 대시보드 형태의 정적 HTML
- `docker/index.md`: Docker Compose 컬렉션 상위 문서
- `docker/stacks/index.md`: Docker Compose 스택 전체 색인
- 각 Docker stack 카테고리 문서

기존 문서는 algorithm simulator, scripts, configs, project docs, legacy, prompts, MCP, memo 같은 여러 경로를 링크했지만, 현재 `content/docs/extra` 아래에서는 해당 리소스가 확인되지 않았다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 실제 존재하는 Extra 리소스만 링크한다.
- 정적 HTML 도구와 Docker Compose 문서를 구분한다.
- Compose 스택은 실행 전 `infra/docker/stacks`의 실제 파일을 확인하도록 안내한다.
- 민감 정보를 다루는 HTML 또는 설정 예시는 실제 secret을 담지 않게 한다.
- 새 리소스를 추가할 때 파일 위치와 링크 경로를 함께 갱신한다.

## 4. 시스템 번역 (Data Flow)

Extra 리소스 탐색 흐름은 다음과 같다.

```text
extra/index.md
  -> api-key-dashboard.html
  -> docker/index.md
  -> docker/stacks/index.md
  -> infra/docker/stacks 실제 Compose 파일
```

문서 사이트의 링크는 탐색 경로이고, Docker 스택 실행의 실제 기준은 `infra/docker/stacks` 아래 파일이다.

## 5. 핵심 구성요소 (Building Blocks)

| 리소스 | 경로 | 역할 |
| --- | --- | --- |
| API Key Dashboard | [api-key-dashboard.html](api-key-dashboard.html) | API key 관리 UI 형태의 정적 HTML |
| Docker Compose 컬렉션 | [docker/index.md](docker/index.md) | Compose 리소스 상위 안내 |
| Docker Stacks | [docker/stacks/index.md](docker/stacks/index.md) | 스택 카테고리 색인 |

Docker stack 카테고리는 다음 문서로 이어진다.

- [Automation](docker/stacks/automation/index.md)
- [Databases](docker/stacks/databases/index.md)
- [Devtools](docker/stacks/devtools/index.md)
- [Media](docker/stacks/media/index.md)
- [Misc](docker/stacks/misc/index.md)
- [Monitoring](docker/stacks/monitoring/index.md)
- [Proxy](docker/stacks/proxy/index.md)
- [Security](docker/stacks/security/index.md)
- [Storage](docker/stacks/storage/index.md)

## 6. 상태 전이 (State Transition)

Extra 리소스 관리 흐름은 다음과 같다.

```text
리소스 발견
  -> 실제 파일 존재 확인
  -> 문서 링크 추가
  -> 실행 또는 열람 전제 기록
  -> 포맷 검증
  -> 깨진 링크 여부 확인
```

각 단계의 기준은 다음과 같다.

- 실제 파일 존재: `content/docs/extra` 또는 참조된 실제 소스 경로에 파일이 있어야 한다.
- 문서 링크: 상대 경로가 현재 문서 기준으로 맞아야 한다.
- 실행 전제: HTML, Compose, config 파일마다 필요한 전제를 적는다.
- 검증: Markdown 포맷과 링크 대상 존재 여부를 확인한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 존재하지 않는 `/extra/...` 경로를 색인에 남기지 않는다.
- 정적 HTML 도구에는 실제 API key나 secret을 저장하지 않는다.
- Docker Compose 문서는 실행 전 실제 `infra/docker/stacks` 파일을 기준으로 확인한다.
- 새 리소스를 추가하면 색인과 실제 파일을 같은 변경 단위로 관리한다.
- 보조 리소스가 민감 정보를 다룰 경우 커밋 대상과 로컬 데이터 파일을 분리한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 Extra 리소스 목록은 다음처럼 확인한다.

```bash
find content/docs/extra -maxdepth 3 -type f | sort
```

Docker 스택 문서로 이동할 때는 다음 진입점을 사용한다.

```text
content/docs/extra/docker/index.md
content/docs/extra/docker/stacks/index.md
```

실제 Compose 파일은 다음 위치에서 확인한다.

```bash
find infra/docker/stacks -maxdepth 3 -type f | sort
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 오래된 색인 링크를 남기는 것이다. 실제 파일이 없는데 `/extra/algorithm-simulator/` 같은 경로를 안내하면 문서 사이트에서 깨진 링크가 된다.

두 번째 실패는 정적 HTML 도구에 실제 key를 넣는 것이다. HTML 파일은 배포되면 브라우저에서 그대로 열람될 수 있으므로 secret 저장소가 아니다.

세 번째 실패는 Docker 문서 링크만 보고 실행하는 것이다. 실제 실행 전에는 `infra/docker/stacks`의 Compose 파일과 `.env.example`을 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

나중에 알고리즘 시뮬레이터, 스크립트, 설정 파일, 프로젝트 문서가 다시 추가되면 각 리소스의 실제 파일 경로와 링크 경로를 함께 복구한다.

HTML 도구가 동적 기능을 갖게 되면 빌드 산출물인지 수동 작성 파일인지 구분해야 한다. 빌드 산출물이라면 생성 원본과 재생성 방법을 문서화한다.

Docker 스택처럼 실제 실행 파일이 다른 디렉터리에 있는 경우, 문서 링크와 소스 경로를 항상 함께 적는다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 색인에 있는 링크가 실제 파일을 가리킨다.
- [ ] 정적 HTML 도구에 실제 secret이 없다.
- [ ] Docker 문서와 실제 `infra/docker/stacks` 경로를 구분했다.
- [ ] 새 Extra 리소스 추가 시 색인도 함께 갱신한다.
- [ ] Markdown 포맷 검증을 통과했다.
- [ ] 존재하지 않는 legacy 링크를 제거했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Extra 색인은 보조 리소스의 `__________` 지도다. 링크는 실제 `__________`가 있을 때만 남기고, Docker 문서는 `__________`의 Compose 파일을 기준으로 확인한다.
