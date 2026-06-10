# Proxmox OS 디스크 마이그레이션

이 문서는 Proxmox VE가 설치된 OS 디스크를 새 SSD로 옮길 때 선택할 수 있는 두 가지 경로를 정리한다. 목표는 “디스크를 복제한다”가 아니라 VM/CT 데이터, host 설정, bootloader, storage mapping을 잃지 않고 검증하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Proxmox OS 디스크를 교체할 때는 host OS만 옮기는 문제가 아니다. `/etc/pve`의 VM/CT 설정, storage 설정, network 설정, cluster 정보, bootloader, local storage에 있는 guest disk가 함께 영향을 받는다.

무작정 `dd`로 복제하거나 `/etc/pve`를 덮어쓰면 부팅 실패, cluster filesystem 문제, storage mismatch, VM 복구 실패로 이어질 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Clonezilla 복제와 재설치 후 복원을 여러 번 반복해 설명한다. 보완해야 할 점은 다음과 같다.

- `/etc/pve`를 단순 directory처럼 삭제하고 덮어쓰는 위험한 흐름이 포함되어 있다.
- VM/CT backup과 host 설정 backup의 차이가 약하다.
- single node와 cluster node의 절차 차이가 충분히 분리되지 않았다.
- LVM, ZFS 확장 절차가 검증 명령과 분리되어 있지 않다.
- 최종 검증 항목이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 중 하나의 경로로 안전하게 마이그레이션하는 것이다.

- 경로 A: 전체 디스크 복제로 기존 OS 디스크를 그대로 새 SSD에 옮긴다.
- 경로 B: Proxmox VE를 새로 설치하고 VM/CT 백업과 필요한 host 설정을 선택적으로 복원한다.

두 경로 모두 다음 상태를 검증해야 한다.

- VM/CT backup이 외부 저장소에 존재한다.
- Host network와 storage 설정을 백업했다.
- 새 SSD로 부팅된다.
- Proxmox web UI와 SSH 접속이 된다.
- Storage와 guest inventory가 정상이다.
- VM/CT가 부팅되고 backup/restore 경로가 확인된다.

## 4. 시스템 번역 (Data Flow)

전체 복제 흐름은 다음과 같다.

```text
old OS disk
  -> offline clone
  -> new SSD boot
  -> partition or pool expansion
  -> Proxmox service verification
```

재설치 복원 흐름은 다음과 같다.

```text
guest backups and host config backup
  -> fresh Proxmox install
  -> same hostname and network plan
  -> storage reattached
  -> VM/CT restored from backup
  -> selected host config reapplied
```

## 5. 핵심 구성요소 (Building Blocks)

VM/CT backup은 `vzdump`, Proxmox Backup Server, 또는 GUI backup job으로 만든다. Proxmox 공식 문서는 VM/CT backup이 guest configuration과 data를 포함하는 full backup이라고 설명한다.

`/etc/pve`는 Proxmox Cluster File System이다. 일반 directory처럼 취급하기보다 현재 node/cluster 상태를 고려해 선택적으로 복원해야 한다.

`/etc/network/interfaces`는 host network 설정이다. 새 설치에서 IP, bridge, bond, VLAN이 달라지면 web UI 접속부터 실패할 수 있다.

`/etc/pve/storage.cfg`는 storage 정의를 담는다. 실제 disk, mount, ZFS pool, LVM volume이 준비되어 있어야 의미가 있다.

Clonezilla는 offline disk-to-disk clone에 적합하다. 운영 중인 Proxmox OS disk를 live로 복제하지 않는다.

LVM과 ZFS는 복제 후 남은 공간 확장 방식이 다르다. 설치 당시 storage layout을 먼저 확인한다.

## 6. 상태 전이 (State Transition)

사전 준비 상태는 다음과 같다.

```text
inventory captured
  -> VM/CT backups completed
  -> host config backups exported
  -> boot media prepared
  -> rollback path decided
```

복제 방식은 다음 상태로 진행한다.

```text
Proxmox stopped
  -> Clonezilla boots
  -> source and target disks selected
  -> clone completed
  -> old disk removed or disconnected
  -> new SSD boots
```

재설치 방식은 다음 상태로 진행한다.

```text
new SSD installed
  -> Proxmox installed
  -> network reachable
  -> storage configured
  -> backups restored
  -> services verified
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- VM/CT backup 없이 OS disk 작업을 시작하지 않는다.
- Backup은 Proxmox host 내부가 아니라 외부 저장소에도 보관한다.
- Clone 대상 디스크를 선택하기 전 모델, serial, 용량을 확인한다.
- 운영 중인 mounted OS disk를 `dd`로 live clone하지 않는다.
- Cluster node는 단일 node처럼 `/etc/pve`를 덮어쓰지 않는다.
- 새 설치에서 hostname과 IP를 바꾸면 `/etc/pve` node path, cluster, certificate, storage 참조가 영향을 받을 수 있다.
- 복원 후 `pveproxy`, `pvedaemon`, `pvestatd`, storage 상태를 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 guest와 storage inventory를 저장한다.

```bash
pvesh get /nodes/$(hostname)/qemu
pvesh get /nodes/$(hostname)/lxc
pvesm status
lsblk -f
zpool status
lvs
```

VM/CT backup을 만든다.

```bash
vzdump --all --mode snapshot --storage backup-storage
```

개별 VM과 CT backup을 확인한다.

```bash
ls -lh /var/lib/vz/dump
find /mnt/backup -maxdepth 2 -type f
```

Host 설정을 별도 보관한다.

```bash
mkdir -p /root/pve-host-backup
tar -czf /root/pve-host-backup/etc-pve.tar.gz /etc/pve
cp /etc/network/interfaces /root/pve-host-backup/interfaces
cp /etc/hosts /root/pve-host-backup/hosts
cp /etc/hostname /root/pve-host-backup/hostname
cp /etc/fstab /root/pve-host-backup/fstab
pveversion -v > /root/pve-host-backup/pveversion.txt
pvesm status > /root/pve-host-backup/storage-status.txt
```

복제 방식은 Proxmox를 끄고 Clonezilla 같은 offline 도구로 source disk와 target SSD를 선택한다. 복제 완료 후 기존 OS 디스크를 제거하거나 disconnect한 뒤 새 SSD로 부팅한다.

부팅 후 기본 상태를 확인한다.

```bash
hostnamectl
ip addr show
systemctl --failed
systemctl status pveproxy
systemctl status pvedaemon
pvesm status
qm list
pct list
```

LVM layout이면 먼저 현재 구조를 확인한다.

```bash
lsblk -f
pvs
vgs
lvs
df -h
```

ZFS root면 pool 상태와 autoexpand를 확인한다.

```bash
zpool status
zpool get autoexpand
zpool list
```

재설치 방식에서는 새 Proxmox 설치 후 storage를 준비하고 backup을 복원한다.

```bash
qmrestore /mnt/backup/vzdump-qemu-100.vma.zst 100 --storage local-lvm
pct restore 101 /mnt/backup/vzdump-lxc-101.tar.zst --storage local-lvm
```

복원 후 guest를 하나씩 부팅해 확인한다.

```bash
qm start 100
qm status 100
pct start 101
pct status 101
```

## 9. 실패 사례 (What could go wrong?)

Clone source와 target을 반대로 선택하면 기존 OS 디스크를 빈 SSD로 덮어쓸 수 있다. 모델명, serial, 용량을 물리 라벨과 대조한다.

새 SSD가 더 작으면 block-level clone이 실패하거나 끝부분 데이터가 잘린다. 이 경우 재설치와 backup restore가 더 안전하다.

복제 후 남은 공간을 자동으로 쓰지 못할 수 있다. LVM, ZFS, partition table 확장은 별도 단계로 검증한다.

`/etc/pve`를 새 설치에 통째로 덮어쓰면 pmxcfs, node name, cluster state가 꼬일 수 있다. 필요한 설정을 비교 후 선택적으로 반영한다.

VM/CT disk가 OS 디스크의 local storage에 있었는데 backup을 외부로 빼지 않았다면 새 설치 후 복구할 데이터가 없다.

Cluster node는 corosync, certificate, node identity, quorum 문제가 얽힌다. 가능하면 공식 cluster node 교체 절차를 따른다.

## 10. 뇌 확장하기 (Evolution & Variants)

단일 node라면 “재설치 후 backup restore”가 가장 이해하기 쉽고 검증 가능하다. Clone은 빠르지만 기존 디스크 레이아웃 문제도 그대로 가져간다.

Production에 가까운 환경에서는 Proxmox Backup Server를 사용해 guest backup, retention, restore test를 정기화하는 편이 좋다.

Host OS 자체는 IaC로 재구성 가능하게 만들고, guest data는 backup system으로 복구하는 구조가 장기적으로 안전하다.

공식 문서는 Proxmox backup이 VM/CT configuration과 data를 포함하고, restore는 `qmrestore`와 `pct restore`로 수행한다고 설명한다.

- Proxmox Backup and Restore: <https://pve.proxmox.com/pve-docs/chapter-vzdump.html>
- Proxmox documentation index: <https://pve.proxmox.com/pve-docs/index.html>
- Host bootloader: <https://pve.proxmox.com/wiki/Host_Bootloader>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] VM/CT backup이 외부 저장소에 있다.
- [ ] `/etc/pve`, network, storage, hostname, fstab 정보를 백업했다.
- [ ] Source disk와 target SSD를 serial 기준으로 확인했다.
- [ ] Clone 또는 재설치 중 하나의 경로를 선택했다.
- [ ] 새 SSD로 부팅 후 Proxmox service 상태를 확인했다.
- [ ] Storage 상태와 guest 목록을 확인했다.
- [ ] VM/CT를 하나씩 부팅해 서비스 상태를 확인했다.
- [ ] 남은 공간 확장 여부를 LVM 또는 ZFS 기준으로 확인했다.
- [ ] Cluster node라면 quorum과 node identity를 별도로 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxmox OS 디스크 마이그레이션은 host disk 복사가 아니라 guest backup, host config, storage mapping, bootloader, service verification을 함께 다루는 작업이다. 가장 먼저 백업을 외부에 두고, 마지막에는 실제 VM/CT 부팅으로 검증한다.
