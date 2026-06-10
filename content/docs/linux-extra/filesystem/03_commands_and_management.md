# Filesystem 명령과 관리

이 문서는 Linux storage를 조회, mount, fstab 등록, LVM 확장까지 다룰 때 필요한 명령 흐름을 정리한다. 목표는 명령어 목록이 아니라 “읽기 전용 확인 → 임시 mount → 영구 설정 → 검증” 순서를 만드는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

디스크 관리는 실수 비용이 크다. partition tool, `mkfs`, `mount`, `fstab`, LVM 명령은 모두 정상 명령이어도 대상이 틀리면 데이터 손실이나 부팅 실패로 이어진다.

운영 문서는 명령어보다 사전 확인과 사후 검증을 더 크게 다뤄야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `lsblk`, `fdisk`, `mount`, `umount`, `/etc/fstab`, LVM 계층과 기본 명령을 짧게 설명한다. 보완해야 할 점은 다음과 같다.

- destructive 명령과 read-only 명령이 분리되어 있지 않다.
- fstab 변경 후 검증 절차가 부족하다.
- LVM 확장과 filesystem 확장의 순서가 명확하지 않다.
- XFS와 ext4의 resize 차이를 구분하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안전하게 수행하는 것이다.

- Block device와 filesystem metadata를 조회한다.
- 임시 mount로 접근 가능 여부를 검증한다.
- UUID 기준으로 fstab에 등록한다.
- fstab 변경 후 부팅 실패 위험을 줄인다.
- LVM PV, VG, LV 상태를 확인한다.
- LV와 filesystem을 올바른 순서로 확장한다.

## 4. 시스템 번역 (Data Flow)

디스크를 영구 mount하는 흐름은 다음과 같다.

```text
block device discovered
  -> partition and filesystem identified
  -> temporary mount tested
  -> UUID copied into fstab
  -> mount -a verification
  -> reboot-safe state
```

LVM 확장 흐름은 다음과 같다.

```text
new block space
  -> PV created or resized
  -> VG free space available
  -> LV extended
  -> filesystem resized
  -> df and lsblk verified
```

## 5. 핵심 구성요소 (Building Blocks)

`lsblk -f`는 device, partition, filesystem, UUID, mountpoint를 한 번에 보여준다.

`blkid`는 fstab에 넣을 UUID와 filesystem type을 확인하는 데 유용하다.

`findmnt`는 mount tree와 fstab 검증에 사용한다.

`mount`와 `umount`는 filesystem을 directory tree에 붙이고 해제한다.

`/etc/fstab`은 boot-time mount 계약이다. 잘못 쓰면 boot가 지연되거나 emergency mode로 들어갈 수 있다.

LVM은 PV, VG, LV의 3계층으로 구성된다.

`resize2fs`는 ext 계열 filesystem 확장에 사용한다. XFS는 mounted 상태에서 `xfs_growfs`로 확장한다.

## 6. 상태 전이 (State Transition)

새 디스크를 mount하는 상태 전이는 다음과 같다.

```text
disk visible
  -> partition exists
  -> filesystem exists
  -> mount point created
  -> temporary mount succeeds
  -> fstab entry added
  -> mount -a succeeds
```

LVM 확장은 다음 상태를 가진다.

```text
PV space available
  -> VG free extents increase
  -> LV size increases
  -> filesystem size increases
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `mkfs`는 기존 데이터를 삭제한다.
- `/dev/sdX` 대신 UUID나 by-id를 fstab에 사용한다.
- fstab 수정 전 원본을 백업한다.
- fstab 수정 후 `mount -a`와 `findmnt --verify`를 실행한다.
- XFS는 shrink가 불가능하다는 전제로 설계한다.
- LVM LV만 키우고 filesystem resize를 빼먹으면 `df` 사용 가능 공간은 그대로일 수 있다.
- Mounted filesystem shrink는 일반적으로 위험하며 별도 절차가 필요하다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 디스크 상태를 확인한다.

```bash
lsblk -f
sudo blkid
findmnt
df -hT
```

임시 mount를 테스트한다.

```bash
sudo mkdir -p /mnt/data
sudo mount /dev/disk/by-uuid/UUID_VALUE /mnt/data
findmnt /mnt/data
sudo touch /mnt/data/.write-test
sudo rm /mnt/data/.write-test
sudo umount /mnt/data
```

fstab을 백업하고 등록한다.

```bash
sudo cp /etc/fstab /etc/fstab.bak
sudoedit /etc/fstab
```

fstab entry 예시는 다음과 같다.

```fstab
UUID=11111111-2222-3333-4444-555555555555 /mnt/data ext4 defaults,nofail 0 2
```

검증한다.

```bash
sudo findmnt --verify
sudo mount -a
findmnt /mnt/data
```

LVM 상태를 확인한다.

```bash
sudo pvs
sudo vgs
sudo lvs
lsblk -f
```

새 partition을 PV로 추가하고 VG에 붙인다.

```bash
sudo pvcreate /dev/sdb1
sudo vgextend vgdata /dev/sdb1
sudo vgs
```

Ext4 LV를 확장한다.

```bash
sudo lvextend -L +20G /dev/vgdata/lvdata
sudo resize2fs /dev/vgdata/lvdata
df -hT /mnt/data
```

XFS LV를 확장한다.

```bash
sudo lvextend -L +20G /dev/vgdata/lvdata
sudo xfs_growfs /mnt/data
df -hT /mnt/data
```

## 9. 실패 사례 (What could go wrong?)

fstab에 틀린 UUID를 넣으면 boot 중 mount가 실패한다. 외장 또는 선택적 디스크라면 `nofail`과 timeout 정책을 검토한다.

`umount`가 실패하면 process가 mount point를 사용 중일 수 있다. `lsof +f -- /mnt/data` 또는 `fuser -vm /mnt/data`로 확인한다.

LVM에서 VG free space가 없는데 LV를 확장하려 하면 실패한다. 먼저 `vgs`로 Free column을 본다.

XFS를 줄이려고 하면 지원되지 않는다. 더 작은 크기로 옮기려면 새 filesystem 생성과 data migration을 설계한다.

Partition table을 수정하고 kernel이 새 크기를 못 보면 `partprobe` 또는 reboot가 필요할 수 있다.

Filesystem type을 잘못 지정해 mount하면 실패하거나 잘못된 옵션을 적용할 수 있다. `lsblk -f`와 `blkid`를 기준으로 본다.

## 10. 뇌 확장하기 (Evolution & Variants)

서버에서는 raw disk보다 LVM, ZFS, Btrfs, mdraid, cloud block volume이 함께 쓰인다. 각 계층이 “용량을 늘리는 명령”과 “파일시스템을 늘리는 명령”을 따로 가진다.

fstab은 단순 자동 mount 파일이 아니라 boot dependency에 영향을 준다. systemd mount unit, automount, network mount는 별도 timeout과 ordering을 고려해야 한다.

운영 자동화에서는 `lsblk --json`, `findmnt --json` 같은 구조화 출력을 사용하면 문자열 파싱 오류를 줄일 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `lsblk -f`, `blkid`, `findmnt`, `df -hT`로 현재 상태를 확인했다.
- [ ] 임시 mount와 write test를 먼저 수행했다.
- [ ] fstab 수정 전 백업했다.
- [ ] UUID 또는 stable path를 사용했다.
- [ ] `findmnt --verify`와 `mount -a`를 통과했다.
- [ ] LVM 계층에서 PV, VG, LV 상태를 구분했다.
- [ ] LV 확장 후 filesystem resize를 수행했다.
- [ ] Ext4와 XFS resize 차이를 알고 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Filesystem 관리는 장치를 찾고, 임시로 붙여 보고, UUID로 영구 등록한 뒤 검증하는 순서다. LVM은 LV 확장과 filesystem 확장이 별도 단계라는 점을 잊으면 안 된다.
