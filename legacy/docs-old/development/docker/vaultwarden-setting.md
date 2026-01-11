# vaultwarden + nginx + cerbot settings
---

# Vaultwarden Docker Compose 설정 (보안 강화)

## 목차
1. [Vaultwarden Docker Compose 설정 (보안 강화)](#vaultwarden-docker-compose-설정-보안-강화)
    - docker-compose.yml 파일 예시
    - 주요 환경 변수 설명
2. [Nginx 리버스 프록시 설정](#nginx-리버스-프록시-설정)
    - 리버스 프록시 사용 이유
    - Nginx 설치 (기본)
    - Vaultwarden용 Nginx 설정 파일 예시
3. [SSL/TLS 인증서 관리 및 적용](#ssltls-인증서-관리-및-적용)
    - A. 공개 서버용: Let's Encrypt 와 Certbot 사용 (Cloudflare DNS)
    - B. 로컬 네트워크용: 자체 서명 인증서와 Rocket TLS 직접 사용
    - C. 로컬 네트워크용: 자체 서명 인증서와 Nginx 리버스 프록시 사용
4. [중요 고려 사항](#중요-고려-사항)
5. [부록: .env 파일 예시](#부록-env-파일-예시)

---

## 1. Vaultwarden Docker Compose 설정 (보안 강화)

안정적이고 보안이 강화된 Vaultwarden 운영을 위한 `docker-compose.yml` 설정입니다.

### docker-compose.yml 파일 예시

```yaml
version: '3.8'

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    environment:
      # --- 기본 및 필수 설정 ---
      DOMAIN: ${DOMAIN}
      WEBSOCKET_ENABLED: "true"

      # --- 보안 강화 설정 ---
      SIGNUPS_ALLOWED: "false"
      DISABLE_ADMIN_TOKEN: "true"
      # ADMIN_TOKEN: "${ADMIN_TOKEN}"
      INVITATIONS_ALLOWED: "true"
      SHOW_PASSWORD_HINT: "false"
      DISABLE_ICON_DOWNLOAD: "true"
      # ICON_DOWNLOAD_TIMEOUT: "5"
      # ICON_CACHE_TTL: "2592000"
      # PASSWORD_MIN_LENGTH: "12"
      # PASSWORD_MIN_UPPERCASE: "1"
      # PASSWORD_MIN_LOWERCASE: "1"
      # PASSWORD_MIN_DIGITS: "1"
      # PASSWORD_MIN_SPECIAL: "1"

      # --- 로컬 네트워크용 Rocket 자체 TLS 설정 (시나리오 3-B) ---
      # ROCKET_TLS_ENABLED: "false"
      # ROCKET_TLS: "{certs=\"/ssl/cert.pem\",key=\"/ssl/key.pem\"}"

      # --- 기타 설정 ---
      ROCKET_LIMITS: "{json=10485760,data-form=52428800}"
      LOG_LEVEL: "warn"
      # LOG_FILE: "/data/vaultwarden.log"
      TZ: "${TZ:-Asia/Seoul}"

    volumes:
      - ${VW_DATA_PATH:-./vaultwarden/data}:/data/
      # - ${VW_SSL_PATH:-./ssl}:/ssl:ro

    ports:
      - "${VAULTWARDEN_HTTP_PORT}:80"
      # - "${VAULTWARDEN_HTTPS_PORT:-8443}:8000"

    networks:
      vaultwarden_net: {}

networks:
  vaultwarden_net:
    driver: bridge
    name: vaultwarden_net
```

---

### 주요 환경 변수 설명

- **DOMAIN**: Vaultwarden에 접속할 전체 URL (예: https://vault.example.com). 반드시 HTTPS 사용 권장.
- **WEBSOCKET_ENABLED**: `true`로 설정하여 클라이언트의 실시간 동기화 기능 활성화.
- **SIGNUPS_ALLOWED**: `false`로 설정 시 임의 가입 불가.
- **DISABLE_ADMIN_TOKEN**: `true`로 설정 시 관리자 페이지 비활성화(초기 설정 후 권장), 필요시 `false`로.
- **ADMIN_TOKEN**: 관리자 페이지 접근을 위한 비밀 토큰(`DISABLE_ADMIN_TOKEN`이 `false`일 때).
- **INVITATIONS_ALLOWED**: `SIGNUPS_ALLOWED`가 `false`일 때 관리자 초대 기능 허용.
- **SHOW_PASSWORD_HINT**: 로그인 페이지 비밀번호 힌트 비활성화.
- **DISABLE_ICON_DOWNLOAD**: 외부 아이콘 다운로드 비활성화로 SSRF 위험 감소.
- **ROCKET_LIMITS**: JSON/첨부파일 크기 제한 설정.
- **LOG_LEVEL**: 로그 레벨(warn, info, debug 등).
- **TZ**: 컨테이너 시간대.
- **ROCKET_TLS_ENABLED / ROCKET_TLS**: Vaultwarden이 직접 HTTPS 서비스하도록 할 때 사용(시나리오 3-B).
- `${VARIABLE:-default_value}`: 환경변수가 없을 때 기본값 사용.

---

## 2. Nginx 리버스 프록시 설정

Vaultwarden 앞에 Nginx 리버스 프록시를 두는 이유:

- **SSL/TLS 종료**: Nginx가 HTTPS 처리, 내부는 HTTP 통신으로 설정 단순화.
- **보안 강화**: HSTS, CSP 등 보안 헤더 추가.
- **유연성**: 여러 서비스 동일 IP/포트에서 운영 가능.
- **성능**: 정적 파일 캐싱, 로드밸런싱 등.

---

### Nginx 설치 (예시: Debian/Ubuntu)

```bash
sudo apt update
sudo apt install nginx
sudo systemctl enable --now nginx
```

---

### Vaultwarden용 Nginx 설정 파일 예시

`/etc/nginx/sites-available/vault.example.com.conf`

```nginx
# --- HTTP에서 HTTPS로 자동 리디렉션 ---
server {
    listen 80;
    listen [::]:80;
    server_name vault.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# --- HTTPS 서버 설정 ---
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vault.example.com;

    ssl_certificate /etc/letsencrypt/live/vault.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    # ssl_dhparam /etc/nginx/dhparam.pem;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # add_header Content-Security-Policy "...";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    client_max_body_size 55M;

    location / {
        proxy_pass http://vaultwarden:80;
    }

    location /notifications/hub {
        proxy_pass http://vaultwarden:80;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 설정 적용

```bash
sudo ln -s /etc/nginx/sites-available/vault.example.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 3. SSL/TLS 인증서 관리 및 적용

### A. 공개 서버용: Let's Encrypt + Certbot + Cloudflare DNS

1. Certbot 및 Cloudflare 플러그인 설치
    ```bash
    sudo apt install certbot python3-certbot-dns-cloudflare
    ```
2. Cloudflare API 토큰 준비 및 권한 설정 (600)
3. 와일드카드 인증서 발급
    ```bash
    sudo certbot certonly \
      --dns-cloudflare \
      --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
      -d vault.example.com \
      -d "*.vault.example.com" \
      --agree-tos \
      --email your-email@example.com \
      --rsa-key-size 4096
    ```
4. Nginx에 인증서 적용 (`ssl_certificate`, `ssl_certificate_key` 경로 확인)
5. 자동 갱신 (`sudo certbot renew --dry-run`)

---

### B. 로컬 네트워크용: 자체 서명 인증서 + Rocket TLS

1. 인증서 생성
    ```bash
    mkdir -p ./ssl_certs
    cd ./ssl_certs
    openssl genrsa -out key.pem 2048
    openssl req -new -key key.pem -out csr.pem
    openssl x509 -req -days 3650 -in csr.pem -signkey key.pem -out cert.pem
    cd ..
    ```
2. docker-compose에 적용
    - 환경 변수
      ```yaml
      ROCKET_TLS_ENABLED: "true"
      ROCKET_TLS: "{certs=\"/ssl/cert.pem\",key=\"/ssl/key.pem\"}"
      ```
    - 볼륨
      ```yaml
      - ./ssl_certs:/ssl:ro
      ```
    - 포트
      ```yaml
      - "${VAULTWARDEN_HTTPS_PORT:-8443}:8000"
      ```
3. 컨테이너 재시작  
    ```bash
    docker-compose down && docker-compose up -d
    ```
4. 클라이언트에 인증서 신뢰 등록

---

### C. 로컬 네트워크용: 자체 서명 인증서 + Nginx 리버스 프록시

- Nginx 설정의 인증서 경로를 생성한 cert.pem, key.pem으로 변경
- Vaultwarden은 HTTP로만 실행  
- 클라이언트에 인증서 신뢰 등록

---

## 4. 중요 고려 사항

- **데이터베이스 정기 백업**: `${VW_DATA_PATH:-./vaultwarden/data}` 내 모든 파일(특히 db.sqlite3 등) 정기 백업
- **시스템 및 Vaultwarden 업데이트**:  
  ```bash
  docker-compose pull vaultwarden
  docker-compose up -d
  ```
- **2단계 인증(2FA) 활성화**: 모든 사용자가 2FA 사용 권장

---

## 5. 부록: .env 파일 예시

```env
# DOMAIN: Vaultwarden 접속 전체 URL (HTTPS)
DOMAIN=https://vault.example.com

# VAULTWARDEN_HTTP_PORT: Vaultwarden HTTP 서비스 포트
VAULTWARDEN_HTTP_PORT=127.0.0.1:8180

# VW_DATA_PATH: Vaultwarden 데이터 저장 경로
VW_DATA_PATH=/srv/docker/vaultwarden/data

# ADMIN_TOKEN: 관리자 페이지 접근 토큰 (DISABLE_ADMIN_TOKEN=false 일 때)
# ADMIN_TOKEN=your_very_strong_and_random_admin_token_here

# TZ: 컨테이너 시간대
TZ=Asia/Seoul

# VAULTWARDEN_HTTPS_PORT: HTTPS 서비스 포트 (Rocket TLS용)
# VAULTWARDEN_HTTPS_PORT=8443

# VW_SSL_PATH: 자체 서명 인증서 경로 (Rocket TLS용)
# VW_SSL_PATH=./ssl_certs
```

---
