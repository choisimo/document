# Systems Programming Internals: Memory Models, Syscalls & Concurrency Primitives

> Under the Hood: How the CPU memory model orders stores/loads, how system calls cross the user/kernel boundary, how mutexes and futexes implement blocking in the kernel, how Rust's borrow checker enforces memory safety at compile time, how POSIX threads map to kernel scheduler entities.

---

## 1. CPU Memory Model: Store/Load Ordering

Modern CPUs reorder memory operations for performance. The programmer's sequential mental model does not match hardware reality.

```mermaid
flowchart TD
    subgraph "x86-TSO Memory Model"
        CPU1["CPU 1\nStore buffer: [x=1]\n(not yet visible to CPU2!)"]
        CPU2["CPU 2\nStore buffer: [y=1]\n(not yet visible to CPU1!)"]
        L1_1["L1 Cache (CPU1)"]
        L1_2["L1 Cache (CPU2)"]
        LLC["L3 Cache (Shared)"]
        MEM["Main Memory"]
        CPU1 -->|STORE| L1_1
        CPU2 -->|STORE| L1_2
        L1_1 --> LLC --> MEM
        L1_2 --> LLC --> MEM
    end
    subgraph "Classic Reordering Bug (TSO allows)"
        T1["Thread 1:\n  x = 1\n  r1 = y"]
        T2["Thread 2:\n  y = 1\n  r2 = x"]
        RESULT["Possible outcome: r1=0, r2=0\n(both threads read stale value\nbefore other's store drains)\nImpossible on sequential model!"]
        T1 --> RESULT
        T2 --> RESULT
    end
```

### Memory Fences and Barriers

```mermaid
flowchart LR
    MFENCE["MFENCE (x86):\n  Drain store buffer\n  Wait for all pending stores\n  to be globally visible\n  ← → full barrier"]
    SFENCE["SFENCE:\n  Store barrier only\n  (stores ordered before fence\n  visible before stores after)"]
    LFENCE["LFENCE:\n  Load barrier only\n  (serializes loads\n  also prevents speculation)"]
    LOCK["LOCK prefix:\n  Implicit full barrier\n  (LOCK ADD, XCHG, CMPXCHG)\n  → Read-modify-write atomic"]
    MFENCE --> SFENCE
    MFENCE --> LFENCE
    MFENCE --> LOCK
```

---

## 2. System Call: User Space → Kernel Crossing

```mermaid
sequenceDiagram
    participant APP as User Space Process
    participant CPU as CPU Hardware
    participant KERN as Linux Kernel

    APP->>CPU: SYSCALL instruction\n(x86-64: rax=syscall_number\nrdi,rsi,rdx,r10,r8,r9 = args)
    Note over CPU: Save registers to kernel stack\nSwitch CS to kernel segment (ring 0)\nLoad kernel stack pointer\nJump to LSTAR MSR (syscall entry)

    CPU->>KERN: entry_SYSCALL_64:\n  1. Save user regs to pt_regs\n  2. Check seccomp filters\n  3. sys_call_table[rax](args)\n     → e.g., sys_write(fd,buf,count)
    Note over KERN: Execute in kernel mode\n(full memory access, all privileges)
    KERN->>CPU: SYSRET instruction\n  Restore user registers\n  Switch CS back to user segment (ring 3)
    CPU-->>APP: Return value in rax
```

### vDSO: Avoiding Syscall Overhead

For frequently called syscalls with no side effects (gettimeofday, clock_gettime), Linux maps kernel code directly into user process address space via **vDSO** (virtual Dynamic Shared Object):

```
gettimeofday() call in user space:
  NORMAL: SYSCALL → kernel → read clock → SYSRET (~100ns)
  vDSO:   Call vDSO function directly (no ring switch!)
          Reads time from shared memory page (mapped by kernel)
          ~10ns — 10× faster
```

---

## 3. Mutex Implementation: Futex

A futex (fast userspace mutex) avoids syscalls in the uncontended case:

```mermaid
sequenceDiagram
    participant T1 as Thread 1 (holder)
    participant T2 as Thread 2 (waiter)
    participant FUTEX as Kernel Futex Table

    Note over T1: Lock (uncontended):
    T1->>T1: CAS(futex_word, 0, 1)\n[user space — no syscall!]
    Note over T1: Success → lock acquired

    Note over T2: Lock (contended):
    T2->>T2: CAS(futex_word, 0, 1)\nFails! (T1 holds lock)
    T2->>T2: CAS(futex_word, 1, 2)\n(mark contention: value=2)
    T2->>FUTEX: syscall: futex(FUTEX_WAIT, &futex_word, 2)\n[enter kernel, add to wait queue, sleep]

    Note over T1: Unlock:
    T1->>T1: XCHG(futex_word, 0)\nReturns 2 (contended)
    T1->>FUTEX: syscall: futex(FUTEX_WAKE, &futex_word, 1)\n[only needed when contended!]
    FUTEX->>T2: Wake from wait queue
    Note over T2: Retry CAS → acquire lock
```

**Fast path**: Lock/unlock with no waiters = 1 atomic CAS + 0 syscalls.  
**Slow path**: Only when contended, syscall enters kernel to sleep/wake.

### Spinlock vs Mutex Tradeoff

```mermaid
flowchart LR
    SPIN["Spinlock\n  while(!CAS(lock,0,1)) { PAUSE }\n  Pros: No context switch overhead\n  Cons: Burns CPU while waiting\n  Use: Short critical sections (<5μs)\n       Under interrupt handlers (no sleep!)"]
    MUTEX["Mutex (via futex)\n  CAS fast path → sleep if contended\n  Pros: Yields CPU to other threads\n  Cons: Context switch overhead (~1-5μs)\n  Use: Long critical sections\n       When contention is common"]
    SPIN --> MUTEX
```

---

## 4. Rust Borrow Checker: Ownership Rules at Compile Time

```mermaid
flowchart TD
    subgraph "Rust Ownership Rules"
        R1["Rule 1: Each value has exactly one owner\n  let x = String::from('hello');\n  x is owner of heap memory"]
        R2["Rule 2: Owner drop → memory freed\n  (no GC: RAII destructor at scope end\n  → compiler inserts Drop::drop())"]
        R3["Rule 3: Only one &mut ref OR\n  multiple & refs (never both)\n  Enforced at compile time!"]
        R1 --> R2 --> R3
    end
    subgraph "Move vs Copy Semantics"
        MOVE["Move (heap types: String, Vec, Box):\n  let y = x;  // x MOVED to y\n  println!({x}) // ERROR: x moved!\n  → zero-cost, just copy pointer bits"]
        COPY["Copy (stack types: i32, bool, f64, refs):\n  let y = x;  // x COPIED to y\n  println!({x}) // OK: x still valid\n  → impl Copy trait"]
        MOVE --> COPY
    end
```

### Lifetime Annotations: Borrow Scope Enforcement

```mermaid
sequenceDiagram
    participant CODE as Source Code
    participant BC as Borrow Checker

    Note over CODE: fn longest<'a>(x: &'a str, y: &'a str) -> &'a str
    CODE->>BC: What lifetime does the return value have?
    Note over BC: 'a = intersection of lifetimes of x and y\nReturn ref valid as long as BOTH x and y valid
    Note over BC: Verify all call sites:\n  returned ref used only within that intersection
    BC-->>CODE: OK or Error: "does not live long enough"
```

**Borrow checker eliminates at compile time**:
- Use-after-free: owner dropped while borrow exists → compile error
- Data races: `&mut` reference while any other reference active → compile error
- Dangling references: reference to value that left scope → compile error

---

## 5. POSIX Threads: Kernel Mapping and Scheduling

```mermaid
flowchart TD
    subgraph "Thread Implementation: Linux"
        PTHREAD["pthread_create()\n→ clone() syscall:\n  CLONE_VM: share address space\n  CLONE_FS: share file system\n  CLONE_FILES: share file descriptors\n  CLONE_SIGHAND: share signal handlers"]
        TASK["kernel: New task_struct\n(same process, new stack, new TID)\nShares mm_struct (page tables)\nScheduled independently by CFS"]
        SCHED["CFS (Completely Fair Scheduler):\n  vruntime = actual_runtime × (weight_nice0 / weight_this)\n  Always run task with lowest vruntime\n  Red-black tree ordered by vruntime"]
        PTHREAD --> TASK --> SCHED
    end
    subgraph "Thread-Local Storage (TLS)"
        TLS["__thread int x; (C/C++)\nor: thread_local int x; (C++11)\n→ each thread gets own x variable\nAccessed via FS register offset (x86-64)\nFS segment base = thread's TCB address\nx at offset [TCB + N]"]
    end
```

### Context Switch: What Gets Saved

```mermaid
flowchart LR
    subgraph "Registers Saved on Context Switch"
        CALLEE["Callee-saved (compiler):\nrbx, rbp, r12-r15\n(caller responsible for rax, rcx, rdx, rsi, rdi, r8-r11)"]
        SPECIAL["Special registers:\nrip (instruction pointer)\nrsp (stack pointer)\nrflags (condition codes)"]
        FPU["FPU/SIMD (lazy save):\nxmm0-xmm15, ymm0-ymm15\nOnly saved if FPU used since last switch\n(XSAVE instruction — slow, avoid if possible)"]
        CALLEE --> SPECIAL --> FPU
    end
```

---

## 6. Memory Allocator Internals: glibc malloc

```mermaid
flowchart TD
    subgraph "glibc ptmalloc Heap Layout"
        FASTBIN["Fastbins (8-160 bytes):\n  LIFO singly-linked list per size class\n  No coalescing — fastest path\n  Stays in CPU cache (recently freed)"]
        SMALLBIN["Small bins (16-512 bytes):\n  Doubly-linked sorted by size\n  First-fit within size class"]
        LARGEBIN["Large bins (>512 bytes):\n  Sorted by size + address\n  Best-fit with skip list for O(log N) search"]
        TOPCHUNK["Top chunk:\n  Remainder at wilderness\n  Extended via sbrk()/mmap()\n  Coalesce freed chunks into top"]
        FASTBIN --> SMALLBIN --> LARGEBIN --> TOPCHUNK
    end
    subgraph "Chunk Header"
        HEADER["Each allocation has 16-byte header:\n  size | PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA\n  prev_size (if previous chunk free)\nUser data starts here (returned pointer)\nFooter: size repeated (for backward coalescing)"]
    end
```

### TCMalloc: Thread-Caching for Low Contention

```mermaid
flowchart LR
    subgraph "TCMalloc Levels"
        THREAD_CACHE["Thread Cache:\n  Per-thread free lists (0-256KB)\n  No locks needed!\n  256 size classes (8B, 16B, 32B...)"]
        CENTRAL_CACHE["Central Cache:\n  Spans of pages\n  Lock only when thread cache empty/full\n  Transfer batch of objects at once"]
        PAGE_HEAP["Page Heap:\n  mmap() from OS\n  256KB+ allocations bypass thread cache\n  Pagemap: addr → span metadata"]
        THREAD_CACHE --> CENTRAL_CACHE --> PAGE_HEAP
    end
```

---

## 7. POSIX File I/O: Kernel Paths

```mermaid
sequenceDiagram
    participant APP as Application
    participant VFS as VFS Layer
    participant FS as ext4 Filesystem
    participant BCACHE as Block Cache (page cache)
    participant DISK as NVMe SSD

    APP->>VFS: read(fd, buf, 4096)
    VFS->>BCACHE: Lookup page cache:\n  (inode, page_offset) → page?
    BCACHE->>VFS: Cache HIT → copy to user buf
    VFS-->>APP: Returns 4096 bytes (no I/O!)

    Note over APP: Cache MISS scenario:
    VFS->>FS: readpage(inode, page_index)
    FS->>DISK: bio_submit (block number)
    Note over APP: Process sleeps (IO_WAIT)
    DISK-->>FS: DMA transfer → page cache page
    FS->>BCACHE: Page ready
    BCACHE->>VFS: copy_to_user(buf, page)
    VFS-->>APP: Returns (woken up)
```

### O_DIRECT: Bypassing Page Cache

```c
// O_DIRECT: bypass page cache entirely
fd = open("data.bin", O_RDWR | O_DIRECT);
// Requires aligned buffer (aligned to 512 or 4096 bytes)
// Transfers directly: user_buf ↔ disk (via DMA)
// Used by: databases (manage their own cache)
//          backup tools (avoid evicting hot pages)
```

---

## 8. Signal Handling: Delivery and Async-Safety

```mermaid
sequenceDiagram
    participant APP as User Process
    participant KERN as Kernel
    participant HANDLER as Signal Handler

    Note over APP: Running user code
    KERN->>APP: Deliver SIGINT:\n  1. Save user register state to stack\n  2. Modify stack to call signal handler\n  3. Return to signal handler
    Note over KERN,APP: Push signal frame on user stack:\n  pt_regs (saved registers)\n  signal info\n  ucontext (FPU state)
    APP->>HANDLER: Execute SIGINT handler
    Note over HANDLER: ASYNC-SIGNAL-SAFE functions only!\n  (malloc is NOT safe: re-entrant deadlock)\n  Safe: write(), _exit(), signal(), kill()\nUnsafe: printf(), malloc(), pthread_mutex_lock()
    HANDLER->>APP: sigreturn() syscall\n  → kernel restores registers from stack
    Note over APP: Resume from exact instruction\nwhere SIGINT was delivered
```

---

## 9. NUMA Architecture: Memory Locality

```mermaid
flowchart TD
    subgraph "NUMA System (2-socket server)"
        NODE0["NUMA Node 0\nCPU 0-15\nLocal RAM: 64GB\n(Access: ~70ns)"]
        NODE1["NUMA Node 1\nCPU 16-31\nLocal RAM: 64GB\n(Access: ~70ns)"]
        INTERCO["QPI/UPI Interconnect\n(Remote access: ~140ns\n= 2× penalty!)"]
        NODE0 <--> INTERCO <--> NODE1
    end
    subgraph "NUMA-Aware Allocation"
        POLICY["numactl --membind=0 ./process\n  Allocate memory only on node 0\n  (process pinned to node 0 CPUs)\n→ Always local access, no cross-node\nnuma_alloc_local(): first-touch policy"]
    end
```

---

## Summary: Systems Programming Primitives

| Primitive | Implementation | Kernel Involvement |
|---|---|---|
| Mutex lock (uncontended) | CAS in user space | None (fast path) |
| Mutex lock (contended) | futex(FUTEX_WAIT) | Yes — process blocked |
| Thread create | clone(CLONE_VM\|...) | Yes — new task_struct |
| Context switch | save regs, load regs | Yes — CFS scheduler |
| Memory alloc (<256B) | Thread cache LIFO | None (tcmalloc) |
| Memory alloc (large) | mmap(MAP_ANON) | Yes — page table update |
| File read (cached) | copy from page cache | Minimal |
| File read (uncached) | bio submit + sleep | Yes — I/O scheduler |
| Signal delivery | Modify stack → handler | Yes — return to usermode |
| System call | SYSCALL instruction | Yes — ring 0 transition |
