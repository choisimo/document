 -+WG-Easy 기반 WireGuard VPN 서버 구축 가이드WG-Easy는 Docker를 기반으로 동작하며, 직관적인 웹 UI를 통해 WireGuard 서버와 클라이언트(피어)를 매우 쉽게 관리할 수 있게 해주는 도구입니다.1단계: 사전 준비 (WireGuard 서버에서 실행)두 대의 우분투 서버(하나는 서버, 하나는 클라이언트 역할)가 준비되어 있고, 각 서버에 sudo 권한이 있는 사용자로 접속할 수 있어야 합니다.시스템 패키지 업데이트 및 Docker 설치# 시스템 패키지 목록을 최신 상태로 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치에 필요한 패키지 설치
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Docker 공식 GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 설정
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 패키지 목록 다시 업데이트 후 Docker 및 Docker Compose 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

WG-Easy 설정 디렉토리 생성WG-Easy의 설정 파일(docker-compose.yml)을 저장할 디렉토리를 만듭니다.mkdir ~/wg-easy
cd ~/wg-easy

2단계: WG-Easy 설정 및 실행 (WireGuard 서버)docker-compose.yml 파일을 생성하여 WG-Easy 실행 환경을 정의합니다.docker-compose.yml 파일 작성nano docker-compose.yml 명령어로 편집기를 열고 아래 내용을 붙여넣습니다.version: "3.8"
services:
  wg-easy:
    environment:
      # 필수: WireGuard 서버의 공인 IP 주소 또는 도메인 주소를 입력하세요.
      # 클라이언트 설정 파일(.conf)에 이 주소가 자동으로 들어갑니다.
      - WG_HOST=YOUR_SERVER_PUBLIC_IP

      # 선택: WG-Easy 웹 UI에 접속할 비밀번호를 설정하세요. (설정 권장)
      - PASSWORD=your_strong_password

      # 선택: 웹 UI 접속 포트 (기본값: 51821/TCP)
      # - WG_UI_PORT=51821

      # 선택: WireGuard 터널 포트 (기본값: 51820/UDP)
      # 사용자가 51821을 언급했으므로 51821로 변경해 봅니다.
      - WG_PORT=51821

      # 선택: 클라이언트가 사용할 DNS 서버 (기본값: 1.1.1.1)
      # - WG_DEFAULT_DNS=1.1.1.1,1.0.0.1

      # 선택: 클라이언트의 기본 IP 주소 (기본값: 10.2.0.x)
      # - WG_DEFAULT_ADDRESS=10.8.0.x

    image: ghcr.io/wg-easy/wg-easy
    container_name: wg-easy
    volumes:
      # 설정 파일 영구 저장을 위한 볼륨 마운트
      - ./config:/etc/wireguard
    ports:
      # {외부 WG 터널 포트}:{내부 WG 터널 포트}/udp
      - "51821:51821/udp"
      # {외부 Web UI 포트}:{내부 Web UI 포트}/tcp
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv6.conf.all.forwarding=1

주의: YOUR_SERVER_PUBLIC_IP와 your_strong_password는 반드시 실제 환경에 맞게 수정해야 합니다.WG-Easy 컨테이너 실행docker-compose.yml 파일이 있는 디렉토리(~/wg-easy)에서 아래 명령을 실행합니다.sudo docker compose up -d

이제 WG-Easy 서버가 백그라운드에서 실행됩니다.3단계: 방화벽 설정 (가장 중요!) (WireGuard 서버)이 단계가 속도 저하 문제를 해결하는 핵심입니다. ufw (Uncomplicated Firewall)를 기준으로 설명합니다.필수 포트 개방SSH 접속 포트 (기본 22/TCP): 원격 접속을 위해 필수입니다.WG-Easy 웹 UI 포트 (51821/TCP): docker-compose.yml에서 설정한 포트입니다.WireGuard 터널 포트 (51821/UDP): docker-compose.yml에서 설정한 포트입니다.# ufw가 비활성화 상태라면 활성화
sudo ufw enable

# 기본 정책 설정 (들어오는 것은 차단, 나가는 것은 허용)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 포트 개방
sudo ufw allow 22/tcp
sudo ufw allow 51821/tcp
sudo ufw allow 51821/udp

트래픽 전달(Forwarding) 및 NAT 설정클라이언트 트래픽을 서버 밖으로 내보내기 위한 설정입니다.(1) UFW 포워딩 정책 변경/etc/default/ufw 파일을 열어 DEFAULT_FORWARD_POLICY 값을 ACCEPT로 변경합니다.sudo nano /etc/default/ufw

파일 내용에서 아래 부분을 찾아 수정합니다.- DEFAULT_FORWARD_POLICY="DROP"
+ DEFAULT_FORWARD_POLICY="ACCEPT"

(2) UFW에 NAT 규칙 추가/etc/ufw/before.rules 파일의 맨 윗부분(*filter 규칙 이전)에 NAT(Masquerade) 규칙을 추가합니다.sudo nano /etc/ufw/before.rules

파일의 가장 처음에 아래 내용을 추가합니다.# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]

# Allow traffic from WireGuard clients to eth0 (or your main network interface)
# -A POSTROUTING -s 10.2.0.0/24 -o eth0 -j MASQUERADE
-A POSTROUTING -s 10.2.0.0/24 -o $(ip -4 route ls | grep default | grep -Po '(?<=dev )(\S+)' | head -1) -j MASQUERADE

COMMIT

설명:-s 10.2.0.0/24: WireGuard 클라이언트들이 사용하는 IP 대역입니다. docker-compose.yml에서 WG_DEFAULT_ADDRESS를 변경했다면 여기도 맞춰서 수정해야 합니다.-o $(...): 트래픽을 내보낼 서버의 기본 네트워크 인터페이스 이름(예: eth0, ens3 등)을 자동으로 찾아줍니다.-j MASQUERADE: WireGuard 클라이언트에서 나가는 모든 트래픽의 출발지 IP 주소를 서버의 공인 IP 주소로 위장(변환)합니다.방화벽 재시작변경된 설정을 적용하기 위해 ufw를 재시작합니다.sudo ufw disable && sudo ufw enable

4단계: 클라이언트(피어) 추가 및 연결WG-Easy 웹 UI 접속웹 브라우저에서 http://<서버_공인_IP>:51821 주소로 접속한 후, docker-compose.yml에서 설정한 비밀번호를 입력하여 로그인합니다.[이미지: WG-Easy 로그인 화면]새 클라이언트 생성웹 UI에서 + New 버튼을 클릭하고 클라이언트의 이름(예: remote-server)을 입력한 후 Create를 누릅니다.[이미지: WG-Easy 클라이언트 생성 화면]클라이언트 설정 파일 다운로드생성된 클라이언트 항목에서 **설정 파일 다운로드 아이콘(📄)**을 클릭하여 <클라이언트_이름>.conf 파일을 PC로 다운로드합니다.원격 서버(클라이언트)에 WireGuard 설치 및 설정이제 **원격 서버(클라이언트 역할)**에서 다음 작업을 수행합니다.wireguard-tools 설치sudo apt update
sudo apt install -y wireguard-tools

설정 파일 복사PC에 다운로드한 .conf 파일을 scp나 다른 방법을 이용해 원격 서버의 /etc/wireguard/ 디렉토리로 복사합니다. 파일 이름은 wg0.conf로 변경하는 것이 일반적입니다.# PC에서 원격 서버로 파일 복사하는 예시
scp ~/Downloads/remote-server.conf user@<원격_서버_IP>:/tmp/wg0.conf

# 원격 서버에서 파일 이동
sudo mv /tmp/wg0.conf /etc/wireguard/wg0.conf

VPN 연결 시작원격 서버에서 아래 명령어로 VPN 연결을 시작합니다.sudo wg-quick up wg0

이제 원격 서버의 모든 인터넷 트래픽은 WireGuard 서버를 통해 나가게 됩니다.5단계: 연결 확인WG-Easy UI 확인: 웹 UI에서 해당 클라이언트의 마지막 핸드셰이크(Latest Handshake) 시간이 "a few seconds ago"와 같이 표시되고, 상태 아이콘이 녹색으로 바뀌었는지 확인합니다.[이미지: WG-Easy 연결 성공 상태]Ping 테스트 (클라이언트에서): 클라이언트 서버에서 WireGuard 서버의 터널 IP 주소(보통 10.2.0.1)로 ping을 보내봅니다.ping 10.2.0.1

공인 IP 확인 (클라이언트에서): 클라이언트 서버의 공인 IP가 WireGuard 서버의 공인 IP로 변경되었는지 확인합니다.curl ifconfig.me
# WireGuard 서버의 공인 IP 주소가 출력되어야 합니다.

여기까지 성공했다면 속도 저하 없이 안정적인 VPN 연결이 완료된 것입니다.요약: 열어야 할 포트 및 설정항목포트/설정프로토콜목적비고SSH22 (기본)TCP서버 원격 관리보안을 위해 다른 포트로 변경 가능WG-Easy 웹 UI51821 (기본)TCP웹 기반 관리docker-compose.yml에서 변경 가능WireGuard 터널51821 (사용자 지정)UDP실제 VPN 데이터 통신docker-compose.yml에서 변경 가능포워딩 정책DEFAULT_FORWARD_POLICY="ACCEPT"-클라이언트 트래픽 전달 허용/etc/default/ufw 파일 수정NAT 규칙-j MASQUERADE-클라이언트 트래픽 주소 변환/etc/ufw/before.rules 파일 수정 (속도 저하 해결의 핵심)이 가이드의 3단계 방화벽 설정 부분, 특히 NAT 규칙 추가가 이전에 겪으셨던 문제를 해결하는 가장 중요한 부분이니 꼼꼼하게 진행하시기 바랍니다.