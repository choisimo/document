# Operating Systems — Internals and Design Principles
> Source: *Operating Systems: Internals and Design Principles*, 6th Edition — William Stallings. Synthesized from OS design principles (PDF contains different book content).

## Overview

An operating system is not a single program — it is a collection of interlocking mechanisms that together create the illusion of isolated, infinite resources from shared, finite hardware. This document maps the internal machinery: how the kernel manages processes in memory, how the scheduler selects and switches tasks, how virtual memory translates addresses through page tables, and how the I/O subsystem routes requests from userspace to hardware.

---

## 1. Kernel Architecture — Protection Rings

The CPU's privilege levels enforce the boundary between trusted kernel code and untrusted user code. On x86, rings 0–3 are available; mainstream OS design uses ring 0 (kernel) and ring 3 (user).

```mermaid
block-beta
  columns 1
  block:ring0["Ring 0 — Kernel Mode"]:1
    k1["Process scheduler"] k2["Memory manager"] k3["Device drivers"] k4["System call handler"]
  end
  block:ring3["Ring 3 — User Mode"]:1
    u1["User process A"] u2["User process B"] u3["User process C"]
  end
  ring3 -->|"syscall / int 0x80 / sysenter"| ring0
  ring0 -->|"iret / sysret"| ring3
```

**Hardware enforcement**: Kernel-mode instructions (e.g., `HLT`, `LGDT`, direct I/O port access) fault when executed at ring 3. A user process cannot corrupt kernel memory, because the MMU enforces page-level permissions.

---

## 2. Process Control Block (PCB) — The OS's View of a Process

Every process is fully described by its Process Control Block (also called `task_struct` in Linux). When the kernel isn't running a process, everything needed to resume it is captured here.

```mermaid
block-beta
  columns 2
  block:pcb["Process Control Block"]:2
    pid["PID"] state["State (running/blocked/ready)"]
    pc["Program Counter"] sp["Stack Pointer"]
    regs["General registers (r0–r15)"] flags["CPU flags (EFLAGS)"]
    mm["Memory map pointer"] files["Open file table"]
    sched["Scheduling priority / vruntime"] sig["Pending signals"]
    parent["Parent PID"] children["Child list"]
  end
```

```mermaid
stateDiagram-v2
    [*] --> New: fork() / exec()
    New --> Ready: admitted to run queue
    Ready --> Running: dispatcher selects process
    Running --> Ready: preempted (time quantum expired)
    Running --> Blocked: I/O wait / sleep / mutex
    Blocked --> Ready: I/O complete / signal / wakeup
    Running --> Zombie: exit() called
    Zombie --> [*]: parent calls wait()
```

---

## 3. Context Switch — Register State Transfer

A context switch saves the complete CPU state of the outgoing process and restores the incoming process's state. This is the most performance-critical OS path.

```mermaid
sequenceDiagram
    participant CPU
    participant KernelStack as Kernel Stack
    participant PCB_out as PCB (outgoing)
    participant PCB_in as PCB (incoming)
    participant NewProcess as New Process

    CPU->>KernelStack: timer interrupt → push EFLAGS, CS, EIP
    CPU->>KernelStack: save general registers
    KernelStack->>PCB_out: store kernel stack pointer
    Note over PCB_out: outgoing process fully captured
    PCB_in->>KernelStack: restore kernel stack pointer
    KernelStack->>CPU: pop general registers
    KernelStack->>CPU: iret: restore EIP, CS, EFLAGS
    CPU->>NewProcess: execution resumes
```

**CR3 update**: If the incoming process has a different address space, `CR3` (page directory base register) is updated. This flushes the TLB, causing page-table walk overhead for the first memory accesses.

---

## 4. Scheduling — CFS Internal Mechanics

Linux's Completely Fair Scheduler (CFS) uses a red-black tree ordered by `vruntime` — the amount of CPU time the process has consumed, normalized by priority weight.

```mermaid
flowchart TD
    tick["Timer interrupt fires"]
    update["Update current->vruntime += delta_exec * (weight_0 / weight_curr)"]
    check{"vruntime > min_vruntime + sched_latency?"}
    preempt["Set TIF_NEED_RESCHED flag"]
    schedule["schedule() called"]
    leftmost["Pick leftmost node in rb-tree (smallest vruntime)"]
    dequeue["Dequeue selected task"]
    switch["context_switch(prev, next)"]

    tick --> update --> check
    check -->|yes| preempt --> schedule
    check -->|no| tick
    schedule --> leftmost --> dequeue --> switch
```

```mermaid
graph TD
    root["rb_root (vruntime=40)"]
    l1["vruntime=30"]
    r1["vruntime=55"]
    l2["vruntime=20 ← leftmost = next to run"]
    l3["vruntime=35"]

    root --> l1
    root --> r1
    l1 --> l2
    l1 --> l3
    style l2 fill:#00aa00,color:#fff
```

**vruntime normalization**: Higher-priority processes (nicer = -20) have a larger weight, so their vruntime grows more slowly — they get proportionally more CPU time before being preempted.

---

## 5. Virtual Memory — Address Translation Pipeline

Every user memory access goes through a multi-level page table walk to translate a virtual address to a physical address.

### 5.1 x86-64 Four-Level Page Table

```mermaid
flowchart LR
    va["Virtual Address\n[63:48] sign ext\n[47:39] PGD idx\n[38:30] PUD idx\n[29:21] PMD idx\n[20:12] PTE idx\n[11:0] offset"]

    cr3["CR3 → PGD base (phys)"]
    pgd["PGD[idx] → PUD base"]
    pud["PUD[idx] → PMD base"]
    pmd["PMD[idx] → PT base"]
    pte["PTE[idx] → page frame (phys)"]
    phys["Physical Addr = frame | offset"]

    cr3 --> pgd --> pud --> pmd --> pte --> phys
    va -.->|"extract indices"| pgd
```

### 5.2 TLB — Translation Lookaside Buffer

```mermaid
stateDiagram-v2
    [*] --> AccessMemory
    AccessMemory --> TLBLookup: CPU issues virtual address
    TLBLookup --> TLBHit: mapping found in TLB
    TLBLookup --> TLBMiss: not in TLB
    TLBHit --> PhysicalAccess: use cached frame number (1 cycle)
    TLBMiss --> PageWalk: hardware page table walk (~100 cycles)
    PageWalk --> TLBFill: install new entry in TLB
    TLBFill --> PhysicalAccess
    PhysicalAccess --> [*]
```

### 5.3 Page Fault Handler

```mermaid
flowchart TD
    pf["Page fault: CR2 = faulting virtual address"]
    check_vma["Find VMA covering address"]
    valid{"Address in valid VMA?"}
    segfault["SIGSEGV → kill process"]
    check_pte["Check PTE: present bit?"]
    demand_alloc["Demand allocation: allocate page frame\nzero-fill or load from file/swap"]
    protection["Protection fault: copy-on-write?"]
    cow["COW: copy page, update PTE, re-run instruction"]
    swap["Swap-in: locate in swap, read from disk, update PTE"]

    pf --> check_vma --> valid
    valid -->|no| segfault
    valid -->|yes| check_pte
    check_pte -->|not present, anonymous| demand_alloc
    check_pte -->|not present, swapped| swap
    check_pte -->|write to read-only| protection --> cow
    demand_alloc --> resume["Resume faulting instruction"]
    cow --> resume
    swap --> resume
```

---

## 6. Memory Zones and Physical Allocation

The kernel divides physical memory into zones, each managed by a buddy allocator:

```mermaid
block-beta
  columns 3
  block:zones["Physical Memory Zones"]:3
    dma["ZONE_DMA\n(0–16MB)\nISA device DMA"] normal["ZONE_NORMAL\n(16MB–896MB)\nDirect-mapped kernel"] high["ZONE_HIGHMEM\n(>896MB)\nkmap required (32-bit only)"]
  end
```

### 6.1 Buddy Allocator

```mermaid
flowchart TD
    req["Request: 4 pages (order=2)"]
    check2["Free list order=2 empty?"]
    split["Split order=3 block into two order=2 blocks"]
    alloc["Return one order=2 block"]
    free["On free: check if buddy free?"]
    merge["Merge buddy pair → order=3 block"]

    req --> check2
    check2 -->|yes| split --> alloc
    check2 -->|no| alloc
    free --> merge
```

### 6.2 Slab Allocator — Object Cache

```mermaid
block-fixes
block-beta
  columns 1
  block:slab["kmem_cache for task_struct (example)"]:1
    full["Full slabs: all objects allocated"]
    partial["Partial slabs: mix of free/allocated objects"]
    empty["Empty slabs: all free → returned to buddy"]
  end
```

**Why slab**: Eliminates fragmentation for fixed-size kernel objects. `task_struct` (~1.7KB) has its own cache; allocating a new process reuses a pre-warmed slot with constructor already run.

---

## 7. File System — VFS Layer

The Virtual File System (VFS) is an abstraction layer that allows multiple filesystem implementations (ext4, XFS, tmpfs, NFS) to coexist behind a unified system call interface.

```mermaid
flowchart TD
    syscall["read(fd, buf, n)"]
    vfs["VFS: look up file* by fd in current->files"]
    inode["Get inode → file type, permissions, size"]
    pagecache{"Page in page cache?"}
    fs["Filesystem (ext4): read from disk via block layer"]
    bdev["Block device layer: I/O request queue"]
    driver["Device driver (NVMe, SATA)"]
    disk["Physical disk"]
    cache["Page cache: mark page uptodate"]
    copy["copy_to_user(buf, page+offset, n)"]

    syscall --> vfs --> inode --> pagecache
    pagecache -->|yes| copy
    pagecache -->|no| fs --> bdev --> driver --> disk
    disk --> cache --> copy
```

### 7.1 Dentry Cache (dcache)

```mermaid
graph TD
    root["/"]
    home["home"]
    user["user"]
    docs["docs"]
    file["report.txt"]

    root --> home --> user --> docs --> file

    note["Each arrow = dentry (name→inode mapping)\nCached in hash table for fast path lookup\ninode holds metadata: permissions, size, block map"]
```

---

## 8. I/O Scheduling — Block Layer

```mermaid
flowchart TD
    bio["bio request: sector offset, page list"]
    elevator["I/O scheduler (CFQ / deadline / none)"]
    queue["request_queue: per-device submission queue"]
    merge{"Adjacent sectors? Mergeable?"}
    merged["Merge into existing request"]
    new_req["Create new request"]
    dispatch["Dispatch to driver"]
    irq["Completion IRQ: mark bio done"]
    wakeup["Wake waiting process"]

    bio --> elevator --> merge
    merge -->|yes| merged --> queue
    merge -->|no| new_req --> queue
    queue --> dispatch --> irq --> wakeup
```

### 8.1 DMA Transfer Path

```mermaid
sequenceDiagram
    participant Kernel
    participant DMAController
    participant DeviceDriver
    participant PhysicalMemory

    Kernel->>DeviceDriver: submit_bio(bio)
    DeviceDriver->>DMAController: program DMA: src=disk, dst=page_frame_addr, len=4096
    DMAController-->>PhysicalMemory: transfer data directly (no CPU involvement)
    DMAController->>DeviceDriver: raise interrupt (DMA complete)
    DeviceDriver->>Kernel: blk_mq_complete_request()
    Kernel-->>Kernel: mark page uptodate, wake process
```

---

## 9. Synchronization — Kernel Locking Internals

### 9.1 Spinlock

```mermaid
stateDiagram-v2
    [*] --> TryAcquire
    TryAcquire --> Acquired: LOCK XCHG succeeds (was 0, set to 1)
    TryAcquire --> Spinning: LOCK XCHG fails (already 1)
    Spinning --> TryAcquire: retry in tight loop (busy-wait)
    Acquired --> CriticalSection
    CriticalSection --> Released: LOCK XCHG back to 0
    Released --> [*]
```

**Rule**: Spinlocks must not be held across any code that can sleep. They're suitable for IRQ handlers and very short critical sections.

### 9.2 Mutex (Sleeping Lock)

```mermaid
sequenceDiagram
    participant T1
    participant T2
    participant Mutex
    participant Scheduler

    T1->>Mutex: lock() → acquired (fastpath: atomic CAS)
    T2->>Mutex: lock() → CAS fails → add T2 to wait queue
    T2->>Scheduler: schedule() → T2 sleeps (state=TASK_UNINTERRUPTIBLE)
    T1->>Mutex: unlock() → wake first waiter
    Scheduler->>T2: wake → T2 re-tries CAS → acquires
```

### 9.3 RCU — Read-Copy-Update

```mermaid
flowchart LR
    read["rcu_read_lock()\npreemption disabled\nread old pointer"]
    write["Writer: allocate new copy\nupdate new copy\nrcu_assign_pointer() to atomically update global ptr"]
    grace["synchronize_rcu(): wait for all existing readers to finish\n(wait for grace period)"]
    free["kfree(old_copy)"]

    read --> grace
    write --> grace --> free
```

**Key property**: Readers never block. Writers pay the cost of waiting for a grace period before freeing old data. Ideal for read-heavy data structures (routing tables, process lists).

---

## 10. System Call Path — Detailed

```mermaid
sequenceDiagram
    participant UserApp
    participant libc
    participant CPU
    participant KernelEntry
    participant SyscallTable
    participant Implementation

    UserApp->>libc: read(fd, buf, n)
    libc->>CPU: MOV rax, __NR_read; SYSCALL instruction
    CPU->>CPU: switch to ring 0, load kernel stack (per-CPU)
    CPU->>KernelEntry: entry_SYSCALL_64
    KernelEntry->>KernelEntry: save all registers on kernel stack
    KernelEntry->>SyscallTable: sys_call_table[rax] = sys_read
    SyscallTable->>Implementation: sys_read(fd, buf, n)
    Implementation-->>KernelEntry: return value in rax
    KernelEntry->>CPU: SYSRET instruction
    CPU->>CPU: switch back to ring 3, restore registers
    CPU-->>libc: return
    libc-->>UserApp: bytes read
```

**SYSENTER/SYSCALL**: These are faster than the original `INT 0x80` software interrupt. `SYSCALL` (AMD64) directly loads the kernel entry point from `MSR_LSTAR`, avoiding the IDT lookup.

---

## 11. Demand Paging — Working Set Model

```mermaid
flowchart TD
    exec["exec(): map executable segments\nno physical pages yet"]
    first["First access → page fault"]
    alloc["Allocate page frame from free list"]
    zero["Zero-fill for BSS/anonymous\nOR load from file for text/data"]
    pte["Install PTE: VA → PA, set present bit"]
    resume["Resume faulting instruction"]
    pressure["Memory pressure: kswapd wakes"]
    lru["Scan LRU lists: active → inactive"]
    evict["Evict cold pages: write dirty to swap/file, clear PTE"]
    reclaim["Page frame returned to buddy allocator"]

    exec --> first --> alloc --> zero --> pte --> resume
    resume --> pressure --> lru --> evict --> reclaim
```

### 11.1 Clock Algorithm (Page Replacement)

```mermaid
stateDiagram-v2
    [*] --> Scan: kswapd wakes
    Scan --> CheckRef: examine page reference bit
    CheckRef --> ClearRef: ref=1 → clear bit, advance clock hand
    CheckRef --> Evict: ref=0 → candidate for eviction
    ClearRef --> Scan: continue scanning
    Evict --> Dirty{"Page dirty?"}
    Dirty -->|yes| WriteBack: writeback to disk/swap
    Dirty -->|no| Free: immediately reclaim
    WriteBack --> Free
    Free --> [*]: frame available
```

---

## 12. Inter-Process Communication — Data Paths

| Mechanism | Kernel involvement | Zero-copy? | Direction |
|-----------|-------------------|------------|-----------|
| Pipe | Yes — kernel buffer (64KB default) | No | Unidirectional |
| Socket (Unix domain) | Yes — copy user→kernel→user | No | Bidirectional |
| Shared memory (`mmap`) | Minimal — page table setup | **Yes** | Bidirectional |
| Signal | Yes — force delivery at next syscall return | N/A | Async |
| Message queue | Yes — kernel-managed FIFO | No | Unidirectional |

```mermaid
flowchart LR
    proc_a["Process A"]
    proc_b["Process B"]
    kernel_mem["Kernel buffer\n(pipe/socket)"]
    shared_page["Shared physical page\n(mmap/shm)"]

    proc_a -->|"write(fd, buf, n)"| kernel_mem
    kernel_mem -->|"read(fd, buf, n)"| proc_b

    proc_a -->|"direct write via VA"| shared_page
    proc_b -->|"direct read via VA"| shared_page
```

---

## Key Architecture Invariants

| Concept | Mechanism | Overhead |
|---------|-----------|----------|
| Kernel isolation | CPU rings + MMU page permissions | Hardware enforced |
| Process identity | PCB/task_struct | Allocated per-process |
| Address space | 4-level page tables + TLB | Miss = ~100 cycle penalty |
| CPU scheduling | CFS red-black tree by vruntime | O(log N) enqueue/dequeue |
| Memory allocation | Buddy (pages) + Slab (objects) | Low fragmentation |
| Sync (no sleep) | Spinlock (atomic XCHG) | Busy-wait |
| Sync (sleeping) | Mutex + wait queue + scheduler | Context switch cost |
| Readers (RCU) | Preempt-disable + grace period | Zero cost for readers |
| Filesystem | VFS + per-fs ops + page cache | Cache hit = no disk I/O |
| I/O | bio → request_queue → DMA | CPU-free data transfer |
