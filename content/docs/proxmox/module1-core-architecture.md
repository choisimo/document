# Module 1: Proxmox VE 코어 아키텍처 & 시스템 내부 구조

## 버전·근거·완료 계약

- 대상은 Proxmox VE 8.x입니다. pmxcfs, Corosync, daemon, systemd unit과 API 세부는 설치된 패키지 버전과 공식 소스로 확인합니다.
- 개념도는 정상 경로를 단순화합니다. quorum 상실, node partition, local mode, certificate·time 오류와 service 재시작 실패를 별도 상태로 추적합니다.
- `/etc/pve` 변경은 cluster 전체에 전파될 수 있습니다. 현재 quorum, 변경 대상, backup과 console/rollback 경로를 확인한 뒤 실행합니다.
- 모듈 완료 증거는 명령 암기가 아니라 node별 quorum·mount·daemon 상태와 의도한 config 수렴, 실패 주입 후 복구 결과입니다.

## 학습 목표
이 모듈을 완료하면 다음을 이해할 수 있습니다:
- Proxmox VE의 핵심 철학과 아키텍처 설계 원리
- pmxcfs(Proxmox Cluster File System)의 동작 원리와 Corosync와의 관계
- 주요 데몬 프로세스들의 역할과 상호작용
- 베어메탈에서 Web GUI까지의 대표 부팅 경로와 주요 실패 지점

---

## 1. Under the Hood: PVE 아키텍처 개요

### 1.1 왜 이런 구조인가? (Design Philosophy)

Proxmox VE는 단순한 가상화 플랫폼이 아닙니다. **분산 시스템**으로 설계되었습니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Proxmox VE 아키텍처 개념도                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │   Node 1    │    │   Node 2    │    │   Node 3    │            │
│   │             │    │             │    │             │            │
│   │ ┌─────────┐ │    │ ┌─────────┐ │    │ ┌─────────┐ │            │
│   │ │/etc/pve │◄├────┼─┤/etc/pve │◄├────┼─┤/etc/pve │ │            │
│   │ │ (pmxcfs)│ │    │ │ (pmxcfs)│ │    │ │ (pmxcfs)│ │            │
│   │ └────┬────┘ │    │ └────┬────┘ │    │ └────┬────┘ │            │
│   │      │      │    │      │      │    │      │      │            │
│   │ ┌────▼────┐ │    │ ┌────▼────┐ │    │ ┌────▼────┐ │            │
│   │ │Corosync │◄├────┼─┤Corosync │◄├────┼─┤Corosync │ │            │
│   │ │(UDP 5405)│    │ │(UDP 5405)│    │ │(UDP 5405)│ │            │
│   │ └─────────┘ │    │ └─────────┘ │    │ └─────────┘ │            │
│   └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                     │
│         ◄──────── 실시간 동기화 (Real-time Sync) ────────►          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**핵심 질문: 왜 데이터베이스 기반 파일시스템인가?**

전통적인 클러스터 솔루션들은 설정 파일을 각 노드에 개별 저장하고, rsync나 NFS로 동기화했습니다. 이 방식의 문제점:
- 동기화 지연 시 설정 불일치 (Split-brain 위험)
- VMID 중복 가능성
- 파일 잠금(Lock) 복잡성

**Proxmox의 해결책: pmxcfs**
- SQLite 데이터베이스 기반
- Corosync를 통한 **실시간** 복제
- 분산 잠금 메커니즘 내장
- Quorum 손실 시 **읽기 전용**으로 전환

---

## 2. pmxcfs (Proxmox Cluster File System) 심층 분석

### 2.1 pmxcfs란 무엇인가?

pmxcfs는 FUSE(Filesystem in Userspace) 기반의 **데이터베이스 구동 파일시스템**입니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    pmxcfs 내부 구조                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    User Space                                                       │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │  /etc/pve/  (마운트 포인트)                                 │    │
│    │     │                                                      │    │
│    │     ├── corosync.conf     # 클러스터 설정                   │    │
│    │     ├── storage.cfg       # 스토리지 설정                   │    │
│    │     ├── user.cfg          # 사용자/권한 설정                │    │
│    │     ├── datacenter.cfg    # 데이터센터 전역 설정            │    │
│    │     ├── nodes/            # 노드별 설정                     │    │
│    │     │    ├── node1/                                        │    │
│    │     │    │    ├── qemu-server/  # VM 설정 파일              │    │
│    │     │    │    └── lxc/          # 컨테이너 설정             │    │
│    │     │    └── node2/                                        │    │
│    │     └── priv/             # 비밀 키, 인증서 (root only)     │    │
│    └──────────────────────────────────────────────────────────┘    │
│                              │                                      │
│                              ▼ FUSE                                 │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │              pmxcfs daemon (pve-cluster)                  │    │
│    │                                                           │    │
│    │   ┌─────────────────┐     ┌─────────────────┐            │    │
│    │   │   SQLite DB     │     │   RAM Cache     │            │    │
│    │   │ config.db       │◄───►│   (최대 128MB)   │            │    │
│    │   │ /var/lib/pve-   │     │                 │            │    │
│    │   │ cluster/        │     └─────────────────┘            │    │
│    │   └─────────────────┘              │                      │    │
│    └────────────────────────────────────┼──────────────────────┘    │
│                                         │                           │
│    ─────────────────────────────────────┼─────────────────────────  │
│    Kernel Space                         │                           │
│                                         ▼                           │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │                    Corosync                               │    │
│    │              (Cluster Communication)                      │    │
│    │                  UDP 5405-5412                           │    │
│    └──────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름 시뮬레이션

**시나리오: VM 100 설정 변경 (CPU 2개 → 4개)**

```
시간 흐름 ──────────────────────────────────────────────────────────►

Step 1: API 요청
┌─────────────────────────────────────────────────────────────────┐
│ User (Web GUI)                                                  │
│      │                                                          │
│      │ PUT /api2/json/nodes/node1/qemu/100/config              │
│      │ {"cores": 4}                                             │
│      ▼                                                          │
│ pveproxy (Port 8006)                                           │
│      │                                                          │
│      │ → 인증 검증 (ticket, CSRF token)                         │
│      │ → 권한 검증 (user.cfg)                                   │
│      ▼                                                          │
│ pvedaemon (Unix Socket)                                        │
└─────────────────────────────────────────────────────────────────┘

Step 2: 설정 파일 쓰기
┌─────────────────────────────────────────────────────────────────┐
│ pvedaemon                                                       │
│      │                                                          │
│      │ flock("/etc/pve/nodes/node1/qemu-server/100.conf")      │
│      │ → pmxcfs 분산 잠금 획득                                   │
│      ▼                                                          │
│ /etc/pve/nodes/node1/qemu-server/100.conf                      │
│      │                                                          │
│      │ [변경 전]                    [변경 후]                    │
│      │ cores: 2          ───►      cores: 4                     │
│      ▼                                                          │
│ pmxcfs daemon                                                   │
│      │                                                          │
│      │ → SQLite DB에 쓰기                                       │
│      │ → RAM Cache 업데이트                                     │
└─────────────────────────────────────────────────────────────────┘

Step 3: Corosync를 통한 복제
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Node 1                 Node 2                 Node 3          │
│   ┌─────┐               ┌─────┐               ┌─────┐          │
│   │pmxcfs│──Corosync──►│pmxcfs│──Corosync──►│pmxcfs│          │
│   │     │               │     │               │     │          │
│   │ DB  │               │ DB  │               │ DB  │          │
│   │ v.35│               │ v.35│               │ v.35│          │
│   └─────┘               └─────┘               └─────┘          │
│      │                     │                     │              │
│      ▼                     ▼                     ▼              │
│   .version 파일이 동일해지면 동기화 완료                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 핵심 파일 구조

```
/etc/pve/
├── .version                    # 파일 버전 (동기화 감지용)
├── .members                    # 클러스터 멤버 정보 (JSON)
├── .vmlist                     # 전체 VM 목록 (JSON)
├── .rrd                        # RRD 데이터 (최근 항목)
│
├── corosync.conf               # Corosync 클러스터 설정
├── storage.cfg                 # 스토리지 풀 정의
├── user.cfg                    # 사용자, 그룹, 권한
├── datacenter.cfg              # 데이터센터 전역 설정
├── domains.cfg                 # 인증 영역 설정
│
├── firewall/
│   ├── cluster.fw              # 클러스터 전체 방화벽 규칙
│   └── <VMID>.fw               # VM/CT별 방화벽 규칙
│
├── ha/
│   ├── resources.cfg           # HA 관리 리소스 정의
│   ├── rules.cfg               # HA 스케줄링 규칙
│   └── manager_status          # HA 상태 (JSON)
│
├── nodes/
│   └── <nodename>/
│       ├── config              # 노드별 설정
│       ├── qemu-server/        # KVM VM 설정 파일
│       │   └── <VMID>.conf
│       ├── lxc/                # LXC 컨테이너 설정
│       │   └── <VMID>.conf
│       ├── pve-ssl.pem         # 웹 서버 SSL 인증서
│       ├── pve-ssl.key         # SSL 개인키
│       └── lrm_status          # HA LRM 상태
│
├── priv/                       # 민감 정보 (root만 접근)
│   ├── authkey.key             # 티켓 시스템 개인키
│   ├── pve-root-ca.key         # 클러스터 CA 개인키
│   ├── shadow.cfg              # PVE 영역 사용자 비밀번호
│   ├── token.cfg               # API 토큰 시크릿
│   └── authorized_keys         # 클러스터 SSH 키
│
└── virtual-guest/
    └── cpu-models.conf         # 커스텀 CPU 모델 정의
```

### 2.4 Quorum과 안전 메커니즘

**Quorum(정족수)**: 클러스터가 안전하게 작동하기 위한 최소 투표 수

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Quorum 동작 원리 (3노드 클러스터)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   정상 상태 (Quorate)                                               │
│   ┌────────┐    ┌────────┐    ┌────────┐                           │
│   │ Node 1 │◄──►│ Node 2 │◄──►│ Node 3 │                           │
│   │ Vote:1 │    │ Vote:1 │    │ Vote:1 │                           │
│   └────────┘    └────────┘    └────────┘                           │
│                                                                     │
│   Total Votes: 3,  Quorum Required: 2 (과반수)                      │
│   → 모든 노드가 /etc/pve에 쓰기 가능                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1개 노드 장애 (Still Quorate)                                     │
│   ┌────────┐    ┌────────┐    ┌────────┐                           │
│   │ Node 1 │◄──►│ Node 2 │    │ Node 3 │                           │
│   │ Vote:1 │    │ Vote:1 │    │  FAIL  │                           │
│   └────────┘    └────────┘    └────────┘                           │
│                                                                     │
│   Active Votes: 2,  Quorum Required: 2                              │
│   → 여전히 쓰기 가능                                                 │
│   → HA가 Node 3의 VM을 다른 노드로 이동                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   2개 노드 장애 (NOT Quorate - Read-Only)                           │
│   ┌────────┐    ┌────────┐    ┌────────┐                           │
│   │ Node 1 │    │ Node 2 │    │ Node 3 │                           │
│   │ Vote:1 │    │  FAIL  │    │  FAIL  │                           │
│   └────────┘    └────────┘    └────────┘                           │
│                                                                     │
│   Active Votes: 1,  Quorum Required: 2                              │
│   → /etc/pve 읽기 전용으로 전환                                      │
│   → Split-brain 방지                                                │
│   → 새 VM 생성, 설정 변경 불가                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**2노드 클러스터에서의 Quorum 문제 해결: QDevice**

```bash
# QDevice 설정
pve# apt install corosync-qdevice
pve# pvecm qdevice setup <QDEVICE-IP>

# QDevice 상태 확인
pve# pvecm status
```

```
QDevice 아키텍처:
                    ┌──────────────┐
                    │   QDevice    │
                    │  (외부 서버)  │
                    │   Vote: 1    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐             ┌─────▼─────┐
        │  Node 1   │             │  Node 2   │
        │  Vote: 1  │◄───────────►│  Vote: 1  │
        └───────────┘             └───────────┘

Total Votes: 3 (Node1 + Node2 + QDevice)
Quorum: 2
→ 1개 노드 장애 시에도 운영 가능
```

---

## 3. 서비스 데몬 프로세스 트리

### 3.1 핵심 데몬 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│              Proxmox VE 데몬 프로세스 계층 구조                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         systemd (PID 1)                             │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                │
│         ▼                    ▼                    ▼                │
│   ┌───────────┐       ┌───────────┐       ┌───────────┐           │
│   │ corosync  │       │pve-cluster│       │ pvedaemon │           │
│   │(클러스터  │       │ (pmxcfs)  │       │ (API 백엔드)│           │
│   │ 통신)     │       │           │       │           │           │
│   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘           │
│         │                   │                   │                  │
│         │                   │                   ▼                  │
│         │                   │           ┌───────────┐              │
│         │                   │           │ pveproxy  │              │
│         │                   │           │(웹 프록시) │              │
│         │                   │           │ :8006     │              │
│         │                   │           └───────────┘              │
│         │                   │                                      │
│         │                   ▼                                      │
│         │           ┌───────────┐                                  │
│         │           │ pvestatd  │                                  │
│         │           │(상태 수집) │                                  │
│         │           └───────────┘                                  │
│         │                                                          │
│         ▼                                                          │
│   ┌───────────────────────────────────────┐                       │
│   │           HA 서비스 (옵션)              │                       │
│   │  ┌─────────────┐   ┌─────────────┐    │                       │
│   │  │ pve-ha-crm  │   │ pve-ha-lrm  │    │                       │
│   │  │ (클러스터   │   │ (로컬 리소스 │    │                       │
│   │  │  리소스 관리)│   │  관리)      │    │                       │
│   │  └─────────────┘   └─────────────┘    │                       │
│   └───────────────────────────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 각 데몬의 역할 상세

#### 3.2.1 pve-cluster (pmxcfs daemon)

```bash
# 서비스 상태 확인
systemctl status pve-cluster

# 마운트 상태 확인
mount | grep /etc/pve

# 디버그 모드 활성화
echo "1" > /etc/pve/.debug
journalctl -f -u pve-cluster
```

**역할:**
- `/etc/pve` 마운트 (FUSE 파일시스템)
- SQLite 데이터베이스 관리 (`/var/lib/pve-cluster/config.db`)
- Corosync와 연동하여 클러스터 간 동기화
- 분산 잠금 제공

**의존성 체인:**
```
corosync → pve-cluster → pvedaemon → pveproxy
```

#### 3.2.2 pvedaemon (API Backend)

```bash
# 서비스 상태 확인
systemctl status pvedaemon

# 로그 확인
journalctl -u pvedaemon -f
```

**역할:**
- REST API 요청 처리
- VM/CT 관리 작업 실행
- 인증 및 권한 검증
- Unix 소켓 통신 (`/var/run/pvedaemon.sock`)

**API 처리 흐름:**
```
┌──────────────────────────────────────────────────────────────────┐
│                    API 요청 처리 과정                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HTTP Request                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │  pveproxy   │  TCP 8006 (SSL/TLS)                            │
│  │  (Perl)     │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         │ Unix Socket                                            │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │ pvedaemon   │                                                │
│  │             │                                                │
│  │ 1. 인증 검증 (ticket/token)                                   │
│  │ 2. 권한 검증 (/etc/pve/user.cfg)                             │
│  │ 3. 요청 처리                                                  │
│  │ 4. 설정 파일 수정 (/etc/pve/...)                             │
│  │ 5. 커맨드 실행 (qm, pct, pvesm...)                           │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │ Task Worker │  비동기 작업 (마이그레이션, 백업 등)             │
│  └─────────────┘                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.2.3 pveproxy (Web Proxy)

```bash
# 서비스 상태 확인
systemctl status pveproxy

# SSL 인증서 확인
openssl x509 -in /etc/pve/nodes/$(hostname)/pve-ssl.pem -text -noout

# 커스텀 SSL 인증서 적용 (Let's Encrypt 등)
# /etc/pve/nodes/<nodename>/pveproxy-ssl.pem
# /etc/pve/nodes/<nodename>/pveproxy-ssl.key
```

**역할:**
- HTTPS 웹 인터페이스 제공 (포트 8006)
- SSL/TLS 암호화
- 정적 파일 서빙 (Web GUI)
- API 요청을 pvedaemon으로 프록시

**보안 설정 (`/etc/default/pveproxy`):**
```bash
# 암호화 스위트 설정
CIPHERS="ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"

# TLS 버전 제한
TLS_OPTIONS="NO_SSLv2,NO_SSLv3,NO_TLSv1,NO_TLSv1_1"

# HTTP/2 활성화
HTTP2=1
```

#### 3.2.4 pvestatd (Status Daemon)

```bash
# 서비스 상태 확인
systemctl status pvestatd

# RRD 데이터 확인
ls /var/lib/rrdcached/db/pve2-*
```

**역할:**
- VM/CT 상태 정보 수집
- RRD 데이터베이스 업데이트 (그래프용)
- 노드 리소스 모니터링 (CPU, 메모리, 네트워크)
- Auto-ballooning 메모리 관리

**데이터 수집 주기:**
- 기본 상태: 매 3초
- RRD 업데이트: 매 분

#### 3.2.5 HA 서비스 데몬

```bash
# HA 서비스 상태 확인
systemctl status pve-ha-crm
systemctl status pve-ha-lrm

# HA 상태 확인
ha-manager status
```

**pve-ha-crm (Cluster Resource Manager):**
- 클러스터 전체 HA 결정
- 마스터 노드에서만 활성화
- 리소스 할당 및 페일오버 결정
- Fencing 관리

**pve-ha-lrm (Local Resource Manager):**
- 로컬 노드의 HA 리소스 관리
- CRM 명령 실행
- 서비스 시작/중지/마이그레이션

---

## 4. 부팅 프로세스 시뮬레이션

### 4.1 베어메탈에서 Web GUI까지

```
┌─────────────────────────────────────────────────────────────────────┐
│              Proxmox VE 부팅 시퀀스 (타임라인)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: BIOS/UEFI → Bootloader                                   │
│  ────────────────────────────────────────────────                   │
│  [T+0s]   BIOS POST / UEFI 초기화                                   │
│  [T+2s]   GRUB 로드                                                 │
│           └─► /boot/grub/grub.cfg                                   │
│                                                                     │
│  Phase 2: Kernel → systemd                                         │
│  ────────────────────────────────────────────────                   │
│  [T+5s]   Linux Kernel 로드                                         │
│           └─► /boot/vmlinuz-*-pve                                   │
│  [T+6s]   initramfs 로드                                            │
│           └─► ZFS 모듈, 스토리지 드라이버                            │
│  [T+8s]   Root 파일시스템 마운트                                     │
│  [T+10s]  systemd 시작 (PID 1)                                      │
│                                                                     │
│  Phase 3: Network & Storage                                        │
│  ────────────────────────────────────────────────                   │
│  [T+12s]  네트워크 인터페이스 활성화                                 │
│           └─► /etc/network/interfaces                               │
│  [T+15s]  ZFS 풀 임포트 (있는 경우)                                  │
│           └─► zpool import -a                                       │
│                                                                     │
│  Phase 4: Cluster Services                                         │
│  ────────────────────────────────────────────────                   │
│  [T+18s]  corosync 시작                                             │
│           └─► /etc/corosync/corosync.conf                           │
│           └─► 다른 노드와 통신 시도 (UDP 5405-5412)                  │
│                                                                     │
│  [T+20s]  pve-cluster 시작                                          │
│           └─► /etc/pve 마운트 (pmxcfs)                              │
│           └─► SQLite DB 로드 (/var/lib/pve-cluster/config.db)       │
│           └─► Corosync 연결 대기                                    │
│                                                                     │
│  Phase 5: PVE Services                                             │
│  ────────────────────────────────────────────────                   │
│  [T+25s]  pvedaemon 시작                                            │
│           └─► API 백엔드 초기화                                      │
│           └─► /var/run/pvedaemon.sock 생성                          │
│                                                                     │
│  [T+26s]  pveproxy 시작                                             │
│           └─► HTTPS 서버 시작 (:8006)                               │
│           └─► SSL 인증서 로드                                       │
│                                                                     │
│  [T+27s]  pvestatd 시작                                             │
│           └─► 상태 모니터링 시작                                     │
│           └─► RRD 데이터 수집                                       │
│                                                                     │
│  Phase 6: HA & Guest VMs                                           │
│  ────────────────────────────────────────────────                   │
│  [T+28s]  pve-ha-lrm 시작                                           │
│  [T+29s]  pve-ha-crm 시작                                           │
│           └─► 마스터 락 획득 시도                                    │
│                                                                     │
│  [T+30s]  pve-guests 시작                                           │
│           └─► Quorum 대기                                           │
│           └─► onboot=1 VM/CT 자동 시작                              │
│                                                                     │
│  [T+35s]  ★ Web GUI 접속 가능 ★                                     │
│           └─► https://<IP>:8006                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 systemd 유닛 의존성

```bash
# PVE 관련 서비스 의존성 확인
systemctl list-dependencies pveproxy.service

# 서비스 시작 순서 시각화
systemd-analyze plot > bootchart.svg
```

**의존성 다이어그램:**
```
                    network.target
                         │
                         ▼
                    corosync.service
                         │
                         ▼
                    pve-cluster.service
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      pvedaemon    pve-ha-lrm   pve-firewall
            │
            ▼
      pveproxy.service (:8006)
            │
            ▼
      pvestatd.service
```

### 4.3 부팅 문제 진단

```bash
# 부팅 시간 분석
systemd-analyze blame | head -20

# 실패한 서비스 확인
systemctl --failed

# corosync 상태 확인
systemctl status corosync
corosync-quorumtool -s

# pmxcfs 마운트 확인
mount | grep /etc/pve
cat /etc/pve/.members

# 서비스 로그 실시간 확인
journalctl -f -u pve-cluster -u corosync
```

---

## 5. 코어 명령어 레퍼런스

### 5.1 시스템 정보 명령어

```bash
# PVE 버전 정보
pveversion -v

# 출력 예시:
# proxmox-ve: 8.1.0 (running kernel: 6.5.11-7-pve)
# pve-manager: 8.1.3 (running version: 8.1.3/b46aac3b42da5d15)
# pve-kernel-6.5: 6.5.11-7
# ...

# 구독 상태 확인
pvesubscription get

# 노드 상태 요약
pvesh get /nodes/$(hostname)/status
```

### 5.2 클러스터 관리 명령어

```bash
# 클러스터 상태 확인
pvecm status

# 출력 예시:
# Cluster information
# ~~~~~~~~~~~~~~~~~~~
# Name:             mycluster
# Config Version:   3
# Transport:        knet
# Secure auth:      on
#
# Quorum information
# ~~~~~~~~~~~~~~~~~~
# Date:             Mon Jan 10 14:30:00 2026
# Quorum provider:  corosync_votequorum
# Nodes:            3
# Node ID:          0x00000001
# Ring ID:          1.1a8
# Quorate:          Yes
#
# Votequorum information
# ~~~~~~~~~~~~~~~~~~~~~~
# Expected votes:   3
# Highest expected: 3
# Total votes:      3
# Quorum:           2
# Flags:            Quorate

# 노드 목록
pvecm nodes

# 클러스터 생성
pvecm create <CLUSTERNAME>

# 클러스터 조인
pvecm add <CLUSTER-IP>

# 예상 투표 수 설정 (긴급 복구)
pvecm expected 1
```

### 5.3 업그레이드 명령어

```bash
# 전체 시스템 업그레이드
apt update && apt dist-upgrade

# PVE 특화 업그레이드 스크립트
pveupgrade

# 리포지토리 설정 확인
cat /etc/apt/sources.list.d/pve-enterprise.list
cat /etc/apt/sources.list.d/ceph.list
```

### 5.4 APT 리포지토리 구성

```
/etc/apt/sources.list.d/pve-enterprise.list (엔터프라이즈 구독)
─────────────────────────────────────────────────────────────────
deb https://enterprise.proxmox.com/debian/pve bookworm pve-enterprise

/etc/apt/sources.list.d/pve-no-subscription.list (무료, 테스트용)
─────────────────────────────────────────────────────────────────
deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription

/etc/apt/sources.list.d/ceph.list (Ceph 저장소)
─────────────────────────────────────────────────────────────────
deb http://download.proxmox.com/debian/ceph-reef bookworm no-subscription
```

---

## 6. 실습 과제

### 과제 1: pmxcfs 동작 확인
```bash
# 1. 파일 버전 확인
cat /etc/pve/.version

# 2. VM 설정 파일 변경 후 버전 다시 확인
qm set 100 --description "Test"
cat /etc/pve/.version

# 3. 다른 노드에서 동일 파일 확인 (동기화 검증)
```

### 과제 2: 서비스 의존성 탐색
```bash
# 1. pveproxy가 의존하는 모든 서비스 확인
systemctl list-dependencies pveproxy --all

# 2. pve-cluster를 중지하면 어떤 일이 발생하는지 관찰
# (주의: 운영 환경에서는 절대 실행하지 마세요!)
```

### 과제 3: 부팅 분석
```bash
# 1. 부팅 시간 분석
systemd-analyze

# 2. 가장 오래 걸린 서비스 Top 10
systemd-analyze blame | head -10

# 3. 크리티컬 체인 확인
systemd-analyze critical-chain pveproxy.service
```

---

## 7. 핵심 요약

| 구성 요소 | 역할 | 설정 파일 위치 |
|-----------|------|---------------|
| pmxcfs | 분산 설정 파일시스템 | `/var/lib/pve-cluster/config.db` |
| Corosync | 클러스터 통신 | `/etc/corosync/corosync.conf` |
| pvedaemon | API 백엔드 | `/etc/pve/` |
| pveproxy | 웹 서버 | `/etc/default/pveproxy` |
| pvestatd | 상태 모니터링 | `/var/lib/rrdcached/` |
| pve-ha-crm | HA 클러스터 관리 | `/etc/pve/ha/` |
| pve-ha-lrm | HA 로컬 리소스 관리 | `/etc/pve/nodes/<node>/lrm_status` |

**기억해야 할 핵심:**
1. `/etc/pve`는 일반 디렉토리가 아닌 **데이터베이스 기반 파일시스템**
2. 모든 클러스터 설정은 **실시간 동기화**
3. Quorum 손실 시 **읽기 전용**으로 전환
4. 서비스 시작 순서: `corosync → pve-cluster → pvedaemon → pveproxy`

---

## 다음 모듈 예고

**Module 3: Advanced Storage Subsystem**에서는 Proxmox VE의 스토리지 아키텍처를 깊이 있게 다룹니다:
- 스토리지 계층 구조 (File-level vs Block-level)
- ZFS I/O 경로 추적 (Guest → VirtIO → ZFS ARC/ZIL → Disk)
- pvesm 명령어 심화 학습
