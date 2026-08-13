# Proxmox VE 실습 랩 가이드

> **Version-scoped lab exercises written for Proxmox VE 8.x**  
> 단계별 실습으로 PVE의 대표 관리 흐름과 검증 방법 익히기

---

## 실습 범위와 완료 증거

- **범위:** 실습은 Proxmox VE 8.x 계열의 격리된 lab을 가정합니다. bare metal·nested virtualization, node 수, CPU virtualization, RAM, storage, bridge/VLAN, DNS와 Internet 접근을 기록합니다.
- **수치 전제:** 4GB RAM, 32GB storage와 같은 값은 최소 보장이 아니라 특정 기초 실습의 시작 예시입니다. Ceph, HA, 여러 guest와 nested 환경은 별도 capacity·quorum 계획이 필요합니다.
- **안전 전제:** production cluster·network·disk를 사용하지 않고 각 lab의 snapshot, backup 또는 reset 경로를 만듭니다. device, subnet, VMID와 삭제 대상을 실행 전에 확인합니다.
- **실패·완료:** 명령 성공만으로 완료하지 않습니다. UI/API 상태, guest connectivity, storage data, failover·restore, 권한의 허용/거부와 reset 후 재현성을 lab별 checklist로 확인합니다.

---

## 목차
1. [Lab 1: 기초 설정 - 첫 번째 VM 생성](#lab-1-기초-설정---첫-번째-vm-생성)
2. [Lab 2: 컨테이너 - LXC 워크로드](#lab-2-컨테이너---lxc-워크로드)
3. [Lab 3: 스토리지 - ZFS 구성](#lab-3-스토리지---zfs-구성)
4. [Lab 4: 네트워크 - VLAN 구성](#lab-4-네트워크---vlan-구성)
5. [Lab 5: 클러스터 구성](#lab-5-클러스터-구성)
6. [Lab 6: 고가용성 (HA) 설정](#lab-6-고가용성-ha-설정)
7. [Lab 7: 백업 & 복원](#lab-7-백업--복원)
8. [Lab 8: 방화벽 설정](#lab-8-방화벽-설정)
9. [Lab 9: 사용자 & 권한 관리](#lab-9-사용자--권한-관리)
10. [Lab 10: Cloud-Init 자동화](#lab-10-cloud-init-자동화)

---

## 사전 준비 사항

### 하드웨어/소프트웨어 요구사항
- **최소 하드웨어**: 
  - CPU: 64-bit with VT-x/AMD-V
  - RAM: 기초 단일-node 실습 예시 4GB, 여유 구성 예시 8GB 이상. 실제 요구량은 guest·Ceph·HA topology로 산정
  - Storage: 기초 실습 시작 예시 32GB 이상 SSD. image·backup·ZFS/Ceph와 failure reserve를 별도 산정
- **네트워크**: 인터넷 연결 (ISO/템플릿 다운로드용)
- **가상화 플랫폼 (홈랩)**: VMware Workstation, VirtualBox, 또는 네스티드 가상화 지원 환경

### 네스티드 가상화 활성화
```bash
# VMware에서 PVE 실행 시 .vmx에 추가
vhv.enable = "TRUE"

# KVM에서 네스티드 가상화
echo "options kvm_intel nested=1" > /etc/modprobe.d/kvm.conf
modprobe -r kvm_intel && modprobe kvm_intel
```

---

## Lab 1: 기초 설정 - 첫 번째 VM 생성

### 목표
- ISO 업로드 및 스토리지 이해
- VM 생성 마법사 사용
- VirtIO 드라이버 설치
- QEMU Guest Agent 설정

### Step 1: ISO 이미지 업로드

```bash
# 방법 1: Web GUI 사용
# Datacenter > Storage > local > ISO Images > Upload

# 방법 2: wget으로 직접 다운로드
cd /var/lib/vz/template/iso
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

# 방법 3: scp로 업로드
scp ubuntu-22.04.iso root@<pve-ip>:/var/lib/vz/template/iso/
```

**확인:**
```bash
ls -la /var/lib/vz/template/iso/
pvesm list local --content iso
```

### Step 2: VM 생성 (CLI)

```bash
# VM ID 100으로 생성
qm create 100 \
    --name lab-ubuntu \
    --ostype l26 \
    --memory 2048 \
    --cores 2 \
    --sockets 1 \
    --cpu host \
    --net0 virtio,bridge=vmbr0 \
    --scsihw virtio-scsi-pci \
    --scsi0 local-lvm:32,discard=on,ssd=1 \
    --ide2 local:iso/ubuntu-22.04.3-live-server-amd64.iso,media=cdrom \
    --boot order=ide2;scsi0 \
    --agent enabled=1
```

### Step 3: VM 시작 및 OS 설치

```bash
# VM 시작
qm start 100

# 콘솔 접속 (VNC)
# Web GUI > VM 100 > Console

# 또는 noVNC URL 확인
qm terminal 100
```

**Ubuntu 설치 중 체크포인트:**
1. 파티션: 전체 디스크 사용
2. OpenSSH Server 설치 선택
3. 추가 패키지 없음

### Step 4: Guest Agent 설치 (VM 내부)

```bash
# Ubuntu VM 내부에서
sudo apt update
sudo apt install qemu-guest-agent -y
sudo systemctl enable --now qemu-guest-agent
```

**확인:**
```bash
# PVE 호스트에서
qm agent 100 ping
qm agent 100 get-osinfo
qm agent 100 get-host-name
```

### Step 5: Cloud-Init Drive 추가 (선택)

```bash
# Cloud-Init 디스크 추가
qm set 100 --ide0 local-lvm:cloudinit

# 설정 확인
qm cloudinit dump 100 user
```

### 검증 체크리스트
- [ ] VM이 정상 부팅되는가?
- [ ] 네트워크(DHCP) 작동하는가?
- [ ] Guest Agent 응답하는가?
- [ ] 콘솔/SSH 접속 가능한가?

---

## Lab 2: 컨테이너 - LXC 워크로드

### 목표
- CT 템플릿 다운로드
- Unprivileged Container 생성
- 리소스 제한 설정
- 호스트 디렉토리 Bind Mount

### Step 1: 템플릿 다운로드

```bash
# 사용 가능한 템플릿 목록
pveam update
pveam available | grep -E "(ubuntu|debian|alpine)"

# Ubuntu 22.04 다운로드
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst

# 다운로드 확인
pveam list local
```

### Step 2: Unprivileged Container 생성

```bash
# CT ID 200으로 생성
pct create 200 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
    --hostname lab-ct-ubuntu \
    --rootfs local-lvm:8 \
    --memory 1024 \
    --swap 512 \
    --cores 2 \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --unprivileged 1 \
    --features nesting=1 \
    --password "LabP@ssw0rd"

# 시작
pct start 200
```

### Step 3: 리소스 제한 테스트

```bash
# CPU 제한 설정
pct set 200 --cpulimit 1.5
pct set 200 --cpuunits 512

# 메모리 제한
pct set 200 --memory 512

# 설정 확인
pct config 200
```

### Step 4: Bind Mount 설정

```bash
# 호스트에서 공유 디렉토리 생성
mkdir -p /mnt/shared-data
echo "Hello from host" > /mnt/shared-data/test.txt

# CT에 마운트 포인트 추가
pct set 200 --mp0 /mnt/shared-data,mp=/shared

# CT 재시작 (마운트 적용)
pct reboot 200

# 확인
pct exec 200 -- cat /shared/test.txt
```

### Step 5: Docker-in-LXC (Nesting)

```bash
# CT 내부에서
pct enter 200

# Docker 설치
apt update
apt install -y docker.io
systemctl enable --now docker

# Docker 테스트
docker run hello-world
```

### 검증 체크리스트
- [ ] CT가 unprivileged로 실행되는가?
- [ ] 리소스 제한이 적용되는가?
- [ ] Bind Mount 작동하는가?
- [ ] Docker 컨테이너 실행 가능한가?

---

## Lab 3: 스토리지 - ZFS 구성

### 목표
- ZFS Pool 생성 (Mirror)
- Dataset 속성 설정
- 스냅샷 및 롤백
- PVE 스토리지로 등록

### Step 1: ZFS Pool 생성

```bash
# 사용 가능한 디스크 확인
lsblk
fdisk -l

# Mirror Pool 생성 (2개 디스크)
zpool create -f tank mirror /dev/sdb /dev/sdc

# 또는 단일 디스크 (테스트용)
zpool create -f tank /dev/sdb

# Pool 상태 확인
zpool status tank
zpool list
```

### Step 2: Dataset 생성 및 속성 설정

```bash
# VM 이미지용 Dataset
zfs create tank/vms
zfs set compression=lz4 tank/vms
zfs set atime=off tank/vms
zfs set primarycache=all tank/vms

# ISO 저장용 Dataset
zfs create tank/iso
zfs set compression=off tank/iso

# 백업용 Dataset
zfs create tank/backup
zfs set compression=zstd tank/backup
zfs set quota=100G tank/backup

# 속성 확인
zfs get all tank/vms | head -20
```

### Step 3: PVE 스토리지로 등록

```bash
# VM/CT 이미지 스토리지
pvesm add zfspool tank-vms --pool tank/vms --content images,rootdir

# 백업 스토리지 (Directory 타입)
mkdir -p /tank/backup
pvesm add dir tank-backup --path /tank/backup --content backup,iso

# 상태 확인
pvesm status
```

### Step 4: 스냅샷 실습

```bash
# 수동 스냅샷 생성
zfs snapshot tank/vms@before-change

# 데이터 변경 시뮬레이션
touch /tank/vms/testfile
echo "some data" > /tank/vms/testfile

# 스냅샷 목록
zfs list -t snapshot

# 롤백 (변경 취소)
zfs rollback tank/vms@before-change

# 파일 확인 (없어야 함)
ls /tank/vms/
```

### Step 5: 스냅샷 전송 (복제)

```bash
# 백업용 전체 전송
zfs send tank/vms@before-change | zfs recv tank/backup/vms-backup

# 증분 스냅샷 생성
zfs snapshot tank/vms@after-change

# 증분 전송
zfs send -i tank/vms@before-change tank/vms@after-change | zfs recv tank/backup/vms-backup

# 확인
zfs list -t all | grep backup
```

### 검증 체크리스트
- [ ] ZFS Pool이 정상 동작하는가?
- [ ] 압축이 적용되는가? (`zfs get compression`)
- [ ] PVE에서 스토리지로 인식되는가?
- [ ] 스냅샷/롤백이 작동하는가?

---

## Lab 4: 네트워크 - VLAN 구성

### 목표
- VLAN-aware Bridge 설정
- VM별 VLAN 태그 할당
- 내부 전용 네트워크 생성

### Step 1: VLAN-aware Bridge 생성

```bash
# /etc/network/interfaces 편집
cat >> /etc/network/interfaces << 'EOF'

# VLAN-aware Bridge
auto vmbr1
iface vmbr1 inet manual
    bridge-ports eno2
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 10 20 30
EOF

# 네트워크 재시작
ifreload -a

# 확인
bridge vlan show
```

### Step 2: VM에 VLAN 태그 할당

```bash
# VM 100: VLAN 10 (웹 서버)
qm set 100 --net0 virtio,bridge=vmbr1,tag=10

# VM 101: VLAN 20 (데이터베이스)
qm create 101 --name db-server --memory 2048 --cores 2 \
    --net0 virtio,bridge=vmbr1,tag=20 \
    --scsi0 local-lvm:20

# VM 102: VLAN 30 (관리)
qm create 102 --name mgmt-server --memory 1024 --cores 1 \
    --net0 virtio,bridge=vmbr1,tag=30 \
    --scsi0 local-lvm:10
```

### Step 3: 내부 전용 네트워크 (NAT)

```bash
# 내부 전용 브릿지 생성
cat >> /etc/network/interfaces << 'EOF'

# Internal Network with NAT
auto vmbr100
iface vmbr100 inet static
    address 10.100.0.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
    post-up   echo 1 > /proc/sys/net/ipv4/ip_forward
    post-up   iptables -t nat -A POSTROUTING -s 10.100.0.0/24 -o vmbr0 -j MASQUERADE
    post-down iptables -t nat -D POSTROUTING -s 10.100.0.0/24 -o vmbr0 -j MASQUERADE
EOF

ifreload -a
```

### Step 4: VM을 내부 네트워크에 연결

```bash
# 내부 네트워크 VM
qm create 103 --name internal-vm --memory 1024 --cores 1 \
    --net0 virtio,bridge=vmbr100 \
    --scsi0 local-lvm:10

# VM 내부에서 IP 설정 (수동)
# ip addr add 10.100.0.10/24 dev eth0
# ip route add default via 10.100.0.1
```

### Step 5: VLAN 트래픽 확인

```bash
# 브릿지 VLAN 상태
bridge vlan show dev vmbr1

# 트래픽 캡처 (특정 VLAN)
tcpdump -i vmbr1 -e vlan 10

# VM 간 통신 테스트 (같은 VLAN끼리만)
```

### 검증 체크리스트
- [ ] VLAN-aware 브릿지 활성화 되었는가?
- [ ] 같은 VLAN VM 간 통신 가능한가?
- [ ] 다른 VLAN VM 간 통신 차단되는가?
- [ ] NAT 네트워크에서 인터넷 접근 가능한가?

---

## Lab 5: 클러스터 구성

### 목표
- 2노드 클러스터 생성
- 공유 스토리지 설정 (NFS)
- VM 마이그레이션 테스트

### 준비사항
- 2대의 PVE 노드 (pve1: 192.168.1.10, pve2: 192.168.1.11)
- 공유 스토리지용 NFS 서버

### Step 1: 클러스터 생성 (첫 번째 노드)

```bash
# pve1에서 실행
pvecm create lab-cluster

# 상태 확인
pvecm status
```

### Step 2: 두 번째 노드 Join

```bash
# pve2에서 실행
pvecm add 192.168.1.10

# 비밀번호 입력 후 완료

# 양쪽에서 확인
pvecm status
pvecm nodes
```

### Step 3: NFS 공유 스토리지 설정

```bash
# NFS 서버에서 (예: 192.168.1.100)
apt install nfs-kernel-server
mkdir -p /export/pve-shared
echo "/export/pve-shared 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports
exportfs -ra

# PVE 클러스터에서 (한 노드에서만)
pvesm add nfs shared-nfs --server 192.168.1.100 --export /export/pve-shared \
    --content images,iso,backup,vztmpl

# 양쪽 노드에서 확인
pvesm status
```

### Step 4: 마이그레이션 테스트

```bash
# pve1에서 VM 생성 (공유 스토리지 사용)
qm create 110 --name migrate-test --memory 1024 --cores 1 \
    --scsi0 shared-nfs:32 \
    --net0 virtio,bridge=vmbr0
qm start 110

# pve2로 온라인 마이그레이션
qm migrate 110 pve2 --online

# 상태 확인
qm list  # pve1
qm list  # pve2
```

### Step 5: 클러스터 설정 확인

```bash
# 설정 파일 동기화 확인
cat /etc/pve/.members
cat /etc/pve/corosync.conf

# 클러스터 파일시스템 확인
ls /etc/pve/nodes/

# Quorum 상태
corosync-quorumtool -s
```

### 검증 체크리스트
- [ ] 두 노드 모두 Online 상태인가?
- [ ] Quorum 확보되었는가?
- [ ] Web GUI에서 모든 노드 보이는가?
- [ ] VM 마이그레이션 성공하는가?

---

## Lab 6: 고가용성 (HA) 설정

### 목표
- HA 그룹 생성
- VM을 HA 리소스로 등록
- 페일오버 테스트

### 준비사항
- Lab 5에서 구성한 클러스터
- 최소 3노드 권장 (또는 2노드 + QDevice)

### Step 1: Fencing 설정 확인

```bash
# Watchdog 모듈 확인
lsmod | grep dog

# softdog 활성화 (테스트용)
echo "softdog" >> /etc/modules
modprobe softdog

# Watchdog 장치 확인
ls -la /dev/watchdog*
```

### Step 2: HA 그룹 생성

```bash
# 우선순위가 있는 HA 그룹
cat > /etc/pve/ha/groups.cfg << 'EOF'
group: ha-group-1
    nodes pve1:2,pve2:1
    nofailback 0
    restricted 0
EOF

# 또는 pvesh로 생성
pvesh create /cluster/ha/groups --group ha-group-1 --nodes "pve1:2,pve2:1"
```

### Step 3: VM을 HA 리소스로 등록

```bash
# VM 110을 HA에 추가
ha-manager add vm:110 --group ha-group-1 --state started

# 상태 확인
ha-manager status
```

### Step 4: 페일오버 테스트

```bash
# 현재 VM 위치 확인
ha-manager status
qm list

# 방법 1: 수동 마이그레이션
ha-manager migrate vm:110 pve2

# 방법 2: 노드 장애 시뮬레이션 (주의!)
# pve1에서 실행 (클러스터에서 분리)
systemctl stop pve-ha-lrm

# 다른 노드에서 페일오버 확인
ha-manager status
```

### Step 5: HA 정책 테스트

```bash
# Nofailback 테스트
ha-manager set vm:110 --group ha-group-1

# Max restart 설정
ha-manager set vm:110 --max_restart 3 --max_relocate 1

# HA 로그 확인
journalctl -u pve-ha-crm -f
journalctl -u pve-ha-lrm -f
```

### 검증 체크리스트
- [ ] HA 리소스가 started 상태인가?
- [ ] 수동 마이그레이션 작동하는가?
- [ ] 노드 장애 시 자동 페일오버 되는가?
- [ ] Fencing이 정상 동작하는가?

---

## Lab 7: 백업 & 복원

### 목표
- 백업 스케줄 설정
- 다양한 백업 모드 테스트
- 복원 및 Live-restore

### Step 1: 백업 스토리지 준비

```bash
# 로컬 백업 디렉토리
mkdir -p /mnt/backup
pvesm add dir local-backup --path /mnt/backup --content backup

# 또는 NFS 백업 스토리지
pvesm add nfs nfs-backup --server 192.168.1.100 --export /backup \
    --content backup
```

### Step 2: 수동 백업 (각 모드 테스트)

```bash
# Snapshot 모드 (기본, 무중단)
vzdump 100 --storage local-backup --mode snapshot --compress zstd

# Suspend 모드 (일시 정지, RAM 저장)
vzdump 100 --storage local-backup --mode suspend --compress zstd

# Stop 모드 (가장 일관성 높음)
vzdump 100 --storage local-backup --mode stop --compress zstd

# 백업 파일 확인
ls -la /mnt/backup/dump/
```

### Step 3: 예약 백업 설정

```bash
# /etc/pve/vzdump.cron 또는 GUI에서 설정

# 예: 매일 새벽 2시 전체 백업
cat > /etc/cron.d/vzdump-daily << 'EOF'
0 2 * * * root vzdump --all --storage local-backup --mode snapshot --compress zstd --mailto root --mailnotification always
EOF

# 또는 GUI: Datacenter > Backup > Add
```

### Step 4: 복원 테스트

```bash
# 백업 목록
ls /mnt/backup/dump/

# 새 VMID로 복원
qmrestore /mnt/backup/dump/vzdump-qemu-100-*.vma.zst 150 --storage local-lvm

# 기존 VM에 덮어쓰기 복원
qmrestore /mnt/backup/dump/vzdump-qemu-100-*.vma.zst 100 --force

# CT 복원
pct restore 250 /mnt/backup/dump/vzdump-lxc-200-*.tar.zst
```

### Step 5: 보존 정책 설정

```bash
# 백업 정리 테스트 (dry-run)
vzdump --prune-backups keep-last=3 --dryrun

# 실제 정리
vzdump --prune-backups keep-last=7,keep-daily=30,keep-weekly=4,keep-monthly=6

# 스토리지별 보존 정책
pvesm set local-backup --prune-backups keep-last=5,keep-daily=7
```

### 검증 체크리스트
- [ ] 각 백업 모드가 정상 동작하는가?
- [ ] 백업 파일이 생성되는가?
- [ ] 복원 후 VM이 정상 부팅되는가?
- [ ] 보존 정책이 적용되는가?

---

## Lab 8: 방화벽 설정

### 목표
- 데이터센터/호스트/VM 레벨 방화벽 구성
- Security Group 생성
- 특정 서비스만 허용

### Step 1: 데이터센터 방화벽 활성화

```bash
# 방화벽 활성화 (주의: SSH 규칙 먼저 추가!)
pve-firewall compile

# /etc/pve/firewall/cluster.fw 생성
cat > /etc/pve/firewall/cluster.fw << 'EOF'
[OPTIONS]
enable: 0

[RULES]
IN SSH(ACCEPT) -log nolog
IN ACCEPT -p tcp -dport 8006 -log nolog
IN ACCEPT -p udp -dport 5404:5405 -log nolog
IN DROP -log nolog
EOF

# 방화벽 활성화
sed -i 's/enable: 0/enable: 1/' /etc/pve/firewall/cluster.fw
pve-firewall restart
```

### Step 2: Security Group 생성

```bash
# 웹 서버용 Security Group
cat >> /etc/pve/firewall/cluster.fw << 'EOF'

[group web-servers]
IN HTTP(ACCEPT)
IN HTTPS(ACCEPT)
OUT ACCEPT

[group db-servers]
IN ACCEPT -source +web-servers -p tcp -dport 3306
OUT ACCEPT
EOF
```

### Step 3: IP Set 생성

```bash
# 신뢰할 수 있는 IP 목록
cat >> /etc/pve/firewall/cluster.fw << 'EOF'

[IPSET trusted-networks]
192.168.1.0/24
10.0.0.0/8
EOF

# 규칙에서 사용
# IN ACCEPT -source +trusted-networks
```

### Step 4: VM별 방화벽 설정

```bash
# /etc/pve/firewall/100.fw (VM 100용)
cat > /etc/pve/firewall/100.fw << 'EOF'
[OPTIONS]
enable: 1
dhcp: 1
ndp: 1

[RULES]
GROUP web-servers
IN ICMP(ACCEPT)
EOF

# 또는 pvesh로
pvesh create /nodes/<node>/qemu/100/firewall/rules \
    --action ACCEPT --type in --proto tcp --dport 80 --enable 1
```

### Step 5: 규칙 테스트

```bash
# 방화벽 상태 확인
pve-firewall status

# 생성된 nftables 규칙 확인
nft list ruleset

# 특정 VM 규칙
nft list chain bridge pve-vm-100-IN

# 로그 확인 (방화벽 로깅 활성화 시)
journalctl -k | grep pve-fw
```

### 검증 체크리스트
- [ ] 방화벽 활성화 후 SSH 접근 가능한가?
- [ ] Web GUI 접근 가능한가?
- [ ] VM별 규칙이 적용되는가?
- [ ] Security Group 작동하는가?

---

## Lab 9: 사용자 & 권한 관리

### 목표
- 사용자/그룹 생성
- 역할 기반 접근 제어 (RBAC)
- API 토큰 생성 및 테스트

### Step 1: 사용자 및 그룹 생성

```bash
# 사용자 생성 (PVE realm)
pveum user add developer@pve --password "DevP@ss123" --comment "개발자 계정"
pveum user add operator@pve --password "OpsP@ss123" --comment "운영자 계정"

# 그룹 생성
pveum group add developers --comment "개발팀"
pveum group add operators --comment "운영팀"

# 그룹에 사용자 추가
pveum user modify developer@pve --group developers
pveum user modify operator@pve --group operators

# 확인
pveum user list
pveum group list
```

### Step 2: 커스텀 역할 생성

```bash
# 역할 목록 확인
pveum role list

# 개발자 역할 (VM 관리, 읽기 전용 스토리지)
pveum role add Developer --privs "VM.Allocate,VM.Audit,VM.Clone,VM.Config.CDROM,VM.Config.CPU,VM.Config.Memory,VM.Config.Network,VM.Console,VM.PowerMgmt,VM.Snapshot,VM.Snapshot.Rollback,Datastore.Audit"

# 운영자 역할 (모든 VM 권한, 백업, 마이그레이션)
pveum role add Operator --privs "VM.Allocate,VM.Audit,VM.Clone,VM.Config.CDROM,VM.Config.CPU,VM.Config.Disk,VM.Config.Memory,VM.Config.Network,VM.Config.Options,VM.Console,VM.Migrate,VM.Monitor,VM.PowerMgmt,VM.Snapshot,VM.Snapshot.Rollback,Datastore.Allocate,Datastore.AllocateSpace,Datastore.Audit"
```

### Step 3: ACL 설정 (권한 부여)

```bash
# 개발팀에게 특정 VM Pool 권한 부여
pveum pool add dev-pool --comment "개발 환경"
pveum acl modify /pool/dev-pool --group developers --role Developer

# 운영팀에게 전체 VM 권한
pveum acl modify /vms --group operators --role Operator

# 특정 VM에만 권한 부여
pveum acl modify /vms/100 --user developer@pve --role PVEVMUser

# ACL 확인
pveum acl list
```

### Step 4: API Token 생성

```bash
# API 토큰 생성 (권한 분리)
pveum user token add developer@pve automation --privsep 1

# 출력된 토큰 값 저장! (다시 볼 수 없음)
# Token: developer@pve!automation=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 토큰에 권한 부여
pveum acl modify / --token 'developer@pve!automation' --role Developer

# 토큰 목록
pveum user token list developer@pve
```

### Step 5: API 테스트

```bash
# API 토큰으로 인증 테스트
curl -k -H "Authorization: PVEAPIToken=developer@pve!automation=<token>" \
    https://localhost:8006/api2/json/cluster/resources

# pvesh로 테스트 (다른 사용자로)
pvesh get /cluster/resources --output-format json-pretty
```

### 검증 체크리스트
- [ ] 사용자 로그인 가능한가?
- [ ] 권한에 따라 접근 제한되는가?
- [ ] API 토큰 인증 작동하는가?
- [ ] Pool 기반 권한 분리가 되는가?

---

## Lab 10: Cloud-Init 자동화

### 목표
- Cloud-Init 템플릿 생성
- 자동 프로비저닝
- 대량 VM 배포

### Step 1: Cloud 이미지 다운로드

```bash
# Ubuntu Cloud Image 다운로드
cd /var/lib/vz/template/iso
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# 또는 Debian
wget https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2
```

### Step 2: 템플릿 VM 생성

```bash
# VM 생성
qm create 9000 --name ubuntu-cloud-template --memory 2048 --cores 2 \
    --net0 virtio,bridge=vmbr0

# Cloud 이미지 가져오기
qm importdisk 9000 /var/lib/vz/template/iso/jammy-server-cloudimg-amd64.img local-lvm

# 디스크 연결
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0

# Cloud-Init 드라이브 추가
qm set 9000 --ide2 local-lvm:cloudinit

# 부팅 설정
qm set 9000 --boot order=scsi0 --serial0 socket --vga serial0

# Guest Agent 활성화
qm set 9000 --agent enabled=1,fstrim_cloned_disks=1
```

### Step 3: Cloud-Init 기본 설정

```bash
# 사용자 설정
qm set 9000 --ciuser admin --cipassword "CloudP@ss123"

# SSH 키 설정
qm set 9000 --sshkeys ~/.ssh/authorized_keys

# 네트워크 설정 (DHCP)
qm set 9000 --ipconfig0 ip=dhcp

# 또는 고정 IP
# qm set 9000 --ipconfig0 ip=192.168.1.100/24,gw=192.168.1.1

# DNS 설정
qm set 9000 --nameserver "8.8.8.8 8.8.4.4" --searchdomain "lab.local"
```

### Step 4: 템플릿으로 변환

```bash
# 템플릿화
qm template 9000

# 확인
qm list | grep 9000
```

### Step 5: 템플릿에서 VM 배포

```bash
# 단일 VM 클론
qm clone 9000 101 --name web-server-01 --full
qm set 101 --ipconfig0 ip=192.168.1.101/24,gw=192.168.1.1
qm start 101

# 대량 배포 스크립트
for i in {101..105}; do
    qm clone 9000 $i --name "web-server-$(printf '%02d' $((i-100)))" --full
    qm set $i --ipconfig0 ip=192.168.1.$i/24,gw=192.168.1.1
    qm set $i --memory 1024 --cores 1
    qm start $i
done

# 상태 확인
qm list
```

### Step 6: 고급 Cloud-Init (Custom Script)

```bash
# Cloud-Init 사용자 데이터 (cicustom)
cat > /var/lib/vz/snippets/userconfig.yaml << 'EOF'
#cloud-config
package_update: true
packages:
  - nginx
  - htop
  - vim

runcmd:
  - systemctl enable nginx
  - systemctl start nginx

final_message: "Cloud-init completed!"
EOF

# snippets 스토리지 활성화
pvesm set local --content images,iso,vztmpl,backup,snippets

# VM에 적용
qm set 101 --cicustom "user=local:snippets/userconfig.yaml"
```

### 검증 체크리스트
- [ ] 템플릿에서 클론 가능한가?
- [ ] Cloud-Init 설정이 적용되는가?
- [ ] SSH 키 인증 작동하는가?
- [ ] 대량 배포 스크립트 작동하는가?

---

## 부록: 실습 환경 초기화

### 모든 테스트 리소스 정리

```bash
# VM 삭제
for vmid in 100 101 102 103 104 105 110 150; do
    qm stop $vmid --forceStop 2>/dev/null
    qm destroy $vmid --purge 2>/dev/null
done

# CT 삭제
for vmid in 200 250; do
    pct stop $vmid 2>/dev/null
    pct destroy $vmid --purge 2>/dev/null
done

# 템플릿 삭제
qm destroy 9000 2>/dev/null

# 스토리지 정리
pvesm remove tank-vms 2>/dev/null
pvesm remove tank-backup 2>/dev/null
pvesm remove local-backup 2>/dev/null

# ZFS Pool 삭제 (주의!)
# zpool destroy tank

# 네트워크 정리
# /etc/network/interfaces에서 vmbr1, vmbr100 제거
# ifreload -a
```

---

## 추가 학습 리소스

- [Proxmox VE 공식 Wiki](https://pve.proxmox.com/wiki/Main_Page)
- [Proxmox YouTube 채널](https://www.youtube.com/c/ProxmoxVE)
- [Reddit r/Proxmox](https://www.reddit.com/r/Proxmox/)
- [공식 포럼](https://forum.proxmox.com/)

---

*Last Updated: 2026-01-11*
