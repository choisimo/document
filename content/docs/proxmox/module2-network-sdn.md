# Module 2: Network & Software-Defined Network (SDN)

## 네트워크 변경 계약

- 대상 Proxmox VE·ifupdown2·kernel·SDN plugin 버전과 switch/router 구성을 고정합니다.
- 관리 IP, Corosync, storage, migration과 guest traffic을 분리해 영향 경로를 표시합니다. 하나의 bridge 변경이 여러 경로를 동시에 끊을 수 있습니다.
- 물리 console 또는 별도 out-of-band 경로, 현재 설정 backup, 자동 rollback 시간을 확보한 뒤 적용합니다.
- 완료 증거는 config 저장이 아니라 host·guest·cluster·storage 경로, MTU/VLAN, failover와 재부팅 후 상태가 모두 의도와 일치하는 것입니다.

## 학습 목표
이 모듈을 완료하면 다음을 이해하게 됩니다:
- Linux Bridge의 동작 원리와 Proxmox VE에서의 역할
- VLAN, Bonding 등 고급 네트워크 구성
- SDN(Software-Defined Network)의 아키텍처와 Zone 유형
- VNet, Subnet, Controller의 관계와 설정 방법

---

## 1. 네트워크 아키텍처 개요

### 1.1 Proxmox VE 네트워크 스택

Proxmox VE는 Linux networking primitives를 사용하므로 bridge, bond, VLAN과 routing을 조합할 수 있습니다. 유연성은 높지만 안정성은 구성·switch·failure-domain 검증에 달려 있습니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Proxmox VE Network Stack                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   VM 100    │  │   VM 101    │  │   CT 200    │  │   CT 201    │   │
│  │   (tap)     │  │   (tap)     │  │   (veth)    │  │   (veth)    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │          │
│         └────────┬───────┴────────┬───────┴────────┬───────┘          │
│                  │                │                │                   │
│           ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐           │
│           │   vmbr0     │  │   vmbr1     │  │   vmbr2     │           │
│           │ (L2 Bridge) │  │ (L2 Bridge) │  │ (L2 Bridge) │           │
│           └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│                  │                │                │                   │
│           ┌──────▼──────┐        │         ┌──────▼──────┐           │
│           │    eno1     │        │         │   bond0     │           │
│           │  (Physical) │        │         │  (Bonding)  │           │
│           └──────┬──────┘        │         └──────┬──────┘           │
│                  │               │                │                   │
└──────────────────┼───────────────┼────────────────┼───────────────────┘
                   │               │                │
                   ▼               ▼                ▼
            ┌──────────────────────────────────────────┐
            │           Physical Network               │
            │         (Top of Rack Switch)             │
            └──────────────────────────────────────────┘
```

### 1.2 네트워크 인터페이스 계층 구조

```
Layer 4: Application (VM/CT Guest Network)
         ↓
Layer 3: tap/veth (Virtual Interface per Guest)
         ↓
Layer 2: vmbr (Linux Bridge - Virtual Switch)
         ↓
Layer 1: bond/eno (Physical or Bonded Interface)
         ↓
Layer 0: Physical Cable & Switch
```

### 1.3 설정 파일 위치

| 파일 경로 | 용도 |
|-----------|------|
| `/etc/network/interfaces` | 메인 네트워크 설정 |
| `/etc/network/interfaces.new` | 스테이징 설정 (적용 전) |
| `/etc/pve/sdn/` | SDN 클러스터 설정 |
| `/etc/pve/sdn/.running-config` | 현재 적용된 SDN 설정 |

---

## 2. Linux Bridge (vmbr)

### 2.1 Bridge의 역할

Linux Bridge는 소프트웨어로 구현된 Layer 2 스위치입니다. 가상 머신과 물리 네트워크를 연결하는 핵심 컴포넌트입니다.

```
                    ┌─────────────────────────────────────┐
                    │            vmbr0 (Bridge)           │
                    │         "Virtual Switch"            │
                    ├─────────────────────────────────────┤
                    │  Port 1: eno1 (Physical Uplink)     │
                    │  Port 2: tap100i0 (VM 100 NIC 0)    │
                    │  Port 3: tap101i0 (VM 101 NIC 0)    │
                    │  Port 4: veth200i0 (CT 200 eth0)    │
                    └─────────────────────────────────────┘
                                      │
                    MAC Learning Table (FDB):
                    ┌─────────────────────────────────────┐
                    │ MAC Address       │ Port            │
                    ├───────────────────┼─────────────────┤
                    │ AA:BB:CC:DD:EE:01 │ tap100i0        │
                    │ AA:BB:CC:DD:EE:02 │ tap101i0        │
                    │ AA:BB:CC:DD:EE:03 │ veth200i0       │
                    │ 00:11:22:33:44:55 │ eno1 (external) │
                    └───────────────────┴─────────────────┘
```

### 2.2 기본 Bridge 설정

**기본 설정 예제 (`/etc/network/interfaces`):**

```bash
auto lo
iface lo inet loopback

# Physical Interface (no IP, managed by bridge)
iface eno1 inet manual

# Main Bridge for VM/CT networking
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.2/24
    gateway 192.168.10.1
    bridge-ports eno1        # 물리 인터페이스 연결
    bridge-stp off           # Spanning Tree Protocol 비활성화
    bridge-fd 0              # Forward Delay 0초
```

**설정 옵션 설명:**

| 옵션 | 설명 | 권장값 |
|------|------|--------|
| `bridge-ports` | Bridge에 연결할 물리 인터페이스 | 실제 NIC 이름 |
| `bridge-stp` | Spanning Tree Protocol | `off` (단일 업링크) |
| `bridge-fd` | Forward Delay (학습 대기 시간) | `0` (빠른 전환) |
| `bridge-vlan-aware` | VLAN Aware 모드 활성화 | `yes` (VLAN 사용시) |

### 2.3 Bridge 명령어

```bash
# Bridge 목록 조회
brctl show
# 또는 (modern)
bridge link show

# Bridge 상세 정보
bridge -d link show vmbr0

# MAC 학습 테이블 (FDB) 조회
bridge fdb show br vmbr0

# Bridge 통계
ip -s link show vmbr0

# VLAN 정보 (VLAN-aware bridge)
bridge vlan show
```

**출력 예제:**
```
# brctl show
bridge name     bridge id               STP enabled     interfaces
vmbr0           8000.001a2b3c4d5e       no              eno1
                                                        tap100i0
                                                        tap101i0
```

### 2.4 네트워크 구성 모델

#### 2.4.1 Bridged Model (기본)

대표적인 bridged 구성 예시입니다. 해당 bridge와 VLAN에 연결된 guest만 의도한 물리 L2 도메인에 놓이며 filtering과 switch 설정에 따라 범위가 달라집니다.

```
┌──────────────────────────────────────────────────────────────┐
│                    Physical Network                          │
│                    192.168.10.0/24                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Gateway │  │  Host   │  │ VM 100  │  │ VM 101  │        │
│  │  .1     │  │  .2     │  │  .100   │  │  .101   │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                         │                                    │
│                    [Physical Switch]                         │
└──────────────────────────────────────────────────────────────┘
```

#### 2.4.2 Routed Model

각 Guest가 별도의 IP 블록을 사용. 호스팅 환경에서 사용됩니다.

```bash
# /etc/network/interfaces - Routed Setup
auto eno0
iface eno0 inet static
    address 198.51.100.5/29
    gateway 198.51.100.1
    post-up echo 1 > /proc/sys/net/ipv4/ip_forward
    post-up echo 1 > /proc/sys/net/ipv4/conf/eno0/proxy_arp

auto vmbr0
iface vmbr0 inet static
    address 203.0.113.17/28
    bridge-ports none        # 물리 포트 없음!
    bridge-stp off
    bridge-fd 0
```

```
                                Provider Gateway
                                  198.51.100.1
                                       │
                    ┌──────────────────┼──────────────────┐
                    │            eno0  │                  │
                    │        198.51.100.5/29              │
                    │                  │                  │
                    │    ip_forward=1, proxy_arp=1       │
                    │                  │                  │
                    │            vmbr0 │                  │
                    │        203.0.113.17/28             │
                    │     ┌────────────┼────────────┐    │
                    │     │            │            │    │
                    │  VM 100      VM 101       VM 102   │
                    │ .18          .19          .20      │
                    └─────────────────────────────────────┘
```

#### 2.4.3 NAT (Masquerade) Model

단일 Public IP로 여러 Guest가 인터넷 접속. 사설 네트워크 사용.

```bash
# /etc/network/interfaces - NAT Setup
auto eno1
iface eno1 inet static
    address 198.51.100.5/24
    gateway 198.51.100.1

auto vmbr0
iface vmbr0 inet static
    address 10.10.10.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0

    post-up   echo 1 > /proc/sys/net/ipv4/ip_forward
    post-up   iptables -t nat -A POSTROUTING -s '10.10.10.0/24' -o eno1 -j MASQUERADE
    post-down iptables -t nat -D POSTROUTING -s '10.10.10.0/24' -o eno1 -j MASQUERADE
```

---

## 3. Network Bonding (Link Aggregation)

### 3.1 Bonding 개요

Bonding은 여러 물리 NIC를 하나의 논리 인터페이스로 결합하여 대역폭 증가 또는 장애 복구를 제공합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                     bond0 (Logical Interface)               │
│                        LACP 802.3ad                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────┐                      ┌──────────┐          │
│    │   eno1   │                      │   eno2   │          │
│    │ (slave)  │                      │ (slave)  │          │
│    └────┬─────┘                      └────┬─────┘          │
│         │                                 │                 │
└─────────┼─────────────────────────────────┼─────────────────┘
          │                                 │
          ▼                                 ▼
    ┌──────────┐                      ┌──────────┐
    │ Switch   │◄────── MLAG ────────►│ Switch   │
    │ Port 1   │                      │ Port 2   │
    └──────────┘                      └──────────┘
```

### 3.2 Bonding Mode 비교

| Mode | 이름 | 설명 | 스위치 설정 | 사용 사례 |
|------|------|------|-------------|-----------|
| 0 | balance-rr | Round-robin 전송 | 불필요 | 테스트 환경 |
| 1 | active-backup | Active-Standby | 불필요 | **Corosync 권장** |
| 2 | balance-xor | XOR 해시 기반 | 불필요 | 로드 밸런싱 |
| 3 | broadcast | 모든 슬레이브로 전송 | 불필요 | 특수 용도 |
| 4 | 802.3ad | LACP 동적 집계 | **필요** | **스토리지 권장** |
| 5 | balance-tlb | 송신 로드 밸런싱 | 불필요 | 일반 용도 |
| 6 | balance-alb | 송수신 로드 밸런싱 | 불필요 | 일반 용도 |

### 3.3 Bonding 설정 예제

#### 3.3.1 LACP Bond (권장 - 스토리지용)

```bash
# /etc/network/interfaces
auto lo
iface lo inet loopback

iface eno1 inet manual
iface eno2 inet manual

# LACP Bond for Storage Network
auto bond0
iface bond0 inet static
    bond-slaves eno1 eno2
    address 192.168.1.2/24
    bond-miimon 100            # Link 모니터링 간격 (ms)
    bond-mode 802.3ad          # LACP 모드
    bond-xmit-hash-policy layer2+3    # 해시 정책

# Management Bridge
auto vmbr0
iface vmbr0 inet static
    address 10.10.10.2/24
    gateway 10.10.10.1
    bridge-ports eno3
    bridge-stp off
    bridge-fd 0
```

#### 3.3.2 Active-Backup Bond (Corosync용)

```bash
# Active-Backup for Cluster Network
auto bond1
iface bond1 inet static
    bond-slaves eno3 eno4
    address 10.10.20.2/24
    bond-miimon 100
    bond-mode active-backup    # 장애 복구 모드
    bond-primary eno3          # 기본 인터페이스
```

#### 3.3.3 Bond를 Bridge 포트로 사용

```bash
# Bond as Bridge Port (Guest Network Redundancy)
auto bond0
iface bond0 inet manual
    bond-slaves eno1 eno2
    bond-miimon 100
    bond-mode 802.3ad
    bond-xmit-hash-policy layer2+3

auto vmbr0
iface vmbr0 inet static
    address 10.10.10.2/24
    gateway 10.10.10.1
    bridge-ports bond0         # Bond를 업링크로 사용
    bridge-stp off
    bridge-fd 0
```

### 3.4 Bonding 상태 확인

```bash
# Bond 상태 조회
cat /proc/net/bonding/bond0

# 출력 예제:
# Ethernet Channel Bonding Driver: v5.x
# Bonding Mode: IEEE 802.3ad Dynamic link aggregation
# MII Status: up
# 
# Slave Interface: eno1
# MII Status: up
# Link Failure Count: 0
# 
# Slave Interface: eno2
# MII Status: up
# Link Failure Count: 0

# Bond 요약 정보
ip link show bond0

# 슬레이브 상태
cat /sys/class/net/bond0/bonding/slaves
```

---

## 4. VLAN (802.1Q)

### 4.1 VLAN 개요

VLAN(Virtual LAN)은 하나의 물리 네트워크를 여러 개의 논리적 네트워크로 분리합니다.

```
┌────────────────────────────────────────────────────────────────┐
│                    Physical Switch                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   VLAN Trunk Port                      │    │
│  │        (Tagged: VLAN 10, 20, 30)                       │    │
│  └────────────────────────┬───────────────────────────────┘    │
└───────────────────────────┼────────────────────────────────────┘
                            │
              802.1Q Tagged │ Frames
                            │
┌───────────────────────────┼────────────────────────────────────┐
│                     Proxmox VE Host                            │
│                           │                                    │
│                      ┌────▼────┐                               │
│                      │  eno1   │                               │
│                      │ (trunk) │                               │
│                      └────┬────┘                               │
│           ┌───────────────┼───────────────┐                    │
│           │               │               │                    │
│      ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                │
│      │ vmbr0   │    │ vmbr0v10│    │ vmbr0v20│                │
│      │ (native)│    │ VLAN 10 │    │ VLAN 20 │                │
│      └────┬────┘    └────┬────┘    └────┬────┘                │
│           │              │              │                      │
│        VM 100        VM 101          VM 102                    │
│     (untagged)      (VLAN 10)       (VLAN 20)                 │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 VLAN 구성 방법

#### 4.2.1 VLAN-Aware Bridge (권장)

가장 유연하고 효율적인 방법. 단일 Bridge에서 여러 VLAN 처리.

```bash
# /etc/network/interfaces - VLAN Aware Bridge
auto vmbr0
iface vmbr0 inet manual
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes      # VLAN Aware 활성화
    bridge-vids 2-4094         # 허용할 VLAN 범위

# Host Management on VLAN 5
auto vmbr0.5
iface vmbr0.5 inet static
    address 192.168.5.2/24
    gateway 192.168.5.1
```

**VM 설정에서 VLAN 지정:**
```bash
# VM 네트워크 설정 (VLAN 10)
qm set 100 --net0 virtio,bridge=vmbr0,tag=10

# 확인
qm config 100 | grep net0
# net0: virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0,tag=10
```

#### 4.2.2 전통적 VLAN (Legacy)

각 VLAN마다 별도의 인터페이스와 Bridge 생성.

```bash
# VLAN 5 인터페이스 생성
auto eno1.5
iface eno1.5 inet manual

# VLAN 5 전용 Bridge
auto vmbr0v5
iface vmbr0v5 inet static
    address 192.168.5.2/24
    gateway 192.168.5.1
    bridge-ports eno1.5
    bridge-stp off
    bridge-fd 0
```

### 4.3 VLAN과 Bond 조합

```bash
# Bond 생성
auto bond0
iface bond0 inet manual
    bond-slaves eno1 eno2
    bond-miimon 100
    bond-mode 802.3ad
    bond-xmit-hash-policy layer2+3

# Bond 위에 VLAN
iface bond0.5 inet manual

# VLAN 5 Bridge (Management)
auto vmbr0v5
iface vmbr0v5 inet static
    address 192.168.5.2/24
    gateway 192.168.5.1
    bridge-ports bond0.5
    bridge-stp off
    bridge-fd 0

# Native VLAN Bridge (Guest)
auto vmbr0
iface vmbr0 inet manual
    bridge-ports bond0
    bridge-stp off
    bridge-fd 0
```

### 4.4 VLAN 확인 명령어

```bash
# VLAN 인터페이스 목록
cat /proc/net/vlan/config

# Bridge VLAN 정보
bridge vlan show

# 특정 Bridge의 VLAN
bridge vlan show dev vmbr0

# 출력 예제:
# port    vlan ids
# vmbr0   1 PVID Egress Untagged
#         10
#         20
#         30
```

---

## 5. Software-Defined Network (SDN)

### 5.1 SDN 개요

SDN은 클러스터 전체에서 가상 네트워크를 중앙 집중적으로 관리하는 기능입니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Proxmox VE SDN Architecture                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    /etc/pve/sdn/                             │   │
│  │              (Cluster-wide Configuration)                    │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ zones.cfg│  │vnets.cfg │  │subnets.  │  │controller│    │   │
│  │  │          │  │          │  │  cfg     │  │  s.cfg   │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                    SDN Apply │                                      │
│                              ▼                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │   Node 1        │  │   Node 2        │  │   Node 3        │    │
│  │                 │  │                 │  │                 │    │
│  │ /etc/network/   │  │ /etc/network/   │  │ /etc/network/   │    │
│  │ interfaces.d/   │  │ interfaces.d/   │  │ interfaces.d/   │    │
│  │ sdn             │  │ sdn             │  │ sdn             │    │
│  │                 │  │                 │  │                 │    │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │    │
│  │  │   vnet1   │  │  │  │   vnet1   │  │  │  │   vnet1   │  │    │
│  │  │ (bridge)  │  │  │  │ (bridge)  │  │  │  │ (bridge)  │  │    │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 SDN 구성 요소

```
┌─────────────────────────────────────────────────────────────────┐
│                        SDN Hierarchy                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Zone (영역)                                                    │
│    │  - 네트워크 격리의 최상위 단위                            │
│    │  - 기술 유형 정의 (Simple, VLAN, QinQ, VXLAN, EVPN)       │
│    │                                                            │
│    └──► VNet (가상 네트워크)                                   │
│           │  - Zone 내의 가상 브릿지                           │
│           │  - 각 노드에 로컬 인터페이스로 생성                │
│           │                                                     │
│           └──► Subnet (서브넷)                                 │
│                  - IP 주소 범위 정의                           │
│                  - Gateway, DHCP, DNS 설정                     │
│                                                                 │
│  Controller (컨트롤러)                                          │
│    - EVPN Zone의 라우팅 제어                                   │
│    - BGP/OSPF 설정 관리                                        │
│                                                                 │
│  IPAM (IP 주소 관리)                                           │
│    - IP 할당 자동화                                            │
│    - DHCP 통합                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Zone 유형 비교

| Zone Type | 격리 방식 | 노드 간 연결 | 라우팅 | 사용 사례 |
|-----------|-----------|--------------|--------|-----------|
| **Simple** | 격리된 Bridge | ❌ 불가 | NAT/Route | 단일 노드 테스트 |
| **VLAN** | 802.1Q Tag | ✅ L2 | 외부 라우터 | 기존 VLAN 인프라 |
| **QinQ** | Double Tag | ✅ L2 | 외부 라우터 | 대규모 VLAN |
| **VXLAN** | UDP Tunnel | ✅ L2 Overlay | 외부 라우터 | 다중 사이트 |
| **EVPN** | VXLAN+BGP | L2/L3 기능은 버전·구성별 확인 | BGP 제어면 | 다중 노드 overlay 후보 |

### 5.4 SDN 설치 및 활성화

```bash
# SDN 패키지 설치 (8.1+ 기본 설치됨)
apt update
apt install libpve-network-perl

# ifupdown2 확인
apt install ifupdown2

# /etc/network/interfaces 끝에 추가
echo "source /etc/network/interfaces.d/*" >> /etc/network/interfaces

# FRRouting 설치 (EVPN용)
apt install frr-pythontools
systemctl enable frr.service

# DHCP 기능용 (선택)
apt install dnsmasq
systemctl disable --now dnsmasq  # 기본 인스턴스 비활성화
```

---

## 6. Zone 유형별 상세 설정

### 6.1 Simple Zone

가장 기본적인 Zone. 각 노드에서 독립적인 격리 네트워크를 생성합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Simple Zone                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Node 1                          Node 2                         │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │   simple-vnet   │            │   simple-vnet   │            │
│  │ (isolated bridge)│           │ (isolated bridge)│           │
│  │                 │            │                 │            │
│  │  VM100  VM101   │            │  VM200  VM201   │            │
│  │  10.0.0.1  .2   │            │  10.0.0.1  .2   │            │
│  └────────┬────────┘            └────────┬────────┘            │
│           │                              │                      │
│           │        ❌ No connection       │                      │
│           └──────────────────────────────┘                      │
│                                                                 │
│  Note: 동일 IP 사용 가능 (격리됨)                              │
└─────────────────────────────────────────────────────────────────┘
```

**설정 (Web UI: Datacenter → SDN → Zones → Add → Simple):**
- ID: `simplezone`
- Nodes: 적용할 노드 선택

**VNet 생성:**
- ID: `simplevnet`
- Zone: `simplezone`

### 6.2 VLAN Zone

기존 VLAN 인프라를 활용하여 노드 간 L2 연결을 제공합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                       VLAN Zone                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Node 1                 Physical Switch               Node 2   │
│  ┌──────────┐          ┌─────────────┐          ┌──────────┐  │
│  │ vnet10   │          │  VLAN 10    │          │ vnet10   │  │
│  │ (tag:10) │◄────────►│  Trunk      │◄────────►│ (tag:10) │  │
│  │          │          │             │          │          │  │
│  │  VM100   │          │  VLAN 20    │          │  VM200   │  │
│  └──────────┘          └─────────────┘          └──────────┘  │
│                                │                               │
│  ┌──────────┐                 │                ┌──────────┐  │
│  │ vnet20   │◄────────────────┴───────────────►│ vnet20   │  │
│  │ (tag:20) │                                  │ (tag:20) │  │
│  │          │                                  │          │  │
│  │  VM101   │                                  │  VM201   │  │
│  └──────────┘                                  └──────────┘  │
│                                                               │
│  ✅ 동일 VLAN의 VM끼리 L2 통신 가능                          │
└───────────────────────────────────────────────────────────────┘
```

**설정:**
```
# Zone 생성
Zone ID: myvlanzone
Type: VLAN
Bridge: vmbr0          # 기존 VLAN-aware bridge

# VNet 생성
VNet ID: vnet10
Zone: myvlanzone
Tag: 10                # VLAN ID

# Subnet 생성 (선택)
Subnet: 10.10.10.0/24
Gateway: 10.10.10.1
```

### 6.3 QinQ Zone (VLAN Stacking)

이중 VLAN 태깅으로 대규모 격리 네트워크 구성.

```
┌─────────────────────────────────────────────────────────────────┐
│                       QinQ Zone                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frame Structure:                                               │
│  ┌────────┬────────────┬────────────┬─────────────┐            │
│  │  DA/SA │ Outer VLAN │ Inner VLAN │   Payload   │            │
│  │        │ (Service)  │  (Customer)│             │            │
│  │        │   VLAN 20  │   VLAN 100 │             │            │
│  └────────┴────────────┴────────────┴─────────────┘            │
│                                                                 │
│  Zone: qinqzone1 (Service VLAN: 20)                            │
│    └── VNet: qvnet1 (Inner VLAN: 100)                          │
│    └── VNet: qvnet2 (Inner VLAN: 200)                          │
│                                                                 │
│  Zone: qinqzone2 (Service VLAN: 30)                            │
│    └── VNet: qvnet3 (Inner VLAN: 100)  ← 동일 Inner VLAN 가능  │
│                                                                 │
│  Note: MTU를 4바이트 줄여야 함 (1500 → 1496)                   │
└─────────────────────────────────────────────────────────────────┘
```

**설정:**
```
# QinQ Zone 생성
Zone ID: qinqzone1
Type: QinQ
Bridge: vmbr0
Service VLAN: 20
Service VLAN Protocol: 802.1q (또는 802.1ad)
MTU: 1496

# VNet 생성
VNet ID: qvnet1
Zone: qinqzone1
VLAN ID: 100           # Inner VLAN (Customer)
```

### 6.4 VXLAN Zone

UDP 터널을 통한 L2 오버레이 네트워크. 사이트 간 연결에 적합합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      VXLAN Zone                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Site A (192.168.1.0/24)              Site B (192.168.2.0/24)  │
│  ┌─────────────────────┐              ┌─────────────────────┐  │
│  │  Node1: 192.168.1.1 │              │  Node3: 192.168.2.1 │  │
│  │  ┌───────────────┐  │              │  ┌───────────────┐  │  │
│  │  │   vxvnet1     │  │              │  │   vxvnet1     │  │  │
│  │  │  VNI: 10000   │  │              │  │  VNI: 10000   │  │  │
│  │  │               │  │              │  │               │  │  │
│  │  │  VM100        │  │   VXLAN      │  │  VM300        │  │  │
│  │  │ 10.0.100.1    │◄─┼───Tunnel────►│  │ 10.0.100.3    │  │  │
│  │  └───────────────┘  │  UDP:4789    │  └───────────────┘  │  │
│  └─────────────────────┘              └─────────────────────┘  │
│                                                                 │
│  VXLAN Header (50 bytes overhead):                             │
│  ┌────────┬────────┬───────┬────────┬──────────┐              │
│  │Outer IP│Outer   │ VXLAN │Inner   │ Original │              │
│  │ Header │UDP:4789│ Header│Ethernet│ Payload  │              │
│  └────────┴────────┴───────┴────────┴──────────┘              │
│                                                                 │
│  MTU: 1450 (1500 - 50)                                         │
└─────────────────────────────────────────────────────────────────┘
```

**설정:**
```
# VXLAN Zone 생성
Zone ID: myvxlanzone
Type: VXLAN
Peers: 192.168.1.1,192.168.1.2,192.168.2.1,192.168.2.2
MTU: 1450

# VNet 생성
VNet ID: vxvnet1
Zone: myvxlanzone
Tag: 10000             # VNI (VXLAN Network Identifier)
```

### 6.5 EVPN Zone (BGP EVPN)

가장 고급 SDN. VXLAN + BGP로 완전한 L2/L3 라우팅 제공.

```
┌─────────────────────────────────────────────────────────────────┐
│                       EVPN Zone                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   BGP Control Plane                       │  │
│  │                      ASN: 65000                          │  │
│  │   Node1 ◄────────► Node2 ◄────────► Node3               │  │
│  │   (BGP Peer)       (BGP Peer)       (Exit Node)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   VXLAN Data Plane                        │  │
│  │                                                           │  │
│  │   VNet1 (VNI: 1000)      VNet2 (VNI: 2000)               │  │
│  │   10.100.1.0/24          10.100.2.0/24                   │  │
│  │   GW: 10.100.1.1         GW: 10.100.2.1                  │  │
│  │   (Anycast on all nodes)  (Anycast on all nodes)         │  │
│  │                                                           │  │
│  │         VRF VXLAN (VNI: 10000)                           │  │
│  │         Inter-VNet Routing                                │  │
│  │                                                           │  │
│  │   VM in VNet1 ◄─────── L3 Route ──────► VM in VNet2      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                         Exit Node                               │
│                              │                                  │
│                    External Network                             │
│                     (SNAT/Default Route)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**설정 순서:**

1. **EVPN Controller 생성:**
```
Controller ID: evpnctl
Type: EVPN
ASN: 65000
Peers: 10.10.10.1,10.10.10.2,10.10.10.3
```

2. **EVPN Zone 생성:**
```
Zone ID: evpnzone
Type: EVPN
Controller: evpnctl
VRF VXLAN Tag: 10000
Exit Nodes: node3
MTU: 1450
```

3. **VNet 생성:**
```
VNet ID: evpnvnet1
Zone: evpnzone
Tag: 1000              # VNI
```

4. **Subnet 생성:**
```
Subnet: 10.100.1.0/24
Gateway: 10.100.1.1    # Anycast Gateway
SNAT: enabled          # 외부 통신용
```

---

## 7. SDN 관리 명령어

### 7.1 SDN 적용 및 상태 확인

```bash
# SDN 설정 적용 (CLI)
pvesh set /cluster/sdn

# 현재 SDN 상태 확인
pvesh get /cluster/sdn

# Zone 목록
pvesh get /cluster/sdn/zones

# VNet 목록
pvesh get /cluster/sdn/vnets

# 특정 VNet 상태
pvesh get /cluster/sdn/vnets/<vnet-id>
```

### 7.2 SDN 설정 파일

```bash
# SDN 설정 파일 위치
ls -la /etc/pve/sdn/

# zones.cfg 예제
cat /etc/pve/sdn/zones.cfg
# vlan: myvlanzone
#     bridge vmbr0
#
# evpn: evpnzone
#     controller evpnctl
#     vrf-vxlan 10000

# vnets.cfg 예제
cat /etc/pve/sdn/vnets.cfg
# vnet: vnet10
#     zone myvlanzone
#     tag 10

# 현재 적용된 설정
cat /etc/pve/sdn/.running-config
```

### 7.3 로컬 네트워크 확인

```bash
# SDN에 의해 생성된 인터페이스 확인
ip link show | grep -E "vnet|vxlan"

# SDN Bridge 정보
bridge link show

# FRR 상태 (EVPN)
vtysh -c "show bgp summary"
vtysh -c "show evpn vni"
vtysh -c "show ip route"
```

---

## 8. 네트워크 문제 해결

### 8.1 진단 도구

```bash
# 인터페이스 상태
ip -br addr show
ip -br link show

# Bridge 연결 상태
brctl show
bridge link show

# 라우팅 테이블
ip route show
ip route get 10.0.0.1

# ARP 테이블
ip neigh show

# 네트워크 통계
netstat -i
ss -tuln
```

### 8.2 패킷 캡처

```bash
# Bridge 트래픽 캡처
tcpdump -i vmbr0 -n

# 특정 VLAN 트래픽
tcpdump -i vmbr0 -n vlan 10

# VXLAN 트래픽 (UDP 4789)
tcpdump -i eno1 -n udp port 4789

# VM 인터페이스 캡처
tcpdump -i tap100i0 -n
```

### 8.3 일반적인 문제 해결

| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| VM이 외부 통신 불가 | Bridge에 물리 포트 없음 | `bridge-ports` 확인 |
| VLAN 통신 안됨 | Trunk 설정 오류 | 스위치 VLAN 설정 확인 |
| SDN 적용 안됨 | interfaces 소스 누락 | `source /etc/network/interfaces.d/*` 추가 |
| VXLAN 터널 불통 | 방화벽 차단 | UDP 4789 허용 |
| EVPN 라우팅 실패 | FRR 미설치 | `frr-pythontools` 설치 |

### 8.4 네트워크 설정 적용

```bash
# ifupdown2로 무중단 적용
ifreload -a

# 특정 인터페이스만 재시작
ifdown vmbr0 && ifup vmbr0

# 설정 검증 (적용 전)
ifquery --check vmbr0

# 네트워크 서비스 재시작 (주의!)
systemctl restart networking
```

---

## 9. 베스트 프랙티스

### 9.1 네트워크 설계 권장사항

```
┌─────────────────────────────────────────────────────────────────┐
│               권장 네트워크 분리 구조                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Management  │  │  Storage    │  │    VM/CT    │            │
│  │   Network   │  │   Network   │  │   Network   │            │
│  │             │  │             │  │             │            │
│  │ • Web UI    │  │ • Ceph      │  │ • Guest     │            │
│  │ • SSH       │  │ • iSCSI     │  │   Traffic   │            │
│  │ • API       │  │ • NFS       │  │ • VLANs     │            │
│  │             │  │             │  │             │            │
│  │ VLAN 1      │  │ VLAN 100    │  │ VLAN 10-99  │            │
│  │ vmbr0       │  │ bond0       │  │ vmbr1       │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐                                               │
│  │  Corosync   │  • 전용 네트워크 권장                         │
│  │   Network   │  • active-backup bond                         │
│  │             │  • 또는 다중 링크                             │
│  │ VLAN 200    │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 체크리스트

**설치 후:**
- [ ] `ifupdown2` 설치 확인
- [ ] `/etc/network/interfaces` 백업
- [ ] SDN 소스 라인 추가

**Bond 설정:**
- [ ] 스위치 LACP 설정 확인 (802.3ad 사용시)
- [ ] `bond-miimon` 설정 (권장: 100ms)
- [ ] Corosync용은 `active-backup` 사용

**VLAN 설정:**
- [ ] 스위치 Trunk 포트 설정
- [ ] `bridge-vlan-aware yes` 확인
- [ ] MTU 고려 (QinQ: -4, VXLAN: -50)

**SDN 설정:**
- [ ] 모든 노드에 패키지 설치
- [ ] FRR 설치 및 활성화 (EVPN)
- [ ] 방화벽 규칙 (UDP 4789 for VXLAN)

---

## 10. 요약

### 핵심 개념

| 구성 요소 | 역할 | 설정 파일 |
|-----------|------|-----------|
| **Linux Bridge** | L2 가상 스위치 | `/etc/network/interfaces` |
| **Bond** | NIC 집계/장애복구 | `/etc/network/interfaces` |
| **VLAN** | 논리적 네트워크 분리 | `/etc/network/interfaces` |
| **SDN Zone** | 클러스터 가상 네트워크 | `/etc/pve/sdn/zones.cfg` |
| **SDN VNet** | Zone 내 가상 브릿지 | `/etc/pve/sdn/vnets.cfg` |

### 명령어 요약

```bash
# 네트워크 상태
ip -br addr show
brctl show
bridge vlan show

# 설정 적용
ifreload -a                    # 무중단 적용
pvesh set /cluster/sdn         # SDN 적용

# 문제 해결
tcpdump -i vmbr0 -n
cat /proc/net/bonding/bond0
vtysh -c "show bgp summary"    # EVPN
```

---

## 다음 단계

- **Module 6**: Backup & Restore - vzdump를 이용한 백업 전략
- **Module 7**: Firewall - 네트워크 보안 설정
