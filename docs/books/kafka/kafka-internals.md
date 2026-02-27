# Apache Kafka — Under the Hood: Internal Architecture & Data Flow

> Sources: *Kafka: The Definitive Guide (2nd Edition)* — Shapira, Palino, Sivaram, Narkhede (O'Reilly 2022); *Kafka in Action* — Dylan Scott (Manning)

---

## 1. The Commit Log as Foundational Data Structure

Kafka's central abstraction is not a queue — it is a **durable, ordered, append-only log**. Every partition is one log. Understanding the log's physical layout is the prerequisite to understanding everything else.

```mermaid
block-beta
  columns 3
  A["Partition 0\n.log segment files"] B["Partition 1\n.log segment files"] C["Partition 2\n.log segment files"]
  D["00000000000000000000.log\n00000000000000000000.index\n00000000000000000000.timeindex"] E["00000000000000000412.log\n00000000000000000412.index\n..."] F["00000000000000000891.log\n..."]
```

Each segment triple:
- `.log` — raw message bytes, appended sequentially
- `.index` — sparse offset → byte-position mapping (binary search entry point)
- `.timeindex` — timestamp → offset mapping (time-based seek)

The **active segment** is the only file receiving writes. Once a segment reaches `log.segment.bytes` (default 1 GB) or `log.roll.hours` (default 168 h), Kafka rolls a new active segment. Old segments are candidates for deletion or compaction based on retention policy.

```mermaid
flowchart LR
  Producer -->|"ProduceRequest\n(batch of records)"| NetworkThread
  NetworkThread -->|"enqueue to\nrequest queue"| RequestHandlerPool
  RequestHandlerPool -->|"append to\nReplicaManager"| LogManager
  LogManager -->|"FileChannel.write()\n(OS page cache)"| DiskSegment[".log file\n(mmap / page cache)"]
  DiskSegment -.->|"fsync (configurable)"| Disk[(Physical Disk)]
```

**Key insight**: Kafka does not call `fsync` per-message by default (`log.flush.interval.messages=Long.MAX_VALUE`). Durability comes from **replication**, not from forced disk flushes. The OS page cache absorbs writes; the broker later flushes via background OS writeback.

---

## 2. Partition Anatomy and Offset Mechanics

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Offset_0 : first produce
  Offset_0 --> Offset_1
  Offset_1 --> Offset_N : append-only
  Offset_N --> ActiveSegment : current write head
  ActiveSegment --> Rolled : segment full / roll time
  Rolled --> Retention : age / size check
  Retention --> Deleted : time/size policy
  Retention --> Compacted : cleanup.policy=compact
```

The `.index` file stores sparse entries: `(relative_offset, file_position)` pairs at configurable granularity (`log.index.interval.bytes`). Consumer seek to offset `N`:

1. Binary search `.index` for largest entry ≤ N → byte position `P`
2. Seek `.log` to `P`, scan forward until offset `N` found

This gives **O(log n)** seek on sparse index + bounded linear scan.

---

## 3. Producer Internals: RecordAccumulator and Batching

A Kafka producer does not send records one-at-a-time. The entire pipeline is designed around batching and async delivery.

```mermaid
sequenceDiagram
  participant App
  participant KafkaProducer
  participant Serializer
  participant Partitioner
  participant RecordAccumulator
  participant Sender
  participant NetworkClient
  participant Broker

  App->>KafkaProducer: send(ProducerRecord)
  KafkaProducer->>Serializer: serialize(key, value) → byte[]
  KafkaProducer->>Partitioner: partition(record, cluster_metadata) → partitionId
  KafkaProducer->>RecordAccumulator: append(tp, serializedRecord)
  Note over RecordAccumulator: Batches keyed by TopicPartition<br/>Each batch: ProducerBatch<br/>Drains when: batch.size full<br/>OR linger.ms elapsed
  RecordAccumulator-->>Sender: drain() → Map<Node, List<ProducerBatch>>
  Sender->>NetworkClient: send(ProduceRequest) per broker node
  NetworkClient->>Broker: TCP → ProduceRequest (batches)
  Broker-->>NetworkClient: ProduceResponse (offsets assigned)
  NetworkClient-->>KafkaProducer: fire callbacks
  KafkaProducer-->>App: RecordMetadata (topic, partition, offset)
```

**RecordAccumulator** is a `CopyOnWriteMap<TopicPartition, Deque<ProducerBatch>>`. The `Sender` thread drains it continuously, grouping all batches destined for the same broker into a single `ProduceRequest`. This minimizes TCP round-trips: one request per broker per drain cycle, regardless of how many partitions live on that broker.

```mermaid
flowchart TD
  subgraph RecordAccumulator
    TP0[TopicPartition 0] --> B0["ProducerBatch (filling)"]
    TP1[TopicPartition 1] --> B1["ProducerBatch (full→drained)"]
    TP2[TopicPartition 2] --> B2["ProducerBatch (linger.ms expired)"]
  end
  B1 --> GroupByNode["Group batches\nby destination Node"]
  B2 --> GroupByNode
  GroupByNode -->|"Node 1: [TP0-batch, TP2-batch]"| ProduceRequest1
  GroupByNode -->|"Node 2: [TP1-batch]"| ProduceRequest2
```

### Partitioning Algorithm

Default (no key): **sticky partitioner** (Kafka 2.4+). The producer selects a random partition and sticks to it until the batch fills or linger.ms fires, then rotates. This maximizes batch fill efficiency.

With a key: `murmur2(key) % numPartitions`. Same key → same partition, always. This is a deterministic mapping baked into `DefaultPartitioner` — it survives broker restarts because partition count doesn't change (without explicit repartitioning).

---

## 4. Idempotent Producer and Exactly-Once Semantics

```mermaid
flowchart LR
  subgraph Producer
    PID["Producer ID (PID)\nassigned by broker"]
    SEQ["Per-partition sequence\ncounter: 0,1,2,3..."]
  end
  subgraph Broker
    Log["Partition log"]
    SeqTracker["Last seen sequence\nper (PID, partition)"]
  end

  Producer -->|"ProduceRequest:\nPID=42, seq=7, batch"| Broker
  Broker -->|"seq == lastSeen+1 ✓"| Log
  Broker -->|"seq == lastSeen (dup) → discard"| Log
  Broker -->|"seq > lastSeen+1 → OutOfOrderException"| Producer
```

The broker maintains a **sequence number window** per `(PID, partition)`. If a producer retries due to network failure, the broker deduplicates by checking if the incoming sequence is already committed. This eliminates duplicates **within a single producer session** with zero application-level code.

For **cross-partition / cross-session** exactly-once (transactional API):

```mermaid
sequenceDiagram
  participant Producer
  participant TransactionCoordinator
  participant Broker_P0
  participant Broker_P1

  Producer->>TransactionCoordinator: initTransactions() → epoch assigned
  Producer->>TransactionCoordinator: beginTransaction()
  Producer->>Broker_P0: send(records, transactional_id)
  Producer->>Broker_P1: send(records, transactional_id)
  Producer->>TransactionCoordinator: commitTransaction()
  TransactionCoordinator->>Broker_P0: WriteTxnMarker (COMMIT)
  TransactionCoordinator->>Broker_P1: WriteTxnMarker (COMMIT)
  Note over Broker_P0,Broker_P1: Consumers with isolation.level=read_committed<br/>only see records after COMMIT marker
```

The transaction coordinator uses a special internal topic `__transaction_state` (50 partitions by default) as its durable log. The two-phase commit protocol (prepare → commit markers) ensures atomicity across partitions.

---

## 5. Broker Request Pipeline: The I/O Thread Model

```mermaid
flowchart TD
  subgraph Network Layer
    AcceptThread["Acceptor Thread\n(1 per listener)"]
    Proc0["Processor Thread 0"]
    Proc1["Processor Thread 1"]
    ProcN["Processor Thread N\n(num.network.threads)"]
  end
  subgraph Request Handling
    RQ["Request Queue\n(blocking queue)"]
    RH0["Request Handler 0"]
    RH1["Request Handler 1"]
    RHM["Request Handler M\n(num.io.threads)"]
    RespQ["Response Queue"]
  end
  subgraph Storage
    RM["ReplicaManager"]
    LM["LogManager"]
    Disk[(Segment Files)]
  end

  AcceptThread --> Proc0
  AcceptThread --> Proc1
  AcceptThread --> ProcN
  Proc0 -->|"parsed Request"| RQ
  Proc1 --> RQ
  ProcN --> RQ
  RQ --> RH0
  RQ --> RH1
  RQ --> RHM
  RH0 -->|"ProduceRequest"| RM
  RM --> LM
  LM --> Disk
  RH0 -->|"FetchRequest"| RM
  RM -->|"bytes"| RespQ
  RespQ --> Proc0
```

- **Acceptor**: one thread per listener (PLAINTEXT, SSL), accepts TCP connections, hands them to processor threads via round-robin
- **Processor threads** (`num.network.threads`, default 3): reads from socket → deserializes → enqueues to request queue; writes responses back to sockets
- **Request handler pool** (`num.io.threads`, default 8): dequeues requests, calls `ReplicaManager`, returns response object to processor's response queue

This design separates network I/O (non-blocking) from disk I/O (potentially blocking on page cache misses), preventing slow disk operations from stalling the network layer.

---

## 6. Replication: ISR, Leader Election, HWM

```mermaid
flowchart LR
  Producer -->|"ProduceRequest\nacks=-1"| LeaderBroker

  subgraph LeaderBroker["Leader (Broker 1)"]
    LeaderLog["Partition Log\nLEO=100"]
    HWM["HWM=95\n(High Watermark)"]
  end

  subgraph Replica2["Follower (Broker 2)"]
    FollowerLog2["Partition Log\nLEO=98"]
  end

  subgraph Replica3["Follower (Broker 3)"]
    FollowerLog3["Partition Log\nLEO=100"]
  end

  LeaderLog -->|"FetchRequest response\n(batches)"| FollowerLog2
  LeaderLog -->|"FetchRequest response"| FollowerLog3
  Replica2 -->|"FetchRequest\noffset=98"| LeaderBroker
  Replica3 -->|"FetchRequest\noffset=100"| LeaderBroker
  HWM -.->|"Consumer can read\nonly up to HWM"| Consumer
```

**ISR (In-Sync Replicas)**: the set of replicas whose LEO (Log End Offset) is within `replica.lag.time.max.ms` (default 30 s) of the leader's LEO. The HWM advances to `min(LEO across all ISR members)`.

When `acks=-1` (all), the producer waits until all ISR replicas have confirmed the write. This is what makes Kafka durable without `fsync`.

**ISR shrink**: if a follower falls behind (network partition, GC pause), leader removes it from ISR. HWM can now advance faster (smaller quorum). The controller writes ISR changes to `__cluster_metadata` (KRaft) or ZooKeeper.

**Unclean leader election** (`unclean.leader.election.enable`): if all ISR replicas die, Kafka can elect an out-of-sync follower as leader. This recovers availability at the cost of data loss.

---

## 7. Consumer Group Internals: Rebalance Protocol

```mermaid
sequenceDiagram
  participant C1 as Consumer 1
  participant C2 as Consumer 2
  participant GC as GroupCoordinator (Broker)

  C1->>GC: FindCoordinator(group.id)
  GC-->>C1: CoordinatorId=Broker3
  C1->>GC: JoinGroup(group.id, memberId="", protocols=[RangeAssignor])
  C2->>GC: JoinGroup(group.id, memberId="", protocols=[RangeAssignor])
  Note over GC: Waits for rebalance timeout<br/>Selects leader = first joiner (C1)
  GC-->>C1: JoinGroupResponse(leader=true, memberList=[C1,C2], generationId=1)
  GC-->>C2: JoinGroupResponse(leader=false, generationId=1)
  C1->>C1: Compute partition assignment (RangeAssignor)
  C1->>GC: SyncGroup(groupId, generationId=1, assignments={C1→[P0,P1], C2→[P2,P3]})
  C2->>GC: SyncGroup(groupId, generationId=1, assignments={})
  GC-->>C1: SyncGroupResponse(assignment=[P0,P1])
  GC-->>C2: SyncGroupResponse(assignment=[P2,P3])
  loop Heartbeat (heartbeat.interval.ms)
    C1->>GC: Heartbeat(generationId=1)
    GC-->>C1: OK
  end
```

The **group coordinator** is a broker determined by: `hash(group.id) % __consumer_offsets.numPartitions`. The coordinator stores committed offsets in `__consumer_offsets`.

**Cooperative rebalancing** (Kafka 2.4+ `CooperativeStickyAssignor`): instead of revoking all partitions and reassigning, only the partitions that need to move are revoked. This eliminates the "stop-the-world" pause of eager rebalancing.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Empty : no members
  Empty --> PreparingRebalance : member joins/leaves
  PreparingRebalance --> CompletingRebalance : all JoinGroup received
  CompletingRebalance --> Stable : all SyncGroup received
  Stable --> PreparingRebalance : member join/leave/timeout
```

---

## 8. Offset Commit Internals

```mermaid
flowchart TD
  Consumer -->|"commitSync()\nor commitAsync()"| GroupCoordinator
  GroupCoordinator -->|"append to\n__consumer_offsets partition"| OffsetLog["__consumer_offsets\n(compacted topic)"]
  OffsetLog -->|"key=(group,topic,partition)\nvalue=(offset,metadata,timestamp)"| CompactionCleaner
  CompactionCleaner -->|"retain latest offset\nper key"| RetainedOffsets

  subgraph OffsetFetch
    Consumer2["New consumer\n(restart or rebalance)"] -->|"OffsetFetch request"| GroupCoordinator
    GroupCoordinator -->|"reads from\nin-memory cache\n(loaded from __consumer_offsets)"| Consumer2
  end
```

On broker startup, the coordinator **replays** the entire `__consumer_offsets` partition to rebuild its in-memory offset map. Compaction ensures this replay stays bounded — only the latest committed offset per `(group, topic, partition)` key is retained.

---

## 9. Log Compaction Mechanics

Compaction preserves **the latest value for each key** indefinitely, enabling Kafka to act as a key-value changelog store.

```mermaid
flowchart LR
  subgraph BeforeCompaction["Before Compaction"]
    direction TB
    R0["offset=0 key=A val=1"]
    R1["offset=1 key=B val=10"]
    R2["offset=2 key=A val=2"]
    R3["offset=3 key=C val=5"]
    R4["offset=4 key=B val=20"]
    R5["offset=5 key=A val=3"]
  end
  subgraph AfterCompaction["After Compaction"]
    direction TB
    R3b["offset=3 key=C val=5"]
    R4b["offset=4 key=B val=20"]
    R5b["offset=5 key=A val=3"]
  end
  BeforeCompaction -->|"cleaner thread\n(dirty ratio threshold)"| AfterCompaction
```

The **log cleaner** (background thread pool) operates on the "dirty" portion of the log — segments that have not been cleaned since the last pass. It:
1. Builds an in-memory `OffsetMap` (key hash → max offset seen so far) by scanning dirty segments
2. Re-copies records to new segments, skipping any record whose key has a higher-offset entry in the map
3. Replaces old segments with cleaned segments atomically

**Tombstones**: a record with key=K and null value is a deletion marker. The cleaner retains tombstones for `delete.retention.ms` (default 24 h) to allow consumers to observe the deletion, then purges them.

---

## 10. ZooKeeper → KRaft Migration

Pre-3.0 Kafka used ZooKeeper to store:
- Broker registration (`/brokers/ids/`)
- Topic configurations (`/config/topics/`)
- ISR state (`/brokers/topics/<t>/partitions/<p>/state`)
- Controller election (`/controller`)

This created a metadata bottleneck: every partition state change required a ZooKeeper write. At 200K partitions, this became a multi-minute recovery bottleneck.

```mermaid
flowchart TD
  subgraph KRaft["KRaft Mode (Kafka 3.x)"]
    direction LR
    ActiveCtrl["Active Controller\n(elected via Raft)"]
    StandbyCtrl1["Standby Controller 1"]
    StandbyCtrl2["Standby Controller 2"]
    MetaLog["@metadata topic\n(replicated Raft log)"]
    Broker1["Broker 1"]
    Broker2["Broker 2"]
  end

  ActiveCtrl -->|"append metadata events"| MetaLog
  MetaLog -->|"replicate"| StandbyCtrl1
  MetaLog -->|"replicate"| StandbyCtrl2
  ActiveCtrl -->|"MetadataUpdate RPC"| Broker1
  ActiveCtrl -->|"MetadataUpdate RPC"| Broker2
```

KRaft stores all cluster metadata in a Kafka topic (`@metadata`) replicated across 3–5 controller nodes using the Raft consensus protocol. Brokers maintain a local **metadata cache** and receive incremental updates from the active controller. Controller failover is now a pure Raft leader election — sub-second, no ZooKeeper coordination needed.

---

## 11. AdminClient Internal Flow

```mermaid
sequenceDiagram
  participant App
  participant AdminClient
  participant NetworkClient
  participant Controller as Active Controller Broker

  App->>AdminClient: createTopics([NewTopic])
  AdminClient->>AdminClient: wrap in KafkaFuture<CreateTopicsResult>
  AdminClient->>NetworkClient: enqueue CreateTopicsRequest
  NetworkClient->>Controller: TCP → CreateTopicsRequest
  Controller->>Controller: write to @metadata log (KRaft)<br/>or ZooKeeper (legacy)
  Controller-->>NetworkClient: CreateTopicsResponse(errors=[])
  NetworkClient-->>AdminClient: complete KafkaFuture
  AdminClient-->>App: CreateTopicsResult.all().get() → success
```

All mutating operations (create, delete, alter) route to the **active controller**. Read operations (listTopics, describeCluster) route to the **least loaded broker** — the client's internal `MetadataCache` tracks broker load via response latencies.

The `KafkaFuture` wrapper is a custom future (not `CompletableFuture`) that ensures thread-safe completion callbacks. `whenComplete()` fires on the client's I/O thread — never block inside it.

---

## 12. Producer → Broker → Consumer: Full Data Path

```mermaid
flowchart TD
  subgraph ProducerSide
    App["Application\nrecord = ProducerRecord(topic, key, value)"]
    Ser["Serializer\nbyte[] keyBytes, valueBytes"]
    Part["Partitioner\nmurmur2(key) % N → partitionId"]
    Accum["RecordAccumulator\nbatch[tp] += record"]
    Sender["Sender Thread\ndrain → ProduceRequest"]
  end

  subgraph BrokerSide
    NetThread["Network Thread\nparse ProduceRequest"]
    IOHandler["I/O Handler Thread\nReplicaManager.appendRecords()"]
    LeaderLog["Leader Log\nappend → assign offset"]
    PurgatoryDelay["Purgatory (DelayedProduce)\nwait for follower ACKs"]
    FollowerFetch["Follower FetchRequest\nreplicate → update LEO"]
    HWMAdvance["HWM advance\nmin(ISR LEOs)"]
  end

  subgraph ConsumerSide
    FetchReq["FetchRequest\npartition + fetchOffset"]
    FetchResp["FetchResponse\nrecords up to HWM"]
    ConsumerApp["Consumer App\npoll() → ConsumerRecords"]
  end

  App --> Ser --> Part --> Accum --> Sender
  Sender -->|"TCP"| NetThread --> IOHandler
  IOHandler --> LeaderLog --> PurgatoryDelay
  FollowerFetch -->|"Follower catches up"| PurgatoryDelay
  PurgatoryDelay --> HWMAdvance
  HWMAdvance -->|"ProduceResponse"| Sender
  ConsumerSide -->|"TCP"| BrokerSide
  HWMAdvance --> FetchResp --> ConsumerApp
```

The **purgatory** (`DelayedProducePurgatory`) is an in-memory timer wheel containing pending produce requests awaiting replication. When a follower's FetchRequest arrives and advances the ISR's minimum LEO past the threshold, the purgatory watcher fires the produce callback.

---

## 13. MirrorMaker 2 / Multi-Cluster Replication

```mermaid
flowchart LR
  subgraph ClusterA["Cluster A (Source)"]
    TopicA["orders topic\nA.orders (remote)"]
  end
  subgraph MM2["MirrorMaker 2\n(Kafka Connect worker)"]
    SourceConn["MirrorSourceConnector\n(consumer from A)"]
    ReplicationTask["ReplicationTask\n(producer to B)"]
    CheckpointConn["MirrorCheckpointConnector\n(offset translation)"]
  end
  subgraph ClusterB["Cluster B (Target)"]
    TopicB["A.orders topic\n(remote topic with prefix)"]
    OffsetTopic["mm2-offsets.A.internal"]
  end

  TopicA --> SourceConn --> ReplicationTask --> TopicB
  CheckpointConn -->|"translate\nA-offsets → B-offsets"| OffsetTopic
```

MirrorMaker 2 prefixes remote topics with the source cluster alias (`A.orders`) to avoid naming collisions. The `MirrorCheckpointConnector` maintains offset translations so that failover consumers can resume at the correct position on the target cluster.

---

## 14. Storage Internals: Segment File I/O and Zero-Copy

Kafka's throughput advantage comes from two OS-level mechanisms:

**Sequential disk writes**: The OS can batch sequential writes into large disk I/O operations. Kafka's append-only design means every write to a partition is sequential — no random seeks.

**Zero-copy via `sendfile()`**: Consumer fetch requests are served via `FileChannel.transferTo()` (Java) → `sendfile()` syscall. Data moves from:

```mermaid
flowchart LR
  DiskFile["Segment .log file\n(kernel page cache)"] -->|"traditional: 4 copies\ncopy1: disk→kernel\ncopy2: kernel→user\ncopy3: user→socket buf\ncopy4: socket buf→NIC"| Socket
  DiskFile -->|"zero-copy sendfile:\n2 copies only\ndisk→kernel→NIC\n(no user-space copy)"| SocketZC["Socket (zero-copy)"]
```

This eliminates two memory copies per fetch, reducing CPU usage by 60–70% for high-throughput consumers and allowing Kafka to serve consumers at near-disk-bandwidth speeds.

---

## 15. Schema Registry Integration

```mermaid
sequenceDiagram
  participant Producer
  participant SchemaRegistry as Schema Registry
  participant KafkaTopic

  Producer->>SchemaRegistry: POST /subjects/orders-value (Avro schema)
  SchemaRegistry-->>Producer: schemaId=42
  Producer->>Producer: serialize: [magic=0x0][schemaId=42 (4 bytes)][avro bytes]
  Producer->>KafkaTopic: ProduceRequest (serialized bytes)

  participant Consumer
  KafkaTopic->>Consumer: FetchResponse (serialized bytes)
  Consumer->>Consumer: read magic byte → schemaId=42
  Consumer->>SchemaRegistry: GET /schemas/ids/42
  SchemaRegistry-->>Consumer: Avro schema JSON
  Consumer->>Consumer: deserialize avro bytes → object
```

Every message contains a 5-byte header: `[0x00 magic][4-byte schema ID]`. The Schema Registry maps IDs to Avro/JSON/Protobuf schemas. Schema evolution is governed by **compatibility rules** (BACKWARD, FORWARD, FULL) enforced at registration time — consumers reading old schemas can decode new messages safely.
