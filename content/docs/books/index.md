# Under the Hood — CS Knowledge Library Index

> A curated index of "Under the Hood" documentation covering systems, algorithms, distributed systems, messaging, DevOps, and computer science fundamentals. Each entry summarizes the document's intended focus; it does not certify that every listed implementation detail is current for every version.

## Index contract

- File counts and topic summaries describe this maintained snapshot, not every Markdown file in the repository.
- A link is considered complete only when its target exists and the target document states its own version or execution boundary.
- Product defaults and performance figures belong in the target document with evidence, not in this index.
- When entries are added, removed, or renamed, update the category count, total, and relative link in the same change.

---

## Quick Navigation

| Category | Files | Focus |
|----------|-------|-------|
| [Systems](#systems) | 5 | Linux kernel, OS internals, C++, performance, Mamba SSM |
| [Algorithms](#algorithms) | 9 | CLRS, Erickson, competitive programming, Sedgewick, CMU advanced, CTCI, Zingaro |
| [Distributed Systems](#distributed-systems) | 2 | Consensus, replication, CAP, CRDTs; distributed computing principles |
| [Kafka / Messaging](#kafka--messaging) | 11 | Kafka internals, streams, RabbitMQ, event-driven systems, Effective Kafka |
| [DevOps](#devops) | 6 | Docker/K8s, Jenkins, Consul, edge computing, K8s orchestration, Java+K8s |
| [CS Reference](cs-references/index.md) | 26 | Architecture, compilers, networking, security, ML, and more |

**Listed snapshot: 59 files.** Recount the tables when the library structure changes.

---

## Systems

> Deep internals of operating systems, kernel subsystems, language runtimes, and performance analysis.

| File | Topics Covered |
|------|----------------|
| [`systems/linux-kernel-development.md`](systems/linux-kernel-development.md) | Process scheduler (CFS vruntime, red-black tree), virtual memory (page tables, TLB shootdown), VFS inode lifecycle, network stack sk_buff path, block I/O elevator, cgroups v2 hierarchy |
| [`systems/systems-performance.md`](systems/systems-performance.md) | CPU flame graphs, USE method, perf_events PMU counters, eBPF tracing internals, cache miss analysis, memory bandwidth saturation, disk I/O latency decomposition |
| [`systems/cpp-internals.md`](systems/cpp-internals.md) | vtable layout, RTTI, move semantics (rvalue refs, perfect forwarding), template instantiation, CRTP, exception unwind tables, copy elision (RVO/NRVO), memory model (acquire/release) |
| [`systems/operating-systems-internals.md`](systems/operating-systems-internals.md) | Process vs thread memory space, fork/exec internals, context switch register save, semaphore/mutex kernel implementation, file descriptor table, mmap anonymous vs file-backed |
| [`systems/mamba-ssm-internals.md`](systems/mamba-ssm-internals.md) | State Space Model math (A/B/C/D matrices), discretization (ZOH), selective scan mechanism, hardware-aware parallel scan algorithm, comparison with Transformer attention complexity |

---

## Algorithms

> Mathematical foundations, proof techniques, complexity analysis, and internal mechanics of core algorithms.

| File | Topics Covered |
|------|----------------|
| [`algorithms/algorithms-internals.md`](algorithms/algorithms-internals.md) | Sorting internals (quicksort pivot analysis, mergesort recursion tree), heap operations, hash table collision resolution (chaining vs open addressing), amortized analysis |
| [`algorithms/erickson-algorithms-deep.md`](algorithms/erickson-algorithms-deep.md) | Jeff Erickson's algorithms: recursion trees, DP subproblem DAG, graph reductions, flow networks, string algorithms (KMP failure function, suffix arrays) |
| [`algorithms/algorithm-design-analysis.md`](algorithms/algorithm-design-analysis.md) | Divide and conquer master theorem, greedy exchange argument proofs, DP optimal substructure + overlapping subproblems, network flow augmenting paths |
| [`algorithms/advanced-algorithms-internals.md`](algorithms/advanced-algorithms-internals.md) | Advanced data structures (van Emde Boas, fusion trees), approximation algorithms (PTAS/FPTAS), randomized algorithms (treaps, skip lists), online algorithms competitive ratio |
| [`algorithms/competitive-programming-internals.md`](algorithms/competitive-programming-internals.md) | Segment trees (lazy propagation), BIT/Fenwick tree lowbit trick, Dijkstra priority queue internals, Aho-Corasick automaton, DSU path compression + union by rank |
| [`algorithms/algorithmic-thinking-zingaro.md`](algorithms/algorithmic-thinking-zingaro.md) | Hash table probing mechanics, graph BFS/DFS traversal state, memoization top-down recursion, dynamic programming transition tables, Zingaro problem decomposition patterns |
| [`algorithms/sedgewick-algorithms-internals.md`](algorithms/sedgewick-algorithms-internals.md) | Sedgewick & Wayne 4th Ed: red-black BST rotations, quicksort 3-way partitioning, heap sort sift-down, weighted quick union, trie R-way/TST branching, max-flow Ford-Fulkerson augmentation |
| [`algorithms/cmu-advanced-algorithms.md`](algorithms/cmu-advanced-algorithms.md) | CMU 15-850: amortized splay trees, van Emde Boas universe splitting, randomized hashing (cuckoo/tabulation), PQ scheduling B-trees, external memory cache-oblivious layouts, high-dimensional LSH |
| [`algorithms/cracking-coding-interview-internals.md`](algorithms/cracking-coding-interview-internals.md) | CTCI 4th Ed: string/array bit manipulation internals, linked list pointer arithmetic, tree traversal recursion stacks, graph adjacency encoding, DP state compression, system design cache/DB sharding |

---

## Distributed Systems

> Consensus protocols, replication strategies, consistency models, and fault tolerance internals.

| File | Topics Covered |
|------|----------------|
| [`distributed/distributed-systems-internals.md`](distributed/distributed-systems-internals.md) | Two Generals impossibility, Paxos ballot invariant, Raft leader election + log replication, 2PC WAL blocking, MVCC snapshot isolation, vector clocks, CRDTs, consistent hashing, Gossip convergence, Spanner TrueTime |
| [`distributed/distributed-computing-principles.md`](distributed/distributed-computing-principles.md) | Kshemkalyani & Singhal: message ordering (FIFO/causal/total), logical clocks (Lamport/vector/matrix), global state recording (Chandy-Lamport snapshot), deadlock detection algorithms, termination detection, mutual exclusion (Lamport/Ricart-Agrawala/token-ring), leader election (LCR/HS), distributed transactions |

---

## Kafka / Messaging

> Internal mechanics of Kafka broker, producers, consumers, Kafka Streams, ksqlDB, and RabbitMQ.

| File | Topics Covered |
|------|----------------|
| [`kafka/kafka-internals.md`](kafka/kafka-internals.md) | Log segment append mechanics, ISR replication protocol, partition leader election (ZooKeeper vs KRaft), consumer group rebalance, offset commit semantics |
| [`kafka/kafka-internals-definitive.md`](kafka/kafka-internals-definitive.md) | Definitive Guide deep dive: producer batching + linger.ms, compression codecs, consumer fetch min/max bytes, exactly-once semantics (idempotent producer + transactions) |
| [`kafka/kafka-producer-consumer-deep.md`](kafka/kafka-producer-consumer-deep.md) | Producer RecordAccumulator + Sender thread, NetworkClient request inflight tracking, consumer poll loop + heartbeat thread, partition assignment strategies (range/roundrobin/sticky) |
| [`kafka/kafka-streams-internals.md`](kafka/kafka-streams-internals.md) | StreamThread lifecycle, topology processor graph, state store (RocksDB) internals, changelog topic backup, stream-table join mechanics |
| [`kafka/kafka-streams-ksqldb.md`](kafka/kafka-streams-ksqldb.md) | ksqlDB query compilation to Kafka Streams topology, push vs pull queries, persistent vs transient queries, REST API → engine execution path |
| [`kafka/kafka-in-action-deep.md`](kafka/kafka-in-action-deep.md) | Kafka in Action (Manning): practical internals — schema registry Avro encoding, connector framework source/sink task lifecycle, security (TLS + SASL SCRAM) |
| [`kafka/kafka-streams-in-action-deep.md`](kafka/kafka-streams-in-action-deep.md) | Kafka Streams in Action (Manning): windowing (tumbling/hopping/session), KTable materialization, interactive queries, punctuator scheduling, exactly-once processing guarantees |
| [`kafka/rabbitmq-internals.md`](kafka/rabbitmq-internals.md) | AMQP exchange types (direct/fanout/topic/headers), queue durability + persistence (Mnesia + msg store), shovel/federation plugins, quorum queues Raft replication, flow control credit system |
| [`kafka/designing-event-driven-systems.md`](kafka/designing-event-driven-systems.md) | Ben Stopford, O'Reilly 2018: event sourcing log as source of truth, CQRS read-model derivation, Kafka as shared database log, consumer group rewind, stream-table duality, saga pattern compensation flows |
| [`kafka/effective-kafka-internals.md`](kafka/effective-kafka-internals.md) | Emil Koutanov, Leanpub 2021: producer idempotence epoch+sequence, transaction coordinator two-phase protocol, consumer isolation levels (read_committed), offset management internals, partition rebalancing protocol (incremental cooperative) |
| [`kafka/learning-apache-kafka.md`](kafka/learning-apache-kafka.md) | Nishant Garg, Packt 2015: broker log compaction (cleaner thread), ZooKeeper controller election, mirror maker replication internals, Kafka Connect task distributed coordination, REST proxy request routing |

---

## DevOps

> Container orchestration, CI/CD, service mesh, and edge computing internals.

| File | Topics Covered |
|------|----------------|
| [`devops/docker-kubernetes-internals.md`](devops/docker-kubernetes-internals.md) | Container isolation (namespaces + cgroups), image layer union filesystem (overlay2), Kubernetes API server request lifecycle, scheduler predicate + priority functions, kubelet pod lifecycle, CNI plugin networking |
| [`devops/jenkins-cicd-internals.md`](devops/jenkins-cicd-internals.md) | Jenkins master/agent architecture, Pipeline Groovy CPS execution model, shared library classloader, Blue Ocean DAG visualization, credential store encryption, workspace cleanup |
| [`devops/consul-service-mesh-internals.md`](devops/consul-service-mesh-internals.md) | Consul Raft consensus (KV store), health check gossip propagation, service mesh sidecar proxy (Envoy xDS API), intentions ACL enforcement, WAN federation across DCs |
| [`devops/edge-computing-container-architectures.md`](devops/edge-computing-container-architectures.md) | k3s lightweight Kubernetes architecture, KubeEdge cloud-edge tunnel protocol, containerd CRI shim, WebAssembly (WASI) as container alternative, OCI image spec layer content-addressable store |
| [`devops/kubernetes-orchestration-internals.md`](devops/kubernetes-orchestration-internals.md) | K8s vs Docker Swarm vs Mesos vs ECS scheduler internals, Huawei CCE CNI plugin data path, etcd watch event propagation, Kubernetes RBAC admission chain, node affinity/taints scoring, Swarm Raft log replication vs K8s etcd |
| [`devops/docker-kubernetes-java-internals.md`](devops/docker-kubernetes-java-internals.md) | Krochmalski, Packt 2017: Docker overlay networking VXLAN encapsulation, Java app containerization JVM heap in cgroup memory limits, Fabric8 Maven plugin K8s manifest generation, rolling update partition strategy, Helm chart Go template rendering pipeline |

---

## CS Reference

> Broad computer science reference covering architecture, compilers, networking, databases, security, ML, and more — derived from ~494 CS reference books.

- [CS References (EN/KR) 인덱스 바로가기](cs-references/index.md)

### Core Systems

| File | Topics Covered |
|------|----------------|
| [`cs-reference/computer-architecture-internals.md`](cs-reference/computer-architecture-internals.md) | Pipeline stages (IF/ID/EX/MEM/WB), data hazards + forwarding, branch prediction (2-bit saturating counter, tournament predictor), out-of-order execution (ROB, RS, register renaming), cache hierarchy (VIPT, PIPT, prefetching) |
| [`cs-reference/compiler-internals.md`](cs-reference/compiler-internals.md) | Lexer DFA/NFA, recursive descent parser, AST → IR lowering, SSA construction (dominance frontier, φ-functions), register allocation (graph coloring, spilling), instruction selection (BURS/tree patterns) |
| [`cs-reference/operating-systems-internals.md`](cs-reference/operating-systems-internals.md) | Process scheduling algorithms (MLFQ, real-time EDF/RMS), virtual memory page replacement (LRU clock algorithm), file system journaling (journal → commit → checkpoint), IPC mechanisms (pipes, message queues, shared memory) |
| [`cs-reference/systems-programming-internals.md`](cs-reference/systems-programming-internals.md) | x86 memory ordering (TSO store buffer), SYSCALL entry/exit (pt_regs save), futex fast-path CAS, Rust ownership + borrow checker MIR, glibc ptmalloc arena structure, POSIX signal delivery rt_sigreturn, NUMA topology |

### Networking

| File | Topics Covered |
|------|----------------|
| [`cs-reference/networking-internals.md`](cs-reference/networking-internals.md) | TCP state machine (3-way handshake, TIME_WAIT, FIN_WAIT), congestion control (CUBIC cwnd growth, BBR bandwidth probing), TLS 1.3 handshake (ECDH + HKDF), DNS recursive resolution, BGP path selection attributes, HTTP/2 stream multiplexing |

### Languages and Runtimes

| File | Topics Covered |
|------|----------------|
| [`cs-reference/c-cpp-internals.md`](cs-reference/c-cpp-internals.md) | C memory model (UB, strict aliasing), C++ object model (vtable, vptr, EBO), smart pointer reference counting, template metaprogramming SFINAE/concepts, LLVM IR codegen, sanitizers (ASan shadow memory, UBSan checks) |
| [`cs-reference/python-internals.md`](cs-reference/python-internals.md) | CPython bytecode (dis module), reference counting + cyclic GC, GIL acquisition protocol, descriptor protocol (`__get__`/`__set__`), import system (sys.modules, finder/loader), memory allocator (pymalloc arenas/pools) |
| [`cs-reference/java-internals.md`](cs-reference/java-internals.md) | JVM class loading (bootstrap/ext/app classloader), bytecode verification, HotSpot JIT (C1/C2 tiers, deoptimization), garbage collectors (G1 region-based, ZGC colored pointers), Java memory model happens-before, synchronized monitor inflation |
| [`cs-reference/programming-languages-internals.md`](cs-reference/programming-languages-internals.md) | Go GMP scheduler + goroutine stacks + tri-color GC, Rust ownership/MIR/LLVM pipeline + async Future polling, Kotlin CPS coroutine transform + structured concurrency, Scala variance + implicit resolution + JVM trait encoding, HM type inference unification |
| [`cs-reference/functional-programming-internals.md`](cs-reference/functional-programming-internals.md) | Lambda calculus beta reduction + Church encoding, Haskell lazy thunk WHNF + space leaks, HM Algorithm W unification, monad sequencing mechanics, persistent data structures path copying, STM optimistic commit, Free monad DSL/interpreter separation |

### Databases and Data

| File | Topics Covered |
|------|----------------|
| [`cs-reference/database-systems-internals.md`](cs-reference/database-systems-internals.md) | B+tree node splits + page layout, WAL write-ahead logging (force/steal policy), MVCC tuple versioning, query optimizer cost model (cardinality estimation, join ordering DP), buffer pool manager (LRU-K eviction), lock manager deadlock detection |
| [`cs-reference/data-structures-internals.md`](cs-reference/data-structures-internals.md) | Red-black tree rotations + color invariants, skip list probabilistic level assignment, hash map load factor + rehashing, union-find path compression + rank, Fibonacci heap decrease-key amortized O(1) |
| [`cs-reference/data-mining-bigdata-internals.md`](cs-reference/data-mining-bigdata-internals.md) | MapReduce shuffle sort-merge, Spark RDD lineage DAG + narrow/wide transformations, Flink watermark event-time processing, columnar storage (Parquet row group + dictionary encoding), LSM-tree compaction strategies |

### Security

| File | Topics Covered |
|------|----------------|
| [`cs-reference/security-internals.md`](cs-reference/security-internals.md) | AES-GCM round structure + GHASH, RSA-OAEP + ECDH Curve25519, TLS 1.3 HKDF key derivation, SHA-256 compression function, bcrypt/Argon2id memory-hard hashing, buffer overflow ROP chains + mitigations, OAuth 2.0 PKCE + JWT RS256, Spectre cache side channel + retpoline |

### Cloud and DevOps

| File | Topics Covered |
|------|----------------|
| [`cs-reference/cloud-aws-internals.md`](cs-reference/cloud-aws-internals.md) | AWS Nitro hypervisor vs Xen, EC2 boot on Nitro, VPC packet flow (VxLAN overlay), S3 erasure coding RS(6,2), Lambda Firecracker microVM cold start, DynamoDB LSM + Paxos replication, IAM policy evaluation order, RDS Multi-AZ WAL shipping |
| [`cs-reference/devops-linux-internals.md`](cs-reference/devops-linux-internals.md) | Linux systemd unit activation (socket/path/timer), cgroup v2 resource accounting, kernel namespaces (PID/net/mnt/uts/ipc/user), seccomp BPF syscall filtering, auditd netlink events, iptables/nftables netfilter hooks |
| [`cs-reference/docker-kubernetes-cs.md`](cs-reference/docker-kubernetes-cs.md) | Docker buildkit layer caching + content-addressable store, Kubernetes etcd watch mechanism, kube-proxy iptables vs IPVS modes, Helm chart rendering + release lifecycle, OPA Gatekeeper admission webhook |
| [`cs-reference/microservices-internals.md`](cs-reference/microservices-internals.md) | Service mesh data plane (Envoy filter chain), circuit breaker state machine, distributed tracing span propagation (W3C TraceContext), API gateway rate limiting (token bucket + leaky bucket), saga pattern choreography vs orchestration |

### Algorithms and Mathematics

| File | Topics Covered |
|------|----------------|
| [`cs-reference/algorithms-cs-reference.md`](cs-reference/algorithms-cs-reference.md) | DP subproblem DAG + memoization, implementation-dependent push-relabel bounds, KMP failure function, NP complexity hierarchy + 3-SAT reduction, Bloom filter FPR formula, dynamic array amortized accounting, 2-approx vertex cover, Fenwick tree lowbit trick, convex hull cross product |
| [`cs-reference/math-computing-internals.md`](cs-reference/math-computing-internals.md) | IEEE 754 special values + catastrophic cancellation, LU decomposition partial pivoting, SVD Eckart-Young theorem, FFT Cooley-Tukey butterfly O(N log N), gradient descent Adam moments + bias correction, Monte Carlo importance sampling, network flow max-flow min-cut duality |

### AI/ML and Data Science

| File | Topics Covered |
|------|----------------|
| [`cs-reference/ml-ai-internals.md`](cs-reference/ml-ai-internals.md) | Backpropagation chain rule (computational graph), attention mechanism Q/K/V dot-product scaled, transformer positional encoding, batch normalization running stats, dropout mask broadcasting, Adam optimizer moment estimates, CNN convolution as cross-correlation, ResNet skip connection gradient flow |

### Platform and Mobile

| File | Topics Covered |
|------|----------------|
| [`cs-reference/mobile-android-internals.md`](cs-reference/mobile-android-internals.md) | Android Binder IPC ioctl BC_TRANSACTION + kernel mmap zero-copy, ART dex2oat + JIT profile-guided AOT, Compose SlotTable recomposition + SnapshotStateObserver, SurfaceFlinger HWComposer overlay, LMK process priority + zRAM, Camera2 HAL3 ISP pipeline |
| [`cs-reference/web-frontend-internals.md`](cs-reference/web-frontend-internals.md) | Browser critical render path (tokenizer → DOM → CSSOM → layout → paint → GPU composite), V8 Ignition→TurboFan JIT + hidden class transitions, event loop microtask drain order, React Fiber tree + Concurrent Mode 5ms scheduler, Service Worker fetch interception, WebAssembly linear memory sandbox |

### Software Engineering

| File | Topics Covered |
|------|----------------|
| [`cs-reference/software-engineering-internals.md`](cs-reference/software-engineering-internals.md) | Design patterns (GoF) internal mechanics, SOLID principles with violation examples, DDD aggregate boundaries, event sourcing append-only store + projection rebuild, CQRS read/write model separation, hexagonal architecture port/adapter dependency inversion |
| [`cs-reference/miscellaneous-cs.md`](cs-reference/miscellaneous-cs.md) | GPU rasterization pipeline + deferred G-buffer, BVH ray tracing hardware, ECS archetype memory layout, GJK physics collision, MQTT QoS mechanics, Terraform state DAG + optimistic locking, Ansible agentless SSH module push, SRE error budget burn rate + multi-window alerting, OTel trace context propagation, mutation testing, MESI cache coherence, NUMA topology |

### Distributed Systems Reference

| File | Topics Covered |
|------|----------------|
| [`cs-reference/distributed-systems-cs.md`](cs-reference/distributed-systems-cs.md) | Two Generals impossibility, CAP theorem CP vs AP, Paxos ballot invariant, Raft leader election + log replication, 2PC WAL blocking, MVCC PostgreSQL heap rows, vector clocks DynamoDB, consistent hashing virtual nodes, CRDT G-Counter/OR-Set merge, Gossip O(log N) convergence, Spanner TrueTime, Merkle anti-entropy, etcd distributed lock fencing |

---

## Document Statistics

| Category | Files | Avg Lines |
|----------|-------|-----------|
| systems/ | 5 | ~510 |
| algorithms/ | 9 | ~620 |
| distributed/ | 2 | ~665 |
| kafka/ | 11 | ~540 |
| devops/ | 6 | ~490 |
| cs-reference/ | 26 | ~430 |
| **Total** | **59** | **~535** |

---

## Source Material

All documents derived from PDFs in:
- `/home/nodove/workspace/document/temp_books/` — Systems, algorithms, DevOps books
- `/home/nodove/workspace/document/temp_books/kafka_rabbitmq/` — Messaging books
- `/home/nodove/workspace/document/temp_books/Computer-Science-Reference-Books/` — ~494 CS reference PDFs (`comp(1).pdf`–`comp(494).pdf`)

---

*Generated: 2026-02-28 | Format: Mermaid-rich Under the Hood documentation*
