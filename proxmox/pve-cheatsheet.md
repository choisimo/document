# Proxmox VE 명령어 치트시트

> **Quick Reference for Proxmox VE 8.x**  
> 운영 환경에서 자주 사용하는 명령어 모음

---

## 목차
1. [클러스터 관리 (pvecm)](#1-클러스터-관리-pvecm)
2. [VM 관리 (qm)](#2-vm-관리-qm)
3. [컨테이너 관리 (pct)](#3-컨테이너-관리-pct)
4. [스토리지 관리 (pvesm)](#4-스토리지-관리-pvesm)
5. [ZFS 관리](#5-zfs-관리)
6. [Ceph 관리 (pveceph)](#6-ceph-관리-pveceph)
7. [백업/복원 (vzdump)](#7-백업복원-vzdump)
8. [네트워크 & SDN](#8-네트워크--sdn)
9. [방화벽 (pve-firewall)](#9-방화벽-pve-firewall)
10. [사용자 관리 (pveum)](#10-사용자-관리-pveum)
11. [HA 관리 (ha-manager)](#11-ha-관리-ha-manager)
12. [API & 진단](#12-api--진단)

---

## 1. 클러스터 관리 (pvecm)

### 클러스터 상태 확인
```bash
# 클러스터 전체 상태
pvecm status

# 노드 목록
pvecm nodes

# Quorum 상태 (상세)
corosync-quorumtool -s

# 클러스터 설정 확인
cat /etc/pve/corosync.conf
```

### 클러스터 생성/관리
```bash
# 새 클러스터 생성
pvecm create <cluster-name>

# 노드 추가 (추가할 노드에서 실행)
pvecm add <existing-node-ip>

# 예상 투표 수 설정 (긴급 시 사용)
pvecm expected 1

# Corosync 투표 목록
pvecm qdevice status
```

### 노드 제거 (주의!)
```bash
# 1. 타겟 노드의 모든 VM/CT 마이그레이션
# 2. 클러스터에서 노드 삭제 (남은 노드에서 실행)
pvecm delnode <node-name>

# 3. 제거된 노드에서 (선택)
systemctl stop pve-cluster corosync
pmxcfs -l  # 로컬 모드로 시작
rm -rf /etc/pve/corosync.conf
rm -rf /etc/corosync/*
systemctl start pve-cluster
```

---

## 2. VM 관리 (qm)

### 기본 조작
```bash
# VM 목록
qm list

# VM 상태 확인
qm status <vmid>

# VM 시작/중지/재시작
qm start <vmid>
qm stop <vmid>
qm shutdown <vmid>     # ACPI 셧다운 (graceful)
qm reboot <vmid>
qm reset <vmid>        # 강제 리셋

# VM 일시정지/재개
qm suspend <vmid>
qm resume <vmid>
```

### VM 생성/삭제
```bash
# 새 VM 생성 (기본)
qm create <vmid> --name <name> --memory 2048 --cores 2

# 디스크와 함께 생성
qm create <vmid> --name <name> --memory 4096 --cores 4 \
    --scsi0 local-lvm:32 --scsihw virtio-scsi-pci \
    --net0 virtio,bridge=vmbr0 \
    --ostype l26 --boot order=scsi0

# ISO에서 설치
qm set <vmid> --cdrom local:iso/ubuntu-22.04.iso --boot order=cdrom

# VM 삭제
qm destroy <vmid>
qm destroy <vmid> --purge  # 연결된 디스크도 삭제
```

### 설정 변경
```bash
# 설정 보기
qm config <vmid>

# CPU/메모리 변경
qm set <vmid> --memory 8192 --cores 4

# 디스크 추가
qm set <vmid> --scsi1 local-lvm:50

# 네트워크 추가
qm set <vmid> --net1 virtio,bridge=vmbr1

# 디스크 크기 조정
qm disk resize <vmid> scsi0 +10G

# Cloud-init 설정
qm set <vmid> --ciuser myuser --cipassword mypass \
    --ipconfig0 ip=192.168.1.100/24,gw=192.168.1.1

# 설정 수동 편집
nano /etc/pve/nodes/<node>/qemu-server/<vmid>.conf
```

### 스냅샷
```bash
# 스냅샷 목록
qm listsnapshot <vmid>

# 스냅샷 생성
qm snapshot <vmid> <snapname>
qm snapshot <vmid> <snapname> --vmstate 1  # RAM 포함

# 스냅샷 복원
qm rollback <vmid> <snapname>

# 스냅샷 삭제
qm delsnapshot <vmid> <snapname>
```

### 마이그레이션 & 클론
```bash
# 온라인 마이그레이션
qm migrate <vmid> <target-node> --online

# 오프라인 마이그레이션
qm migrate <vmid> <target-node>

# 로컬 스토리지 마이그레이션
qm migrate <vmid> <target-node> --with-local-disks --targetstorage <storage>

# VM 클론
qm clone <vmid> <newvmid> --name <name>
qm clone <vmid> <newvmid> --full --storage local-lvm  # 전체 복제

# 템플릿 생성
qm template <vmid>
```

### QEMU Guest Agent
```bash
# 게스트 에이전트 활성화
qm set <vmid> --agent enabled=1

# 게스트 정보 조회
qm guest cmd <vmid> get-osinfo
qm guest cmd <vmid> get-host-name
qm guest cmd <vmid> get-fsinfo

# 게스트 명령 실행
qm guest exec <vmid> -- ls -la /tmp

# 파일 동기화 (스냅샷 전 권장)
qm guest cmd <vmid> fsfreeze-freeze
qm guest cmd <vmid> fsfreeze-thaw
```

---

## 3. 컨테이너 관리 (pct)

### 기본 조작
```bash
# CT 목록
pct list

# CT 상태
pct status <vmid>

# CT 시작/중지
pct start <vmid>
pct stop <vmid>
pct shutdown <vmid>
pct reboot <vmid>

# CT 콘솔 접속
pct enter <vmid>
pct console <vmid>

# CT 내부에서 명령 실행
pct exec <vmid> -- <command>
pct exec <vmid> -- apt update
```

### CT 생성/삭제
```bash
# 템플릿 다운로드
pveam update
pveam available | grep ubuntu
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst

# CT 생성
pct create <vmid> local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
    --hostname myct --memory 2048 --cores 2 \
    --rootfs local-lvm:8 --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --password <password> --unprivileged 1

# CT 삭제
pct destroy <vmid>
pct destroy <vmid> --purge
```

### 설정 변경
```bash
# 설정 보기
pct config <vmid>

# 리소스 변경
pct set <vmid> --memory 4096 --cores 4

# 디스크 크기 조정
pct resize <vmid> rootfs +10G

# 마운트 포인트 추가
pct set <vmid> --mp0 local-lvm:20,mp=/mnt/data

# 바인드 마운트 (호스트 디렉토리)
pct set <vmid> --mp1 /host/path,mp=/container/path

# 네트워크 설정
pct set <vmid> --net0 name=eth0,bridge=vmbr0,ip=192.168.1.100/24,gw=192.168.1.1

# 특성 설정 (nesting 등)
pct set <vmid> --features nesting=1
```

### 스냅샷 & 클론
```bash
# 스냅샷 목록
pct listsnapshot <vmid>

# 스냅샷 생성/복원/삭제
pct snapshot <vmid> <snapname>
pct rollback <vmid> <snapname>
pct delsnapshot <vmid> <snapname>

# CT 클론
pct clone <vmid> <newvmid> --hostname <name>
pct clone <vmid> <newvmid> --full --storage local-lvm

# 템플릿 생성
pct template <vmid>
```

---

## 4. 스토리지 관리 (pvesm)

### 스토리지 상태
```bash
# 전체 스토리지 상태
pvesm status

# 특정 스토리지 상세
pvesm status -storage <storage>

# 스토리지 설정 확인
cat /etc/pve/storage.cfg

# 볼륨 목록
pvesm list <storage>
pvesm list local-lvm
```

### 스토리지 관리
```bash
# 디렉토리 스토리지 추가
pvesm add dir <storage-id> --path /mnt/data --content images,iso,vztmpl

# LVM 스토리지 추가
pvesm add lvm <storage-id> --vgname <vg-name> --content images,rootdir

# LVM-thin 스토리지 추가
pvesm add lvmthin <storage-id> --vgname <vg-name> --thinpool <pool-name> --content images,rootdir

# ZFS 스토리지 추가
pvesm add zfspool <storage-id> --pool <pool/dataset> --content images,rootdir

# NFS 스토리지 추가
pvesm add nfs <storage-id> --server <ip> --export /path --content images,iso,backup

# Ceph RBD 스토리지 추가
pvesm add rbd <storage-id> --monhost <mon-ips> --pool <pool-name> --content images,rootdir

# 스토리지 삭제
pvesm remove <storage-id>
```

### 볼륨 관리
```bash
# 볼륨 할당
pvesm alloc <storage> <vmid> <filename> <size>
pvesm alloc local-lvm 100 vm-100-disk-1 32G

# 볼륨 해제
pvesm free <volume-id>
pvesm free local-lvm:vm-100-disk-1

# ISO/템플릿 다운로드
cd /var/lib/vz/template/iso
wget <url>

# vztmpl 다운로드
pveam download local <template-name>
```

---

## 5. ZFS 관리

### Pool 관리
```bash
# Pool 상태
zpool status
zpool status -v <pool>

# Pool 목록
zpool list

# Pool I/O 통계
zpool iostat -v <pool> 5

# Pool 생성
zpool create <pool> mirror /dev/sda /dev/sdb
zpool create <pool> raidz1 /dev/sda /dev/sdb /dev/sdc

# Pool 확장
zpool add <pool> mirror /dev/sdc /dev/sdd

# Pool 삭제
zpool destroy <pool>
```

### Dataset 관리
```bash
# Dataset 목록
zfs list
zfs list -t all  # 스냅샷 포함

# Dataset 생성
zfs create <pool>/<dataset>
zfs create -o compression=lz4 <pool>/vms

# 속성 확인/설정
zfs get all <pool>/<dataset>
zfs set compression=lz4 <pool>/<dataset>
zfs set quota=100G <pool>/<dataset>

# Dataset 삭제
zfs destroy <pool>/<dataset>
```

### 스냅샷 & 전송
```bash
# 스냅샷 생성
zfs snapshot <pool>/<dataset>@<snapname>
zfs snapshot -r <pool>@<snapname>  # 재귀적

# 스냅샷 목록
zfs list -t snapshot

# 스냅샷 롤백
zfs rollback <pool>/<dataset>@<snapname>

# 스냅샷 전송 (복제)
zfs send <pool>/<dataset>@<snap> | zfs recv <dest-pool>/<dataset>

# 증분 전송
zfs send -i <snap1> <pool>/<dataset>@<snap2> | zfs recv <dest>

# 원격 전송
zfs send <pool>/<dataset>@<snap> | ssh <remote> zfs recv <dest-pool>/<dataset>
```

### ARC/캐시 상태
```bash
# ARC 상태
arc_summary
arcstat 5  # 5초 간격

# ZIL 상태 (SLOG)
zpool iostat -v <pool>

# L2ARC 상태
zpool iostat -v <pool>
```

---

## 6. Ceph 관리 (pveceph)

### 클러스터 상태
```bash
# Ceph 상태 (간략)
pveceph status
ceph status
ceph -s

# 상세 상태
ceph health detail

# 클러스터 사용량
ceph df
ceph osd df

# OSD 트리
ceph osd tree
```

### Ceph 설치/초기화
```bash
# Ceph 패키지 설치
pveceph install

# Ceph 초기화 (첫 번째 노드)
pveceph init --network 10.0.0.0/24

# Monitor 생성
pveceph mon create

# Manager 생성
pveceph mgr create

# OSD 생성
pveceph osd create /dev/sdb
pveceph osd create /dev/sdc --db_dev /dev/nvme0n1p1  # 별도 DB 디바이스
```

### Pool 관리
```bash
# Pool 목록
ceph osd pool ls
ceph osd pool ls detail

# Pool 생성
pveceph pool create <pool-name> --size 3 --min_size 2
ceph osd pool create <pool-name> <pg-num>

# Pool PG 수 조정
ceph osd pool set <pool-name> pg_num 128
ceph osd pool set <pool-name> pgp_num 128

# Pool 삭제
ceph osd pool delete <pool-name> <pool-name> --yes-i-really-really-mean-it
```

### OSD 관리
```bash
# OSD 목록
ceph osd ls
ceph osd stat

# OSD 상태
ceph osd status

# OSD 제거 (안전하게)
ceph osd out <osd-id>
ceph osd crush remove osd.<osd-id>
ceph auth del osd.<osd-id>
ceph osd rm <osd-id>

# OSD 재시작
systemctl restart ceph-osd@<osd-id>
```

### CephFS
```bash
# MDS 생성
pveceph mds create

# CephFS 상태
ceph mds stat
ceph fs status

# CephFS 마운트 (커널)
mount -t ceph <mon-ip>:/ /mnt/cephfs -o name=admin,secret=<key>

# CephFS 마운트 (FUSE)
ceph-fuse /mnt/cephfs
```

---

## 7. 백업/복원 (vzdump)

### 백업 실행
```bash
# 단일 VM/CT 백업
vzdump <vmid>
vzdump <vmid> --compress zstd --mode snapshot

# 여러 VM/CT 백업
vzdump <vmid1> <vmid2> <vmid3>

# 전체 백업
vzdump --all

# 스토리지 지정
vzdump <vmid> --storage <backup-storage>

# 백업 모드
vzdump <vmid> --mode snapshot  # 스냅샷 (기본, 무중단)
vzdump <vmid> --mode suspend   # 일시정지 (메모리 저장)
vzdump <vmid> --mode stop      # 중지 (가장 안정적)

# PBS로 백업
vzdump <vmid> --storage pbs-storage

# 압축 옵션
vzdump <vmid> --compress gzip   # .vma.gz
vzdump <vmid> --compress lzo    # .vma.lzo
vzdump <vmid> --compress zstd   # .vma.zst (권장)
```

### 복원
```bash
# VM 복원
qmrestore <backup-file> <new-vmid>
qmrestore /var/lib/vz/dump/vzdump-qemu-100-*.vma.zst 101

# CT 복원
pct restore <new-vmid> <backup-file>
pct restore 201 /var/lib/vz/dump/vzdump-lxc-200-*.tar.zst

# 스토리지 지정 복원
qmrestore <backup-file> <vmid> --storage local-lvm

# PBS에서 복원
qmrestore <pbs-storage>:backup/vm/<vmid>/<backup-id> <new-vmid>

# Live-restore (PBS)
qmrestore <pbs-backup> <vmid> --live-restore 1
```

### 백업 작업 관리
```bash
# 예약된 백업 목록 (GUI 또는)
cat /etc/pve/jobs.cfg

# 백업 목록
ls -la /var/lib/vz/dump/

# 백업 정보
vzdump --info <backup-file>

# 백업 검증
vma verify <backup-file>
```

### PBS 관련
```bash
# PBS 연결 확인
proxmox-backup-client status --repository <user>@<pbs-server>:<datastore>

# PBS 스냅샷 목록
proxmox-backup-client snapshot list --repository <repo>

# PBS 정리 (prune)
proxmox-backup-client prune --repository <repo> \
    --keep-last 7 --keep-daily 14 --keep-weekly 8
```

---

## 8. 네트워크 & SDN

### 네트워크 인터페이스
```bash
# 인터페이스 상태
ip addr
ip link

# 브릿지 상태
brctl show
bridge link

# 인터페이스 설정
cat /etc/network/interfaces

# 네트워크 재시작 (적용)
ifreload -a

# 특정 인터페이스 재시작
ifdown vmbr0 && ifup vmbr0
```

### VLAN 관리
```bash
# VLAN 인터페이스 확인
cat /proc/net/vlan/config

# VLAN 추가 (일시적)
ip link add link eno1 name eno1.100 type vlan id 100
ip link set eno1.100 up
```

### Bonding
```bash
# Bond 상태
cat /proc/net/bonding/bond0

# Bond 슬레이브 상태
cat /sys/class/net/bond0/bonding/slaves
```

### SDN
```bash
# SDN 설정 적용
pvesh set /cluster/sdn

# Zone 목록
pvesh get /cluster/sdn/zones

# VNet 목록
pvesh get /cluster/sdn/vnets

# Subnet 목록
pvesh get /cluster/sdn/vnets/<vnet>/subnets

# IPAM 확인
pvesh get /cluster/sdn/ipams

# SDN 상태 확인
cat /etc/pve/sdn/.running-config
```

---

## 9. 방화벽 (pve-firewall)

### 방화벽 상태
```bash
# 방화벽 서비스 상태
systemctl status pve-firewall

# 방화벽 활성화
pve-firewall start

# 방화벽 중지
pve-firewall stop

# 현재 규칙 확인 (nftables)
nft list ruleset
```

### 설정 파일
```bash
# 데이터센터 방화벽
cat /etc/pve/firewall/cluster.fw

# 호스트 방화벽
cat /etc/pve/nodes/<node>/host.fw

# VM/CT 방화벽
cat /etc/pve/firewall/<vmid>.fw
```

### 규칙 관리
```bash
# API로 규칙 추가 (예)
pvesh create /cluster/firewall/rules \
    --action ACCEPT --type in --proto tcp --dport 443 --enable 1

# Security Group 목록
pvesh get /cluster/firewall/groups

# IP Set 목록
pvesh get /cluster/firewall/ipset

# Macro 목록
pvesh get /cluster/firewall/macros
```

---

## 10. 사용자 관리 (pveum)

### 사용자 관리
```bash
# 사용자 목록
pveum user list

# 사용자 생성
pveum user add <user>@<realm>
pveum user add admin@pve --password <pass>

# 사용자 삭제
pveum user delete <user>@<realm>

# 비밀번호 변경
pveum passwd <user>@<realm>

# 사용자 정보
pveum user list --output-format json-pretty | jq '.[] | select(.userid=="<user>@<realm>")'
```

### 그룹 관리
```bash
# 그룹 목록
pveum group list

# 그룹 생성
pveum group add <groupname>

# 그룹에 사용자 추가
pveum user modify <user>@<realm> --group <groupname>
```

### 역할 & ACL
```bash
# 역할 목록
pveum role list

# 커스텀 역할 생성
pveum role add MyRole --privs "VM.Audit,VM.Console"

# ACL 목록
pveum acl list

# ACL 추가 (권한 부여)
pveum acl modify / --user <user>@<realm> --role <role>
pveum acl modify /vms/<vmid> --user <user>@<realm> --role PVEVMUser
pveum acl modify /pool/<poolname> --group <group> --role PVEAdmin

# ACL 삭제
pveum acl delete / --user <user>@<realm> --role <role>
```

### Realm 관리
```bash
# Realm 목록
pveum realm list

# LDAP Realm 추가
pveum realm add <realm-id> --type ldap --base_dn "dc=example,dc=com" \
    --server1 ldap.example.com --user_attr uid

# AD Realm 추가
pveum realm add <realm-id> --type ad --domain example.com \
    --server1 ad.example.com
```

### API Token
```bash
# 토큰 생성
pveum user token add <user>@<realm> <tokenid>
pveum user token add admin@pve automation --privsep 0

# 토큰 목록
pveum user token list <user>@<realm>

# 토큰 삭제
pveum user token remove <user>@<realm> <tokenid>
```

### 2FA
```bash
# TFA 목록
pveum user tfa list <user>@<realm>

# TFA 삭제 (관리자)
pveum user tfa delete <user>@<realm> <tfa-id>
```

---

## 11. HA 관리 (ha-manager)

### HA 상태
```bash
# HA 상태 (전체)
ha-manager status

# HA 매니저 설정
cat /etc/pve/ha/manager_status
cat /etc/pve/ha/resources.cfg
cat /etc/pve/ha/groups.cfg
```

### 리소스 관리
```bash
# HA 리소스 추가
ha-manager add vm:<vmid>
ha-manager add ct:<vmid>

# HA 리소스에 그룹 지정
ha-manager set vm:<vmid> --group <groupname>

# 상태 변경
ha-manager set vm:<vmid> --state started
ha-manager set vm:<vmid> --state stopped
ha-manager set vm:<vmid> --state disabled

# HA 리소스 제거
ha-manager remove vm:<vmid>
```

### 마이그레이션
```bash
# HA 리소스 마이그레이션
ha-manager migrate vm:<vmid> <target-node>

# 재배치 (HA 그룹 규칙에 따라)
ha-manager relocate vm:<vmid>
```

### HA 그룹
```bash
# 그룹 설정 확인
cat /etc/pve/ha/groups.cfg

# 그룹 생성 (pvesh 사용)
pvesh create /cluster/ha/groups --group <name> --nodes node1,node2
```

---

## 12. API & 진단

### pvesh (API 클라이언트)
```bash
# API 엔드포인트 탐색
pvesh ls /
pvesh ls /nodes
pvesh ls /nodes/<node>

# GET 요청
pvesh get /nodes/<node>/status
pvesh get /cluster/resources

# POST 요청
pvesh create /nodes/<node>/qemu --vmid 100 --name test --memory 2048

# PUT 요청
pvesh set /nodes/<node>/qemu/<vmid>/config --memory 4096

# DELETE 요청
pvesh delete /nodes/<node>/qemu/<vmid>

# JSON 출력
pvesh get /cluster/resources --output-format json-pretty
```

### 로그 & 진단
```bash
# 시스템 로그
journalctl -u pvedaemon
journalctl -u pveproxy
journalctl -u pve-cluster
journalctl -u corosync

# VM 로그
qm showcmd <vmid> --pretty  # QEMU 명령 표시

# 태스크 로그
cat /var/log/pve/tasks/

# Ceph 로그
journalctl -u ceph-mon@<hostname>
journalctl -u ceph-osd@<osd-id>

# 프로세스 확인
ps aux | grep qemu
ps aux | grep lxc

# 리소스 사용량
pveperf  # 성능 벤치마크
top
htop
iotop
```

### 디버깅
```bash
# pvedaemon 디버그 모드
systemctl stop pvedaemon
pvedaemon -d

# API 직접 호출 (curl)
curl -k -b "PVEAuthCookie=<ticket>" \
    https://localhost:8006/api2/json/nodes

# SSL 인증서 확인
openssl x509 -in /etc/pve/pve-root-ca.pem -text -noout
openssl x509 -in /etc/pve/nodes/<node>/pve-ssl.pem -text -noout
```

### 성능 모니터링
```bash
# rrdcached 상태 (그래프 데이터)
systemctl status rrdcached

# 노드 RRD 데이터
ls /var/lib/rrdcached/db/pve2-node/

# VM RRD 데이터
ls /var/lib/rrdcached/db/pve2-vm/
```

---

## 빠른 참조 테이블

### 설정 파일 위치

| 경로 | 용도 |
|------|------|
| `/etc/pve/` | 클러스터 공유 설정 |
| `/etc/pve/storage.cfg` | 스토리지 정의 |
| `/etc/pve/user.cfg` | 사용자/ACL |
| `/etc/pve/datacenter.cfg` | DC 설정 |
| `/etc/pve/corosync.conf` | 클러스터 설정 |
| `/etc/pve/nodes/<node>/qemu-server/` | VM 설정 |
| `/etc/pve/nodes/<node>/lxc/` | CT 설정 |
| `/etc/network/interfaces` | 네트워크 |
| `/etc/ceph/ceph.conf` | Ceph |

### 서비스 재시작

| 서비스 | 명령 |
|--------|------|
| Web GUI | `systemctl restart pveproxy` |
| API | `systemctl restart pvedaemon` |
| 클러스터 FS | `systemctl restart pve-cluster` |
| HA | `systemctl restart pve-ha-crm pve-ha-lrm` |
| 방화벽 | `systemctl restart pve-firewall` |
| 네트워크 | `ifreload -a` |

### 포트 참조

| 포트 | 서비스 |
|------|--------|
| 8006/tcp | Web GUI |
| 3128/tcp | SPICE Proxy |
| 5900-5999/tcp | VNC |
| 5404-5405/udp | Corosync |
| 111/tcp | rpcbind |
| 6789/tcp | Ceph MON |
| 6800-7300/tcp | Ceph OSD |

---

*Last Updated: 2026-01-11*
