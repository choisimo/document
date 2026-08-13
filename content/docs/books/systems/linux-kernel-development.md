# Linux Kernel Development — Under the Hood
> Based on *Linux Kernel Development, 3rd Edition* by Robert Love

## Historical and platform boundary

- The book describes an older Linux generation. Structure fields, sizes, scheduler policy, page-cache indexes, syscall entry, memory zones and block I/O paths vary by kernel version and architecture.
- Diagrams are teaching paths, not exact traces for every filesystem, cache state, security hook or device driver.
- Before using a symbol or field, record the kernel release, architecture, configuration and source commit, then confirm it in that tree.
- Runtime completion evidence combines tracepoints or BPF data, counters, return values and failure-path observations; a diagram alone is not proof.

This document maps representative Linux kernel mechanisms: tasks, scheduling, system calls, synchronization, memory and I/O. It preserves the cited book's conceptual value while marking version-specific structures as historical examples.

---

## 1. Process Model: task_struct and the Task List

Linux represents each task with `struct task_struct`, but its definition, size and related structures vary by release, architecture and configuration. The historical `~1.7 KB on 32-bit` figure is not a current invariant, and task state also references shared or external kernel objects rather than containing everything inline.

```mermaid
block-beta
  columns 3
  A["task_struct\n(~1.7KB, slab-allocated)"] B["thread_info\n(bottom of kernel stack)"] C["kernel stack\n(8KB default)"]
  A --> B
  B --> C
  D["pid_t pid"] E["long state"] F["struct mm_struct *mm"]
  G["struct files_struct *files"] H["struct signal_struct *signal"] I["struct list_head tasks"]
  A --> D
  A --> E
  A --> F
  A --> G
  A --> H
  A --> I
```

### task_struct Allocation: Slab Allocator + thread_info

Before kernel 2.6, `task_struct` lived at the **end of the kernel stack**. Now it's slab-allocated, and `struct thread_info` anchors to the stack bottom:

```mermaid
flowchart TB
  subgraph "Kernel Stack (8KB)"
    direction TB
    TI["struct thread_info\n(at stack bottom/top depending on arch)"]
    SP["↑ stack grows here\n(local vars, saved regs)"]
    KF["kernel frame N\nkernel frame N-1\n..."]
  end
  TI -->|"thread_info.task →"| TS["struct task_struct\n(slab heap, anywhere in mem)"]
  SP --> KF
```

On **x86** (register-poor), `current` is computed by masking the stack pointer:
```
current_thread_info() = (stack_pointer & ~(8192-1))
current = current_thread_info()->task
```
Assembly: `movl $-8192, %eax ; andl %esp, %eax`

On **PowerPC** (register-rich), `current` is simply register `r2`.

### Process Lifecycle State Machine

```mermaid
stateDiagram-v2
  [*] --> TASK_RUNNING_QUEUED : fork() / clone() creates child
  TASK_RUNNING_QUEUED --> TASK_RUNNING_CPU : schedule() → context_switch()
  TASK_RUNNING_CPU --> TASK_RUNNING_QUEUED : preempted by higher-priority task
  TASK_RUNNING_CPU --> TASK_INTERRUPTIBLE : wait for event (e.g., I/O)
  TASK_RUNNING_CPU --> TASK_UNINTERRUPTIBLE : wait, must not be interrupted
  TASK_INTERRUPTIBLE --> TASK_RUNNING_QUEUED : event occurs OR signal received
  TASK_UNINTERRUPTIBLE --> TASK_RUNNING_QUEUED : event occurs (signals ignored)
  TASK_RUNNING_CPU --> __TASK_TRACED : ptrace attach
  TASK_RUNNING_CPU --> __TASK_STOPPED : SIGSTOP / SIGTSTP received
  TASK_RUNNING_CPU --> EXIT_ZOMBIE : do_exit()
  EXIT_ZOMBIE --> [*] : parent calls wait() / wait4()
```

The `TASK_UNINTERRUPTIBLE` state is why you see processes in state `D` in `ps` that cannot be `SIGKILL`ed — they hold a semaphore waiting for a kernel event (typically I/O), and waking them prematurely would corrupt kernel state.

### fork() / clone() Internal Data Flow

```mermaid
sequenceDiagram
  participant U as User Space
  participant SC as sys_clone() / sys_fork()
  participant CF as copy_process()
  participant SA as Slab Allocator
  participant MM as mm_subsystem

  U->>SC: fork() syscall → int 0x80 / syscall
  SC->>CF: copy_process(clone_flags, ...)
  CF->>SA: dup_task_struct() → alloc new task_struct + thread_info
  SA-->>CF: child task_struct
  CF->>MM: copy_mm() — copy or share address space
  CF->>CF: copy_files(), copy_fs(), copy_sighand()
  CF->>CF: assign new PID (alloc_pid())
  CF-->>SC: child task_struct ready
  SC->>SC: wake_up_new_task(child) → place on runqueue
  SC-->>U: returns child PID to parent, 0 to child
```

`fork()` uses **copy-on-write (COW)** — the child shares parent's page tables marked read-only. Only on first write does the kernel copy the actual page.

---

## 2. Process Scheduling: CFS and the Runqueue

Linux 2.6.23 introduced CFS in place of the earlier O(1) scheduler, using virtual-runtime ordering as a central model. Later kernels have changed fair-scheduling selection, including EEVDF-based behavior, so the red-black-tree explanation must be tied to the cited kernel era rather than treated as the current scheduler contract.

### CFS Data Structures

```mermaid
flowchart LR
  subgraph "Per-CPU runqueue (struct rq)"
    RBT["rbtree root\n(ordered by vruntime)"]
    CURR["curr → task_struct"]
    CFS_RQ["struct cfs_rq\n.min_vruntime\n.nr_running"]
  end
  RBT -->|"leftmost = next task"| T1["task A\nvruntime=100ns"]
  RBT --> T2["task B\nvruntime=150ns"]
  RBT --> T3["task C\nvruntime=200ns"]
  T1 -->|"sched_entity"| TS1["task_struct A"]
  T2 -->|"sched_entity"| TS2["task_struct B"]
```

### vruntime Calculation

Every task gets a **time slice** proportional to its weight. `vruntime` accumulates at rate:
```
vruntime_delta = actual_runtime × (NICE_0_LOAD / task_weight)
```

Higher-priority tasks have higher `task_weight`, so their `vruntime` grows **slower** — they appear at the left of the rbtree and get selected more often.

```mermaid
flowchart TD
  A["schedule() called\n(voluntary or preemption)"] --> B["Pick leftmost node\nfrom CFS rbtree"]
  B --> C["context_switch(prev, next)"]
  C --> D["switch_mm() — load CR3\nwith new page table base"]
  C --> E["switch_to() — save/restore\nregs, stack pointer, FPU state"]
  E --> F["next task runs"]
  F --> G["update_curr()\naccumulates vruntime"]
  G --> H{"vruntime exceeds\nideal_runtime?"}
  H -->|yes| I["set TIF_NEED_RESCHED flag"]
  H -->|no| F
  I --> A
```

### Context Switch: What Actually Happens

```mermaid
sequenceDiagram
  participant K as Kernel (schedule())
  participant MMU as MMU / TLB
  participant CPU as CPU Registers
  participant FPU as FPU State

  K->>K: preempt_disable()
  K->>MMU: switch_mm(old_mm, new_mm)\nloads CR3 → flushes TLB (unless ASID)
  K->>CPU: switch_to(prev, next)\nsaves: ESP, EBP, EBX, ESI, EDI\nrestores: next task's saved regs
  K->>CPU: jump to next task's saved EIP
  note over CPU: CPU now executing new task
  K->>FPU: lazy FPU save — only on first FP instruction\n(via #NM exception)
  K->>K: preempt_enable()
```

---

## 3. System Calls: The Privilege Boundary Crossing

System calls are the only legitimate way user-space crosses into kernel mode. On x86-64, the `syscall` instruction is used (replacing slower `int 0x80`).

```mermaid
flowchart TD
  U["User space: read(fd, buf, count)\n→ glibc wrapper\n→ mov eax, __NR_read\n→ syscall instruction"]
  U --> MSR["CPU: saves RIP, RFLAGS to MSR\nloads kernel RIP from LSTAR MSR\nsets CPL=0 (ring 0)"]
  MSR --> SE["system_call entry point\n(arch/x86/entry/entry_64.S)\nSAVE_ALL registers on kernel stack"]
  SE --> DT["sys_call_table[rax]\nlookup — 64-bit indexed array\nof function pointers"]
  DT --> SC["sys_read(fd, buf, count)\nkernel implementation"]
  SC --> VR["verify_area()\ncheck user pointer validity\ncopy_from_user() / copy_to_user()"]
  VR --> RET["syscall_return\nRESTORE_ALL\nsysret instruction\nreturns to user CPL=3"]
```

### Kernel Stack During a System Call

```mermaid
block-beta
  columns 1
  A["pt_regs (saved user registers)\nRSS, CS, RFLAGS, RSP, SS"]
  B["sys_read() stack frame\nlocal vars: file *, ssize_t, etc."]
  C["vfs_read() frame"]
  D["file->f_op->read() frame\n(e.g., ext4_file_read_iter)"]
  E["→ stack grows downward toward thread_info"]
```

Each `task_struct` has exactly **one kernel stack** (8KB, or 4KB on CONFIG_4KSTACKS). With interrupt stacks enabled, IRQ handlers get their own per-CPU stack, preventing overflow.

---

## 4. Interrupts and Bottom Halves

Hardware interrupts must be handled in two phases: the **top half** (urgent, runs in IRQ context, can't sleep) and **bottom half** (deferred work, runs later in softer context).

```mermaid
flowchart TD
  HW["Hardware IRQ fires\n(e.g., NIC receives packet)"]
  HW --> IDT["CPU: saves state\nlookups IDT → irq_handler entry\ndisables same IRQ line"]
  IDT --> TH["Top Half: irq_handler_t\n(registered via request_irq())\nACK hardware, minimal work\nmark bottom half pending"]
  TH --> BH{"Bottom Half\nMechanism?"}
  BH --> SQ["Softirq\n(static, fixed priorities)\nruns in ksoftirqd or do_softirq()\nNET_RX_SOFTIRQ, TASKLET_SOFTIRQ"]
  BH --> TK["Tasklet\n(built on softirq)\ndynamic, serialized per-CPU\ntasklet_schedule()"]
  BH --> WQ["Work Queue\n(runs in kernel thread context)\ncan sleep, uses kworker threads\nschedule_work()"]
```

### Interrupt Context vs. Process Context

```mermaid
flowchart LR
  subgraph "Interrupt Context (IRQ)"
    I1["Cannot sleep"]
    I2["Cannot call schedule()"]
    I3["Cannot acquire mutex"]
    I4["Uses per-CPU interrupt stack"]
    I5["preempt_count > 0"]
  end
  subgraph "Process Context (syscall, kthread)"
    P1["Can sleep"]
    P2["Can call schedule()"]
    P3["Can acquire mutex"]
    P4["Uses task's kernel stack"]
    P5["current is valid"]
  end
```

---

## 5. Kernel Synchronization

The kernel faces concurrent access from: multiple CPUs (SMP), kernel preemption, and interrupts. Three layers of primitives protect shared state.

### Atomic Operations

`atomic_t` wraps a volatile int. On x86, operations like `atomic_inc` compile to `lock addl $1, (%eax)` — the `LOCK` prefix makes the memory bus operation indivisible.

```mermaid
sequenceDiagram
  participant CPU1
  participant CPU2
  participant MEM as Memory Bus

  CPU1->>MEM: LOCK prefix → assert LOCK# signal
  note over MEM: bus locked — CPU2 stalls
  CPU1->>MEM: read-modify-write (atomic_inc)
  CPU1->>MEM: release LOCK# signal
  MEM-->>CPU2: bus released → CPU2 can proceed
```

**Atomicity vs. Ordering distinction**: Atomic ops guarantee indivisibility but NOT ordering across CPUs. For ordering, memory barriers (`smp_mb()`, `smp_rmb()`, `smp_wmb()`) are needed — they compile to `mfence`/`lfence`/`sfence` on x86.

### Spinlocks

Used when the critical section is short and the lock holder will release quickly. On SMP, the non-holder busy-waits in a tight loop. On UP (uniprocessor), spinlocks compile to nothing (preemption disable only).

```mermaid
flowchart TD
  A["spin_lock(lock)"]
  A --> B{"lock->slock == 0?"}
  B -->|no| C["CPU spins: busy-wait\n(disable interrupts on local CPU\nif spin_lock_irqsave)"]
  C --> B
  B -->|yes| D["atomic compare-and-swap\nset lock->slock = 1"]
  D --> E["critical section\nno sleep allowed"]
  E --> F["spin_unlock(lock)\nset lock->slock = 0\nmemory barrier"]
```

### Reader-Writer Spinlocks and Semaphores

```mermaid
flowchart LR
  subgraph "rwlock_t"
    R["Multiple concurrent readers\nrwlock_t.lock == readers_count"]
    W["Single exclusive writer\nrwlock_t.lock == 0x80000000"]
    R -->|"contention"| W
  end
  subgraph "struct semaphore"
    SEM["count (atomic)\n= 0 → blocked\n> 0 → available"]
    WQ_S["wait_queue_head_t\n(sleeping waiters)"]
    SEM --> WQ_S
  end
  subgraph "struct mutex"
    MX["atomic_t count\n= 1 → unlocked\n= 0 → locked\n< 0 → locked + waiters"]
    MX_WQ["wait_list\n(MCS-style fair queue)"]
    MX --> MX_WQ
  end
```

Key difference: **spinlocks** = busy-wait (never sleep, IRQ/atomic-safe); **semaphores/mutexes** = sleep (process context only, can be held across schedule()).

### RCU (Read-Copy-Update)

RCU is used for data that is read far more than written (e.g., routing tables, process credential structures):

```mermaid
sequenceDiagram
  participant R1 as Reader CPU1
  participant R2 as Reader CPU2
  participant W as Writer

  R1->>R1: rcu_read_lock() — preempt_disable
  R1->>R1: p = rcu_dereference(gp) — reads pointer
  W->>W: new_p = kmalloc(...)
  W->>W: populate new_p
  W->>W: rcu_assign_pointer(gp, new_p) — memory barrier + store
  R2->>R2: rcu_read_lock()
  R2->>R2: sees new_p (or old_p — both valid)
  R1->>R1: rcu_read_unlock()
  W->>W: synchronize_rcu() — wait for grace period\n(all CPUs pass quiescent state)
  W->>W: kfree(old_p) — safe, no readers hold it
```

---

## 6. Memory Management: Zones, Pages, and the Allocator Hierarchy

Linux divides physical RAM into **zones** based on DMA constraints and high-memory architecture limits.

### Memory Zone Layout (x86 32-bit example)

```mermaid
block-beta
  columns 1
  A["ZONE_DMA: 0–16MB\n(legacy ISA DMA devices)"]
  B["ZONE_NORMAL: 16MB–896MB\n(direct-mapped to kernel virtual space\n0xC0000000 + phys_addr)"]
  C["ZONE_HIGHMEM: 896MB–end of RAM\n(not permanently mapped in kernel VA space\nrequires kmap() / kmap_atomic())"]
```

### Allocator Hierarchy

```mermaid
flowchart TD
  APP["kmalloc(size, GFP_KERNEL)"]
  APP --> SL["Slab / SLUB Allocator\n(object caches, cache coloring,\nper-CPU magazines)"]
  SL --> PA["Page Allocator (Buddy System)\nalloc_pages(gfp_mask, order)\nallocates 2^order contiguous pages"]
  PA --> ZA["Zone Allocator\nselects ZONE_NORMAL / ZONE_DMA\nbased on gfp_mask flags"]
  ZA --> PF["Page Frame (struct page)\n20 bytes per page (4KB page = 0.5% overhead)"]
```

### Buddy Allocator Internal State

The buddy system tracks free pages in 11 free lists, for orders 0–10 (1, 2, 4, 8, ... 1024 pages):

```mermaid
flowchart LR
  subgraph "free_area[order]"
    O0["order 0: list of 4KB free pages"]
    O1["order 1: list of 8KB free pairs"]
    O2["order 2: 16KB quads"]
    O9["order 9: 2MB blocks"]
    O10["order 10: 4MB blocks"]
  end
  REQ["alloc_pages(GFP_KERNEL, 0)\nwants 1 page (order 0)"]
  REQ --> O0
  O0 -->|"empty → split from order 1"| O1
  O1 -->|"split: give 1 page, buddy goes to order 0 free list"| O0
```

On **free**, if the freed page's **buddy** (adjacent same-size block) is also free, they are **coalesced** into a higher-order block — preventing fragmentation.

### Slab Allocator: Per-Type Object Caches

```mermaid
flowchart TD
  subgraph "kmem_cache for task_struct"
    CP["Cache: 'task_struct'\nobj_size = 1.7KB\nalignment = 64B (cache-colored)"]
    SL1["Slab 1: 4 pages\n2 objects in-use, 2 free"]
    SL2["Slab 2: 4 pages\n4 objects in-use, 0 free"]
    SL3["Slab 3: 4 pages\n0 objects in-use (free to release)"]
    CP --> SL1
    CP --> SL2
    CP --> SL3
  end
  subgraph "Per-CPU array_cache"
    AC["array_cache[cpu]\nbatch of recently freed objects\n(hot cache line objects)"]
  end
  SL1 --> AC
  AC -->|"alloc: pop from array"| NEW["new task_struct\n(same cache line as last free)"]
```

**Cache coloring**: slab start offsets are varied so that objects from different slabs land on different L1 cache sets — preventing cache line thrashing.

### High Memory Mapping

```mermaid
sequenceDiagram
  participant K as Kernel code
  participant PA as Page Allocator
  participant PKMAP as Permanent Kernel Map\n(pkmap area 0xFFC00000)
  participant TMP as kmap_atomic fixmap

  K->>PA: alloc_pages(__GFP_HIGHMEM, 0)
  PA-->>K: struct page * (no virtual address)
  K->>PKMAP: kmap(page)\n→ find free pkmap slot\n→ set PTE in pkmap page table
  PKMAP-->>K: virtual address in 0xFFC00000–0xFFFFFFFF
  note over K: use the memory
  K->>PKMAP: kunmap(page) — clear PTE
  note over K: For interrupt context:
  K->>TMP: kmap_atomic(page, KM_USER0)\ndisables preemption\nuses fixmap reserved slot
  TMP-->>K: virtual address
  K->>TMP: kunmap_atomic(addr, KM_USER0)
```

---

## 7. Virtual Filesystem (VFS): Abstraction Layer

VFS provides a uniform interface between system calls (`open`, `read`, `write`) and concrete filesystems (ext4, btrfs, tmpfs, NFS).

### VFS Object Hierarchy

```mermaid
flowchart TD
  SC["open(path, flags)\nread(fd, buf, n)"]
  SC --> FD["fd → struct file\n(per-open-file instance)\nf_pos, f_flags, f_op"]
  FD --> IN["struct inode\n(per filesystem object)\ni_ino, i_size, i_mode\ni_op, i_fop, i_mapping"]
  IN --> SB["struct super_block\n(per mounted filesystem)\ns_op, s_type, s_blocksize"]
  IN --> DE["struct dentry\n(path component cache)\nd_name, d_inode, d_parent\nd_op, d_subdirs"]
  DE --> DCA["dentry cache (dcache)\nhash table keyed by (parent, name)\nLRU eviction on memory pressure"]
```

### read() System Call — Full Data Path

```mermaid
sequenceDiagram
  participant U as User Buffer (ring 3)
  participant SC as sys_read()
  participant VFS as vfs_read()
  participant FOP as file->f_op->read_iter()
  participant PC as Page Cache (radix tree)
  participant BL as Block Layer
  participant DISK as Block Device

  U->>SC: syscall: read(fd, ubuf, count)
  SC->>SC: fget(fd) → struct file *
  SC->>VFS: vfs_read(file, ubuf, count, &pos)
  VFS->>FOP: call_read_iter() → file->f_op->read_iter()
  FOP->>PC: generic_file_read_iter()\nlook up page in address_space radix tree
  PC-->>FOP: page found (cache hit) → copy_to_user()
  note over PC: on cache miss:
  FOP->>BL: submit_bio() — build struct bio\n(block I/O descriptor: sectors, pages, direction)
  BL->>BL: I/O scheduler (CFQ/deadline/noop)\nmerge/sort requests in dispatch queue
  BL->>DISK: issue to driver → DMA transfer
  DISK-->>BL: IRQ on completion
  BL-->>PC: bio_endio() → mark page uptodate\nwake up waiting process
  PC-->>FOP: page now in cache → copy_to_user()
  FOP-->>U: data in user buffer
```

### Page Cache: Radix Tree Structure

```mermaid
flowchart TD
  subgraph "address_space (per inode)"
    RT["radix_tree_root\n(keyed by page index = file_offset / PAGE_SIZE)"]
    P0["page index 0\n(bytes 0–4095)"]
    P1["page index 1\n(bytes 4096–8191)"]
    PN["page index N"]
    RT --> P0
    RT --> P1
    RT --> PN
  end
  P0 --> FLAGS["page flags:\nPG_uptodate (data valid)\nPG_dirty (needs writeback)\nPG_locked (I/O in progress)\nPG_lru (on LRU list)"]
```

---

## 8. Block I/O Layer

The block layer abstracts storage devices and provides scheduling. The key structure is `struct bio` — a scatter-gather I/O descriptor.

```mermaid
flowchart LR
  subgraph "struct bio"
    BD["bi_bdev → block_device"]
    SE["bi_sector: starting LBA"]
    VC["bi_vcnt: number of segments"]
    IO["bi_io_vec[]: array of\n{page *, offset, len}"]
    END["bi_end_io: completion callback"]
  end
  BD --> DQ["struct request_queue\n(per device)\ndispatch_queue, elevator_queue"]
  DQ --> EL["I/O Scheduler (elevator)\nCFQ: per-process fair queues\nDeadline: prevents starvation\nNoop: FIFO for SSDs"]
  EL --> DRV["Device Driver\n(e.g., ahci, nvme)\nDMA descriptor ring"]
  DRV --> HW["Hardware\n(disk, SSD, RAID)"]
```

---

## 9. Kernel Data Structures

### Intrusive Linked List (list_head)

Unlike userspace linked lists where the list **contains** data, the kernel embeds `list_head` **inside** the data structure:

```mermaid
flowchart LR
  subgraph "fox struct 1"
    F1D["fox.data"]
    F1L["fox.list\n(list_head)\n.next → "]
  end
  subgraph "fox struct 2"
    F2L[".prev ←\nfox.list\n(list_head)\n.next → "]
    F2D["fox.data"]
  end
  subgraph "fox struct 3"
    F3L[".prev ←\nfox.list\n(list_head)"]
    F3D["fox.data"]
  end
  F1L --> F2L
  F2L --> F3L
  F3L -->|"circular"| F1L
```

`list_entry(ptr, type, member)` recovers the containing struct via `container_of()`: subtracts the compile-time offset of `member` from `ptr`.

### kfifo: Lock-Free SPSC Queue

```mermaid
flowchart LR
  subgraph "struct kfifo (power-of-2 size)"
    BUF["buffer[size]"]
    IN["in offset (enqueue position)"]
    OUT["out offset (dequeue position)"]
    SZ["size (mask = size-1)"]
  end
  IN -->|"modulo size via bitmask"| WRAP["wraps around automatically\nno conditional needed"]
  OUT --> WRAP
  NOTE["invariant: out ≤ in\nfree = size - (in - out)\nused = in - out"]
```

---

## 10. Per-CPU Data and Cache Architecture

Per-CPU data eliminates locks for CPU-local counters and caches by ensuring each processor works on its own copy.

```mermaid
flowchart TD
  subgraph "System with 4 CPUs"
    CPU0["CPU 0\nmy_var @ .data.percpu + 0×base0"]
    CPU1["CPU 1\nmy_var @ .data.percpu + 1×base1"]
    CPU2["CPU 2\nmy_var @ .data.percpu + 2×base2"]
    CPU3["CPU 3\nmy_var @ .data.percpu + 3×base3"]
  end
  ACCESS["get_cpu_var(my_var)\n1. preempt_disable()\n2. smp_processor_id() → cpu_id\n3. &__get_cpu_var + per_cpu_offset[cpu_id]"]
  ACCESS --> CPU0
  ACCESS --> CPU1
  ACCESS --> CPU2
  ACCESS --> CPU3
  CACHE["L1 cache lines:\nEach CPU hits only its own\ndata → no false sharing\n(percpu interface ensures\ncache-line alignment)"]
```

**Why it matters**: Without per-CPU data, a global counter requires an atomic op or spinlock — on a 64-CPU system, the cache line bounces between CPUs (cache thrashing). Per-CPU: each CPU's L1 cache holds its own copy permanently → near-zero overhead.

---

## 11. Timers and Time Management

```mermaid
flowchart TD
  HW_TIMER["Hardware: PIT / HPET / APIC Timer\nfires at HZ frequency (100–1000 Hz)"]
  HW_TIMER --> TI["timer_interrupt()\n(hardirq context)\nincrement jiffies\nincrement xtime (wall clock)\ncheck expired kernel timers"]
  TI --> KT["Kernel Timer subsystem\n(struct timer_list)\nhashed into timer wheels:\ntv1 (soon) → tv2 → tv3 → tv4 → tv5 (far)"]
  KT --> EXP["Expired timers: run handler\nin softirq context (TIMER_SOFTIRQ)"]
  TI --> HR["hrtimer subsystem\n(nanosecond precision)\nred-black tree ordered by expiry"]
```

The **jiffy** is the atomic unit of kernel time (`HZ` jiffies per second). High-resolution timers (`hrtimer`) bypass jiffies entirely, reading hardware directly via `clocksource` abstraction.

---

## 12. Summary: Data Flow Map

```mermaid
flowchart TD
  USR["User Process\n(ring 3, virtual address space)"]
  USR -->|"syscall instruction"| KRN["Kernel\n(ring 0, kernel virtual space)"]
  KRN --> SCH["Scheduler\n(CFS rbtree, vruntime)"]
  KRN --> MEM["Memory Manager\n(buddy + slab + page cache)"]
  KRN --> VFS["VFS Layer\n(dentry, inode, file)"]
  KRN --> IRQ["Interrupt Subsystem\n(top half → bottom half)"]
  KRN --> SYNC["Synchronization\n(spinlock, mutex, RCU, atomic)"]
  SCH -->|"context_switch()"| CPU["CPU Registers + TLB"]
  MEM -->|"alloc_pages()"| PHYS["Physical RAM\n(zones: DMA, NORMAL, HIGHMEM)"]
  VFS -->|"bio submission"| BLK["Block Layer\n(I/O scheduler → DMA)"]
  SYNC -->|"memory barriers"| CPU
  IRQ -->|"softirq / workqueue"| KRN
```

A `read()` may traverse syscall entry, VFS, filesystem and page-cache logic, but the exact path branches on file type, cache state, direct I/O, asynchronous interfaces, filesystem, block stack and architecture. Modern kernels may use XArray rather than the historical radix-tree path. Capture a trace for the named kernel and workload before asserting that BIO, DMA, IRQ or `copy_to_user` occurred.
