Tailscale CLI 명령어 상세 가이드이 문서는 Tailscale CLI의 각 sub-command에 대한 설명과 구체적인 사용 예시를 제공합니다.upTailscale 네트워크에 현재 장치를 연결하고 활성화합니다. 로그인 과정이 필요할 수 있습니다.사용 예시:# 기본적으로 Tailscale에 연결합니다.
tailscale up

# 특정 Exit Node를 통해 모든 인터넷 트래픽을 라우팅합니다.
tailscale up --exit-node=your-exit-node-name


# 로컬 서브넷을 다른 Tailscale 장치들이 접근할 수 있도록 알립니다. (Subnet Router)
## 설정 iptables 및 ip-forwarding :
### 먼저, 로컬 서브넷을 라우팅하기 위해 iptables와 IP 포워딩을 설정해야 합니다.
sudo iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1
**/etc/sysctl.conf** 파일에 다음 줄을 추가하여 영구적으로 설정할 수 있습니다.
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
# Tailscale을 통해 로컬 서브넷을 광고합니다.
tailscale up --advertise-routes=192.168.1.0/24,10.0.0.0/24

# SSH를 통해 이 장치에 접근할 수 있도록 허용합니다.
tailscale up --ssh

# 인증키(auth key)를 사용하여 로그인 없이 장치를 연결합니다. (주로 서버나 자동화 환경에서 사용)
tailscale up --authkey=tskey-auth-abcdef123456
downTailscale 네트워크 연결을 끊습니다.사용 예시:# Tailscale 연결을 비활성화합니다.
tailscale down
setTailscale의 설정을 변경합니다.사용 예시:# 장치의 호스트 이름을 변경합니다.
tailscale set --hostname=my-new-server

# 다른 장치에서 advertise하는 라우팅 경로를 수락합니다.
tailscale set --accept-routes=true

# Tailscale의 DNS 설정을 사용하지 않도록 합니다.
tailscale set --accept-dns=false
login & logoutlogin은 Tailscale 계정에 로그인하며, logout은 연결을 끊고 현재 장치의 인증을 무효화합니다.사용 예시:# 웹 브라우저를 통해 Tailscale 계정에 로그인합니다.
tailscale login

# 현재 장치를 Tailscale 네트워크에서 로그아웃하고 키를 만료시킵니다.
tailscale logout
switch여러 Tailscale 계정을 사용하는 경우, 다른 계정으로 전환합니다.사용 예시:# 특정 계정(이메일 또는 프로필 이름)으로 전환합니다.
tailscale switch <account@example.com>
netcheck로컬 네트워크 상태를 진단하고 Tailscale 연결에 영향을 줄 수 있는 문제를 분석합니다.사용 예시:# 현재 네트워크 상태를 한 번 진단합니다.
tailscale netcheck

# 5초마다 주기적으로 네트워크 상태를 진단하고 변경 사항을 표시합니다.
tailscale netcheck --watch
ip현재 장치의 Tailscale IP 주소를 표시합니다.사용 예시:# Tailscale IPv4와 IPv6 주소를 모두 표시합니다.
tailscale ip

# Tailscale IPv4 주소만 표시합니다.
tailscale ip -4

# Tailscale IPv6 주소만 표시합니다.
tailscale ip -6
statusTailscale 데몬(tailscaled)의 현재 상태와 다른 피어(peer)와의 연결 상태를 보여줍니다.사용 예시:# 현재 연결 상태를 사람이 읽기 좋은 형태로 보여줍니다.
tailscale status

# 상태 정보를 JSON 형식으로 출력합니다. (스크립트에서 활용하기 용이)
tailscale status --json
pingTailscale 네트워크를 통해 다른 장치에 ping을 보내 연결성과 레이턴시를 테스트합니다. ICMP가 아닌 TCP 기반으로 작동합니다.사용 예시:# 'my-server'라는 호스트 이름을 가진 장치에 ping을 보냅니다.
tailscale ping my-server

# 10번만 ping을 보냅니다.
tailscale ping --c=10 my-laptop

# 중단할 때까지 계속 ping을 보냅니다.
tailscale ping --ts=0 my-server
sshTailscale SSH를 사용하여 Tailnet 내의 다른 장치에 안전하게 접속합니다.사용 예시:# 현재 로컬 사용자와 동일한 이름으로 'my-server'에 SSH 접속합니다.
tailscale ssh my-server

# 'admin' 사용자로 'my-server'에 SSH 접속합니다.
tailscale ssh admin@my-server

# 'my-server'에서 원격으로 'ls -l /var/www' 명령어를 실행합니다.
tailscale ssh my-server 'ls -l /var/www'
serve & funnelserve는 Tailnet 내에서, funnel은 공용 인터넷으로 로컬 콘텐츠나 서비스를 노출합니다.사용 예시:# 현재 디렉토리의 파일을 Tailnet 내의 다른 장치에 웹으로 제공합니다.
tailscale serve .

# 로컬에서 실행 중인 3000번 포트의 서비스를 Tailnet으로 프록시합니다.
tailscale serve localhost:3000

# 로컬 8080 포트를 공용 인터넷에 노출합니다. (Funnel)
tailscale funnel 8080

# 로컬 3000번 포트의 서비스를 백그라운드에서 공용 인터넷으로 노출합니다.
tailscale funnel --bg localhost:3000
fileTailscale 네트워크를 통해 장치 간에 파일을 안전하게 전송합니다.사용 예시:# 'my-laptop'으로 'report.pdf' 파일을 보냅니다.
tailscale file cp report.pdf my-laptop:

# 'my-server'로부터 '/tmp/log.txt' 파일을 현재 디렉토리로 가져옵니다.
tailscale file get my-server:/tmp/log.txt .

# 파일 수신함에 있는 파일 목록을 확인합니다.
tailscale file ls
bugreport문제 진단에 사용할 수 있는 고유 식별자를 생성하여 Tailscale 지원팀에 버그를 보고할 때 사용합니다.사용 예시:# 진단 정보를 수집하고 공유 가능한 버그 리포트 ID를 생성합니다.
tailscale bugreport
whoisTailscale IP 주소에 해당하는 장치와 사용자 정보를 확인합니다.사용 예시:# 특정 Tailscale IP에 대한 정보를 조회합니다.
tailscale whois 100.110.120.130
drive로컬 디렉토리를 Tailnet의 다른 장치들과 Windows 파일 공유처럼 공유합니다.사용 예시:# 'my-share'라는 이름으로 '/Users/me/documents' 디렉토리를 공유합니다.
tailscale drive share my-share /Users/me/documents

# 현재 공유 중인 목록을 확인합니다.
tailscale drive list
