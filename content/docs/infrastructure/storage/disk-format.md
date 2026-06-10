# 리눅스 디스크 초기화와 파일시스템 확장 기준

디스크 포맷과 용량 확장은 가장 쉽게 데이터를 잃는 운영 작업이다. 이 문서는 새 디스크를 초기화해 파일시스템을 만들거나, Proxmox VM 안의 LVM root volume을 확장할 때 확인해야 하는 순서를 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

`wipefs`, `fdisk`, `mkfs`, `lvremove`, `mdadm --zero-superblock` 같은 명령은 되돌리기 어렵다. 장치 이름을 한 글자만 잘못 봐도 운영 디스크를 초기화할 수 있다.

반대로 디스크를 확장했는데 파티션, LVM PV, LV, 파일시스템 중 한 단계만 빼먹으면 OS는 새 공간을 보지 못한다. 스토리지 작업은 명령어 암기가 아니라 계층 구조를 따라 상태를 전이시키는 작업이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `dmsetup`, `mdadm`, `wipefs`, `fdisk`, LVM 확장을 모두 명령어별로 설명한다. 하지만 다음 기준이 부족했다.

- 데이터 삭제 명령과 일반 조회 명령이 같은 수준으로 나열되어 있다.
- 어떤 계층을 먼저 해제해야 하는지 명확하지 않다.
- 새 디스크 초기화와 기존 LVM 확장 절차가 한 문서 안에서 섞여 있다.
- 작업 완료 조건이 `df -h` 확인 정도로 축소되어 있다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 대상 장치를 정확히 식별하고, 의도한 계층만 변경하며, 변경 후 mount와 파일시스템 상태를 검증하는 것이다.

- `lsblk`, `blkid`, `/dev/disk/by-id`로 대상 디스크를 확인한다.
- mounted filesystem, LVM, RAID, device-mapper 의존성을 먼저 해제한다.
- 새 용도 디스크는 signature 제거, partition table 생성, filesystem 생성 순서로 진행한다.
- VM 디스크 확장은 hypervisor disk, partition, PV, LV, filesystem 순서로 진행한다.
- 모든 파괴적 명령 전에 backup과 대상 장치명을 다시 확인한다.

## 4. 시스템 번역 (Data Flow)

새 디스크 초기화는 다음 계층을 만든다.

```text
physical disk
  -> partition table
  -> partition
  -> filesystem
  -> mount point
  -> fstab or systemd mount
```

LVM 확장은 다음 계층을 늘린다.

```text
virtual disk size
  -> partition size
  -> LVM physical volume
  -> LVM logical volume
  -> filesystem
  -> mounted capacity
```

삭제 작업은 이 흐름의 반대 방향으로 진행한다. filesystem mount를 해제하고, LV/VG/PV, RAID, partition signature 순서로 내려간다.

## 5. 핵심 구성요소 (Building Blocks)

`lsblk`는 block device 계층, 크기, mount point, filesystem type을 보여준다.

`blkid`와 `/dev/disk/by-id`는 UUID와 장치 식별자를 확인하는 데 사용한다. `/dev/sdb` 같은 이름은 재부팅 후 바뀔 수 있다.

`wipefs --all`은 filesystem, RAID, LVM, partition table signature를 제거한다. 실제 데이터 영역 전체를 안전하게 삭제하는 명령은 아니다.

`fdisk`, `parted`, `sgdisk`는 partition table을 만든다. 큰 디스크와 일반 서버에서는 GPT를 기본값으로 둔다.

`mkfs.ext4`, `mkfs.xfs`는 partition 위에 filesystem을 만든다. 실행하면 기존 파일시스템 내용은 사라진다.

`growpart`, `pvresize`, `lvextend`, `resize2fs`, `xfs_growfs`는 VM 내부 LVM 확장 흐름에서 사용한다.

## 6. 상태 전이 (State Transition)

새 디스크 초기화는 다음 상태로 진행한다.

```text
unknown disk
  -> identified disk
  -> confirmed unused
  -> signatures removed
  -> partition table created
  -> filesystem created
  -> mounted and verified
```

기존 LVM 확장은 다음 상태로 진행한다.

```text
backup verified
  -> hypervisor disk resized
  -> guest sees larger disk
  -> partition expanded
  -> PV resized
  -> LV resized
  -> filesystem resized
  -> application capacity verified
```

삭제나 초기화는 mounted 상태에서 진행하지 않는다. `umount`, swap off, service stop, LVM deactivate 같은 선행 작업이 필요하다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 파괴적 명령 전에는 장치명, 모델, 크기, serial을 함께 확인한다.
- mounted filesystem에는 `wipefs`, `mkfs`, `mdadm --zero-superblock`를 실행하지 않는다.
- `/dev/sdX` 이름만 믿고 작업하지 않는다. 가능하면 `/dev/disk/by-id`를 대조한다.
- `wipefs`는 secure erase가 아니다.
- LVM 확장은 `disk -> partition -> PV -> LV -> filesystem` 순서를 지킨다.
- XFS는 shrink가 사실상 불가능하므로 크기 설계를 보수적으로 한다.
- 작업 전 backup과 restore 가능성을 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

대상 디스크를 확인한다.

```bash
lsblk -o NAME,MODEL,SERIAL,SIZE,TYPE,FSTYPE,MOUNTPOINTS
blkid
ls -l /dev/disk/by-id/
```

대상 디스크가 `/dev/sdb`이고 새 용도라고 확인한 뒤 signature를 백업하면서 제거한다.

```bash
wipefs --all --backup /dev/sdb
parted -s /dev/sdb mklabel gpt
parted -s /dev/sdb mkpart primary ext4 0% 100%
partprobe /dev/sdb
```

파일시스템을 생성한다.

```bash
mkfs.ext4 -L data /dev/sdb1
lsblk -f /dev/sdb
```

임시 mount로 검증한다.

```bash
mkdir -p /mnt/data
mount /dev/sdb1 /mnt/data
df -h /mnt/data
touch /mnt/data/write-test
rm /mnt/data/write-test
umount /mnt/data
```

Proxmox VM에서 root LVM을 확장하는 최소 흐름은 다음과 같다. 먼저 Proxmox host에서 VM disk를 늘린다.

```bash
qm resize 201 scsi0 +168G
```

VM 내부에서 새 크기를 확인한다.

```bash
lsblk
sudo growpart /dev/sda 3
sudo pvresize /dev/sda3
sudo lvextend -r -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
df -h /
```

`-r`을 쓰지 않았다면 ext4는 다음처럼 수동 확장한다.

```bash
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv
```

XFS는 mount point 기준으로 확장한다.

```bash
sudo xfs_growfs /
```

## 9. 실패 사례 (What could go wrong?)

`/dev/sdb`가 새 디스크라고 생각했지만 재부팅 후 이름이 바뀌어 기존 데이터 디스크를 지울 수 있다. model, serial, by-id를 함께 대조한다.

LVM이나 RAID 위에 올라간 filesystem을 먼저 `wipefs`하면 상위 계층과 metadata가 꼬인다. `lsblk` 트리로 위에서 아래로 해제한다.

`wipefs --all` 후에도 실제 데이터 블록은 남을 수 있다. 폐기, 매각, 반납 디스크라면 secure erase, 암호화 폐기, `blkdiscard` 지원 여부를 별도로 검토한다.

LVM 확장에서 `growpart`만 실행하고 `pvresize`를 빼먹으면 VG free space가 늘지 않는다. `lvextend`만 하고 filesystem resize를 빼먹으면 `df -h`에는 여전히 옛 크기로 보인다.

XFS를 device path로 `xfs_growfs /dev/...`에 실행하면 의도와 다르게 실패할 수 있다. XFS grow는 mounted filesystem의 mount point를 대상으로 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

RAID를 해체할 때는 filesystem unmount, LVM deactivate, `mdadm --stop`, member disk `--zero-superblock`, config 정리 순서로 진행한다.

LUKS가 있으면 `cryptsetup close`로 mapping을 닫은 뒤 하위 장치를 정리한다. device-mapper 잔여 장치는 `dmsetup ls --tree`로 의존성을 확인한다.

운영 서버에서는 수작업보다 runbook과 maintenance window가 중요하다. 변경 전후 `lsblk`, `blkid`, `df`, `pvs/vgs/lvs` 출력을 저장하면 복구 판단이 쉬워진다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 대상 장치의 이름, 크기, 모델, serial을 확인했다.
- [ ] backup 또는 복구 가능성을 확인했다.
- [ ] mounted filesystem과 상위 LVM/RAID 의존성을 해제했다.
- [ ] 파괴적 명령 전 마지막으로 장치명을 재확인했다.
- [ ] 새 partition table과 filesystem을 생성했다.
- [ ] mount와 쓰기 테스트를 수행했다.
- [ ] LVM 확장 시 PV, LV, filesystem이 모두 확장되었다.
- [ ] 변경 전후 `lsblk`, `df`, `blkid` 출력을 기록했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

디스크 작업은 `장치 식별 -> 계층 해제 -> 파티션/파일시스템 변경 -> mount 검증` 순서다. LVM 확장은 `disk -> partition -> PV -> LV -> filesystem` 중 하나라도 빠지면 용량이 끝까지 반영되지 않는다.
