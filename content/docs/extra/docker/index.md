# Docker Compose 스택 컬렉션 학습 및 기록 노트

이 문서는 저장소에 모아 둔 Docker Compose 스택을 탐색하기 위한 상위 색인이다. 실제 Compose 파일과 예시 환경 파일은 `infra/docker/stacks/...` 아래에 있고, 문서 페이지는 각 스택을 실행하기 전에 어떤 전제를 확인해야 하는지 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Compose 스택은 실행 명령이 단순해 보이지만, 실제로는 포트, 볼륨, 네트워크, 비밀값, 초기화 스크립트, 외부 도메인 설정이 함께 맞아야 한다. 스택별 README나 `.env.example`을 건너뛰면 컨테이너는 올라와도 로그인, 데이터 보존, 백업, 프록시 연결이 깨질 수 있다.

따라서 Compose 컬렉션의 목적은 “복사해서 실행”이 아니라, 각 스택의 실행 전제와 위험 지점을 빠르게 찾게 하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 컬렉션은 다음 카테고리로 구성되어 있다.

- Automation: `kimai`, `langflow`, `n8n`
- Databases: `mariadb`, `mongodb`, `supabase`
- Devtools: `gitea`, `sourcebot`, `termix`
- Media: `ghost`, `gluetun-qbittorrent`, `qbittorrent-*`
- Misc: `changedetection`, `ghost-blog`, `kamai`
- Monitoring: `changedetection`, `prometheus-grafana`
- Proxy: `nginx`
- Security: `vaultwarden`
- Storage: `droppy`, `picoshare`

기존 문서는 카드형 링크 중심이라 탐색은 쉽지만, 실행 전 검증 기준과 스택 소스 경로의 의미가 충분히 드러나지 않았다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 필요한 스택 카테고리를 빠르게 찾는다.
- Compose 파일, README, `.env.example`의 역할을 구분한다.
- 실행 전 포트, 볼륨, 네트워크, 비밀값을 확인한다.
- 민감 서비스는 프록시와 인증 경계를 먼저 설계한다.
- 스택 실행 후 `docker compose ps`, 로그, 볼륨 생성을 확인한다.

## 4. 시스템 번역 (Data Flow)

Compose 스택 실행 흐름은 다음처럼 해석할 수 있다.

```text
문서 색인
  -> 스택 카테고리 문서
  -> infra/docker/stacks/<category>/<stack>
  -> README와 .env.example 확인
  -> docker compose config
  -> docker compose up -d
  -> 상태, 로그, 볼륨, 포트 검증
```

이 흐름에서 `docker compose up -d`는 마지막 단계에 가깝다. 실행 전 `docker compose config`로 환경 변수 치환과 YAML 병합 결과를 확인하면 많은 오류를 미리 잡을 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인할 내용 |
| --- | --- | --- |
| `docker-compose.yaml` | 서비스, 네트워크, 볼륨 정의 | 이미지, 포트, 볼륨, restart 정책 |
| `.env.example` | 필요한 환경 변수 예시 | 비밀번호, 도메인, 포트, 경로 |
| `README.md` | 스택별 실행 전제 | 초기화, 키 생성, 주의사항 |
| `scripts/` | 초기화 또는 보조 작업 | 실행 권한, 멱등성, 민감값 |
| `config/` | 서비스 설정 파일 | 호스트 경로와 컨테이너 경로 |
| 카테고리 문서 | 스택 탐색 | 목적과 운영 위험 |

주요 문서 진입점은 다음과 같다.

- [Stacks Overview](stacks/index.md)
- [Automation](stacks/automation/index.md)
- [Databases](stacks/databases/index.md)
- [Devtools](stacks/devtools/index.md)
- [Media](stacks/media/index.md)
- [Monitoring](stacks/monitoring/index.md)
- [Proxy](stacks/proxy/index.md)
- [Security](stacks/security/index.md)
- [Storage](stacks/storage/index.md)
- [Misc](stacks/misc/index.md)

## 6. 상태 전이 (State Transition)

스택 하나를 운영 가능한 상태로 올리는 흐름은 다음과 같다.

```text
후보 스택 선택
  -> README 확인
  -> .env 작성
  -> config 렌더링 검증
  -> 컨테이너 기동
  -> 상태와 로그 확인
  -> 데이터 보존과 접속 경로 검증
```

각 단계의 실패 조건을 먼저 정해 두어야 한다.

- README 확인: 선행 네트워크나 키파일 생성이 필요한가?
- `.env` 작성: 빈 비밀번호나 기본 토큰이 남아 있지 않은가?
- config 검증: 정의되지 않은 환경 변수가 없는가?
- 기동: 컨테이너가 재시작 루프에 빠지지 않는가?
- 접속 검증: 외부 공개가 필요한 포트만 열렸는가?

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `.env.example`은 예시 파일이고 실제 비밀값을 담지 않는다.
- 실제 `.env` 파일은 저장소에 커밋하지 않는다.
- 데이터가 필요한 서비스는 named volume 또는 명시적인 호스트 볼륨을 사용한다.
- 데이터베이스와 관리자 UI는 공개 포트 노출을 최소화한다.
- 프록시 뒤에 둘 서비스는 원본 포트와 공개 도메인을 분리한다.
- 실행 전 `docker compose config`로 최종 설정을 확인한다.
- 스택별 README에 있는 키 생성, 초기화, 네트워크 생성 절차를 건너뛰지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

스택 실행 전 최소 절차는 다음과 같다.

```bash
cd infra/docker/stacks/databases/mariadb
cp .env.example .env
docker compose config
docker compose up -d
docker compose ps
docker compose logs --tail=100
```

포트 충돌은 실행 전에 확인한다.

```bash
docker compose config | grep -n 'ports:'
ss -tulpen
```

볼륨 생성을 확인한다.

```bash
docker volume ls
docker compose ps
```

중지와 제거는 데이터 보존 범위를 알고 실행한다.

```bash
docker compose down
```

볼륨까지 지우는 명령은 데이터 삭제가 목적일 때만 사용한다.

```bash
docker compose down -v
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 `.env.example`을 그대로 실행하는 것이다. 예시 비밀번호나 빈 도메인이 남아 있으면 서비스가 기동되지 않거나 안전하지 않은 기본값으로 열린다.

두 번째 실패는 볼륨 정책을 확인하지 않는 것이다. `docker compose down -v`는 named volume을 제거할 수 있으므로 데이터베이스, 비밀번호 저장소, 미디어 메타데이터가 사라질 수 있다.

세 번째 실패는 포트 공개 범위를 과하게 잡는 것이다. 관리자 UI, 데이터베이스 포트, 내부 API가 `0.0.0.0`에 바인딩되면 외부 접근 경계가 넓어진다.

네 번째 실패는 여러 카테고리에 비슷한 스택이 있을 때 목적을 구분하지 않는 것이다. 예를 들어 변경 감지 스택이 misc와 monitoring 양쪽에 있으면 어느 문서가 실제 운영 기준인지 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인 실험 환경에서는 단일 Compose 파일과 로컬 볼륨으로 충분하다.

상시 운영 환경에서는 백업, 모니터링, 로그 보존, 리버스 프록시, TLS 인증서를 Compose 스택과 함께 설계해야 한다.

여러 스택을 동시에 운영한다면 공통 네트워크 이름, 포트 범위, 볼륨 네이밍 규칙, 도메인 규칙을 정한다.

보안 민감 서비스는 앱 자체 인증만 믿지 말고 프록시 인증, IP 제한, 관리자 토큰 관리, 백업 암호화를 함께 검토한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 필요한 스택 카테고리와 실제 소스 경로를 확인했다.
- [ ] README와 `.env.example`을 실행 전에 읽었다.
- [ ] 실제 `.env`에 기본 비밀번호가 남아 있지 않다.
- [ ] `docker compose config`가 성공한다.
- [ ] 공개 포트와 내부 포트를 구분했다.
- [ ] 데이터 볼륨과 삭제 명령의 영향을 이해했다.
- [ ] `docker compose ps`와 로그로 정상 기동을 확인했다.
- [ ] 운영 대상 스택은 백업과 업데이트 절차를 따로 정했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Compose 컬렉션은 실행 명령 모음이 아니라 스택별 `__________`를 확인하는 지도다. 실행 전 `__________`와 `.env.example`을 읽고, `__________`로 최종 설정을 검증한 뒤 `__________`와 로그를 확인한다.
