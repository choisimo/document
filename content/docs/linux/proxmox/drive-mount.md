# Proxmox 물리 디스크 VM 연결

이 문서는 Proxmox VE에서 host의 물리 디스크를 QEMU/KVM VM에 block device로 연결하는 절차를 정리한다. 목표는 `/dev/sdX`가 아니라 stable `/dev/disk/by-id` 경로를 사용하고, 연결 전 데이터 손실과 migration 제약을 이해하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

NAS VM, 복구 도구 VM, 특정 storage workload는 물리 디스크를 VM이 직접 다뤄야 할 때가 있다. 이때 Proxmox storage layer에 disk image를 만드는 방식이 아니라 host block device를 VM disk로 연결할 수 있다.

하지만 물리 디스크 passthrough는 편의 기능이 아니다. VM이 디스크를 직접 쓰면 host와 VM이 동시에 filesystem을 mount하지 않아야 하고, 해당 VM의 live migration도 제한된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `qm set`으로 disk를 연결하고 interface type을 비교한다. 보완해야 할 점은 다음과 같다.

- Proxmox 공식 문서가 강조하는 `/dev/disk/by-id` 사용 이유를 더 분명히 해야 한다.
- host가 이미 사용 중인 디스크인지 확인하는 절차가 약하다.
- 제거 명령과 VM config 확인 흐름이 충분히 분리되어 있지 않다.
- passthrough가 container가 아니라 QEMU VM 대상이라는 점이 약하다.
- live migration과 host I/O 영향이 명확하지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 검증하는 것이다.

- 연결 대상 VM ID가 확정되어 있다.
- 물리 디스크의 모델, serial, by-id path를 확인했다.
- host가 해당 filesystem을 mount하거나 사용 중이지 않다.
- VM config에 디스크가 stable path로 추가되었다.
- guest OS에서 새 disk를 확인했다.
- 제거 시 VM config에서 해당 disk 항목을 안전하게 unlink했다.

## 4. 시스템 번역 (Data Flow)

연결 흐름은 다음과 같다.

```text
host physical disk
  -> /dev/disk/by-id stable symlink
  -> Proxmox VM config
  -> QEMU exposes virtual disk controller
  -> guest OS sees block device
  -> guest partitions or mounts disk
```

Proxmox가 disk 내용을 이해하거나 보호해주지 않는다. Guest OS가 block device를 직접 다루기 때문에 파일시스템 소유권을 명확히 해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

`lsblk -o +MODEL,SERIAL,WWN`은 디스크 모델과 serial을 확인하는 데 사용한다.

`/dev/disk/by-id`는 재부팅 후에도 안정적인 device symlink를 제공한다. `/dev/sda`, `/dev/sdb`는 부팅 순서에 따라 바뀔 수 있다.

`qm config <vmid>`는 VM의 현재 hardware config를 확인한다.

`qm set <vmid> -scsiN <path>`는 VM에 disk를 추가한다.

VirtIO SCSI는 일반적인 Linux VM에서 성능과 기능 면에서 우선 검토할 controller다.

`qm unlink <vmid> --idlist scsiN`은 VM config에서 disk 항목을 제거한다.

## 6. 상태 전이 (State Transition)

안전한 연결 상태는 다음 순서로 진행한다.

```text
disk physically installed
  -> host identifies model and serial
  -> by-id path selected
  -> host usage checked
  -> VM powered off or hotplug policy confirmed
  -> disk attached in VM config
  -> guest verifies disk
```

제거 상태는 다음 순서로 진행한다.

```text
guest unmounts disk
  -> VM stopped if needed
  -> qm unlink removes VM config entry
  -> host verifies disk no longer assigned
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `/dev/sdX` 경로로 VM에 연결하지 않는다.
- Host와 guest가 같은 filesystem을 동시에 mount하지 않는다.
- 연결 전 `lsblk`, `findmnt`, `lsof`로 host 사용 여부를 확인한다.
- VM backup, snapshot, migration 정책이 물리 disk passthrough와 호환되는지 확인한다.
- 디스크 serial이 불명확하면 연결하지 않는다.
- RAID나 ZFS용 여러 디스크는 순서와 serial을 기록한 뒤 연결한다.
- VM live migration이 필요한 workload에는 raw physical disk passthrough를 기본값으로 두지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

대상 VM을 확인한다.

```bash
qm list
qm config 100
```

디스크를 확인한다.

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS,MODEL,SERIAL,WWN
ls -l /dev/disk/by-id/
```

특정 serial을 기준으로 by-id 경로를 찾는다.

```bash
ls -l /dev/disk/by-id/ | rg 'SERIAL_OR_MODEL'
```

Host에서 사용 중인지 확인한다.

```bash
findmnt
lsof /dev/sdX
```

VM에 SCSI disk로 연결한다.

```bash
qm set 100 -scsi2 /dev/disk/by-id/ata-ST2000DM008-2FR102_ZFL12345
qm config 100 | rg 'scsi2|virtio|sata'
```

VM을 시작한 뒤 guest 안에서 확인한다.

```bash
lsblk -f
dmesg | tail -n 50
```

VM에서 unmount 후 연결을 제거한다.

```bash
qm unlink 100 --idlist scsi2
qm config 100 | rg scsi2
```

NVMe나 SSD를 연결할 때도 원칙은 같다. stable by-id path를 사용한다.

```bash
qm set 100 -scsi3 /dev/disk/by-id/nvme-Samsung_SSD_970_EVO_PLUS_SERIAL
```

## 9. 실패 사례 (What could go wrong?)

`/dev/sdb`로 연결하면 재부팅 후 다른 disk가 `/dev/sdb`가 되어 VM이 엉뚱한 디스크를 잡을 수 있다.

Host가 이미 mount 중인 filesystem을 guest도 mount하면 filesystem corruption이 발생할 수 있다.

VM 안에서 disk를 초기화하면 host의 원본 데이터도 사라진다. Passthrough는 copy가 아니라 같은 block device 접근이다.

물리 disk passthrough VM은 live migration이 불가능하거나 강하게 제한된다. 다른 node에는 같은 disk가 없기 때문이다.

SMART error나 cable 문제는 host I/O wait를 증가시키고 다른 VM에도 영향을 줄 수 있다.

Backup software가 VM config만 보고 guest 안의 raw disk 데이터를 포함하지 않을 수 있다. 백업 범위를 별도로 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

단순 데이터 disk를 VM에 주는 목적이라면 Proxmox storage에 virtual disk를 만드는 방식이 migration, backup, snapshot 면에서 더 관리하기 쉽다.

NAS VM에 여러 물리 disk를 넘기는 구조는 guest가 storage stack을 소유하게 만든다. 이 경우 host는 disk를 건드리지 않아야 하며, disk serial과 slot mapping을 문서화해야 한다.

PCI HBA passthrough는 disk 개별 passthrough보다 isolation이 강하지만 IOMMU, hardware grouping, migration 제약이 더 크다.

공식 문서는 `/dev/disk/by-id` 사용과 `qm set`, `qm unlink` 흐름을 기준으로 설명한다.

- Proxmox physical disk passthrough: <https://pve.proxmox.com/wiki/Passthrough_Physical_Disk_to_Virtual_Machine_(VM)>
- `qm` manual: <https://pve.proxmox.com/pve-docs/qm.1.html>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] VM ID와 guest OS를 확인했다.
- [ ] 디스크 모델, serial, by-id path를 기록했다.
- [ ] Host가 해당 disk를 mount하거나 사용 중이지 않다.
- [ ] `/dev/sdX`가 아니라 `/dev/disk/by-id`를 사용했다.
- [ ] VM config에 disk가 의도한 controller 번호로 추가되었다.
- [ ] Guest OS에서 새 block device를 확인했다.
- [ ] Backup과 migration 제약을 기록했다.
- [ ] 제거 시 guest unmount 후 `qm unlink`를 사용했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxmox 물리 디스크 passthrough는 VM에 disk image를 주는 것이 아니라 host block device를 직접 넘기는 작업이다. 안정적인 by-id 경로, 단일 filesystem 소유권, migration 제약을 먼저 확인해야 한다.
