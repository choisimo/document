# Linux 커널 심층 학습

이 문서는 Linux 커널을 user space와 kernel space, system call, VFS, loadable module, character device, netfilter 관점에서 학습하기 위한 안내서다. 목표는 커널 내부 코드를 길게 암기하는 것이 아니라 사용자 명령이 어떤 커널 경로로 내려가는지 추적하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Linux 장애와 성능 문제는 사용자 공간 로그만으로 설명되지 않을 때가 있다. 파일 open 지연, network packet drop, module load 실패, permission denial은 kernel subsystem과 연결된다.

커널을 모르면 문제를 “앱이 느림”, “디스크가 이상함”, “네트워크가 안 됨”처럼 뭉뚱그리게 된다. 반대로 커널 경로를 알면 `strace`, `dmesg`, `/proc`, `/sys`, `perf`, `bpftool`, `nft` 같은 도구를 어떤 순서로 써야 하는지 보인다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 user/kernel space, syscall entry, context switch, `open()` 내부, Docker namespace, module lifecycle, character driver, netfilter와 `sk_buff`를 매우 긴 설명과 코드로 다룬다.

보완해야 할 점은 다음과 같다.

- 특정 아키텍처와 kernel version 세부 구현을 일반 원리처럼 단정한다.
- 예시 코드가 너무 길어 문서 목적보다 구현 세부가 앞선다.
- 관찰 명령과 kernel 내부 개념의 연결이 약하다.
- kernel module 실습의 위험성이 충분히 강조되지 않았다.
- 학습 순서와 검증 기준이 분명하지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 흐름을 설명하고 관찰할 수 있는 상태다.

- User mode와 kernel mode의 권한 차이
- System call이 kernel entry로 들어가는 이유
- Process, thread, scheduler, context switch의 역할
- Virtual memory와 page fault의 기본 흐름
- VFS가 path를 dentry, inode, file object로 해석하는 과정
- Loadable kernel module의 load, use, unload lifecycle
- Character device가 `/dev` node와 file operations로 연결되는 방식
- Netfilter hook과 packet path의 기본 구조

## 4. 시스템 번역 (Data Flow)

파일 read의 단순화된 흐름은 다음과 같다.

```text
user process
  -> libc wrapper
  -> syscall instruction
  -> kernel syscall handler
  -> VFS path lookup
  -> filesystem driver
  -> page cache or block layer
  -> data copied back to user buffer
```

Network packet 처리 흐름은 다음과 같다.

```text
NIC receives frame
  -> driver allocates packet buffer
  -> kernel network stack
  -> netfilter hooks
  -> routing decision
  -> socket receive queue or forward path
  -> user process reads socket
```

Module load 흐름은 다음과 같다.

```text
modprobe
  -> dependency resolution
  -> kernel verifies and loads module
  -> init function registers subsystem hooks
  -> module may be used by devices or protocols
  -> unload calls exit function if no users remain
```

## 5. 핵심 구성요소 (Building Blocks)

User space는 일반 application이 실행되는 권한 제한 영역이다. Kernel memory와 privileged instruction에 직접 접근할 수 없다.

Kernel space는 scheduler, memory manager, VFS, network stack, device driver가 실행되는 영역이다. 버그가 system 전체 장애로 이어질 수 있다.

System call은 user process가 kernel service를 요청하는 공식 entry다. `openat`, `read`, `write`, `ioctl`, `socket` 등이 대표적이다.

VFS는 다양한 filesystem을 공통 interface로 묶는다. Dentry는 이름 lookup cache, inode는 filesystem object metadata, file object는 열린 파일 상태를 나타낸다.

Page cache는 file I/O와 memory 사이의 핵심 cache다. 같은 파일 read가 매번 disk I/O를 일으키지 않는 이유다.

Loadable kernel module은 runtime에 kernel 기능을 추가한다. Driver, filesystem, netfilter extension 등이 module로 제공될 수 있다.

Character device는 byte stream 중심 device interface다. `/dev/tty`, `/dev/null`, custom driver가 file operations를 통해 user space와 연결된다.

Netfilter는 packet path에 hook을 걸어 filtering, NAT, mangling을 수행하는 framework다. nftables와 iptables는 이 계층 위에서 정책을 구성한다.

## 6. 상태 전이 (State Transition)

System call 상태 전이는 다음과 같다.

```text
user mode running
  -> syscall entry
  -> kernel validates arguments
  -> subsystem handles request
  -> return value or errno prepared
  -> user mode resumes
```

VFS open 상태 전이는 다음과 같다.

```text
path string
  -> parent dentries resolved
  -> inode found
  -> permission checked
  -> file object allocated
  -> fd installed in process table
```

Module 상태 전이는 다음과 같다.

```text
module file on disk
  -> loaded
  -> initialized
  -> referenced
  -> reference count drops
  -> unloaded
```

Packet 상태 전이는 다음과 같다.

```text
driver receive
  -> prerouting hook
  -> routing
  -> input or forward hook
  -> socket delivery or output
  -> postrouting hook
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 커널 모듈 실습은 production host가 아니라 VM에서 한다.
- Kernel version과 header version이 맞지 않으면 module build와 load가 실패할 수 있다.
- Out-of-tree module은 kernel ABI 안정성을 기대하면 안 된다.
- `dmesg`에 taint가 생기면 이후 kernel bug 분석에 영향을 준다.
- `insmod`보다 dependency를 처리하는 `modprobe`를 우선한다.
- `ioctl`은 type-safe하지 않으므로 userspace ABI 설계에 특히 주의한다.
- Netfilter rule 변경 전 현재 ruleset을 백업한다.
- Kernel tracing은 overhead와 보안 영향을 이해한 뒤 사용한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 kernel과 module 상태를 확인한다.

```bash
uname -a
cat /proc/version
lsmod
sudo dmesg -T | tail -n 80
```

특정 module 정보를 본다.

```bash
modinfo ext4
modinfo nf_tables
```

System call을 관찰한다.

```bash
strace -f -e trace=openat,newfstatat,read,write,close cat /etc/hostname
```

VFS와 filesystem 상태를 확인한다.

```bash
cat /proc/filesystems
findmnt /
ls -l /proc/$$/fd
stat /etc/hostname
```

Page fault와 memory map을 관찰한다.

```bash
cat /proc/$$/maps | head
cat /proc/meminfo | head
vmstat 1
```

Module load와 unload를 안전한 내장 module로 실습한다. 없는 module이면 실행하지 않는다.

```bash
modinfo dummy
sudo modprobe dummy
lsmod | rg '^dummy'
sudo modprobe -r dummy
```

Network와 netfilter 상태를 확인한다.

```bash
sudo nft list ruleset
ss -tulpen
ip route
```

Packet drop이나 firewall 문제를 볼 때는 ruleset을 저장한다.

```bash
sudo nft list ruleset > nft-ruleset.backup
```

Character device 예시는 기존 장치로 관찰한다.

```bash
ls -l /dev/null /dev/zero /dev/random /dev/tty
stat /dev/null
```

## 9. 실패 사례 (What could go wrong?)

Kernel module을 production host에서 실험하다가 null pointer dereference나 memory corruption을 만들면 host 전체가 panic 또는 hang 될 수 있다.

Kernel header가 running kernel과 다르면 module이 build되어도 load되지 않을 수 있다.

`insmod`로 dependency를 무시하고 module을 넣으면 symbol resolution 실패가 발생할 수 있다.

System call trace만 보고 disk I/O가 발생했다고 단정하면 안 된다. Page cache hit이면 kernel 내부에서 disk까지 내려가지 않을 수 있다.

Netfilter NAT rule을 잘못 바꾸면 SSH 세션이 끊기거나 container network가 멈출 수 있다.

`ioctl` ABI를 부주의하게 설계하면 32-bit compatibility, structure padding, endianness, versioning 문제가 생긴다.

## 10. 뇌 확장하기 (Evolution & Variants)

커널 학습은 코드 읽기와 관찰을 같이 해야 한다. `strace`는 syscall 경계를 보여주고, `perf`는 CPU sample을 보여주며, ftrace와 eBPF는 kernel 내부 event를 볼 수 있게 한다.

VFS를 배울 때는 `openat` 하나만 추적해도 dentry, inode, file object, permission, mount namespace가 연결된다.

Container를 배울 때는 VM처럼 별도 kernel이 있는 것이 아니라 namespace와 cgroup으로 같은 kernel을 나눠 쓰는 구조임을 기억해야 한다.

공식 문서는 kernel version에 따라 갱신되므로 현재 running kernel과 문서 version을 함께 확인한다.

- Linux VFS overview: <https://docs.kernel.org/filesystems/vfs.html>
- Linux userspace API guide: <https://docs.kernel.org/userspace-api/index.html>
- Linux filesystems documentation: <https://docs.kernel.org/filesystems/index.html>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] User space와 kernel space의 권한 차이를 설명할 수 있다.
- [ ] System call trace를 `strace`로 관찰했다.
- [ ] VFS의 dentry, inode, file object 역할을 구분한다.
- [ ] Module load와 unload lifecycle을 이해한다.
- [ ] Kernel module 실습은 VM에서만 수행한다.
- [ ] Netfilter ruleset을 변경 전 백업한다.
- [ ] Page cache 때문에 syscall과 disk I/O가 1:1이 아님을 이해한다.
- [ ] 공식 kernel 문서를 running kernel version과 함께 확인한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux 커널 학습의 핵심은 사용자 명령이 syscall을 통해 VFS, memory manager, scheduler, driver, network stack으로 내려가는 경로를 추적하는 것이다. 커널 실험은 강력하지만 host 전체를 망가뜨릴 수 있으므로 VM과 관찰 도구부터 사용한다.
