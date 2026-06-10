# Proxmox 스냅샷, 백업, 템플릿 기준

Proxmox VE의 snapshot, backup, template은 모두 VM/CT 상태를 다루지만 목적이 다르다. 이 문서는 세 기능을 “롤백”, “복구”, “표준 배포”라는 운영 경계로 나누어 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Proxmox 운영에서 가장 흔한 실수는 snapshot을 backup처럼 믿거나, template을 변경 가능한 VM처럼 다루거나, backup을 만들고 restore를 검증하지 않는 것이다.

snapshot은 빠른 되돌리기에는 좋지만 원본 storage 장애에는 무력하다. backup은 재해 복구의 기준이지만 시간과 저장 공간이 든다. template은 반복 배포를 빠르게 하지만 오래 방치하면 보안 업데이트와 기본 설정이 낡는다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 snapshot, backup, template의 차이를 비교하고 GUI/CLI 예제를 제공한다. 다만 운영 관점에서 다음 항목이 부족했다.

- snapshot이 원본 storage에 의존한다는 위험이 더 강하게 고정되어야 한다.
- Proxmox backup mode의 consistency/downtime trade-off가 빠져 있다.
- CT mount point와 bind mount가 backup에 포함되는지 확인해야 한다.
- template에는 machine-id, SSH host key, cloud-init 상태, secret 제거가 필요하다.
- backup은 생성보다 restore test가 완료 기준이라는 점이 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 작업 목적에 맞는 기능을 선택하고, 복구 가능성을 검증하는 것이다.

- 위험한 변경 전에는 snapshot을 짧게 유지한다.
- 재해 복구에는 외부 storage 또는 Proxmox Backup Server에 backup을 둔다.
- 반복 배포에는 cloud-init 가능한 template을 사용한다.
- linked clone과 full clone의 의존성을 구분한다.
- backup은 restore test까지 완료해야 성공으로 본다.

## 4. 시스템 번역 (Data Flow)

세 기능은 다음처럼 다른 데이터 흐름을 가진다.

```text
Snapshot
  -> same storage delta
  -> short rollback point

Backup
  -> vzdump or backup job
  -> backup storage or Proxmox Backup Server
  -> restore target

Template
  -> prepared VM image
  -> convert to template
  -> clone
  -> cloud-init personalization
```

snapshot은 원본과 같은 장애 도메인에 남는다. backup은 원본과 분리된 복구 산출물이다. template은 복구 산출물이 아니라 새 VM을 찍어내는 기준 이미지다.

## 5. 핵심 구성요소 (Building Blocks)

Snapshot은 VM/CT의 특정 시점을 같은 storage 안에 기록한다. 빠르지만 원본 volume과 storage에 의존한다.

Backup은 `vzdump` 또는 Datacenter backup job으로 생성한다. Proxmox 공식 문서는 backup이 VM/CT 설정과 데이터를 포함하는 full backup이라고 설명한다. Proxmox Backup Server를 쓰면 deduplicated chunks와 metadata로 저장된다.

Backup mode는 consistency와 downtime의 trade-off다. VM `stop` mode는 가장 높은 일관성을 주지만 중단이 있고, `snapshot` mode는 다운타임이 작지만 guest agent/fsfreeze 상태에 따라 일관성 위험이 남는다.

Template은 부팅 가능한 운영 VM이 아니라 clone의 원본이다. linked clone은 template에 의존하고, full clone은 독립적이다.

Cloud-init은 template에서 복제된 VM의 사용자, SSH key, 네트워크 설정을 주입하는 personalization 경로다.

## 6. 상태 전이 (State Transition)

위험한 변경 작업은 다음 상태로 진행한다.

```text
backup 존재 확인
  -> snapshot 생성
  -> 변경 작업
  -> 검증
  -> snapshot 삭제 또는 rollback
```

재해 복구 준비는 다음 상태로 진행한다.

```text
backup job 생성
  -> backup 완료
  -> retention 적용
  -> 별도 VMID로 restore test
  -> boot/application 검증
  -> 운영 절차 기록
```

template 운영은 다음 상태로 진행한다.

```text
base VM 준비
  -> package update
  -> secret and identity cleanup
  -> cloud-init 설정
  -> template 변환
  -> clone
  -> per-VM 설정 주입
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Snapshot은 backup이 아니다.
- Snapshot은 변경 작업이 끝나면 삭제하거나 명확한 보존 기간을 둔다.
- Backup storage는 원본 VM storage와 같은 단일 장애점에 두지 않는다.
- Backup은 restore test 없이는 완료로 보지 않는다.
- CT의 추가 mount point, bind mount, device mount는 backup 포함 여부를 따로 확인한다.
- Template에는 개인 SSH key, token, host-specific machine-id를 남기지 않는다.
- Linked clone을 쓰면 template을 삭제하거나 손상시키지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

위험한 업데이트 전 snapshot을 만든다.

```bash
qm snapshot 100 before-upgrade --description "before package upgrade"
qm listsnapshot 100
```

문제가 생기면 rollback한다.

```bash
qm rollback 100 before-upgrade
```

작업이 끝나고 안정화되면 snapshot을 제거한다.

```bash
qm delsnapshot 100 before-upgrade
```

즉시 backup을 만든다.

```bash
vzdump 100 --storage pbs-storage --compress zstd --mode snapshot
```

복구 테스트는 새 VMID로 수행한다.

```bash
qmrestore /var/lib/vz/dump/vzdump-qemu-100-2026_05_27-020000.vma.zst 9100 --storage local-lvm
qm start 9100
```

cloud image 기반 template의 최소 흐름은 다음과 같다.

```bash
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
qm create 9000 --name ubuntu-noble-template --memory 2048 --net0 virtio,bridge=vmbr0
qm importdisk 9000 noble-server-cloudimg-amd64.img local-lvm
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0
qm set 9000 --boot order=scsi0
qm set 9000 --ide2 local-lvm:cloudinit
qm set 9000 --serial0 socket --vga serial0
qm template 9000
```

template에서 full clone을 만든다.

```bash
qm clone 9000 101 --name web-01 --full true --storage local-lvm
qm set 101 --ciuser admin --sshkeys ~/.ssh/id_ed25519.pub --ipconfig0 ip=dhcp
qm start 101
```

## 9. 실패 사례 (What could go wrong?)

snapshot을 장기간 방치하면 delta가 커지고 성능과 관리 복잡도가 나빠진다. 원본 storage 장애가 나면 snapshot도 함께 잃는다.

backup job은 성공했지만 CT bind mount가 빠져 있으면 복구 후 데이터가 비어 있을 수 있다. Proxmox 공식 문서는 CT의 device와 bind mount 내용은 Proxmox storage library 밖에서 관리되므로 backup되지 않는다고 설명한다.

VM snapshot mode backup은 guest 내부 애플리케이션 일관성을 항상 보장하지 않는다. 데이터베이스는 guest agent, fsfreeze, application-level dump를 함께 고려한다.

linked clone을 많이 만든 뒤 template을 삭제하면 clone 의존성이 깨질 수 있다. 장기 운영 VM은 full clone이 더 단순하다.

template에 `/etc/machine-id`, SSH host key, cloud-init 상태, shell history, token이 남아 있으면 clone들이 같은 identity나 secret을 공유할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

Proxmox Backup Server를 쓰면 deduplication, prune, verify, namespace, encryption 같은 운영 기능을 활용할 수 있다. 단, PBS 자체도 backup과 monitoring 대상이다.

ZFS, Ceph, LVM-thin 같은 storage backend는 snapshot과 clone 동작 특성이 다르다. 운영 표준은 storage backend 기준으로 다시 검토해야 한다.

대규모 배포에서는 template 관리가 image pipeline이 된다. base image update, security patch, vulnerability scan, cloud-init test, template versioning을 자동화 대상으로 둔다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 변경 작업 전 최신 backup 존재를 확인했다.
- [ ] snapshot 목적과 삭제 시점을 기록했다.
- [ ] backup job이 외부 또는 별도 backup storage를 사용한다.
- [ ] retention 정책을 설정했다.
- [ ] restore test를 별도 VMID로 수행했다.
- [ ] CT mount point와 bind mount 포함 여부를 확인했다.
- [ ] template에서 secret과 host identity를 제거했다.
- [ ] linked clone과 full clone 중 의도한 방식을 선택했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Snapshot은 짧은 rollback 지점, backup은 재해 복구 산출물, template은 새 VM을 만드는 기준 이미지다. 셋 중 장애 복구를 증명하는 것은 restore test를 통과한 backup뿐이다.
