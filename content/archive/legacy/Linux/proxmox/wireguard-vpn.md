# WG-Easy 기반 WireGuard VPN 서버 구성

WG-Easy는 Docker 기반 WireGuard 관리 도구이며, 웹 UI에서 서버와 클라이언트 피어를 관리한다. 아래 구성은 Ubuntu 서버 두 대를 기준으로 한다.

- WireGuard 서버: WG-Easy 컨테이너와 UFW/NAT 설정을 적용하는 서버
- WireGuard 클라이언트: `wireguard-tools`로 VPN 터널에 접속하는 서버

## 서버 준비

WireGuard 서버에서 패키지를 갱신하고 Docker와 Docker Compose 플러그인을 설치한다.

```bash
# 시스템 패키지 목록 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치에 필요한 패키지 설치
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Docker 공식 GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 설정
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 및 Docker Compose 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

WG-Easy 설정 디렉토리를 만든다.

```bash
mkdir ~/wg-easy
cd ~/wg-easy
```

## WG-Easy Compose 파일

`docker-compose.yml` 파일을 생성한다.

```bash
nano docker-compose.yml
```

```yaml
version: "3.8"
services:
  wg-easy:
    environment:
      # WireGuard 서버의 공인 IP 주소 또는 도메인 주소
      - WG_HOST=SERVER_PUBLIC_IP

      # WG-Easy 웹 UI 접속 비밀번호
      - PASSWORD=STRONG_WEB_PASSWORD

      # 웹 UI 접속 포트 기본값: 51821/TCP
      # - WG_UI_PORT=51821

      # WireGuard 터널 포트
      - WG_PORT=51821

      # 클라이언트 DNS 기본값 예시
      # - WG_DEFAULT_DNS=1.1.1.1,1.0.0.1

      # 클라이언트 IP 주소 대역 예시
      # - WG_DEFAULT_ADDRESS=10.8.0.x

    image: ghcr.io/wg-easy/wg-easy
    container_name: wg-easy
    volumes:
      - ./config:/etc/wireguard
    ports:
      - "51821:51821/udp"
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv6.conf.all.forwarding=1
```

`SERVER_PUBLIC_IP`와 `STRONG_WEB_PASSWORD`는 실제 서버 주소와 비밀번호로 바꾼다.

컨테이너를 백그라운드에서 실행한다.

```bash
sudo docker compose up -d
```

## 방화벽과 NAT 설정

UFW를 기준으로 SSH, WG-Easy 웹 UI, WireGuard 터널 포트를 연다. 예시는 SSH 22/TCP, 웹 UI 51821/TCP, 터널 51821/UDP를 사용한다.

```bash
# UFW 활성화
sudo ufw enable

# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 포트 개방
sudo ufw allow 22/tcp
sudo ufw allow 51821/tcp
sudo ufw allow 51821/udp
```

클라이언트 트래픽이 서버 밖으로 전달되도록 `/etc/default/ufw`에서 포워딩 정책을 변경한다.

```bash
sudo nano /etc/default/ufw
```

```diff
- DEFAULT_FORWARD_POLICY="DROP"
+ DEFAULT_FORWARD_POLICY="ACCEPT"
```

서버의 기본 네트워크 인터페이스 이름을 확인한다.

```bash
ip -4 route ls | grep default | grep -Po '(?<=dev )(\S+)' | head -1
```

`/etc/ufw/before.rules` 파일의 `*filter` 규칙보다 앞에 NAT(Masquerade) 규칙을 추가한다. `INTERFACE_NAME`은 위 명령으로 확인한 인터페이스 이름으로 바꾼다.

```bash
sudo nano /etc/ufw/before.rules
```

```text
# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]

# WireGuard client traffic to the main network interface
# -A POSTROUTING -s 10.2.0.0/24 -o eth0 -j MASQUERADE
-A POSTROUTING -s 10.2.0.0/24 -o INTERFACE_NAME -j MASQUERADE

COMMIT
```

NAT 규칙의 의미는 다음과 같다.

- `-s 10.2.0.0/24`: WireGuard 클라이언트 IP 대역
- `-o INTERFACE_NAME`: 서버의 기본 네트워크 인터페이스
- `-j MASQUERADE`: 클라이언트 트래픽의 출발지 주소를 서버 공인 IP 주소로 변환

UFW를 재시작하여 변경 사항을 적용한다.

```bash
sudo ufw disable && sudo ufw enable
```

## 클라이언트 피어 생성

1. 웹 브라우저에서 `http://<서버_공인_IP>:51821` 주소로 접속한다.
2. `docker-compose.yml`에 설정한 비밀번호로 로그인한다.
3. `+ New` 버튼으로 클라이언트를 생성한다. 예시 이름은 `remote-server`이다.
4. 생성된 클라이언트 항목에서 설정 파일 다운로드 아이콘을 눌러 `<클라이언트_이름>.conf` 파일을 받는다.

## 클라이언트 서버 연결

클라이언트 서버에서 `wireguard-tools`를 설치한다.

```bash
sudo apt update
sudo apt install -y wireguard-tools
```

PC에 내려받은 `.conf` 파일을 원격 서버의 `/etc/wireguard/` 디렉토리로 복사한다. 일반적인 파일명은 `wg0.conf`이다.

```bash
# PC에서 원격 서버로 파일 복사하는 예시
scp ~/Downloads/remote-server.conf user@<원격_서버_IP>:/tmp/wg0.conf

# 원격 서버에서 파일 이동
sudo mv /tmp/wg0.conf /etc/wireguard/wg0.conf
```

VPN 연결을 시작한다.

```bash
sudo wg-quick up wg0
```

이 구성에서는 원격 서버의 인터넷 트래픽이 WireGuard 서버를 통해 나간다.

## 연결 확인

WG-Easy UI에서 해당 클라이언트의 마지막 핸드셰이크 시간이 갱신되고 상태 아이콘이 녹색으로 표시되는지 확인한다.

클라이언트 서버에서 WireGuard 서버의 터널 IP 주소로 ping을 보낸다. 기본 예시는 `10.2.0.1`이다.

```bash
ping 10.2.0.1
```

클라이언트 서버의 공인 IP가 WireGuard 서버의 공인 IP로 표시되는지 확인한다.

```bash
curl ifconfig.me
```

## 포트와 설정 요약

| 항목 | 포트 또는 설정 | 프로토콜 | 목적 |
| :--- | :--- | :--- | :--- |
| SSH | 22 | TCP | 서버 원격 관리 |
| WG-Easy 웹 UI | 51821 | TCP | 웹 기반 WireGuard 관리 |
| WireGuard 터널 | 51821 | UDP | VPN 데이터 통신 |
| 포워딩 정책 | `DEFAULT_FORWARD_POLICY="ACCEPT"` | - | 클라이언트 트래픽 전달 |
| NAT 규칙 | `-j MASQUERADE` | - | 클라이언트 트래픽 주소 변환 |

속도 저하나 외부 통신 실패가 있으면 방화벽 포트, 포워딩 정책, NAT 규칙, `WG_DEFAULT_ADDRESS` 대역 일치 여부를 먼저 확인한다.
