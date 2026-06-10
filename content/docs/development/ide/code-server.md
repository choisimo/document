# code-server 원격 개발 환경 학습 및 기록 노트

`code-server`는 VS Code 계열 편집기를 서버에서 실행하고 브라우저로 접속하게 해 주는 원격 개발 도구다. 설치 자체보다 중요한 기준은 접속 경계다. 편집기에는 소스 코드, 터미널, SSH 키, 환경 변수, 빌드 산출물이 함께 노출될 수 있으므로, 기본값을 이해하지 않고 인터넷에 열면 개발 서버 전체를 노출하는 결과가 된다.

## 1. 왜 필요한가? (Pain Point & Motivation)

로컬 장비마다 개발 도구와 확장, 런타임, 빌드 캐시를 맞추면 환경 차이 때문에 같은 저장소도 다르게 동작할 수 있다. 노트북 성능이 부족하거나 태블릿처럼 로컬 개발 도구 설치가 제한된 장비에서는 개발 환경 자체를 원격 서버로 옮기는 편이 더 단순하다.

`code-server`는 이 문제를 웹 접속 가능한 IDE로 푼다. 대신 브라우저 로그인만 통과하면 서버의 파일 시스템과 터미널에 접근할 수 있으므로, 설치 단계에서 바인딩 주소, 인증 방식, TLS, 프록시 계층을 함께 설계해야 한다.

## 2. 현재 나의 상태 (Baseline)

현재 문서는 다음 명령과 설정을 한 번에 나열하는 방식이었다.

- 설치 스크립트, Debian 패키지, npm, Docker 실행 예시가 섞여 있다.
- `bind-addr: 0.0.0.0:8080`처럼 외부 인터페이스에 바로 여는 예시가 기본 설정처럼 보인다.
- Nginx, Caddy, TLS, 방화벽, 확장 설치가 같은 중요도로 나열되어 있다.
- 어떤 구성에서 포트를 공개해도 되는지, 어떤 구성에서 반드시 로컬 바인딩을 유지해야 하는지가 분리되어 있지 않다.

이 상태에서는 설치는 따라 할 수 있지만, 원격 IDE를 안전하게 노출하는 운영 판단은 남는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 `code-server`를 다음 기준으로 운영하는 것이다.

- 기본 실행은 `127.0.0.1:8080`에만 바인딩한다.
- 외부 접속이 필요하면 HTTPS 리버스 프록시나 사설 네트워크를 앞단에 둔다.
- 인증을 끄는 구성은 별도 인증 계층이 검증된 경우에만 사용한다.
- 설정 파일, 확장 디렉터리, 작업 디렉터리의 소유권을 실행 사용자와 맞춘다.
- 장애가 발생하면 서비스 상태, 로그, 포트 점유, 프록시 WebSocket 설정을 순서대로 확인한다.

## 4. 시스템 번역 (Data Flow)

`code-server` 접속 흐름은 다음처럼 해석할 수 있다.

```text
브라우저
  -> HTTPS 리버스 프록시 또는 사설 네트워크
  -> code-server HTTP/WebSocket 포트
  -> 서버의 사용자 계정
  -> 작업 디렉터리, 확장, 터미널, Git, 런타임
```

이 흐름에서 리버스 프록시는 단순한 포트 전달이 아니다. TLS 종료, 호스트명 라우팅, WebSocket 업그레이드, 접속 로그, 추가 인증을 담당한다. `code-server`는 내부 개발 세션을 제공하고, 서버 접근 통제는 앞단 네트워크와 인증 정책이 함께 책임진다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인 지점 |
| --- | --- | --- |
| `code-server` 프로세스 | 브라우저 IDE 제공 | 실행 사용자, 포트, 설정 파일 |
| `~/.config/code-server/config.yaml` | 기본 바인딩과 인증 설정 | `bind-addr`, `auth`, `password`, `cert` |
| systemd 서비스 | 재부팅 후 자동 실행 | `code-server@$USER` 상태와 로그 |
| 리버스 프록시 | HTTPS와 WebSocket 전달 | `Upgrade`, `Connection`, `Host` 헤더 |
| Docker 볼륨 | 설정과 프로젝트 유지 | `/home/coder/.config`, `/home/coder/project` |
| 확장 디렉터리 | 개발 플러그인 유지 | 설치 위치와 권한 |

기본 설정 파일은 보통 다음 형태로 시작한다.

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: change-this-password
cert: false
```

외부에서 바로 접속하려고 `bind-addr`를 `0.0.0.0`으로 바꾸기 전에, 먼저 HTTPS 프록시나 VPN 경계를 정해야 한다.

## 6. 상태 전이 (State Transition)

`code-server` 운영 상태는 다음 순서로 이동한다.

```text
미설치
  -> 설치됨
  -> 로컬 포트에서 실행됨
  -> 인증 설정 확인됨
  -> 프록시 또는 사설망 뒤에 배치됨
  -> 확장과 프로젝트 볼륨이 유지됨
  -> 로그와 재시작 절차가 검증됨
```

각 상태에서 다음 상태로 넘어가기 전에 확인해야 할 조건이 있다.

- 설치됨: `code-server --version`이 성공해야 한다.
- 로컬 실행됨: `curl http://127.0.0.1:8080` 또는 브라우저 접속이 가능해야 한다.
- 인증 확인됨: 비밀번호가 임시값이 아니고 설정 파일 권한이 제한되어야 한다.
- 프록시 배치됨: WebSocket 연결이 끊기지 않아야 한다.
- 운영 검증됨: `systemctl`과 `journalctl`로 상태를 확인할 수 있어야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `auth: none`은 앞단 인증이 없는 공개 네트워크에서 사용하지 않는다.
- `0.0.0.0` 바인딩은 방화벽, TLS, 인증 경계가 준비된 뒤에만 사용한다.
- 설정 파일에는 공유 저장소에 올릴 비밀번호를 남기지 않는다.
- 컨테이너 실행 시 설정과 프로젝트 볼륨을 분리해 재시작 후에도 상태가 보존되게 한다.
- 리버스 프록시는 WebSocket 업그레이드 헤더를 전달해야 한다.
- 작업 디렉터리와 설정 디렉터리의 소유권은 `code-server` 실행 사용자와 맞춘다.

## 8. 가장 작은 예제 (Minimal Viable Example)

가장 작은 안전한 설치 흐름은 로컬 바인딩으로 시작하는 것이다.

```bash
curl -fsSL https://code-server.dev/install.sh | sh -s -- --dry-run
curl -fsSL https://code-server.dev/install.sh | sh
sudo systemctl enable --now code-server@$USER
systemctl status code-server@$USER
```

설정 파일을 확인한다.

```bash
sed -n '1,120p' ~/.config/code-server/config.yaml
chmod 700 ~/.config/code-server
chmod 600 ~/.config/code-server/config.yaml
```

Docker로 격리해서 실행할 때는 호스트의 루프백 주소에만 먼저 바인딩한다.

```bash
mkdir -p ~/.config
docker run -it --name code-server \
  -p 127.0.0.1:8080:8080 \
  -v "$HOME/.local:/home/coder/.local" \
  -v "$HOME/.config:/home/coder/.config" \
  -v "$PWD:/home/coder/project" \
  -u "$(id -u):$(id -g)" \
  -e "DOCKER_USER=$USER" \
  codercom/code-server:latest
```

Nginx 뒤에 둘 때는 WebSocket 업그레이드를 전달한다.

```nginx
server {
    listen 443 ssl http2;
    server_name code.example.com;

    ssl_certificate /etc/letsencrypt/live/code.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/code.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

확장은 명령줄에서 설치할 수 있다.

```bash
code-server --install-extension ms-python.python
code-server --install-extension esbenp.prettier-vscode
code-server --list-extensions
```

## 9. 실패 사례 (What could go wrong?)

가장 흔한 실패는 접속 경계를 잘못 잡는 것이다. `bind-addr: 0.0.0.0:8080`으로 열고 방화벽도 허용하면, 비밀번호 하나가 서버 전체 개발 환경의 유일한 방어선이 된다.

두 번째 실패는 프록시가 WebSocket을 전달하지 않는 경우다. 첫 화면은 열리지만 터미널, 파일 감시, 확장 동작이 끊기거나 반복 재연결된다. 이때는 Nginx의 `Upgrade`와 `Connection` 헤더, Caddy의 `reverse_proxy`, 프록시 타임아웃을 확인한다.

세 번째 실패는 권한 불일치다. Docker에서 루트로 파일을 만들거나, systemd 서비스 사용자가 작업 디렉터리를 쓸 수 없으면 확장 설치와 Git 작업이 실패한다.

네 번째 실패는 설정 파일을 공유 저장소에 포함하는 것이다. `password` 값이 들어 있는 `config.yaml`은 개인 설정으로 취급하고, 재현 가능한 배포 문서에는 값 대신 생성 방법만 남긴다.

## 10. 뇌 확장하기 (Evolution & Variants)

소규모 개인 환경에서는 `127.0.0.1` 바인딩과 SSH 터널, Tailscale 같은 사설 네트워크 조합이 단순하다.

팀 환경에서는 리버스 프록시 앞단에 SSO, 접근 로그, IP 제한, 장치 정책을 추가하는 편이 낫다. 이때 `code-server`의 내장 비밀번호 인증만으로 권한 관리를 끝내지 말고, 계정 수명주기와 감사 로그를 별도로 설계한다.

컨테이너 환경에서는 프로젝트 볼륨, 확장 캐시, 사용자 ID 매핑을 명시한다. Kubernetes나 Helm으로 옮길 때는 PersistentVolume, Ingress, Secret, ResourceLimit을 함께 설계해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `code-server --version`으로 설치를 확인했다.
- [ ] 기본 접속은 `127.0.0.1:8080`에서 시작했다.
- [ ] 외부 공개 전 HTTPS 프록시 또는 사설망 경계를 정했다.
- [ ] `auth: none`을 사용할 경우 앞단 인증을 별도로 검증했다.
- [ ] 설정 파일 권한을 제한했고 비밀번호를 공유 저장소에 올리지 않았다.
- [ ] systemd 또는 컨테이너 재시작 후에도 설정과 프로젝트가 유지된다.
- [ ] WebSocket 프록시 헤더와 타임아웃을 확인했다.
- [ ] 장애 시 `systemctl status`, `journalctl`, 포트 점유 확인 절차를 실행할 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

`code-server`는 브라우저로 여는 편집기가 아니라, 서버의 개발 권한을 웹으로 노출하는 시스템이다. 먼저 `__________`에만 바인딩하고, 외부 접속은 `__________` 또는 `__________` 뒤에 둔다. 인증을 끄는 설정은 앞단의 `__________`이 검증된 경우에만 허용한다.
