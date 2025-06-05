목차
Vaultwarden Docker Compose 설정 (보안 강화)
docker-compose.yml 파일 예시
주요 환경 변수 설명
Nginx 리버스 프록시 설정
리버스 프록시 사용 이유
Nginx 설치 (기본)
Vaultwarden용 Nginx 설정 파일 예시
HTTP 요청을 HTTPS로 리디렉션
SSL/TLS 설정 (보안 헤더 포함)
웹소켓 지원 설정
SSL/TLS 인증서 관리 및 적용
A. 공개 서버용: Let's Encrypt 와 Certbot 사용 (Cloudflare DNS)
Certbot 및 Cloudflare 플러그인 설치
Cloudflare API 인증 정보 준비
와일드카드 인증서 발급 명령
Nginx에 인증서 적용
자동 갱신
B. 로컬 네트워크용: 자체 서명 인증서와 Rocket TLS 직접 사용
자체 서명 인증서 사용 이유 및 주의사항
OpenSSL을 이용한 자체 서명 PEM 인증서 생성
Vaultwarden Docker Compose에 자체 서명 인증서 적용 (Rocket TLS)
클라이언트에서 자체 서명 인증서 신뢰 설정
C. 로컬 네트워크용: 자체 서명 인증서와 Nginx 리버스 프록시 사용
Nginx에 자체 서명 인증서 적용
중요 고려 사항
데이터베이스 정기 백업
시스템 및 Vaultwarden 업데이트
2단계 인증(2FA) 활성화 (사용자 레벨)
부록: .env 파일 예시
1. Vaultwarden Docker Compose 설정 (보안 강화)
안정적이고 보안이 강화된 Vaultwarden 운영을 위한 docker-compose.yml 설정입니다.
docker-compose.yml 파일 예시
version: '3.8' # 최신 안정 버전 명시 권장

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    environment:
      # --- 기본 및 필수 설정 ---
      # 도메인 설정 (HTTPS 필수) - 실제 사용하시는 도메인으로 변경하세요.
      # 예: DOMAIN: https://vault.example.com
      # 이 값은 클라이언트가 Vaultwarden에 접속하는 전체 URL이어야 합니다.
      DOMAIN: ${DOMAIN} # .env 파일에서 관리 권장

      # 웹소켓 활성화 (클라이언트 실시간 동기화 개선)
      WEBSOCKET_ENABLED: "true" 

      # --- 보안 강화 설정 ---
      # 신규 사용자 직접 가입 비활성화 (관리자만 사용자 추가 가능)
      SIGNUPS_ALLOWED: "false"
      # 관리자 페이지 접근 토큰 비활성화 (초기 설정 후 또는 사용하지 않을 경우 권장)
      # 관리자 페이지가 필요하면 이 값을 "false"로 하고 ADMIN_TOKEN을 설정하세요.
      DISABLE_ADMIN_TOKEN: "true" 
      # ADMIN_TOKEN: "${ADMIN_TOKEN}" # .env 파일에서 관리 권장 (DISABLE_ADMIN_TOKEN이 false일 경우)
      
      # 사용자 초대 기능 활성화 여부 (SIGNUPS_ALLOWED가 false일 때 사용)
      INVITATIONS_ALLOWED: "true" # 필요에 따라 false로 변경

      # 로그인 페이지 비밀번호 힌트 표시 비활성화
      SHOW_PASSWORD_HINT: "false"

      # 외부 아이콘 다운로드 비활성화 (SSRF 공격 방지)
      DISABLE_ICON_DOWNLOAD: "true"
      # 또는 타임아웃을 짧게 설정:
      # ICON_DOWNLOAD_TIMEOUT: "5" # 5초 (예시)
      # ICON_CACHE_TTL: "2592000" # 아이콘 캐시 유지 시간 (초 단위, 예: 30일)

      # 비밀번호 정책 (선택 사항) - 필요에 따라 주석 해제 및 값 조정
      # PASSWORD_MIN_LENGTH: "12"
      # PASSWORD_MIN_UPPERCASE: "1"
      # PASSWORD_MIN_LOWERCASE: "1"
      # PASSWORD_MIN_DIGITS: "1"
      # PASSWORD_MIN_SPECIAL: "1"

      # --- 로컬 네트워크용 Rocket 자체 TLS 설정 (시나리오 3-B 에서 사용) ---
      # ROCKET_TLS_ENABLED: "false" # 기본값. true로 변경 시 아래 설정 필요
      # ROCKET_TLS: "{certs=\"/ssl/cert.pem\",key=\"/ssl/key.pem\"}" # 컨테이너 내부 경로
      # 이 경우, volumes에 SSL 인증서 마운트 필요 및 ports에 HTTPS 포트 노출 필요

      # --- 기타 설정 ---
      # 대용량 첨부파일 허용 (단위: 바이트, 예: 10MB = 10 * 1024 * 1024)
      ROCKET_LIMITS: "{json=10485760,data-form=52428800}" # JSON 10MB, 폼 데이터(첨부파일) 50MB
      
      # 로그 레벨 설정 (문제 해결 시 유용, 평상시에는 info 또는 warn)
      LOG_LEVEL: "warn" # (trace, debug, info, warn, error, off)
      # LOG_FILE: "/data/vaultwarden.log" # 로그 파일 경로 (컨테이너 내부)

      # 시간대 설정 (선택 사항, 로그 시간 등에 영향)
      TZ: "${TZ:-Asia/Seoul}" # .env 파일에서 관리 권장, 기본값 Asia/Seoul

    volumes:
      # Vaultwarden 데이터 영속화 (db.sqlite3, attachments, rsa_key.pem 등 저장)
      # $PWD는 docker-compose.yml 파일이 위치한 현재 디렉토리를 의미합니다.
      # 실제 데이터 저장 경로로 적절히 변경하여 사용하세요.
      # 예: /srv/docker/vaultwarden/data:/data/
      - ${VW_DATA_PATH:-./vaultwarden/data}:/data/ # .env 파일에서 VW_DATA_PATH 관리 권장
      # --- 로컬 네트워크용 Rocket 자체 TLS 설정 시 인증서 마운트 (시나리오 3-B 에서 사용) ---
      # - ${VW_SSL_PATH:-./ssl}:/ssl:ro # .env 파일에서 VW_SSL_PATH 관리 권장, 읽기 전용(ro)

    ports:
      # 호스트 포트:컨테이너 포트
      # 예: 8180:80 (호스트의 8180 포트를 컨테이너의 80 포트로 연결)
      # 리버스 프록시를 사용할 경우, 이 포트는 외부로 직접 노출되지 않아도 됩니다 (Docker 네트워크 내부에서만 접근).
      # - "${VAULTWARDEN_HTTP_PORT:-127.0.0.1:8180}:80" # .env에서 관리, 로컬호스트에서만 접근 가능하게
      - "${VAULTWARDEN_HTTP_PORT}:80" # .env 파일에서 VAULTWARDEN_HTTP_PORT 관리 권장

      # --- 로컬 네트워크용 Rocket 자체 TLS 설정 시 HTTPS 포트 노출 (시나리오 3-B 에서 사용) ---
      # Vaultwarden이 ROCKET_TLS_ENABLED=true 로 직접 HTTPS를 서비스할 경우,
      # 내부적으로 기본 8000 포트를 사용합니다. (ROCKET_PORT_TLS 로 변경 가능)
      # - "${VAULTWARDEN_HTTPS_PORT:-8443}:8000" # .env에서 관리

      # 웹소켓은 기본적으로 HTTP 포트(80)를 통해 /notifications/hub 경로로 접근하며,
      # 리버스 프록시에서 웹소켓 업그레이드를 처리합니다.
      # Vaultwarden은 WEBSOCKET_PORT(기본 3012)를 내부적으로 사용할 수 있지만,
      # 대부분 리버스 프록시를 통하므로 직접 노출할 필요는 없습니다.

    networks:
      # 이 네트워크는 Nginx 리버스 프록시 컨테이너와 공유되어야 합니다.
      vaultwarden_net: {}

networks:
  vaultwarden_net:
    driver: bridge
    name: vaultwarden_net # 네트워크 이름 명시적 지정 (선택 사항)



주요 환경 변수 설명
DOMAIN: Vaultwarden에 접속할 전체 URL (예: https://vault.example.com). HTTPS를 사용해야 합니다.
WEBSOCKET_ENABLED: true로 설정하여 클라이언트와 실시간 동기화 기능을 활성화합니다.
SIGNUPS_ALLOWED: false로 설정하여 임의의 사용자가 가입하는 것을 막습니다.
DISABLE_ADMIN_TOKEN: true로 설정하여 관리자 페이지 접근을 비활성화합니다 (초기 설정 완료 후 권장). 관리자 페이지가 필요하면 false로 변경하고 ADMIN_TOKEN을 설정하세요.
ADMIN_TOKEN: DISABLE_ADMIN_TOKEN이 false일 때 관리자 페이지에 접근하기 위한 매우 강력한 비밀 토큰입니다.
INVITATIONS_ALLOWED: SIGNUPS_ALLOWED가 false일 때, 관리자가 사용자를 초대하여 가입시킬 수 있도록 합니다.
SHOW_PASSWORD_HINT: false로 설정하여 로그인 페이지의 비밀번호 힌트 표시를 비활성화합니다.
DISABLE_ICON_DOWNLOAD: true로 설정하여 외부 웹사이트 아이콘 다운로드를 비활성화하여 SSRF 공격 위험을 줄입니다.
ROCKET_LIMITS: JSON 요청 및 폼 데이터(첨부파일)의 크기 제한을 설정합니다.
LOG_LEVEL: 로그 상세 수준을 조절합니다 (예: warn, info, debug).
TZ: 컨테이너의 시간대를 설정합니다.
ROCKET_TLS_ENABLED / ROCKET_TLS: Vaultwarden이 직접 HTTPS를 서비스하도록 설정할 때 사용합니다 (시나리오 3-B).
${VARIABLE:-default_value}: 환경 변수가 .env 파일 등에서 제공되지 않았을 경우 기본값을 사용하도록 하는 문법입니다.
2. Nginx 리버스 프록시 설정
Vaultwarden 앞에 Nginx와 같은 리버스 프록시를 두는 것은 SSL/TLS 종료, 요청 로깅, 캐싱, 보안 헤더 추가 등 다양한 이점을 제공합니다.
리버스 프록시 사용 이유
SSL/TLS 종료: Nginx에서 HTTPS 연결을 처리하고, 내부적으로 Vaultwarden과는 HTTP로 통신할 수 있어 설정이 간편해집니다.
보안 강화: 다양한 보안 헤더(HSTS, CSP, X-Frame-Options 등)를 쉽게 추가할 수 있습니다.
유연성: 여러 웹 서비스를 동일한 IP와 포트에서 호스팅할 수 있습니다.
성능: 정적 파일 캐싱, 로드 밸런싱(필요시) 등을 통해 성능을 향상시킬 수 있습니다.
Nginx 설치 (기본)
사용 중인 운영체제에 맞게 Nginx를 설치합니다.
Debian/Ubuntu 계열:
sudo apt update
sudo apt install nginx


RHEL/CentOS 계열:
sudo dnf install nginx # 또는 sudo yum install nginx

설치 후 sudo systemctl enable --now nginx로 서비스 시작 및 자동 실행을 설정합니다.
Vaultwarden용 Nginx 설정 파일 예시
/etc/nginx/sites-available/vault.example.com.conf (또는 유사한 경로)에 다음 내용으로 파일을 생성합니다. (vault.example.com은 실제 도메인으로 변경)
# /etc/nginx/sites-available/vault.example.com.conf

# --- HTTP에서 HTTPS로 자동 리디렉션 ---
server {
    listen 80;
    listen [::]:80; # IPv6 리스닝
    server_name vault.example.com; # 실제 도메인으로 변경

    # Let's Encrypt ACME challenge를 위한 경로 허용 (HTTP-01 방식 사용 시)
    location /.well-known/acme-challenge/ {
        root /var/www/html; # 또는 Certbot이 사용하는 경로
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# --- HTTPS 서버 설정 ---
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2; # IPv6 리스닝
    server_name vault.example.com; # 실제 도메인으로 변경

    # --- SSL 인증서 경로 (아래 3-A 또는 3-C 시나리오에서 생성된 경로 사용) ---
    ssl_certificate /etc/letsencrypt/live/vault.example.com/fullchain.pem; # Certbot 사용 시
    ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem; # Certbot 사용 시
    # 또는 자체 서명 인증서 사용 시 (시나리오 3-C):
    # ssl_certificate /etc/nginx/ssl/vaultwarden/cert.pem;
    # ssl_certificate_key /etc/nginx/ssl/vaultwarden/key.pem;

    # --- SSL 보안 강화 설정 ---
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off; # 클라이언트의 Cipher Suite 우선순위를 존중할 수 있음 (또는 on으로 설정)
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m; # 10MB 캐시
    ssl_session_tickets off; # 보안을 위해 Forward Secrecy에 영향을 줄 수 있는 세션 티켓 비활성화 권장
    ssl_stapling on; # OCSP 스테이플링 활성화
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s; # DNS 리졸버 (Google DNS 예시)
    resolver_timeout 5s;

    # Diffie-Hellman 파라미터 (미리 생성 필요: openssl dhparam -out /etc/nginx/dhparam.pem 2048)
    # ssl_dhparam /etc/nginx/dhparam.pem;

    # --- 보안 헤더 ---
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # Content-Security-Policy는 매우 강력하지만, 잘못 설정하면 사이트가 깨질 수 있으므로 신중하게 설정합니다.
    # Vaultwarden의 CSP는 비교적 복잡할 수 있으므로, 필요시 Vaultwarden 문서를 참고하여 설정하세요.
    # add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';" always;

    # 클라이언트 IP 주소 및 프로토콜 헤더 전달
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 버퍼링 및 타임아웃 설정 (필요에 따라 조절)
    client_max_body_size 55M; # 첨부파일 업로드 용량 (ROCKET_LIMITS의 data-form 보다 약간 크게)

    location / {
        # Vaultwarden 컨테이너의 HTTP 주소와 포트
        # Docker 네트워크 이름을 사용하여 vaultwarden 서비스에 접근 (docker-compose.yml의 포트 매핑과 일치해야 함)
        # 예: VAULTWARDEN_HTTP_PORT 환경변수가 8180 이라면
        # docker-compose.yml에서 ports: - "8180:80" 으로 설정되어 있고,
        # Vaultwarden 컨테이너는 vaultwarden_net 네트워크에 연결되어 있음.
        # 프록시 대상은 컨테이너 이름과 내부 포트(80)로 지정.
        proxy_pass http://vaultwarden:80; # 'vaultwarden'은 docker-compose.yml의 서비스 이름
    }

    # --- 웹소켓 지원 설정 ---
    location /notifications/hub {
        proxy_pass http://vaultwarden:80; # Vaultwarden 서비스 이름과 내부 HTTP 포트
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 관리자 페이지 접근 제한 (선택 사항, IP 기반)
    # location /admin {
    #     allow 192.168.1.100; # 허용할 IP
    #     deny all; # 나머지 모두 거부
    #     proxy_pass http://vaultwarden:80; # Vaultwarden 서비스 이름과 내부 HTTP 포트
    # }
}


설정 적용:
생성한 설정 파일을 sites-enabled 디렉터리에 심볼릭 링크합니다.
sudo ln -s /etc/nginx/sites-available/vault.example.com.conf /etc/nginx/sites-enabled/


Nginx 설정에 오류가 없는지 테스트합니다.
sudo nginx -t


오류가 없으면 Nginx를 다시 시작하거나 설정을 리로드합니다.
sudo systemctl restart nginx # 또는 sudo systemctl reload nginx


3. SSL/TLS 인증서 관리 및 적용
A. 공개 서버용: Let's Encrypt 와 Certbot 사용 (Cloudflare DNS)
공개적으로 접근 가능한 서버의 경우, Let's Encrypt를 통해 무료 SSL 인증서를 발급받고 Certbot으로 자동 갱신하는 것이 좋습니다. Cloudflare DNS 플러그인을 사용하면 와일드카드 인증서 발급 및 갱신이 매우 편리합니다.
(상세한 Certbot + Cloudflare 설정은 이전 Canvas "Certbot과 Cloudflare로 와일드카드 SSL 인증서 발급 가이드"를 참고하세요. 여기서는 주요 단계만 요약합니다.)
Certbot 및 Cloudflare DNS 플러그인 설치:
sudo apt update # 또는 dnf update
sudo apt install certbot python3-certbot-dns-cloudflare # Debian/Ubuntu
# 또는 sudo dnf install certbot python3-certbot-dns-cloudflare # RHEL/CentOS


Cloudflare API 인증 정보 파일 준비:
Cloudflare에서 "Edit zone DNS" 권한을 가진 API 토큰을 생성합니다.
/etc/letsencrypt/cloudflare.ini (또는 다른 안전한 경로) 파일을 만들고 토큰을 저장합니다.
# /etc/letsencrypt/cloudflare.ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN


파일 권한을 600으로 설정합니다: sudo chmod 600 /etc/letsencrypt/cloudflare.ini
와일드카드 인증서 발급 명령: (vault.example.com과 이메일 주소는 실제 정보로 변경)
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d vault.example.com \
    -d "*.vault.example.com" \
    --agree-tos \
    --email your-email@example.com \
    --rsa-key-size 4096


Nginx에 인증서 적용:
위의 Nginx 설정 파일 (/etc/nginx/sites-available/vault.example.com.conf)에서 다음 부분을 확인하고 경로가 올바른지 확인합니다.
ssl_certificate /etc/letsencrypt/live/vault.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/vault.example.com/privkey.pem;

Nginx를 재시작합니다: sudo systemctl restart nginx
자동 갱신:
Certbot은 보통 자동으로 갱신 스케줄(cron 또는 systemd timer)을 설정합니다. sudo certbot renew --dry-run으로 테스트할 수 있습니다.
B. 로컬 네트워크용: 자체 서명 인증서와 Rocket TLS 직접 사용
이 방법은 Vaultwarden 컨테이너가 직접 HTTPS 요청을 처리하도록 하는 고급 설정이며, 리버스 프록시를 사용하지 않는 경우에 해당합니다. 클라이언트에서 해당 인증서를 신뢰하도록 추가 작업이 필요하며, 일반적으로 리버스 프록시를 사용하는 것이 권장됩니다.
Vaultwarden은 ROCKET_TLS_ENABLED=true 와 ROCKET_TLS 환경 변수를 통해 자체적으로 TLS를 서비스할 수 있습니다.
자체 서명 인증서 사용 이유 및 주의사항:
이유: 외부에서 접근할 수 없는 순수 내부망에서 HTTPS를 사용하고 싶을 때, 공인 인증서 발급이 번거롭거나 불가능한 경우 사용합니다.
주의사항: 자체 서명 인증서는 공인 CA에서 발급한 것이 아니므로, 클라이언트(웹 브라우저, 모바일 앱 등)에서 기본적으로 신뢰하지 않습니다. 각 클라이언트 기기에 해당 CA 인증서(또는 서버 인증서)를 수동으로 설치하고 신뢰하도록 설정해야 "안전하지 않음" 경고 없이 접속할 수 있습니다. 이 과정이 번거로울 수 있습니다.
OpenSSL을 이용한 자체 서명 PEM 인증서 생성:
서버에 OpenSSL이 설치되어 있어야 합니다.
# 인증서 저장 디렉터리 생성 (예시)
mkdir -p ./ssl_certs
cd ./ssl_certs

# 1. 개인 키(Private Key) 생성
openssl genrsa -out key.pem 2048

# 2. 인증서 서명 요청(CSR - Certificate Signing Request) 생성
# Common Name (CN)에는 접속할 호스트 이름(예: vaultwarden.local 또는 내부 IP)을 입력합니다.
openssl req -new -key key.pem -out csr.pem

# 3. 자체 서명된 인증서(Self-Signed Certificate) 생성 (예: 3650일 유효)
openssl x509 -req -days 3650 -in csr.pem -signkey key.pem -out cert.pem

# 이제 key.pem (개인 키)과 cert.pem (인증서) 파일이 생성되었습니다.
# 이 파일들을 Docker 볼륨을 통해 Vaultwarden 컨테이너에 전달해야 합니다.
cd ..


Vaultwarden Docker Compose에 자체 서명 인증서 적용 (Rocket TLS):
docker-compose.yml 파일을 다음과 같이 수정합니다.
# ... (services.vaultwarden.environment 부분) ...
environment:
  DOMAIN: https://vaultwarden.local # 또는 내부 IP (예: https://192.168.1.10)
  # ... 기타 환경 변수 ...
  ROCKET_TLS_ENABLED: "true"
  ROCKET_TLS: "{certs=\"/ssl/cert.pem\",key=\"/ssl/key.pem\"}"
  # ROCKET_PORT_TLS: "8000" # Vaultwarden이 HTTPS를 리스닝할 내부 포트 (기본값 8000)

# ... (services.vaultwarden.volumes 부분) ...
volumes:
  - ${VW_DATA_PATH:-./vaultwarden/data}:/data/
  # 생성한 SSL 인증서와 개인키를 컨테이너 내부 /ssl 디렉터리에 마운트
  - ./ssl_certs:/ssl:ro # 읽기 전용으로 마운트

# ... (services.vaultwarden.ports 부분) ...
ports:
  # Vaultwarden이 직접 HTTPS를 서비스하므로 호스트의 HTTPS 포트를 컨테이너의 ROCKET_PORT_TLS로 연결
  # 예: 호스트의 8443 포트를 컨테이너의 8000 포트(HTTPS)로 연결
  - "${VAULTWARDEN_HTTPS_PORT:-8443}:8000" # .env에서 관리
  # HTTP 포트는 사용하지 않거나, HTTPS로 리디렉션하도록 설정할 수 있음 (Rocket 자체 기능은 아님)
  # - "${VAULTWARDEN_HTTP_PORT:-8080}:80" # 주석 처리 또는 삭제


${VW_DATA_PATH...} 와 같은 변수는 .env 파일에서 관리하는 것이 좋습니다.
./ssl_certs는 위에서 cert.pem과 key.pem을 생성한 실제 호스트 경로입니다.
컨테이너를 다시 시작합니다: docker-compose down && docker-compose up -d
클라이언트에서 자체 서명 인증서 신뢰 설정:
생성된 cert.pem (또는 별도의 CA 인증서를 사용했다면 그 CA 인증서) 파일을 각 클라이언트 기기(PC, 스마트폰)로 복사합니다.
각 운영체제의 인증서 관리 도구를 사용하여 해당 인증서를 "신뢰할 수 있는 루트 인증 기관" 또는 유사한 곳에 설치합니다. 이 과정은 운영체제 및 브라우저, 앱마다 다릅니다. (예: Windows의 certmgr.msc, macOS의 키체인 접근, Android/iOS의 설정 메뉴)
Bitwarden/Vaultwarden 모바일 앱이나 브라우저 확장에서 "서버 설정" 부분에 https://vaultwarden.local:8443 (또는 설정한 주소와 포트)을 입력하고 접속합니다.
C. 로컬 네트워크용: 자체 서명 인증서와 Nginx 리버스 프록시 사용
이 방법은 로컬 네트워크에서 HTTPS를 사용하되, SSL/TLS 처리는 Nginx 리버스 프록시에 맡기는 방식입니다. Vaultwarden 컨테이너는 HTTP로 실행됩니다.
자체 서명 PEM 인증서 생성: 위의 3-B-2 단계와 동일하게 key.pem과 cert.pem을 생성합니다.
Nginx에 자체 서명 인증서 적용:
Nginx 설정 파일 (/etc/nginx/sites-available/vault.local.conf 등)에서 SSL 인증서 경로를 생성한 자체 서명 인증서 파일 경로로 수정합니다.
Nginx가 해당 파일에 접근할 수 있도록 적절한 위치에 복사하거나 심볼릭 링크합니다. (예: /etc/nginx/ssl/vaultwarden/)
# /etc/nginx/sites-available/vault.local.conf
# ... (server 블록) ...
server {
    listen 443 ssl http2;
    server_name vaultwarden.local; # 또는 내부 IP

    ssl_certificate /etc/nginx/ssl/vaultwarden/cert.pem; # 생성한 cert.pem 경로
    ssl_certificate_key /etc/nginx/ssl/vaultwarden/key.pem; # 생성한 key.pem 경로

    # ... (기타 SSL 설정 및 location 설정은 위의 Nginx 예시 참고) ...

    location / {
        proxy_pass http://vaultwarden:80; # Vaultwarden 컨테이너의 HTTP
    }

    location /notifications/hub {
        proxy_pass http://vaultwarden:80;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

Nginx를 재시작합니다: sudo systemctl restart nginx
Vaultwarden Docker Compose 설정:
이 경우 Vaultwarden은 HTTP로만 실행되므로, docker-compose.yml 파일의 ROCKET_TLS_ENABLED 관련 설정은 필요 없습니다. DOMAIN 환경 변수는 Nginx에서 설정한 HTTPS URL(예: https://vaultwarden.local)로 설정합니다.
# ... (services.vaultwarden.environment 부분) ...
environment:
  DOMAIN: https://vaultwarden.local # Nginx에서 설정한 HTTPS 도메인
  WEBSOCKET_ENABLED: "true"
  # ... (기타 보안 설정은 1번 항목 참고) ...
# ... (volumes, ports, networks는 1번 항목 참고, HTTP 포트만 사용) ...
ports:
  - "${VAULTWARDEN_HTTP_PORT}:80" # Nginx가 이 포트로 Vaultwarden에 접근


클라이언트에서 자체 서명 인증서 신뢰 설정:
위의 3-B-4 단계와 동일하게, Nginx에 사용된 자체 서명 인증서(cert.pem 또는 해당 CA 인증서)를 클라이언트에 설치하고 신뢰하도록 설정해야 합니다.
4. 중요 고려 사항
데이터베이스 정기 백업:
Vaultwarden의 모든 데이터는 마운트된 볼륨 (${VW_DATA_PATH:-./vaultwarden/data})에 저장됩니다. 이 디렉터리(db.sqlite3, attachments/, rsa_key.pem, config.json 등)를 반드시 정기적으로 외부 저장소에 백업해야 합니다. Docker 컨테이너나 서버에 문제가 생겼을 때 데이터를 복구할 수 있는 유일한 방법입니다. rsync, restic, borgbackup 등의 도구나 간단한 tar 압축 스크립트를 사용할 수 있습니다.
시스템 및 Vaultwarden 업데이트:
vaultwarden/server:latest 이미지를 사용하므로, docker-compose pull vaultwarden (또는 docker pull vaultwarden/server:latest) 명령으로 이미지를 주기적으로 업데이트하고, docker-compose down && docker-compose up -d로 컨테이너를 재시작하여 최신 버전으로 유지하세요.
호스트 운영체제, Nginx, Certbot 등 모든 관련 소프트웨어도 정기적으로 업데이트하여 보안 취약점을 패치해야 합니다.
2단계 인증(2FA) 활성화 (사용자 레벨):
모든 Vaultwarden 사용자는 자신의 계정에 2단계 인증(TOTP 권장)을 반드시 활성화하도록 안내하고 권장해야 합니다. 이는 마스터 비밀번호가 유출되더라도 계정을 보호하는 매우 중요한 보안 계층입니다.
5. 부록: .env 파일 예시
docker-compose.yml 파일과 같은 디렉터리에 .env 파일을 만들어 환경 변수를 관리하면 편리하고 안전합니다.
# .env 파일 예시

# --- Vaultwarden Docker Compose 용 변수 ---
# DOMAIN: Vaultwarden 접속 전체 URL (HTTPS)
DOMAIN=https://vault.example.com

# VAULTWARDEN_HTTP_PORT: 호스트에서 Vaultwarden HTTP 서비스에 매핑할 포트
# 예: 127.0.0.1:8180 (로컬호스트에서만 접근 가능한 8180 포트)
# 또는 그냥 8180 (모든 인터페이스에서 8180 포트)
VAULTWARDEN_HTTP_PORT=127.0.0.1:8180

# VW_DATA_PATH: Vaultwarden 데이터가 저장될 호스트 경로
VW_DATA_PATH=/srv/docker/vaultwarden/data

# ADMIN_TOKEN: 관리자 페이지 접근 토큰 (DISABLE_ADMIN_TOKEN=false 일 경우)
# 매우 강력하고 무작위적인 문자열로 설정하세요.
# ADMIN_TOKEN=your_very_strong_and_random_admin_token_here

# TZ: 컨테이너 시간대
TZ=Asia/Seoul

# --- 로컬 네트워크용 Rocket 자체 TLS 설정 시 사용 (시나리오 3-B) ---
# VAULTWARDEN_HTTPS_PORT: 호스트에서 Vaultwarden HTTPS 서비스에 매핑할 포트
# ROCKET_TLS_ENABLED=true 일 때 사용됩니다.
# VAULTWARDEN_HTTPS_PORT=8443

# VW_SSL_PATH: 자체 서명 인증서가 저장된 호스트 경로
# ROCKET_TLS_ENABLED=true 일 때 사용됩니다.
# VW_SSL_PATH=./ssl_certs


