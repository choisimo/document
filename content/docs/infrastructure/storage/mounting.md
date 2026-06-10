# 리눅스 디스크 영구 마운트 기준

디스크 마운트는 파일시스템을 특정 디렉터리에 연결하는 작업이다. 이 문서는 새로 만든 파일시스템을 `/etc/fstab`에 안전하게 등록하고, 재부팅 후에도 같은 위치에 붙도록 검증하는 기준을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

임시 `mount /dev/sdb1 /mnt/data`는 재부팅 후 사라진다. 데이터 디스크, 백업 디스크, Docker data directory, 미디어 라이브러리처럼 계속 같은 경로가 필요한 storage는 영구 마운트가 필요하다.

하지만 `/etc/fstab` 항목이 틀리면 부팅이 지연되거나 emergency mode로 떨어질 수 있다. 특히 외장 디스크, 네트워크 디스크, 늦게 뜨는 장치에는 `nofail`이나 automount가 필요하다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `lsblk`, `blkid`, mount point 생성, `/etc/fstab` 추가, `mount -a` 검증을 짧게 설명한다.

보완해야 할 점은 다음과 같다.

- `/dev/sdX`보다 UUID나 by-id를 써야 하는 이유가 약하다.
- `/etc/fstab`을 append하기 전 백업과 검증이 빠져 있다.
- `discard`를 SSD 기본 옵션처럼 제시하지만 운영에서는 주기적 `fstrim`이 더 안전한 경우가 많다.
- 외장/네트워크 storage가 부팅을 막지 않도록 하는 옵션 기준이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 재부팅 후에도 의도한 파일시스템이 의도한 경로에 안전하게 mount되는 것이다.

- UUID 또는 stable device path를 사용한다.
- mount point 소유권과 권한을 의도대로 설정한다.
- `/etc/fstab` 변경 전 백업을 만든다.
- `findmnt --verify`와 `mount -a`로 재부팅 전 검증한다.
- optional disk는 `nofail` 또는 `x-systemd.automount`를 사용한다.

## 4. 시스템 번역 (Data Flow)

영구 마운트 흐름은 다음과 같다.

```text
block device
  -> filesystem UUID
  -> mount point directory
  -> /etc/fstab entry
  -> systemd mount unit
  -> mounted filesystem
  -> application path
```

애플리케이션은 `/dev/sdb1`을 보지 않는다. 애플리케이션이 보는 것은 `/mnt/data` 같은 mount point다. 따라서 mount point가 비어 있는 디렉터리인지, 실제 disk가 붙은 상태인지 구분해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

`lsblk -f`는 파일시스템 type, UUID, mount point를 함께 보여준다.

`blkid`는 특정 partition의 UUID와 filesystem type을 확인한다.

`/etc/fstab`은 부팅 시 mount할 filesystem 목록이다. 각 줄은 `source mountpoint type options dump pass` 형식이다.

`findmnt --verify`는 fstab 항목을 검증한다.

`mount -a`는 fstab에 있는 자동 mount 항목을 즉시 mount해 본다. 오류가 있으면 재부팅 전에 발견할 수 있다.

`nofail`은 장치가 없어도 부팅 실패로 처리하지 않게 한다. `x-systemd.automount`는 첫 접근 시 mount하도록 systemd automount unit을 만든다.

## 6. 상태 전이 (State Transition)

영구 마운트 작업은 다음 상태로 진행한다.

```text
filesystem exists
  -> UUID confirmed
  -> mount point created
  -> fstab backed up
  -> fstab edited
  -> syntax verified
  -> mount tested
  -> reboot verified
```

장치가 optional이면 `mount tested` 후에도 케이블 제거나 원격 storage down 상태를 가정해 부팅 영향도를 점검한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 운영 fstab을 수정하기 전에 백업을 만든다.
- `/dev/sdb1` 같은 변동 가능한 이름보다 UUID를 우선한다.
- mount point에 이미 중요한 파일이 있으면 새 filesystem이 덮어 가리므로 먼저 확인한다.
- 외장 디스크와 네트워크 mount는 부팅을 막지 않도록 `nofail`을 검토한다.
- fstab 변경 후 재부팅 전에 `findmnt --verify`와 `mount -a`를 실행한다.
- 데이터 디렉터리 권한은 애플리케이션 사용자 기준으로 설정한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

파일시스템과 UUID를 확인한다.

```bash
lsblk -f
blkid /dev/sdb1
```

mount point를 만든다.

```bash
sudo mkdir -p /mnt/data
findmnt /mnt/data
```

`/etc/fstab`을 백업한다.

```bash
sudo cp /etc/fstab /etc/fstab.bak.$(date +%Y%m%d-%H%M%S)
```

`/etc/fstab`에 다음과 같은 한 줄을 추가한다.

```text
UUID=a1b2c3d4-5678-90ab-cdef-1234567890ab /mnt/data ext4 defaults,nofail 0 2
```

XFS라면 pass 값을 `0`으로 둔다.

```text
UUID=11111111-2222-3333-4444-555555555555 /mnt/archive xfs defaults,nofail 0 0
```

검증하고 mount한다.

```bash
sudo findmnt --verify
sudo systemctl daemon-reload
sudo mount -a
findmnt /mnt/data
df -h /mnt/data
```

권한을 애플리케이션 사용자에게 맞춘다.

```bash
sudo chown -R appuser:appuser /mnt/data
sudo chmod 755 /mnt/data
```

외장 디스크처럼 없어도 부팅이 계속되어야 하는 장치는 automount를 사용할 수 있다.

```text
UUID=a1b2c3d4-5678-90ab-cdef-1234567890ab /mnt/external ext4 defaults,nofail,x-systemd.automount 0 2
```

## 9. 실패 사례 (What could go wrong?)

UUID를 잘못 쓰면 `mount -a`에서 실패하거나 부팅 시 장치를 찾지 못한다. `blkid`와 `lsblk -f` 출력을 다시 확인한다.

mount point 안에 기존 파일이 있으면 mount 후 보이지 않게 된다. 삭제된 것이 아니라 새 filesystem 아래에 가려진 상태다.

외장 디스크에 `nofail`이 없으면 디스크가 빠진 상태에서 부팅이 멈출 수 있다.

`discard`를 모든 SSD에 상시 옵션으로 넣으면 workload에 따라 성능이 흔들릴 수 있다. 일반 서버에서는 `systemctl status fstrim.timer`로 주기적 trim을 확인하는 방식도 고려한다.

권한을 root 전용으로 둔 채 Docker나 애플리케이션 data directory로 쓰면 서비스가 시작되지만 파일 생성에 실패할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

네트워크 filesystem은 `_netdev`, `nofail`, automount, timeout 옵션을 함께 검토한다. 네트워크가 늦게 올라오는 서버에서는 local disk와 같은 fstab 옵션을 쓰면 부팅이 불안정해진다.

systemd mount unit을 직접 만들면 mount dependency, timeout, automount 동작을 더 세밀하게 제어할 수 있다.

Docker data-root, database data directory, media storage처럼 서비스가 의존하는 mount는 서비스 시작 순서와 mount unit dependency까지 함께 설계해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `lsblk -f`와 `blkid`로 UUID와 filesystem type을 확인했다.
- [ ] mount point가 비어 있거나 의도한 디렉터리임을 확인했다.
- [ ] `/etc/fstab` 백업을 만들었다.
- [ ] fstab source로 UUID를 사용했다.
- [ ] optional disk에는 `nofail` 또는 automount를 검토했다.
- [ ] `findmnt --verify`가 통과했다.
- [ ] `mount -a` 후 `findmnt`와 `df -h`로 확인했다.
- [ ] 재부팅 후에도 mount 상태가 유지된다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

영구 마운트는 `UUID -> mount point -> fstab -> mount -a -> reboot verify` 순서로 검증한다. `/etc/fstab`은 부팅 경로에 직접 영향을 주므로 백업과 `findmnt --verify` 없이 수정 완료로 보지 않는다.
