# HSTS만으로는 직접 IP 접근 차단에 불충분한 이유

HSTS(HTTP Strict Transport Security)는 도메인 기반 보안 메커니즘으로, 직접 IP 주소를 통한 접근을 차단하는 데는 한계가 있습니다. 현재 설정에 몇 가지 추가 사항이 필요합니다.

## 현재 설정의 문제점

현재 Nginx 설정은 HTTP를 HTTPS로 리디렉션하고 있지만, 다음과 같은 문제가 있습니다:

1. **IP 직접 접근 처리 누락**: 서버 IP로 직접 접근할 경우에 대한 처리가 없습니다[2]
2. **도메인 특정 설정만 존재**: `server_name code.nodove.com`으로만 설정되어 있어 IP 접근 시 다른 규칙이 적용되지 않습니다[2][7]

## 개선된 설정 방법

IP 직접 접근을 차단하려면 다음과 같이 설정을 수정해야 합니다:

```nginx
# 모든 IP 직접 접근 차단 (HTTP)
server {
    listen 80 default_server;
    server_name _;
    return 444;  # 연결 종료 (응답 없음)
}

# 모든 IP 직접 접근 차단 (HTTPS)
server {
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate /etc/letsencrypt/live/nodove.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nodove.com/privkey.pem;
    return 403;  # SSL 핸드셰이크 후 접근 거부
}

# 도메인 HTTP 접근 HTTPS로 리디렉션
server {
    listen 80;
    server_name code.nodove.com;
    return 301 https://$host$request_uri;
}

# 도메인 HTTPS 접근 허용
server {
    listen 443 ssl;
    server_name code.nodove.com;

    ssl_certificate /etc/letsencrypt/live/nodove.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nodove.com/privkey.pem;
    
    # HSTS 헤더 추가
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 내부 서비스로 프록시
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect ./login /login;
    }
}
```

## 중요 고려사항

1. **HSTS의 목적**: HSTS는 브라우저에게 해당 도메인은 항상 HTTPS만 사용해야 한다고 지시하는 것으로, IP 접근 차단과는 다른 목적입니다[6][8]

2. **SSL 핸드셰이크 문제**: IP 직접 접근 시 SSL 핸드셰이크는 서버 블록 결정 이전에 발생하므로, 완전히 연결을 거부하는 것은 어렵습니다[2]

3. **최신 Nginx 필요**: `ssl_reject_handshake on;` 지시어를 사용하려면 Nginx 1.19.4 이상이 필요합니다[2]

4. **추가 보안 계층**: Cloudflare와 같은 서비스를 사용하거나 방화벽 설정을 통해 허용된 IP만 접근할 수 있도록 추가 보안 계층을 구성하는 것이 좋습니다[3][4]

이러한 설정을 통해 도메인 기반 접근은 허용하면서 직접 IP 접근은 차단할 수 있습니다. HSTS는 이미 인증된 도메인 접근에 대해 추가적인 보안 계층을 제공합니다.


---


IP 직접 접근 차단은 Cloudflare Zero Trust의 Access 인증 우회를 방지하는 중요한 첫 단계이지만, 완전한 보안을 위해서는 이것만으로는 충분하지 않습니다.

검색 결과에 따르면:

1. **원본 서버 IP 노출이 핵심 취약점**: Cloudflare는 "자사 네트워크를 통과하는 요청만 차단할 수 있기 때문에, 원본 서버 IP로 직접 요청을 보내면 Cloudflare의 보호를 우회할 수 있습니다"[6]. 따라서 IP 접근을 차단하는 것은 기본적인 방어선입니다.

2. **Bypass 정책의 위험성**: Cloudflare에서는 "Zero Trust 보안 모델 구현의 일환으로 Bypass를 사용하여 내부 애플리케이션에 직접적인 영구 접근 권한을 부여하는 것을 권장하지 않습니다"[5]. 특정 IP에 대한 예외를 만드는 것은 보안 위험을 초래할 수 있습니다.

3. **권장되는 종합적 접근 방법**: "내부 네트워크에 있는 직원들의 원활하고 안전한 접근을 위해서는 Cloudflare Tunnel을 사용하여 프라이빗 네트워크를 연결하고 사용자가 WARP를 통해 연결하도록 하는 것"이 권장됩니다[5].

4. **Tunnel의 보안 이점**: "Zero Trust Tunnel은 본질적으로 네트워크와 Cloudflare Zero Trust 서버 간의 사이트 간 VPN"으로, IP 노출 문제를 근본적으로 해결합니다[4].

IP 차단만으로는 다음과 같은 우회 가능성이 여전히 존재합니다:
- 내부 서비스나 서브도메인을 통한 원본 IP 발견
- Host 헤더 조작을 통한 직접 접근
- 다양한 IP 우회 기술 활용

따라서 IP 직접 접근 차단은 중요한 보안 조치이지만, Cloudflare Tunnel 사용, 요청 헤더 검증, 서비스 토큰 인증 등의 여러 보안 계층을 함께 구현하는 것이 Zero Trust 철학에 맞는 더 안전한 접근 방식입니다.


---

# Nginx 설정 오류 해결 방법

Nginx 서비스가 시작되지 않는 문제는 설정 파일에 문법 오류가 있기 때문입니다. 오류 로그는 잘려있어 정확한 문제를 확인할 수 없지만, 주요 원인과 해결 방법을 살펴보겠습니다.

## 가능한 오류 원인

1. `ssl on;` 지시어는 최신 Nginx 버전에서 사용되지 않습니다
2. SSL 인증서 파일 경로나 권한 문제가 있을 수 있습니다
3. 기본 서버 블록 간의 충돌이 발생했을 수 있습니다

## 수정된 설정 파일

```nginx
# 모든 IP 직접 접근 차단 (HTTP)
server {
    listen 80 default_server;
    server_name _;
    return 444;
}

# 모든 IP 직접 접근 차단 (HTTPS)
server {
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate /etc/letsencrypt/live/nodove.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nodove.com/privkey.pem;
    return 403;
}

# 도메인 HTTP 접근 HTTPS로 리디렉션
server {
    listen 80;
    server_name code.nodove.com;
    return 301 https://$host$request_uri;
}

# 도메인 HTTPS 접근 허용
server {
    listen 443 ssl;
    server_name code.nodove.com;

    ssl_certificate /etc/letsencrypt/live/nodove.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nodove.com/privkey.pem;
    
    # HSTS 헤더 추가
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 내부 서비스로 프록시
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect ./login /login;
    }
}
```

## 설정 테스트 및 적용 방법

1. **설정 오류 확인**:
   ```bash
   sudo nginx -t
   ```
   이 명령은 설정 파일의 문법을 검사하고 오류를 자세히 표시합니다.

2. **SSL 인증서 경로 확인**:
   ```bash
   sudo ls -la /etc/letsencrypt/live/nodove.com/
   ```
   인증서 파일이 존재하는지, 권한이 올바른지 확인하세요.

3. **단계별 테스트**:
   설정 파일에 문제가 있다면, 간단한 버전부터 시작하여 점진적으로 복잡하게 만들어 어떤 부분에서 오류가 발생하는지 확인하세요.

4. **SSL 모듈 확인**:
   ```bash
   nginx -V | grep ssl
   ```
   Nginx가 SSL 지원과 함께 컴파일되었는지 확인하세요.

5. **`ssl on` 지시어 제거**:
   이 지시어는 최신 버전에서 권장되지 않으며, `listen 443 ssl`로 대체되었습니다.

문제가 계속되면 `sudo nginx -t` 명령어의 전체 출력을 확인하여 정확한 오류 메시지를 파악하는 것이 중요합니다.


---

맞습니다. 이미 `default_server` 지시어가 설정된 서버 블록이 있다면 동일한 포트에 두 번째 `default_server`를 추가하면 "Duplicate Default Server" 오류가 발생합니다[7]. 

Nginx는 같은 IP 주소와 포트 조합에 대해 **오직 하나의** `default_server` 지시어만 허용합니다[7]. 귀하의 설정에서는 포트 80에 대해 두 개의 `default_server` 지시어가 있습니다:

1. 첫 번째 블록:
   ```nginx
   listen 80 default_server;
   server_name _;
   return 444;
   ```

2. 기존 설정:
   ```nginx
   listen 80 default_server;
   listen [::]:80 default_server;
   ```

## 해결 방법:

1. **기존 default 설정 수정**: 기존 default 서버 블록을 IP 접근 차단용으로 변경하세요[2]:
   ```bash
   sudo nano /etc/nginx/sites-enabled/default
   ```
   
   기존 내용을 IP 차단 설정으로 교체하거나 수정하세요[6].

2. **중복 제거**: 추가하려는 설정이 이미 동일한 기능을 하는 경우, 불필요한 중복을 피하고 기존 설정만 사용하세요[2][7].

3. **설정 후 테스트**: 변경 후 반드시 구성을 테스트해야 합니다[7]:
   ```bash
   sudo nginx -t
   ```

4. **HTTPS 차단 참고사항**: HTTPS에 대한 IP 접근 차단을 위해 Nginx 1.19.4 이상에서는 `ssl_reject_handshake on;` 사용을 고려하세요. 더 낮은 버전에서는 403 반환 방식이 적합합니다[3][6].

결론적으로, 이미 default_server 지시어가 설정된 상태에서 동일한 지시어를 가진 새 서버 블록을 추가하면 충돌이 발생합니다. 기존 default 설정을 수정하거나 제거한 후 새 설정을 추가하는 것이 올바른 접근 방식입니다