# Module 3: Proxmox VE 고급 스토리지 서브시스템

## 데이터 보호와 측정 계약

- storage backend와 기능 지원은 Proxmox VE, kernel/ZFS/Ceph/NFS 버전, guest 유형과 volume format에 따라 달라집니다.
- `pvesm`, LVM, ZFS, Ceph 변경 전 실제 storage ID, device serial, mount, guest 사용 관계와 복원 가능한 backup을 확인합니다.
- snapshot, thin provisioning, replication, RAID/Ceph redundancy와 backup을 구분합니다. 어느 하나도 단독으로 삭제·침해·사이트 장애 전체를 막지 않습니다.
- 완료 증거는 capacity 표시뿐 아니라 guest fsync/latency 분포, failure 상태, 재부팅, backup restore와 경보 임곗값 검증입니다.

## 학습 목표
이 모듈을 완료하면 다음을 이해할 수 있습니다:
- Proxmox VE 스토리지 계층 구조와 각 타입의 특징
- File-level vs Block-level 스토리지의 차이와 선택 기준
- ZFS의 I/O 경로와 ARC/ZIL 캐싱 메커니즘
- pvesm 명령어를 활용한 스토리지 관리

---

## 1. 스토리지 아키텍처 개요

### 1.1 왜 스토리지 설계가 중요한가?

```
┌─────────────────────────────────────────────────────────────────────┐
│               가상화 환경의 I/O 병목 지점                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Guest OS                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Application                                                 │   │
│  │       │                                                      │   │
│  │       │ read()/write() syscall                               │   │
│  │       ▼                                                      │   │
│  │  VFS (Virtual File System)                                   │   │
│  │       │                                                      │   │
│  │       ▼                                                      │   │
│  │  Guest Filesystem (ext4, NTFS, etc.)                         │   │
│  │       │                                                      │   │
│  │       ▼                                                      │   │
│  │  Block Device (/dev/sda, /dev/vda)                           │   │
│  └───────┼─────────────────────────────────────────────────────┘   │
│          │                                                          │
│          │ ★ 병목 지점 1: Emulated I/O vs VirtIO ★                   │
│          ▼                                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  Hypervisor Layer (KVM/QEMU)                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  VirtIO Block Driver                                         │   │
│  │       │                                                      │   │
│  │       │ ★ 병목 지점 2: 디스크 이미지 포맷 ★                    │   │
│  │       ▼                                                      │   │
│  │  Image Format Handler (raw, qcow2, vmdk)                     │   │
│  │       │                                                      │   │
│  │       │ ★ 병목 지점 3: 캐시 모드 ★                            │   │
│  │       ▼                                                      │   │
│  │  Cache Layer (none, writeback, writethrough)                 │   │
│  └───────┼─────────────────────────────────────────────────────┘   │
│          │                                                          │
│          │ ★ 병목 지점 4: 스토리지 백엔드 ★                         │
│          ▼                                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  Storage Backend                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Directory / LVM / LVM-thin / ZFS / Ceph RBD / NFS / iSCSI   │   │
│  │       │                                                      │   │
│  │       ▼                                                      │   │
│  │  Physical Storage (SSD, HDD, NVMe)                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Proxmox VE 스토리지 타입 분류

```
┌─────────────────────────────────────────────────────────────────────┐
│              스토리지 타입 분류 맵                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌────────────────────────────┐                   │
│                    │     Storage Types          │                   │
│                    └──────────┬─────────────────┘                   │
│                               │                                     │
│         ┌─────────────────────┴─────────────────────┐              │
│         │                                           │              │
│         ▼                                           ▼              │
│  ┌──────────────────┐                    ┌──────────────────┐      │
│  │   File-level     │                    │   Block-level    │      │
│  │   (파일 수준)     │                    │   (블록 수준)     │      │
│  └────────┬─────────┘                    └────────┬─────────┘      │
│           │                                       │                 │
│     ┌─────┴─────┐                          ┌─────┴─────┐           │
│     │           │                          │           │           │
│     ▼           ▼                          ▼           ▼           │
│  ┌──────┐   ┌──────┐                   ┌──────┐   ┌──────┐        │
│  │Local │   │Shared│                   │Local │   │Shared│        │
│  └──┬───┘   └──┬───┘                   └──┬───┘   └──┬───┘        │
│     │          │                          │          │             │
│     ▼          ▼                          ▼          ▼             │
│  ┌──────┐   ┌──────┐                   ┌──────┐   ┌──────────┐    │
│  │ dir  │   │ NFS  │                   │ LVM  │   │ iSCSI    │    │
│  │      │   │ CIFS │                   │ LVM- │   │ Ceph RBD │    │
│  │      │   │ PBS  │                   │ thin │   │ iSCSI-   │    │
│  │      │   │      │                   │ ZFS  │   │ direct   │    │
│  └──────┘   └──────┘                   └──────┘   └──────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 File-level vs Block-level 비교

| 특성 | File-level | Block-level |
|------|-----------|-------------|
| **저장 방식** | 이미지 파일 (vm-100-disk-0.qcow2) | 블록 디바이스 (/dev/zvol/...) |
| **스냅샷** | qcow2 내장 기능 또는 파일시스템 | 스토리지 네이티브 |
| **라이브 마이그레이션** | 공유 스토리지 필요 | 공유 스토리지 필요 |
| **씬 프로비저닝** | qcow2만 지원 | LVM-thin, ZFS, Ceph 지원 |
| **성능** | 약간의 오버헤드 | 더 나은 성능 |
| **복잡성** | 간단 | 복잡 |

---

## 2. 스토리지 타입 상세 분석

### 2.1 Directory Backend (dir)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Directory Storage 구조                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  /var/lib/vz/ (기본 local 스토리지)                                  │
│  │                                                                  │
│  ├── images/                  # VM 디스크 이미지                     │
│  │   ├── 100/                                                       │
│  │   │   ├── vm-100-disk-0.qcow2     # VM 100의 첫 번째 디스크      │
│  │   │   └── vm-100-disk-1.raw       # VM 100의 두 번째 디스크      │
│  │   └── 101/                                                       │
│  │       └── vm-101-disk-0.qcow2                                    │
│  │                                                                  │
│  ├── template/                                                      │
│  │   ├── iso/                 # ISO 이미지                          │
│  │   │   ├── ubuntu-22.04.iso                                       │
│  │   │   └── windows-server-2022.iso                                │
│  │   └── cache/               # CT 템플릿                           │
│  │       └── debian-12-standard_12.0-1_amd64.tar.zst                │
│  │                                                                  │
│  ├── dump/                    # 백업 파일                           │
│  │   ├── vzdump-qemu-100-2026_01_10-14_30_00.vma.zst               │
│  │   └── vzdump-lxc-200-2026_01_10-14_35_00.tar.zst                │
│  │                                                                  │
│  └── snippets/                # 커스텀 스니펫 (Cloud-Init, Hook)    │
│      └── user-data.yaml                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**설정 예시 (`/etc/pve/storage.cfg`):**
```
dir: local
        path /var/lib/vz
        content iso,vztmpl,backup,snippets,images,rootdir
        prune-backups keep-last=3
        max-protected-backups 5
```

**이미지 포맷 비교:**

| 포맷 | 특징 | 용도 |
|------|------|------|
| **raw** | 실제 크기 할당, 최고 성능 | 고성능 VM |
| **qcow2** | 씬 프로비저닝, 스냅샷 지원 | 일반 VM (권장) |
| **vmdk** | VMware 호환 | 마이그레이션용 |

### 2.2 LVM Backend (lvm)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LVM 아키텍처                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────────────┐                          │
│                    │   Volume Group (VG)  │                          │
│                    │       "pve"          │                          │
│                    └──────────┬──────────┘                          │
│                               │                                      │
│         ┌─────────────────────┼─────────────────────┐               │
│         │                     │                     │               │
│         ▼                     ▼                     ▼               │
│   ┌───────────┐        ┌───────────┐        ┌───────────┐          │
│   │ LV: root  │        │ LV: swap  │        │ LV: data  │          │
│   │   96GB    │        │    8GB    │        │  (thin)   │          │
│   │           │        │           │        │   200GB   │          │
│   └─────┬─────┘        └─────┬─────┘        └─────┬─────┘          │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              │                                      │
│                              ▼                                      │
│                    ┌─────────────────────┐                          │
│                    │  Physical Volume(s)  │                          │
│                    │  /dev/nvme0n1p3      │                          │
│                    │       512GB          │                          │
│                    └─────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**LVM 명령어:**
```bash
# PV (Physical Volume) 확인
pvs

# VG (Volume Group) 확인
vgs

# LV (Logical Volume) 확인
lvs

# VM 디스크 생성 예시
lvcreate -L 50G -n vm-100-disk-0 pve

# 출력 예시:
# LV               VG   Attr       LSize   Pool
# root             pve  -wi-ao---- 96.00g
# swap             pve  -wi-ao----  8.00g
# vm-100-disk-0    pve  -wi-a----- 50.00g
```

### 2.3 LVM-thin Backend (lvmthin)

**일반 LVM vs LVM-thin:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    일반 LVM (Thick Provisioning)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   VM 100 요청: 100GB 디스크                                         │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ ██████████████████████████████████████████████████          │  │
│   │ 100GB 즉시 할당 (실제 사용: 10GB)                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   문제: 90GB 낭비                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    LVM-thin (Thin Provisioning)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   VM 100 요청: 100GB 디스크                                         │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │
│   │ 실제 사용된 10GB만 할당, 나머지는 필요시 할당                  │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   장점: 스토리지 효율성 극대화, 스냅샷/클론 빠름                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**LVM-thin 설정:**
```bash
# thin pool 생성
lvcreate -L 200G -n data pve
lvconvert --type thin-pool pve/data

# 설정 예시 (/etc/pve/storage.cfg)
# lvmthin: local-lvm
#         thinpool data
#         vgname pve
#         content rootdir,images
```

**thin pool 상태 확인:**
```bash
lvs -o+lv_size,data_percent,metadata_percent pve/data

# 출력 예시:
# LV   VG   Attr       LSize   Data%  Meta%
# data pve  twi-aotz-- 200.00g 35.50  10.20
```

### 2.4 ZFS Backend (zfspool)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ZFS 스토리지 계층                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ZFS Pool (zpool)                          │   │
│  │                      "rpool"                                 │   │
│  └────────────────────────────┬────────────────────────────────┘   │
│                               │                                     │
│         ┌─────────────────────┼─────────────────────┐              │
│         │                     │                     │              │
│         ▼                     ▼                     ▼              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │  Dataset     │    │   zvol       │    │  Dataset     │        │
│   │ rpool/ROOT   │    │ rpool/data/  │    │ rpool/data   │        │
│   │ (filesystem) │    │ vm-100-disk-0│    │ (filesystem) │        │
│   │              │    │ (block dev)  │    │              │        │
│   └──────────────┘    └──────────────┘    └──────────────┘        │
│                                                                     │
│  VDEV (가상 장치) 구성:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │   mirror-0          mirror-1          cache         log    │   │
│  │  ┌───┐ ┌───┐      ┌───┐ ┌───┐      ┌───────┐    ┌──────┐  │   │
│  │  │sda│ │sdb│      │sdc│ │sdd│      │nvme0n1│    │nvme1n1│  │   │
│  │  │HDD│ │HDD│      │HDD│ │HDD│      │ SSD   │    │ SSD  │  │   │
│  │  └───┘ └───┘      └───┘ └───┘      └───────┘    └──────┘  │   │
│  │                                       (L2ARC)    (SLOG)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**ZFS 핵심 개념:**

| 구성요소 | 설명 |
|---------|------|
| **zpool** | 물리 디스크의 논리적 그룹 |
| **vdev** | zpool 내의 가상 장치 (mirror, raidz, etc.) |
| **dataset** | 파일시스템 또는 zvol |
| **zvol** | ZFS 볼륨 (블록 디바이스처럼 사용) |
| **ARC** | Adaptive Replacement Cache (RAM 기반) |
| **L2ARC** | Level 2 ARC (SSD 기반 캐시) |
| **ZIL** | ZFS Intent Log (쓰기 캐시) |
| **SLOG** | Separate Log device (ZIL 전용 SSD) |

**ZFS 명령어:**
```bash
# zpool 상태 확인
zpool status

# zpool I/O 통계
zpool iostat -v 5

# dataset 목록
zfs list

# VM용 zvol 생성 (Proxmox가 자동으로 수행)
zfs create -V 50G rpool/data/vm-100-disk-0

# 속성 설정
zfs set compression=lz4 rpool/data
zfs set primarycache=all rpool/data
```

**설정 예시 (`/etc/pve/storage.cfg`):**
```
zfspool: local-zfs
        pool rpool/data
        content images,rootdir
        sparse 1
```

### 2.5 Ceph RBD Backend

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Ceph 분산 스토리지 아키텍처                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    Client (Proxmox Node)                                           │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │  librbd / krbd                                           │    │
│    │       │                                                   │    │
│    │       │ RADOS Protocol                                    │    │
│    │       ▼                                                   │    │
│    └───────┼───────────────────────────────────────────────────┘    │
│            │                                                        │
│  ┌─────────┴─────────────────────────────────────────────────────┐ │
│  │                       CRUSH Map                               │ │
│  │  (데이터 배치 알고리즘 - 일관성 해싱)                           │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
│                              │                                      │
│      ┌───────────────────────┼───────────────────────┐             │
│      │                       │                       │             │
│      ▼                       ▼                       ▼             │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐          │
│  │  OSD 0  │           │  OSD 1  │           │  OSD 2  │          │
│  │ Node 1  │           │ Node 2  │           │ Node 3  │          │
│  │  /dev/  │           │  /dev/  │           │  /dev/  │          │
│  │  nvme0  │           │  nvme0  │           │  nvme0  │          │
│  └─────────┘           └─────────┘           └─────────┘          │
│                                                                     │
│  데이터 복제: 예시 size=3 - pool 설정과 placement 상태를 확인        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  MON (Monitor)     MGR (Manager)     MDS (Metadata Server)    │ │
│  │  - 클러스터 맵     - 메트릭 수집     - CephFS용 (옵션)         │ │
│  │  - 인증           - 대시보드                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Ceph 명령어:**
```bash
# Ceph 상태 확인
ceph status
ceph health detail

# OSD 상태
ceph osd status
ceph osd tree

# Pool 관리
ceph osd pool ls
ceph osd pool create vm-pool 128 128

# RBD 이미지 관리
rbd ls vm-pool
rbd info vm-pool/vm-100-disk-0
```

**설정 예시 (`/etc/pve/storage.cfg`):**
```
rbd: ceph-pool
        pool vm-pool
        content images,rootdir
        krbd 0
```

### 2.6 NFS Backend

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NFS 스토리지 설정                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    Proxmox Node                          NFS Server                 │
│    ┌────────────────┐                   ┌────────────────┐         │
│    │                │                   │                │         │
│    │  /mnt/pve/nfs  │◄── NFS Mount ────►│ /export/pve    │         │
│    │                │    (TCP 2049)     │                │         │
│    │  ┌──────────┐  │                   │  ┌──────────┐  │         │
│    │  │ images/  │  │    Network       │  │ images/  │  │         │
│    │  │ 100/     │  │◄───────────────►│  │ 100/     │  │         │
│    │  └──────────┘  │                   │  └──────────┘  │         │
│    │                │                   │                │         │
│    └────────────────┘                   └────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**설정 예시:**
```bash
# NFS 공유 스캔
pvesm scan nfs 192.168.1.100

# 스토리지 추가
pvesm add nfs shared-nfs --server 192.168.1.100 --export /export/pve --content images,rootdir,iso,backup

# 설정 결과 (/etc/pve/storage.cfg)
# nfs: shared-nfs
#         export /export/pve
#         path /mnt/pve/shared-nfs
#         server 192.168.1.100
#         content backup,images,iso,rootdir
#         options vers=4.2,hard  # 실제 timeout/recovery 정책과 서버 지원 확인
```

---

## 3. ZFS I/O 경로 심층 분석

### 3.1 데이터 흐름 시뮬레이션

```
┌─────────────────────────────────────────────────────────────────────┐
│            ZFS I/O 경로: Guest Write 작업 추적                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Guest VM (Linux)                                             │   │
│  │                                                              │   │
│  │  Application: dd if=/dev/zero of=/data/file bs=1M count=100 │   │
│  │       │                                                      │   │
│  │       │ ① write() syscall                                    │   │
│  │       ▼                                                      │   │
│  │  Page Cache (Guest RAM)                                      │   │
│  │       │                                                      │   │
│  │       │ ② Block I/O 요청                                     │   │
│  │       ▼                                                      │   │
│  │  VirtIO-BLK Driver (/dev/vda)                               │   │
│  └───────┼──────────────────────────────────────────────────────┘   │
│          │                                                          │
│          │ ③ VirtIO Ring Buffer                                    │
│          │    (vring - 공유 메모리 영역)                            │
│          ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ QEMU Process (Host)                                           │ │
│  │                                                                │ │
│  │  virtio-blk-pci device                                        │ │
│  │       │                                                        │ │
│  │       │ ④ I/O 변환                                             │ │
│  │       ▼                                                        │ │
│  │  QEMU Block Layer                                             │ │
│  │       │                                                        │ │
│  │       │ Cache Mode 적용                                        │ │
│  │       │ (none: O_DIRECT, writeback: page cache 사용)          │ │
│  │       ▼                                                        │ │
│  │  /dev/zvol/rpool/data/vm-100-disk-0                          │ │
│  └───────┼───────────────────────────────────────────────────────┘ │
│          │                                                          │
│          │ ⑤ Block I/O                                             │
│          ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ZFS (Kernel Module)                                           │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │ DMU (Data Management Unit)                              │  │ │
│  │  │  - 블록 할당                                             │  │ │
│  │  │  - 체크섬 계산                                           │  │ │
│  │  │  - 압축 (lz4)                                            │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                              │                                 │ │
│  │         ┌────────────────────┼────────────────────┐           │ │
│  │         │                    │                    │           │ │
│  │         ▼                    ▼                    ▼           │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │ │
│  │  │    ARC      │    │    ZIL      │    │   L2ARC     │       │ │
│  │  │ (RAM Cache) │    │ (Write Log) │    │ (SSD Cache) │       │ │
│  │  │             │    │             │    │             │       │ │
│  │  │ 읽기 캐시    │    │ 쓰기 저널   │    │ 읽기 확장   │       │ │
│  │  └─────────────┘    └──────┬──────┘    └─────────────┘       │ │
│  │                            │                                   │ │
│  │                            │ ⑥ sync write                     │ │
│  │                            ▼                                   │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │ SLOG (Separate Log Device)                              │  │ │
│  │  │ /dev/nvme1n1 (고속 NVMe SSD)                            │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  └───────┼───────────────────────────────────────────────────────┘ │
│          │                                                          │
│          │ ⑦ TXG (Transaction Group) Commit                       │
│          │    (기본 5초마다)                                        │
│          ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Physical Disks                                                │ │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                          │ │
│  │  │ sda │  │ sdb │  │ sdc │  │ sdd │                          │ │
│  │  │ HDD │  │ HDD │  │ HDD │  │ HDD │                          │ │
│  │  └─────┘  └─────┘  └─────┘  └─────┘                          │ │
│  │       mirror-0          mirror-1                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 ARC (Adaptive Replacement Cache)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARC 캐시 구조                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         Total ARC Size                              │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │   MRU (Most Recently Used)      MFU (Most Frequently Used)  │  │
│   │   ┌───────────────────────┐    ┌───────────────────────┐   │  │
│   │   │                       │    │                       │   │  │
│   │   │ 최근 접근 데이터       │    │ 자주 접근 데이터       │   │  │
│   │   │                       │    │                       │   │  │
│   │   │ - 순차 읽기에 유리     │    │ - 반복 읽기에 유리     │   │  │
│   │   │                       │    │                       │   │  │
│   │   └───────────────────────┘    └───────────────────────┘   │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   Ghost Lists (메타데이터만 유지)                                   │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  MRU Ghost: 최근 퇴출된 MRU 항목들의 메타데이터               │  │
│   │  MFU Ghost: 최근 퇴출된 MFU 항목들의 메타데이터               │  │
│   │                                                             │  │
│   │  → Ghost hit 시 해당 리스트 크기 증가 (적응형 알고리즘)        │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**ARC 튜닝:**
```bash
# 현재 ARC 상태 확인
arc_summary

# 또는
cat /proc/spl/kstat/zfs/arcstats

# 주요 메트릭
# size: 현재 ARC 크기
# c_max: 최대 ARC 크기
# hits: 캐시 히트 수
# misses: 캐시 미스 수
# hit_ratio = hits / (hits + misses)

# ARC 최대 크기 설정 (런타임)
echo 8589934592 > /sys/module/zfs/parameters/zfs_arc_max  # 8GB

# 영구 설정 (/etc/modprobe.d/zfs.conf)
# options zfs zfs_arc_max=8589934592
```

### 3.3 ZIL (ZFS Intent Log) 과 SLOG

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Sync Write 경로 비교                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SLOG 없는 경우:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  Write Request ──► ZIL (Main Pool 디스크에 기록)             │   │
│  │                         │                                   │   │
│  │                         │ HDD 탐색 시간 발생                 │   │
│  │                         ▼                                   │   │
│  │                    Write Complete                           │   │
│  │                                                             │   │
│  │  지연 시간: 5-10ms (HDD의 경우)                               │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  SLOG 있는 경우:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  Write Request ──► SLOG (전용 NVMe SSD)                     │   │
│  │                         │                                   │   │
│  │                         │ 초고속 순차 쓰기                   │   │
│  │                         ▼                                   │   │
│  │                    Write Complete                           │   │
│  │                         │                                   │   │
│  │                         │ 비동기로 Main Pool에 플러시        │   │
│  │                         ▼                                   │   │
│  │                    Main Pool                                │   │
│  │                                                             │   │
│  │  지연 시간: 0.1-0.5ms (NVMe의 경우)                          │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**SLOG 추가:**
```bash
# SLOG 장치 추가
zpool add rpool log /dev/nvme1n1

# 미러링된 SLOG (권장)
zpool add rpool log mirror /dev/nvme1n1 /dev/nvme2n1

# SLOG 상태 확인
zpool status rpool
```

### 3.4 성능 모니터링

```bash
# ZFS I/O 통계 (1초 간격)
zpool iostat -v 1

# 출력 예시:
#               capacity     operations     bandwidth
# pool        alloc   free   read  write   read  write
# ----------  -----  -----  -----  -----  -----  -----
# rpool       234G   266G    120    450  15.2M  58.3M
#   mirror    234G   266G     60    225  7.6M   29.1M
#     sda         -      -     30    112  3.8M   14.5M
#     sdb         -      -     30    113  3.8M   14.6M
#   mirror    234G   266G     60    225  7.6M   29.2M
#     sdc         -      -     30    113  3.8M   14.6M
#     sdd         -      -     30    112  3.8M   14.6M
# logs            -      -      -      -      -      -
#   nvme1n1       -      -      0    200     0  45.0M

# ARC 히트율 실시간 모니터링
arcstat 1

# 출력 예시:
#     time  read  miss  miss%  dmis  dm%  pmis  pm%  mmis  mm%  arcsz     c
# 14:30:01   1.2K   45   3.8%    30  2.5%   15  1.3%    0    0  7.8G  8.0G

# iostat으로 디스크 레벨 확인
iostat -xz 1
```

---

## 4. pvesm 명령어 완전 가이드

### 4.1 스토리지 관리

```bash
# 모든 스토리지 목록
pvesm status

# 출력 예시:
# Name             Type     Status           Total            Used       Available        %
# local            dir      active       96636928        45678592        46067072   47.25%
# local-lvm        lvmthin  active      209715200        73400320       136314880   35.00%
# local-zfs        zfspool  active      209715200        52428800       157286400   25.00%
# ceph-pool        rbd      active      536870912       107374182       429496730   20.00%

# 특정 스토리지 상세 정보
pvesm status --storage local-zfs

# 스토리지 설정 보기
pvesm config
```

### 4.2 스토리지 추가/제거

```bash
# Directory 스토리지 추가
pvesm add dir backup-storage --path /mnt/backup --content backup,iso --prune-backups keep-last=5

# NFS 스토리지 추가
pvesm add nfs nfs-share --server 192.168.1.100 --export /export/vms --content images,rootdir

# LVM-thin 스토리지 추가
pvesm add lvmthin fast-storage --vgname vg0 --thinpool thin-pool --content images,rootdir

# ZFS 스토리지 추가
pvesm add zfspool zfs-data --pool tank/data --content images,rootdir --sparse

# Ceph RBD 스토리지 추가
pvesm add rbd ceph-vm --pool vm-pool --content images,rootdir --krbd 0

# 스토리지 제거
pvesm remove backup-storage
```

### 4.3 볼륨 관리

```bash
# 스토리지의 볼륨 목록
pvesm list local-zfs

# 출력 예시:
# Volid                             Format  Type            Size VMID
# local-zfs:vm-100-disk-0           raw     images    53687091200  100
# local-zfs:vm-100-disk-1           raw     images    10737418240  100
# local-zfs:vm-101-disk-0           raw     images    32212254720  101

# 특정 VM의 볼륨만 표시
pvesm list local-zfs --vmid 100

# 볼륨 경로 확인
pvesm path local-zfs:vm-100-disk-0
# 출력: /dev/zvol/rpool/data/vm-100-disk-0

# 볼륨 할당
pvesm alloc local-zfs 100 vm-100-disk-2 50G

# 볼륨 크기 조정
pvesm resize local-zfs:vm-100-disk-0 100G

# 볼륨 삭제
pvesm free local-zfs:vm-100-disk-2
```

### 4.4 컨텐츠 타입별 관리

```bash
# ISO 이미지 목록
pvesm list local --content iso

# 컨테이너 템플릿 목록
pvesm list local --content vztmpl

# 백업 파일 목록
pvesm list local --content backup

# ISO/템플릿 다운로드
pveam update
pveam available --section system
pveam download local debian-12-standard_12.0-1_amd64.tar.zst
```

### 4.5 스토리지 스캔

```bash
# NFS 서버의 공유 목록 스캔
pvesm scan nfs 192.168.1.100

# iSCSI 타겟 스캔
pvesm scan iscsi 192.168.1.200

# LVM VG 스캔
pvesm scan lvm

# LVM thin pool 스캔
pvesm scan lvmthin pve

# ZFS pool 스캔
pvesm scan zfs

# Ceph pool 스캔
pvesm scan pbs myserver myuser
```

### 4.6 교차 검증: pvesm과 백엔드 도구 비교

```bash
# ZFS: pvesm vs zfs 명령어
pvesm list local-zfs --vmid 100
zfs list -r rpool/data | grep vm-100

# LVM-thin: pvesm vs lvs
pvesm list local-lvm --vmid 100
lvs pve | grep vm-100

# Ceph: pvesm vs rbd
pvesm list ceph-pool --vmid 100
rbd ls vm-pool | grep vm-100

# 디스크 사용량 비교
pvesm status --storage local-zfs
zpool list rpool

pvesm status --storage local-lvm
lvs --units g pve
```

---

## 5. 스토리지 기능 비교표

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           스토리지 백엔드 기능 비교                                   │
├──────────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│    기능      │   dir   │   lvm   │lvmthin  │   zfs   │   rbd   │   nfs   │  iscsi  │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ images       │    ✓    │    ✓    │    ✓    │    ✓    │    ✓    │    ✓    │    ✓    │
│ rootdir      │    ✓    │    ✓    │    ✓    │    ✓    │    ✓    │    ✓    │    ✗    │
│ iso          │    ✓    │    ✗    │    ✗    │    ✗    │    ✗    │    ✓    │    ✗    │
│ vztmpl       │    ✓    │    ✗    │    ✗    │    ✗    │    ✗    │    ✓    │    ✗    │
│ backup       │    ✓    │    ✗    │    ✗    │    ✗    │    ✗    │    ✓    │    ✗    │
│ snippets     │    ✓    │    ✗    │    ✗    │    ✗    │    ✗    │    ✓    │    ✗    │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 공유 가능    │    ✗    │   △*    │    ✗    │    ✗    │    ✓    │    ✓    │    ✓    │
│ 스냅샷       │  qcow2  │    ✗    │    ✓    │    ✓    │    ✓    │  qcow2  │    ✗    │
│ 클론         │  qcow2  │    ✗    │    ✓    │    ✓    │    ✓    │  qcow2  │    ✗    │
│ 씬프로비저닝 │  qcow2  │    ✗    │    ✓    │    ✓    │    ✓    │  qcow2  │    ✗    │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 이미지 포맷  │raw,qcow2│   raw   │   raw   │raw,subvol│  raw   │raw,qcow2│   raw   │
│              │  vmdk   │         │         │         │         │  vmdk   │         │
└──────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

* lvm은 iSCSI 위에서 공유 가능
```

---

## 6. 실습 과제

### 과제 1: 스토리지 타입 비교 테스트
```bash
# 1. 동일한 크기의 디스크를 각 스토리지에 생성
pvesm alloc local 999 vm-999-disk-0 10G
pvesm alloc local-lvm 999 vm-999-disk-1 10G
pvesm alloc local-zfs 999 vm-999-disk-2 10G

# 2. 각 스토리지의 실제 사용량 비교
pvesm list local --vmid 999
pvesm list local-lvm --vmid 999
pvesm list local-zfs --vmid 999

# 3. 정리
pvesm free local:999/vm-999-disk-0
pvesm free local-lvm:vm-999-disk-1
pvesm free local-zfs:vm-999-disk-2
```

### 과제 2: ZFS 성능 분석
```bash
# 1. ARC 히트율 확인
cat /proc/spl/kstat/zfs/arcstats | grep -E "^(hits|misses|size)"

# 2. 히트율 계산
# hit_ratio = hits / (hits + misses) * 100

# 3. I/O 패턴에 따른 히트율 변화 관찰
# - 동일 파일 반복 읽기 → 높은 히트율
# - 랜덤 읽기 → 낮은 히트율
```

### 과제 3: 스토리지 마이그레이션
```bash
# 1. VM 디스크를 다른 스토리지로 이동
qm move_disk 100 scsi0 local-zfs --delete

# 2. 이동 결과 확인
qm config 100 | grep scsi0
pvesm list local-zfs --vmid 100
```

---

## 7. 핵심 요약

| 스토리지 타입 | 최적 용도 | 주요 장점 |
|--------------|----------|----------|
| **dir** | ISO, 템플릿, 백업 | 간단, 범용적 |
| **lvm** | 고성능 VM | 블록 레벨, 빠름 |
| **lvmthin** | 일반 VM | 씬프로비저닝, 스냅샷 |
| **zfs** | 올인원 로컬 | 스냅샷, 압축, 데이터 무결성 |
| **rbd (Ceph)** | 클러스터 VM | 분산, 고가용성 |
| **nfs** | 공유 스토리지 | 라이브 마이그레이션 |

**성능 최적화 핵심:**
1. **VirtIO 사용**: IDE/SATA 대신 VirtIO-SCSI 또는 VirtIO-BLK
2. **캐시 모드**: SSD는 `none`, HDD는 `writeback`
3. **이미지 포맷**: 블록 스토리지는 `raw`, 파일 스토리지는 `qcow2`
4. **ZFS**: 충분한 RAM (ARC), NVMe SLOG 추가 고려

---

## 다음 모듈 예고

**Module 4: Compute Virtualization - KVM & LXC**에서는:
- VM이 실제로 어떤 프로세스로 실행되는지
- KVM/QEMU의 내부 동작
- LXC 컨테이너의 네임스페이스와 cgroups
- qm, pct 명령어 심화
