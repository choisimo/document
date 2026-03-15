# Module 4: Compute Virtualization - KVM & LXC Deep Dive

## 학습 목표
이 모듈을 완료하면 다음을 이해할 수 있습니다:
- QEMU/KVM 가상화의 커널 레벨 동작 원리
- VM이 Linux 프로세스로서 어떻게 실행되는지
- LXC 컨테이너의 namespace와 cgroup 격리 메커니즘
- qm/pct 명령어의 내부 동작 흐름

---

## 1. QEMU/KVM 아키텍처 개요

### 1.1 왜 QEMU와 KVM인가?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        가상화 기술의 진화                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Full Emulation]        [Paravirtualization]       [Hardware-Assisted]  │
│       QEMU                    Xen PV                   KVM + QEMU        │
│         │                       │                          │             │
│    모든 하드웨어를            Guest가 Hypervisor를      CPU가 직접         │
│    소프트웨어로 에뮬레이션     인식하고 협력              가상화 지원        │
│         │                       │                          │             │
│      [느림]                  [빠름, 수정 필요]          [빠름, 무수정]      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**핵심 개념:**
- **QEMU (Quick Emulator)**: 하드웨어를 에뮬레이션하는 사용자 공간 프로그램
- **KVM (Kernel-based Virtual Machine)**: Linux 커널 모듈로, CPU의 하드웨어 가상화 확장(Intel VT-x, AMD-V)을 활용

```
┌────────────────────────────────────────────────────────────────────┐
│                    Proxmox VE 가상화 스택                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │   VM 100    │  │   VM 101    │  │   VM 102    │   Guest Layer  │
│   │  (Windows)  │  │  (Ubuntu)   │  │  (CentOS)   │                │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│          │                │                │                        │
│   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                │
│   │ QEMU Process│  │ QEMU Process│  │ QEMU Process│  User Space    │
│   │  (kvm pid)  │  │  (kvm pid)  │  │  (kvm pid)  │                │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│          │                │                │                        │
│   ───────┴────────────────┴────────────────┴───────────────────    │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │  /dev/kvm   │  KVM Interface                   │
│                    └──────┬──────┘                                  │
│                           │                                         │
│   ────────────────────────┴────────────────────────────────────    │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │  KVM Module │  Kernel Space                    │
│                    │  (kvm.ko)   │                                  │
│                    └──────┬──────┘                                  │
│                           │                                         │
│   ────────────────────────┴────────────────────────────────────    │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │ Intel VT-x  │  Hardware                        │
│                    │  AMD-V      │                                  │
│                    └─────────────┘                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 VM은 Linux 프로세스다

Proxmox VE에서 각 VM은 **하나의 QEMU 프로세스**로 실행됩니다. 이것이 의미하는 바:

```bash
# VM 100이 실행 중일 때 프로세스 확인
$ ps aux | grep "kvm.*100"
root  12345  45.2  8.3 4521896 1376520 ?  Sl  10:30  125:32 /usr/bin/kvm \
    -id 100 \
    -name webserver,debug-threads=on \
    -no-shutdown \
    -chardev socket,id=qmp,path=/var/run/qemu-server/100.qmp,server=on,wait=off \
    -mon chardev=qmp,mode=control \
    -rtc base=utc \
    -smp 4,sockets=1,cores=4,maxcpus=4 \
    -m 8192 \
    ...
```

**프로세스 분석:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                         QEMU 프로세스 구조                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│    Main QEMU Process (PID: 12345)                                        │
│    ├── Main Thread (Event Loop, QMP)                                     │
│    ├── vCPU Thread 0 (Guest CPU 0 실행)                                  │
│    ├── vCPU Thread 1 (Guest CPU 1 실행)                                  │
│    ├── vCPU Thread 2 (Guest CPU 2 실행)                                  │
│    ├── vCPU Thread 3 (Guest CPU 3 실행)                                  │
│    ├── IO Thread (VirtIO 디스크 처리)                                    │
│    ├── Worker Thread (비동기 작업)                                       │
│    └── VNC/SPICE Thread (디스플레이)                                     │
│                                                                           │
│    Memory: Guest RAM이 QEMU 프로세스의 가상 메모리로 매핑됨               │
│    Files: /var/run/qemu-server/100.qmp (QMP 소켓)                        │
│           /var/run/qemu-server/100.pid (PID 파일)                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.3 /proc 파일시스템을 통한 VM 분석

```bash
# VM 프로세스의 상세 정보 확인
$ VM_PID=$(cat /var/run/qemu-server/100.pid)
$ echo "VM 100 PID: $VM_PID"

# 메모리 사용량 확인
$ cat /proc/$VM_PID/status | grep -E "^(VmRSS|VmSize|Threads)"
VmSize:  4521896 kB    # 가상 메모리 크기 (Guest RAM + QEMU 오버헤드)
VmRSS:   1376520 kB    # 실제 사용 중인 물리 메모리
Threads: 9             # 총 스레드 수 (vCPU + IO + 기타)

# 열린 파일 디스크립터 확인
$ ls -la /proc/$VM_PID/fd/
lrwx------ 1 root root 64 Jan 10 10:30 0 -> /dev/null
lrwx------ 1 root root 64 Jan 10 10:30 3 -> /dev/kvm                    # KVM 디바이스
lrwx------ 1 root root 64 Jan 10 10:30 7 -> /dev/vfio/vfio              # VFIO (PCIe passthrough)
lrwx------ 1 root root 64 Jan 10 10:30 10 -> /var/lib/vz/images/100/vm-100-disk-0.qcow2
lrwx------ 1 root root 64 Jan 10 10:30 15 -> socket:[12345]             # QMP 소켓

# vCPU가 어떤 물리 CPU에서 실행 중인지 확인
$ cat /proc/$VM_PID/task/*/stat | awk '{print "Thread "$1": CPU "$39}'
Thread 12346: CPU 2
Thread 12347: CPU 5
Thread 12348: CPU 3
Thread 12349: CPU 7
```

---

## 2. QEMU/KVM 실행 흐름

### 2.1 qm start 명령의 내부 동작

```bash
$ qm start 100
```

이 단순한 명령 뒤에서 일어나는 일:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        qm start 100 실행 흐름                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] CLI Layer                                                               │
│      │                                                                       │
│      ▼                                                                       │
│  ┌─────────────────────────────────────────┐                                │
│  │ /usr/sbin/qm start 100                  │                                │
│  │ - Perl 스크립트                          │                                │
│  │ - PVE::QemuServer 모듈 로드              │                                │
│  └─────────────────┬───────────────────────┘                                │
│                    │                                                         │
│  [2] API Layer     ▼                                                         │
│  ┌─────────────────────────────────────────┐                                │
│  │ pvedaemon (REST API)                    │                                │
│  │ - 인증/권한 확인                         │                                │
│  │ - Task 생성 (UPID 발급)                 │                                │
│  └─────────────────┬───────────────────────┘                                │
│                    │                                                         │
│  [3] Config Layer  ▼                                                         │
│  ┌─────────────────────────────────────────┐                                │
│  │ /etc/pve/qemu-server/100.conf 읽기      │                                │
│  │ - 메모리: 8192MB                        │                                │
│  │ - CPU: 4 cores                          │                                │
│  │ - 디스크: local-lvm:vm-100-disk-0       │                                │
│  │ - 네트워크: vmbr0                       │                                │
│  └─────────────────┬───────────────────────┘                                │
│                    │                                                         │
│  [4] QEMU Command  ▼                                                         │
│  Generation                                                                  │
│  ┌─────────────────────────────────────────┐                                │
│  │ PVE::QemuServer::vm_start()             │                                │
│  │ - 설정을 QEMU 명령줄 인자로 변환         │                                │
│  │ - 스토리지 볼륨 활성화                   │                                │
│  │ - 네트워크 TAP 디바이스 생성             │                                │
│  └─────────────────┬───────────────────────┘                                │
│                    │                                                         │
│  [5] Process Fork  ▼                                                         │
│  ┌─────────────────────────────────────────┐                                │
│  │ fork() + exec("/usr/bin/kvm", args...)  │                                │
│  │ - QEMU 프로세스 시작                    │                                │
│  │ - /dev/kvm 열기                         │                                │
│  │ - VM 메모리 할당                        │                                │
│  │ - vCPU 생성                             │                                │
│  └─────────────────┬───────────────────────┘                                │
│                    │                                                         │
│  [6] Guest Boot    ▼                                                         │
│  ┌─────────────────────────────────────────┐                                │
│  │ SeaBIOS/OVMF → Bootloader → OS Kernel   │                                │
│  │ - BIOS POST                             │                                │
│  │ - 부팅 디바이스 탐색                    │                                │
│  │ - Guest OS 로드                         │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 실제 QEMU 명령줄 분석

```bash
# 실행 중인 VM의 전체 명령줄 확인
$ cat /proc/$(cat /var/run/qemu-server/100.pid)/cmdline | tr '\0' '\n'
```

**주요 옵션 설명:**
```
/usr/bin/kvm
-id 100                                    # VM ID
-name webserver,debug-threads=on           # VM 이름
-no-shutdown                               # shutdown 시 프로세스 종료 방지

# QMP (QEMU Machine Protocol) - 관리 인터페이스
-chardev socket,id=qmp,path=/var/run/qemu-server/100.qmp,server=on,wait=off
-mon chardev=qmp,mode=control

# CPU 설정
-smp 4,sockets=1,cores=4,maxcpus=4        # 4코어, 1소켓
-cpu kvm64,enforce,+kvm_pv_unhalt,...     # CPU 타입 및 기능

# 메모리 설정
-m 8192                                    # 8GB RAM
-object memory-backend-ram,id=ram-node0,size=8192M
-numa node,nodeid=0,cpus=0-3,memdev=ram-node0

# 스토리지
-drive file=/dev/pve/vm-100-disk-0,if=none,id=drive-scsi0,format=raw,cache=none,aio=io_uring
-device scsi-hd,bus=scsihw0.0,drive=drive-scsi0,id=scsi0

# 네트워크
-netdev type=tap,id=net0,ifname=tap100i0,script=/var/lib/qemu-server/pve-bridge
-device virtio-net-pci,netdev=net0,mac=BC:24:11:12:34:56,id=net0

# 디스플레이
-vga qxl
-spice port=5901,addr=127.0.0.1
```

### 2.3 VirtIO - 준가상화 디바이스

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Emulated vs VirtIO 성능 비교                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Emulated IDE Controller]                    [VirtIO Block]                │
│                                                                              │
│  Guest OS                                     Guest OS                       │
│     │                                            │                           │
│     ▼                                            ▼                           │
│  IDE Driver (Guest)                           VirtIO Driver (Guest)         │
│     │                                            │                           │
│     ▼                                            ▼                           │
│  ┌──────────────┐                             ┌──────────────┐              │
│  │ IDE 레지스터  │ ◄── 하드웨어 에뮬레이션     │ VirtIO Ring  │ ◄── 공유 메모리│
│  │ 에뮬레이션    │     (느린 trap/emulate)     │ (vring)      │    (빠른 직접통신)│
│  └──────┬───────┘                             └──────┬───────┘              │
│         │                                            │                       │
│         ▼                                            ▼                       │
│  QEMU IDE Emulation                           QEMU VirtIO Backend           │
│     │                                            │                           │
│     ▼                                            ▼                           │
│  Host Storage                                  Host Storage                  │
│                                                                              │
│  성능: ~50MB/s                                 성능: ~500MB/s+               │
│  CPU 오버헤드: 높음                            CPU 오버헤드: 낮음             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**VirtIO 디바이스 종류:**
| 디바이스 | 설명 | Guest 드라이버 |
|---------|------|---------------|
| virtio-blk | 블록 디바이스 | virtio_blk |
| virtio-scsi | SCSI 컨트롤러 | virtio_scsi |
| virtio-net | 네트워크 카드 | virtio_net |
| virtio-balloon | 메모리 밸루닝 | virtio_balloon |
| virtio-serial | 시리얼 포트 | virtio_console |

---

## 3. qm 명령어 상세 가이드

### 3.1 VM 생성 및 설정

```bash
# VM 생성 (기본)
$ qm create 100 \
    --name webserver \
    --memory 4096 \
    --cores 2 \
    --net0 virtio,bridge=vmbr0 \
    --scsi0 local-lvm:32 \
    --cdrom local:iso/ubuntu-22.04.iso

# 설정 확인
$ qm config 100
boot: order=scsi0;ide2;net0
cores: 2
ide2: local:iso/ubuntu-22.04.iso,media=cdrom
memory: 4096
name: webserver
net0: virtio=BC:24:11:AA:BB:CC,bridge=vmbr0
scsi0: local-lvm:vm-100-disk-0,size=32G
scsihw: virtio-scsi-single
smbios1: uuid=12345678-1234-1234-1234-123456789abc
vmgenid: 87654321-4321-4321-4321-cba987654321

# 특정 설정 변경
$ qm set 100 --memory 8192 --cores 4
```

### 3.2 VM 라이프사이클 관리

```bash
# VM 시작
$ qm start 100
# 내부 동작: config 읽기 → QEMU 명령 생성 → 프로세스 fork

# VM 상태 확인
$ qm status 100
status: running
# 또는 상세 정보
$ qm status 100 --verbose
status: running
ha: managed
name: webserver
pid: 12345
qmpstatus: running
running-machine: pc-i440fx-8.1+pve0
running-qemu: 8.1.5
uptime: 86400

# VM 종료 (graceful - ACPI 신호)
$ qm shutdown 100
# Guest OS가 ACPI 전원 버튼 이벤트를 받아 정상 종료

# VM 강제 종료 (immediate)
$ qm stop 100
# QEMU 프로세스에 SIGTERM → 즉시 종료

# VM 리부팅
$ qm reboot 100

# VM 일시 정지 (suspend to RAM)
$ qm suspend 100
# vCPU 중지, 메모리 상태 유지

# VM 재개
$ qm resume 100
```

### 3.3 QMP (QEMU Machine Protocol) 인터페이스

```bash
# QMP 직접 접속 (고급 사용자용)
$ qm monitor 100
Entering QEMU Monitor for VM 100 - type 'help' for help
qm> info status
VM status: running
qm> info cpus
* CPU #0: thread_id=12346
* CPU #1: thread_id=12347
* CPU #2: thread_id=12348
* CPU #3: thread_id=12349
qm> info block
drive-scsi0 (#block256): /dev/pve/vm-100-disk-0 (raw)
    Attached to:      scsi0-0-0-0
    Cache mode:       writeback, direct
qm> info network
net0: index=0,type=tap,ifname=tap100i0,script=/var/lib/qemu-server/pve-bridge
qm> quit
```

### 3.4 QEMU Guest Agent

```bash
# Guest Agent 상태 확인
$ qm agent 100 ping
{"return": {}}  # 성공

# Guest 내부 정보 조회
$ qm agent 100 get-osinfo
{
  "id": "ubuntu",
  "version": "22.04",
  "name": "Ubuntu",
  "kernel-release": "5.15.0-91-generic",
  "kernel-version": "#101-Ubuntu SMP",
  "machine": "x86_64"
}

# Guest 파일시스템 정보
$ qm agent 100 get-fsinfo
[
  {
    "name": "/dev/sda1",
    "mountpoint": "/",
    "type": "ext4",
    "total-bytes": 33285996544,
    "used-bytes": 12345678901
  }
]

# Guest에서 명령 실행
$ qm agent 100 exec -- ls -la /root
$ qm agent 100 exec -- systemctl status nginx

# 파일 시스템 freeze (백업 전 일관성 확보)
$ qm agent 100 fsfreeze-freeze
$ # 백업 수행...
$ qm agent 100 fsfreeze-thaw
```

### 3.5 VM 마이그레이션

```bash
# 온라인 마이그레이션 (실시간)
$ qm migrate 100 node2
# 단계:
# 1. 대상 노드에서 QEMU 시작 (incoming mode)
# 2. 메모리 페이지 복사 시작
# 3. Dirty page 추적 및 반복 전송
# 4. 최종 전환 (downtime 최소화)
# 5. 소스 VM 종료

# 오프라인 마이그레이션 (VM 정지 후)
$ qm migrate 100 node2 --offline

# 로컬 스토리지 포함 마이그레이션
$ qm migrate 100 node2 --with-local-disks --targetstorage local-lvm
```

---

## 4. LXC 컨테이너 아키텍처

### 4.1 컨테이너 vs VM - 근본적 차이

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VM vs Container 구조 비교                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Virtual Machine]                        [Container (LXC)]                 │
│                                                                              │
│  ┌─────────────────────┐                  ┌─────────────────────┐           │
│  │     App A           │                  │     App A           │           │
│  ├─────────────────────┤                  ├─────────────────────┤           │
│  │   Guest OS Kernel   │                  │   (호스트 커널 공유)  │           │
│  ├─────────────────────┤                  ├─────────────────────┤           │
│  │   Virtual Hardware  │                  │   Namespace 격리     │           │
│  ├─────────────────────┤                  │   - pid, net, mnt   │           │
│  │    QEMU Process     │                  │   - uts, ipc, user  │           │
│  ├─────────────────────┤                  ├─────────────────────┤           │
│  │      KVM Module     │                  │   cgroup 리소스 제한  │           │
│  └─────────┬───────────┘                  └─────────┬───────────┘           │
│            │                                        │                        │
│            ▼                                        ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    Host Linux Kernel                         │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  오버헤드: 높음 (하드웨어 에뮬레이션)      오버헤드: 매우 낮음               │
│  격리: 강함 (별도 커널)                   격리: 커널 기능에 의존              │
│  호환성: 모든 OS                          호환성: Linux만                    │
│  시작 시간: 수십 초                       시작 시간: 수 초                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Linux Namespace - "아파트와 방" 개념

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Linux Namespace 격리 개념도                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────── Host System (아파트 건물 전체) ───────────┐                  │
│   │                                                       │                  │
│   │  ┌──────────── Container 100 (101호) ────────────┐   │                  │
│   │  │  PID Namespace:   init(1), nginx(50), ...     │   │                  │
│   │  │  NET Namespace:   eth0 (10.0.0.1), lo         │   │                  │
│   │  │  MNT Namespace:   /, /home, /var              │   │                  │
│   │  │  UTS Namespace:   hostname="webserver"        │   │                  │
│   │  │  IPC Namespace:   자체 공유 메모리, 세마포어   │   │                  │
│   │  │  USER Namespace:  root(0) → 100000(host)      │   │                  │
│   │  └───────────────────────────────────────────────┘   │                  │
│   │                                                       │                  │
│   │  ┌──────────── Container 101 (102호) ────────────┐   │                  │
│   │  │  PID Namespace:   init(1), mysql(100), ...    │   │                  │
│   │  │  NET Namespace:   eth0 (10.0.0.2), lo         │   │                  │
│   │  │  MNT Namespace:   /, /home, /var/lib/mysql    │   │                  │
│   │  │  UTS Namespace:   hostname="database"         │   │                  │
│   │  │  IPC Namespace:   자체 공유 메모리, 세마포어   │   │                  │
│   │  │  USER Namespace:  root(0) → 200000(host)      │   │                  │
│   │  └───────────────────────────────────────────────┘   │                  │
│   │                                                       │                  │
│   │  Host Processes: systemd(1), pvedaemon, ...          │                  │
│   │  Host Network: vmbr0, eth0                           │                  │
│   │                                                       │                  │
│   └───────────────────────────────────────────────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**각 Namespace의 역할:**

| Namespace | 격리 대상 | 효과 |
|-----------|----------|------|
| **PID** | 프로세스 ID | 컨테이너는 자신의 PID 1(init)을 가짐, 호스트 프로세스 보이지 않음 |
| **NET** | 네트워크 스택 | 독립된 IP, 라우팅 테이블, 방화벽 규칙 |
| **MNT** | 파일시스템 마운트 | 독립된 루트 파일시스템, 마운트 포인트 |
| **UTS** | 호스트명, 도메인명 | 컨테이너별 독립된 hostname |
| **IPC** | IPC 리소스 | 독립된 공유 메모리, 메시지 큐, 세마포어 |
| **USER** | UID/GID 매핑 | 컨테이너 내 root가 호스트에서는 일반 사용자 |

### 4.3 Namespace 확인 실습

```bash
# 컨테이너 100의 init 프로세스 찾기
$ CT_PID=$(cat /var/run/lxc/100/init.pid)
$ echo "Container 100 init PID on host: $CT_PID"

# 호스트에서 본 namespace 정보
$ ls -la /proc/$CT_PID/ns/
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 cgroup -> 'cgroup:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 ipc -> 'ipc:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 mnt -> 'mnt:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 net -> 'net:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 pid -> 'pid:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 user -> 'user:[4026532xxx]'
lrwxrwxrwx 1 100000 100000 0 Jan 10 10:00 uts -> 'uts:[4026532xxx]'

# 호스트의 namespace와 비교
$ ls -la /proc/1/ns/
# 숫자가 다름 = 다른 namespace에 있음

# 컨테이너 내부의 프로세스 목록 (호스트에서)
$ cat /proc/$CT_PID/cgroup
# 컨테이너의 cgroup 경로 확인
```

### 4.4 Control Groups (cgroups) - 리소스 제한

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      cgroup v2 리소스 제어 구조                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   /sys/fs/cgroup/                                                           │
│   └── lxc/                                                                  │
│       ├── 100/                          # Container 100                     │
│       │   ├── cgroup.controllers        # 활성화된 컨트롤러 목록            │
│       │   ├── cpu.max                   # CPU 제한 (quota period)          │
│       │   ├── cpu.weight                # CPU 가중치 (상대적 우선순위)      │
│       │   ├── memory.max                # 메모리 하드 제한                  │
│       │   ├── memory.high               # 메모리 소프트 제한 (throttling)   │
│       │   ├── memory.current            # 현재 메모리 사용량                │
│       │   ├── io.max                    # 디스크 I/O 제한                   │
│       │   └── pids.max                  # 최대 프로세스 수                  │
│       │                                                                      │
│       └── 101/                          # Container 101                     │
│           └── ...                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**cgroup 실습:**
```bash
# 컨테이너의 cgroup 경로 확인
$ CT_CGROUP="/sys/fs/cgroup/lxc/100"

# 메모리 제한 및 사용량 확인
$ cat $CT_CGROUP/memory.max
4294967296  # 4GB

$ cat $CT_CGROUP/memory.current
1234567890  # 현재 ~1.2GB 사용

# CPU 가중치 확인
$ cat $CT_CGROUP/cpu.weight
100  # 기본값

# 실시간 모니터링
$ watch -n 1 "cat $CT_CGROUP/memory.current && cat $CT_CGROUP/cpu.stat"
```

### 4.5 Unprivileged vs Privileged 컨테이너

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               Unprivileged Container (권장)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Container 내부             UID/GID 매핑            Host에서 실제         │
│   ───────────────           ─────────────           ───────────────        │
│   root (UID 0)      ────►   +100000         ────►   UID 100000             │
│   www-data (UID 33) ────►   +100000         ────►   UID 100033             │
│   mysql (UID 101)   ────►   +100000         ────►   UID 100101             │
│                                                                              │
│   장점:                                                                     │
│   - 컨테이너 탈출해도 호스트에서 권한 없는 일반 사용자                       │
│   - 커널 취약점 영향 최소화                                                 │
│                                                                              │
│   단점:                                                                     │
│   - 일부 작업 제한 (raw socket, 일부 마운트)                                │
│   - NFS 마운트 시 UID 매핑 문제                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│               Privileged Container (주의 필요)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Container 내부             UID/GID 매핑            Host에서 실제         │
│   ───────────────           ─────────────           ───────────────        │
│   root (UID 0)      ────►   매핑 없음       ────►   root (UID 0) ⚠️        │
│   www-data (UID 33) ────►   매핑 없음       ────►   UID 33                 │
│                                                                              │
│   장점:                                                                     │
│   - 모든 기능 사용 가능                                                     │
│   - 호스트와 UID 일치로 파일 공유 용이                                      │
│                                                                              │
│   단점:                                                                     │
│   - 보안 위험: 탈출 시 호스트 root 권한 획득 가능                           │
│   - 신뢰할 수 있는 환경에서만 사용 권장                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. pct 명령어 상세 가이드

### 5.1 컨테이너 생성

```bash
# 템플릿 다운로드
$ pveam update
$ pveam available --section system
$ pveam download local debian-12-standard_12.2-1_amd64.tar.zst

# 컨테이너 생성
$ pct create 100 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
    --hostname webserver \
    --memory 2048 \
    --swap 512 \
    --cores 2 \
    --net0 name=eth0,bridge=vmbr0,ip=dhcp \
    --rootfs local-lvm:8 \
    --password \
    --unprivileged 1 \
    --features nesting=1

# 생성된 설정 확인
$ pct config 100
arch: amd64
cores: 2
features: nesting=1
hostname: webserver
memory: 2048
net0: name=eth0,bridge=vmbr0,ip=dhcp
ostype: debian
rootfs: local-lvm:vm-100-disk-0,size=8G
swap: 512
unprivileged: 1
```

### 5.2 컨테이너 라이프사이클

```bash
# 시작
$ pct start 100
# 내부: lxc-start → namespace 생성 → cgroup 설정 → init 실행

# 상태 확인
$ pct status 100
status: running

# 종료
$ pct shutdown 100  # graceful (init에 signal)
$ pct stop 100      # force (즉시 종료)

# 리부팅
$ pct reboot 100
```

### 5.3 컨테이너 접속

```bash
# 콘솔 접속 (가상 터미널)
$ pct console 100
# Ctrl+A, Q 로 종료

# 컨테이너 내부에서 명령 실행 (namespace 진입)
$ pct enter 100
root@webserver:/# whoami
root
root@webserver:/# exit

# 단일 명령 실행
$ pct exec 100 -- apt update
$ pct exec 100 -- systemctl status nginx
$ pct exec 100 -- cat /etc/os-release
```

### 5.4 파일 전송

```bash
# 호스트 → 컨테이너
$ pct push 100 /root/config.txt /etc/myapp/config.txt
$ pct push 100 /root/script.sh /usr/local/bin/script.sh --perms 755

# 컨테이너 → 호스트
$ pct pull 100 /var/log/myapp.log /root/myapp.log

# 디렉토리 전체 복사 (tar 사용)
$ tar czf - /root/configs | pct exec 100 -- tar xzf - -C /etc/
```

### 5.5 리소스 변경

```bash
# 메모리 변경 (핫플러그)
$ pct set 100 --memory 4096

# CPU 코어 변경
$ pct set 100 --cores 4

# 디스크 크기 확장
$ pct resize 100 rootfs +10G

# 마운트 포인트 추가
$ pct set 100 --mp0 local-lvm:50,mp=/data
# 컨테이너 내부에 /data로 마운트됨

# Bind mount (호스트 디렉토리 공유)
$ pct set 100 --mp1 /mnt/shared,mp=/shared
```

### 5.6 컨테이너 마이그레이션

```bash
# 오프라인 마이그레이션
$ pct migrate 100 node2

# 로컬 스토리지 포함
$ pct migrate 100 node2 --target-storage local-lvm

# 재시작 마이그레이션 (종료 → 이동 → 시작)
$ pct migrate 100 node2 --restart --timeout 30
```

---

## 6. 설정 파일 구조

### 6.1 VM 설정 파일 (/etc/pve/qemu-server/100.conf)

```ini
# VM 100 Configuration
boot: order=scsi0;ide2;net0
cores: 4
sockets: 1
cpu: x86-64-v2-AES
memory: 8192
name: production-web

# BIOS/UEFI
bios: ovmf
efidisk0: local-lvm:vm-100-disk-1,efitype=4m,pre-enrolled-keys=1,size=4M

# 스토리지
scsi0: local-lvm:vm-100-disk-0,iothread=1,size=100G
scsihw: virtio-scsi-single
ide2: none,media=cdrom

# 네트워크
net0: virtio=BC:24:11:AA:BB:CC,bridge=vmbr0,firewall=1

# 디스플레이
vga: qxl
machine: q35

# Guest Agent
agent: enabled=1,fstrim_cloned_disks=1

# 옵션
onboot: 1
startup: order=1,up=30,down=60
protection: 0
```

### 6.2 컨테이너 설정 파일 (/etc/pve/lxc/100.conf)

```ini
# Container 100 Configuration
arch: amd64
cores: 2
hostname: webserver
memory: 2048
swap: 512
ostype: debian
unprivileged: 1

# 스토리지
rootfs: local-lvm:vm-100-disk-0,size=8G
mp0: local-lvm:vm-100-disk-1,mp=/data,size=50G

# 네트워크
net0: name=eth0,bridge=vmbr0,firewall=1,hwaddr=BC:24:11:CC:DD:EE,ip=dhcp,type=veth

# 기능
features: nesting=1,keyctl=1

# 시작 옵션
onboot: 1
startup: order=2,up=60

# 보안 (LXC 직접 설정)
lxc.apparmor.profile: generated
lxc.cap.drop: sys_admin

# 장치 접근
#lxc.cgroup2.devices.allow: c 10:200 rwm
#lxc.mount.entry: /dev/net/tun dev/net/tun none bind,create=file
```

---

## 7. 트러블슈팅 가이드

### 7.1 VM 문제 진단

```bash
# VM이 시작되지 않을 때
$ qm start 100 2>&1
# 오류 메시지 확인

# QEMU 로그 확인
$ journalctl -u "pve-qemu-server@100" --no-pager -n 100

# 부팅 문제 - VNC로 콘솔 확인
$ qm terminal 100  # Serial console
$ qm vnc 100       # VNC 직접 연결

# KVM 하드웨어 가상화 확인
$ kvm-ok
INFO: /dev/kvm exists
KVM acceleration can be used

# CPU 플래그 확인
$ grep -E "(vmx|svm)" /proc/cpuinfo
```

### 7.2 컨테이너 문제 진단

```bash
# 컨테이너 시작 실패
$ pct start 100 --debug
# 상세 로그 출력

# LXC 로그 확인
$ journalctl -u "pve-container@100" --no-pager -n 100
$ cat /var/log/lxc/100.log

# AppArmor 문제 확인
$ dmesg | grep -i apparmor
$ aa-status

# cgroup 문제 확인
$ cat /proc/cgroups
$ mount | grep cgroup
```

### 7.3 성능 모니터링

```bash
# VM 리소스 사용량
$ qm monitor 100
qm> info balloon
balloon: actual=8192
qm> info migrate
qm> quit

# 컨테이너 리소스 사용량
$ pct exec 100 -- top -bn1 | head -20

# 호스트에서 전체 현황
$ pvesh get /cluster/resources --type vm
$ qm list
$ pct list
```

---

## 8. 모범 사례

### 8.1 VM 최적화

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VM 성능 최적화 체크리스트                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [디스크]                                                                   │
│  ✓ VirtIO SCSI Single 컨트롤러 사용                                        │
│  ✓ IO Thread 활성화 (iothread=1)                                           │
│  ✓ cache=none 또는 writeback                                               │
│  ✓ aio=io_uring (최신 커널)                                                │
│  ✓ SSD에서는 discard=on 설정                                               │
│                                                                              │
│  [네트워크]                                                                 │
│  ✓ VirtIO 네트워크 카드 사용                                               │
│  ✓ 멀티큐 활성화 (queues=4)                                                │
│                                                                              │
│  [CPU]                                                                      │
│  ✓ 동일 클러스터면 host CPU 타입                                           │
│  ✓ 다양한 노드면 x86-64-v2-AES 이상                                        │
│  ✓ NUMA 고려 (대형 VM)                                                     │
│                                                                              │
│  [메모리]                                                                   │
│  ✓ Ballooning 활성화 (동적 조절)                                           │
│  ✓ 대용량 페이지 고려 (hugepages)                                          │
│                                                                              │
│  [Guest]                                                                    │
│  ✓ QEMU Guest Agent 설치                                                   │
│  ✓ VirtIO 드라이버 설치 (Windows)                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 컨테이너 보안

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        컨테이너 보안 체크리스트                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [기본 설정]                                                                │
│  ✓ Unprivileged 컨테이너 사용 (기본값)                                     │
│  ✓ AppArmor 프로파일 유지                                                  │
│  ✓ 불필요한 capability 제거                                                │
│                                                                              │
│  [네트워크]                                                                 │
│  ✓ 방화벽 활성화 (firewall=1)                                              │
│  ✓ 필요한 포트만 개방                                                      │
│                                                                              │
│  [파일시스템]                                                               │
│  ✓ 호스트 바인드 마운트 최소화                                             │
│  ✓ 읽기 전용 마운트 활용 (ro=1)                                            │
│                                                                              │
│  [리소스]                                                                   │
│  ✓ 메모리 제한 설정                                                        │
│  ✓ CPU 제한 설정                                                           │
│  ✓ 디스크 쿼터 설정                                                        │
│                                                                              │
│  [모니터링]                                                                 │
│  ✓ 로그 모니터링                                                           │
│  ✓ 이상 행동 탐지                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. 주요 명령어 요약

### 9.1 qm (VM 관리)

| 명령어 | 설명 |
|--------|------|
| `qm create <vmid>` | VM 생성 |
| `qm destroy <vmid>` | VM 삭제 |
| `qm start <vmid>` | VM 시작 |
| `qm stop <vmid>` | VM 강제 종료 |
| `qm shutdown <vmid>` | VM 정상 종료 |
| `qm reboot <vmid>` | VM 리부팅 |
| `qm suspend <vmid>` | VM 일시 정지 |
| `qm resume <vmid>` | VM 재개 |
| `qm config <vmid>` | 설정 보기 |
| `qm set <vmid>` | 설정 변경 |
| `qm status <vmid>` | 상태 확인 |
| `qm migrate <vmid> <node>` | 마이그레이션 |
| `qm monitor <vmid>` | QMP 콘솔 |
| `qm agent <vmid> <cmd>` | Guest Agent 명령 |
| `qm terminal <vmid>` | 시리얼 콘솔 |

### 9.2 pct (컨테이너 관리)

| 명령어 | 설명 |
|--------|------|
| `pct create <ctid>` | 컨테이너 생성 |
| `pct destroy <ctid>` | 컨테이너 삭제 |
| `pct start <ctid>` | 시작 |
| `pct stop <ctid>` | 강제 종료 |
| `pct shutdown <ctid>` | 정상 종료 |
| `pct config <ctid>` | 설정 보기 |
| `pct set <ctid>` | 설정 변경 |
| `pct status <ctid>` | 상태 확인 |
| `pct enter <ctid>` | 쉘 진입 |
| `pct exec <ctid> -- <cmd>` | 명령 실행 |
| `pct console <ctid>` | 콘솔 접속 |
| `pct push <ctid> <src> <dst>` | 파일 업로드 |
| `pct pull <ctid> <src> <dst>` | 파일 다운로드 |
| `pct migrate <ctid> <node>` | 마이그레이션 |
| `pct resize <ctid> <disk> <size>` | 디스크 크기 변경 |

---

## 10. 다음 단계

Module 5에서는 **High Availability & Cluster Orchestration**을 다룹니다:
- Corosync 클러스터 통신 메커니즘
- Quorum 알고리즘과 split-brain 방지
- HA 스택 (pve-ha-crm, pve-ha-lrm) 동작 원리
- Fencing과 Watchdog
- 장애 시뮬레이션 및 복구 절차

---

*문서 버전: 1.0*
*최종 업데이트: 2025년 1월*
*Proxmox VE 8.x 기준*
