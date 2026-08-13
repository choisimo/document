# VS Code 서버의 WebSocket 오류 해결을 위한 Nginx 설정

> **진단 범위:** 아래 구성은 `code.nodove.com`을 `localhost:8080`의 code-server로 프록시하는 예시입니다. 장애 원인이 Upgrade 헤더인지 인증·경로·인증서·업스트림 연결인지 Nginx 오류 로그와 브라우저 네트워크 기록으로 먼저 구분합니다.

WebSocket 요청이 일반 HTTP 응답으로 끝나고 업스트림 HTTP 연결은 정상이라는 관찰이 있을 때, 아래 헤더 구성을 후보 수정안으로 적용합니다. HSTS의 `includeSubDomains`와 `preload`는 모든 하위 도메인이 HTTPS를 지원하는 경우에만 유지합니다.

## 수정된 Nginx 설정

아래와 같이 location 블록에 WebSocket 관련 헤더를 추가해야 합니다:

```nginx
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
        
        # WebSocket 지원을 위한 헤더 추가
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 기존 헤더 유지
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect ./login /login;
        
        # WebSocket 연결 유지를 위한 타임아웃 설정 (선택 사항)
        proxy_read_timeout 300s;
    }
}
```

## 주요 변경사항 설명

설정 적용 완료는 Nginx 재시작이 아니라 브라우저의 WebSocket 요청이 `101 Switching Protocols`로 전환되고 code-server 터미널과 편집 세션이 지정한 타임아웃 동안 유지되는 것으로 판정합니다.

1. **HTTP 버전 설정**: `proxy_http_version 1.1;` - WebSocket은 HTTP/1.1 이상에서 지원됩니다[4][6].

2. **Upgrade 헤더**: `proxy_set_header Upgrade $http_upgrade;` - 클라이언트가 WebSocket 프로토콜로 업그레이드 요청을 보낼 때 필요합니다[2][3][6].

3. **Connection 헤더**: `proxy_set_header Connection "upgrade";` - 연결 유지 방식을 WebSocket으로 변경합니다[2][5][6].

4. **타임아웃 설정**: `proxy_read_timeout 300s;` - 기본값인 60초보다 긴 시간을 설정하여 WebSocket 연결이 일정 시간 데이터 전송이 없어도 유지되도록 합니다[4].

이러한 변경 사항을 적용한 후 Nginx 설정을 테스트하고 서비스를 재시작하세요:

```bash
sudo nginx -t
sudo systemctl restart nginx
```
