# Operating Systems Internals: Kernel Data Structures and Scheduling

> **Under the Hood** — How the kernel manages processes, schedules threads, handles memory, and services I/O requests. Internals of task_struct, the CFS scheduler, virtual memory areas, page fault handling, VFS inode/dentry caches, and system call dispatch. Sources: *Understanding the Linux Kernel* (Bovet & Cesati), *Operating System Concepts* (Silberschatz/Galvin — "Dinosaur Book"), *The Linux Programming Interface* (Kerrisk), *Learning the UNIX Operating System*.

---

## Scope, Kernel Version, and Validation Contract

This document uses Linux to illustrate operating-system mechanisms. Kernel structures, scheduler policies, field counts, trees, thresholds, and call paths are implementation details tied to a source revision and build configuration.

- **Scope:** Record kernel release or commit, architecture, configuration, scheduler and cgroup settings, filesystem, storage device, CPU topology, page size, and enabled mitigations.
- **Model boundary:** Separate general OS concepts such as virtual memory and scheduling from Linux-specific structures such as `task_struct`, VMA indexes, VFS caches, and allocator metadata.
- **Numeric assumptions:** Timeslices, priorities, object sizes, cache counts, pipe capacities, and latency ranges vary with version, hardware, load, and instrumentation. Treat them as examples unless measured in the named environment.
- **Evidence and uncertainty:** Confirm a proposed path with the matching source, symbols, tracepoints, counters, and call traces. A sampled stack or single counter supports a hypothesis but does not uniquely identify causality.
- **Failure and completion:** Include memory pressure, races, signal interruption, I/O errors, starvation, priority inversion, and partial initialization. A claim is complete when its invariant and failure path are reproduced on the recorded kernel build.

---

## 1. Linux Kernel Process Model: task_struct

Each Linux task is represented by a `task_struct`. Its fields, size, layout, and enabled members depend on the kernel revision, architecture, and build configuration; “about 1000 fields” is only an illustrative source snapshot.

```mermaid
flowchart TD
    subgraph TASK_STRUCT["task_struct (partial)"]
        STATE["state: TASK_RUNNING | TASK_INTERRUPTIBLE\n| TASK_UNINTERRUPTIBLE | TASK_ZOMBIE"]
        PID["pid: pid_t  (process ID)\ntgid: pid_t (thread group ID = main thread's pid)"]
        PARENT["real_parent: *task_struct\nparent: *task_struct\nchildren: list_head\nsibling: list_head"]
        MM["mm: *mm_struct\n(process memory descriptor\nor NULL for kernel threads)"]
        FILES["files: *files_struct\n(file descriptor table)"]
        SIGNALS["sighand: *sighand_struct\nsignal: *signal_struct\npending: sigpending"]
        SCHED_INFO["sched_entity se\npolicy: SCHED_NORMAL | SCHED_FIFO | SCHED_RR\nprio: int (nice value -20..+19 mapped to 0..139)"]
        CREDS["cred: *cred\n(uid, gid, capabilities, LSM labels)"]
    end
    STATE & PID & PARENT & MM & FILES & SIGNALS & SCHED_INFO & CREDS
```

### Process State Machine

```mermaid
stateDiagram-v2
    [*] --> CREATED: fork() / clone()
    CREATED --> RUNNING: scheduler selects
    RUNNING --> READY: preempted (timer IRQ\nor higher-prio task)
    READY --> RUNNING: scheduler selects
    RUNNING --> SLEEPING_I: wait for I/O\nor event (interruptible)
    RUNNING --> SLEEPING_U: kernel wait\n(uninterruptible)
    SLEEPING_I --> READY: event arrives\nor signal received
    SLEEPING_U --> READY: I/O complete
    RUNNING --> ZOMBIE: exit() called\nparent not wait()ed yet
    RUNNING --> STOPPED: SIGSTOP / SIGTSTP
    STOPPED --> READY: SIGCONT
    ZOMBIE --> [*]: parent calls wait()
```

---

## 2. CFS Scheduler: Completely Fair Scheduler Internals

> Scheduler data structures and selection rules change across kernel revisions. Treat this as a representative path and verify it against the exact source and configuration being analyzed.

```mermaid
flowchart TD
    subgraph CFS_INTERNALS["CFS Scheduler (kernel/sched/fair.c)"]
        RB_TREE["Per-CPU rq.cfs_rq.tasks_timeline\nRed-black tree ordered by vruntime\nO(log N) enqueue/dequeue"]
        VRUNTIME["vruntime = virtual runtime\n= actual_runtime × (NICE_0_LOAD / weight)\nLower-prio tasks accumulate vruntime faster\nAlways schedule leftmost node (lowest vruntime)"]
        SCHED_LAT["sched_latency_ns = 6ms (default)\n= scheduling period for all runnable tasks\nTime slice per task = sched_latency / nr_running"]
        MIN_GRAN["sched_min_granularity_ns = 0.75ms\nFloor on time slice\n(prevents starvation with many tasks)"]
    end
    subgraph WAKEUP["Wakeup Preemption"]
        WAKE["Task wakes up after sleeping\nvruntime catchup:\n  vruntime = max(vruntime, min_vruntime - sched_latency)\nPreempt current if new task's vruntime\n< current.vruntime - sched_min_granularity"]
    end
    RB_TREE --> VRUNTIME --> SCHED_LAT --> MIN_GRAN
```

### CFS Timer Interrupt Flow

```mermaid
sequenceDiagram
    participant HW as Hardware Timer (HPET/LAPIC)
    participant IRQ as IRQ Handler
    participant CFS as CFS Scheduler
    participant SWITCH as Context Switch

    HW->>IRQ: Timer interrupt (every ~1ms tick or tickless)
    IRQ->>CFS: update_curr(cfs_rq)
    CFS->>CFS: delta_exec = now - curr.exec_start
    CFS->>CFS: curr.vruntime += delta_exec × (NICE_0_LOAD / curr.weight)
    CFS->>CFS: check_preempt_tick: vruntime > ideal_runtime?
    
    alt Preempt condition met
        CFS->>IRQ: set_tsk_need_resched(curr)
        IRQ->>SWITCH: schedule() called
        SWITCH->>SWITCH: pick_next_task: leftmost rbtree node
        SWITCH->>SWITCH: context_switch:\n  switch_mm (CR3 reload if different process)\n  switch_to (__switch_to: save/restore regs)
    end
```

---

## 3. Virtual Memory: mm_struct and VMA Tree

> `mm_struct` is stable terminology, but the data structure used to index VMAs is kernel-version specific; do not infer a particular tree implementation from the conceptual diagram alone.

```mermaid
flowchart TD
    subgraph MM_STRUCT["mm_struct (process memory descriptor)"]
        MMAP["mmap: *vm_area_struct\nLinked list + rbtree of VMAs"]
        MM_MMAP_TREE["mm_rb: rb_root\nRed-black tree for fast VMA lookup"]
        PGD["pgd: pgd_t*\nPointer to page global directory\n(loaded into CR3 on context switch)"]
        MM_STATS["total_vm: unsigned long\nrss: resident set size\nmmap_sem: rwsemaphore"]
    end
    subgraph VMA["vm_area_struct (one per mapping)"]
        VM_START["vm_start: unsigned long\nvm_end: unsigned long"]
        VM_FLAGS["vm_flags: VM_READ | VM_WRITE | VM_EXEC\n| VM_SHARED | VM_MAYWRITE"]
        VM_FILE["vm_file: *file\n(NULL for anonymous mappings)"]
        VM_PGOFF["vm_pgoff: unsigned long\noffset in file (in pages)"]
        VM_OPS["vm_ops: *vm_operations_struct\n.fault, .map_pages, .close"]
    end
    MM_STRUCT --> VMA
```

### Process Address Space Layout (x86-64 Linux)

```mermaid
flowchart TD
    subgraph VAS["Virtual Address Space (128TB user space)"]
        KERNEL["0xFFFF800000000000 +\nKernel virtual address space\n(not user-accessible)"]
        STACK["0x7FFFFFFFFFFF\n↓ Stack grows down\nMain thread stack (8MB default)"]
        MMAP_REGION["Memory-mapped region\nmmap() calls, .so libraries\nThread stacks"]
        HEAP["Heap\nbrk() / mmap(MAP_ANON)\nmalloc allocates here"]
        BSS["BSS segment\nUninit globals (zero pages)"]
        DATA["Data segment\nInitialized globals"]
        TEXT["0x400000\nText segment\nRead-only code"]
    end
```

---

## 4. Page Fault Handler: Demand Paging Internals

```mermaid
sequenceDiagram
    participant CPU
    participant MMU
    participant PF as do_page_fault()
    participant VMA_FIND as find_vma()
    participant FAULT as handle_mm_fault()
    participant SWAP as Swap/File I/O

    CPU->>MMU: Access virtual address va
    MMU->>MMU: PTE.Present = 0
    MMU->>CPU: #PF exception (error_code: write, user/kernel)
    CPU->>PF: do_page_fault(regs, error_code)
    PF->>VMA_FIND: find_vma(mm, va)
    
    alt va not in any VMA
        VMA_FIND-->>PF: NULL
        PF->>CPU: SIGSEGV
    end
    
    alt Permission violation (write to read-only VMA)
        PF->>CPU: SIGSEGV
    end
    
    PF->>FAULT: handle_mm_fault(vma, va, flags)
    
    alt Anonymous page (stack/heap)
        FAULT->>FAULT: Allocate physical frame (alloc_page)
        FAULT->>FAULT: Zero-fill page (security)
        FAULT->>FAULT: Update PTE: physical addr | Present | RW
    end
    
    alt File-backed page (mmap of .so or file)
        FAULT->>SWAP: Read page from file/swap
        SWAP-->>FAULT: Page data in page cache
        FAULT->>FAULT: Update PTE
    end
    
    alt Copy-on-Write (fork child writes)
        FAULT->>FAULT: Allocate new frame
        FAULT->>FAULT: Copy parent's page
        FAULT->>FAULT: Update child PTE to new frame | RW
        FAULT->>FAULT: Update parent PTE: clear dirty (refcount--if 1, just make RW)
    end
    
    FAULT-->>CPU: Return, retry faulting instruction
```

---

## 5. File System: VFS Inode/Dentry Cache

```mermaid
flowchart TD
    subgraph VFS["Virtual File System Layer"]
        SYSCALL["open(path, flags) system call"]
        NAMEI["path_lookup / filename_lookup\nWalks dentry cache"]
        DCACHE["Dentry Cache (dcache)\nHashtable: {parent_inode, name} → dentry\n~O(1) lookup for cached paths"]
        ICACHE["Inode Cache\nRB-tree: inode number → inode struct\nContains: size, mtime, uid, gid, block map"]
        FILE_OBJ["struct file\nf_pos (seek position)\nf_op (read, write, mmap ops)\nf_inode pointer"]
        FD_TABLE["process fd table\nfd[0]=stdin, fd[1]=stdout,\nfd[2]=stderr, fd[n]=file*"]
    end
    subgraph CONCRETE_FS["Concrete FS (ext4/xfs/btrfs)"]
        EXT4_INODE["ext4 inode\nDirect blocks: 12 × 4KB = 48KB\nIndirect block: 12+1024 blocks\nDouble indirect: 12+1024+1024²\nExtent tree (modern)"]
    end
    SYSCALL --> NAMEI --> DCACHE --> ICACHE --> FILE_OBJ --> FD_TABLE
    ICACHE --> CONCRETE_FS
```

### read() System Call: Path from Syscall to Disk

```mermaid
sequenceDiagram
    participant APP as Application
    participant KERN as Kernel (VFS)
    participant PAGECACHE as Page Cache
    participant BLOCK as Block Layer
    participant DISK as NVMe / HDD

    APP->>KERN: read(fd, buf, count)
    KERN->>KERN: copy fd → file* → inode*
    KERN->>KERN: file->f_op->read_iter()
    KERN->>PAGECACHE: find_get_page(mapping, page_index)
    
    alt Page in cache
        PAGECACHE-->>KERN: struct page* (data ready)
        KERN->>APP: copy_to_user(buf, page_data, count)
    end
    
    alt Page not in cache (cache miss)
        PAGECACHE->>KERN: miss
        KERN->>PAGECACHE: add_to_page_cache_locked(new_page)
        KERN->>BLOCK: submit_bio(BIO_READ, sector, page)
        BLOCK->>BLOCK: I/O scheduler: merge + reorder requests
        BLOCK->>DISK: NVMe queue submission
        DISK-->>BLOCK: DMA complete, interrupt
        BLOCK->>KERN: bio_end_io callback
        KERN->>KERN: unlock page, wake waiters
        KERN->>APP: copy_to_user()
    end
```

---

## 6. System Call Dispatch: User Space → Kernel

```mermaid
flowchart TD
    subgraph USER["User Space"]
        LIBC_FUNC["libc: read(fd, buf, count)"]
        SYSCALL_INSTR["SYSCALL instruction (x86-64)\nor INT 0x80 (legacy 32-bit)"]
        LIBC_FUNC --> SYSCALL_INSTR
    end
    subgraph KERNEL["Kernel Mode Transition"]
        SWAPGS["SWAPGS: swap GS with MSR_KERNEL_GS_BASE\n(load kernel per-CPU data)"]
        SAVE_REGS["Save user regs to kernel stack\n(pt_regs structure)"]
        LOOKUP["syscall_table[rax]\nRax = syscall number (e.g., 0=read, 1=write)"]
        DISPATCH["Call sys_read / sys_write / etc."]
        RESTORE["Restore user regs\nSWAPGS again\nSYSRET instruction"]
        SWAPGS --> SAVE_REGS --> LOOKUP --> DISPATCH --> RESTORE
    end
    SYSCALL_INSTR --> SWAPGS
    RESTORE --> USER
```

### Syscall Entry via VDSO (Virtual Dynamic Shared Object)

```mermaid
flowchart LR
    GETTIMEOFDAY["gettimeofday() in user code"]
    VDSO_PAGE["VDSO page\n(mapped by kernel into every process)\nContains: clock_gettime, gettimeofday, vgettimeofday\nReads directly from kernel-exported vsyscall page"]
    CLOCKSOURCE["Kernel clocksource\n(TSC, HPET)\nUpdated by kernel, mapped read-only to user"]
    NO_SYSCALL["No kernel mode transition!\nDirect memory read from vsyscall area\n~20 cycles vs 1000 cycles for real syscall"]
    GETTIMEOFDAY --> VDSO_PAGE --> CLOCKSOURCE --> NO_SYSCALL
```

---

## 7. IPC Mechanisms: Pipes, Sockets, Shared Memory

```mermaid
flowchart TD
    subgraph PIPE["Anonymous Pipe"]
        WRITE_END["fd[1]: write end\nfile→inode→pipe_inode_info"]
        RING_BUF["Kernel ring buffer\n65536 bytes (16 pages)\nCircular buffer of struct pipe_buffer"]
        READ_END["fd[0]: read end\nBlocks in TASK_INTERRUPTIBLE if empty"]
        WRITE_END --> RING_BUF --> READ_END
    end
    subgraph SOCKET["Unix Domain Socket"]
        SRV_SOCK["Server socket\nunix_proto_ops\nbind path in /tmp/"]
        CLI_SOCK["Client socket\nconnect() to path"]
        SK_BUFF["sk_buff chain\nSocket kernel buffer\nskmem_alloc"]
        SRV_SOCK <--> SK_BUFF <--> CLI_SOCK
    end
    subgraph SHM["POSIX Shared Memory"]
        SHM_OPEN["shm_open(): creates tmpfs file\nin /dev/shm/"]
        MMAP_BOTH["Both processes mmap() same file\nPTEs in both mm_structs\npoint to same physical pages"]
        SEM["sem_post/wait\nfutex in shared memory\nfor synchronization"]
        SHM_OPEN --> MMAP_BOTH --> SEM
    end
```

---

## 8. Linux Kernel Synchronization Primitives

```mermaid
flowchart TD
    subgraph SPIN["Spinlocks (spin_lock/spin_unlock)"]
        SP_IMPL["Atomic test-and-set on ticket\nBusy-waits (polling)\nNO sleep allowed\nUsed in interrupt context\nor critical sections < few µs"]
        SP_IRQ["spin_lock_irqsave:\nAlso disables interrupts\nPrevents IRQ handler deadlock"]
    end
    subgraph MUTEX["Mutex (mutex_lock/unlock)"]
        MX_IMPL["Sleeping lock\nPuts contending task in TASK_UNINTERRUPTIBLE\nContext switch to another task\nWakeup when lock released\nOptimistic spinning before sleeping (adaptive)"]
    end
    subgraph RCU["RCU (Read-Copy-Update)"]
        RCU_IMPL["Readers: rcu_read_lock/unlock\nZero-overhead (just preempt disable)\nWriters:\n  1. Copy old object\n  2. Modify copy\n  3. Atomic pointer swap (rcu_assign_pointer)\n  4. synchronize_rcu(): wait for all old readers\n  5. Free old object"]
        RCU_USE["Used for: networking (struct sock),\nrouting tables, VFS dentry cache\nRead-heavy workloads: readers never block"]
    end
    subgraph SEMAPHORE["Semaphore (down/up)"]
        SEM_IMPL["Counting semaphore\ndown(): decrement count, sleep if 0\nup(): increment count, wake waiter\nUsed for: access count limits\n(e.g., max N concurrent requests)"]
    end
```

---

## 9. Memory Allocators: slab/slub Allocator Internals

```mermaid
flowchart TD
    subgraph PAGE_ALLOC["Buddy System (page allocator)"]
        BUDDY["buddy_system:\nFree pages grouped in 2^order blocks\nAlloc 2^n pages: find smallest suitable block\nSplit larger blocks\nMerge free buddies on free"]
        ORDER["Order 0 = 4KB (1 page)\nOrder 1 = 8KB (2 pages)\n...\nOrder 11 = 8MB (2048 pages)"]
    end
    subgraph SLAB["SLAB/SLUB Allocator (kmalloc)"]
        SLUB_CACHE["kmem_cache for each object size\n(e.g., task_struct, dentry, sk_buff)"]
        SLAB_PER_CPU["Per-CPU slab freelist\nLock-free fast path\nNo global lock for common case"]
        PARTIAL["Partial pages list\nPages with some free slots\nFilled from global list when per-CPU empty"]
        FULL["Full pages list\nAll slots allocated"]
        SLUB_CACHE --> SLAB_PER_CPU --> PARTIAL --> FULL
    end
    subgraph BUDDY_TO_SLAB["Integration"]
        CONNECT["slab allocates buddy pages\nSlices them into fixed-size objects\nkmalloc(size) → find appropriate kmem_cache\nPop from freelist (O(1))"]
    end
    PAGE_ALLOC --> SLAB
    SLAB --> BUDDY_TO_SLAB
```

---

## 10. Process Creation: fork() and exec() Internals

```mermaid
sequenceDiagram
    participant PARENT
    participant KERNEL
    participant CHILD

    PARENT->>KERNEL: fork() / clone()
    KERNEL->>KERNEL: Allocate task_struct (from slab)
    KERNEL->>KERNEL: Copy mm_struct (shallow: CoW)
    Note over KERNEL: All PTEs marked read-only\nfor CoW page sharing
    KERNEL->>KERNEL: Copy file descriptor table (dup fds)
    KERNEL->>KERNEL: Copy signal handlers
    KERNEL->>KERNEL: Assign new PID
    KERNEL-->>CHILD: Return 0 (child)
    KERNEL-->>PARENT: Return child PID

    CHILD->>KERNEL: execve("/bin/ls", argv, envp)
    KERNEL->>KERNEL: Open ELF binary
    KERNEL->>KERNEL: Load PT_LOAD segments → new VMAs
    KERNEL->>KERNEL: Map ld.so (program interpreter)
    KERNEL->>KERNEL: Setup new stack (argv, envp, auxv)
    KERNEL->>KERNEL: Reset signal handlers
    KERNEL->>KERNEL: Replace mm (munmap old address space)
    KERNEL-->>CHILD: Jump to ld.so entry point
```

---

## 11. Linux Scheduling Classes (Priority Order)

```mermaid
flowchart TD
    subgraph SCHED_CLASSES["Scheduling Classes (stop → dl → rt → cfs → idle)"]
        STOP["stop_sched_class\nHighest priority\nMigration threads\nstop_machine() calls"]
        DL["dl_sched_class (SCHED_DEADLINE)\nEDF: earliest deadline first\nBandwidth admission control\nReal-time tasks with deadlines"]
        RT["rt_sched_class (SCHED_FIFO, SCHED_RR)\nFixed priority 1-99\nRuns until yields/blocks\nPre-empts all lower classes"]
        CFS["fair_sched_class (SCHED_NORMAL, SCHED_BATCH)\nCFS with vruntime rbtree\nMost user processes"]
        IDLE["idle_sched_class\nCPU idle loop\nhlt instruction\nC-states for power saving"]
        STOP --> DL --> RT --> CFS --> IDLE
    end
```

---

## 12. Kernel Module Loading: insmod Internals

```mermaid
sequenceDiagram
    participant USER as insmod/modprobe
    participant KERNEL
    participant VERIFIER

    USER->>KERNEL: init_module(module_image, len, params)
    KERNEL->>KERNEL: Allocate kernel memory (vmalloc)
    KERNEL->>KERNEL: Copy module ELF from user space
    KERNEL->>VERIFIER: Verify ELF (magic, sections)
    KERNEL->>KERNEL: Apply relocations (R_X86_64_PC32 etc.)
    KERNEL->>KERNEL: Resolve symbols from kernel symbol table
    Note over KERNEL: ksymtab: exported symbols (EXPORT_SYMBOL)
    KERNEL->>KERNEL: Check module license (GPL required for some symbols)
    KERNEL->>KERNEL: Run module->init() function
    KERNEL->>KERNEL: Register in modules list
    KERNEL-->>USER: 0 (success)
```
