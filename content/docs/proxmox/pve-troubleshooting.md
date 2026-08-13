# Proxmox VE 문제 해결 가이드

> **Diagnostic examples written for Proxmox VE 8.x; confirm deployed versions and state**  
> 대표 증상, 수집할 증거와 조건부 복구 경로

---

## 문제 해결 범위와 증거 기준

- **범위:** Proxmox VE·kernel·QEMU/LXC·Corosync·storage·Ceph 버전, node와 quorum, 직전 변경, 영향 resource와 발생 시각을 기록합니다.
- **안전 전제:** current config, task·service log, cluster state와 backup을 수집한 뒤 한 번에 하나의 변경만 적용합니다. 강제 unlock, quorum override, process kill, storage repair는 영향 범위와 복구 console을 확보한 경우에만 사용합니다.
- **사실과 추론:** timestamp가 맞는 log, service/resource status, config DB와 network/storage counter는 사실 근거입니다. 증상에 대응하는 명령 목록은 원인 증명이 아닙니다.
- **실패·완료:** split-brain, data loss, guest outage 확대, authentication lockout와 reboot 후 재발을 실패로 봅니다. root cause와 수정이 증거로 연결되고 cluster·workload·backup/restore가 정상이며 rollback이 남아 있을 때 완료입니다.

---

## 목차
1. [클러스터 문제](#1-클러스터-문제)
2. [Quorum 및 Split-brain](#2-quorum-및-split-brain)
3. [VM/CT 시작 실패](#3-vmct-시작-실패)
4. [스토리지 문제](#4-스토리지-문제)
5. [네트워크 문제](#5-네트워크-문제)
6. [백업/복원 문제](#6-백업복원-문제)
7. [인증/권한 문제](#7-인증권한-문제)
8. [HA 문제](#8-ha-문제)
9. [Ceph 문제](#9-ceph-문제)
10. [성능 문제](#10-성능-문제)
11. [웹 GUI 문제](#11-웹-gui-문제)
12. [업그레이드 문제](#12-업그레이드-문제)

---

## 1. 클러스터 문제

### 1.1 노드가 클러스터에 연결되지 않음

**증상:**
- `pvecm status`에서 노드가 보이지 않음
- Web GUI에서 노드 상태가 "unknown"

**진단:**
```bash
# Corosync 상태 확인
systemctl status corosync
journalctl -u corosync -f

# 클러스터 파일시스템 상태
systemctl status pve-cluster
pmxcfs -d  # 디버그 모드로 실행

# 네트워크 연결 확인
ping <other-node-ip>
```

**해결 방법:**

1. **Corosync 서비스 재시작:**
```bash
systemctl restart corosync
systemctl restart pve-cluster
```

2. **방화벽 확인:**
```bash
# Corosync 포트 열기
iptables -I INPUT -p udp --dport 5405 -j ACCEPT
iptables -I INPUT -p udp --dport 5404 -j ACCEPT
```

3. **Corosync 바인딩 주소 확인:**
```bash
# /etc/pve/corosync.conf 에서 ring0_addr 확인
grep ring0_addr /etc/pve/corosync.conf
# IP 주소가 현재 인터페이스와 일치하는지 확인
ip addr show
```

---

### 1.2 클러스터 Join 실패

**증상:**
- `pvecm add <ip>` 실행 시 오류
- "authentication failed" 또는 "connection refused"

**해결 방법:**

1. **SSH 키 확인:**
```bash
# 기존 노드에서 새 노드로 SSH 접속 테스트
ssh root@<new-node-ip>

# SSH 키 복사 (필요시)
ssh-copy-id root@<new-node-ip>
```

2. **시간 동기화 확인:**
```bash
# 모든 노드에서 시간 확인
date
timedatectl

# NTP 동기화
systemctl enable --now chrony
# 또는
timedatectl set-ntp true
```

3. **인증서 문제:**
```bash
# SSL 인증서 재생성
pvecm updatecerts -f
```

---

### 1.3 노드 제거 후 잔여 데이터

**증상:**
- 제거된 노드가 GUI에 계속 표시
- `/etc/pve/nodes/<old-node>` 디렉토리 존재

**해결 방법:**
```bash
# 1. 클러스터에서 노드 삭제 확인
pvecm delnode <old-node>

# 2. 잔여 디렉토리 수동 삭제 (Quorum 있을 때)
rm -rf /etc/pve/nodes/<old-node>

# 3. SSH 키 정리
rm /etc/pve/priv/known_hosts
rm /root/.ssh/known_hosts
```

---

## 2. Quorum 및 Split-brain

### 2.1 Quorum 손실

**증상:**
- "no quorum" 메시지
- `/etc/pve` 읽기 전용
- VM/CT 조작 불가

**진단:**
```bash
# Quorum 상태
corosync-quorumtool -s
pvecm status
```

**해결 방법:**

1. **긴급 Quorum 복구 (단일 노드 운영):**
```bash
# 주의: 다른 노드가 살아있지 않은지 반드시 확인!
pvecm expected 1
```

2. **정상 복구:**
```bash
# 다른 노드들을 다시 온라인으로
systemctl start corosync pve-cluster
```

3. **Quorum Device 사용 (3노드 이하 클러스터):**
```bash
# QDevice 설정 (별도 서버에서)
apt install corosync-qdevice corosync-qnetd

# 클러스터에서 QDevice 추가
pvecm qdevice setup <qdevice-ip>
```

---

### 2.2 Split-brain 복구

**증상:**
- 양쪽 파티션에서 같은 VM이 실행됨
- 설정 파일 충돌

**복구 절차:**

```bash
# 1. 한쪽 파티션의 모든 노드 종료
systemctl stop pve-cluster corosync

# 2. 살아있는 파티션에서 Quorum 확보
pvecm expected <alive-nodes-count>

# 3. VM 상태 확인 및 정리
qm list
ps aux | grep qemu

# 4. 충돌 VM 강제 종료
qm stop <vmid> --forceStop

# 5. 종료했던 노드 재시작
systemctl start corosync pve-cluster
```

---

## 3. VM/CT 시작 실패

### 3.1 VM 시작 실패 (QEMU)

**증상:**
- "TASK ERROR: start failed: command ... failed"
- VM 상태가 "stopped"로 유지

**진단:**
```bash
# QEMU 명령 확인
qm showcmd <vmid> --pretty

# 로그 확인
journalctl -u pvedaemon -f
cat /var/log/pve/qemu-server/<vmid>.log

# 수동 시작 시도
qm start <vmid> --debug
```

**일반적인 원인과 해결:**

1. **디스크 누락:**
```bash
# 설정 파일 확인
cat /etc/pve/nodes/<node>/qemu-server/<vmid>.conf

# 디스크 경로 확인
pvesm list <storage> | grep <vmid>

# 누락된 디스크 제거 또는 재연결
qm set <vmid> --delete scsi0
```

2. **KVM 비활성화:**
```bash
# CPU 가상화 지원 확인
egrep -c '(vmx|svm)' /proc/cpuinfo
# 0이면 가상화 미지원

# BIOS에서 VT-x/AMD-V 활성화 필요
```

3. **메모리 부족:**
```bash
# 사용 가능 메모리 확인
free -h

# Ballooning 조정
qm set <vmid> --balloon 0
```

4. **Lock 파일 문제:**
```bash
# Lock 상태 확인
cat /etc/pve/nodes/<node>/qemu-server/<vmid>.conf | grep lock

# Lock 제거
qm unlock <vmid>
```

---

### 3.2 CT 시작 실패 (LXC)

**진단:**
```bash
# 상세 로그
pct start <vmid> --debug
journalctl -u pve-container@<vmid>

# 설정 확인
pct config <vmid>
```

**일반적인 원인과 해결:**

1. **Namespace 문제 (Unprivileged CT):**
```bash
# 권한 확인
cat /etc/pve/nodes/<node>/lxc/<vmid>.conf | grep unprivileged

# 파일 소유권 문제
chown -R 100000:100000 /path/to/rootfs
```

2. **네트워크 인터페이스 충돌:**
```bash
# 중복 MAC 확인
ip link

# 네트워크 재설정
pct set <vmid> --net0 name=eth0,bridge=vmbr0,ip=dhcp
```

3. **AppArmor 문제:**
```bash
# AppArmor 로그
dmesg | grep apparmor

# 프로파일 재로드
systemctl reload apparmor
```

---

### 3.3 마이그레이션 실패

**진단:**
```bash
# 태스크 로그 확인
cat /var/log/pve/tasks/<task-id>
```

**일반적인 원인:**

1. **스토리지 비공유:**
```bash
# 로컬 디스크 포함 마이그레이션
qm migrate <vmid> <node> --with-local-disks --targetstorage <storage>
```

2. **CPU 불일치:**
```bash
# CPU 타입을 호환 모드로 변경
qm set <vmid> --cpu host  # 같은 CPU인 경우
qm set <vmid> --cpu kvm64  # 호환 모드
```

3. **네트워크 대역폭:**
```bash
# 마이그레이션 대역폭 제한
qm migrate <vmid> <node> --online --migration_network <cidr> --migration_type secure
```

---

## 4. 스토리지 문제

### 4.1 스토리지 접근 불가

**진단:**
```bash
# 스토리지 상태
pvesm status

# 마운트 확인
mount | grep <storage-path>

# 디스크 상태
lsblk
```

**NFS 문제:**
```bash
# NFS 마운트 확인
showmount -e <nfs-server>

# 수동 마운트 테스트
mount -t nfs <server>:<export> /mnt/test

# NFS 서비스 재시작
systemctl restart nfs-common rpcbind
```

**iSCSI 문제:**
```bash
# iSCSI 세션 확인
iscsiadm -m session

# 타겟 재검색
iscsiadm -m node --rescan

# 타겟 재로그인
iscsiadm -m node --login
```

---

### 4.2 ZFS 문제

**Pool 상태 불량:**
```bash
# 상태 확인
zpool status

# 오류 지우기
zpool clear <pool>

# 스크럽 실행
zpool scrub <pool>
```

**디스크 교체:**
```bash
# 고장난 디스크 확인
zpool status

# 디스크 교체
zpool replace <pool> <old-disk> <new-disk>

# 리실버 진행 확인
zpool status -v <pool>
```

**스페이스 부족:**
```bash
# 사용량 확인
zfs list

# 스냅샷 정리
zfs list -t snapshot
zfs destroy <pool>/<dataset>@<snap>

# 예약 공간 확인
zfs get reservation,refreservation <pool>/<dataset>
```

---

### 4.3 LVM/LVM-thin 문제

**Thin Pool 가득 참:**
```bash
# 사용량 확인
lvs -a

# Thin Pool 확장
lvextend -L +50G <vg>/<thin-pool>

# 메타데이터 확장
lvextend --poolmetadatasize +1G <vg>/<thin-pool>
```

**볼륨 활성화 실패:**
```bash
# 볼륨 활성화
lvchange -ay <vg>/<lv>

# VG 스캔
vgscan
vgchange -ay
```

---

## 5. 네트워크 문제

### 5.1 브릿지 연결 문제

**VM/CT가 네트워크에 접근 불가:**
```bash
# 브릿지 상태
brctl show
bridge link

# 포트 확인
bridge fdb show br vmbr0

# iptables 규칙 확인 (브릿지 트래픽 차단 여부)
iptables -L FORWARD -v -n
```

**해결:**
```bash
# 브릿지 netfilter 비활성화 (필요시)
echo 0 > /sys/devices/virtual/net/vmbr0/bridge/nf_call_iptables

# 영구 설정
echo "net.bridge.bridge-nf-call-iptables = 0" >> /etc/sysctl.conf
sysctl -p
```

---

### 5.2 VLAN 문제

**VLAN 트래픽 통과 안됨:**
```bash
# VLAN-aware 브릿지 확인
cat /etc/network/interfaces | grep vlan-aware

# VLAN 설정 확인
bridge vlan show

# 스위치 포트가 트렁크 모드인지 확인 (물리 스위치)
```

**해결:**
```bash
# VLAN-aware 브릿지로 재설정
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge-ports eno1
    bridge-stp off
    bridge-fd 0
    bridge-vlan-aware yes
    bridge-vids 2-4094
```

---

### 5.3 Bonding 문제

**Bond 슬레이브 다운:**
```bash
# Bond 상태
cat /proc/net/bonding/bond0

# 슬레이브 재추가
ip link set <slave> down
echo +<slave> > /sys/class/net/bond0/bonding/slaves
ip link set <slave> up
```

**LACP 문제:**
```bash
# LACP 상태 확인 (스위치 연동 필요)
cat /proc/net/bonding/bond0 | grep "Partner"

# 스위치에서 LACP 설정 확인 필요
```

---

## 6. 백업/복원 문제

### 6.1 백업 실패

**일반적인 오류:**
```bash
# 로그 확인
cat /var/log/pve/tasks/<task-id>

# 수동 백업 테스트
vzdump <vmid> --mode snapshot --compress zstd 2>&1 | tee /tmp/backup.log
```

**스냅샷 모드 실패:**
```bash
# QEMU Guest Agent 확인
qm agent <vmid> ping

# Agent 없이 백업 (디스크 불일치 가능)
vzdump <vmid> --mode snapshot

# suspend 모드 사용 (더 안전)
vzdump <vmid> --mode suspend
```

**스토리지 공간 부족:**
```bash
# 백업 스토리지 확인
pvesm status
df -h /var/lib/vz/dump

# 오래된 백업 정리
ls -la /var/lib/vz/dump/
vzdump --prune-backups keep-last=3
```

---

### 6.2 복원 실패

**일반적인 오류:**
```bash
# 백업 파일 검증
vma verify <backup-file.vma>

# 스토리지 지정 복원
qmrestore <backup> <vmid> --storage <target-storage>
```

**VMID 충돌:**
```bash
# 다른 VMID로 복원
qmrestore <backup> <new-vmid>
```

**디스크 포맷 불일치:**
```bash
# 스토리지가 해당 포맷 지원하는지 확인
pvesm status
# images 콘텐츠 타입 필요
```

---

## 7. 인증/권한 문제

### 7.1 로그인 불가

**root 비밀번호 분실:**
```bash
# 1. 단일 사용자 모드로 부팅
# GRUB에서 linux 라인에 init=/bin/bash 추가

# 2. 파일시스템 재마운트
mount -o remount,rw /

# 3. 비밀번호 변경
passwd root

# 4. 재부팅
exec /sbin/init
```

**PVE 사용자 비밀번호 재설정:**
```bash
pveum passwd <user>@pve
```

---

### 7.2 권한 오류

**"Permission denied" 오류:**
```bash
# 사용자 권한 확인
pveum acl list
pveum user list <user>@<realm>

# 권한 부여
pveum acl modify /vms/<vmid> --user <user>@<realm> --role PVEVMAdmin
```

**API Token 문제:**
```bash
# 토큰 권한 확인
pveum user token list <user>@<realm>

# 토큰에 권한 상속
pveum user token add <user>@<realm> <token> --privsep 0
```

---

### 7.3 LDAP/AD 인증 실패

**연결 테스트:**
```bash
# LDAP 연결 테스트
ldapsearch -x -H ldap://<server> -D "<bind-dn>" -W -b "<base-dn>" "(uid=testuser)"

# SSL 인증서 문제
openssl s_client -connect <server>:636
```

**해결:**
```bash
# Realm 설정 수정
pveum realm modify <realm> --server1 <new-server>

# TLS 검증 비활성화 (테스트용)
pveum realm modify <realm> --verify 0
```

---

## 8. HA 문제

### 8.1 HA 리소스 시작 안됨

**진단:**
```bash
# HA 상태
ha-manager status

# CRM 로그
journalctl -u pve-ha-crm

# LRM 로그  
journalctl -u pve-ha-lrm
```

**Fencing 문제:**
```bash
# Watchdog 확인
cat /dev/watchdog

# Fencing 설정 확인
cat /etc/pve/ha/manager_status

# Watchdog 재설정
modprobe softdog
```

---

### 8.2 HA 마이그레이션 실패

**리소스가 특정 노드에 고착:**
```bash
# 수동 마이그레이션
ha-manager migrate vm:<vmid> <target-node>

# HA 상태 재설정
ha-manager set vm:<vmid> --state started

# HA에서 일시 제거 후 수동 처리
ha-manager set vm:<vmid> --state disabled
qm migrate <vmid> <target-node>
ha-manager set vm:<vmid> --state started
```

---

## 9. Ceph 문제

### 9.1 Ceph Health Warning

**HEALTH_WARN 확인:**
```bash
ceph health detail
ceph status
```

**일반적인 경고와 해결:**

1. **OSD near full:**
```bash
# 사용량 확인
ceph osd df

# 데이터 리밸런싱
ceph osd reweight <osd-id> 0.9

# 불필요한 데이터 삭제
rados -p <pool> ls | wc -l
```

2. **PG undersized/degraded:**
```bash
# PG 상태
ceph pg stat
ceph pg dump_stuck

# OSD 상태 확인
ceph osd tree

# 복구 대기
ceph -w
```

3. **Clock skew:**
```bash
# 시간 동기화
systemctl restart chrony
chronyc sources
```

---

### 9.2 OSD 장애

**OSD Down:**
```bash
# OSD 상태
ceph osd tree

# OSD 재시작
systemctl restart ceph-osd@<osd-id>

# OSD 제거 (영구 장애 시)
ceph osd out <osd-id>
ceph osd crush remove osd.<osd-id>
ceph auth del osd.<osd-id>
ceph osd rm <osd-id>
```

**디스크 교체:**
```bash
# 1. OSD 제거
pveceph osd destroy <osd-id> --cleanup

# 2. 새 OSD 생성
pveceph osd create /dev/<new-disk>
```

---

### 9.3 Ceph 성능 문제

**느린 요청:**
```bash
# 느린 요청 확인
ceph daemon osd.<id> dump_historic_slow_ops

# OSD 상태
ceph osd perf

# Recovery 영향 제한
ceph osd set-backfillfull-ratio 0.95
ceph config set osd osd_recovery_max_active 1
```

---

## 10. 성능 문제

### 10.1 높은 CPU 사용률

**진단:**
```bash
top
htop
pidstat 1

# VM별 CPU 사용
ps aux | grep qemu
```

**해결:**
```bash
# CPU Pinning
qm set <vmid> --cpulimit 2

# NUMA 최적화
qm set <vmid> --numa 1
```

---

### 10.2 높은 I/O 대기

**진단:**
```bash
iostat -xz 1
iotop

# VM별 I/O
virsh blkdeviotune <domain> <device>
```

**해결:**
```bash
# 캐시 모드 변경
qm set <vmid> --scsi0 <storage>:<disk>,cache=writeback

# I/O 스케줄러 변경
echo mq-deadline > /sys/block/sda/queue/scheduler

# VirtIO 사용 확인
qm config <vmid> | grep virtio
```

---

### 10.3 메모리 부족

**진단:**
```bash
free -h
vmstat 1

# OOM 확인
dmesg | grep -i "out of memory"
journalctl -k | grep -i oom
```

**해결:**
```bash
# KSM 활성화
echo 1 > /sys/kernel/mm/ksm/run

# Ballooning 조정
qm set <vmid> --balloon 2048

# Swap 추가
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 11. 웹 GUI 문제

### 11.1 GUI 접근 불가

**503 Service Unavailable:**
```bash
# pveproxy 상태
systemctl status pveproxy
journalctl -u pveproxy

# 재시작
systemctl restart pveproxy pvedaemon
```

**인증서 오류:**
```bash
# 인증서 재생성
pvecm updatecerts -f

# 수동 재생성
cd /etc/pve/nodes/<node>
rm pve-ssl.pem pve-ssl.key
pvecm updatecerts
```

---

### 11.2 느린 GUI

**원인 진단:**
```bash
# RRD 데이터베이스 문제
systemctl status rrdcached
du -sh /var/lib/rrdcached/

# pvestatd 상태
systemctl status pvestatd
```

**해결:**
```bash
# RRD 캐시 재시작
systemctl restart rrdcached

# RRD 데이터 재구성
rm /var/lib/rrdcached/db/pve2-*
systemctl restart rrdcached pvestatd
```

---

## 12. 업그레이드 문제

### 12.1 패키지 업그레이드 실패

**apt 문제:**
```bash
# 패키지 소스 확인
cat /etc/apt/sources.list
cat /etc/apt/sources.list.d/pve-enterprise.list

# 무료 버전 사용 시
rm /etc/apt/sources.list.d/pve-enterprise.list
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" > /etc/apt/sources.list.d/pve-no-subscription.list
apt update
```

**dpkg 오류:**
```bash
# 깨진 패키지 수정
dpkg --configure -a
apt --fix-broken install

# 강제 재설치
apt install --reinstall <package>
```

---

### 12.2 메이저 업그레이드 문제

**Debian 업그레이드 후 문제:**
```bash
# 패키지 재구성
apt dist-upgrade
pve7to8 --full  # 7에서 8로 업그레이드 시

# 커널 확인
uname -r
apt install pve-kernel-6.2
```

---

## 긴급 복구 체크리스트

### 클러스터 긴급 복구
```bash
# 1. 클러스터 상태 확인
pvecm status

# 2. Quorum 강제 설정 (주의!)
pvecm expected 1

# 3. 서비스 재시작
systemctl restart pve-cluster corosync

# 4. pmxcfs 수동 모드 (최후 수단)
systemctl stop pve-cluster
pmxcfs -l  # 로컬 모드
```

### VM 긴급 복구
```bash
# 1. Lock 해제
qm unlock <vmid>

# 2. 강제 종료
qm stop <vmid> --forceStop

# 3. 수동 프로세스 종료
ps aux | grep <vmid>
kill -9 <pid>

# 4. 설정 파일 복구
cd /etc/pve/nodes/<node>/qemu-server/
ls -la <vmid>.conf*
```

---

## 로그 위치 참조

| 로그 | 위치 |
|------|------|
| 시스템 | `/var/log/syslog`, `journalctl` |
| Proxmox 태스크 | `/var/log/pve/tasks/` |
| QEMU | `/var/log/pve/qemu-server/<vmid>.log` |
| Corosync | `journalctl -u corosync` |
| Ceph | `journalctl -u ceph-*`, `/var/log/ceph/` |
| 방화벽 | `journalctl -u pve-firewall` |

---

## 지원 리소스

- [Proxmox 포럼](https://forum.proxmox.com/) - 커뮤니티 지원
- [Proxmox Wiki](https://pve.proxmox.com/wiki/) - 공식 문서
- [Proxmox Bug Tracker](https://bugzilla.proxmox.com/) - 버그 리포트
- 상업 지원: [Proxmox Subscription](https://www.proxmox.com/en/proxmox-ve/pricing)

---

*Last Updated: 2026-01-11*
