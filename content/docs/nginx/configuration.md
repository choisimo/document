# Nginx 설정 가이드

이 문서는 Nginx 설정을 server block, location, static file, reverse proxy, upstream, TLS, cache, log, rate limit 관점에서 정리한다. 목표는 예제를 붙여 넣는 것이 아니라 요청이 어떤 규칙에 매칭되고 어떤 backend로 전달되는지 검증하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Nginx 설정은 문법은 단순하지만 동작 규칙은 섬세하다. `location` 우선순위, `root`와 `alias`, `proxy_pass` trailing slash, header 전달, TLS redirect 중 하나만 틀려도 404, redirect loop, 502, cache 오염이 발생할 수 있다.

운영 설정은 “작동하는 예제”보다 변경 전후 검증 절차가 더 중요하다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 설치, server block, 정적 파일, reverse proxy, TLS, load balancing, cache, log, 보안, Ansible, Kafka, HA까지 매우 넓게 다룬다.

보완해야 할 점은 다음과 같다.

- 너무 많은 고급 주제가 한 문서에 섞여 핵심 설정 계약이 흐려진다.
- Open Source Nginx와 NGINX Plus 기능 경계가 약하다.
- `proxy_pass` URI 동작, `alias` trailing slash 같은 장애 지점이 더 강조되어야 한다.
- 설정 test, reload, log 확인이 모든 예제의 전제여야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안전하게 수행하는 것이다.

- 기본 설정 구조를 이해한다.
- 정적 파일을 올바른 path로 제공한다.
- Reverse proxy header 계약을 명시한다.
- Upstream passive health check와 load balancing을 설정한다.
- TLS redirect와 certificate 경로를 검증한다.
- Cache 적용 대상을 제한한다.
- JSON access log와 error log로 요청을 추적한다.
- 변경 전후 `nginx -t`, reload, curl, log 확인을 수행한다.

## 4. 시스템 번역 (Data Flow)

Nginx HTTP 요청 처리 흐름은 다음과 같다.

```text
client connects
  -> listen socket selected
  -> server block selected by Host and listen
  -> location selected by URI
  -> static file lookup or proxy_pass
  -> upstream response
  -> response headers and logs written
```

Reverse proxy에서는 backend가 실제 client 정보를 알 수 있도록 forwarding header 계약을 맞춰야 한다.

## 5. 핵심 구성요소 (Building Blocks)

Main context는 worker process, user, pid 같은 전역 설정을 담는다.

Events context는 worker connection 처리 방식을 담는다.

HTTP context는 server, upstream, log format, cache zone 같은 HTTP 설정을 담는다.

Server block은 listen port와 server name을 기준으로 virtual host를 정의한다.

Location block은 URI별 처리 규칙을 정의한다.

`root`는 요청 URI를 filesystem path 뒤에 붙인다. `alias`는 location prefix를 다른 path로 치환한다.

`proxy_pass`는 request를 upstream으로 전달한다. URI를 포함하느냐, trailing slash가 있느냐에 따라 backend path가 달라진다.

`upstream`은 backend server group과 load balancing 정책을 정의한다.

## 6. 상태 전이 (State Transition)

설정 변경 상태 전이는 다음과 같다.

```text
edit config
  -> nginx -t
  -> reload
  -> request test
  -> access log check
  -> error log check
```

502 장애는 다음 순서로 좁힌다.

```text
client receives 502
  -> Nginx error log
  -> upstream DNS or IP
  -> backend port listening
  -> backend health endpoint
  -> proxy timeout and header contract
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `nginx -t`가 통과하지 않으면 reload하지 않는다.
- `restart`보다 `reload`를 우선한다. binary upgrade나 service 장애가 아니면 reload가 기본이다.
- `alias`는 trailing slash와 location prefix를 함께 테스트한다.
- `proxy_pass` trailing slash 동작을 curl로 확인한다.
- Backend가 scheme을 알아야 하면 `X-Forwarded-Proto`를 전달한다.
- TLS private key 권한과 certificate renewal 경로를 확인한다.
- Cache는 인증 응답과 개인화 응답에 적용하지 않는다.
- `add_header`는 context 상속 규칙을 확인하고 필요한 곳에 다시 선언한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

기본 server block이다.

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/example.com/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

`root`와 `alias` 차이를 확인한다.

```nginx
location /assets/ {
    root /var/www/app;
}

location /images/ {
    alias /srv/images/;
}
```

`/assets/logo.png`는 `/var/www/app/assets/logo.png`를 찾고, `/images/logo.png`는 `/srv/images/logo.png`를 찾는다.

Reverse proxy 예시다.

```nginx
upstream app_backend {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

WebSocket이 필요하면 upgrade header를 추가한다.

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name ws.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
    }
}
```

HTTPS redirect와 TLS server block 예시다.

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Cache는 public GET 응답처럼 안전한 범위에만 적용한다.

```nginx
proxy_cache_path /var/cache/nginx/app levels=1:2 keys_zone=app_cache:50m max_size=2g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name cache.example.com;

    location /public/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache app_cache;
        proxy_cache_methods GET HEAD;
        proxy_cache_valid 200 10m;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status always;
    }
}
```

JSON access log 예시다.

```nginx
log_format json_combined escape=json
    '{"time":"$time_iso8601","remote_addr":"$remote_addr","host":"$host","method":"$request_method","uri":"$request_uri","status":$status,"request_time":$request_time,"upstream_addr":"$upstream_addr","upstream_response_time":"$upstream_response_time"}';

access_log /var/log/nginx/access.json json_combined;
error_log /var/log/nginx/error.log warn;
```

Rate limit 예시다.

```nginx
limit_req_zone $binary_remote_addr zone=login_per_ip:10m rate=5r/m;

server {
    listen 80;
    server_name auth.example.com;

    location /login {
        limit_req zone=login_per_ip burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

검증한다.

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://app.example.com
tail -n 100 /var/log/nginx/error.log
```

## 9. 실패 사례 (What could go wrong?)

`proxy_pass http://backend;`와 `proxy_pass http://backend/;`는 location prefix 처리 방식이 다르다. Backend가 받는 URI를 access log로 확인한다.

`alias` 경로 끝 slash가 location과 맞지 않으면 예상과 다른 path를 찾거나 404가 난다.

Backend가 HTTPS redirect를 만들 때 `X-Forwarded-Proto`를 받지 못하면 HTTP와 HTTPS 사이 redirect loop가 생길 수 있다.

`add_header`를 하위 location에서 하나만 선언하면 상위 header가 상속되지 않을 수 있다. 보안 header 누락을 확인한다.

Passive health check는 실제 요청 실패를 기반으로 한다. 능동 health check는 NGINX Plus 기능 영역이다.

`proxy_cache`를 인증 API에 적용하면 사용자별 응답이 섞일 수 있다. `Cache-Control`, cookie, Authorization header를 고려한다.

## 10. 뇌 확장하기 (Evolution & Variants)

Nginx Open Source와 NGINX Plus는 기능 차이가 있다. Active health check, 동적 upstream 관리 같은 기능은 Plus 영역일 수 있으므로 배포판의 module과 라이선스를 확인한다.

Kubernetes에서는 일반 Nginx server block을 직접 관리하기보다 Ingress Controller, ConfigMap, annotation, CRD가 설정 경계가 된다.

운영 자동화에서는 config fragment를 작게 나누고 `nginx -t`를 CI에서 실행한 뒤 배포한다.

공식 directive 동작은 Nginx 문서를 기준으로 확인한다.

- Nginx documentation: <https://nginx.org/en/docs/>
- Nginx load balancing: <https://nginx.org/en/docs/http/load_balancing.html>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `server_name`과 `listen`이 의도한 요청을 받는다.
- [ ] `location` matching 결과를 테스트했다.
- [ ] `root`와 `alias` path를 실제 파일로 확인했다.
- [ ] `proxy_pass` trailing slash 동작을 확인했다.
- [ ] Forwarded header 계약을 backend와 맞췄다.
- [ ] TLS certificate와 private key 경로가 유효하다.
- [ ] Cache 적용 범위가 public 응답으로 제한되어 있다.
- [ ] `nginx -t`, reload, curl, log 확인을 완료했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Nginx 설정은 listen, server_name, location, filesystem path, upstream path가 맞아야 동작한다. 모든 변경은 `nginx -t`, reload, 요청 테스트, log 확인까지 끝나야 완료다.
