# Linux Storage 문제 해결

이 문서는 디스크, 파티션, 파일시스템, mount 문제가 발생했을 때 `dmesg`, `lsblk`, `blkid`, `findmnt`, `fsck`로 범위를 좁히는 절차를 정리한다. 목표는 바로 format하거나 repair하지 않고 어느 계층에서 실패했는지 확인하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Storage 문제는 증상이 비슷하다. 장치가 안 보일 수도 있고, 장치는 보이지만 partition이 없을 수도 있고, filesystem metadata가 깨졌을 수도 있고, 단순히 mount가 안 된 것일 수도 있다.

계층을 구분하지 않으면 멀쩡한 디스크를 format하거나, hardware 문제를 filesystem 문제로 오해할 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `blkid` 출력 누락 원인과 `dmesg` 분석을 설명한다. 보완해야 할 점은 다음과 같다.

- 장치 인식, udev, partition, filesystem, mount 단계를 하나의 진단 흐름으로 연결해야 한다.
- `fsck` 실행 전 unmount와 backup 전제가 더 강해야 한다.
- `blkid` cache와 probe 차이를 명확히 해야 한다.
- 하드웨어 장애와 filesystem 손상을 분리하는 기준이 필요하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 질문에 순서대로 답하는 것이다.

- Kernel이 장치를 감지했는가?
- `/dev` device node가 생성되었는가?
- Partition table이 보이는가?
- Filesystem signature와 UUID가 보이는가?
- Mount point가 이미 사용 중인가?
- Kernel log에 I/O error가 있는가?
- Repair를 실행해도 되는 상태인가?

## 4. 시스템 번역 (Data Flow)

디스크 인식 흐름은 다음과 같다.

```text
physical device connected
  -> kernel driver detects device
  -> udev creates /dev node and symlinks
  -> partition table is parsed
  -> filesystem signature is probed
  -> mount attaches filesystem to directory tree
```

어느 단계에서 멈췄는지 알면 다음 명령이 정해진다.

## 5. 핵심 구성요소 (Building Blocks)

`dmesg`는 kernel ring buffer를 보여준다. 장치 인식, I/O error, reset, timeout을 확인한다.

`lsblk -f`는 block device, partition, filesystem, UUID, mountpoint를 한눈에 보여준다.

`blkid`는 filesystem signature와 UUID를 확인한다. `-p`는 low-level probing에 유용하다.

`udevadm`은 udev event 처리 상태를 확인하고 settle을 기다릴 수 있다.

`findmnt`는 현재 mount tree를 확인한다.

`smartctl`은 SMART 지원 디스크의 health와 error counter를 확인한다.

`fsck`는 filesystem repair 도구다. mounted filesystem에 무작정 실행하면 위험하다.

## 6. 상태 전이 (State Transition)

정상 mount까지의 상태는 다음과 같다.

```text
device absent
  -> device detected
  -> partitions visible
  -> filesystem identified
  -> mount succeeds
  -> read and write verified
```

오류 상태는 다음 중 하나로 분기한다.

```text
no kernel log
kernel detects but no /dev node
partition table missing
filesystem signature missing
filesystem dirty or corrupted
mount option or permission failure
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `mkfs`는 복구 명령이 아니라 새 filesystem 생성 명령이다.
- `fsck`는 대상 filesystem을 unmount한 뒤 실행한다.
- `dd`, `wipefs`, `mkfs`, partition write 전에는 device model과 serial을 확인한다.
- I/O error가 반복되는 디스크는 먼저 image 또는 backup을 고려한다.
- `/dev/sdX` 이름은 재부팅이나 재연결 후 바뀔 수 있다.
- fstab 수정 전 `findmnt --verify` 또는 `mount -a` 검증 경로를 준비한다.
- 중요한 데이터가 있으면 repair보다 backup 또는 clone이 먼저다.

## 8. 가장 작은 예제 (Minimal Viable Example)

장치를 연결하기 전 kernel log를 실시간으로 본다.

```bash
sudo dmesg -w
```

다른 터미널에서 block device를 확인한다.

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,UUID,MOUNTPOINTS,MODEL,SERIAL
sudo blkid
ls -l /dev/disk/by-id/
```

특정 장치를 직접 probe한다.

```bash
sudo blkid -p /dev/sdb1
sudo file -s /dev/sdb1
```

udev 처리를 기다린다.

```bash
sudo udevadm settle
udevadm info --query=all --name=/dev/sdb
```

Kernel error를 필터링한다.

```bash
sudo dmesg | rg -i 'error|fail|timeout|reset|i/o|usb|scsi|nvme|ata'
```

Mount 상태를 확인한다.

```bash
findmnt
findmnt /mnt/data
mount | rg /mnt/data
```

Unmount 후 filesystem check를 실행한다.

```bash
sudo umount /dev/sdb1
sudo fsck -f /dev/sdb1
```

SMART 상태를 확인한다.

```bash
sudo smartctl -a /dev/sdb
```

fstab 변경을 검증한다.

```bash
sudo cp /etc/fstab /etc/fstab.bak
sudo findmnt --verify
sudo mount -a
```

## 9. 실패 사례 (What could go wrong?)

`blkid`에 아무것도 나오지 않는다고 빈 디스크라고 단정하면 안 된다. 권한, partition table, raw disk, 손상, cache 문제일 수 있다.

외장 디스크가 `dmesg`에 전혀 나오지 않으면 filesystem이 아니라 케이블, 포트, 전원, enclosure 문제일 가능성이 높다.

`dmesg`에 reset, timeout, I/O error가 반복되면 repair 작업 자체가 디스크 상태를 악화시킬 수 있다. 먼저 image를 떠야 할 수 있다.

Mounted filesystem에 `fsck`를 실행하면 데이터 손상이 생길 수 있다.

`/etc/fstab`에 잘못된 UUID를 넣으면 부팅이 emergency mode로 떨어질 수 있다. `nofail`이 필요한 외장 디스크인지 검토한다.

USB enclosure는 실제 disk serial을 숨기거나 바꿔 보여줄 수 있다. by-id 경로를 물리 라벨과 함께 기록한다.

## 10. 뇌 확장하기 (Evolution & Variants)

Storage 장애는 관측 순서가 중요하다. Hardware log가 먼저이고, 그 다음 device node, partition, filesystem, mount, application log를 본다.

서버 환경에서는 SMART, Prometheus node exporter, ZFS scrub, RAID controller log 같은 지속 관측이 필요하다. 장애가 난 뒤에만 `dmesg`를 보면 이미 늦을 수 있다.

복구가 목적이면 원본 디스크에 직접 쓰기보다 `ddrescue`로 image를 만든 뒤 image에서 복구를 시도하는 접근이 안전하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Kernel이 장치를 감지했는지 `dmesg`로 확인했다.
- [ ] `/dev` node와 by-id 경로를 확인했다.
- [ ] Partition과 filesystem signature를 구분했다.
- [ ] Mount 상태와 fstab을 확인했다.
- [ ] I/O error 반복 여부를 확인했다.
- [ ] `fsck` 전 unmount와 backup 필요성을 판단했다.
- [ ] Repair 또는 format 전 device serial을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Storage 문제는 kernel 감지, udev node, partition, filesystem, mount 단계 중 어디에서 멈췄는지 찾는 일이다. `mkfs`와 `fsck`는 마지막 단계이며, 데이터가 중요하면 먼저 백업이나 image를 만든다.
