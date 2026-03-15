# Module 9: Proxmox VE Ceph Cluster

## 학습 목표
이 모듈을 완료하면 다음을 이해할 수 있습니다:
- Ceph 분산 스토리지 아키텍처
- Ceph 데몬 유형 (MON, MGR, OSD, MDS)
- Proxmox VE에서 Ceph 배포 및 관리
- Pool 설정 및 CRUSH 규칙
- CephFS 공유 파일시스템
- RBD (RADOS Block Device) 활용
- Ceph 모니터링 및 문제 해결

---

## 1. Ceph 아키텍처 개요

### 1.1 왜 Ceph인가?

Ceph는 **소프트웨어 정의 분산 스토리지**로, Proxmox VE와 완벽하게 통합됩니다:

```
+-------------------------------------------------------------------------+
|                      Why Ceph for Proxmox VE?                            |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |    Scalability    |   |   Redundancy      |   |   Performance     |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|   | - 수평 확장 가능    |   | - 데이터 복제      |   | - 분산 I/O       |  |
|   | - PB급 스토리지    |   | - 자동 복구        |   | - SSD/NVMe 지원  |  |
|   | - 무중단 확장      |   | - 단일 장애점 없음  |   | - 캐시 계층화    |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|                                                                         |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |   Self-Healing    |   |  No Single Point  |   |    Cost-Effective |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|   | - 자동 리밸런싱    |   | - 탈중앙화 구조    |   | - 상용 HW 사용    |  |
|   | - 장애 감지       |   | - 분산 메타데이터  |   | - RAID 불필요     |  |
|   | - 자동 복구       |   | - 무제한 확장      |   | - 오픈소스        |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.2 Ceph 구성 요소

```
+-------------------------------------------------------------------------+
|                        Ceph Architecture                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|   Client Layer (VM/CT)                                                  |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |    RBD Client     |   |   CephFS Client   |   |   RADOS Gateway   |  |
|   | (Block Device)    |   | (File System)     |   | (Object Storage)  |  |
|   +--------+----------+   +--------+----------+   +--------+----------+  |
|            |                       |                       |             |
|            +---------------+-------+-----------------------+             |
|                            |                                             |
|                            v                                             |
|   +-------------------------------------------------------------+       |
|   |                        LIBRADOS                              |       |
|   |              (Ceph Storage Cluster Protocol)                 |       |
|   +-------------------------------------------------------------+       |
|                            |                                             |
|                            v                                             |
|   +-------------------------------------------------------------+       |
|   |                     RADOS Cluster                            |       |
|   | (Reliable Autonomic Distributed Object Store)                |       |
|   +-------------------------------------------------------------+       |
|        |              |              |              |                    |
|        v              v              v              v                    |
|   +--------+    +--------+    +--------+    +--------+                  |
|   |  MON   |    |  MGR   |    |  OSD   |    |  MDS   |                  |
|   +--------+    +--------+    +--------+    +--------+                  |
|   Monitor       Manager       Object       Metadata                     |
|   (클러스터 맵)  (대시보드)    Storage      Server                       |
|                              Daemon       (CephFS용)                    |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.3 Ceph 데몬 역할

```
+-------------------------------------------------------------------------+
|                        Ceph Daemon Types                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------------------------------------------------------+ |
|   |                     MON (Monitor)                                  | |
|   +-------------------------------------------------------------------+ |
|   | - 클러스터 맵(Cluster Map) 유지                                     | |
|   | - OSD Map, MON Map, PG Map, CRUSH Map 관리                         | |
|   | - 클러스터 상태 모니터링                                            | |
|   | - 인증 및 인가                                                      | |
|   | - 권장: 3개 이상 (홀수, 과반수 쿼럼)                                 | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   +-------------------------------------------------------------------+ |
|   |                     MGR (Manager)                                  | |
|   +-------------------------------------------------------------------+ |
|   | - 클러스터 런타임 메트릭 수집                                        | |
|   | - Dashboard, Prometheus 연동                                       | |
|   | - PG Autoscaler 관리                                               | |
|   | - 디바이스 상태 모니터링                                            | |
|   | - 권장: 2개 이상 (Active + Standby)                                 | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   +-------------------------------------------------------------------+ |
|   |                     OSD (Object Storage Daemon)                    | |
|   +-------------------------------------------------------------------+ |
|   | - 실제 데이터 저장 (1 OSD = 1 Disk 권장)                            | |
|   | - 데이터 복제 및 복구                                               | |
|   | - Scrubbing (데이터 무결성 검증)                                    | |
|   | - Heartbeat으로 상태 보고                                           | |
|   | - 권장: 최소 3개 노드, 12개 이상 OSD                                 | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   +-------------------------------------------------------------------+ |
|   |                     MDS (Metadata Server)                          | |
|   +-------------------------------------------------------------------+ |
|   | - CephFS 전용 메타데이터 관리                                       | |
|   | - POSIX 파일시스템 인터페이스 제공                                   | |
|   | - 디렉토리 구조, 파일 권한 등 관리                                   | |
|   | - RBD 사용 시 불필요                                                | |
|   | - Active + Standby 구성 권장                                        | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 2. Ceph 클러스터 요구사항

### 2.1 하드웨어 권장사항

```
+-------------------------------------------------------------------------+
|                   Hardware Recommendations                               |
+-------------------------------------------------------------------------+
|                                                                         |
|   노드 수:                                                               |
|   +-------------------+                                                 |
|   | 최소 3개 노드      |  쿼럼 및 데이터 복제를 위한 최소 요구사항         |
|   | 권장 5개 이상      |  더 나은 가용성 및 성능                          |
|   +-------------------+                                                 |
|                                                                         |
|   CPU (노드당):                                                          |
|   +-------------------------------------------------------------------+ |
|   | OSD 서비스: OSD당 1-2 코어 (NVMe의 경우 4-6 코어)                   | |
|   | MON/MGR: 1-2 코어                                                  | |
|   | MDS: 2-4 코어 (부하에 따라)                                         | |
|   | 예: MON + MGR + 6 OSD = 최소 8 코어                                 | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   메모리 (노드당):                                                       |
|   +-------------------------------------------------------------------+ |
|   | OSD당: 최소 4GB, 권장 8GB                                          | |
|   | MON: 2-4GB                                                         | |
|   | MGR: 2-4GB                                                         | |
|   | MDS: 2-4GB                                                         | |
|   | 예: 6 OSD 노드 = 최소 32GB, 권장 64GB                               | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   네트워크:                                                              |
|   +-------------------------------------------------------------------+ |
|   | 최소: 10 Gbps (Ceph 전용)                                          | |
|   | 권장: 25 Gbps 이상                                                  | |
|   | 분리 권장:                                                          | |
|   |   - Public Network: 클라이언트 <-> Ceph 통신                        | |
|   |   - Cluster Network: OSD 복제/복구 트래픽 (선택)                    | |
|   |   - Corosync Network: 별도 분리 권장                                | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
|   디스크:                                                                |
|   +-------------------------------------------------------------------+ |
|   | OSD 디스크: SSD/NVMe 권장 (HDD도 가능)                              | |
|   | DB/WAL 디스크: 빠른 NVMe (선택적 분리)                               | |
|   | 균등 분배: 노드당 동일 개수/용량의 디스크                             | |
|   | RAID 사용 금지: Ceph가 자체 복제 관리                                | |
|   +-------------------------------------------------------------------+ |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 2.2 네트워크 구성 예시

```
+-------------------------------------------------------------------------+
|                    Network Configuration Example                         |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |      Node 1       |   |      Node 2       |   |      Node 3       |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |                   |   |                   |   |                   |  |
|   | eth0: Management  |   | eth0: Management  |   | eth0: Management  |  |
|   | 192.168.1.11      |   | 192.168.1.12      |   | 192.168.1.13      |  |
|   |                   |   |                   |   |                   |  |
|   | eth1: Corosync    |   | eth1: Corosync    |   | eth1: Corosync    |  |
|   | 10.10.10.11       |   | 10.10.10.12       |   | 10.10.10.13       |  |
|   |                   |   |                   |   |                   |  |
|   | eth2: Ceph Public |   | eth2: Ceph Public |   | eth2: Ceph Public |  |
|   | 10.20.20.11       |   | 10.20.20.12       |   | 10.20.20.13       |  |
|   |                   |   |                   |   |                   |  |
|   | eth3: Ceph Cluster|   | eth3: Ceph Cluster|   | eth3: Ceph Cluster|  |
|   | 10.30.30.11       |   | 10.30.30.12       |   | 10.30.30.13       |  |
|   |                   |   |                   |   |                   |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|                                                                         |
|   권장 대역폭:                                                           |
|   - Management: 1 Gbps                                                  |
|   - Corosync: 1 Gbps (전용, 저지연)                                      |
|   - Ceph Public: 10+ Gbps (클라이언트 I/O)                               |
|   - Ceph Cluster: 10-25 Gbps (복제/복구, 선택적)                          |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 3. Ceph 설치 및 초기화

### 3.1 웹 인터페이스를 통한 설치

```
+-------------------------------------------------------------------------+
|                    Ceph Installation via Web UI                          |
+-------------------------------------------------------------------------+
|                                                                         |
|   1. 노드 선택 -> Ceph 메뉴 -> "Install Ceph" 클릭                       |
|                                                                         |
|   2. Ceph 버전 선택                                                      |
|      - 다른 노드와 동일한 버전 선택                                       |
|      - 첫 노드라면 최신 버전 선택                                         |
|                                                                         |
|   3. 패키지 설치 완료 후 "Configuration" 단계                            |
|      - Public Network: 필수 (예: 10.20.20.0/24)                          |
|      - Cluster Network: 선택 (예: 10.30.30.0/24)                         |
|                                                                         |
|   4. 고급 옵션 (기본값 권장)                                              |
|      - Number of replicas: 3                                            |
|      - Minimum replicas: 2                                              |
|                                                                         |
|   5. 첫 번째 Monitor 노드 선택                                           |
|                                                                         |
|   6. 설치 완료                                                           |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 3.2 CLI를 통한 설치

```bash
# 1. Ceph 패키지 설치 (각 노드에서)
pveceph install

# 버전 지정 설치
pveceph install --version reef

# 2. 초기 설정 (첫 번째 노드에서만)
pveceph init --network 10.20.20.0/24

# Cluster Network 포함
pveceph init --network 10.20.20.0/24 --cluster-network 10.30.30.0/24

# 3. 설정 파일 확인
cat /etc/pve/ceph.conf

# 예시 출력:
# [global]
# auth_client_required = cephx
# auth_cluster_required = cephx
# auth_service_required = cephx
# cluster_network = 10.30.30.0/24
# fsid = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# mon_allow_pool_delete = true
# mon_host = 10.20.20.11 10.20.20.12 10.20.20.13
# ms_bind_ipv4 = true
# ms_bind_ipv6 = false
# osd_pool_default_min_size = 2
# osd_pool_default_size = 3
# public_network = 10.20.20.0/24
```

### 3.3 설정 파일 구조

```bash
# /etc/pve/ceph.conf - 클러스터 전체 설정 (pmxcfs로 동기화)
# /etc/ceph/ceph.conf -> /etc/pve/ceph.conf 심볼릭 링크

# Ceph 설정 조회
ceph config dump

# 설정 변경 (MON DB에 저장)
ceph config set <who> <option> <value>

# 예: OSD 메모리 타겟 증가
ceph config set osd osd_memory_target 8G

# 특정 OSD 설정
ceph config set osd.0 osd_memory_target 10G

# 설정 제거
ceph config rm osd osd_memory_target
```

---

## 4. Monitor 및 Manager 배포

### 4.1 Monitor (MON) 생성

```bash
# Monitor 생성 (각 노드에서)
pveceph mon create

# Monitor 상태 확인
ceph mon stat

# 예시 출력:
# e3: 3 mons at {node1=[v2:10.20.20.11:3300/0,v1:10.20.20.11:6789/0],
#                node2=[v2:10.20.20.12:3300/0,v1:10.20.20.12:6789/0],
#                node3=[v2:10.20.20.13:3300/0,v1:10.20.20.13:6789/0]},
# election epoch 10, leader 0 node1, quorum 0,1,2 node1,node2,node3

# Monitor 삭제
pveceph mon destroy
```

### 4.2 Manager (MGR) 생성

```bash
# Manager 생성 (Monitor와 같은 노드에 권장)
pveceph mgr create

# Manager 상태 확인
ceph mgr stat

# 예시 출력:
# {
#   "epoch": 5,
#   "available": true,
#   "active_name": "node1",
#   "standbys": [
#     {"name": "node2"},
#     {"name": "node3"}
#   ]
# }

# Manager 삭제
pveceph mgr destroy
```

### 4.3 MON/MGR 배포 모범 사례

```
+-------------------------------------------------------------------------+
|                    MON/MGR Deployment Best Practices                     |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+   +-------------------+   +-------------------+  |
|   |      Node 1       |   |      Node 2       |   |      Node 3       |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|   | MON: node1        |   | MON: node2        |   | MON: node3        |  |
|   | MGR: node1 (Active)|  | MGR: node2 (Stby) |   | MGR: node3 (Stby) |  |
|   | OSD: 0,1,2,3      |   | OSD: 4,5,6,7      |   | OSD: 8,9,10,11    |  |
|   +-------------------+   +-------------------+   +-------------------+  |
|                                                                         |
|   권장사항:                                                              |
|   - MON: 항상 홀수 개 (3개 또는 5개)                                      |
|   - MGR: MON과 같은 노드에 배포                                          |
|   - MON/MGR: 3개면 1개 장애 허용, 5개면 2개 장애 허용                     |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 5. OSD (Object Storage Daemon)

### 5.1 OSD 생성

```bash
# 사용 가능한 디스크 확인
lsblk

# OSD 생성 (기본 - Bluestore)
pveceph osd create /dev/sdb

# DB/WAL 분리 (고성능 NVMe 활용)
pveceph osd create /dev/sdb -db_dev /dev/nvme0n1 -wal_dev /dev/nvme0n1

# DB 크기 지정
pveceph osd create /dev/sdb -db_dev /dev/nvme0n1 -db_size 50G

# 이전에 사용된 디스크 초기화 (데이터 삭제!)
ceph-volume lvm zap /dev/sdb --destroy

# OSD 상태 확인
ceph osd tree

# 예시 출력:
# ID  CLASS  WEIGHT   TYPE NAME       STATUS  REWEIGHT  PRI-AFF
# -1         7.27548  root default
# -3         2.42516      host node1
#  0    ssd  0.60629          osd.0       up   1.00000  1.00000
#  1    ssd  0.60629          osd.1       up   1.00000  1.00000
#  2    ssd  0.60629          osd.2       up   1.00000  1.00000
#  3    ssd  0.60629          osd.3       up   1.00000  1.00000
# ...
```

### 5.2 Bluestore 아키텍처

```
+-------------------------------------------------------------------------+
|                        Bluestore Architecture                            |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                         OSD Daemon                               |   |
|   +-----------------------------------------------------------------+   |
|                               |                                         |
|                               v                                         |
|   +-----------------------------------------------------------------+   |
|   |                        Bluestore                                 |   |
|   |  +------------------+  +------------------+  +----------------+  |   |
|   |  |      Data        |  |    Block.DB      |  |   Block.WAL    |  |   |
|   |  |   (Main Disk)    |  | (Metadata/Index) |  | (Write-Ahead)  |  |   |
|   |  |                  |  |                  |  |                |  |   |
|   |  |   /dev/sdb       |  |  /dev/nvme0n1p1  |  | /dev/nvme0n1p2 |  |   |
|   |  |   (HDD/SSD)      |  |    (NVMe)        |  |   (NVMe)       |  |   |
|   |  +------------------+  +------------------+  +----------------+  |   |
|   +-----------------------------------------------------------------+   |
|                                                                         |
|   DB/WAL 분리 장점:                                                      |
|   - HDD OSD의 성능 향상 (메타데이터/저널을 SSD에)                         |
|   - 쓰기 지연 감소                                                       |
|   - IOPS 향상                                                           |
|                                                                         |
|   권장 비율:                                                             |
|   - DB: OSD 용량의 4% 이상 (최소 30GB)                                   |
|   - WAL: 1-2GB                                                          |
|   - 1개 NVMe에 여러 OSD의 DB/WAL 가능 (6-8개 권장 한도)                   |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 5.3 OSD 관리

```bash
# OSD 상태 확인
ceph osd stat
# 예: 12 osds: 12 up, 12 in

# OSD 사용량 확인
ceph osd df tree

# 특정 OSD 정지
ceph osd ok-to-stop osd.0      # 안전성 확인
pveceph stop --service osd.0

# OSD Out 처리 (데이터 재분배 시작)
ceph osd out osd.0

# OSD In 복귀
ceph osd in osd.0

# OSD 삭제
pveceph osd destroy 0 --cleanup

# OSD 재활성화 (크래시 후)
ceph-volume lvm activate --all
```

### 5.4 OSD 교체 절차

```bash
# 1. OSD 상태 확인 및 안전성 검증
ceph osd df tree
ceph osd ok-to-stop osd.5

# 2. OSD Out 처리 (리밸런싱 시작)
ceph osd out osd.5

# 3. 리밸런싱 완료 대기 (PG가 0이 될 때까지)
watch ceph osd df tree

# 4. OSD 정지
pveceph stop --service osd.5

# 5. OSD 삭제
pveceph osd destroy 5 --cleanup

# 6. 물리 디스크 교체

# 7. 새 디스크로 OSD 생성
pveceph osd create /dev/sdX

# 8. 리밸런싱 완료 확인
ceph -s
```

---

## 6. Ceph Pools

### 6.1 Pool 개념

```
+-------------------------------------------------------------------------+
|                           Pool Concept                                   |
+-------------------------------------------------------------------------+
|                                                                         |
|   Pool = 논리적 데이터 파티션                                             |
|                                                                         |
|   +---------------------------+                                         |
|   |          Pool             |                                         |
|   |  (예: vm-pool)            |                                         |
|   +---------------------------+                                         |
|   |                           |                                         |
|   |  +-------+  +-------+     |                                         |
|   |  | PG 0  |  | PG 1  | ... |   PG = Placement Group                  |
|   |  +-------+  +-------+     |       (오브젝트들의 논리적 그룹)          |
|   |                           |                                         |
|   +---------------------------+                                         |
|                                                                         |
|   각 PG는 여러 OSD에 복제됨 (size 설정에 따라)                            |
|                                                                         |
|   PG 0: [OSD.0, OSD.4, OSD.8]   <- 3개 복제본                            |
|   PG 1: [OSD.1, OSD.5, OSD.9]                                           |
|   PG 2: [OSD.2, OSD.6, OSD.10]                                          |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 6.2 Pool 생성

```bash
# 기본 Pool 생성
pveceph pool create mypool

# 옵션과 함께 생성
pveceph pool create vm-storage \
  --size 3 \
  --min_size 2 \
  --pg_num 128 \
  --add_storages

# GUI: 노드 -> Ceph -> Pools -> Create

# Pool 목록 확인
ceph osd lspools
pveceph pool ls

# Pool 상태 확인
ceph osd pool stats vm-storage
```

### 6.3 Pool 옵션

```bash
# Pool 설정 변경
ceph osd pool set <pool-name> <option> <value>

# 복제 개수 변경
ceph osd pool set vm-storage size 3
ceph osd pool set vm-storage min_size 2

# PG Autoscaler 설정
ceph osd pool set vm-storage pg_autoscale_mode on   # 자동
ceph osd pool set vm-storage pg_autoscale_mode warn # 경고만
ceph osd pool set vm-storage pg_autoscale_mode off  # 수동

# Target Size 설정 (Autoscaler 힌트)
ceph osd pool set vm-storage target_size_bytes 1T

# PG 수 수동 조정
ceph osd pool set vm-storage pg_num 256

# CRUSH Rule 변경
ceph osd pool set vm-storage crush_rule ssd_rule

# Pool 삭제
pveceph pool destroy vm-storage
```

### 6.4 Erasure Coding Pool

```bash
# EC Pool 생성 (k=2, m=1 -> 저장 효율 66%)
pveceph pool create ec-pool --erasure-coding k=2,m=1

# 더 높은 내결함성 (k=4, m=2 -> 저장 효율 66%, 2개 장애 허용)
pveceph pool create ec-pool-ha --erasure-coding k=4,m=2

# 장치 클래스 지정
pveceph pool create ec-pool --erasure-coding k=2,m=1,device-class=ssd

# EC Pool은 두 개의 실제 Pool 생성:
# - ec-pool-data (EC, 실제 데이터)
# - ec-pool-metadata (복제, 메타데이터)

# 스토리지로 추가 시 data-pool 지정 필요
pvesm add rbd ec-storage \
  --pool ec-pool-metadata \
  --data-pool ec-pool-data
```

**Erasure Coding vs Replication:**

```
+-------------------------------------------------------------------------+
|                    EC vs Replication Comparison                          |
+-------------------------------------------------------------------------+
|                                                                         |
|   Replication (size=3):                                                 |
|   +--------+     +--------+     +--------+                              |
|   | Data   | --> | Copy 1 | --> | Copy 2 |                              |
|   | 1 GB   |     | 1 GB   |     | 1 GB   |                              |
|   +--------+     +--------+     +--------+                              |
|   총 사용: 3 GB, 효율: 33%, 1개 장애 허용                                 |
|                                                                         |
|   Erasure Coding (k=2, m=1):                                            |
|   +--------+     +--------+     +--------+                              |
|   | Data 1 | --> | Data 2 | --> | Parity |                              |
|   | 512 MB |     | 512 MB |     | 512 MB |                              |
|   +--------+     +--------+     +--------+                              |
|   총 사용: 1.5 GB, 효율: 66%, 1개 장애 허용                               |
|                                                                         |
|   EC 장점: 저장 효율 높음                                                 |
|   EC 단점: CPU 사용량 증가, 쓰기 성능 저하, 복잡성                         |
|   권장: 백업/아카이브에 EC, VM 디스크에 Replication                       |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 7. CRUSH (Controlled Replication Under Scalable Hashing)

### 7.1 CRUSH 개념

```
+-------------------------------------------------------------------------+
|                          CRUSH Hierarchy                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|                         +--------+                                       |
|                         | root   |                                       |
|                         |default |                                       |
|                         +----+---+                                       |
|                              |                                           |
|          +-------------------+-------------------+                       |
|          |                   |                   |                       |
|     +----+----+         +----+----+         +----+----+                  |
|     | rack    |         | rack    |         | rack    |                  |
|     | rack1   |         | rack2   |         | rack3   |                  |
|     +----+----+         +----+----+         +----+----+                  |
|          |                   |                   |                       |
|     +----+----+         +----+----+         +----+----+                  |
|     | host    |         | host    |         | host    |                  |
|     | node1   |         | node2   |         | node3   |                  |
|     +----+----+         +----+----+         +----+----+                  |
|          |                   |                   |                       |
|    +-----+-----+       +-----+-----+       +-----+-----+                 |
|    |  |  |  |  |       |  |  |  |  |       |  |  |  |  |                 |
|   osd osd osd osd     osd osd osd osd     osd osd osd osd               |
|    0   1   2   3       4   5   6   7       8   9  10  11                 |
|                                                                         |
|   Failure Domain (장애 도메인):                                          |
|   - host: 복제본이 다른 호스트에 분배 (기본값)                            |
|   - rack: 복제본이 다른 랙에 분배                                        |
|   - osd: 같은 호스트의 다른 OSD에도 분배 가능 (권장 안 함)                |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 7.2 Device Class 활용

```bash
# Device Class 확인
ceph osd tree --show-shadow

# 예시 출력:
# ID  CLASS  WEIGHT   TYPE NAME
# -1         7.27548  root default
# -2    hdd  4.36528  root default~hdd
# -3    ssd  2.91020  root default~ssd

# 특정 클래스용 CRUSH Rule 생성
ceph osd crush rule create-replicated ssd-rule default host ssd
ceph osd crush rule create-replicated hdd-rule default host hdd

# Pool에 Rule 적용
ceph osd pool set vm-pool crush_rule ssd-rule
ceph osd pool set backup-pool crush_rule hdd-rule

# Rule 목록 확인
ceph osd crush rule ls
```

### 7.3 CRUSH Map 관리

```bash
# CRUSH Map 내보내기
ceph osd getcrushmap -o /tmp/crushmap.bin
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt

# CRUSH Map 편집 후 적용
crushtool -c /tmp/crushmap.txt -o /tmp/crushmap-new.bin
ceph osd setcrushmap -i /tmp/crushmap-new.bin

# Bucket (위치) 추가
ceph osd crush add-bucket rack1 rack
ceph osd crush move rack1 root=default
ceph osd crush move node1 rack=rack1
```

---

## 8. CephFS (Ceph File System)

### 8.1 CephFS 아키텍처

```
+-------------------------------------------------------------------------+
|                        CephFS Architecture                               |
+-------------------------------------------------------------------------+
|                                                                         |
|   +------------------+     +------------------+     +------------------+ |
|   |   Client (VM)    |     |   Client (CT)    |     | Client (Node)    | |
|   | mount -t ceph    |     | mount -t ceph    |     | /mnt/pve/cephfs  | |
|   +--------+---------+     +--------+---------+     +--------+---------+ |
|            |                        |                        |           |
|            +------------+-----------+------------------------+           |
|                         |                                                |
|                         v                                                |
|   +-------------------------------------------------------------+       |
|   |                    MDS (Metadata Server)                     |       |
|   |              디렉토리, 파일명, 권한, 타임스탬프                 |       |
|   +-------------------------------------------------------------+       |
|                         |                                                |
|                         v                                                |
|   +-------------------------------------------------------------+       |
|   |                      RADOS Cluster                           |       |
|   |  +------------------+           +------------------+         |       |
|   |  | cephfs_metadata  |           |   cephfs_data    |         |       |
|   |  | (메타데이터 Pool) |           |  (데이터 Pool)   |         |       |
|   |  +------------------+           +------------------+         |       |
|   +-------------------------------------------------------------+       |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 8.2 MDS 배포

```bash
# MDS 생성
pveceph mds create

# 여러 노드에 MDS 배포 (HA용)
# node1에서:
pveceph mds create
# node2에서:
pveceph mds create

# MDS 상태 확인
ceph mds stat

# 예시 출력:
# cephfs:1 {0=node1=up:active} 2 up:standby

# Hot Standby 활성화 (/etc/pve/ceph.conf)
# [mds.node2]
# mds standby replay = true

# MDS 삭제
pveceph mds destroy node1
```

### 8.3 CephFS 생성

```bash
# CephFS 생성 (MDS 배포 후)
pveceph fs create --pg_num 128 --add-storage

# 이름 지정
pveceph fs create --name myfs --pg_num 128

# 생성되는 항목:
# - cephfs_data Pool (데이터)
# - cephfs_metadata Pool (메타데이터)
# - CephFS "cephfs"
# - Proxmox VE Storage (--add-storage 옵션 시)

# CephFS 상태 확인
ceph fs status

# 예시 출력:
# cephfs - 1 clients
# ======
# RANK  STATE      MDS         ACTIVITY     DNS    INOS
#  0    active  node1  Reqs:    0 /s    123    456
#       POOL         TYPE     USED  AVAIL
# cephfs_metadata  metadata   128M   100G
# cephfs_data      data      10.5G   100G
```

### 8.4 CephFS 스토리지 추가

```bash
# GUI: Datacenter -> Storage -> Add -> CephFS

# CLI로 추가
pvesm add cephfs cephfs-storage \
  --monhost "10.20.20.11,10.20.20.12,10.20.20.13" \
  --path /mnt/pve/cephfs-storage \
  --content vztmpl,iso,backup

# 외부 Ceph 클러스터의 경우
pvesm add cephfs external-cephfs \
  --monhost "192.168.1.100,192.168.1.101,192.168.1.102" \
  --username admin \
  --fs-name cephfs \
  --content backup,iso,vztmpl

# Keyring 복사 (외부 클러스터)
mkdir -p /etc/pve/priv/ceph
cp /etc/ceph/ceph.client.admin.keyring /etc/pve/priv/ceph/external-cephfs.keyring
```

### 8.5 CephFS 삭제

```bash
# 1. 클라이언트 연결 해제
umount /mnt/pve/cephfs-storage

# 2. Proxmox VE 스토리지 비활성화
pvesm set cephfs-storage --disable 1

# 3. MDS 정지
pveceph stop --service mds.node1
pveceph stop --service mds.node2

# 4. CephFS 삭제
pveceph fs destroy cephfs --remove-storages --remove-pools
```

---

## 9. RBD (RADOS Block Device)

### 9.1 RBD 스토리지 추가

```bash
# GUI: Datacenter -> Storage -> Add -> RBD

# CLI로 추가 (로컬 Ceph)
pvesm add rbd rbd-storage --pool vm-pool --content images,rootdir

# 외부 Ceph 클러스터
pvesm add rbd external-rbd \
  --pool vm-pool \
  --monhost "192.168.1.100,192.168.1.101,192.168.1.102" \
  --username admin \
  --content images,rootdir

# Keyring 복사
mkdir -p /etc/pve/priv/ceph
cp /path/to/keyring /etc/pve/priv/ceph/external-rbd.keyring

# EC Pool을 data-pool로 사용
pvesm add rbd ec-rbd-storage \
  --pool ec-pool-metadata \
  --data-pool ec-pool-data \
  --content images
```

### 9.2 RBD 관리

```bash
# RBD 이미지 목록
rbd ls vm-pool

# 이미지 정보
rbd info vm-pool/vm-100-disk-0

# 스냅샷 생성
rbd snap create vm-pool/vm-100-disk-0@backup

# 스냅샷 목록
rbd snap ls vm-pool/vm-100-disk-0

# 스냅샷 삭제
rbd snap rm vm-pool/vm-100-disk-0@backup

# 이미지 삭제
rbd rm vm-pool/vm-100-disk-0
```

---

## 10. Ceph 모니터링

### 10.1 상태 확인 명령어

```bash
# 클러스터 전체 상태
ceph -s
# 또는
ceph status

# 예시 출력:
#   cluster:
#     id:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#     health: HEALTH_OK
#
#   services:
#     mon: 3 daemons, quorum node1,node2,node3
#     mgr: node1(active), standbys: node2, node3
#     mds: cephfs:1 {0=node1=up:active} 2 up:standby
#     osd: 12 osds: 12 up, 12 in
#
#   data:
#     pools:   3 pools, 385 pgs
#     objects: 10.5k objects, 42 GiB
#     usage:   130 GiB used, 870 GiB / 1 TiB avail
#     pgs:     385 active+clean

# 실시간 모니터링
ceph -w
# 또는
watch ceph -s

# 상세 상태
ceph health detail
```

### 10.2 구성 요소별 상태

```bash
# OSD 상태
ceph osd stat
ceph osd tree
ceph osd df tree

# Monitor 상태
ceph mon stat
ceph mon dump

# Manager 상태
ceph mgr stat
ceph mgr module ls

# MDS 상태
ceph mds stat
ceph fs status

# Pool 상태
ceph osd pool stats
ceph df
```

### 10.3 PG (Placement Group) 상태

```bash
# PG 상태 요약
ceph pg stat

# 예시 출력:
# 385 pgs: 385 active+clean; 42 GiB data, 130 GiB used, 870 GiB / 1 TiB avail

# PG 상세 상태
ceph pg dump
ceph pg dump_stuck

# 비정상 PG 확인
ceph pg dump_stuck unclean
ceph pg dump_stuck inactive
ceph pg dump_stuck stale
```

### 10.4 성능 모니터링

```bash
# 실시간 I/O 통계
ceph osd perf

# OSD 지연 시간
ceph osd perf | sort -k3 -rn | head

# Pool I/O
ceph osd pool stats vm-pool

# 클러스터 I/O
rados bench -p vm-pool 10 write
rados bench -p vm-pool 10 seq

# OSD별 IOPS
ceph daemon osd.0 perf dump
```

---

## 11. 문제 해결

### 11.1 일반적인 문제

```
+-------------------------------------------------------------------------+
|                     Common Ceph Problems                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|   HEALTH_WARN: OSD down                                                 |
|   ─────────────────────                                                 |
|   원인: 디스크 장애, 네트워크 문제, 서비스 크래시                          |
|   해결:                                                                  |
|   1. ceph osd tree로 down OSD 확인                                      |
|   2. OSD 노드에서 journalctl -u ceph-osd@<id> 로그 확인                  |
|   3. ceph-volume lvm activate --all 로 재활성화 시도                     |
|   4. 디스크 문제 시 OSD 교체 절차 수행                                    |
|                                                                         |
|   HEALTH_WARN: PGs degraded/undersized                                  |
|   ───────────────────────────────────                                   |
|   원인: OSD 장애로 복제본 부족                                           |
|   해결:                                                                  |
|   1. OSD 복구 또는 교체                                                  |
|   2. 복구 진행 중이면 대기 (ceph -w로 모니터링)                           |
|   3. 심각한 경우 min_size 임시 조정 (권장 안 함)                          |
|                                                                         |
|   HEALTH_WARN: too few PGs per OSD                                      |
|   ──────────────────────────────────                                    |
|   원인: PG 수가 OSD 수에 비해 적음                                        |
|   해결:                                                                  |
|   1. PG Autoscaler 활성화: ceph osd pool set <pool> pg_autoscale_mode on|
|   2. 수동 PG 조정: ceph osd pool set <pool> pg_num <value>              |
|                                                                         |
|   HEALTH_WARN: clock skew detected                                      |
|   ─────────────────────────────────                                     |
|   원인: 노드 간 시간 동기화 불량                                          |
|   해결:                                                                  |
|   1. NTP 서비스 확인: systemctl status chrony                           |
|   2. 시간 동기화: chronyc makestep                                       |
|   3. /etc/chrony/chrony.conf 설정 확인                                   |
|                                                                         |
|   HEALTH_WARN: noout flag(s) set                                        |
|   ───────────────────────────────                                       |
|   원인: 유지보수 중 설정된 플래그                                         |
|   해결: ceph osd unset noout                                            |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 11.2 복구 명령어

```bash
# OSD 재활성화
ceph-volume lvm activate --all

# 크래시 정보 확인 및 아카이브
ceph crash ls
ceph crash info <crash_id>
ceph crash archive-all

# 복구 속도 조절
ceph config set osd osd_recovery_max_active 1  # 느린 복구 (I/O 영향 최소화)
ceph config set osd osd_recovery_max_active 3  # 기본값
ceph config set osd osd_recovery_max_active 10 # 빠른 복구

# PG 복구 강제
ceph pg repair <pg_id>

# 강제 복구 (위험!)
ceph osd force-create-pg <pg_id>
```

### 11.3 유지보수 모드

```bash
# 전체 클러스터 유지보수 (OSD가 out되지 않음)
ceph osd set noout

# 유지보수 완료 후
ceph osd unset noout

# 특정 OSD 유지보수
ceph osd add-noout osd.5
# 유지보수 후
ceph osd rm-noout osd.5

# 기타 유용한 플래그
ceph osd set norebalance  # 리밸런싱 중지
ceph osd set noscrub      # Scrub 중지
ceph osd set nodeep-scrub # Deep Scrub 중지
```

---

## 12. 클러스터 종료 및 시작

### 12.1 안전한 클러스터 종료

```bash
# 1. 모든 VM/CT 종료
# GUI 또는 CLI로 모든 게스트 종료

# 2. HA 서비스 중지 (사용 중인 경우)
ha-manager set vm:100 --state stopped

# 3. noout 플래그 설정 (복구 방지)
ceph osd set noout

# 4. Ceph 상태 확인
ceph -s

# 5. MON이 없는 노드부터 종료
shutdown -h now

# 6. MON이 있는 노드 종료 (마지막)
```

### 12.2 클러스터 시작

```bash
# 1. MON이 있는 노드부터 시작

# 2. 모든 노드 시작 후 Ceph 상태 확인
ceph -s

# 3. noout 플래그 해제
ceph osd unset noout

# 4. 상태가 HEALTH_OK인지 확인
ceph -s

# 5. VM/CT 시작
```

---

## 13. 모범 사례

### 13.1 배포 권장사항

```
+-------------------------------------------------------------------------+
|                    Ceph Deployment Best Practices                        |
+-------------------------------------------------------------------------+
|                                                                         |
|   클러스터 크기:                                                         |
|   - 최소: 3 노드, 각 노드 4+ OSD                                         |
|   - 권장: 5+ 노드, 노드당 동일 수의 OSD                                   |
|                                                                         |
|   네트워크 분리:                                                         |
|   - Ceph Public/Cluster 네트워크 분리                                    |
|   - Corosync는 별도 네트워크                                             |
|   - 최소 10 Gbps, 권장 25 Gbps+                                          |
|                                                                         |
|   디스크 구성:                                                           |
|   - RAID 사용 금지 (HBA 권장)                                            |
|   - 노드당 균등한 디스크 수/용량                                          |
|   - SSD/NVMe는 DB/WAL 또는 고성능 Pool에                                 |
|   - HDD는 백업/아카이브 Pool에                                           |
|                                                                         |
|   Pool 설계:                                                             |
|   - VM 디스크: SSD Pool (size=3)                                        |
|   - 백업: HDD Pool 또는 EC Pool                                          |
|   - CephFS: 별도 Pool (메타데이터는 SSD)                                  |
|                                                                         |
|   모니터링:                                                              |
|   - Ceph Dashboard 활성화                                                |
|   - Prometheus/Grafana 연동                                              |
|   - 알림 설정                                                            |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 13.2 성능 튜닝

```bash
# OSD 메모리 설정
ceph config set osd osd_memory_target 8G

# 복구 우선순위 설정
ceph config set osd osd_recovery_op_priority 1
ceph config set osd osd_recovery_max_active 3

# Scrub 시간 제한 (업무 시간 외)
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6

# Bluestore 캐시
ceph config set osd bluestore_cache_size 4G

# PG Autoscaler 활성화
ceph mgr module enable pg_autoscaler
```

---

## 14. 명령어 참조

### 14.1 pveceph 명령어

```bash
# 설치 및 초기화
pveceph install [--version <version>]
pveceph init --network <CIDR> [--cluster-network <CIDR>]

# Monitor/Manager
pveceph mon create
pveceph mon destroy
pveceph mgr create
pveceph mgr destroy

# OSD
pveceph osd create <device> [options]
pveceph osd destroy <osd-id> [--cleanup]

# Pool
pveceph pool create <name> [options]
pveceph pool destroy <name>
pveceph pool ls

# CephFS
pveceph fs create [--name <name>] [--pg_num <num>] [--add-storage]
pveceph fs destroy <name> [--remove-storages] [--remove-pools]
pveceph mds create
pveceph mds destroy <name>

# 서비스 관리
pveceph start [--service <service>]
pveceph stop [--service <service>]
pveceph status
```

### 14.2 ceph 명령어

```bash
# 상태
ceph -s / ceph status
ceph health [detail]
ceph -w / ceph --watch

# OSD
ceph osd tree
ceph osd df [tree]
ceph osd stat
ceph osd pool ls [detail]

# Monitor
ceph mon stat
ceph mon dump

# MDS
ceph mds stat
ceph fs status

# PG
ceph pg stat
ceph pg dump
ceph pg dump_stuck [unclean|inactive|stale]

# 설정
ceph config dump
ceph config set <who> <name> <value>
ceph config get <who> <name>

# 플래그
ceph osd set <flag>    # noout, norebalance, noscrub, etc.
ceph osd unset <flag>
```

---

## 15. 요약

### 15.1 핵심 개념

| 구성 요소 | 역할 |
|----------|------|
| MON | 클러스터 맵 유지, 인증 |
| MGR | 메트릭 수집, 대시보드 |
| OSD | 데이터 저장 (1 OSD = 1 디스크) |
| MDS | CephFS 메타데이터 |
| Pool | 논리적 스토리지 파티션 |
| PG | Placement Group, 오브젝트 그룹 |
| CRUSH | 데이터 배치 알고리즘 |

### 15.2 배포 순서

```
1. pveceph install (모든 노드)
2. pveceph init --network (첫 노드)
3. pveceph mon create (3개 노드)
4. pveceph mgr create (MON 노드에)
5. pveceph osd create (모든 디스크)
6. pveceph pool create (필요한 Pool)
7. (선택) pveceph mds create + pveceph fs create (CephFS용)
8. pvesm add rbd/cephfs (스토리지 추가)
```

### 15.3 상태 점검 체크리스트

```
□ ceph -s 에서 HEALTH_OK 확인
□ 모든 OSD가 up, in 상태
□ MON 쿼럼 정상 (3개 이상)
□ MGR active 확인
□ PG가 모두 active+clean
□ 네트워크 대역폭/지연 정상
□ 디스크 사용량 80% 미만
```

---

## 프로젝트 완료

이것으로 **Proxmox VE 학습 문서 프로젝트**가 완료되었습니다!

### 완성된 모듈 목록:

| 모듈 | 제목 | 파일명 |
|------|------|--------|
| Module 1 | Core Architecture | module1-core-architecture.md |
| Module 2 | Network & SDN | module2-network-sdn.md |
| Module 3 | Storage Subsystem | module3-storage-subsystem.md |
| Module 4 | Compute Virtualization | module4-compute-virtualization.md |
| Module 5 | High Availability | module5-high-availability.md |
| Module 6 | Backup & Restore | module6-backup-restore.md |
| Module 7 | Firewall | module7-firewall.md |
| Module 8 | User Management | module8-user-management.md |
| Module 9 | Ceph Cluster | module9-ceph-cluster.md |

모든 문서는 `/home/nodove/workspace/proxmox/` 디렉토리에 저장되어 있습니다.
