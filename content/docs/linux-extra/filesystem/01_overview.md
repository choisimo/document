# Linux 파일시스템 개요

이 문서는 Linux 파일시스템을 “루트 트리, mount, 가상 파일시스템, inode, 권한” 관점에서 요약한다. 목표는 각 디렉터리 이름을 외우는 것이 아니라 어떤 경로가 어떤 종류의 상태를 나타내는지 구분하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Linux에서는 일반 파일, 디렉터리, 장치, process 정보, kernel 설정이 모두 하나의 path tree 안에 나타난다. `/etc`, `/var`, `/proc`, `/sys`, `/dev`를 같은 종류의 저장 공간으로 이해하면 백업, 수정, 삭제 기준을 잘못 잡게 된다.

파일시스템 개요는 실제 디스크에 저장되는 영역과 kernel이 노출하는 가상 영역을 분리해서 보는 출발점이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 “Everything is a file”, FHS, 주요 디렉터리, superblock, inode, data block, file type, link, permission을 간단히 소개한다.

보완해야 할 점은 다음과 같다.

- 실제 저장소와 pseudo filesystem의 차이가 더 분명해야 한다.
- mount point 개념이 약하다.
- `/bin`, `/sbin`, `/lib`가 `/usr`로 통합되는 배포판 차이를 고려하지 않는다.
- 운영 관점에서 어떤 경로를 백업해야 하는지 연결이 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음을 구분하는 것이다.

- `/`에서 시작하는 단일 directory tree
- 실제 disk filesystem과 mount point
- `/proc`, `/sys`, `/dev`, `/run` 같은 runtime 또는 pseudo filesystem
- `/etc`, `/var`, `/home`처럼 백업과 변경 추적이 중요한 경로
- inode와 directory entry의 역할
- file permission과 ownership의 기본 모델

## 4. 시스템 번역 (Data Flow)

Path 해석 흐름은 다음과 같다.

```text
process opens /path/to/file
  -> VFS resolves path components
  -> mount point may switch filesystem
  -> directory entry maps name to inode
  -> inode points to metadata and data blocks
  -> file object is attached to process fd table
```

사용자는 하나의 tree를 보지만 내부에서는 mount 지점마다 다른 filesystem 구현이 연결될 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

Root directory `/`는 전체 path tree의 시작점이다.

FHS는 배포판 간 directory 역할을 맞추기 위한 관례다. 실제 배포판은 `/usr` merge 같은 차이를 가질 수 있다.

Mount point는 다른 filesystem을 directory tree의 특정 지점에 붙이는 위치다.

Superblock은 filesystem 전체 metadata를 담는다.

Inode는 파일 metadata와 data block 위치를 담는다. 파일 이름은 directory entry에 있다.

Directory entry는 이름과 inode 번호의 매핑이다.

Pseudo filesystem은 disk에 저장되는 파일이 아니라 kernel 상태를 file interface로 노출한다.

Permission은 user, group, other에 대한 read, write, execute bit로 표현된다.

## 6. 상태 전이 (State Transition)

부팅 후 파일시스템 상태는 다음처럼 구성된다.

```text
kernel boots
  -> root filesystem mounted
  -> systemd mounts fstab entries
  -> devtmpfs, procfs, sysfs, tmpfs mounted
  -> services write runtime data
```

파일 생성은 다음 상태로 진행한다.

```text
parent directory writable
  -> directory entry created
  -> inode allocated
  -> data blocks allocated on write
  -> metadata updated
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `/proc`와 `/sys`는 일반 데이터 백업 대상이 아니다.
- `/run`은 runtime tmpfs이며 재부팅 후 사라질 수 있다.
- `/etc`는 system configuration이므로 변경 전 백업하거나 version control로 관리한다.
- `/var`는 log, cache, spool, database처럼 계속 변하는 데이터를 담는다.
- Mount point 아래 파일을 수정하기 전 실제 backing filesystem을 확인한다.
- Directory execute bit 없이는 path traversal이 불가능하다.
- Symlink target과 mount boundary를 확인하지 않고 recursive 명령을 실행하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Mount tree를 확인한다.

```bash
findmnt
findmnt /
findmnt /proc
findmnt /sys
findmnt /run
```

Filesystem type과 UUID를 확인한다.

```bash
lsblk -f
blkid
df -Th
```

주요 directory의 성격을 확인한다.

```bash
stat /
stat /etc
stat /proc
stat /sys
stat /run
```

Path가 어떤 권한 경로를 통과하는지 본다.

```bash
namei -l /etc/ssh/sshd_config
```

Inode와 link를 확인한다.

```bash
echo data > a.txt
ln a.txt b.txt
ln -s a.txt c.txt
ls -li a.txt b.txt c.txt
stat a.txt b.txt c.txt
```

## 9. 실패 사례 (What could go wrong?)

`/tmp`나 `/run`에 중요한 데이터를 두면 재부팅이나 tmpfiles 정책으로 사라질 수 있다.

`/proc` 파일을 일반 파일처럼 백업하거나 복사하면 의미 없는 snapshot을 만들 수 있다.

Mount point 위에 파일을 만들어 둔 뒤 나중에 다른 filesystem을 mount하면 기존 파일이 가려진 것처럼 보인다. 삭제된 것이 아니라 아래에 숨은 상태일 수 있다.

`du`와 `df`가 다르면 mount boundary, sparse file, deleted open file, reserved block을 함께 확인해야 한다.

Symlink를 따라 recursive copy나 delete를 하면 의도한 tree 밖으로 나갈 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

Linux VFS는 ext4, XFS, Btrfs, tmpfs, procfs, sysfs를 공통 interface로 묶는다. 사용자 프로그램은 대부분 `open`, `read`, `write`, `stat` system call로 접근한다.

Container는 mount namespace를 사용해 process마다 다른 filesystem view를 제공할 수 있다. 같은 `/`라도 host와 container가 보는 내용은 다를 수 있다.

자세한 내부 구조는 kernel VFS 문서와 ext4 문서를 함께 보면 좋다.

- Linux VFS overview: <https://docs.kernel.org/filesystems/vfs.html>
- Filesystems in the Linux kernel: <https://docs.kernel.org/filesystems/index.html>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 실제 filesystem과 pseudo filesystem을 구분한다.
- [ ] mount point가 path 해석을 바꾼다는 점을 이해한다.
- [ ] `/etc`, `/var`, `/home`, `/run`, `/proc`, `/sys`의 역할을 구분한다.
- [ ] inode와 directory entry의 차이를 설명할 수 있다.
- [ ] permission과 ownership의 기본 구조를 확인했다.
- [ ] recursive 작업 전 symlink와 mount boundary를 확인한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux 파일시스템은 하나의 `/` tree처럼 보이지만 실제로는 여러 mount와 pseudo filesystem이 VFS 아래 연결된 구조다. 경로를 바꾸기 전 그 경로가 무엇을 나타내는지 먼저 확인해야 한다.
