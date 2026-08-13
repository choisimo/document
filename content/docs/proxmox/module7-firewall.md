# Module 7: Proxmox VE Firewall

## 학습 목표
이 모듈의 설명과 실습을 완료하면 다음 항목을 설명하고 test matrix로 검증할 수 있어야 합니다:
- PVE Firewall의 분산 아키텍처와 계층 구조
- 방향(Direction)과 영역(Zone) 개념
- 방화벽 규칙 문법과 매크로 활용
- Security Group, IP Set, Alias 관리
- iptables/nftables 기반 규칙 생성 흐름

---

## 적용 범위와 학습 검증 기준

- **범위:** Proxmox VE와 firewall backend 버전, cluster/node/VM/CT 계층, bridge·SDN topology, IPv4/IPv6, enable flag와 effective input/output policy를 기록합니다. `iptables`·`nftables` 상태와 생성 규칙은 설치 버전에서 확인합니다.
- **안전 전제:** Web UI·SSH·cluster communication의 source와 복구 console을 먼저 확보합니다. datacenter, node, guest, security group과 자동 생성 규칙을 합친 결과가 실제 정책입니다.
- **사실과 추론:** 설정 파일, compiled ruleset, counter, log와 packet trace는 근거이고, “어느 계층이 차단했다”는 설명은 rule hit를 확인하기 전까지 가설입니다.
- **실패·완료:** management lockout, asymmetric rule, IPv6 우회, east-west traffic, migration 후 policy와 service restart를 시험합니다. 허용·차단 test matrix와 rollback이 통과할 때 모듈 및 변경 작업을 완료로 판정합니다.

---

## 1. Firewall 아키텍처 개요

### 1.1 왜 분산 방화벽인가?

전통적인 중앙 집중형 방화벽과 달리, PVE Firewall은 **각 노드에서 독립적으로 실행**됩니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Proxmox VE Cluster Firewall                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│   │     Node 1      │  │     Node 2      │  │     Node 3      │        │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤        │
│   │ pve-firewall    │  │ pve-firewall    │  │ pve-firewall    │        │
│   │ (iptables)      │  │ (iptables)      │  │ (iptables)      │        │
│   │                 │  │                 │  │                 │        │
│   │ ┌─────┐ ┌─────┐│  │ ┌─────┐ ┌─────┐│  │ ┌─────┐ ┌─────┐│        │
│   │ │VM101│ │VM102││  │ │VM103│ │VM104││  │ │VM105│ │CT106││        │
│   │ └─────┘ └─────┘│  │ └─────┘ └─────┘│  │ └─────┘ └─────┘│        │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│            │                    │                    │                  │
│            └────────────────────┼────────────────────┘                  │
│                                 │                                       │
│                    ┌────────────▼────────────┐                         │
│                    │   /etc/pve/firewall/    │                         │
│                    │      cluster.fw         │                         │
│                    │   (pmxcfs - 자동 동기화)  │                         │
│                    └─────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**분산 아키텍처의 장점:**
- **고대역폭**: 중앙 병목 없이 각 노드에서 필터링
- **노드 내부 경로**: 일부 VM 간 traffic은 물리 NIC를 통과하지 않을 수 있지만 bridge, host service와 policy를 포함한 완전 격리는 별도 rule test가 필요
- **자동 동기화**: pmxcfs를 통해 설정 자동 배포
- **IPv4/IPv6 동시 지원**: 투명한 듀얼 스택 필터링

### 1.2 Firewall 서비스 데몬

```
┌─────────────────────────────────────────────────────────────┐
│                   PVE Firewall Services                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   pve-firewall      │    │   pvefw-logger      │        │
│  │   (main daemon)     │    │   (NFLOG daemon)    │        │
│  ├─────────────────────┤    ├─────────────────────┤        │
│  │ • 설정 파일 모니터링   │    │ • 로그 수집          │        │
│  │ • iptables 규칙 생성  │    │ • /var/log/pve-     │        │
│  │ • 변경 시 자동 업데이트 │    │   firewall.log      │        │
│  └──────────┬──────────┘    └─────────────────────┘        │
│             │                                               │
│             ▼                                               │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Linux Kernel (netfilter)            │       │
│  ├─────────────────────────────────────────────────┤       │
│  │  iptables (legacy)  │  nftables (tech preview)  │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 방향(Direction)과 영역(Zone)

### 2.1 트래픽 방향 (Direction)

PVE Firewall은 3가지 트래픽 방향을 정의합니다:

```
┌─────────────────────────────────────────────────────────────┐
│                    Traffic Directions                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   외부 네트워크                                               │
│        │                                                    │
│        │  ┌─────┐                                          │
│        │  │ IN  │  도착하는 트래픽 (외부 → Zone)              │
│        ▼  └─────┘                                          │
│   ┌─────────────────────────────────────────┐              │
│   │              ZONE (Host/VM/VNet)         │              │
│   └─────────────────────────────────────────┘              │
│        │  ┌─────┐                                          │
│        │  │ OUT │  떠나는 트래픽 (Zone → 외부)               │
│        ▼  └─────┘                                          │
│   외부 네트워크                                               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  FORWARD: Zone을 통과하는 트래픽 (라우팅/NAT)          │  │
│   │           * nftables (proxmox-firewall)에서만 지원    │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 방화벽 영역 (Zone)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Firewall Zones                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         HOST Zone                                  │ │
│  │  • 물리 노드로 들어오고 나가는 트래픽                                  │ │
│  │  • Datacenter 또는 Host 레벨에서 규칙 정의                           │ │
│  │  • Host 레벨 규칙이 Datacenter 규칙보다 우선                         │ │
│  │                                                                    │ │
│  │  설정 파일:                                                         │ │
│  │  • /etc/pve/firewall/cluster.fw (클러스터 전체)                     │ │
│  │  • /etc/pve/nodes/<nodename>/host.fw (특정 호스트)                  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                          VM Zone                                   │ │
│  │  • VM/CT로 들어오고 나가는 트래픽                                     │ │
│  │  • FORWARD 규칙 불가 (IN/OUT만 가능)                                │ │
│  │  • 각 네트워크 인터페이스별 방화벽 활성화 가능                          │ │
│  │                                                                    │ │
│  │  설정 파일: /etc/pve/firewall/<VMID>.fw                            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         VNet Zone                                  │ │
│  │  • SDN VNet을 통과하는 트래픽 (guest↔guest, host↔guest)            │ │
│  │  • FORWARD 방향만 가능 (양방향 규칙 필요)                            │ │
│  │  • nftables (proxmox-firewall)에서만 지원                          │ │
│  │                                                                    │ │
│  │  설정 파일: /etc/pve/sdn/firewall/<vnet_name>.fw                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 설정 파일 구조

### 3.1 계층적 설정 파일

```
/etc/pve/
├── firewall/
│   └── cluster.fw              # 클러스터 전체 설정 (Datacenter 레벨)
├── nodes/
│   ├── node1/
│   │   └── host.fw             # node1 호스트 전용 설정
│   ├── node2/
│   │   └── host.fw             # node2 호스트 전용 설정
│   └── node3/
│       └── host.fw             # node3 호스트 전용 설정
└── firewall/
    ├── 100.fw                  # VM 100 방화벽 설정
    ├── 101.fw                  # VM 101 방화벽 설정
    └── 102.fw                  # CT 102 방화벽 설정
```

### 3.2 cluster.fw 구조

```bash
# /etc/pve/firewall/cluster.fw

[OPTIONS]
# 클러스터 전체 방화벽 활성화 (기본값: 0 = 비활성)
enable: 1

# ebtables 규칙 활성화
ebtables: 1

# 로그 레이트 제한 설정
log_ratelimit: enable=1,rate=1/second,burst=5

# 기본 정책
policy_in: DROP
policy_out: ACCEPT

[RULES]
# 클러스터 전체에 적용되는 규칙
IN ACCEPT -source 10.0.0.0/8 -p tcp -dport 22 -log info
IN ACCEPT -source 192.168.0.0/16 -p tcp -dport 8006

[IPSET management]
# 관리 IP 목록 (자동으로 GUI/SSH/SPICE 허용)
192.168.1.10
192.168.1.0/24

[IPSET blacklist]
# 차단할 IP 목록 (모든 호스트와 VM에서 차단)
203.0.113.50
198.51.100.0/24

[group webserver]
# 보안 그룹 정의
IN ACCEPT -p tcp -dport 80
IN ACCEPT -p tcp -dport 443

[ALIASES]
# IP 별칭 정의
local_network 192.168.1.0/24
monitoring_server 10.0.0.50
```

### 3.3 host.fw 구조

```bash
# /etc/pve/nodes/node1/host.fw

[OPTIONS]
# 호스트 방화벽 활성화
enable: 1

# 로그 레벨 설정
log_level_in: info
log_level_out: info
log_level_forward: info

# 연결 추적 설정
nf_conntrack_max: 524288
nf_conntrack_tcp_timeout_established: 432000

# SYN Flood 보호
protection_synflood: 1
protection_synflood_rate: 200
protection_synflood_burst: 1000

# TCP 플래그 필터링
tcpflags: 1

# SMURFS 공격 방지
nosmurfs: 1

# NDP (IPv6 Neighbor Discovery) 허용
ndp: 1

# nftables 사용 (tech preview)
# nftables: 1

[RULES]
# 호스트 전용 규칙 (cluster.fw 규칙 오버라이드)
IN ACCEPT -source 10.10.10.0/24 -p tcp -dport 3128 -log info
```

### 3.4 VM/CT 방화벽 설정

```bash
# /etc/pve/firewall/100.fw

[OPTIONS]
# VM 방화벽 활성화
enable: 1

# 기본 정책
policy_in: DROP
policy_out: ACCEPT

# DHCP 허용
dhcp: 1

# MAC 필터링
macfilter: 1

# IP 필터링 (IP 스푸핑 방지)
ipfilter: 1

# NDP 허용 (IPv6)
ndp: 1

# 로그 레벨
log_level_in: warning
log_level_out: nolog

[RULES]
# VM 전용 규칙
IN SSH(ACCEPT) -i net0 -source 192.168.1.0/24
IN ACCEPT -p tcp -dport 80
IN ACCEPT -p tcp -dport 443
IN ACCEPT -p icmp
OUT ACCEPT

# 보안 그룹 적용
GROUP webserver

[IPSET ipfilter-net0]
# net0 인터페이스에서 허용되는 소스 IP (IP 스푸핑 방지)
192.168.1.100

[ALIASES]
db_server 192.168.1.50
```

---

## 4. 방화벽 규칙 문법

### 4.1 기본 규칙 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Firewall Rule Syntax                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   DIRECTION ACTION [OPTIONS]                                           │
│                                                                         │
│   |DIRECTION ACTION [OPTIONS]    # 비활성화된 규칙 (| 접두사)            │
│                                                                         │
│   DIRECTION MACRO(ACTION) [OPTIONS]   # 매크로 사용                     │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  DIRECTION:                                                             │
│  • IN      - 들어오는 트래픽                                             │
│  • OUT     - 나가는 트래픽                                               │
│  • FORWARD - 통과하는 트래픽 (nftables만 지원)                           │
│                                                                         │
│  ACTION:                                                                │
│  • ACCEPT  - 트래픽 허용                                                 │
│  • DROP    - 트래픽 무시 (응답 없음)                                     │
│  • REJECT  - 트래픽 거부 (ICMP 에러 응답)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 규칙 옵션

```bash
# 규칙에 사용 가능한 옵션들

--source <string>     # 소스 IP/네트워크/IP셋/별칭
                      # 예: 192.168.1.0/24, +management, myalias

--dest <string>       # 목적지 IP/네트워크/IP셋/별칭
                      # 예: 10.0.0.1, 10.0.0.1-10.0.0.100

--proto <string>      # 프로토콜 (tcp, udp, icmp, etc.)
                      # /etc/protocols에 정의된 이름 또는 번호

--sport <string>      # 소스 포트 (TCP/UDP)
                      # 예: 22, 80:85, 80,443,8080

--dport <string>      # 목적지 포트 (TCP/UDP)
                      # 예: 443, 1024:65535

--iface <string>      # 네트워크 인터페이스
                      # VM: net0, net1, etc.
                      # Host: eth0, vmbr0, etc.

--icmp-type <string>  # ICMP 타입 (proto가 icmp일 때)
                      # 예: echo-request, echo-reply

--log <level>         # 로그 레벨
                      # nolog, emerg, alert, crit, err, warning, notice, info, debug
```

### 4.3 규칙 예제

```bash
[RULES]
# 기본 규칙
IN ACCEPT -p tcp -dport 22                    # SSH 허용
IN ACCEPT -p tcp -dport 80,443                # HTTP/HTTPS 허용
IN DROP                                        # 나머지 모두 차단
OUT ACCEPT                                     # 나가는 트래픽 모두 허용

# 소스 IP 제한
IN ACCEPT -source 192.168.1.0/24 -p tcp -dport 22
IN ACCEPT -source 10.0.0.1-10.0.0.100 -p tcp -dport 3306

# IP 셋 사용
IN ACCEPT -source +management -p tcp -dport 8006
IN DROP -source +blacklist

# 별칭 사용
IN ACCEPT -source myserver -p tcp -dport 5432

# 인터페이스 지정 (VM)
IN ACCEPT -i net0 -p tcp -dport 80
IN ACCEPT -i net1 -p tcp -dport 3306

# 로그 기록
IN ACCEPT -p tcp -dport 22 -log info
IN DROP -log warning

# 비활성화된 규칙
|IN ACCEPT -p tcp -dport 8080                  # 임시 비활성화

# ICMP
IN ACCEPT -p icmp -icmp-type echo-request
OUT ACCEPT -p icmp -icmp-type echo-reply
```

---

## 5. 매크로 (Macros)

### 5.1 매크로 개념

매크로는 일반적인 서비스에 대한 **사전 정의된 규칙 세트**입니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Macro Usage                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   DIRECTION MACRO(ACTION) [OPTIONS]                                    │
│                                                                         │
│   예시:                                                                  │
│   IN SSH(ACCEPT)                    # SSH 허용 (tcp/22)                 │
│   IN SSH(ACCEPT) -source 10.0.0.0/8 # 특정 소스에서만 SSH 허용           │
│   IN HTTP(ACCEPT)                   # HTTP 허용 (tcp/80)                │
│   IN HTTPS(ACCEPT)                  # HTTPS 허용 (tcp/443)              │
│   IN Ping(ACCEPT)                   # ICMP ping 허용                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 주요 매크로 목록

```
┌──────────────────┬─────────────────────────────────────────────────────┐
│     Macro        │                    Description                       │
├──────────────────┼─────────────────────────────────────────────────────┤
│ SSH              │ TCP 22 - Secure Shell                                │
│ HTTP             │ TCP 80 - HTTP Web Server                             │
│ HTTPS            │ TCP 443 - HTTPS Web Server                           │
│ DNS              │ TCP/UDP 53 - Domain Name System                      │
│ FTP              │ TCP 21 - File Transfer Protocol                      │
│ SMTP             │ TCP 25 - Mail Transfer                               │
│ SMTPs            │ TCP 465 - Secure SMTP                                │
│ IMAP             │ TCP 143 - Internet Mail Access Protocol              │
│ IMAPs            │ TCP 993 - Secure IMAP                                │
│ POP3             │ TCP 110 - Post Office Protocol                       │
│ POP3s            │ TCP 995 - Secure POP3                                │
│ NTP              │ UDP 123 - Network Time Protocol                      │
│ SNMP             │ UDP 161 - Simple Network Management Protocol         │
│ LDAP             │ TCP 389 - LDAP Directory Service                     │
│ LDAPs            │ TCP 636 - Secure LDAP                                │
│ MySQL            │ TCP 3306 - MySQL Database                            │
│ PostgreSQL       │ TCP 5432 - PostgreSQL Database                       │
│ MSSQL            │ TCP 1433 - Microsoft SQL Server                      │
│ RDP              │ TCP 3389 - Remote Desktop Protocol                   │
│ VNC              │ TCP 5900 - Virtual Network Computing                 │
│ Ping             │ ICMP echo-request - Ping                             │
│ Telnet           │ TCP 23 - Telnet (insecure)                           │
│ Syslog           │ UDP 514 - System Logging                             │
│ Ceph             │ TCP 6789,6800:7300 - Ceph Storage Cluster            │
│ Corosync         │ UDP 5405:5412 - Cluster Communication                │
│ SPICE            │ TCP 3128 - SPICE Proxy                               │
│ Web              │ TCP 80,443 - HTTP and HTTPS                          │
└──────────────────┴─────────────────────────────────────────────────────┘
```

### 5.3 매크로 활용 예제

```bash
# /etc/pve/firewall/100.fw (웹 서버 VM)

[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT

[RULES]
# 매크로를 사용한 간결한 규칙
IN SSH(ACCEPT) -source 192.168.1.0/24
IN HTTP(ACCEPT)
IN HTTPS(ACCEPT)
IN Ping(ACCEPT)

# MySQL은 내부 네트워크에서만
IN MySQL(ACCEPT) -source 10.0.0.0/8
```

---

## 6. Security Groups

### 6.1 Security Group 개념

Security Group은 **재사용 가능한 규칙 모음**입니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Security Group Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   cluster.fw                                                            │
│   ┌─────────────────────────────────────────┐                          │
│   │ [group webserver]                       │                          │
│   │ IN ACCEPT -p tcp -dport 80              │                          │
│   │ IN ACCEPT -p tcp -dport 443             │                          │
│   │                                         │                          │
│   │ [group database]                        │                          │
│   │ IN ACCEPT -p tcp -dport 3306            │                          │
│   │ IN ACCEPT -p tcp -dport 5432            │                          │
│   │                                         │                          │
│   │ [group monitoring]                      │                          │
│   │ IN ACCEPT -p tcp -dport 9090            │                          │
│   │ IN ACCEPT -p tcp -dport 9100            │                          │
│   └─────────────────────────────────────────┘                          │
│                    │                                                    │
│                    │ 참조                                               │
│                    ▼                                                    │
│   100.fw (웹서버VM)     101.fw (DB VM)       102.fw (모니터링 VM)        │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │
│   │ [RULES]      │    │ [RULES]      │    │ [RULES]      │            │
│   │ GROUP webserver   │ GROUP database│    │ GROUP monitoring          │
│   │ GROUP monitoring  │ GROUP monitoring   │                          │
│   └──────────────┘    └──────────────┘    └──────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Security Group 정의 및 사용

```bash
# /etc/pve/firewall/cluster.fw

# 웹 서버 그룹 정의
[group webserver]
IN ACCEPT -p tcp -dport 80
IN ACCEPT -p tcp -dport 443
IN ACCEPT -p tcp -dport 8080

# 데이터베이스 그룹 정의
[group database]
IN ACCEPT -p tcp -dport 3306 -source +app_servers
IN ACCEPT -p tcp -dport 5432 -source +app_servers

# SSH 관리 그룹
[group ssh-management]
IN SSH(ACCEPT) -source +management

# 모니터링 그룹
[group monitoring]
IN ACCEPT -p tcp -dport 9090   # Prometheus
IN ACCEPT -p tcp -dport 9100   # Node Exporter
IN ACCEPT -p tcp -dport 9093   # Alertmanager

[IPSET app_servers]
192.168.1.10
192.168.1.11
192.168.1.12
```

```bash
# /etc/pve/firewall/100.fw (웹 서버 VM)

[OPTIONS]
enable: 1

[RULES]
GROUP webserver
GROUP ssh-management
GROUP monitoring
IN Ping(ACCEPT)
```

---

## 7. IP Sets

### 7.1 IP Set 유형

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          IP Set Types                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Standard IP Set: management                                     │   │
│  │ • 관리 IP 목록 (호스트 방화벽에만 적용)                            │   │
│  │ • GUI (8006), VNC (5900-5999), SPICE (3128), SSH (22) 자동 허용  │   │
│  │ • cluster_network 별칭이 자동 포함                               │   │
│  │                                                                  │   │
│  │ [IPSET management]                                              │   │
│  │ 192.168.1.10                                                    │   │
│  │ 192.168.1.0/24                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Standard IP Set: blacklist                                      │   │
│  │ • 모든 호스트와 VM에서 차단되는 IP 목록                            │   │
│  │ • 클러스터 전체에서 DROP 처리                                     │   │
│  │                                                                  │   │
│  │ [IPSET blacklist]                                               │   │
│  │ 203.0.113.0/24                                                  │   │
│  │ 198.51.100.50                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Standard IP Set: ipfilter-net*                                  │   │
│  │ • VM 인터페이스별 IP 스푸핑 방지                                   │   │
│  │ • 허용된 소스 IP만 해당 인터페이스에서 사용 가능                     │   │
│  │ • Container는 설정된 IP가 자동 포함                               │   │
│  │                                                                  │   │
│  │ # /etc/pve/firewall/<VMID>.fw                                   │   │
│  │ [IPSET ipfilter-net0]                                           │   │
│  │ 192.168.1.100                                                   │   │
│  │ 192.168.1.101                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Custom IP Set                                                   │   │
│  │ • 사용자 정의 IP 그룹                                             │   │
│  │ • 규칙에서 +name으로 참조                                         │   │
│  │                                                                  │   │
│  │ [IPSET trusted_networks]                                        │   │
│  │ 10.0.0.0/8                                                      │   │
│  │ 172.16.0.0/12                                                   │   │
│  │ 192.168.0.0/16                                                  │   │
│  │                                                                  │   │
│  │ [RULES]                                                         │   │
│  │ IN ACCEPT -source +trusted_networks -p tcp -dport 22            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 IP Set 관리 예제

```bash
# /etc/pve/firewall/cluster.fw

# 관리 네트워크
[IPSET management]
192.168.1.10        # 관리자 워크스테이션
192.168.1.0/24      # 관리 서브넷
10.0.0.0/8          # 내부 네트워크

# 차단 목록
[IPSET blacklist]
# 악성 IP
203.0.113.50
198.51.100.0/24
# 특정 국가 IP 범위 (예시)
# 1.0.0.0/8

# 애플리케이션 서버 그룹
[IPSET app_servers]
192.168.1.20        # app-server-1
192.168.1.21        # app-server-2
192.168.1.22        # app-server-3

# 데이터베이스 클라이언트
[IPSET db_clients]
192.168.1.20
192.168.1.21
192.168.1.22
192.168.1.30        # reporting server

# 모니터링 시스템
[IPSET monitoring]
192.168.1.50        # prometheus
192.168.1.51        # grafana
```

---

## 8. IP Aliases

### 8.1 Alias 개념

Alias는 IP 주소나 네트워크에 **이름을 부여**합니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           IP Aliases                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [ALIASES]                                                             │
│   local_network 192.168.1.0/24      # 로컬 네트워크                      │
│   backup_server 192.168.1.100       # 백업 서버                          │
│   monitoring 10.0.0.50              # 모니터링 서버                       │
│   external_dns 8.8.8.8              # 외부 DNS                           │
│                                                                         │
│   [RULES]                                                               │
│   IN ACCEPT -source local_network -p tcp -dport 22                     │
│   IN ACCEPT -source monitoring -p tcp -dport 9100                      │
│   OUT ACCEPT -dest external_dns -p udp -dport 53                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Standard Alias: local_network

```bash
# local_network 별칭 확인
pve-firewall localnet

# 출력 예시:
# local hostname: node1
# local IP address: 192.168.1.10
# network auto detect: 192.168.1.0/24
# using detected local_network: 192.168.1.0/24
```

이 별칭은 **클러스터 통신에 자동으로 사용**됩니다 (Corosync, API, SSH).

### 8.3 Alias 오버라이드

```bash
# /etc/pve/firewall/cluster.fw

[ALIASES]
# 자동 감지된 local_network 오버라이드 (단일 호스트/공용 네트워크)
local_network 203.0.113.10

# 커스텀 별칭
primary_dns 8.8.8.8
secondary_dns 8.8.4.4
ntp_server time.google.com
log_server 192.168.1.60
```

---

## 9. 서비스 및 명령어

### 9.1 pve-firewall 명령어

```bash
# 방화벽 시작
pve-firewall start

# 방화벽 중지
pve-firewall stop

# 상태 확인 (설정 오류도 표시)
pve-firewall status

# 로컬 네트워크 정보 확인
pve-firewall localnet

# 규칙 컴파일 (디버깅용)
pve-firewall compile

# 시뮬레이션 (적용 전 테스트)
pve-firewall simulate
```

### 9.2 iptables 규칙 확인

```bash
# 현재 적용된 모든 규칙 확인
iptables-save

# 특정 체인 확인
iptables -L -n -v

# INPUT 체인 상세
iptables -L INPUT -n -v --line-numbers

# FORWARD 체인 상세
iptables -L FORWARD -n -v --line-numbers

# NAT 테이블 확인
iptables -t nat -L -n -v
```

### 9.3 방화벽 로그 확인

```bash
# 방화벽 로그 확인
tail -f /var/log/pve-firewall.log

# 특정 VM 관련 로그
grep "VM 100" /var/log/pve-firewall.log

# journalctl로 확인
journalctl -u pve-firewall -f
```

---

## 10. 기본 방화벽 규칙

### 10.1 활성화 시 기본 허용 트래픽

firewall enable만으로 모든 traffic이 일률적으로 차단되는 것은 아닙니다. effective 동작은 계층별 enable flag, input/output policy, 명시·자동 생성 rule과 backend에 따라 달라지므로 다음 예시와 compiled ruleset을 함께 확인합니다:

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Default Allowed Traffic (Datacenter Level)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  자동 허용되는 트래픽:                                                    │
│                                                                         │
│  • Loopback 인터페이스 (localhost)                                       │
│  • 이미 설정된 연결 (ESTABLISHED, RELATED)                               │
│  • IGMP 프로토콜 (멀티캐스트)                                             │
│  • management IP셋에서:                                                  │
│    - TCP 8006 (Web GUI)                                                 │
│    - TCP 5900-5999 (VNC)                                                │
│    - TCP 3128 (SPICE)                                                   │
│    - TCP 22 (SSH)                                                       │
│  • cluster_network에서:                                                  │
│    - UDP 5405-5412 (Corosync)                                           │
│    - UDP 멀티캐스트                                                      │
│  • ICMP type 3, 4, 11 (에러 메시지)                                      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  자동 DROP (로그 없음):                                                   │
│                                                                         │
│  • 잘못된 연결 상태의 TCP                                                 │
│  • Corosync 외 브로드캐스트/멀티캐스트                                     │
│  • TCP 43, 135, 139, 445                                                │
│  • UDP 135, 137-139, 445, 1900                                          │
│  • 소스 포트 53 UDP (DNS 반사 공격 방지)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Proxmox VE 사용 포트

```
┌───────────────┬──────────┬─────────────────────────────────────────────┐
│     Port      │ Protocol │              Description                     │
├───────────────┼──────────┼─────────────────────────────────────────────┤
│     22        │   TCP    │ SSH                                          │
│    111        │   UDP    │ rpcbind                                      │
│    3128       │   TCP    │ SPICE proxy                                  │
│    5405-5412  │   UDP    │ Corosync cluster                             │
│    5900-5999  │   TCP    │ VNC WebSocket                                │
│    8006       │   TCP    │ Web GUI (HTTPS)                              │
│    60000-60050│   TCP    │ Live migration                               │
│    25         │   TCP    │ sendmail (outgoing)                          │
└───────────────┴──────────┴─────────────────────────────────────────────┘
```

---

## 11. nftables (설치된 PVE 버전에서 지원 상태 확인)

### 11.1 nftables vs iptables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    nftables vs iptables Comparison                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Feature              │ iptables (pve-firewall) │ nftables (proxmox-fw) │
│  ─────────────────────┼─────────────────────────┼───────────────────────│
│  기본 상태             │ Production               │ Tech Preview          │
│  FORWARD 규칙         │ 미지원                    │ 지원                   │
│  VNet 레벨 규칙       │ 미지원                    │ 지원                   │
│  Firewall Bridge      │ fwbrX 생성               │ 불필요                 │
│  REJECT (guest)       │ 지원                      │ DROP으로 대체          │
│  성능                  │ 검증됨                    │ 개선됨                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 nftables 활성화

```bash
# proxmox-firewall 패키지 설치
apt install proxmox-firewall

# 호스트 설정에서 활성화
# /etc/pve/nodes/<node_name>/host.fw
[OPTIONS]
nftables: 1

# 또는 GUI: Host → Firewall → Options → nftables: Yes
```

### 11.3 nftables 관리 명령어

```bash
# 서비스 관리
systemctl start proxmox-firewall
systemctl stop proxmox-firewall
systemctl status proxmox-firewall

# 현재 규칙셋 확인
nft list ruleset

# 컴파일된 규칙 덤프
/usr/libexec/proxmox/proxmox-firewall compile

# 기본 규칙셋 확인
/usr/libexec/proxmox/proxmox-firewall skeleton

# 디버그 로그 활성화
systemctl edit proxmox-firewall
# [Service]
# Environment="PVE_LOG=trace"
```

### 11.4 nftables 트래픽 추적

```bash
#!/usr/sbin/nft -f
# 패킷 추적 테이블 생성 (ICMP만 추적)

table bridge tracebridge
delete table bridge tracebridge

table bridge tracebridge {
    chain trace {
        meta l4proto icmp meta nftrace set 1
    }
    
    chain prerouting {
        type filter hook prerouting priority -350; policy accept;
        jump trace
    }
    
    chain postrouting {
        type filter hook postrouting priority -350; policy accept;
        jump trace
    }
}

# 추적 모니터링
# nft monitor trace

# 추적 테이블 삭제
# nft delete table bridge tracebridge
```

---

## 12. 실전 시나리오

### 12.1 웹 서버 VM 방화벽 설정

```bash
# /etc/pve/firewall/100.fw (웹 서버)

[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT
dhcp: 0
macfilter: 1
ipfilter: 1
log_level_in: info

[RULES]
# 웹 서비스
IN HTTP(ACCEPT)
IN HTTPS(ACCEPT)

# SSH는 관리 네트워크에서만
IN SSH(ACCEPT) -source +management

# 모니터링
IN ACCEPT -source +monitoring -p tcp -dport 9100

# Ping 허용
IN Ping(ACCEPT) -source +management

# 나머지 DROP (로그 기록)
IN DROP -log warning

[IPSET ipfilter-net0]
192.168.1.100
```

### 12.2 데이터베이스 VM 방화벽 설정

```bash
# /etc/pve/firewall/101.fw (MySQL 서버)

[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT
macfilter: 1
ipfilter: 1
log_level_in: warning

[RULES]
# MySQL은 앱 서버에서만
IN MySQL(ACCEPT) -source +app_servers

# SSH는 관리자만
IN SSH(ACCEPT) -source +management

# 모니터링 (MySQL Exporter)
IN ACCEPT -source +monitoring -p tcp -dport 9104

# 백업 서버
IN ACCEPT -source backup_server -p tcp -dport 3306

# Ping (관리용)
IN Ping(ACCEPT) -source +management

[ALIASES]
backup_server 192.168.1.200
```

### 12.3 멀티 티어 아키텍처

```bash
# /etc/pve/firewall/cluster.fw

[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT

# ===== Security Groups =====

[group web-tier]
IN HTTP(ACCEPT)
IN HTTPS(ACCEPT)

[group app-tier]
IN ACCEPT -source +web_servers -p tcp -dport 8080

[group db-tier]
IN ACCEPT -source +app_servers -p tcp -dport 3306
IN ACCEPT -source +app_servers -p tcp -dport 5432

[group common]
IN SSH(ACCEPT) -source +management
IN Ping(ACCEPT) -source +management
IN ACCEPT -source +monitoring -p tcp -dport 9100

# ===== IP Sets =====

[IPSET management]
192.168.1.10
192.168.1.0/24

[IPSET monitoring]
192.168.1.50

[IPSET web_servers]
192.168.1.100
192.168.1.101

[IPSET app_servers]
192.168.1.110
192.168.1.111

[IPSET db_servers]
192.168.1.120
192.168.1.121
```

```bash
# /etc/pve/firewall/100.fw (Web Server 1)
[OPTIONS]
enable: 1

[RULES]
GROUP web-tier
GROUP common

# /etc/pve/firewall/110.fw (App Server 1)
[OPTIONS]
enable: 1

[RULES]
GROUP app-tier
GROUP common

# /etc/pve/firewall/120.fw (DB Server 1)
[OPTIONS]
enable: 1

[RULES]
GROUP db-tier
GROUP common
```

---

## 13. 문제 해결

### 13.1 일반적인 문제

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Common Firewall Issues                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  문제: 방화벽 활성화 후 GUI 접속 불가                                      │
│  ─────────────────────────────────────────                              │
│  원인: management IP셋이 비어있거나 잘못된 IP                             │
│  해결:                                                                   │
│  1. SSH로 직접 접속 (SSH 세션 유지)                                       │
│  2. /etc/pve/firewall/cluster.fw 수정                                   │
│  3. [IPSET management]에 관리자 IP 추가                                  │
│                                                                         │
│  문제: VM 간 통신 불가                                                    │
│  ─────────────────────────                                              │
│  원인: VM 방화벽이 활성화되어 있고 규칙이 없음                              │
│  해결:                                                                   │
│  1. /etc/pve/firewall/<VMID>.fw에서 규칙 추가                            │
│  2. 또는 해당 네트워크 인터페이스의 방화벽 비활성화                          │
│                                                                         │
│  문제: 클러스터 통신 장애                                                  │
│  ─────────────────────────                                              │
│  원인: Corosync 포트가 차단됨                                             │
│  해결:                                                                   │
│  1. local_network 별칭 확인: pve-firewall localnet                       │
│  2. cluster.fw에서 local_network가 올바른지 확인                          │
│  3. UDP 5405-5412 허용 확인                                              │
│                                                                         │
│  문제: 라이브 마이그레이션 실패                                            │
│  ───────────────────────────                                            │
│  원인: 마이그레이션 포트 차단                                              │
│  해결:                                                                   │
│  1. TCP 60000-60050 클러스터 네트워크에서 허용                            │
│  2. 또는 마이그레이션 네트워크를 별도로 지정                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 13.2 디버깅 명령어

```bash
# 방화벽 상태 및 설정 오류 확인
pve-firewall status

# 컴파일된 규칙 확인 (적용 전)
pve-firewall compile

# 현재 iptables 규칙
iptables-save | less

# 특정 체인의 패킷 카운터 확인
iptables -L -n -v | grep -A 20 "Chain PVEFW"

# 로그 실시간 모니터링
tail -f /var/log/pve-firewall.log

# 연결 추적 테이블 확인
conntrack -L

# 연결 추적 통계
conntrack -S
```

### 13.3 긴급 복구

```bash
# 방화벽 즉시 중지 (모든 규칙 제거)
pve-firewall stop

# 또는 iptables 직접 플러시 (위험!)
iptables -F
iptables -X
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

# 방화벽 비활성화 (재부팅 후에도 유지)
# /etc/pve/firewall/cluster.fw
[OPTIONS]
enable: 0
```

---

## 14. 모범 사례

### 14.1 설정 전 체크리스트

```
□ SSH 세션을 유지한 상태에서 방화벽 활성화
□ management IP셋에 관리자 IP 추가
□ local_network 별칭이 올바른지 확인
□ 테스트 VM에서 먼저 규칙 테스트
□ 변경 전 현재 설정 백업
```

### 14.2 규칙 작성 가이드라인

```bash
# 1. 가장 구체적인 규칙을 먼저 배치
IN ACCEPT -source 192.168.1.10 -p tcp -dport 22    # 특정 IP
IN ACCEPT -source 192.168.1.0/24 -p tcp -dport 22  # 서브넷
IN DROP                                              # 기본 거부

# 2. Security Group 활용으로 중복 제거
GROUP webserver
GROUP monitoring
GROUP ssh-management

# 3. IP Set으로 IP 목록 관리
IN ACCEPT -source +trusted_servers -p tcp -dport 3306

# 4. Alias로 가독성 향상
IN ACCEPT -source backup_server -p tcp -dport 22

# 5. 로그 레벨 적절히 설정
IN ACCEPT -p tcp -dport 22 -log info     # 중요 트래픽 로그
IN DROP -log warning                       # 차단 트래픽 경고
```

### 14.3 성능 최적화

```bash
# 로그 레이트 제한 설정
[OPTIONS]
log_ratelimit: enable=1,rate=1/second,burst=5

# 연결 추적 최적화 (고성능 환경)
# /etc/pve/nodes/<node>/host.fw
[OPTIONS]
nf_conntrack_max: 1048576
nf_conntrack_tcp_timeout_established: 86400

# 불필요한 로그 비활성화
log_level_in: nolog
log_level_out: nolog
```

---

## 15. 요약 및 명령어 참조

### 15.1 설정 파일 위치

| 파일 | 용도 |
|------|------|
| `/etc/pve/firewall/cluster.fw` | 클러스터 전체 설정 |
| `/etc/pve/nodes/<node>/host.fw` | 호스트별 설정 |
| `/etc/pve/firewall/<VMID>.fw` | VM/CT별 설정 |
| `/etc/pve/sdn/firewall/<vnet>.fw` | VNet 설정 (nftables) |

### 15.2 주요 명령어

```bash
# 서비스 관리
pve-firewall start|stop|status

# 정보 확인
pve-firewall localnet
pve-firewall compile
pve-firewall simulate

# iptables 확인
iptables-save
iptables -L -n -v

# nftables (tech preview)
systemctl start|stop|status proxmox-firewall
nft list ruleset

# 로그
tail -f /var/log/pve-firewall.log
journalctl -u pve-firewall -f
```

### 15.3 규칙 문법 요약

```bash
# 기본 형식
DIRECTION ACTION [-옵션 값] ...

# 매크로 형식
DIRECTION MACRO(ACTION) [-옵션 값] ...

# 그룹 참조
GROUP groupname

# 주요 옵션
-source IP/네트워크/+ipset/alias
-dest IP/네트워크/+ipset/alias
-p 프로토콜
-sport 소스포트
-dport 목적지포트
-i 인터페이스
-log 로그레벨
```

---

## 다음 모듈 예고

**Module 8: User Management**에서는 다음을 학습합니다:
- 인증 영역(PAM, PVE, LDAP, AD, OpenID Connect)
- 사용자, 그룹, API 토큰 관리
- 역할 기반 접근 제어(RBAC)
- 2단계 인증(TOTP, WebAuthn, YubiKey)
- pveum 명령어 활용
