# Code-Server 설치 및 설정 가이드

VS Code를 브라우저에서 사용할 수 있게 해주는 code-server 설치 및 설정 가이드입니다.

---

## 📋 개요

**code-server**는 VS Code를 원격 서버에서 실행하고 브라우저를 통해 접속할 수 있게 해주는 오픈소스 프로젝트입니다.

| 항목 | 내용 |
|------|------|
| **프로젝트** | [coder/code-server](https://github.com/coder/code-server) |
| **용도** | 원격 개발 환경 |
| **접속 방식** | 웹 브라우저 |
| **지원 OS** | Linux, macOS, Windows (WSL) |

### 장점

- 🌐 **어디서나 접속** - 브라우저만 있으면 개발 가능
- 💻 **서버 리소스 활용** - 로컬 PC 성능과 무관
- 🔄 **환경 일관성** - 동일한 개발 환경 유지
- 📱 **태블릿 지원** - iPad 등에서도 개발 가능

---

## 🚀 설치

### 방법 1: 공식 설치 스크립트 (권장)

```bash
# 자동 설치 스크립트 실행
curl -fsSL https://code-server.dev/install.sh | sh
```

이 스크립트는 자동으로:
- 시스템 감지 (Debian, Ubuntu, Fedora, Arch 등)
- 적절한 패키지 형식으로 설치
- systemd 서비스 파일 생성

### 방법 2: 수동 설치 (Debian/Ubuntu)

```bash
# 최신 릴리즈 다운로드
VERSION=$(curl -s https://api.github.com/repos/coder/code-server/releases/latest | grep tag_name | cut -d '"' -f 4)
wget "https://github.com/coder/code-server/releases/download/${VERSION}/code-server_${VERSION}_amd64.deb"

# 패키지 설치
sudo dpkg -i code-server_*.deb

# 의존성 해결
sudo apt-get install -f
```

### 방법 3: npm으로 설치

```bash
# 전역 설치
npm install -g code-server

# yarn 사용
yarn global add code-server
```

### 방법 4: Docker로 실행

```bash
# Docker 컨테이너 실행
docker run -it --name code-server \
  -p 8080:8080 \
  -v "$HOME/.config:/home/coder/.config" \
  -v "$HOME/projects:/home/coder/project" \
  -u "$(id -u):$(id -g)" \
  -e "DOCKER_USER=$USER" \
  codercom/code-server:latest
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  code-server:
    image: codercom/code-server:latest
    container_name: code-server
    ports:
      - "8080:8080"
    volumes:
      - ~/.config:/home/coder/.config
      - ~/projects:/home/coder/project
    environment:
      - DOCKER_USER=${USER}
    user: "${UID}:${GID}"
    restart: unless-stopped
```

---

## ⚙️ 설정

### 설정 파일 위치

```bash
~/.config/code-server/config.yaml
```

### 기본 설정

```yaml
# 바인딩 주소 (0.0.0.0은 모든 인터페이스)
bind-addr: 0.0.0.0:8080

# 인증 방식 (password 또는 none)
auth: password

# 접속 비밀번호
password: your-secure-password

# TLS 사용 여부
cert: false
```

### 고급 설정

```yaml
# 전체 설정 예시
bind-addr: 0.0.0.0:8443
auth: password
password: ${CODE_SERVER_PASSWORD}
cert: true
cert-key: ~/.config/code-server/key.pem
cert-host: code.example.com

# 프록시 도메인 (서브도메인 사용시)
proxy-domain: example.com

# 사용자 데이터 디렉토리
user-data-dir: ~/.local/share/code-server

# 확장 디렉토리
extensions-dir: ~/.local/share/code-server/extensions

# 비활성화 기능
disable-telemetry: true
disable-update-check: false
```

### 환경 변수로 설정

```bash
# .bashrc 또는 .zshrc에 추가
export CODE_SERVER_PASSWORD="your-password"
export CODE_SERVER_PORT=8080
```

---

## 🔧 서비스 관리

### Systemd 서비스 등록

```bash
# 서비스 활성화 및 시작
sudo systemctl enable --now code-server@$USER
```

### 서비스 명령어

```bash
# 서비스 상태 확인
sudo systemctl status code-server@$USER

# 서비스 시작
sudo systemctl start code-server@$USER

# 서비스 중지
sudo systemctl stop code-server@$USER

# 서비스 재시작
sudo systemctl restart code-server@$USER

# 서비스 비활성화
sudo systemctl disable code-server@$USER

# 로그 확인
journalctl -u code-server@$USER -f
```

### 서비스 목록 확인

```bash
# code-server 관련 서비스 모두 표시
sudo systemctl list-units code-server*
```

---

## 🌐 리버스 프록시 설정

### Nginx 설정

```nginx
server {
    listen 80;
    server_name code.example.com;
    return 301 https://$server_name$request_uri;
}

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
        
        # WebSocket 타임아웃
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Caddy 설정

```caddyfile
code.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

---

## 🔒 보안 설정

### TLS 인증서 설정

**Let's Encrypt 사용:**

```bash
# certbot 설치 (Ubuntu)
sudo apt install certbot

# 인증서 발급
sudo certbot certonly --standalone -d code.example.com

# config.yaml 수정
cert: /etc/letsencrypt/live/code.example.com/fullchain.pem
cert-key: /etc/letsencrypt/live/code.example.com/privkey.pem
```

**자체 서명 인증서:**

```bash
# 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ~/.config/code-server/key.pem \
  -out ~/.config/code-server/cert.pem

# config.yaml 수정
cert: ~/.config/code-server/cert.pem
cert-key: ~/.config/code-server/key.pem
```

### 방화벽 설정

```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

### Tailscale과 연동

```bash
# Tailscale 설치 후
# bind-addr을 localhost로 설정하고 Tailscale 통해서만 접속
bind-addr: 127.0.0.1:8080
```

---

## 🔌 확장 프로그램

### 명령줄로 확장 설치

```bash
# 확장 설치
code-server --install-extension ms-python.python
code-server --install-extension esbenp.prettier-vscode
code-server --install-extension dbaeumer.vscode-eslint

# 확장 목록 확인
code-server --list-extensions

# 확장 제거
code-server --uninstall-extension extension-id
```

### 권장 확장 목록

| 확장 | ID | 용도 |
|------|-----|------|
| Python | `ms-python.python` | Python 개발 |
| Prettier | `esbenp.prettier-vscode` | 코드 포맷팅 |
| ESLint | `dbaeumer.vscode-eslint` | JS/TS 린팅 |
| GitLens | `eamodio.gitlens` | Git 기능 강화 |
| Docker | `ms-azuretools.vscode-docker` | Docker 지원 |

---

## ❗ 문제 해결

### 일반적인 문제

**WebSocket 연결 오류:**

```bash
# Nginx에서 WebSocket 헤더 확인
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**권한 문제:**

```bash
# 설정 디렉토리 권한 확인
chmod 700 ~/.config/code-server
chmod 600 ~/.config/code-server/config.yaml
```

**포트 충돌:**

```bash
# 사용 중인 포트 확인
sudo lsof -i :8080
sudo netstat -tlnp | grep 8080

# 다른 포트로 변경
bind-addr: 0.0.0.0:8443
```

### 로그 확인

```bash
# systemd 로그
journalctl -u code-server@$USER -f

# 수동 실행으로 디버깅
code-server --verbose
```

---

## 🔗 관련 문서

- [VS Code 플러그인 가이드](vscode-plugins.md)
- [Docker 설치](../docker/installation.md)
- [Nginx 설정](../../nginx/configuration.md)
- [SSH 설정](../../security/ssh/configuration.md)

---

## 📚 참고 자료

- [공식 문서](https://coder.com/docs/code-server/latest)
- [GitHub 저장소](https://github.com/coder/code-server)
- [FAQ](https://coder.com/docs/code-server/latest/FAQ)

---

*code-server로 어디서나 VS Code를 사용하세요!*
