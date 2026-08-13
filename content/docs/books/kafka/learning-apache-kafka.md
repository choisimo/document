# Learning Apache Kafka (2nd Edition) — Under the Hood

> **Source**: Nishant Garg, Packt Publishing, 2015 (Kafka 0.8.x era)  
> **Focus**: Internal broker architecture, ZooKeeper coordination, partition log mechanics, ISR replication pipeline, producer/consumer offset state machines

## Historical boundary

- This document is an explicit Kafka 0.8.x study guide. ZooKeeper paths, high-level consumer APIs, offset storage, message formats, defaults, and controller behavior are historical unless a section says otherwise.
- Do not apply commands or sizing advice to a current cluster without mapping the concept to the deployed Kafka version and KRaft/ZooKeeper mode.
- Performance ratios are illustrative. Reproduce them with named storage, batching, compression, page-cache state, payload and percentile.
- For migration, record which invariant remains, which API or component was replaced, and how current logs and metrics prove the equivalent behavior.

---

## 1. Kafka's Architectural DNA: Why It Was Built This Way

Kafka emerged from LinkedIn's need to handle activity stream data and operational metrics at scale — a problem that JMS-style queuing systems couldn't solve efficiently due to broker-side metadata overhead, synchronous delivery contracts, and single-consumer semantics.

The core design principles that shape every internal decision:

```mermaid
flowchart TD
    subgraph Design["Kafka Design Axioms"]
        A["Messages are stored in<br/>partition log segments"] -->|append-oriented path| B["Sequential I/O can outperform<br/>random I/O; measure on target storage"]
        B --> C["Consumers pull, never push<br/>State held by consumer, not broker"]
        C --> D["Broker stores logs and metadata<br/>consumer position is decoupled from fetch"]
        D --> E["Partitions are the unit<br/>of parallelism and replication"]
    end
```

These axioms cascade into every subsystem: the log format, ZooKeeper schema, ISR mechanism, and consumer group rebalancing protocol.

---

## 2. Broker Internal Architecture: Log Segments and Page Cache

Each Kafka broker maps every topic-partition to segment files. Kafka relies heavily on the OS page cache and transfer paths, but requests, indexes, buffers and metadata can still consume JVM heap or native memory. The exact use of mmap, `sendfile`, TLS fallbacks and copying is implementation- and platform-dependent.

```mermaid
block-beta
  columns 3
  block:disk["Disk — /tmp/kafka-logs/"]:3
    seg0["segment-0.log\n(0 → 999)"]
    seg1["segment-1.log\n(1000 → 1999)"]
    seg2["segment-2.log\n(2000 → active)"]
  end
  block:idx["Index Files"]:3
    i0[".index (offset → byte pos)"]
    i1[".index"]
    i2[".index (active)"]
  end
  block:cache["OS Page Cache"]:3
    p0["Hot pages\n(recent writes)"]
    p1["Warm pages\n(recent reads)"]
    p2["Cold pages\n(eviction candidates)"]
  end
  seg2 --> p0
  i2 --> p0
```

**Write path internals:**
1. Producer sends `ProduceRequest` → broker's `SocketServer` thread accepts via Java NIO
2. `RequestHandlerPool` dispatches to `ReplicaManager.appendRecords()`
3. `Log.append()` serializes `MessageSet` → writes to active segment's `FileChannel`
4. OS page cache absorbs write → async flush to disk after `log.flush.interval.messages` or `log.flush.interval.ms`
5. Once flushed, `LogManager` makes segment available to consumers by advancing **High Watermark (HW)**

```mermaid
sequenceDiagram
    participant P as Producer
    participant SN as SocketServer<br/>(NIO thread)
    participant RH as RequestHandler<br/>(thread pool)
    participant RM as ReplicaManager
    participant Log as Log.append()
    participant FS as FileSystem<br/>(page cache)

    P->>SN: ProduceRequest(topic, partition, messages)
    SN->>RH: enqueue request
    RH->>RM: appendRecords(leaderEpoch, messages)
    RM->>Log: append to active segment
    Log->>FS: FileChannel.write(ByteBuffer)
    FS-->>Log: buffered in page cache
    Log-->>RM: LogAppendInfo(firstOffset, lastOffset)
    RM-->>P: ProduceResponse(acks) after ISR flush
```

---

## 3. ZooKeeper Coordination Fabric

In Kafka 0.8.x, ZooKeeper serves as the central coordination layer — a hierarchical key-value store that all brokers and consumers watch for state changes.

### ZooKeeper Znode Schema

```mermaid
flowchart TD
    root["/"] --> brokers["/brokers"]
    root --> consumers["/consumers"]
    root --> config["/config"]
    
    brokers --> ids["/brokers/ids/\n├── 0  (broker 0 alive)\n├── 1  (broker 1 alive)\n└── 2  (broker 2 alive)"]
    brokers --> topics["/brokers/topics/\n└── my-topic/\n    └── partitions/\n        ├── 0/state → leader=1, ISR=[1,2]\n        ├── 1/state → leader=2, ISR=[2,0]\n        └── 2/state → leader=0, ISR=[0,1]"]
    
    consumers --> groups["/consumers/\n└── my-group/\n    ├── ids/ (live consumers)\n    ├── owners/ (partition → consumer)\n    └── offsets/ (partition → offset)"]
```

**Key coordination flows:**

| Event | ZooKeeper Operation |
|-------|-------------------|
| Broker starts | Creates ephemeral znode `/brokers/ids/{id}` |
| Broker fails | Ephemeral znode auto-deleted → triggers watches |
| Leader election | Controller watches broker deletion → writes new ISR to `/brokers/topics/…/state` |
| Consumer joins group | Creates ephemeral `/consumers/{group}/ids/{consumer-id}` |
| Consumer offset commit | Writes to `/consumers/{group}/offsets/{topic}/{partition}` |

```mermaid
sequenceDiagram
    participant B1 as Broker 1 (fails)
    participant ZK as ZooKeeper
    participant Ctrl as Controller (Broker 0)
    participant B2 as Broker 2

    B1->>ZK: ephemeral session expires
    ZK-->>Ctrl: watch fired: /brokers/ids/1 deleted
    Ctrl->>ZK: read /brokers/topics/X/partitions/0/state
    ZK-->>Ctrl: {leader: 1, ISR: [1, 2]}
    Ctrl->>Ctrl: elect new leader from ISR → B2
    Ctrl->>ZK: write /brokers/topics/X/partitions/0/state<br/>{leader: 2, ISR: [2]}
    ZK-->>B2: watch fired: you are new leader
    B2->>B2: truncate log to HW<br/>open partition for reads/writes
```

---

## 4. Producer Internals: Metadata, Partitioning, and Async Batching

### Metadata Bootstrap and Leader Discovery

Before a producer can write, it must discover the **lead replica** for each target partition. This bootstraps via `metadata.broker.list` — only used for the initial metadata request.

```mermaid
sequenceDiagram
    participant Prod as Producer
    participant B0 as Any Broker (seed)
    participant BL as Lead Broker

    Prod->>B0: TopicMetadataRequest(topic)
    B0-->>Prod: {partition: 0, leader: broker_id=2, replicas: [2,1,0], ISR: [2,1]}
    Prod->>Prod: cache metadata locally
    Prod->>BL: ProduceRequest(partition=0, messages)
    BL-->>Prod: ProduceResponse(ack)
```

### Partitioner Hash Mechanics

The default `DefaultPartitioner` hashes the key modulo partition count:

```
partition = hash(key) % num_partitions
```

Custom partitioner example from the book (IP-based routing):

```mermaid
flowchart LR
    msg["Message: clientIP=192.168.14.37"] --> extract["Extract last octet: 37"]
    extract --> mod["37 % 5 partitions = 2"]
    mod --> p2["Partition 2 on Lead Broker"]
    
    style p2 fill:#2d6a4f,color:#fff
```

**Why key-based partitioning matters internally**: All messages with the same key land on the same partition → same ordered log → consumers see messages in causal order per key. This is the basis for event sourcing and stream joins.

### Async Mode Internal Buffer

```mermaid
stateDiagram-v2
    [*] --> Accumulating: producer.type=async
    Accumulating --> Flushing: queue.time elapsed OR batch.size reached
    Flushing --> Serializing: ProducerSendThread dequeues
    Serializing --> Dispatching: EventHandler.serialize()
    Dispatching --> Sent: ProduceRequest → lead broker
    Sent --> Accumulating: continue buffering
    
    Accumulating --> DATALOSS: Producer crash
    note right of DATALOSS: In-memory data lost\nNo WAL for async mode
```

| Configuration | Effect |
|--------------|--------|
| `queue.time` (ms) | Max buffer time before flush |
| `batch.size` | Max message count before flush |
| `request.required.acks=0` | Fire-and-forget (no confirmation) |
| `request.required.acks=1` | Ack from lead replica only |
| `request.required.acks=-1` | Ack from all ISR replicas |

---

## 5. Replication Pipeline: ISR Mechanics Under Load

Kafka 0.8's replication protocol is synchronous by design for committed messages, but async for propagation.

### ISR Replication State Machine

```mermaid
stateDiagram-v2
    [*] --> InSync: Follower catches up to leader LEO
    InSync --> Lagging: Follower falls behind by replica.lag.time.max.ms
    Lagging --> OutOfISR: Leader removes follower from ISR
    OutOfISR --> CatchingUp: Follower truncates log to HW, re-fetches
    CatchingUp --> InSync: Follower fully caught up → leader adds back to ISR
    
    InSync --> Dead: Broker crash
    Dead --> CatchingUp: Broker restarts
```

### Commit Protocol (High Watermark)

The **High Watermark (HW)** is the offset of the last message **replicated to all ISR members**. Consumers only see messages at or below HW — this is what guarantees consistency.

```mermaid
flowchart TD
    subgraph Leader["Lead Broker — Partition 0"]
        LEO_L["LEO = 1005\n(latest written offset)"]
        HW_L["HW = 1000\n(committed to all ISR)"]
    end
    
    subgraph F1["Follower Broker 1"]
        LEO_F1["LEO = 1004\n(slightly behind)"]
        HW_F1["HW = 1000\n(same as leader)"]
    end
    
    subgraph F2["Follower Broker 2"]
        LEO_F2["LEO = 1000\n(most behind)"]
        HW_F2["HW = 1000"]
    end
    
    LEO_L -->|"ISR = [Lead, F1, F2]\nMin(LEO) = 1000\n→ advance HW to 1000"| HW_L
    
    Consumer["Consumer\n(reads up to HW=1000 only)"]
    HW_L --> Consumer
```

**Leader failover with log truncation:**

```mermaid
sequenceDiagram
    participant L as Leader (fails at offset 1005)
    participant F1 as Follower 1 (LEO=1004)
    participant F2 as Follower 2 (LEO=1001, first in ISR)
    participant ZK as ZooKeeper

    L->>L: crash (LEO=1005, HW=1000)
    F2->>ZK: register as candidate for new leader
    ZK-->>F2: you are new leader (first registered)
    F2->>F2: new HW = my LEO = 1001
    
    F1->>F1: truncate log to HW=1001
    F1->>F2: FetchRequest from offset 1001
    F2-->>F1: messages 1001..1004
    F1->>F1: now LEO=1004, catch up to leader
    F2->>ZK: write new ISR = [F2, F1]
```

---

## 6. Consumer Architecture: Pull Model and Offset State Machine

### High-Level API Internal Architecture

The `ZookeeperConsumerConnector` abstracts the entire consumer state machine:

```mermaid
flowchart TD
    App["Application Thread"] -->|createMessageStreams| ZCC["ZookeeperConsumerConnector"]
    ZCC --> KS1["KafkaStream[K,V] — Partition 0\n(BlockingQueue[FetchedDataChunk])"]
    ZCC --> KS2["KafkaStream[K,V] — Partition 1"]
    ZCC --> KS3["KafkaStream[K,V] — Partition 2"]
    
    subgraph FetchLoop["Fetch Thread Pool"]
        FT1["FetcherThread — Broker 0"]
        FT2["FetcherThread — Broker 1"]
    end
    
    FT1 -->|"FetchRequest(offset=last_committed)"| B0["Broker 0"]
    B0 -->|"FetchResponse(messages)"| KS1
    FT2 -->|"FetchRequest"| B1["Broker 1"]
    B1 -->|"FetchResponse"| KS2
    
    subgraph ZK["ZooKeeper"]
        Offsets["/consumers/group/offsets/topic/partition"]
    end
    
    ZCC -->|"auto.commit.interval.ms"| ZK
```

### Offset Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> NoOffset: Consumer group never consumed topic
    NoOffset --> AutoReset: auto.offset.reset=largest/smallest
    AutoReset --> Consuming: fetch from largest (tail) or smallest (head)
    Consuming --> CommitPending: messages processed
    CommitPending --> Committed: auto.commit.interval.ms triggers\n→ write to ZooKeeper
    Committed --> Consuming: continue fetching from committed+1
    
    Consuming --> Rebalancing: consumer joins/leaves group
    Rebalancing --> Consuming: new partition assignment
    
    Rebalancing --> DuplicateRead: crash before commit
    note right of DuplicateRead: at-least-once delivery\nby design
```

### Consumer Group Rebalancing Mechanics

When any consumer joins or leaves a group, ZooKeeper fires a watch → all consumers in the group rebalance:

```mermaid
sequenceDiagram
    participant C1 as Consumer 1 (existing)
    participant C2 as Consumer 2 (new)
    participant ZK as ZooKeeper
    participant B as Broker

    C2->>ZK: create ephemeral /consumers/group/ids/C2
    ZK-->>C1: watch fired: new member C2
    ZK-->>C2: you are registered
    
    C1->>C1: release all partition ownership
    C2->>C2: calculate new partition assignment
    C1->>C1: calculate new partition assignment
    
    Note over C1,C2: Assignment algorithm: sort consumers + partitions,<br/>distribute round-robin
    
    C1->>ZK: claim /consumers/group/owners/topic/partition-0 → C1
    C1->>ZK: claim /consumers/group/owners/topic/partition-1 → C1
    C2->>ZK: claim /consumers/group/owners/topic/partition-2 → C2
    
    C1->>B: FetchRequest(partition=0, offset=last_committed)
    C2->>B: FetchRequest(partition=2, offset=last_committed)
```

**Rebalancing hazard**: If a new consumer starts with an existing `group.id`, in-flight consumers release partitions mid-stream → some messages may be re-delivered to the new consumer. This is the "ambiguous behavior" the book warns about.

---

## 7. Log Compaction Internals

Log compaction is a background process that eliminates superseded key-value records, preserving only the most recent value per key.

```mermaid
flowchart LR
    subgraph Before["Before Compaction — Partition Log"]
        direction TB
        m0["offset=0: key=A val=v1"]
        m1["offset=1: key=B val=v1"]
        m2["offset=2: key=A val=v2"]
        m3["offset=3: key=C val=v1"]
        m4["offset=4: key=B val=v2"]
        m5["offset=5: key=A val=v3"]
    end

    subgraph After["After Compaction"]
        direction TB
        r1["offset=1: key=B val=v1 ❌ (superseded)"]
        r3["offset=3: key=C val=v1 ✅"]
        r4["offset=4: key=B val=v2 ✅"]
        r5["offset=5: key=A val=v3 ✅"]
    end
    
    Before -->|"LogCleaner thread\n(background)"| After
    
    style r1 fill:#c0392b,color:#fff
    style r3 fill:#27ae60,color:#fff
    style r4 fill:#27ae60,color:#fff
    style r5 fill:#27ae60,color:#fff
```

**Compaction properties:**
- Ordering of retained messages is always preserved (offsets are monotonically increasing)
- Once a key's record is compacted away, its offset no longer exists — consumers observing a gap in offsets must skip ahead
- The "head" of the log (recent messages) is never compacted; only the "tail" (old segments) is eligible

---

## 8. Message Compression Pipeline

Kafka 0.8's compression operates at the **MessageSet** level, not per-message — enabling superior compression ratios via batch entropy reduction.

```mermaid
flowchart TD
    subgraph Producer["Producer Side"]
        msgs["Messages: M1, M2, M3, M4"]
        batch["Batch as MessageSet"]
        compress["GZIP/Snappy compress(MessageSet)"]
        envelope["Wrap in outer Message\nattributes byte = codec_id"]
    end
    
    subgraph Broker["Broker 0.8 — Lead Replica"]
        recv["Receive compressed envelope"]
        decomp["Decompress inner MessageSet"]
        assign["Assign logical offsets to each inner message"]
        recommp["Re-compress with offsets embedded"]
        append["Append to segment log"]
    end
    
    subgraph Consumer["Consumer Side"]
        fetch["Fetch compressed envelope"]
        cdecomp["Decompress → extract messages with offsets"]
        process["Process individual messages"]
    end
    
    msgs --> batch --> compress --> envelope
    envelope --> recv --> decomp --> assign --> recommp --> append
    append --> fetch --> cdecomp --> process
```

**The 0.8 compression penalty**: Unlike 0.7 (where compressed batches passed through the broker opaquely), 0.8 brokers must decompress → assign per-message logical offsets → re-compress. This causes measurable CPU load on the lead broker for high-throughput compressed topics.

**Compression attribute byte layout** (lowest 2 bits):
```
00 = uncompressed
01 = GZIP
10 = Snappy
11 = LZ4 (later versions)
```

---

## 9. Kafka 0.8 cluster topology: partition leaders and a controller

Unlike traditional databases with primary/secondary, Kafka uses a **controller** broker (elected via ZooKeeper) for administrative operations only — not for data paths.

```mermaid
flowchart TD
    subgraph Cluster["Kafka Cluster (3 Brokers)"]
        B0["Broker 0\n(Controller)\nLeader: partition-2"]
        B1["Broker 1\nLeader: partition-0"]
        B2["Broker 2\nLeader: partition-1"]
    end
    
    subgraph ZooKeeper["ZooKeeper Ensemble"]
        ZKL["ZK Leader"]
        ZKF1["ZK Follower 1"]
        ZKF2["ZK Follower 2"]
    end
    
    subgraph Clients["Clients"]
        P["Producer"]
        C["Consumer"]
    end
    
    B0 <-->|"ISR sync\n(partition-0 follower)"| B1
    B1 <-->|"ISR sync\n(partition-1 follower)"| B2
    B2 <-->|"ISR sync\n(partition-2 follower)"| B0
    
    B0 --> ZKL
    B1 --> ZKL
    B2 --> ZKL
    
    P -->|"metadata req → any broker"| B0
    P -->|"produce → lead broker"| B1
    C -->|"fetch → lead broker"| B1
    
    B0 -->|"controller: writes ISR\nleader election decisions"| ZKL
```

**Why no master for data paths?** Each producer connects directly to the lead broker for each partition — removing a central hotspot. The controller's role is purely metadata: writing ISR updates, triggering leader elections when brokers fail.

---

## 10. Multi-Broker Single-Node vs Multi-Node: What Changes Internally

```mermaid
block-beta
  columns 2
  block:single["Single-Node Multi-Broker"]:1
    b0s["Broker 0\nport:9092\nlog:/tmp/kafka-0"]
    b1s["Broker 1\nport:9093\nlog:/tmp/kafka-1"]
    b2s["Broker 2\nport:9094\nlog:/tmp/kafka-2"]
    zks["ZooKeeper\nlocalhost:2181"]
  end
  block:multi["Multi-Node Multi-Broker"]:1
    b0m["Broker 0 — Node A\nport:9092"]
    b1m["Broker 1 — Node B\nport:9092"]
    b2m["Broker 2 — Node C\nport:9092"]
    zkm["ZooKeeper Ensemble\n3 nodes"]
  end
```

**Internal difference**: In single-node multi-broker, all brokers share the same NIC → replication traffic competes with producer/consumer traffic. In multi-node, replication traffic crosses the network but benefits from node-level failure isolation.

---

## 11. Kafka 0.8 vs Modern Kafka: What This Era Reveals

| Aspect | Kafka 0.8 (this book) | Modern Kafka (2.x+) |
|--------|----------------------|---------------------|
| Offset storage | ZooKeeper znodes | Internal `__consumer_offsets` topic |
| Consumer group coordination | ZooKeeper watches | Group Coordinator broker |
| Leader election | ZooKeeper + Controller | KRaft (Raft-based, no ZK) |
| Producer API | `kafka.javaapi.producer.Producer` | `KafkaProducer` (new API) |
| Compression re-assignment | Broker decompresses+recompresses | Broker passes through (magic byte v2) |
| Exactly-once | Not supported | Transactional API + idempotent producer |

Understanding the 0.8 era illuminates *why* the modern APIs were redesigned — every pain point (ZooKeeper offset contention, rebalancing storms, compression CPU overhead) has a specific architectural fix in the later versions.

---

## Summary: Internal Data Flow Map

```mermaid
flowchart LR
    Producer -->|"1. TopicMetadataRequest\n(seed broker)"| AnyBroker
    AnyBroker -->|"2. leader=B1, ISR=[B1,B2]"| Producer
    Producer -->|"3. ProduceRequest(partition=0)\ncompressed MessageSet"| LeadBroker["Lead Broker B1"]
    
    LeadBroker -->|"4. decompress → assign offsets\n→ recompress → append to log"| SegLog["Segment Log\n(page cache)"]
    LeadBroker -->|"5. FetchRequest pulled by followers"| FollowerB2["Follower B2"]
    FollowerB2 -->|"6. FetchResponse → append\n→ ACK to leader"| LeadBroker
    
    LeadBroker -->|"7. advance HW after ISR ack\n→ ProduceResponse to producer"| Producer
    
    Consumer -->|"8. read /consumers/group/offsets in ZK"| ZK["ZooKeeper"]
    ZK -->|"9. last committed offset"| Consumer
    Consumer -->|"10. FetchRequest(offset=N)"| LeadBroker
    LeadBroker -->|"11. messages [N..HW]"| Consumer
    Consumer -->|"12. process → commit offset+N to ZK"| ZK
```

The entire system — from log append to consumer pull — is designed around **sequential I/O + OS page cache + pull-based consumers + stateless brokers**. Every design decision traces back to these four principles.
