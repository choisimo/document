# Proxmox VE 완전 정복 가이드

> **Korean Documentation for Proxmox Virtual Environment**
> 공식 레퍼런스 기반의 체계적인 학습 자료

---

## 개요

이 문서는 Proxmox VE 8.x 공식 관리자 가이드(pve-admin-guide)를 기반으로 작성된 **한국어 학습 자료**입니다.

### 특징

- **Architecture First**: "How" 보다 "Why"를 먼저 설명
- **Visual Learning**: ASCII 다이어그램으로 데이터 흐름 시각화
- **Command Context**: 명령어 → 설정 변경 → 데몬 리로드 → 커널 동작까지 전체 체인 설명
- **실무 중심**: 운영 환경에서 바로 적용 가능한 예제

---

## 학습 로드맵

```
                              Proxmox VE 학습 경로
                            
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │   [입문]                    [중급]                    [고급]     │
    │                                                                 │
    │   Module 1 ──────► Module 4 ──────► Module 5               │
    │   코어 아키텍처      컴퓨팅/가상화      고가용성 클러스터          │
    │        │                │                   │                   │
    │        ▼                ▼                   ▼                   │
    │   Module 2 ──────► Module 3 ──────► Module 9               │
    │   네트워크/SDN       스토리지           Ceph 분산스토리지          │
    │        │                │                   │                   │
    │        ▼                ▼                   ▼                   │
    │   Module 8 ──────► Module 6 ──────► Module 7               │
    │   사용자 관리        백업/복원           방화벽                   │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
```

---

## 모듈 목차

### Module 1: 코어 아키텍처 & 시스템 내부 구조

**파일:** [`module1-core-architecture.md`](./module1-core-architecture.md)

| 섹션                  | 내용                                             |
| --------------------- | ------------------------------------------------ |
| 1. Under the Hood     | PVE 아키텍처 개요, 설계 철학                     |
| 2. pmxcfs 심층 분석   | FUSE 기반 클러스터 파일시스템, SQLite + Corosync |
| 3. 데몬 프로세스 트리 | pvedaemon, pveproxy, pvestatd 등 주요 데몬       |
| 4. 부팅 시퀀스        | BIOS/UEFI → systemd → PVE Services             |
| 5. API 구조           | REST API 계층, pvesh 활용법                      |

**핵심 개념:** pmxcfs, Corosync, Quorum, /etc/pve, pve-cluster

---

### Module 2: 네트워크 & SDN

**파일:** [`module2-network-sdn.md`](./module2-network-sdn.md)

| 섹션                              | 내용                                                      |
| --------------------------------- | --------------------------------------------------------- |
| 1. 네트워크 아키텍처 개요         | Linux 네트워크 스택, 인터페이스 계층                      |
| 2. Linux Bridge (vmbr)            | 가상 스위치, MAC 학습, STP                                |
| 3. VLAN 구성                      | VLAN-aware Bridge, Tagged/Untagged 트래픽                 |
| 4. Bonding                        | 802.3ad LACP, Active-Backup, 밸런싱 모드                  |
| 5. SDN (Software-Defined Network) | Zone 유형 (Simple/VLAN/QinQ/VXLAN/EVPN), VNet, Controller |
| 6. 고급 네트워크                  | OVS, NAT, Routing, IPv6                                   |

**핵심 개념:** vmbr, VLAN-aware, Bond, SDN Zone, VNet, EVPN

---

### Module 3: 스토리지 서브시스템

**파일:** [`module3-storage-subsystem.md`](./module3-storage-subsystem.md)

| 섹션                      | 내용                                           |
| ------------------------- | ---------------------------------------------- |
| 1. 스토리지 아키텍처 개요 | I/O 병목 지점, File vs Block 스토리지          |
| 2. 로컬 스토리지          | Directory, LVM, LVM-thin                       |
| 3. ZFS 심층 분석          | vdev, zpool, ARC/L2ARC, ZIL/SLOG, 스냅샷, 복제 |
| 4. 공유 스토리지          | NFS, CIFS/SMB, iSCSI                           |
| 5. Ceph RBD               | RBD 기초, Pool 설정, 스냅샷                    |
| 6. pvesm 명령어           | 스토리지 관리, 콘텐츠 타입, 상태 확인          |

**핵심 개념:** pvesm, ZFS ARC/ZIL, LVM-thin, RBD, qcow2 vs raw

---

### Module 4: 컴퓨팅 & 가상화

**파일:** [`module4-compute-virtualization.md`](./module4-compute-virtualization.md)

| 섹션                   | 내용                                 |
| ---------------------- | ------------------------------------ |
| 1. KVM/QEMU 아키텍처   | 하드웨어 가상화, CPU 플래그, VirtIO  |
| 2. VM 생명주기         | 생성, 시작, 마이그레이션, 종료       |
| 3. qm 명령어 심층 분석 | 설정 파일 구조, 핫플러그, 에이전트   |
| 4. LXC 컨테이너        | Namespace, Cgroup, Unprivileged CT   |
| 5. pct 명령어          | 컨테이너 생성, 템플릿, Bind Mount    |
| 6. 리소스 관리         | CPU Pinning, NUMA, Memory Ballooning |

**핵심 개념:** qm, pct, VirtIO, QEMU Guest Agent, Namespace, Cgroup

---

### Module 5: 고가용성 (HA) 클러스터

**파일:** [`module5-high-availability.md`](./module5-high-availability.md)

| 섹션                 | 내용                              |
| -------------------- | --------------------------------- |
| 1. 클러스터 아키텍처 | Corosync Ring, Quorum 알고리즘    |
| 2. HA 스택           | ha-manager, CRM, LRM 역할         |
| 3. Fencing           | 왜 필요한가?, watchdog, STONITH   |
| 4. HA 그룹 & 정책    | nofailback, restricted, 우선순위  |
| 5. 마이그레이션      | Live Migration, Offline Migration |
| 6. 재해 복구         | Split-brain 대응, Quorum 복구     |

**핵심 개념:** Corosync, Quorum, ha-manager, Fencing, watchdog

---

### Module 6: 백업 & 복원

**파일:** [`module6-backup-restore.md`](./module6-backup-restore.md)

| 섹션                          | 내용                                 |
| ----------------------------- | ------------------------------------ |
| 1. 백업 아키텍처              | vzdump 개요, 백업 모드 비교          |
| 2. 백업 모드 심층             | snapshot, suspend, stop 모드         |
| 3. Proxmox Backup Server 통합 | PBS 아키텍처, Datastore, 중복제거    |
| 4. vzdump 명령어              | 스케줄링, 압축, 암호화               |
| 5. 복원 절차                  | qmrestore, pct restore, Live-restore |
| 6. 보존 정책                  | keep-last, keep-daily, GFS 방식      |

**핵심 개념:** vzdump, PBS, snapshot 백업, prune, VMA/PBS 포맷

---

### Module 7: 방화벽

**파일:** [`module7-firewall.md`](./module7-firewall.md)

| 섹션                 | 내용                              |
| -------------------- | --------------------------------- |
| 1. 방화벽 아키텍처   | 3계층 구조 (Datacenter/Host/VM)   |
| 2. 규칙 구문         | IN/OUT, ACCEPT/DROP/REJECT, Macro |
| 3. Security Group    | 재사용 가능한 규칙 집합           |
| 4. IP Set            | IP 주소 그룹 관리                 |
| 5. Macro             | 사전 정의된 서비스 규칙           |
| 6. pve-firewall 내부 | nftables 규칙 생성, 체인 구조     |

**핵심 개념:** pve-firewall, Security Group, IP Set, Macro, nftables

---

### Module 8: 사용자 & 권한 관리

**파일:** [`module8-user-management.md`](./module8-user-management.md)

| 섹션             | 내용                                 |
| ---------------- | ------------------------------------ |
| 1. 인증 아키텍처 | Authentication Realm 개념            |
| 2. Realm 유형    | PAM, PVE, LDAP, AD, OpenID Connect   |
| 3. RBAC          | Role-Based Access Control, 권한 상속 |
| 4. 역할 & 권한   | 기본 역할, 커스텀 역할 생성          |
| 5. 2FA (TFA)     | TOTP, WebAuthn/U2F 설정              |
| 6. API Token     | 토큰 생성, 권한 분리                 |
| 7. pveum 명령어  | 사용자, 그룹, 역할 관리              |

**핵심 개념:** pveum, Realm, RBAC, ACL, TFA, API Token

---

### Module 9: Ceph 분산 스토리지

**파일:** [`module9-ceph-cluster.md`](./module9-ceph-cluster.md)

| 섹션                     | 내용                                          |
| ------------------------ | --------------------------------------------- |
| 1. Ceph 아키텍처         | RADOS, MON, MGR, OSD, MDS                     |
| 2. pveceph 설치          | 네트워크 설정, 초기화                         |
| 3. OSD 관리              | 디스크 추가, BlueStore, Device Class          |
| 4. Pool & CRUSH          | Pool 생성, CRUSH Rule, Replica/Erasure Coding |
| 5. CephFS                | 메타데이터 서버, 마운트, 쿼터                 |
| 6. RBD 통합              | Proxmox VE 스토리지로 연결                    |
| 7. 모니터링 & 트러블슈팅 | ceph status, health warning 해결              |

**핵심 개념:** pveceph, MON, OSD, Pool, CRUSH, CephFS, RBD

---

## 빠른 참조

### 핵심 명령어 요약

```bash
# 클러스터 상태
pvecm status              # 클러스터 멤버 상태
pvecm nodes               # 노드 목록
corosync-quorumtool -s    # Quorum 상태

# VM 관리
qm list                   # VM 목록
qm start/stop <vmid>      # VM 시작/중지
qm migrate <vmid> <node>  # VM 마이그레이션

# 컨테이너 관리
pct list                  # CT 목록
pct start/stop <vmid>     # CT 시작/중지
pct enter <vmid>          # CT 콘솔 접속

# 스토리지 관리
pvesm status              # 스토리지 상태
pvesm list <storage>      # 볼륨 목록
zpool status              # ZFS Pool 상태

# 백업
vzdump <vmid>             # 백업 실행
qmrestore <archive> <vmid> # VM 복원
pct restore <vmid> <archive> # CT 복원

# 네트워크
ifreload -a               # 네트워크 설정 적용
pvesh get /cluster/sdn/vnets  # SDN VNet 목록

# 사용자 관리
pveum user list           # 사용자 목록
pveum acl list            # ACL 목록

# Ceph
pveceph status            # Ceph 클러스터 상태
ceph osd tree             # OSD 토폴로지
ceph df                   # 스토리지 사용량

# HA
ha-manager status         # HA 상태
ha-manager migrate <sid> <node>  # HA 리소스 마이그레이션
```

### 주요 설정 파일 위치

| 파일/디렉토리                          | 용도                        |
| -------------------------------------- | --------------------------- |
| `/etc/pve/`                          | 클러스터 공유 설정 (pmxcfs) |
| `/etc/pve/corosync.conf`             | Corosync 클러스터 설정      |
| `/etc/pve/storage.cfg`               | 스토리지 정의               |
| `/etc/pve/user.cfg`                  | 사용자 및 그룹              |
| `/etc/pve/datacenter.cfg`            | 데이터센터 전역 설정        |
| `/etc/pve/nodes/<node>/qemu-server/` | VM 설정 파일                |
| `/etc/pve/nodes/<node>/lxc/`         | CT 설정 파일                |
| `/etc/pve/firewall/`                 | 방화벽 규칙                 |
| `/etc/pve/ha/`                       | HA 설정                     |
| `/etc/pve/sdn/`                      | SDN 설정                    |
| `/etc/network/interfaces`            | 네트워크 인터페이스         |
| `/etc/ceph/ceph.conf`                | Ceph 설정                   |

### 주요 포트

| 포트          | 서비스                |
| ------------- | --------------------- |
| 8006/tcp      | Proxmox VE Web GUI    |
| 3128/tcp      | SPICE Proxy           |
| 5900-5999/tcp | VNC                   |
| 5405-5412/udp | Corosync              |
| 111/tcp       | rpcbind (NFS)         |
| 6789/tcp      | Ceph Monitor          |
| 6800-7300/tcp | Ceph OSD              |
| 8007/tcp      | Proxmox Backup Server |

---

## 추가 자료

1. [`pve-cheatsheet.md`](./pve-cheatsheet.md) - 명령어 치트시트
1. [`pve-troubleshooting.md`](./pve-troubleshooting.md) - 문제 해결 가이드
1. [`pve-labs.md`](./pve-labs.md) - 실습 랩 가이드

---

## 참고 자료

- [Proxmox VE 공식 문서](https://pve.proxmox.com/pve-docs/)
- [Proxmox VE Wiki](https://pve.proxmox.com/wiki/Main_Page)
- [Proxmox 포럼](https://forum.proxmox.com/)

---

## 라이선스

이 문서는 학습 목적으로 작성되었습니다.
Proxmox VE는 Proxmox Server Solutions GmbH의 상표입니다.

---

*Last Updated: 2026-01-11*
