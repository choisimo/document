# 시스템 프로그래밍 내부: 메모리 모델, Syscall 및 동시성 프리미티브

> 내부 내용: CPU 메모리 모델의 저장/로드 순서, 시스템 호출이 사용자/커널 경계를 넘는 방법, 뮤텍스와 퓨텍스가 커널에서 차단을 구현하는 방법, Rust의 빌림 검사기가 컴파일 타임에 메모리 안전을 강화하는 방법, POSIX 스레드가 커널 스케줄러 엔터티에 매핑되는 방법.

---

## 1. CPU 메모리 모델: 저장/로드 순서

최신 CPU는 성능을 위해 메모리 작업 순서를 변경합니다. 프로그래머의 순차적 정신 모델은 하드웨어 현실과 일치하지 않습니다.

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

### 기억의 울타리와 장벽

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

## 2. 시스템 호출: 사용자 공간 → 커널 크로싱

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

### vDSO: Syscall 오버헤드 방지

부작용 없이 자주 호출되는 syscall(gettimeofday, clock_gettime)의 경우 Linux는 **vDSO**(가상 동적 공유 개체)를 통해 커널 코드를 사용자 프로세스 주소 공간에 직접 매핑합니다.

```
gettimeofday() call in user space:
  NORMAL: SYSCALL → kernel → read clock → SYSRET (~100ns)
  vDSO:   Call vDSO function directly (no ring switch!)
          Reads time from shared memory page (mapped by kernel)
          ~10ns — 10× faster
```

---

## 3. 뮤텍스 구현: Futex

futex(빠른 사용자 공간 뮤텍스)는 경합이 없는 경우 syscall을 방지합니다.

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

**빠른 경로**: 대기자 없이 잠금/잠금 해제 = 원자 CAS 1개 + 시스템 호출 0개.  
**느린 경로**: 경합이 발생하는 경우에만 syscall이 커널에 들어가 잠자기/깨우기를 수행합니다.

### Spinlock 대 Mutex Tradeoff

```mermaid
flowchart LR
    SPIN["Spinlock\n  while(!CAS(lock,0,1)) { PAUSE }\n  Pros: No context switch overhead\n  Cons: Burns CPU while waiting\n  Use: Short critical sections (<5μs)\n       Under interrupt handlers (no sleep!)"]
    MUTEX["Mutex (via futex)\n  CAS fast path → sleep if contended\n  Pros: Yields CPU to other threads\n  Cons: Context switch overhead (~1-5μs)\n  Use: Long critical sections\n       When contention is common"]
    SPIN --> MUTEX
```

---

## 4. Rust Borrow Checker: 컴파일 타임의 소유권 규칙

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

### 수명 주석: 차용 범위 적용

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

**빌림 검사기는 컴파일 타임에 제거됩니다**:
- Use-after-free: 빌림이 존재하는 동안 소유자가 삭제됨 → 컴파일 오류
- 데이터 경합: 다른 참조가 활성화된 동안 `&mut` 참조 → 컴파일 오류
- 댕글링 참조: 범위를 벗어난 값에 대한 참조 → 컴파일 오류

---

## 5. POSIX 스레드: 커널 매핑 및 스케줄링

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

### 컨텍스트 전환: 저장되는 내용

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

## 6. 메모리 할당자 내부: glibc malloc

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

### TCMalloc: 낮은 경합을 위한 스레드 캐싱

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

## 7. POSIX 파일 I/O: 커널 경로

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

### O_DIRECT: 페이지 캐시 우회

```c
// O_DIRECT: bypass page cache entirely
fd = open("data.bin", O_RDWR | O_DIRECT);
// Requires aligned buffer (aligned to 512 or 4096 bytes)
// Transfers directly: user_buf ↔ disk (via DMA)
// Used by: databases (manage their own cache)
//          backup tools (avoid evicting hot pages)
```

---

## 8. 신호 처리: 전달 및 비동기 안전성

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

## 9. NUMA 아키텍처: 메모리 지역성

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

## 요약: 시스템 프로그래밍 기본 요소

| 원시 | 구현 | 커널 참여 |
|---|---|---|
| 뮤텍스 잠금(비경합) | 사용자 공간의 CAS | 없음(빠른 경로) |
| 뮤텍스 잠금(경합) | 퓨텍스(FUTEX_WAIT) | 예 — 프로세스가 차단되었습니다 |
| 스레드 생성 | 클론(CLONE_VM\|...) | 예 — 새 task_struct |
| 컨텍스트 전환 | 규정 저장, 규정 로드 | 예 — CFS 스케줄러 |
| 메모리 할당(<256B) | 스레드 캐시 LIFO | 없음(tcmalloc) |
| 메모리 할당(대형) | mmap(MAP_ANON) | 예 — 페이지 테이블 업데이트 |
| 파일 읽기(캐시됨) | 페이지 캐시에서 복사 | 최소 |
| 파일 읽기(캐시되지 않음) | 바이오 제출 + 수면 | 예 — I/O 스케줄러 |
| 신호 전달 | 스택 수정 → 핸들러 | 예 — 사용자 모드로 돌아가기 |
| 시스템 호출 | SYSCALL 명령어 | 예 - 링 0 전환 |
