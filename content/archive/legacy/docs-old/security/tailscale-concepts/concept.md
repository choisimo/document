# Tailscale CLI 명령어

> **버전·정책 확인:** 실행 전 `tailscale version`, `tailscale help`, 하위 명령의 `--help`를 기록한다. 연결 상태와 실제 앱 통신·정책 허용은 별도로 확인한다. 경로·DNS·공개 노출 변경은 변경 전후와 복구 방법을 기록한다. 이 문서의 예시는 일괄 실행 목록이 아니다.

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

필요한 CIDR만 광고하고 관리 정책에서 승인한 뒤 수신 피어의 경로 수락과 실제 접근 허용·거부를 확인한다. [서브넷 라우터 문서](https://tailscale.com/docs/features/subnet-routers)에 따라 OS forwarding·라우팅·SNAT를 함께 검토한다.

```bash
# 선택한 주소 계열에 필요한 IP forwarding 설정; 임의 NAT 규칙부터 추가하지 않는다.
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
tailscale set --ssh=true

# 인증키를 사용하여 로그인 없이 장치 연결
tailscale up --auth-key=file:/run/secrets/tailscale-authkey
```

## down

현재 장치의 Tailscale 연결을 끊는다. 장치 등록 삭제와는 다르며 이 경로로 관리 중이면 원격 접근도 끊길 수 있다.

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
tailscale switch account@example.com
```

## netcheck

로컬 네트워크 상태를 진단하고 Tailscale 연결에 영향을 줄 수 있는 문제를 분석한다.

```bash
# 현재 네트워크 상태 1회 진단
tailscale netcheck

# 반복 진단 옵션은 설치한 버전에서 확인
tailscale netcheck --help
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

Tailscale 전용 경로의 연결을 진단한다. 일반 ICMP ping과 같은 동작으로 가정하지 않으며 지원되는 ICMP·TSMP 등의 진단 방식은 명령 도움말에서 선택한다. TCP 기반이라는 단정은 하지 않는다.

```bash
# my-server에 ping
tailscale ping my-server

# 10번만 ping
tailscale ping --until-direct=false --c=10 my-laptop

# 시간 제한·진단 방식 등 지원 옵션 확인
tailscale ping --help
```

## ssh

지원 OS·버전에서 Tailscale SSH를 사용한다. 활성화만으로 접근이 허용되는 것은 아니며 tailnet SSH 정책과 OS 사용자 조건을 확인한다.

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

# 수신 측에서 로컬 Taildrop 수신함의 파일을 지정 디렉터리로 이동
tailscale file get ./received

# 사용할 수 있는 수신 옵션 확인
tailscale file get --help
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

Taildrive로 로컬 디렉터리를 공유한다. 지원 클라이언트·OS·정책을 확인하며 Windows SMB 공유와 같은 프로토콜이라고 가정하지 않는다.

```bash
# my-share 이름으로 /Users/me/documents 공유
tailscale drive share my-share /Users/me/documents

# 현재 공유 중인 목록 확인
tailscale drive list
```

## 비밀·공개 범위·완료 증거

인증 키 파일은 배포 시스템이 제한된 권한으로 주입하고 일회성·만료·태그 범위를 최소화한다. 등록 후 장치·정책·키 만료를 확인한다. [인증 키 파일 입력](https://tailscale.com/docs/reference/tailscale-cli/up)의 지원 여부도 설치 버전에서 확인한다.

Serve와 Funnel은 각각 tailnet과 공개 인터넷의 노출 범위를 구분한다. TLS·앱 인증·허용 경로·로그·중단 절차를 정하고 실제 외부 요청과 차단 요청, 재시작 및 중단 후 결과를 확인한다. 연결 자체의 완료는 `up` 성공만이 아니라 `status`·`ping`·실제 애플리케이션 포트와 정책 거부 시험으로 판단한다.

명령과 플래그는 [공식 CLI 참조](https://tailscale.com/docs/reference/tailscale-cli)를 대조한다. Taildrop 수신은 원격 파일 시스템 탐색 기능이 아니다.
