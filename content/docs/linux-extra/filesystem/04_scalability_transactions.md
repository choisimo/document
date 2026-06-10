# 파일시스템 확장성과 트랜잭션

이 문서는 Linux 파일시스템을 서비스 규모, write pattern, crash consistency 관점에서 선택하고 튜닝하는 기준을 정리한다. 목표는 mount option을 외우는 것이 아니라 데이터 안전성과 성능 사이의 trade-off를 명시적으로 판단하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

파일시스템 성능 문제는 단순히 “더 빠른 디스크”만으로 해결되지 않는다. 작은 파일을 많이 쓰는 workload, 큰 파일을 순차 기록하는 workload, database처럼 `fsync`가 많은 workload는 병목 지점이 다르다.

잘못된 튜닝은 성능을 올리는 대신 crash 후 데이터 손실 범위를 키울 수 있다. 특히 journal, write cache, barrier, commit interval은 운영 위험과 직접 연결된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 ext4 journaling mode, Ext4와 XFS 선택, `noatime`, `barrier=0`, `commit=N`을 설명한다. 보완해야 할 점은 다음과 같다.

- `barrier=0`이 일반 성능 팁처럼 읽힐 위험이 있다.
- Database workload는 filesystem보다 application fsync와 storage cache 정책이 더 중요할 수 있다.
- Ext4와 XFS 선택 기준을 운영 검증 항목과 연결해야 한다.
- 튜닝 전 측정과 rollback 기준이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음을 판단하는 것이다.

- Workload가 small-file, large-file, append-log, database, cache 중 어디에 가까운가?
- Crash consistency가 어느 수준까지 필요한가?
- Ext4 기본값으로 충분한가, XFS가 더 적합한가?
- atime update를 줄여도 application 문제가 없는가?
- write cache와 flush/barrier를 끄지 않아도 되는가?
- 변경 전후 성능과 장애 리스크를 측정했는가?

## 4. 시스템 번역 (Data Flow)

쓰기 흐름은 다음과 같다.

```text
application write
  -> page cache
  -> filesystem journal or metadata update
  -> block layer scheduler
  -> device cache
  -> durable media
```

`fsync` 또는 barrier는 이 흐름에서 “어디까지 durable하다고 볼 것인가”를 강제하는 지점이다. 성능과 안전성은 여기서 충돌한다.

## 5. 핵심 구성요소 (Building Blocks)

Journaling은 metadata update를 crash 후 복구 가능하게 만드는 메커니즘이다. 데이터 자체까지 항상 journal에 들어간다는 뜻은 아니다.

Ext4는 범용성과 관리 편의성이 좋고 많은 서버에서 기본 선택지다.

XFS는 큰 파일, 병렬 I/O, 큰 filesystem에서 강점이 있다. 단, shrink를 지원하지 않는다는 운영 제약이 중요하다.

`relatime`은 현대 Linux의 일반적인 atime 절충안이다. `noatime`은 read-heavy workload에서 write를 더 줄일 수 있지만 atime에 의존하는 application은 깨질 수 있다.

`commit=N`은 metadata commit 주기에 영향을 준다. 값을 늘리면 write 빈도를 줄일 수 있지만 crash 시 손실 창이 커질 수 있다.

Write barrier와 flush는 device cache의 순서와 내구성을 보장하는 데 중요하다. 임의로 끄면 전원 장애 시 filesystem consistency가 깨질 수 있다.

## 6. 상태 전이 (State Transition)

튜닝 전 상태 전이는 다음과 같다.

```text
workload identified
  -> baseline measured
  -> risk accepted
  -> one option changed
  -> benchmark repeated
  -> failure mode reviewed
```

Crash consistency 관점의 상태는 다음과 같다.

```text
write acknowledged by application
  -> data in page cache
  -> data submitted to block layer
  -> device cache flushed
  -> data durable on media
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 성능 튜닝 전 baseline metric을 기록한다.
- Mount option은 한 번에 하나씩 바꾸고 rollback 방법을 둔다.
- `barrier=0` 또는 flush 비활성화는 일반 서버 기본값이 아니다.
- Database는 filesystem mount option보다 database fsync, WAL, checkpoint 설정과 함께 봐야 한다.
- XFS는 shrink가 불가능하므로 초기 sizing과 migration 계획이 필요하다.
- `noatime` 적용 전 atime 의존 application이 없는지 확인한다.
- Filesystem 튜닝은 backup과 restore test를 대체하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 filesystem type과 mount option을 확인한다.

```bash
findmnt -no SOURCE,FSTYPE,OPTIONS /
findmnt -no SOURCE,FSTYPE,OPTIONS /var/lib
df -hT
```

I/O baseline을 수집한다.

```bash
iostat -xz 1
pidstat -d 1
vmstat 1
```

디렉터리별 사용량과 inode 상태를 확인한다.

```bash
df -h
df -i
du -xh --max-depth=1 /var | sort -hr
```

fstab 변경 전 백업한다.

```bash
sudo cp /etc/fstab /etc/fstab.bak
sudoedit /etc/fstab
sudo findmnt --verify
sudo mount -o remount /mountpoint
```

`relatime`에서 `noatime`으로 바꾸는 예시는 다음과 같다.

```fstab
UUID=11111111-2222-3333-4444-555555555555 /data xfs defaults,noatime 0 2
```

Ext4 commit interval을 조정하는 예시는 다음과 같다. 데이터 손실 허용 범위를 먼저 정해야 한다.

```fstab
UUID=11111111-2222-3333-4444-555555555555 /cache ext4 defaults,noatime,commit=30 0 2
```

변경 후 다시 측정한다.

```bash
findmnt -no SOURCE,FSTYPE,OPTIONS /data
iostat -xz 1
journalctl -p warning -b
```

## 9. 실패 사례 (What could go wrong?)

`barrier=0`을 켰다가 전원 장애가 발생하면 storage가 쓰기 순서를 보장하지 못해 filesystem이나 application data가 손상될 수 있다.

`commit=60`처럼 값을 크게 늘리면 crash 시 최근 변경이 더 많이 사라질 수 있다.

`noatime`은 일반적으로 안전한 편이지만 mail, backup, 일부 legacy application이 access time에 의존할 수 있다.

XFS를 선택한 뒤 filesystem shrink가 필요해지면 직접 줄일 수 없다. 새 filesystem을 만들고 data migration을 해야 한다.

Filesystem benchmark만 좋아졌는데 application latency가 악화될 수 있다. 특히 database는 p99 latency와 fsync latency를 봐야 한다.

Write-heavy workload에서 inode 또는 directory 구조가 병목인데 block throughput만 보면 원인을 놓친다.

## 10. 뇌 확장하기 (Evolution & Variants)

Ext4와 XFS 선택은 절대 우열보다 workload와 운영 제약의 문제다. 작은 서버, 일반 workload, 익숙한 복구 도구가 중요하면 Ext4가 무난하다. 큰 filesystem, 병렬 I/O, enterprise workload는 XFS가 적합할 수 있다.

Database는 filesystem보다 storage stack 전체가 중요하다. Application WAL, fsync policy, RAID controller cache, cloud block volume guarantee, backup snapshot consistency를 함께 봐야 한다.

Btrfs와 ZFS는 snapshot, checksum, compression, send/receive 같은 기능을 제공하지만 운영 모델이 달라진다. 단순 mount option 튜닝이 아니라 데이터 관리 전략으로 봐야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Workload write pattern을 분류했다.
- [ ] 현재 filesystem type과 mount option을 확인했다.
- [ ] 성능 baseline과 p95 또는 p99 latency를 기록했다.
- [ ] atime, commit, barrier 변경의 데이터 손실 위험을 이해했다.
- [ ] Mount option은 한 번에 하나만 바꿨다.
- [ ] 변경 후 동일 조건으로 다시 측정했다.
- [ ] Backup과 restore test가 준비되어 있다.
- [ ] XFS shrink 불가 같은 운영 제약을 기록했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

파일시스템 튜닝은 성능 옵션을 켜는 일이 아니라 crash consistency와 latency의 교환 조건을 정하는 일이다. 기본값을 바꾸기 전 workload, baseline, rollback, 데이터 손실 허용 범위를 먼저 정해야 한다.
