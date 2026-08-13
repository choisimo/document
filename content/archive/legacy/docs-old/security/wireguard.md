# WireGuard wg-easy Compose 예제
```dockerfile
version: "3.3"
services:
  wg-easy:
    environment:
      # ⚠️ Required:
      # Change this to your host's public address
      - WG_HOST=gcp.nodove.com

      #Optional:
      - PASSWORD=password
      - WG_PORT=51820
      - WG_DEFAULT_ADDRESS=10.8.0.x
      - WG_DEFAULT_DNS=1.1.1.1
      - WG_MTU=1420
      - WG_ALLOWED_IPS=192.168.1.0/24, 10.8.0.0/24, 0.0.0.0/0
      
    image: weejewel/wg-easy
    container_name: wg-easy
    volumes:
      - /wg-easy/data:/etc/wireguard
    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
```

## 이미지 버전·노출·비밀값 경계

이 파일은 Dockerfile이 아니라 wg-easy용 Compose 예제다. 환경 변수 이름과 해시 형식은 이미지 버전에 따라 달라질 수 있으므로 이미지 digest 또는 명시적 태그를 고정하고 해당 버전 문서와 대조한다. `PASSWORD=password`를 실제 배포에 사용하지 않으며 관리 UI의 TCP 51821은 공용 인터넷에 직접 노출하지 않는다. `WG_ALLOWED_IPS`의 `0.0.0.0/0`은 클라이언트 IPv4 전체 트래픽을 터널로 보내는 선택이므로 필요한 경로만 포함할지 먼저 결정한다. 적용 전 기존 WireGuard 설정을 백업하고, 완료는 관리 UI 인증, UDP 연결, 허용·차단 경로, 재시작 후 터널 복구를 각각 확인해 판정한다.

## 비밀번호 해시 설정 메모 (이미지 버전 확인 필요) 
```shell
vim .env
password = ${hashed password}
```
