# Kafka in Action — Under the Hood: Storage, Consumer Internals & Data Pipelines

> Sources: *Kafka in Action* (Dylan Scott, Manning MEAP 2020) + *Learning Apache Kafka 2nd Ed* (Nishant Garg)  
> Focus: Internal data paths, segment file mechanics, consumer group coordination, compaction internals, EOS lifecycle, timing wheel purgatory

## Version and model boundary

- This document combines sources from different Kafka eras. Mark ZooKeeper flows as historical and confirm KRaft, group protocol, record format, and broker defaults against the deployed release.
- Diagrams are representative state machines, not packet captures. A completion claim needs logs, metrics, effective configuration, and a reproducible failure scenario.
- "Exactly once" is scoped to committed Kafka records and offsets read with the matching isolation level. External side effects remain outside that transaction.
- Complexity claims name the unit of work. Timer insertion can be constant-time while expiration still costs work proportional to callbacks that become due.

---

## 1. Partition → Segment → Record: Physical Layout on Disk

Every Kafka partition maps to a directory on the broker's `log.dirs` filesystem. The partition is **not** a monolithic file — it is sliced into **segments**.

```mermaid
block-beta
  columns 4
  A["Partition Dir\n/data/kafka/test-0/"]:4
  B["00000000000000000000.log"]
  C["00000000000000000000.index"]
  D["00000000000000000000.timeindex"]
  E["leader-epoch-checkpoint"]
  F["00000000000000000007.log\n(older segment)"]
  G["00000000000000000007.index"]
  H["00000000000000000007.timeindex"]
  I["(inactive, eligible for compaction/retention)"]
```

**Key observations:**
- **Segment file name = base offset** of the first record in that segment (all-zeros for the initial segment)
- The **active segment** (largest offset base) is the only file receiving appended writes
- Older segments are candidates for **retention deletion** or **compaction cleaning**
- Each triplet (`.log` / `.index` / `.timeindex`) belongs to one segment boundary

### Binary Search via Sparse Index

The `.index` file is a sparse mapping of `(relative_offset → physical_byte_position)`. It does **not** contain every offset — it samples entries every `index.interval.bytes` bytes.

```mermaid
flowchart LR
    Consumer -->|"fetch offset=15"| Broker
    Broker -->|"binary search\n.index file"| idx["Index Entry\nOffset 12 → byte 4096"]
    idx -->|"linear scan from 4096"| log[".log file"]
    log -->|"found offset 15 at byte 5120"| sendfile["sendfile() to socket\n(zero-copy)"]
    sendfile --> Consumer
```

The `.timeindex` mirrors this structure but maps `(timestamp → offset)`, enabling `offsetsForTimes()` consumer API calls.

---

## 2. Log Compaction: The Dirty/Clean State Machine

Standard topics use **delete** retention (remove segments older than `log.retention.ms` or larger than `log.retention.bytes`). Compacted topics (`cleanup.policy=compact`) keep only the **latest value per key**.

```mermaid
stateDiagram-v2
    [*] --> Active : producer appends
    Active --> Inactive : segment rolls (size/time)
    Inactive --> Dirty : awaiting cleaner thread
    Dirty --> Clean : LogCleaner thread merges+deduplicates
    Clean --> [*] : tombstone TTL expires → delete

    note right of Dirty
        Multiple values per key may still coexist.
        Consumer WILL see duplicates during this window.
    end note

    note right of Clean
        One value per key guaranteed.
        Offset gaps appear where duplicates were removed.
    end note
```

### Log Cleaner Thread Internal Flow

```mermaid
sequenceDiagram
    participant LCT as LogCleaner Thread
    participant dirty as Dirty Segments
    participant clean as Clean Segments
    participant mem as OffsetMap (key→highest_offset)
    
    LCT->>dirty: scan all records, build key→max_offset map
    Note over mem: bounded by log.cleaner.dedupe.buffer.size
    LCT->>dirty: second pass — filter records
    dirty-->>LCT: retain if offset == max_offset for that key
    LCT->>clean: write filtered records into new segment
    LCT->>clean: update .index and .timeindex
    LCT->>dirty: swap + delete old dirty segments
```

**Tombstone records** (null value, valid key) are retained through compaction for `delete.retention.ms` (default 24h) so downstream consumers can observe the deletion before the record is permanently removed.

---

## 3. Consumer Group Coordination Protocol

```mermaid
sequenceDiagram
    participant C1 as Consumer C1
    participant C2 as Consumer C2
    participant GC as GroupCoordinator Broker
    participant OS as __consumer_offsets

    C1->>GC: FindCoordinator(group_id)
    GC-->>C1: coordinator = broker-2

    C1->>GC: JoinGroup(group_id, protocols=[Range,RoundRobin])
    C2->>GC: JoinGroup(group_id, ...)
    Note over GC: waits for rebalance.timeout or all members
    GC-->>C1: JoinGroupResponse(leader=C1, members=[C1,C2])
    GC-->>C2: JoinGroupResponse(follower)

    C1->>GC: SyncGroup(assignments: C1→P0, C2→P1)
    C2->>GC: SyncGroup(empty)
    GC-->>C1: SyncGroupResponse(partitions=[P0])
    GC-->>C2: SyncGroupResponse(partitions=[P1])

    loop polling
        C1->>GC: Heartbeat(generationId=5)
        GC-->>C1: HeartbeatResponse(OK)
    end

    C2->>GC: (heartbeat timeout or leave)
    GC->>C1: HeartbeatResponse(REBALANCE_IN_PROGRESS)
    Note over C1,C2: Rebalance cycle restarts from JoinGroup
```

`generationId` is incremented on each rebalance. Commits referencing a stale `generationId` are **rejected** — preventing zombie consumers from poisoning offsets.

### Partition Assignment Strategies

```mermaid
flowchart TD
    subgraph Range["Range (default)"]
        r1["Sort partitions numerically\n(P0,P1,P2,P3,P4)"]
        r2["Divide by consumer count\n5÷2 = 2 remainder 1"]
        r3["C1→P0,P1,P2  C2→P3,P4"]
        r1 --> r2 --> r3
    end

    subgraph RR["RoundRobin"]
        rr1["Interleave across all topics+consumers"]
        rr2["Most even distribution\nif all consumers subscribe same topics"]
        rr1 --> rr2
    end

    subgraph Sticky["Sticky (0.11+)"]
        s1["Same as RoundRobin\nfor new assignments"]
        s2["On rebalance: keep existing\nassignments where possible"]
        s3["Minimizes partition movement\n→ fewer cache misses"]
        s1 --> s2 --> s3
    end
```

---

## 4. Offset Storage: `__consumer_offsets` Internal Topic

Before Kafka 0.9, consumer offsets were stored in ZooKeeper. Now they live in an internal compacted topic `__consumer_offsets` (default 50 partitions).

```mermaid
flowchart LR
    C["Consumer\ncommitSync()\nor commitAsync()"] -->|OffsetCommitRequest| GC["GroupCoordinator"]
    GC -->|append to| OT["__consumer_offsets\n(compacted topic)"]
    OT -->|"key: (group, topic, partition)\nvalue: (offset, metadata, timestamp)"| Storage[Segment files on disk]
    
    C2["Consumer (re)start"] -->|OffsetFetchRequest| GC
    GC -->|reads latest from| OT
    OT -->|latest committed offset| C2
```

Compaction on this topic means only the **latest offset per (group, topic, partition) key** is retained — historical offset history is discarded, keeping the topic size bounded.

### Auto vs Manual Commit Trade-offs

```mermaid
flowchart TD
    Auto["enable.auto.commit=true\nauto.commit.interval.ms"] -->|periodic commit| atMostOnce["At-most-once risk:\ncommit before processing completes"]
    
    Manual["enable.auto.commit=false"] --> sync["commitSync()\nblocking, retries on failure\nat-least-once"]
    Manual --> async["commitAsync(callback)\nnon-blocking, no retry\nat-least-once (with care)"]
    
    sync --> dedupe["Consumer logic must\nhandle duplicates on restart"]
    async --> order["Callback invoked on\nbroker ack or error"]
```

---

## 5. Delivery Semantics & EOS Touch Points

```mermaid
flowchart LR
    subgraph AtMostOnce["At-Most-Once"]
        AMO1["fire-and-forget\nacks=0"] --> AMO2["Producer never retries"]
        AMO2 --> AMO3["Message may be lost\non broker failure"]
    end

    subgraph AtLeastOnce["At-Least-Once"]
        ALO1["acks=1 or acks=-1\nretries>0"] --> ALO2["Broker failure → producer retries"]
        ALO2 --> ALO3["Duplicate records possible\nin topic log"]
    end

    subgraph EOS["Exactly-Once (EOS)"]
        EOS1["enable.idempotence=true\nproducerId + sequence number"] --> EOS2["Broker deduplicates\nin-flight retries via sequence#"]
        EOS2 --> EOS3["Transactions (begin/commit)\nfor cross-partition atomicity"]
        EOS3 --> EOS4["Consumer: isolation.level=\nread_committed\nskips aborted txn markers"]
    end
```

### EOS Transaction Protocol Detail

```mermaid
sequenceDiagram
    participant P as Producer (transactional)
    participant TC as TransactionCoordinator
    participant T1 as Topic Partition A
    participant T2 as Topic Partition B

    P->>TC: InitProducerId(transactional_id)
    TC-->>P: producerId=42, epoch=1

    P->>TC: BeginTransaction
    P->>T1: produce(pid=42, seq=0, data)
    P->>T2: produce(pid=42, seq=0, data)
    P->>TC: AddPartitionsToTransaction([A, B])
    P->>TC: CommitTransaction
    TC->>T1: write COMMIT marker (control record)
    TC->>T2: write COMMIT marker (control record)
    TC-->>P: TransactionCommitted

    Note over T1,T2: Consumers with read_committed<br/>skip records until COMMIT marker received
```

---

## 6. Hierarchical Timing Wheels: Purgatory for Delayed Operations

Kafka handles **delayed operations** (e.g., `acks=-1` waiting for ISR acknowledgements, fetch requests waiting for `fetch.min.bytes`) via a data structure called the **Purgatory** backed by **Hierarchical Timing Wheels**.

```mermaid
flowchart TD
    PA["ProduceRequest\nacks=-1, 3 partitions"] -->|"wrap in DelayedProduce"| Purgatory
    Purgatory -->|"insert into TimingWheel\nat (now + request.timeout.ms)"| TW

    subgraph TW["Hierarchical Timing Wheel"]
        L1["Level 1 (1ms ticks)\n20 buckets → 20ms range"]
        L2["Level 2 (20ms ticks)\n20 buckets → 400ms range"]
        L3["Level 3 (400ms ticks)\n20 buckets → 8s range"]
        L1 -->|overflow| L2 -->|overflow| L3
    end

    ISR["ISR replica fetches\nnew records"] -->|"Watcher list lookup"| tryComplete["tryComplete()\ncheck if ISR acks quorum met"]
    tryComplete -->|"yes"| respond["CompleteOperation\nreturn acks response"]
    tryComplete -->|"no"| wait["stay in purgatory"]

    TW -->|"bucket expires"| expire["Force-expire operation\nreturn timeout error"]
```

**Why near O(1) for wheel bookkeeping?**  
- Insertion uses bucket arithmetic plus list insertion under the timing-wheel assumptions.  
- Advancing an empty bucket is constant work, but expiring a populated bucket also costs O(k) for its k due entries and callbacks.  
- Cascading between levels and cancellation add implementation-dependent work even though a full scan of all timers is avoided.  
- Multi-level design handles wide timeout ranges without wasteful fine-grained buckets at long durations

Source class: `kafka.utils.timer.SystemTimer` / `TimingWheel.scala`

---

## 7. Broker: Request Processing Architecture

```mermaid
flowchart TD
    NIC["Network (TCP)"] --> Acceptor["Acceptor Thread\n(one per listener)"]
    Acceptor -->|round-robin assign| NP["N Processor Threads\n(num.network.threads)"]
    NP -->|Request Queue| RQ["RequestChannel\n(bounded blocking queue)"]
    RQ --> IO["I/O Handler Threads\n(num.io.threads)\n— one per request type"]
    IO --> Log["Log subsystem\n(append / fetch)"]
    IO -->|Response Queue| NP
    NP --> NIC
```

**Separate request queues exist for:**
- `PRODUCE` → `ReplicaManager.appendRecords()`  
- `FETCH` (consumer and replica) → `ReplicaManager.fetchMessages()`  
- `METADATA` → `MetadataCache`  
- `LIST_OFFSETS`, `OFFSET_COMMIT`, `OFFSET_FETCH` → respective managers

---

## 8. ZooKeeper Role (Pre-KRaft)

```mermaid
flowchart LR
    subgraph ZK["ZooKeeper Ensemble"]
        z1["/brokers/ids/0\n/brokers/ids/1\n(ephemeral znodes)"]
        z2["/controller\n(ephemeral: broker holding lock)"]
        z3["/brokers/topics/test/partitions/0/state\n(leader, ISR list)"]
    end

    B0["Broker 0"] -->|registers ephemeral| z1
    B0 -->|"elected controller\nwrites /controller"| z2
    B0 -->|"ISR changes\n→ updatePartitionState"| z3

    Consumer -->|"BootstrapServer → FindCoordinator"| B0
    Note_1["Clients no longer\ncontact ZK directly\n(since Kafka 0.9)"]
```

Controller watches `/brokers/ids/*` for broker join/leave events and triggers `LeaderAndIsrRequest` + `UpdateMetadataRequest` to all live brokers on each topology change.

---

## 9. Consumer Seek & Replay Patterns

```mermaid
flowchart LR
    C["Consumer"] -->|"seekToBeginning(partitions)"| B["Broker"]
    C -->|"seekToEnd(partitions)"| B
    C -->|"seek(partition, specificOffset)"| B
    C -->|"offsetsForTimes(Map<partition,timestamp>)"| B
    B -->|"first offset ≥ timestamp"| C

    subgraph ReplayScenario["Replay Scenario"]
        err["Processing error\ndiscovered T+2days"]
        uuid["new group.id (fresh consumer)\nauto.offset.reset=earliest"]
        reprocess["Re-consume all retained messages\napply fixed logic"]
        err --> uuid --> reprocess
    end
```

Key: Kafka retains data on its own clock (`log.retention.hours`, `log.retention.bytes`) — not on consumer acknowledgement. Multiple independent consumer groups with separate `group.id` can replay the same data without interfering.

---

## 10. Data Pipeline Patterns with Kafka Connect & Flume

```mermaid
flowchart LR
    subgraph Sources
        FS["File/Spooldir\n(Flume agent)"]
        DB["MySQL CDC\n(Debezium connector)"]
        S3in["S3 / HDFS\n(archived data reload)"]
    end

    subgraph Kafka
        T1["topic: raw-events\n(original format preserved)"]
        T2["topic: transformed-events"]
    end

    subgraph Sinks
        S3out["S3 Bucket\n(Secor consumer)"]
        HDFS["HDFS / Analytics"]
        App["Downstream Applications"]
    end

    FS -->|"KafkaSink\nproducer.acks=1"| T1
    DB -->|"Kafka Connect\nDebezium source connector"| T1
    S3in -->|"Kafka Connect S3 source"| T1

    T1 -->|"Streams/Connect\ntransformation"| T2
    T2 --> App
    T1 -->|"Secor (consumer)\narchive before retention expires"| S3out
    S3out -->|"reload for reprocessing"| S3in
```

**Critical design principle**: Store raw events in Kafka unmodified. Downstream consumers or stream processors apply transformations. This allows re-processing with corrected logic by replaying from the raw topic.

---

## 11. Retention vs. Compaction: Decision Matrix

```mermaid
flowchart TD
    Q1{"Data usage pattern?"}
    Q1 -->|"Need full history\ntime-series, audit log"| retain["cleanup.policy=delete\nset log.retention.ms\nor log.retention.bytes"]
    Q1 -->|"Only need latest state\nper key (current value)"| compact["cleanup.policy=compact\nno time-based expiry\n(data lives 'forever')"]
    Q1 -->|"Both: history + latest"| both["cleanup.policy=compact,delete\nCompact to remove dupes,\nDelete old segments by time"]

    retain --> ex1["Examples:\n- application logs\n- clickstream events\n- sensor readings"]
    compact --> ex2["Examples:\n- user profiles\n- inventory levels\n- __consumer_offsets"]
    both --> ex3["Examples:\n- CDC streams\nwhere old snapshots\nare eventually irrelevant"]
```

---

## 12. Message Format: Wire-Level Record Batch

```mermaid
block-beta
  columns 1
  A["RecordBatch (Kafka 0.11+)"]
  B["  baseOffset (8 bytes) — first offset in batch"]
  C["  batchLength (4 bytes)"]
  D["  partitionLeaderEpoch (4 bytes) — fence stale leaders"]
  E["  magic (1 byte) — version 2"]
  F["  crc (4 bytes) — CRC32C over all following fields"]
  G["  attributes (2 bytes) — compression | timestampType | isTransactional | isControl"]
  H["  lastOffsetDelta (4 bytes) — relative offset of last record"]
  I["  firstTimestamp (8 bytes)"]
  J["  maxTimestamp (8 bytes)"]
  K["  producerId (8 bytes) — EOS idempotent producer"]
  L["  producerEpoch (2 bytes)"]
  M["  baseSequence (4 bytes) — sequence dedup"]
  N["  records[] — variable length array"]
  O["    Record: length(varint) | attributes | timestampDelta | offsetDelta | keyLen | key | valueLen | value | headers[]"]
```

`producerId + producerEpoch + baseSequence` form the **idempotency key** the broker uses to reject re-delivered duplicates.

---

## 13. Multithreaded Consumer Patterns (Learning Apache Kafka)

The Java `KafkaConsumer` is **not thread-safe** — one consumer instance per thread. To achieve parallelism:

```mermaid
flowchart TD
    subgraph ThreadPerPartition["Pattern A: Thread per Partition"]
        T1["Thread 1\nConsumer → P0"] 
        T2["Thread 2\nConsumer → P1"]
        T3["Thread 3\nConsumer → P2"]
    end

    subgraph SharedConsumer["Pattern B: Consumer + Worker Pool"]
        SC["Single Consumer Thread\npolls all partitions"]
        SC -->|submit to| WP["Worker Thread Pool\n(ExecutorService)"]
        WP --> W1["Worker 1"]
        WP --> W2["Worker 2"]
        WP --> W3["Worker 3"]
        Note1["⚠ Offset commit must wait\nfor all workers in batch to finish\nor risk at-most-once"]
    end
```

Pattern A is simpler (one consumer per partition, commit independently) but hits the partition limit ceiling. Pattern B allows processing parallelism beyond partition count but requires careful offset management to avoid commit-before-complete semantics.

---

## 14. Kafka Cluster Bootstrap & Leader Discovery

```mermaid
sequenceDiagram
    participant Client as Producer/Consumer
    participant BS as Bootstrap Broker (any)
    participant Leader as Partition Leader Broker

    Client->>BS: MetadataRequest(topic="test")
    BS-->>Client: MetadataResponse\n[broker_id:0 → host:port,\n broker_id:1 → host:port,\n partition 0 leader = broker 1]
    Client->>Leader: ProduceRequest / FetchRequest
    Leader-->>Client: Response

    Note over Client: On leader failover:
    Client->>Leader: ProduceRequest (fails: NOT_LEADER)
    Client->>BS: MetadataRequest (refresh)
    BS-->>Client: New leader = broker 2
    Client->>Broker2: ProduceRequest (success)
```

`bootstrap.servers` only needs to list **2-3 brokers** — not the full cluster. The initial `MetadataRequest` response contains full cluster topology which the client caches.

---

## 15. Replica Reassignment Internals

```mermaid
flowchart LR
    Admin["Admin\nkafka-reassign-partitions.sh"] -->|"--generate\nbuild plan JSON"| Plan["Proposed Reassignment Plan\n{topic, partition, replicas:[...]}"]
    Plan -->|"--execute"| ZK[ZooKeeper /admin/reassign_partitions]
    ZK -->|"watches"| Controller["Controller Broker"]
    Controller -->|"add new replica as learner"| NewBroker["New Broker\n(starts fetching from leader)"]
    NewBroker -->|"catches up (replicates all segments)"| InSync["ISR membership granted"]
    InSync -->|"remove old replica"| Done["Reassignment Complete"]
    Controller -->|"--verify"| Status["Status: complete / still in progress"]
```

During reassignment, new replicas are added as **learners** (not yet in ISR). They replicate from the leader until LEO catches up, then join ISR. Only then is the old replica removed. This prevents data loss during the transition.

---

## Summary: Data Flow Map

```mermaid
flowchart TD
    Prod["Producer\nRecordAccumulator\nbatch → compress → send"] -->|"ProduceRequest"| BrokerAppend["Broker: ReplicaManager\nappend to active segment .log"]
    BrokerAppend -->|"ISR followers fetch"| Replicas["Follower replicas\n(fetch loop, advance LEO)"]
    BrokerAppend -->|"if purgatory: await ISR acks"| Purgatory["TimingWheel Purgatory\ntryComplete on each ISR fetch"]
    Purgatory -->|"acks quorum met"| ProduceResponse["ProduceResponse to Producer"]
    
    Consumer["Consumer\npoll() → FetchRequest"] -->|"broker: sendfile()\nzero-copy from page cache"| ConsumerApp["Consumer Application\nprocess record\ncommitOffset to __consumer_offsets"]

    BrokerAppend -->|"segment roll\nretention / compaction"| LogCleaner["LogCleaner Thread\ncompact dirty segments"]
    LogCleaner --> CleanSegments["Clean Segments\n(one value per key)"]
```
