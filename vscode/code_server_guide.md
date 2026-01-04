# VS Code 서버의 WebSocket 오류 해결을 위한 Nginx 설정

현재 Nginx 설정에는 VS Code 서버에 필요한 WebSocket 지원 설정이 누락되어 있습니다. VS Code 서버는 실시간 편집 기능, 터미널, 확장 기능 등을 위해 WebSocket 연결을 필수적으로 사용합니다.

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

1. **HTTP 버전 설정**: `proxy_http_version 1.1;` - WebSocket은 HTTP/1.1 이상에서 지원됩니다[4][6].

2. **Upgrade 헤더**: `proxy_set_header Upgrade $http_upgrade;` - 클라이언트가 WebSocket 프로토콜로 업그레이드 요청을 보낼 때 필요합니다[2][3][6].

3. **Connection 헤더**: `proxy_set_header Connection "upgrade";` - 연결 유지 방식을 WebSocket으로 변경합니다[2][5][6].

4. **타임아웃 설정**: `proxy_read_timeout 300s;` - 기본값인 60초보다 긴 시간을 설정하여 WebSocket 연결이 일정 시간 데이터 전송이 없어도 유지되도록 합니다[4].

이러한 변경 사항을 적용한 후 Nginx 설정을 테스트하고 서비스를 재시작하세요:

```bash
sudo nginx -t
sudo systemctl restart nginx
```
