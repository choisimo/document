# Storage Docker Stacks 학습 및 기록 노트

Storage 카테고리는 웹 기반 파일 저장과 간단한 파일 공유 서비스를 다룬다. 현재 Droppy와 PicoShare 스택이 있으며, 이 영역에서는 볼륨 경로, 공유 비밀번호, 업로드 파일 보존, 공개 포트가 핵심이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

파일 공유 서비스는 사용하기 쉽지만, 한 번 공개되면 업로드 파일과 공유 링크가 외부에 노출될 수 있다. 또한 데이터 경로를 잘못 잡으면 컨테이너 재생성이나 `down -v` 이후 파일이 사라진다.

Storage 스택 문서의 목적은 실행 전에 Compose 유효성, 비밀번호, 데이터 보존 경로를 확인하게 만드는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/storage`에는 다음 스택이 있다.

- `droppy`: 웹 기반 파일 스토리지 서버
- `picoshare`: 만료 기능을 지원하는 파일 공유 서비스

검증 중 확인한 현재 상태는 다음과 같다.

- Droppy Compose는 들여쓰기 구조가 깨져 `docker compose config`에서 `services must be a mapping` 오류가 난다.
- PicoShare Compose는 `.env.example` 기준으로 렌더링되지만 `PICO_SHARE_PASSWORD=changeme_password` 예시값이 그대로 들어간다.
- PicoShare는 `4001:4001`을 호스트에 공개하고 SQLite DB를 `${DATA_DIR}`에 저장한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Storage 스택은 실행 전 `docker compose config`를 통과한다.
- 공유 비밀번호와 관리자 계정 기본값을 실제 값으로 교체한다.
- 파일과 DB 데이터가 명시적인 bind mount 또는 volume에 저장된다.
- 공개 포트는 필요한 네트워크에만 연다.
- 업로드 파일 백업과 삭제 정책을 서비스별로 정한다.

## 4. 시스템 번역 (Data Flow)

Storage 스택의 기본 흐름은 다음과 같다.

```text
browser
  -> storage web UI
  -> authentication or shared secret
  -> uploaded file
  -> bind mount or database volume
```

PicoShare는 공유 비밀번호와 SQLite DB 중심으로 동작한다.

```text
browser
  -> PicoShare :4001
  -> PS_SHARED_SECRET
  -> /data/store.db
  -> uploaded files and metadata
```

Droppy는 config와 files 경로가 분리되어야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 핵심 파일 | 현재 확인 지점 |
| --- | --- | --- |
| Droppy | `docker-compose.yaml`, `.env.example`, `README.md` | Compose YAML 구조 오류 |
| PicoShare | `docker-compose.yaml`, `.env.example`, `README.md` | 공유 secret, data 경로, 4001 포트 |

민감하거나 중요한 값은 다음과 같다.

| 값 | 이유 |
| --- | --- |
| `PORT` | 호스트 공개 포트 |
| `CONFIG_DIR` | Droppy 설정 보존 경로 |
| `DATA_FILES_DIR` | Droppy 파일 보존 경로 |
| `PICO_SHARE_PASSWORD` | PicoShare 공유 secret |
| `DATA_DIR` | PicoShare SQLite DB와 업로드 데이터 경로 |

## 6. 상태 전이 (State Transition)

Storage 스택 실행 흐름은 다음과 같다.

```text
스택 선택
  -> 데이터 경로 생성
  -> 비밀번호 작성
  -> Compose 렌더링
  -> 포트 공개 검토
  -> 기동
  -> 업로드와 재시작 보존 검증
```

각 단계의 통과 기준은 다음과 같다.

- 데이터 경로: 설정, 파일, DB 디렉터리가 존재한다.
- 비밀번호: 예시값이 남아 있지 않다.
- 렌더링: `docker compose config`가 성공한다.
- 포트 검토: 외부 공개가 필요한 포트만 열려 있다.
- 보존 검증: 파일 업로드 후 컨테이너 재시작에도 파일이 남아 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Storage 스택은 데이터 삭제 위험 때문에 `down -v`를 쉽게 쓰지 않는다.
- 공유 비밀번호는 `changeme_password` 같은 예시값으로 두지 않는다.
- 업로드 파일 경로와 설정 경로를 구분한다.
- 공개 파일 공유 서비스는 인증, 만료, 접근 로그를 함께 확인한다.
- Compose YAML이 유효하지 않은 스택은 실행하지 않는다.
- 데이터 경로는 백업 대상에 포함한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

PicoShare 실행 전 검증은 다음과 같다.

```bash
cd infra/docker/stacks/storage/picoshare
cp .env.example .env
mkdir -p data
docker compose --env-file .env config
docker compose --env-file .env up -d
docker compose ps
```

Droppy는 현재 YAML 오류를 먼저 확인해야 한다.

```bash
cd infra/docker/stacks/storage/droppy
cp .env.example .env
mkdir -p config files
docker compose --env-file .env config
```

업로드 데이터 보존은 컨테이너 재시작 후 확인한다.

```bash
docker compose restart
docker compose ps
```

데이터 삭제가 목적이 아니라면 볼륨 삭제 명령을 피한다.

```bash
docker compose down
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 Droppy Compose를 그대로 실행하는 것이다. 현재 파일은 YAML 들여쓰기 문제로 Compose가 `services`를 mapping으로 해석하지 못한다.

두 번째 실패는 PicoShare 공유 비밀번호를 예시값으로 두는 것이다. 공유 링크와 업로드 파일 접근 경계가 약해진다.

세 번째 실패는 데이터 경로를 임시 디렉터리로 두는 것이다. 파일 공유 서비스는 업로드 데이터가 핵심이므로 데이터 경로가 백업 대상이어야 한다.

네 번째 실패는 파일 공유 포트를 공개 인터넷에 직접 여는 것이다. 인증과 만료 정책이 약하면 임의 업로드와 다운로드 위험이 생긴다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인용 파일 공유는 로컬 네트워크나 VPN 뒤에 두는 것이 단순하다.

외부 공개가 필요하면 리버스 프록시, TLS, 업로드 용량 제한, 접근 로그, rate limit을 함께 둔다.

장기 보관이 필요한 파일은 단일 컨테이너 볼륨보다 별도 스토리지, 스냅샷, 백업 정책을 검토한다.

PicoShare처럼 단순 secret 기반 서비스는 계정별 권한 모델이 필요한 팀 환경에는 부족할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 Storage 스택의 실제 경로를 확인했다.
- [ ] 데이터 디렉터리와 설정 디렉터리를 만들었다.
- [ ] 예시 비밀번호를 실제 값으로 교체했다.
- [ ] `docker compose config`가 성공한다.
- [ ] 공개 포트 범위를 검토했다.
- [ ] 파일 업로드와 재시작 후 보존을 확인했다.
- [ ] 데이터 경로를 백업 대상에 포함했다.
- [ ] `down -v`의 데이터 삭제 영향을 이해했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Storage 스택의 핵심은 파일이 어디에 `__________`되는지와 누가 접근할 수 있는지다. 실행 전 `__________`를 통과해야 하고, 공유 secret은 `__________` 값으로 남기면 안 된다.
