# Tailscale CLI 명령어

Tailscale CLI의 주요 sub-command 설명과 사용 예시다.

## up

현재 장치를 Tailscale 네트워크에 연결하고 활성화한다. 로그인 과정이 필요할 수 있다.

```bash
# 기본 연결
tailscale up

# 특정 Exit Node를 통해 모든 인터넷 트래픽 라우팅
tailscale up --exit-node=exit-node-name
```

### Subnet Router 설정

로컬 서브넷을 다른 Tailscale 장치가 접근할 수 있도록 알린다.

```bash
# iptables 및 IP forwarding 설정
sudo iptables -t nat -A POSTROUTING -o tailscale0 -j MASQUERADE
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

`/etc/sysctl.conf` 파일에 다음 줄을 추가하면 영구 설정으로 유지할 수 있다.

```conf
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
```

```bash
# Tailscale을 통해 로컬 서브넷 광고
tailscale up --advertise-routes=192.168.1.0/24,10.0.0.0/24

# SSH를 통해 이 장치에 접근 허용
tailscale up --ssh

# 인증키를 사용하여 로그인 없이 장치 연결
tailscale up --authkey=tskey-auth-abcdef123456
```

## down

Tailscale 네트워크 연결을 끊는다.

```bash
tailscale down
```

## set

Tailscale 설정을 변경한다.

```bash
# 장치 호스트 이름 변경
tailscale set --hostname=my-new-server

# 다른 장치가 advertise하는 라우팅 경로 수락
tailscale set --accept-routes=true

# Tailscale DNS 설정 비활성화
tailscale set --accept-dns=false
```

## login / logout

`login`은 Tailscale 계정에 로그인하고, `logout`은 연결을 끊고 현재 장치의 인증을 무효화한다.

```bash
# 웹 브라우저를 통해 Tailscale 계정에 로그인
tailscale login

# 현재 장치를 Tailscale 네트워크에서 로그아웃하고 키 만료
tailscale logout
```

## switch

여러 Tailscale 계정을 사용하는 경우 다른 계정으로 전환한다.

```bash
tailscale switch <account@example.com>
```

## netcheck

로컬 네트워크 상태를 진단하고 Tailscale 연결에 영향을 줄 수 있는 문제를 분석한다.

```bash
# 현재 네트워크 상태 1회 진단
tailscale netcheck

# 5초마다 주기적으로 네트워크 상태 진단
tailscale netcheck --watch
```

## ip

현재 장치의 Tailscale IP 주소를 표시한다.

```bash
# IPv4와 IPv6 주소 모두 표시
tailscale ip

# IPv4 주소만 표시
tailscale ip -4

# IPv6 주소만 표시
tailscale ip -6
```

## status

Tailscale 데몬(`tailscaled`)의 현재 상태와 다른 peer와의 연결 상태를 표시한다.

```bash
# 사람이 읽기 좋은 형태로 상태 출력
tailscale status

# JSON 형식으로 상태 출력
tailscale status --json
```

## ping

Tailscale 네트워크를 통해 다른 장치에 ping을 보내 연결성과 latency를 테스트한다. ICMP가 아니라 TCP 기반으로 동작한다.

```bash
# my-server에 ping
tailscale ping my-server

# 10번만 ping
tailscale ping --c=10 my-laptop

# 중단할 때까지 ping
tailscale ping --ts=0 my-server
```

## ssh

Tailscale SSH를 사용하여 Tailnet 내의 다른 장치에 접속한다.

```bash
# 현재 로컬 사용자와 동일한 이름으로 my-server에 SSH 접속
tailscale ssh my-server

# admin 사용자로 my-server에 SSH 접속
tailscale ssh admin@my-server

# my-server에서 원격 명령 실행
tailscale ssh my-server 'ls -l /var/www'
```

## serve / funnel

`serve`는 Tailnet 내부에, `funnel`은 공용 인터넷에 로컬 콘텐츠나 서비스를 노출한다.

```bash
# 현재 디렉토리의 파일을 Tailnet 내부에 웹으로 제공
tailscale serve .

# 로컬 3000번 포트 서비스를 Tailnet으로 프록시
tailscale serve localhost:3000

# 로컬 8080 포트를 공용 인터넷에 노출
tailscale funnel 8080

# 로컬 3000번 포트 서비스를 백그라운드에서 공용 인터넷에 노출
tailscale funnel --bg localhost:3000
```

## file

Tailscale 네트워크를 통해 장치 간 파일을 전송한다.

```bash
# my-laptop으로 report.pdf 전송
tailscale file cp report.pdf my-laptop:

# my-server의 /tmp/log.txt를 현재 디렉토리로 가져오기
tailscale file get my-server:/tmp/log.txt .

# 파일 수신함 목록 확인
tailscale file ls
```

## bugreport

문제 진단에 사용할 수 있는 고유 식별자를 생성하여 Tailscale 지원팀에 버그를 보고할 때 사용한다.

```bash
tailscale bugreport
```

## whois

Tailscale IP 주소에 해당하는 장치와 사용자 정보를 확인한다.

```bash
tailscale whois 100.110.120.130
```

## drive

로컬 디렉토리를 Tailnet의 다른 장치들과 Windows 파일 공유처럼 공유한다.

```bash
# my-share 이름으로 /Users/me/documents 공유
tailscale drive share my-share /Users/me/documents

# 현재 공유 중인 목록 확인
tailscale drive list
```
