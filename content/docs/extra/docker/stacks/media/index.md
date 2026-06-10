# Media Docker Stacks 학습 및 기록 노트

Media 카테고리는 Ghost 블로그, VPN 기반 qBittorrent, Prowlarr, Sonarr, Radarr, Rclone, Cloudflared 같은 미디어 관련 Compose 구성을 모은다. 이 영역은 다운로드 트래픽, VPN 터널, 공개 웹 UI, 데이터 볼륨이 함께 얽히므로 실행 전 네트워크 경계와 비밀값 확인이 필수다.

## 1. 왜 필요한가? (Pain Point & Motivation)

미디어 스택은 겉으로는 웹 UI와 다운로드 경로만 보이지만, 실제로는 VPN 터널이 끊겼을 때 트래픽이 어디로 나가는지, WebUI 포트가 어디에 열리는지, 다운로드 데이터가 어느 볼륨에 저장되는지에 따라 운영 위험이 크게 달라진다.

Ghost처럼 공개 웹 서비스를 포함한 스택은 도메인, TLS, SMTP, MySQL이 함께 맞아야 하고, qBittorrent 계열 스택은 VPN credential과 tunnel token을 다룬다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/media`에는 다음 스택이 있다.

- `ghost/docker-compose.yaml`: Caddy, Ghost, MySQL, backup 구성
- `gluetun-qbittorrent/docker-compose.yaml`: Gluetun, qBittorrent, Prowlarr, Radarr, Sonarr, 선택 프로필 서비스
- `qbittorrent-advanced/docker-compose.yml`: Gluetun, qBittorrent, Cloudflared, Rclone 구성을 의도한 파일
- `qbittorrent-mediamanager/docker-compose.yml`: Gluetun, qBittorrent, Prowlarr, Sonarr, Radarr, Cloudflared
- `qbittorrent-mediamanager/docker-compose.arr.yml`: ARR 계열 확장 구성
- `qbittorrent-mediamanager/docker-compose.mediamanager.yml`: MediaManager, Nginx, Cloudflared 포함 구성
- `qbittorrent-mediamanager/docker-compose.rclone.yml`: Rclone mount 포함 구성

검증 중 확인한 현재 상태는 다음과 같다.

- Ghost는 `.env` 없이 렌더링하면 `DOMAIN_NAME`, DB 비밀번호, SMTP 값이 빈 문자열로 들어간다.
- `gluetun-qbittorrent`는 `.env.example`을 사용해 렌더링되지만 VPN credential 예시값이 그대로 들어간다.
- `qbittorrent-advanced/docker-compose.yml`은 `command: mount ${RCLONE_REMOTE_NAME}: ...` 줄에서 YAML 파싱 오류가 난다.
- `qbittorrent-mediamanager`는 렌더링되지만 `CLOUDFLARED_TOKEN`이 비어 있으면 cloudflared 명령도 토큰 없이 렌더링된다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- VPN을 거쳐야 하는 트래픽과 직접 공개되는 포트를 구분한다.
- VPN credential, WireGuard private key, Cloudflared token을 실제 값으로 설정한다.
- qBittorrent WebUI 기본 계정과 포트 공개 범위를 확인한다.
- Ghost는 도메인, DB 비밀번호, SMTP, Caddyfile을 모두 준비한 뒤 실행한다.
- Rclone mount나 FUSE가 필요한 구성은 호스트 권한과 YAML 유효성을 먼저 검증한다.

## 4. 시스템 번역 (Data Flow)

VPN 기반 qBittorrent 구성의 핵심 흐름은 다음과 같다.

```text
브라우저
  -> 호스트 공개 WebUI 포트
  -> Gluetun 네트워크 네임스페이스
  -> qBittorrent
  -> VPN 터널
  -> 외부 네트워크
```

ARR 계열 구성은 다운로드 클라이언트와 미디어 관리 도구가 함께 움직인다.

```text
Prowlarr
  -> indexer
  -> qBittorrent
  -> downloads/media volume
  -> Sonarr/Radarr
```

Ghost 구성은 공개 웹 서비스 흐름이다.

```text
client
  -> Caddy 80/443
  -> Ghost
  -> MySQL
  -> content and backup bind mounts
```

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 핵심 서비스 | 실행 전 확인 |
| --- | --- | --- |
| Ghost | Caddy, Ghost, MySQL, backup | `.env`, Caddyfile, DB 비밀번호, SMTP |
| Gluetun qBittorrent | Gluetun, qBittorrent, Prowlarr, Radarr, Sonarr | VPN credential, WebUI 포트, 데이터 경로 |
| qBittorrent Advanced | Gluetun, qBittorrent, Cloudflared, Rclone | YAML 오류, Rclone remote, FUSE 권한 |
| qBittorrent MediaManager | Gluetun, qBittorrent, ARR, Cloudflared | WireGuard key, Cloudflared token, 공개 포트 |

민감 값은 다음과 같다.

| 값 | 이유 |
| --- | --- |
| `OPENVPN_USER`, `OPENVPN_PASSWORD` | VPN Provider 인증 |
| `WIREGUARD_PRIVATE_KEY` | WireGuard 터널 인증 |
| `CLOUDFLARED_TOKEN` | Cloudflare Tunnel 권한 |
| `GHOST_DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Ghost DB 접근 제어 |
| `MAIL_PASSWORD` | SMTP 계정 권한 |
| `RCLONE_REMOTE_NAME` | Rclone mount 대상 |

## 6. 상태 전이 (State Transition)

Media 스택 실행 흐름은 다음과 같다.

```text
스택 선택
  -> .env와 설정 파일 준비
  -> VPN 또는 도메인 전제 확인
  -> docker compose config
  -> 포트 공개 범위 확인
  -> 기동
  -> WebUI, VPN IP, 데이터 경로 검증
```

상태별 통과 기준은 다음과 같다.

- 설정 준비: 예시 credential과 빈 token이 없어야 한다.
- VPN 확인: Gluetun 로그에서 터널 연결 성공을 확인한다.
- 포트 확인: WebUI와 ARR 포트가 필요한 주소에만 열린다.
- 데이터 확인: 다운로드와 미디어 경로가 의도한 볼륨에 기록된다.
- 공개 웹 확인: Ghost 도메인과 Caddy TLS가 맞는다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- qBittorrent 트래픽은 VPN 컨테이너 네트워크를 통과해야 한다.
- VPN credential과 WireGuard private key는 저장소에 커밋하지 않는다.
- Cloudflared token은 빈 값으로 운영하지 않는다.
- Ghost DB 비밀번호와 SMTP 비밀번호는 빈 문자열이면 안 된다.
- Rclone mount를 쓰는 구성은 호스트 FUSE 권한과 mount propagation을 확인한다.
- WebUI 포트는 필요한 범위에만 공개하고 기본 계정은 즉시 바꾼다.
- Compose 파일은 실행 전 반드시 `docker compose config`를 통과해야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Gluetun qBittorrent 스택은 다음처럼 검증한다.

```bash
cd infra/docker/stacks/media/gluetun-qbittorrent
cp .env.example .env
docker compose --env-file .env config
docker compose --env-file .env up -d
docker compose ps
docker compose logs gluetun --tail=100
```

Ghost는 `.env`와 Caddyfile을 준비한 뒤 검증한다.

```bash
cd infra/docker/stacks/media/ghost
docker compose config
docker compose up -d
```

MediaManager 기본 구성은 다음처럼 확인한다.

```bash
cd infra/docker/stacks/media/qbittorrent-mediamanager
cp .env.example .env
docker compose --env-file .env config
docker compose --env-file .env up -d
```

Advanced 구성은 현재 YAML 파싱 오류가 있으므로 먼저 config 명령으로 차단한다.

```bash
cd infra/docker/stacks/media/qbittorrent-advanced
docker compose config
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 VPN credential이 빈 값이거나 예시값인 상태로 기동하는 것이다. 컨테이너가 실행되어도 터널이 연결되지 않아 qBittorrent가 정상 동작하지 않거나 트래픽 경계가 깨질 수 있다.

두 번째 실패는 qBittorrent WebUI를 공개하고 기본 계정을 유지하는 것이다. README에는 기본 로그인 정보가 남아 있으므로 최초 로그인 후 계정을 변경해야 한다.

세 번째 실패는 Ghost를 `.env` 없이 렌더링하는 것이다. 현재 config 출력에서는 DB 사용자와 비밀번호, SMTP 값, URL이 빈 값으로 렌더링될 수 있다.

네 번째 실패는 `qbittorrent-advanced`를 그대로 실행하는 것이다. 현재 Compose 파일은 Rclone command 줄에서 YAML 파싱 오류가 나므로 실행 전에 파일 수정이 필요하다.

다섯 번째 실패는 Cloudflared token 없이 tunnel 서비스를 켜는 것이다. 명령은 생성되지만 실제 named tunnel 연결 권한이 없다.

## 10. 뇌 확장하기 (Evolution & Variants)

VPN 기반 다운로드 스택은 kill switch와 WebUI 포트 공개를 함께 봐야 한다. 다운로드 트래픽은 VPN으로 보내되, 관리 UI는 로컬 또는 인증 프록시 뒤에 둘 수 있다.

ARR 계열 서비스를 추가하면 자동화가 쉬워지지만 포트와 데이터 경로가 늘어난다. 각 서비스의 `/config`, `/downloads`, `/media` 경로가 같은 의미로 연결되는지 확인해야 한다.

Ghost는 단순 미디어 스택이라기보다 공개 웹 서비스다. 도메인, TLS, SMTP, 백업, MySQL 버전 호환성을 별도 운영 항목으로 다루는 것이 안전하다.

Rclone과 FUSE mount는 컨테이너 권한이 커진다. `privileged`, `SYS_ADMIN`, `/dev/fuse` 사용은 필요한 경우에만 허용한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 Media 스택의 실제 경로를 확인했다.
- [ ] `.env`의 VPN credential과 token을 실제 값으로 교체했다.
- [ ] `docker compose config`가 성공한다.
- [ ] qBittorrent가 VPN 네트워크를 통해 실행되는지 확인했다.
- [ ] WebUI 포트와 ARR 포트 공개 범위를 검토했다.
- [ ] Ghost의 도메인, DB, SMTP, Caddyfile을 준비했다.
- [ ] 다운로드와 미디어 데이터 경로를 확인했다.
- [ ] Rclone 또는 FUSE가 필요한 구성은 호스트 권한을 검토했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Media 스택은 다운로드 UI보다 `__________` 경계가 먼저다. qBittorrent는 `__________` 네트워크를 통과해야 하고, Ghost는 도메인, DB, SMTP, `__________`가 모두 준비된 뒤 실행한다.
