# Systems Performance — Under the Hood
> Based on *Systems Performance: Enterprise and the Cloud, 2nd Edition* by Brendan Gregg

## Measurement contract

- Start with a user-visible objective and time window, then name the resource, workload, host/container boundary and baseline.
- Utilization, saturation and errors are signals, not verdicts. Correlate them with latency distributions, throughput, queueing and application traces.
- Tool availability and field meaning depend on kernel, hardware, privileges, namespaces and sampling frequency. Record command, version, filters and loss counters.
- A diagnosis is complete only when a controlled change predicts and produces the expected metric and user-impact change, with an explicit rollback condition.

This document maps representative system-performance mechanisms and observability paths. BPF/eBPF and hardware counters provide sampled or instrumented evidence; they do not automatically expose every latency source exactly.

---

## 1. The USE Method: Resource Utilization Mental Model

The **USE Method** (Utilization, Saturation, Errors) is a checklist for examining resources. A resource can have multiple candidate measures for each category, and the three categories do not replace workload- and application-level evidence.

```mermaid
flowchart TD
  subgraph "USE Method for Every Resource"
    R["Resource\n(CPU, Memory, Disk, Network, Bus)"]
    U["Utilization\n= time busy / elapsed time\n100% → bottleneck candidate"]
    S["Saturation\n= queued or delayed work\n(queue depth, wait time)\ncompare sustained level with baseline/SLO"]
    E["Errors\n= failed operations\n(retransmits, ECC errors, malloc failures)\nNon-zero → investigate"]
    R --> U
    R --> S
    R --> E
  end
```

### USE Method Resource Matrix

```mermaid
flowchart LR
  subgraph "Hardware Resources"
    CPU["CPU\nU: %busy\nS: run queue length\nE: machine check exceptions"]
    MEM["Memory\nU: used/total\nS: page scanning rate\nE: OOM kills, malloc failures"]
    DISK["Disk\nU: %util (iostat)\nS: await time, I/O queue depth\nE: disk errors (hard/soft)"]
    NET["Network Interface\nU: throughput/bandwidth\nS: overruns, retransmit\nE: interface errors"]
    BUS["CPU Interconnect / PCIe\nU: bus throughput / max\nS: memory stall cycles\nE: parity errors"]
  end
  subgraph "Software Resources"
    MUTEX["Mutex\nU: lock held time\nS: threads queued on lock\nE: deadlocks"]
    TP["Thread Pool\nU: threads busy\nS: request queue depth\nE: rejected requests"]
    FD["File Descriptors\nU: open FDs / limit\nS: threads blocked on allocation\nE: EMFILE errors"]
  end
```

### Queueing Theory: Why 60% Utilization Matters

```mermaid
flowchart TD
  subgraph "M/M/1 Queue Model"
    λ["λ = arrival rate"]
    μ["μ = service rate"]
    ρ["ρ = λ/μ = utilization"]
    W["Mean wait time W = ρ / (μ(1-ρ))"]
    λ --> ρ
    μ --> ρ
    ρ --> W
  end
  NOTE["At ρ=0.6: wait = 1.5× service time\nAt ρ=0.8: wait = 4× service time\nAt ρ=0.9: wait = 9× service time\nAt ρ→1.0: wait → ∞"]
  W --> NOTE
```

This is why 60% utilization is a practical ceiling: beyond it, queue wait times grow **superlinearly** and hide bursts of 100% utilization within measurement intervals.

---

## 2. CPU Architecture: Pipelines, Caches, and the Scheduler

### CPU Hardware Pipeline

```mermaid
flowchart LR
  subgraph "Modern Out-of-Order CPU Core"
    IF["Instruction Fetch\n(L1-I cache)"]
    DC["Decode\n(uop dispatch)"]
    EX["Execute\n(multiple ALU/FPU units)"]
    ROB["Reorder Buffer\n(commit in-order)"]
    L1D["L1 Data Cache\n(~32KB, 4 cycles)"]
    L2["L2 Cache\n(~256KB, 12 cycles)"]
    L3["L3 LLC\n(shared, ~16MB, 40 cycles)"]
    RAM["DRAM\n(100–300 cycles)"]
    IF --> DC --> EX --> ROB
    EX <--> L1D
    L1D <--> L2
    L2 <--> L3
    L3 <--> RAM
  end
```

### CPU Run Queue (CFS Scheduler) Internal State

```mermaid
flowchart TD
  subgraph "Per-CPU struct rq"
    RBT["CFS rbtree\n(ordered by vruntime)\nleftmost = next to run"]
    RT_Q["RT run queue\n(FIFO/RR, preempts CFS)"]
    DL_Q["Deadline queue\n(EDF, preempts RT)"]
    CURR["curr pointer\n→ currently running task_struct"]
    NR["nr_running count"]
  end
  subgraph "vruntime accounting"
    V["vruntime delta =\nactual_ns × (NICE_0_LOAD / weight)\nHigh priority → lower weight\n→ vruntime grows slowly\n→ stays left on rbtree\n→ picked more often"]
  end
  RBT --> CURR
  CURR --> V
```

### Run Queue Latency (runqlat) — What It Measures

```mermaid
sequenceDiagram
  participant T as Thread (TASK_RUNNING)
  participant RQ as Run Queue (rbtree)
  participant CPU as CPU (running)

  T->>RQ: wake_up() → enqueue_task_fair()\nrecord rq_clock timestamp
  note over RQ: Thread waits here\n= run queue latency (measured by runqlat)
  RQ->>CPU: schedule() → pick_next_task_fair()\ndequeue leftmost node
  CPU->>CPU: context_switch → thread runs
  note over CPU: on-CPU time (measured by CPU profilers)
  CPU->>RQ: preempt or yield → enqueue again
```

Run queue latency is a critical metric missed by CPU utilization alone. A CPU at 15% utilization can still have threads waiting 10ms+ if the scheduler is thrashing or one thread monopolizes time slices.

---

## 3. CPU Observability: Flame Graphs and BPF

### Flame Graph Anatomy

```mermaid
flowchart TD
  subgraph "CPU Flame Graph Structure"
    TOP["Widest frames at top = most CPU time\neach frame = function in call stack"]
    BOT["Bottom frame = entry point (e.g., start_thread)"]
    W["Width proportional to\nsampled CPU time in that function\n(and all callees)"]
    COL["Color = language/type\nred/orange = native C\ngreen = Java JIT\nyellow = kernel"]
  end
  TOP --> W
  W --> NOTE["Towers: deep call stacks\nPlateaus: CPU-bound hot functions\nFlat tops: leaf functions spending time"]
```

### Off-CPU vs. On-CPU Time Partitioning

```mermaid
flowchart LR
  subgraph "Thread Time Budget (100%)"
    ON["On-CPU time\n(CPU flame graph)\nprofile:hz:99 → stack samples"]
    OFF["Off-CPU time\n(Off-CPU flame graph)\nsched:sched_switch → wait durations"]
    LOCK["Off-CPU: waiting on mutex/semaphore"]
    IO["Off-CPU: waiting on I/O (futex, read)"]
    SCHED["Off-CPU: preempted, waiting in run queue"]
  end
  ON --> OFF
  OFF --> LOCK
  OFF --> IO
  OFF --> SCHED
```

The off-CPU stack trace for a MySQL binary log sync:
```
finish_task_switch → schedule → jbd2_log_wait_commit → ext4_sync_file
→ vfs_fsync_range → MYSQL_BIN_LOG::sync_binlog_file()
```
This reveals that MySQL off-CPU time is dominated by **ext4 journal commits**, not lock contention or CPU starvation.

### BPF/eBPF Observability Architecture

```mermaid
flowchart TD
  subgraph "BPF Execution Model"
    PROG["BPF Program\n(C-like, compiled to BPF bytecode)"]
    VER["Kernel BPF Verifier\n(safety check: no loops, bounded memory)"]
    JIT["JIT Compiler\n(bytecode → native x86-64 instructions)"]
    HOOK["Attachment Point\n(kprobe, tracepoint, uprobe, perf_event)"]
    MAP["BPF Maps\nhash, array, ring buffer\n(kernel ↔ userspace IPC)"]
  end
  PROG --> VER --> JIT --> HOOK
  HOOK -->|"fires on event"| MAP
  MAP -->|"read by"| USR["Userspace tool\n(bpftrace, BCC)"]
```

### Key BPF Tracepoints for Performance Analysis

```mermaid
flowchart LR
  subgraph "Scheduler Tracepoints"
    SW["sched:sched_switch\n→ context switch events\n→ off-CPU time start"]
    WK["sched:sched_wakeup\n→ thread woken from sleep\n→ wakeup latency start"]
    MG["sched:sched_migrate_task\n→ NUMA imbalance detection"]
  end
  subgraph "Syscall Tracepoints"
    SE["syscalls:sys_enter_*\n→ syscall entry with args"]
    SX["syscalls:sys_exit_*\n→ return value, duration"]
  end
  subgraph "Block I/O Tracepoints"
    BQ["block:block_rq_insert\n→ request enters queue"]
    BC["block:block_rq_complete\n→ I/O done, latency = complete - insert"]
  end
```

---

## 4. Memory Architecture: From Process to Physical Page

### Linux Virtual Memory Layout (x86-64)

```mermaid
block-beta
  columns 1
  A["0xFFFFFFFFFFFFFFFF\nKernel Space\n(128 TB: direct map, vmalloc, modules)"]
  B["0xFFFF800000000000\n(Canonical hole — unmapped)"]
  C["0x00007FFFFFFFFFFF\nUser Space (128 TB)\n(stack↓, mmap region, heap↑, text/data)"]
  D["0x0000000000000000"]
```

### Page Fault State Machine

```mermaid
stateDiagram-v2
  [*] --> ACCESS: process accesses virtual address
  ACCESS --> TLB_HIT: TLB has mapping → hardware walks
  TLB_HIT --> DATA: page in physical RAM → ~1ns
  ACCESS --> TLB_MISS: TLB miss → hardware page table walk
  TLB_MISS --> PTE_PRESENT: PTE present bit set
  PTE_PRESENT --> DATA: page in RAM → ~10ns (L3 cache miss)
  TLB_MISS --> PAGE_FAULT: PTE not present → kernel page fault handler
  PAGE_FAULT --> MINOR: page in swap cache / COW / zero page
  PAGE_FAULT --> MAJOR: page on disk (swap or file-backed)
  MINOR --> DATA: ~microseconds
  MAJOR --> DISK_IO: swap_readpage() / filemap_fault()
  DISK_IO --> DATA: ~milliseconds (SSD) or ~10ms (HDD)
```

### Memory Pressure: The Reclaim Watermarks

```mermaid
flowchart TD
  subgraph "Per-Zone Free Page Watermarks"
    HIGH["pages_high (zone.watermark[HIGH])\nNo reclaim needed"]
    LOW["pages_low (zone.watermark[LOW])\nkswapd wakes up (background reclaim)"]
    MIN["pages_min (zone.watermark[MIN])\nDirect reclaim: allocating thread stalls\nand reclaims pages itself"]
    EMPTY["pages = 0\nOOM killer invoked"]
  end
  HIGH --> LOW --> MIN --> EMPTY
  PROC["alloc_pages() called"]
  PROC -->|"pages > high"| FAST["Fast path: return page"]
  PROC -->|"pages < low"| WAKE["wake_up(kswapd)\nallocation may succeed"]
  PROC -->|"pages < min"| DIRECT["try_to_free_pages()\ncaller blocks until reclaim completes"]
  PROC -->|"pages = 0"| OOM["out_of_memory()\nselect victim by oom_score\nSIGKILL"]
```

### Page Reclaim: LRU Lists and the Clock Algorithm

```mermaid
flowchart LR
  subgraph "LRU Lists (per memory cgroup / zone)"
    AL["LRU_ACTIVE_ANON\n(recently accessed anonymous pages)"]
    IL["LRU_INACTIVE_ANON\n(candidate for swap)"]
    AF["LRU_ACTIVE_FILE\n(recently accessed file-backed pages)"]
    IF["LRU_INACTIVE_FILE\n(candidate for drop from page cache)"]
  end
  AL -->|"not accessed → demote"| IL
  AF -->|"not accessed → demote"| IF
  IL -->|"page reclaim: writepage() to swap"| SWAP["Swap Device"]
  IF -->|"page reclaim: drop if clean\nwritepage() if dirty"| DROP["Free Page"]
  subgraph "PTE Access Bit"
    ACC["CPU sets PTE.Accessed bit on access\nkswapd clears it during scan\nif still clear → cold page → evict"]
  end
  AL --> ACC
```

---

## 5. File System I/O Stack Internals

### Full I/O Stack: Layers and Data Structures

```mermaid
flowchart TD
  APP["Application\nread(fd, buf, n)"]
  SC["System Call Layer\nsys_read() → vfs_read()"]
  VFS["VFS Layer\nstruct file → inode → address_space"]
  PC["Page Cache\nradix_tree / xarray lookup\n(struct address_space)"]
  FS["File System (ext4/btrfs/xfs)\nextent mapping: file offset → LBA\ninode → block group → block bitmap"]
  BL["Block Layer\nstruct bio construction\nI/O scheduler (mq-deadline/bfq/none)"]
  DRV["Device Driver\nNVMe: submission queue ring\nSATA: command table + PRD"]
  HW["Storage Hardware\n(NVMe SSD: ~100μs)\n(SATA SSD: ~500μs)\n(HDD: ~5-15ms seek + rotation)"]

  APP --> SC --> VFS --> PC
  PC -->|"cache miss → read_pages()"| FS
  FS -->|"submit_bio()"| BL
  BL --> DRV --> HW
  HW -->|"IRQ → bio_endio()"| PC
  PC -->|"copy_to_user()"| APP
```

### ext4 Extent Tree: File → Block Mapping

```mermaid
flowchart TD
  subgraph "ext4 inode i_data"
    EH["struct ext4_extent_header\neh_magic, eh_entries, eh_depth"]
    EI["struct ext4_extent_idx (internal node)\nei_block: logical block\nei_leaf: points to next node"]
    EX["struct ext4_extent (leaf)\nee_block: first logical block\nee_start: physical block\nee_len: length in blocks"]
  end
  EH --> EI --> EX
  EX --> PHYS["Physical blocks on disk\n(contiguous run of ee_len blocks starting at ee_start)"]
```

### File System Caches

```mermaid
flowchart LR
  subgraph "Cache Hierarchy"
    DC["Dentry Cache (dcache)\nhash: (parent_inode, name) → dentry\nLRU eviction on pressure\nprotects path lookup performance"]
    IC["Inode Cache\nhash: (sb, ino) → inode\ncontains i_mapping (page cache root)"]
    PC["Page Cache (per inode)\nxarray keyed by page index\nshared between all openers of same file"]
    BC["Buffer Cache\n(embedded in page cache)\n4KB pages containing disk blocks\nfor metadata (superblock, bitmaps)"]
  end
  DC --> IC --> PC --> BC
```

---

## 6. Disk I/O: Scheduler and Latency Anatomy

### I/O Request Lifecycle

```mermaid
sequenceDiagram
  participant FS as File System
  participant BIO as bio (struct)
  participant SCHED as I/O Scheduler
  participant DRV as Driver (NVMe)
  participant HW as Hardware Queue

  FS->>BIO: bio_alloc() + bi_io_vec setup\n(bi_sector, bi_bdev, pages[])
  BIO->>SCHED: submit_bio()\n→ blk_mq_submit_bio()
  SCHED->>SCHED: plug queue / merge adjacent bios\nmq-deadline: sort by sector for read fairness\nbfq: per-process fair queuing
  SCHED->>DRV: blk_mq_dispatch_rq_list()\n→ nvme_queue_rq()
  DRV->>HW: write to NVMe SQ tail doorbell\n(64-byte submission queue entry)
  HW-->>DRV: IRQ → NVMe CQ entry\n→ blk_mq_complete_request()
  DRV-->>BIO: bio_endio() → mark pages uptodate\n→ wake up waiting process
```

### latency = queue_time + service_time

```mermaid
flowchart LR
  subgraph "I/O Latency Breakdown"
    QT["Queue time\n(I/O scheduler wait)\nVisible in: iostat await\nBPF: block_rq_insert → block_rq_issue"]
    ST["Service time\n(device execution time)\nVisible in: iostat svctm\nBPF: block_rq_issue → block_rq_complete"]
    TT["Total latency (await)\n= queue_time + service_time"]
  end
  QT --> TT
  ST --> TT
  RULE["Rule of thumb:\nIf await >> svctm: I/O scheduler or device queue congestion\nIf await ≈ svctm: device is the bottleneck"]
  TT --> RULE
```

---

## 7. Network Stack Internals

### Packet Receive Path

```mermaid
flowchart TD
  NIC["NIC receives frame\nDMA into ring buffer sk_buff\nraises hardware IRQ"]
  IRQ["IRQ handler (top half)\nACK interrupt\nschedule NAPI poll (NET_RX_SOFTIRQ)"]
  NAPI["NAPI poll (softirq)\nprocess up to budget packets\nfrom DMA ring\n(avoids IRQ flood)"]
  L2["L2 processing\nethernet frame → strip header\nnetif_receive_skb()"]
  L3["L3 IP processing\nip_rcv() → route lookup\n(FIB trie: longest prefix match)"]
  L4["L4 TCP/UDP\ntcp_rcv() → socket lookup\n(connection hash table)"]
  SKB["sk_buff placed on socket receive queue\nwake up process in recv() / select()"]
  NIC --> IRQ --> NAPI --> L2 --> L3 --> L4 --> SKB
```

### TCP Internal State and Congestion Control

```mermaid
stateDiagram-v2
  [*] --> CLOSED
  CLOSED --> SYN_SENT: connect()
  CLOSED --> LISTEN: bind()+listen()
  LISTEN --> SYN_RCVD: SYN received
  SYN_SENT --> ESTABLISHED: SYN+ACK received
  SYN_RCVD --> ESTABLISHED: ACK received
  ESTABLISHED --> FIN_WAIT_1: close() (active)
  ESTABLISHED --> CLOSE_WAIT: FIN received (passive)
  FIN_WAIT_1 --> TIME_WAIT: FIN+ACK exchange
  CLOSE_WAIT --> LAST_ACK: close()
  TIME_WAIT --> CLOSED: 2×MSL timeout
  LAST_ACK --> CLOSED: ACK received
```

---

## 8. Methodology: Drill-Down and Workload Characterization

### Three-Stage Performance Investigation

```mermaid
flowchart TD
  MON["Stage 1: Monitoring\n(always-on metrics collection)\nPrometheus / sar / cloudwatch\nAlert on: CPU sat > 0, memory sat, disk errors"]
  MON --> ID["Stage 2: Identification\n(narrow to resource)\nvmstat: CPU/memory overview\niostat: disk utilization, await\nss / netstat: TCP retransmits"]
  ID --> ANA["Stage 3: Analysis\n(root cause with BPF/perf)\nperf record → flame graph\noffcputime → off-CPU flame graph\nbpftrace one-liners → custom metrics"]
  ANA --> FIX["Fix or Accept:\nEliminate unnecessary work first\nTune resource controls\nScale horizontally"]
```

### RED Method for Microservices

```mermaid
flowchart LR
  subgraph "RED Method (per service)"
    R["Request Rate\n(req/sec)\n↑ + ↑ latency = load problem"]
    E["Errors\n(5xx rate)\n↑ = architecture/code problem"]
    D["Duration (latency)\n↑ alone = architecture problem\nP99 - avg ≈ saturation contribution"]
  end
  R --> DIAG["Diagnosis:\nR↑ + D↑ → scale out\nR flat + D↑ → fix code or config\nE↑ → error path investigation"]
  E --> DIAG
  D --> DIAG
```

---

## 9. Observability Tool Stack

### Tool Selection by Latency Tier

```mermaid
flowchart TD
  subgraph "Observability Tool Hierarchy"
    L1_T["Static: /proc, /sys\n(polling, low overhead)\nvmstat, iostat, free, sar\n→ counts and averages"]
    L2_T["Dynamic Tracing: kprobes, uprobes\n(attach to any kernel/user function)\nperf probe, bpftrace kprobe:\n→ per-event latency"]
    L3_T["Tracepoints (stable ABI)\nsched:*, block:*, syscalls:*\n(recommended over kprobes)\nbpftrace tracepoint:"]
    L4_T["PMC (Performance Monitoring Counters)\nCPU: cache misses, branch mispredicts\ncycles per instruction (CPI)\nperf stat -e cycles,cache-misses,instructions"]
  end
  L1_T --> L2_T --> L3_T --> L4_T
```

### BPF Tool Capabilities Map

```mermaid
flowchart LR
  subgraph "BCC / bpftrace Tools"
    RUNQLAT["runqlat\nCPU scheduler run queue latency\n→ histogram of wait times"]
    OFFCPU["offcputime\nOff-CPU stacks + durations\n→ identifies blocking bottlenecks"]
    BIOLATENCY["biolatency\nBlock I/O latency histogram\n→ NVMe vs HDD vs queue delay"]
    CACHESTAT["cachestat\nPage cache hit/miss ratio\n→ read-ahead effectiveness"]
    OPENSNOOP["opensnoop\nTracks file opens in real-time\n→ unexpected file access patterns"]
    TCPRETRANS["tcpretrans\nTCP retransmit events\n→ network congestion detection"]
  end
```

---

## 10. CPU Performance Counters (PMC) and Cache Effects

```mermaid
flowchart TD
  subgraph "CPU Hardware Performance Counters"
    CYCLES["cycles: actual CPU clock cycles"]
    INSTRS["instructions: retired instructions"]
    CPI["CPI = cycles / instructions\nIdeal: 0.25–1.0\nMemory bound: > 5.0"]
    LLC_MISS["LLC cache misses\n(→ DRAM access: ~100 cycles penalty)"]
    BRANCH["branch-misses\n(→ pipeline flush: ~15 cycles penalty)"]
    STALLS["memory stall cycles\n(cycles with no instruction retired\ndue to cache miss in flight)"]
  end
  CPI --> DIAG["Diagnosis:\nHigh CPI + high LLC misses → memory bandwidth bound\nHigh CPI + high branch misses → bad branch prediction\nLow CPI but high context switches → scheduler problem"]
```

### False Sharing: Why Per-CPU Data Matters

```mermaid
flowchart LR
  subgraph "Cache Line (64 bytes)"
    CPU0_VAR["CPU0 counter (bytes 0-7)"]
    CPU1_VAR["CPU1 counter (bytes 8-15)"]
    CPU2_VAR["CPU2 counter (bytes 16-23)"]
    CPU3_VAR["CPU3 counter (bytes 24-31)"]
  end
  NOTE["If all CPUs write to this cache line:\nCPU0 write → invalidates CPU1,2,3 caches\nCPU1 write → invalidates CPU0,2,3 caches\nResult: cache line bounces between CPU L1 caches\n= 'false sharing' = massive slowdown\nFix: __cacheline_aligned_in_smp per-CPU variables"]
```

---

## 11. Cloud and Container Performance: cgroups and Throttling

```mermaid
flowchart TD
  subgraph "cgroup Resource Controls"
    CPU_CG["cpu cgroup\ncpu.cfs_quota_us / cpu.cfs_period_us\n= CPU bandwidth throttling\nThrottled → throttled_time counter"]
    MEM_CG["memory cgroup\nmemory.limit_in_bytes\nProcess sees OOM kill before host\nmemory.memsw.limit = including swap"]
    IO_CG["blkio cgroup\nblkio.throttle.read_bps_device\nI/O scheduler: per-group weight (BFQ)"]
    NET_CG["net_cls / tc\ntraffic control egress shaping\n(ingress: police, egress: htb/tbf)"]
  end
  subgraph "USE Method for Containers"
    CU["Container CPU Utilization\n= cpu.stat.usage_usec / wall_time"]
    CS["Container CPU Saturation\n= cpu.stat.throttled_time > 0"]
    MU["Container Memory Utilization\n= memory.current / memory.max"]
    MS["Container Memory Saturation\n= memory.stat.pgmajfault (major faults)"]
  end
```

---

## 12. Performance Analysis Flow: End-to-End

```mermaid
flowchart TD
  START["System slow / high latency reported"]
  START --> USE["Apply USE Method\nCheck all resources: CPU, memory, disk, net\nFind: utilization %, saturation (queue), errors"]
  USE --> FOUND{"Saturated\nresource found?"}
  FOUND -->|yes| WORKLOAD["Workload Characterization\nWho: pid, user, IP\nWhy: stack trace\nWhat: rate, IOPS, bytes\nWhen: time pattern"]
  WORKLOAD --> ELIM["Eliminate unnecessary work\n(top win: fix root cause)"]
  ELIM --> TUNE["Tune: cgroup limits,\nI/O scheduler, TCP buffers"]
  FOUND -->|no| RED["Apply RED Method\n(if microservices)\nRate, Errors, Duration per service"]
  RED --> TRACE["Deep trace with BPF\nFlame graphs (on-CPU + off-CPU)\nbiolatency, runqlat, tcpretrans"]
  TRACE --> ROOT["Root cause identified\nFix or accept + monitor"]
```

Every performance investigation follows this loop: measure at the USE/RED level to find the resource, drill down with BPF tracing to find the exact code path, then eliminate unnecessary work before tuning. The kernel's observability infrastructure — tracepoints, kprobes, perf events, and BPF maps — exposes every data path in the system at nanosecond resolution.
