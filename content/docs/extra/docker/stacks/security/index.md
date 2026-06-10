# Security Docker Stacks 학습 및 기록 노트

Security 카테고리는 비밀번호와 인증 경계를 다루는 서비스를 모은다. 현재는 Vaultwarden 스택 하나가 있고, 기본 Compose, Nginx 변형, Cloudflare Tunnel 변형, full 변형이 제공된다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Vaultwarden은 개인 또는 조직의 비밀번호 저장소다. 컨테이너가 정상 기동되어도 관리자 토큰, 회원가입 허용 여부, 도메인, TLS, 백업, 터널 토큰이 잘못 설정되면 가장 민감한 데이터가 위험해진다.

Security 스택 문서의 목적은 빠른 실행보다 안전한 노출 경계와 복구 가능성을 먼저 확인하게 만드는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/security/vaultwarden`에는 다음 파일이 있다.

- `.env.example`: 도메인, 포트, 데이터 경로, 백업 경로, Cloudflare token, SSL 경로 예시
- `docker-compose.yaml`: Vaultwarden과 백업 기본 구성
- `docker-compose.nginx.yaml`: Vaultwarden, Nginx, 백업 구성
- `docker-compose.cloudflared.yaml`: Vaultwarden, Cloudflared, 백업 구성
- `docker-compose.full.yaml`: Vaultwarden, Nginx, Cloudflared, 백업 구성
- `nginx/vaultwarden.conf`: TLS Nginx reverse proxy 설정
- `nginx/vaultwarden-internal.conf`: Cloudflare Tunnel 뒤의 내부 HTTP Nginx 설정

검증 중 확인한 현재 상태는 다음과 같다.

- 기본 `docker-compose.yaml`은 `.env.example`의 `VAULTWARDEN_PORT`가 아니라 `${VAULTWARDEN__PORT}`를 참조해 포트 값이 비어 렌더링된다.
- 기본 `docker-compose.yaml`의 백업 환경 변수에는 `CRON_TOME` 오타가 있다.
- Nginx, Cloudflared, full 변형은 `.env.example` 기준으로 렌더링되지만 `CLOUDFLARE_TUNNEL_TOKEN=EXAMPLE_TUNNEL_TOKEN` 예시값이 그대로 들어간다.
- 여러 Compose 변형이 `DISABLE_ADMIN_TOKEN: "true"`를 사용한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Vaultwarden 도메인은 HTTPS 기준으로 설정한다.
- 관리자 페이지 정책을 명확히 정하고, `DISABLE_ADMIN_TOKEN`을 관리자 페이지 비활성화로 오해하지 않는다.
- 실제 관리자 토큰을 사용할 경우 argon2 해시로 관리한다.
- 회원가입은 초기 설정 후 닫는다.
- 데이터와 백업 디렉터리를 분리하고 복구 절차를 검증한다.
- Cloudflare Tunnel 또는 Nginx TLS 중 하나의 노출 경계를 명확히 선택한다.

## 4. 시스템 번역 (Data Flow)

Nginx 변형 흐름은 다음과 같다.

```text
client
  -> host 80/443
  -> nginx
  -> vaultwarden:80
  -> /data volume
  -> backup volume
```

Cloudflare Tunnel 변형 흐름은 다음과 같다.

```text
client
  -> Cloudflare Edge
  -> cloudflared tunnel
  -> vaultwarden internal network
  -> /data volume
```

full 변형은 중간에 내부 Nginx가 추가된다.

```text
Cloudflare Edge
  -> cloudflared
  -> nginx internal proxy
  -> vaultwarden
```

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인할 내용 |
| --- | --- | --- |
| Vaultwarden | 비밀번호 저장소 | 도메인, 회원가입, 관리자 정책 |
| Nginx | TLS reverse proxy | 인증서, WebSocket, upload size |
| Cloudflared | 외부 터널 | 실제 tunnel token, public hostname |
| Backup | 데이터 백업 | 백업 주기, 보존 기간, 복구 테스트 |
| `/data` | Vaultwarden 영구 데이터 | bind mount 경로와 권한 |
| `.env` | 운영 설정 | 예시값 제거, 커밋 금지 |

민감 값은 다음과 같다.

| 값 | 이유 |
| --- | --- |
| `ADMIN_TOKEN` | 관리자 페이지 접근 제어 |
| `CLOUDFLARE_TUNNEL_TOKEN` | 터널 연결 권한 |
| `SSL_KEY_PATH` | TLS private key |
| `VW_DATA_PATH` | 비밀번호 저장소 데이터 |
| `VW_BACKUP_PATH` | 백업 산출물 |

## 6. 상태 전이 (State Transition)

Vaultwarden 스택 운영 상태는 다음처럼 이동한다.

```text
노출 방식 선택
  -> .env 작성
  -> 관리자 정책 결정
  -> Compose 렌더링
  -> TLS 또는 Tunnel 검증
  -> 기동
  -> 백업과 복구 검증
```

상태별 통과 기준은 다음과 같다.

- 노출 방식 선택: Nginx TLS, Cloudflare Tunnel, full 중 하나를 선택한다.
- `.env` 작성: 예시 token과 빈 포트 값이 남아 있지 않다.
- 관리자 정책: admin page를 쓸지, 토큰을 둘지, 외부 접근을 막을지 정한다.
- 렌더링: 선택한 Compose 파일의 `docker compose config`가 성공한다.
- 기동: `/alive` healthcheck와 프록시 응답이 성공한다.
- 복구: 백업 파일로 새 데이터 디렉터리 복구를 테스트한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `DISABLE_ADMIN_TOKEN=true`를 관리자 페이지를 안전하게 끄는 설정으로 취급하지 않는다.
- 실제 운영에서는 예시 `EXAMPLE_TUNNEL_TOKEN`을 사용하지 않는다.
- `ADMIN_TOKEN`을 사용할 경우 평문보다 해시된 토큰을 우선한다.
- 회원가입은 초기 사용자 생성 후 `SIGNUPS_ALLOWED=false`로 둔다.
- Vaultwarden 데이터 디렉터리와 백업 디렉터리는 백업 대상이자 민감 데이터다.
- TLS private key와 tunnel token은 저장소에 커밋하지 않는다.
- 기본 Compose의 `VAULTWARDEN__PORT`와 `.env.example`의 `VAULTWARDEN_PORT` 불일치를 실행 전 해결한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Nginx TLS 변형의 렌더링 확인은 다음과 같다.

```bash
cd infra/docker/stacks/security/vaultwarden
cp .env.example .env
mkdir -p data backups ssl nginx/logs
docker compose --env-file .env -f docker-compose.nginx.yaml config
```

Cloudflare Tunnel 변형은 실제 token을 넣은 뒤 확인한다.

```bash
docker compose --env-file .env -f docker-compose.cloudflared.yaml config
```

full 변형은 내부 Nginx 설정까지 포함한다.

```bash
docker compose --env-file .env -f docker-compose.full.yaml config
```

기본 Compose는 현재 변수명 불일치를 먼저 확인해야 한다.

```bash
docker compose --env-file .env -f docker-compose.yaml config
```

기동 후에는 상태와 로그를 확인한다.

```bash
docker compose --env-file .env -f docker-compose.nginx.yaml up -d
docker compose --env-file .env -f docker-compose.nginx.yaml ps
docker compose --env-file .env -f docker-compose.nginx.yaml logs --tail=100
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 `DISABLE_ADMIN_TOKEN=true`를 admin page 비활성화로 오해하는 것이다. 이 값은 관리자 토큰 요구를 비활성화하는 방향으로 동작할 수 있으므로, 외부에서 admin endpoint가 접근 가능한 구성과 결합하면 위험하다.

두 번째 실패는 기본 Compose의 포트 변수명을 놓치는 것이다. `.env.example`은 `VAULTWARDEN_PORT`를 제공하지만 기본 Compose는 `VAULTWARDEN__PORT`를 참조한다.

세 번째 실패는 백업 스케줄 오타를 놓치는 것이다. 기본 Compose의 `CRON_TOME`은 의도한 백업 스케줄 변수로 동작하지 않을 수 있다.

네 번째 실패는 Cloudflare Tunnel token 예시값을 그대로 두는 것이다. 컨테이너는 렌더링되지만 실제 터널 연결 권한이 없다.

다섯 번째 실패는 백업만 있고 복구 테스트가 없는 것이다. 비밀번호 저장소는 백업 파일 생성보다 복구 가능성이 더 중요하다.

## 10. 뇌 확장하기 (Evolution & Variants)

로컬 또는 내부망 전용이면 Vaultwarden을 로컬 바인딩 뒤에 두고 외부 공개를 피할 수 있다.

공개 도메인이 필요하면 Nginx TLS 변형과 Cloudflare Tunnel 변형 중 운영 환경에 맞는 하나를 선택한다. 둘을 함께 쓰는 full 변형은 경계가 명확할 때만 사용한다.

관리자 페이지가 필요하면 강한 `ADMIN_TOKEN`, IP 제한, 프록시 인증을 함께 둔다. 필요 없으면 admin endpoint 접근 자체를 차단하는 방식을 검토한다.

Vaultwarden 운영은 Compose보다 백업, 복구, 업데이트, 알림, 로그 확인 절차가 더 중요하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 노출 방식을 Nginx, Cloudflared, full 중 하나로 정했다.
- [ ] `.env`의 예시 token과 비밀번호를 모두 교체했다.
- [ ] 관리자 페이지 정책과 `ADMIN_TOKEN` 정책을 정했다.
- [ ] `DISABLE_ADMIN_TOKEN`의 의미를 검토했다.
- [ ] 선택한 Compose 파일의 `docker compose config`가 성공한다.
- [ ] TLS 인증서 또는 Cloudflare Tunnel public hostname을 검증했다.
- [ ] 백업 파일 생성과 복구 절차를 테스트했다.
- [ ] 데이터, 백업, private key, tunnel token을 민감 자산으로 관리한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Vaultwarden 스택은 비밀번호 저장소라서 실행보다 `__________`와 복구가 먼저다. `DISABLE_ADMIN_TOKEN`을 admin page 비활성화로 오해하지 말고, 실제 노출 경계는 `__________` 또는 `__________` 설정으로 검증한다.
