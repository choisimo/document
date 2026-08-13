# Nginx 설정 가이드: 기본 구성부터 운영 검증까지

## 서론

Nginx는 고성능 웹 서버, 리버스 프록시, 로드 밸런서, HTTP 캐시 등으로 널리 사용되는 오픈소스 소프트웨어입니다. 이벤트 기반 아키텍처를 통해 적은 리소스로 많은 동시 연결을 효율적으로 처리할 수 있어, 소규모 웹사이트부터 대규모 분산 시스템에 이르기까지 다양한 환경에서 핵심적인 역할을 수행합니다.

본 보고서는 Nginx의 다양한 설정 방법을 코드 예제 중심으로 심층적으로 다룹니다. 정적 파일 제공, 가상 호스트 설정, 리버스 프록시 구현, SSL/TLS 암호화와 같은 기본적인 구성부터 시작하여, 대규모 시스템에서 요구사항에 따라 선택하는 load-balancing 전략, 업스트림 서버 헬스 체크, 프록시 캐싱, 성능 최적화 기법을 상세히 설명합니다. 또한, 고급 기능인 로깅 시스템 커스터마이징, HTTP 헤더 및 본문 수정 방법(Lua 스크립트 활용 포함), 다양한 보안 설정(WAF 연동 포함)을 다룹니다. 마지막으로 Ansible을 이용한 Nginx 자동화 관리, Kafka와 같은 메시징 시스템과의 연동, 그리고 대규모 환경에서의 Nginx 운영 전략 및 모니터링 방안까지 포괄적으로 제시하여 Nginx를 효과적으로 활용하고자 하는 개발자와 시스템 관리자에게 실질적인 가이드라인을 제공하는 것을 목표로 합니다.

---

## 적용 범위와 운영 검증 기준

- **범위:** Nginx/OpenResty version과 build modules, OS 또는 image, worker·event model, TLS library, upstream protocol, DNS, cache storage와 deployment topology를 기록합니다.
- **전제:** 예제의 path, user, certificate, timeout, buffer, connection 수와 load-balancing 동작은 환경별 설정입니다. 설정 문법 성공과 production 적합성을 같은 의미로 보지 않습니다.
- **사실과 추론:** `nginx -T/-t`, access/error log, response·TLS 검사와 metrics는 근거이고, latency·resource 병목과 cache·load-balancer 효과는 부하 시험 전까지 가설입니다.
- **실패·완료:** syntax 외에도 upstream 실패, reload 중 연결, certificate 갱신, cache 오류, header spoofing, timeout, overload와 rollback을 시험합니다. canary에서 response·TLS·log·SLO가 기준을 만족한 뒤 단계적으로 반영해야 완료입니다.

---

## 1. Nginx 기본 설정

Nginx의 강력함은 유연하고 직관적인 설정 파일 구조에서 비롯됩니다. 주요 설정은 일반적으로 `/etc/nginx/nginx.conf` 파일과 `/etc/nginx/sites-available/` (또는 `/etc/nginx/conf.d/`) 디렉터리에 위치한 가상 호스트 설정 파일들을 통해 이루어집니다.

### 1.1. Nginx 설치 및 기본 명령어

Nginx 설치는 운영체제의 패키지 매니저를 사용하는 것이 일반적입니다.

**Ubuntu/Debian 시스템:**
```bash
sudo apt update
sudo apt install nginx
```

**CentOS/RHEL 시스템:**
```bash
sudo yum install epel-release
sudo yum install nginx
```

설치 후 Nginx 서비스를 관리하는 주요 명령어는 다음과 같습니다.

*   `sudo systemctl status nginx`: 서비스 상태 확인
*   `sudo systemctl start nginx`: 서비스 시작
*   `sudo systemctl stop nginx`: 서비스 중지
*   `sudo systemctl restart nginx`: 서비스 재시작
*   `sudo systemctl reload nginx` 또는 `nginx -s reload`: 설정 파일 리로드 (무중단)
*   `sudo nginx -t`: 설정 파일 문법 검사

> **Tip**: reload 전 `nginx -t`로 해당 binary와 include 경로의 문법을 검사합니다. 통과해도 upstream·certificate·권한·runtime 동작과 무중단 reload를 보장하지 않으므로 canary와 rollback을 함께 준비합니다.

### 1.2. Nginx 설정 파일 구조 및 주요 지시어

Nginx 설정 파일은 여러 **블록(contexts)**으로 구성되며, 각 블록은 특정 범위 내에서 **지시어(directives)**를 정의합니다.

**주요 블록:**
*   `main` (global): Nginx 전역 설정을 담당합니다. `user`, `worker_processes` 등이 여기에 해당합니다.
*   `events`: 연결 처리 방식을 정의합니다. `worker_connections` 지시어가 대표적입니다.
*   `http`: HTTP 관련 설정을 포함하며, 대부분의 웹 서버 기능이 이 블록 내에 정의됩니다. `server`, `upstream` 블록을 포함할 수 있습니다.
*   `server`: 가상 호스트를 정의합니다. `listen`, `server_name`, `root`, `location` 등의 지시어를 사용합니다.
*   `location`: 특정 URI 요청에 대한 처리 방식을 정의합니다.
*   `upstream`: 로드 밸런싱을 위한 백엔드 서버 그룹을 정의합니다.

**주요 지시어:**
*   `user`: Nginx 워커 프로세스가 실행될 시스템 사용자 및 그룹을 지정합니다. (예: `user www-data;`)
*   `worker_processes`: 워커 프로세스의 수를 지정합니다. `auto`로 설정하면 CPU 코어 수에 맞춰 자동 조절됩니다.
*   `pid`: 마스터 프로세스의 PID 파일 경로를 지정합니다.
*   `events { worker_connections 1024; }`: 각 워커 프로세스가 처리할 수 있는 최대 동시 연결 수를 설정합니다.
*   `http { ... }`: HTTP 서버 관련 설정을 위한 컨텍스트입니다.
*   `include /etc/nginx/mime.types;`: 파일 확장자에 따른 MIME 타입을 정의한 파일을 포함합니다.
*   `default_type application/octet-stream;`: MIME 타입을 알 수 없는 경우 기본값으로 설정합니다.
*   `access_log` 및 `error_log`: 접근 로그와 오류 로그 파일의 경로 및 로깅 레벨을 지정합니다.
*   설정 파일에서 주석은 `#` 기호로 시작하며, 각 지시어는 세미콜론(`;`)으로 끝나야 합니다. 문자열 값에 공백이나 특수문자가 포함된 경우 따옴표로 묶어야 합니다.

### 1.3. 정적 파일 제공

Nginx는 정적 파일(HTML, CSS, JavaScript, 이미지 등)을 매우 효율적으로 제공할 수 있습니다.

**root 지시어**: 특정 location 또는 server 블록 내에서 요청된 파일의 루트 디렉터리를 지정합니다. Nginx는 요청 URI를 root 지시어로 지정된 경로에 추가하여 파일 경로를 구성합니다.

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html; # / -> /var/www/html/index.html

    location /images/ {
        # 이 location 블록은 상위 server 블록의 root를 상속받음
        # /images/logo.png -> /var/www/html/images/logo.png
    }

    location /assets/ {
        root /var/www/my_app/static_files; # /assets/css/style.css -> /var/www/my_app/static_files/assets/css/style.css
    }
}
```

**alias 지시어**: location 블록에 지정된 URI 경로를 alias로 지정된 파일 시스템 경로로 매핑합니다. `root`와 달리, location의 URI 부분이 경로에서 제외되고 alias 경로로 대체됩니다.

```nginx
location /static/ {
    root /var/www/app/assets; # /static/img/logo.png -> /var/www/app/assets/static/img/logo.png
}

location /images/ {
    alias /var/www/data/images_repository/; # /images/pic.jpg -> /var/www/data/images_repository/pic.jpg
}
```

> **Note**: `root`는 location 경로가 파일 시스템 경로에 포함되는 반면, `alias`는 location 경로가 파일 시스템 경로에서 대체된다는 점이 핵심적인 차이입니다.

**index 지시어**: 디렉터리 URI가 요청되었을 때 Nginx가 찾을 기본 파일들을 순서대로 지정합니다.

```nginx
location / {
    root /data;
    index index.html index.htm index.php; # index.html -> index.htm -> index.php 순으로 검색
}
```

**try_files 지시어**: 지정된 순서대로 파일이나 디렉터리의 존재 여부를 확인하고, 존재하면 내부 리디렉션을 수행하거나 지정된 상태 코드를 반환합니다. 주로 SPA(Single Page Application) 라우팅 처리에 유용합니다.

```nginx
location / {
    root /var/www/my-spa-app;
    try_files $uri $uri/ /index.html; 
    # 1. 요청된 URI가 파일로 존재하면 해당 파일 제공
    # 2. 디렉터리로 존재하면 해당 디렉터리의 index 파일 제공 (index 지시어에 따라)
    # 3. 둘 다 없으면 /index.html로 내부 리디렉션
}
```

### 1.4. 가상 호스트 (서버 블록)

Nginx는 `server` 블록을 사용하여 단일 서버에서 여러 도메인 또는 서브도메인을 호스팅할 수 있습니다.

*   `listen`: Nginx가 해당 가상 호스트에 대한 연결을 수신할 IP 주소와 포트를 지정합니다.
*   `server_name`: 이 서버 블록이 응답할 도메인 이름을 지정합니다. 와일드카드나 정규 표현식을 사용할 수 있습니다.

**이름 기반 가상 호스트 예제:**

```nginx
# /etc/nginx/sites-available/example.com
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}

# /etc/nginx/sites-available/another-site.org
server {
    listen 80;
    server_name another-site.org www.another-site.org;
    root /var/www/another-site.org/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

설정 파일을 생성한 후, `sites-enabled` 디렉터리에 심볼릭 링크를 만들어 활성화합니다.

```bash
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/another-site.org /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 1.5. 리버스 프록시 구현

Nginx는 리버스 프록시로서 클라이언트 요청을 백엔드 애플리케이션 서버로 전달하고 그 응답을 다시 클라이언트에게 반환하는 역할을 수행합니다.

*   `proxy_pass`: 요청을 전달할 백엔드 서버의 주소를 지정합니다.
*   `proxy_set_header`: 백엔드로 전달되는 요청 헤더를 설정하거나 수정합니다.

**Node.js 애플리케이션(로컬 3000번 포트)으로의 리버스 프록시 예제:**

```nginx
server {
    listen 80;
    server_name myapp.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade; # WebSocket을 위한 설정
        proxy_set_header Connection 'upgrade';  # WebSocket을 위한 설정
    }
}
```

> **Warning**: `proxy_pass` 지시어에서 URI 끝에 슬래시(/)를 사용하느냐 마느냐에 따라 URI 매핑 동작이 크게 달라집니다.
> *   `proxy_pass http://backend_server;` (슬래시 없음): `/app/path` -> `/app/path` (그대로 전달)
> *   `proxy_pass http://backend_server/;` (슬래시 있음): `/app/path` -> `/path` (접두사 제거 후 전달)

### 1.6. SSL/TLS를 이용한 Nginx 보안 (HTTPS 설정)

올바르게 구성·검증된 HTTPS는 client와 TLS 종료 지점 사이 전송의 기밀성과 무결성을 제공합니다. endpoint compromise, 잘못된 certificate 검증과 종료 지점 이후 구간까지 보호하는 것은 아닙니다. Let's Encrypt와 Certbot을 사용하여 쉽게 구현할 수 있습니다.

**기본 HTTPS 설정 및 HTTP → HTTPS 리디렉션 예제:**

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri; # HTTP 요청을 HTTPS로 영구 리디렉션
}

server {
    listen 443 ssl http2; # HTTP/2 활성화
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem; # 인증서 경로
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem; # 개인 키 경로

    # 최신 SSL/TLS 설정 권장 사항
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # SSL 성능 최적화
    ssl_session_cache shared:SSL:10m; # 약 40,000 세션을 위한 10MB 공유 캐시
    ssl_session_timeout 1d;         # 세션 캐시 유효 기간 1일
    ssl_session_tickets off;        # 보안상 비활성화 권장

    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

---

## 2. 대규모 및 고성능 환경에서의 Nginx

### 2.1. 로드 밸런싱 전략

Nginx는 여러 백엔드 서버로 트래픽을 분산시키는 로드 밸런서 역할을 수행할 수 있습니다. 이는 `upstream` 블록을 통해 설정됩니다.

#### 2.1.1. Upstream 모듈 기본

```nginx
http {
    upstream backend_servers {
        server backend1.example.com:8080;
        server backend2.example.com:8080;
        server 192.168.1.100:8081;
    }

    server {
        listen 80;
        server_name loadbalanced.example.com;

        location / {
            proxy_pass http://backend_servers;
            proxy_set_header Host $host;
        }
    }
}
```

#### 2.1.2. 라운드 로빈 (Round Robin) - 기본값

각 서버에 순차적으로 요청을 분배합니다. `weight`로 가중치를 줄 수 있습니다.

```nginx
upstream backend_servers {
    server backend1.example.com weight=3; # 요청의 3/5 수신
    server backend2.example.com weight=1; # 요청의 1/5 수신
    server backend3.example.com weight=1; # 요청의 1/5 수신
}
```

#### 2.1.3. 최소 연결 (least_conn)

`least_conn`은 선택 시점의 가중 active connection 수를 기준으로 upstream을 고르며, request 비용·queue·backend capacity가 같다는 보장은 없습니다.

```nginx
upstream backend_servers {
    least_conn;
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

#### 2.1.4. IP 해시 (ip_hash)

`ip_hash`는 관측된 client IP와 현재 upstream 집합을 기준으로 비교적 일관된 선택을 하지만 NAT, IPv6, upstream 변경과 failure 시 동일 backend를 보장하지 않습니다.

```nginx
upstream backend_servers {
    ip_hash;
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com down; # down: 일시적으로 제거
}
```

#### 2.1.5. 일반 해시 (hash)

사용자 정의 키(예: `$request_uri`)를 기반으로 로드 밸런싱합니다.

```nginx
upstream backend_servers {
    hash $request_uri consistent; # consistent: 일관성 해싱 (서버 변경 시 재매핑 최소화)
    server backend1.example.com;
    server backend2.example.com;
}
```

### 2.2. 업스트림 서버 헬스 체크

**패시브 헬스 체크 (Nginx Open Source):**
요청 실패를 감지하여 비정상 서버를 일시적으로 제외합니다.

```nginx
upstream backend_servers {
    server backend1.example.com max_fails=3 fail_timeout=30s;
    server backend2.example.com max_fails=3 fail_timeout=30s;
    # 30초 내에 3번 연결 실패 시 서버를 비활성으로 표시하고,
    # 이후 30초 동안 해당 서버로 요청을 보내지 않습니다.
}
```

**액티브 헬스 체크 (Nginx Plus):**
주기적으로 헬스 체크 요청을 보냅니다 (`health_check` 지시어 사용).


### 2.3. 성능 향상을 위한 프록시 캐싱

Nginx는 백엔드 서버의 응답을 캐시하여 지연 시간을 줄이고 백엔드 부하를 감소시킬 수 있습니다.

**주요 지시어:**
*   `proxy_cache_path`: 캐시 저장 경로, 크기, 메타데이터 존 등을 정의합니다. (`http` 컨텍스트)
*   `proxy_cache`: 캐싱을 활성화합니다.
*   `proxy_cache_key`: 캐시 키를 정의합니다.
*   `proxy_cache_valid`: 상태 코드별 캐시 시간을 설정합니다.
*   `proxy_cache_use_stale`: 백엔드 오류 시 만료된 캐시 사용 여부를 설정합니다.

**프록시 캐싱 설정 예제:**

```nginx
http {
    # 캐시 경로 설정
    # keys_zone: 메타데이터 저장소 이름과 크기 (100MB)
    # max_size: 캐시 최대 크기 (10GB)
    # inactive: 60분간 접근 없으면 삭제
    proxy_cache_path /var/nginx/cache levels=1:2 keys_zone=my_app_cache:100m max_size=10g inactive=60m use_temp_path=off;

    server {
        listen 80;
        server_name cache.example.com;

        location / {
            proxy_pass http://backend_application_servers;
            proxy_set_header Host $host;

            # 캐싱 활성화
            proxy_cache my_app_cache;

            # 고유 캐시 키 정의
            proxy_cache_key "$scheme$request_method$host$request_uri$is_args$args";

            # 캐시 유효 시간 설정
            proxy_cache_valid 200 301 302 1h;
            proxy_cache_valid 404 1m;
            proxy_cache_valid any 5m;

            # 백엔드 장애 시 만료된 캐시 제공 (Stale Cache)
            proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;

            # 캐시 스탬피드(Cache Stampede) 방지
            proxy_cache_lock on;
            proxy_cache_lock_timeout 5s;

            # 만료된 캐시 백그라운드 업데이트
            proxy_cache_background_update on;

            # 디버깅용 헤더 추가 (HIT, MISS, EXPIRED)
            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}
```

### 2.4. 성능 튜닝

Nginx 성능 최적화를 위한 주요 설정입니다.

**연결 처리:**
*   `worker_connections`: 워커당 최대 연결 수 (ulimit와 연계 필요).
*   `keepalive_timeout`: 클라이언트 연결 유지 시간.
*   `keepalive_requests`: 연결당 최대 요청 수.

**파일 전송:**
*   `sendfile on;`: 커널 공간 내 파일 전송 (Zero-copy).
*   `tcp_nopush on;`: 패킷 최적화.
*   `tcp_nodelay on;`: Nagle 알고리즘 비활성화 (지연 감소).

**성능 튜닝 예제:**

```nginx
http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout 65s;
    keepalive_requests 1000;

    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
}

events {
    worker_connections 4096;
}
```

---

## 3. Nginx 고급 기능 및 관리

### 3.1. 종합적인 로깅

#### 3.1.1. 사용자 정의 로그 형식 (JSON)

JSON 형식으로 로그를 남기면 ELK Stack 등 로그 분석 시스템과 연동하기 쉽습니다.

```nginx
http {
    log_format json_detailed escape=json '{'
        '"time_iso8601": "$time_iso8601",'
        '"client_ip": "$remote_addr",'
        '"request_method": "$request_method",'
        '"request_uri": "$request_uri",'
        '"status": $status,'
        '"body_bytes_sent": $body_bytes_sent,'
        '"http_referer": "$http_referer",'
        '"http_user_agent": "$http_user_agent",'
        '"request_time_seconds": $request_time,'
        '"upstream_addr": "$upstream_addr",'
        '"upstream_response_time_seconds": $upstream_response_time,'
        '"host": "$host"'
    '}';
}
```

#### 3.1.2. 접근 및 오류 로그 설정

```nginx
server {
    access_log /var/log/nginx/myapp.json.access.log json_detailed;
    error_log /var/log/nginx/myapp.error.log warn; # warn 레벨 이상만 로깅
}
```

#### 3.1.3. 조건부 로깅 (불필요한 로그 제외)

헬스 체크나 특정 상태 코드를 로깅에서 제외할 수 있습니다.

```nginx
http {
    map $status $loggable {
        ~^[23]  0; # 2xx, 3xx 응답은 로깅 안 함
        default 1;
    }

    server {
        access_log /var/log/nginx/access.log combined if=$loggable;
    }
}
```

### 3.2. 헤더 수정 (add_header, proxy_set_header)

*   `add_header`: 응답 헤더 추가 (클라이언트에게 전송).
*   `proxy_set_header`: 요청 헤더 변경 (백엔드로 전송).

```nginx
location /api/ {
    proxy_pass http://api_backend;
    
    # 백엔드로 전달할 헤더
    proxy_set_header Host $host;
    proxy_set_header X-API-Version "v2";
    
    # 클라이언트에게 보낼 헤더
    add_header X-Proxied-By "Nginx-Main" always;
}
```

> **Note**: `add_header`는 상속되지 않으므로, 하위 블록에서 `add_header`를 사용하면 상위 블록의 `add_header`가 무시됩니다. 필요한 경우 다시 정의해야 합니다.

### 3.3. 응답 본문 수정

#### 3.3.1. ngx_http_sub_module 사용

간단한 문자열 치환을 수행합니다.

```nginx
location / {
    proxy_pass http://my_legacy_app;
    sub_filter 'http://old.domain.com' 'https://new.domain.com';
    sub_filter_once off; # 모든 인스턴스 치환
    sub_filter_types text/html text/css;
}
```

#### 3.3.2. Lua 모듈을 이용한 복잡한 조작 (OpenResty)

`ngx_http_lua_module`을 사용하면 요청/응답을 프로그래밍 방식으로 정교하게 제어할 수 있습니다. (설정 예제 생략)

### 3.4. 보안 모범 사례

#### 3.4.1. 요청 제한 (Rate Limiting)

DDoS 공격 방지를 위해 요청률을 제한합니다.

```nginx
http {
    # 10MB 메모리 영역에 IP당 초당 5회 요청 제한 정의
    limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=5r/s;

    server {
        location /login {
            # 버스트 10개 허용, nodelay로 즉시 처리하지만 초과 시 503
            limit_req zone=req_limit_per_ip burst=10 nodelay;
        }
    }
}
```

#### 3.4.2. IP 기반 접근 제어

```nginx
location /admin/ {
    allow 192.168.1.0/24; # 내부 네트워크 허용
    deny all;             # 나머지 모두 차단
}
```

#### 3.4.3. HTTP 기본 인증

```nginx
location /protected_area/ {
    auth_basic "Restricted Content";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

#### 3.4.4. 필수 보안 헤더

```nginx
server {
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always; # HSTS
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

#### 3.4.5. 웹 애플리케이션 방화벽 (WAF) 연동

ModSecurity나 NAXSI 같은 WAF를 연동하여 SQL Injection, XSS 등을 방어할 수 있습니다.

**ModSecurity 설정 예시:**
```nginx
modsecurity on;
modsecurity_rules_file /etc/nginx/modsec/main.conf;
```

---

## 4. 외부 시스템과의 연동

### 4.1. Ansible을 이용한 Nginx 자동화

Ansible은 Nginx 설치 및 설정을 코드로 관리(IaC)할 수 있게 해줍니다.

**Playbook 예제 (Role 사용):**

```yaml
- hosts: webservers
  roles:
    - role: nginxinc.nginx
      vars:
        nginx_service_state: started
        nginx_service_enabled: true
```

### 4.2. Nginx와 Kafka 연동

#### 4.2.1. Kafka TCP 로드 밸런싱

`stream` 모듈을 사용하여 Kafka 브로커로 트래픽을 분산합니다.

```nginx
stream {
    upstream kafka_brokers {
        server kafka-broker1:9092;
        server kafka-broker2:9092;
    }

    server {
        listen 9093;
        proxy_pass kafka_brokers;
    }
}
```

#### 4.2.2. Nginx 로그를 Kafka로 전송

`rsyslog`나 `Fluentd`를 사용하여 Nginx 로그를 Kafka로 전송할 수 있습니다.

**Nginx 설정 (Syslog 전송):**

```nginx
access_log syslog:server=127.0.0.1:514,tag=nginx kafka_json;
```

---

## 5. 대규모 시스템 운영 전략

### 5.1. 다수의 백엔드 그룹 및 동적 백엔드 관리

*   **설정 파일 분리**: `include conf.d/*.conf;`를 사용하여 관리 용이성 확보.
*   **동적 백엔드**: Consul-template 등을 사용하여 서비스 디스커버리와 연동, 백엔드 서버 변경 시 Nginx 설정을 자동 갱신.

### 5.2. 고가용성 (HA) 구성

*   **Active-Passive**: Keepalived와 VRRP를 사용하여 주 서버 장애 시 예비 서버로 VIP 이동.
*   **Keepalived 설정 (Master):**

```conf
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 150
    virtual_ipaddress {
        192.168.1.100
    }
}
```

### 5.3. 모니터링 및 경고

*   **Stub Status**: `stub_status` 모듈로 기본 메트릭(활성 연결 수 등) 노출.
*   **Prometheus Exporter**: `nginx-prometheus-exporter`를 사용하여 메트릭을 Prometheus로 수집하고 Grafana로 시각화.

```bash
docker run -p 9113:9113 nginx/nginx-prometheus-exporter -nginx.scrape-uri http://localhost/nginx_status
```

---

## 결론

Nginx는 단순한 웹 서버를 넘어 로드 밸런서, API 게이트웨이, 보안 엔드포인트로서 현대 아키텍처의 핵심 요소입니다. 본 가이드의 설정을 바탕으로 환경에 맞는 최적화를 수행하시기 바랍니다.

## 참고 자료

1. [nginx-admins-handbook](https://github.com/trimstray/nginx-admins-handbook/blob/master/doc/NGINX_BASICS.md)
2. [NGINX Official Documentation](https://docs.nginx.com/)
3. [DigitalOcean Nginx Tutorials](https://www.digitalocean.com/community/tags/nginx)
