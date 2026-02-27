# Kafka: The Definitive Guide — Internal Architecture Deep Dive

> **Sources**: Kafka: The Definitive Guide 1st Ed. (Narkhede, Shapira, Palino — O'Reilly 2016) + 2nd Ed. (Shapira, Palino, Sivaram, Narkhede — O'Reilly 2022)  
> **Focus**: Broker I/O thread model, controller internals, replication mechanics, AdminClient async architecture, KRaft consensus, OS-level optimizations

---

## 1. The Broker as a Log Server

Kafka's broker is fundamentally a **log server** — not a queue. Every message written is durably appended to a log segment file. Brokers do not track which consumers have seen what; they expose offsets and let consumers track position themselves.

```mermaid
flowchart TD
    P[Producer] -->|ProduceRequest| NL[NetworkLayer\nAcceptor Thread]
    NL -->|dispatch| PT[Processor Thread N]
    PT -->|enqueue| RQ[Request Queue\nArrayBlockingQueue]
    RQ --> IH[I/O Handler Thread\nKafkaRequestHandler]
    IH --> LM[LogManager]
    LM --> LS[Log Segment\n.log file mmap]
    LS --> OS[OS Page Cache\nkernel buffer]
    OS -->|fsync optional| DISK[Persistent Disk]
    
    IH --> RP[ResponseQueue]
    RP --> PT2[Processor Thread\nsend response]
    PT2 -->|network write| P
```

### Broker I/O Threading Model

The broker uses a **reactor pattern** layered as:

1. **Acceptor Thread** — single thread, calls `accept()` on server socket, dispatches to a Processor thread using round-robin
2. **Processor Threads** (num.network.threads, default 3) — each runs a `java.nio.Selector`, reads bytes from client sockets, assembles complete requests, enqueues to shared `RequestChannel`
3. **Request Handler Threads** (num.io.threads, default 8) — pull from `RequestChannel`, execute business logic (log append, fetch, metadata), put response back into `RequestChannel`
4. **Response dispatch** — Processor threads pick up responses, write bytes back to clients

```mermaid
sequenceDiagram
    participant Client
    participant Acceptor
    participant Processor as Processor[0..N-1]
    participant RequestChannel
    participant IOHandler as IOHandler[0..M-1]
    participant LogManager

    Client->>Acceptor: TCP connect
    Acceptor->>Processor: assign SocketChannel round-robin
    Client->>Processor: bytes (ProduceRequest)
    Processor->>Processor: NIO read loop, reassemble frames
    Processor->>RequestChannel: enqueue(Request)
    RequestChannel->>IOHandler: dequeue
    IOHandler->>LogManager: Log.append(records)
    LogManager-->>IOHandler: appendInfo (offset, byteCount)
    IOHandler->>RequestChannel: enqueue(Response)
    RequestChannel->>Processor: Response
    Processor->>Client: ProduceResponse (baseOffset, errorCode)
```

---

## 2. Log Segment Anatomy

Each partition maps to a directory `<log.dirs>/<topic>-<partition>/`. Within it, **segments** are immutable once rolled.

```mermaid
block-beta
    columns 4
    A["00000000000000000000.log\n(active segment)\nbyte stream of RecordBatches"]:2
    B["00000000000000000000.index\nsparse offset→position map\n(4+4 bytes per entry)"]:2
    C["00000000000000000000.timeindex\ntime→offset map\n(8+8 bytes per entry)"]:2
    D[".leader-epoch-checkpoint\nleader epoch → start offset"]:2
    E[".checkpoint\nrecovery checkpoint"]:2
    F[".lock\nprocess lock file"]:2
```

### Record Batch On-Disk Format

```
RecordBatch:
  baseOffset        : int64     (offset of first record in batch)
  batchLength       : int32     (total bytes from magic to end)
  partitionLeaderEpoch: int32   (leader epoch when written)
  magic             : int8      (= 2 for current format)
  crc               : int32     (CRC32C over attributes..records)
  attributes        : int16     (compression | timestampType | transactional | control)
  lastOffsetDelta   : int32     (lastOffset - baseOffset)
  baseTimestamp     : int64
  maxTimestamp      : int64
  producerId        : int64     (for idempotent/transactional producers)
  producerEpoch     : int16
  baseSequence      : int32
  records           : [Record]

Record:
  length            : varint
  attributes        : int8
  timestampDelta    : varint
  offsetDelta       : varint
  keyLength         : varint
  key               : byte[]
  valueLength       : varint
  value             : byte[]
  headers           : [Header]
```

### Index Lookup: O(log n) Binary Search

```mermaid
flowchart LR
    Q["FetchRequest\noffset=12345"] --> IDX[".index file\nmmap'd into memory"]
    IDX -->|binary search| ENTRY["Entry: offset=12340\n→ position=409600"]
    ENTRY --> LOG[".log file\nlseek to 409600"]
    LOG -->|scan forward| TARGET["Record at offset 12345"]
```

Sparse index: not every offset has an entry. `index.interval.bytes` (default 4096) controls granularity — one index entry per 4KB written. At fetch time: binary search finds largest indexed offset ≤ target, then sequential scan from that file position.

---

## 3. Replication Protocol: ISR and HWM

```mermaid
stateDiagram-v2
    [*] --> Leader: partition elected
    Leader --> ISR: replica fetches within replica.lag.time.max.ms
    ISR --> OutOfSync: replica fetch stalls > lag threshold
    OutOfSync --> ISR: replica catches up (LEO = leader LEO)
    Leader --> [*]: broker failure, controller elects new leader
```

### High Watermark and Log End Offset

```mermaid
flowchart TD
    subgraph Leader["Leader Broker"]
        direction TB
        LEO_L["LEO = 105\n(all appended records)"]
        HWM["HWM = 100\n(acked by all ISR members)"]
        LOG_L["Log: [0..105)"]
    end
    
    subgraph F1["Follower-1 (in ISR)"]
        LEO_F1["LEO = 103"]
        FETCH1["FetchRequest offset=103"]
    end
    
    subgraph F2["Follower-2 (in ISR)"]
        LEO_F2["LEO = 100"]
        FETCH2["FetchRequest offset=100"]
    end

    Leader -->|FetchResponse + HWM=100| F1
    Leader -->|FetchResponse + HWM=100| F2
    F1 -->|updates local HWM=100| F1
    F2 -->|updates local HWM=100| F2
```

**Why HWM matters**: Consumers can only read up to HWM. Records above HWM are written to leader but not yet replicated — they're invisible to consumers until ISR members fetch them, updating the leader's knowledge of their LEOs, which advances HWM.

**acks=-1 flow**:
1. Producer sends RecordBatch
2. Leader appends to local log (LEO advances)
3. Leader waits until ALL ISR members' LEO ≥ this batch's last offset
4. Leader advances HWM
5. Leader sends ProduceResponse with baseOffset

---

## 4. Controller: Cluster Brain

The **Controller** is one broker elected via ZooKeeper ephemeral node `/controller`. In KRaft mode, it's elected via Raft consensus.

```mermaid
sequenceDiagram
    participant ZK as ZooKeeper
    participant CTRL as Controller Broker
    participant B1 as Broker-1 (failed)
    participant B2 as Broker-2
    participant B3 as Broker-3

    B1->>ZK: broker ephemeral node expires (session timeout)
    ZK->>CTRL: NodeDeleted /brokers/ids/1
    CTRL->>CTRL: find all partitions where B1 was leader
    CTRL->>CTRL: for each: pick new leader from ISR
    CTRL->>B2: LeaderAndIsrRequest (partition P0: leader=B2, ISR=[B2,B3])
    CTRL->>B3: LeaderAndIsrRequest (same)
    B2->>B2: start accepting Produce/Fetch for P0
    CTRL->>ZK: write new partition state to /brokers/topics/.../state
```

### Controller Responsibilities

```mermaid
flowchart LR
    CTRL[Controller] --> LE[Leader Election\nfor failed partitions]
    CTRL --> PA[Partition Assignment\nwhen broker joins]
    CTRL --> ISR_M[ISR Management\nshrink/expand notifications]
    CTRL --> TE[Topic/Partition\nCreate/Delete]
    CTRL --> BR[Broker Epoch\nincrement on restart]
    
    LE -->|LeaderAndIsrRequest| ALL_BROKERS[All Affected Brokers]
    PA -->|UpdateMetadataRequest| ALL_BROKERS
```

---

## 5. KRaft Mode: Removing ZooKeeper

KRaft (Kafka Raft) replaces ZooKeeper with an **internal metadata topic** `__cluster_metadata` managed by a Raft quorum of controller nodes.

```mermaid
flowchart TD
    subgraph KRaft_Quorum["KRaft Controller Quorum (3 nodes)"]
        direction LR
        AC[Active Controller\nRaft Leader] --> FC1[Follower Controller 1]
        AC --> FC2[Follower Controller 2]
    end
    
    subgraph Brokers["Kafka Brokers"]
        B1[Broker 1] & B2[Broker 2] & B3[Broker 3]
    end
    
    AC -->|MetadataRecord: TopicRecord\nPartitionRecord\nBrokerRegistration| META["__cluster_metadata\ntopic (replicated)"]
    META --> B1 & B2 & B3
    
    B1 -->|BrokerRegistration\nHeartbeat| AC
    AC -->|MetadataSnapshot + delta| B1
```

**Key difference from ZooKeeper mode**:
- Metadata operations are Raft log entries — they have ordering guarantees
- Brokers fetch metadata from `__cluster_metadata` topic (like consumer fetch)
- No external ZooKeeper process, no split-brain between ZK and Kafka state
- Broker epoch tracked in metadata log — stale requests rejected by epoch comparison
- Snapshot + incremental delta: brokers don't replay entire log from epoch 0

### Raft Metadata Record Types

```
MetadataRecord variants:
  RegisterBrokerRecord     — broker starts, registers endpoint + epoch
  BrokerRegistrationChange — broker updates capabilities
  TopicRecord              — topic created (id, name)
  PartitionRecord          — partition assignment (leader, ISR, replicas, leaderEpoch)
  RemoveTopicRecord        — topic deleted
  PartitionChangeRecord    — ISR change, leader change
  FeatureLevelRecord       — metadata version upgrade
  ClientQuotaRecord        — quota configuration
  ProducerIdsRecord        — PID block allocation
```

---

## 6. Hardware Selection Internals

The book's hardware guidance maps directly to Kafka's internal data path:

```mermaid
flowchart TD
    subgraph DataPath["Kafka Data Path"]
        P[Producer] -->|TCP| NET[Network Buffer\nkernel socket buffer]
        NET -->|kernel recv| PC[Page Cache\nkernel RAM]
        PC -->|write-back| DISK[Disk\nsequential writes]
        
        CON[Consumer] -->|FetchRequest| SENDFILE["sendfile() syscall\nzero-copy"]
        PC -->|DMA transfer| SENDFILE
        SENDFILE -->|NIC DMA| CON
    end
    
    subgraph HW["Hardware Bottlenecks"]
        DISK2["Disk throughput\n250MB/s HDD → 2GB/s NVMe\nsequential matters, not IOPS"]
        RAM2["RAM for Page Cache\nmore = bigger read cache\nno heap benefit beyond ~6GB"]
        NET2["NIC bandwidth\n10GbE minimum for production\nreplication doubles traffic"]
        CPU2["CPU rarely bottleneck\nexcept TLS or compression"]
    end
```

### OS Tuning Parameters

```mermaid
block-beta
    columns 2
    A["vm.swappiness = 1\nPrevent swapping JVM heap\nSwap kills latency spikes"]:1
    B["vm.dirty_ratio = 60\nAllow large write buffer\nbefore background flush"]:1
    C["vm.dirty_background_ratio = 10\nStart background flush early\nreduce burst writes"]:1
    D["net.core.rmem_max / wmem_max = 128MB\nLarge socket buffers\nfor high-throughput producers"]:1
    E["noatime mount option\nSkip access time updates\non log segment reads"]:1
    F["XFS filesystem\nBetter performance than ext4\nfor large sequential I/O"]:1
```

---

## 7. AdminClient: Async Event-Driven Architecture

AdminClient is built on the same `NetworkClient` as producers/consumers — fully async, non-blocking internally, exposing `KafkaFuture<T>` to callers.

```mermaid
sequenceDiagram
    participant App
    participant AdminClient
    participant NetworkClient
    participant MetadataUpdater
    participant Kafka Broker

    App->>AdminClient: createTopics(["my-topic"])
    AdminClient->>AdminClient: create CreateTopicsRequest\nwrap in KafkaFuture
    AdminClient->>NetworkClient: enqueue(request)
    AdminClient-->>App: return KafkaFuture<CreateTopicsResult>
    
    Note over App: App continues executing (non-blocking)
    
    NetworkClient->>MetadataUpdater: find controller broker
    MetadataUpdater->>Kafka Broker: MetadataRequest
    Kafka Broker-->>MetadataUpdater: MetadataResponse (controller=broker-2)
    NetworkClient->>Kafka Broker: CreateTopicsRequest → broker-2
    Kafka Broker-->>NetworkClient: CreateTopicsResponse
    NetworkClient->>AdminClient: fireCallbacks(response)
    AdminClient->>AdminClient: KafkaFuture.complete(result)
    
    App->>AdminClient: future.get() [blocks here only if needed]
    AdminClient-->>App: CreateTopicsResult
```

### KafkaFuture Chaining

```mermaid
flowchart LR
    BASE["KafkaFuture\n(AdminClient internal)"] -->|thenApply| MAPPED["KafkaFuture\n(user-visible result)"]
    MAPPED -->|get()| BLOCK[Blocking Wait]
    MAPPED -->|whenComplete(BiConsumer)| ASYNC[Async Callback\nnon-blocking]
    BLOCK --> RESULT[T or ExecutionException\ncause = Kafka error]
```

**Eventually Consistent**: AdminClient operations propagate through the cluster asynchronously. After `createTopics().get()` returns, other brokers may not yet see the topic in their metadata cache — they will within `metadata.max.age.ms`.

---

## 8. Consumer Group Protocol — Deep Internals

```mermaid
sequenceDiagram
    participant C1 as Consumer-1
    participant C2 as Consumer-2
    participant GC as Group Coordinator\n(Broker hosting __consumer_offsets partition)

    C1->>GC: FindCoordinatorRequest(group="my-group")
    GC-->>C1: FindCoordinatorResponse(coordinator=broker-3)
    
    C1->>GC: JoinGroupRequest(protocols=[range, roundrobin])
    C2->>GC: JoinGroupRequest(protocols=[range, roundrobin])
    
    Note over GC: GC waits for group.initial.rebalance.delay.ms
    GC-->>C1: JoinGroupResponse(leader=C1, memberId, allMembers, generationId=1)
    GC-->>C2: JoinGroupResponse(follower, memberId, generationId=1)
    
    Note over C1: C1 runs partition assignment algorithm
    C1->>GC: SyncGroupRequest(assignments for all members)
    C2->>GC: SyncGroupRequest(empty - follower)
    
    GC-->>C1: SyncGroupResponse(assignment=[P0,P1])
    GC-->>C2: SyncGroupResponse(assignment=[P2,P3])
    
    loop every heartbeat.interval.ms
        C1->>GC: HeartbeatRequest(generationId=1)
        GC-->>C1: HeartbeatResponse(OK or REBALANCE_IN_PROGRESS)
    end
```

### Generation ID and Fencing

```mermaid
flowchart TD
    GEN1["Generation 1\nC1=[P0,P1], C2=[P2,P3]"] -->|C3 joins| REBAL["Rebalance triggered\nAll members get\nREBALANCE_IN_PROGRESS"]
    REBAL --> GEN2["Generation 2\nC1=[P0], C2=[P1,P2], C3=[P3]"]
    
    STALE["Stale C1 processing P1\n(old gen=1)"] -->|commit offset| GC["Group Coordinator\nrejects: generationId mismatch\nIllegalGenerationException"]
```

---

## 9. AdminClient Consumer Group Management Internals

```mermaid
flowchart TD
    A["listConsumerGroups()"] -->|FindCoordinator for all groups| B["List<ConsumerGroupListing>"]
    B --> C["describeConsumerGroups(groups)"]
    C -->|DescribeGroupsRequest| D["ConsumerGroupDescription\n- members + clientId/host\n- partitionAssignments\n- assignorName\n- coordinator node"]
    
    E["listConsumerGroupOffsets(group)"] -->|OffsetFetchRequest| F["Map<TopicPartition, OffsetAndMetadata>"]
    F --> G["listOffsets(tp→OffsetSpec.latest())"]
    G -->|ListOffsetsRequest| H["Map<TopicPartition, offset>"]
    
    F --> CALC["lag = latestOffset - committedOffset"]
    H --> CALC
```

### Offset Reset Flow

```mermaid
sequenceDiagram
    participant SRE
    participant AdminClient
    participant GC as Group Coordinator

    SRE->>AdminClient: verify group is STOPPED (describeConsumerGroups)
    AdminClient->>GC: DescribeGroupsRequest
    GC-->>AdminClient: state=EMPTY or DEAD
    
    SRE->>AdminClient: listOffsets(tp→OffsetSpec.earliest())
    AdminClient->>GC: ListOffsetsRequest
    GC-->>AdminClient: earliestOffsets map
    
    SRE->>AdminClient: alterConsumerGroupOffsets(group, earliestOffsets)
    AdminClient->>GC: OffsetCommitRequest(generationId=-1)
    
    Note over GC: If group active: UnknownMemberIdException
    GC-->>AdminClient: OffsetCommitResponse(OK)
```

---

## 10. Replica Reassignment Internals

```mermaid
sequenceDiagram
    participant SRE
    participant AdminClient
    participant Controller
    participant SourceBroker
    participant TargetBroker

    SRE->>AdminClient: alterPartitionReassignments(tp → [broker0, broker1])
    AdminClient->>Controller: AlterPartitionReassignmentsRequest
    Controller->>Controller: update partition AR (assigned replicas)\nadd new replicas as learners
    Controller->>TargetBroker: LeaderAndIsrRequest (role=follower, learner)
    TargetBroker->>SourceBroker: FetchRequest (start catching up)
    
    loop Until TargetBroker LEO ≈ leader LEO
        TargetBroker->>SourceBroker: FetchRequest
        SourceBroker-->>TargetBroker: records
    end
    
    Controller->>Controller: TargetBroker joins ISR
    Controller->>SourceBroker: LeaderAndIsrRequest (remove from AR)
    SourceBroker->>SourceBroker: truncate local log, remove partition
```

**Throttling replicas during reassignment**:
- `leader.replication.throttled.rate` and `follower.replication.throttled.rate`
- Configured per-topic as `leader.replication.throttled.replicas` and `follower.replication.throttled.replicas`
- Prevents reassignment from saturating broker network bandwidth

---

## 11. MirrorMaker 2 Cross-Datacenter Replication

```mermaid
flowchart TD
    subgraph DC1["Datacenter 1 (Source)"]
        S1["Topic: events\nPartitions: 0,1,2"]
    end
    
    subgraph MM2["MirrorMaker 2 (Kafka Connect)"]
        SRC[Source Connector\nKafkaMirrorSourceConnector] --> TRANS[Replication Flow\noffset translation]
        TRANS --> SINK[Sink Connector\nKafkaMirrorSinkConnector]
        OFFTOPIC["__consumer_offsets.DC1\nOffset sync topic"]
    end
    
    subgraph DC2["Datacenter 2 (Destination)"]
        D2["Topic: DC1.events\nPartitions: 0,1,2"]
        CHECKPOINT["Checkpoints topic\nDC1.checkpoints.internal"]
    end
    
    S1 --> SRC
    SINK --> D2
    TRANS --> OFFTOPIC
    OFFTOPIC --> CHECKPOINT
```

**Offset translation problem**: DC1 offset 1000 ≠ DC2 offset 1000. MirrorMaker 2 maintains a `checkpoints` topic that maps source consumer group offsets → translated target offsets, enabling consumer failover to DC2 without re-processing.

---

## 12. Kafka Connect Internal Architecture

```mermaid
flowchart TD
    subgraph Worker["Connect Worker Process"]
        direction TB
        WL[Worker Loop\nmain thread] --> CM[ConfigManager\nwatches config.storage.topic]
        WL --> OS[OffsetStorageWriter\nflushes to offset.storage.topic]
        WL --> TS[StatusBackingStore\nstatus.storage.topic]
        
        subgraph Tasks["Task Executors"]
            T1[SourceTask-0\nrecord producer loop]
            T2[SourceTask-1]
            T3[SinkTask-0\nrecord consumer loop]
        end
        
        CM --> Tasks
        T1 -->|SourceRecord[]| CP[Converter\nAvro/JSON/Protobuf]
        CP -->|ProducerRecord| KP[KafkaProducer\ninternal]
        KP --> TOPIC["Kafka Topic"]
        
        TOPIC --> KC[KafkaConsumer\ninternal]
        KC --> T3
        T3 -->|SinkRecord[]| SINK_SYS[External System\nDB, S3, Elasticsearch]
    end
```

**Distributed mode**: Workers form a group via `group.id` using the **same** consumer group protocol. The leader assigns connector tasks across workers via `SyncGroup`. Offset storage and status storage are shared Kafka topics — any worker can take over a task.

---

## 13. Broker Startup and Metadata Bootstrap

```mermaid
sequenceDiagram
    participant Broker
    participant ZK as ZooKeeper (classic mode)
    participant Controller

    Broker->>ZK: create ephemeral /brokers/ids/<id>
    ZK-->>Broker: session established
    Broker->>ZK: read /brokers/topics/* (partition assignments)
    Broker->>Broker: load log segments from log.dirs
    Broker->>Broker: recover incomplete segments (truncate to last stable offset)
    Broker->>Controller: register via /controller watch
    Controller->>Broker: UpdateMetadataRequest (full cluster state)
    Controller->>Broker: LeaderAndIsrRequest (partition roles)
    Broker->>Broker: start accepting client connections
```

**Log recovery on restart**: Broker reads `.checkpoint` file for each log directory — records last flushed offsets. Any records beyond checkpoint in `.log` file are replayed to verify CRC; truncation removes corrupt tail. For replicas, leader epoch checkpoint ensures no follower diverges from current epoch.

---

## 14. End-to-End Latency Decomposition

```mermaid
gantt
    dateFormat  SSS
    axisFormat %Lms
    section Producer
    RecordAccumulator batch fill    :a1, 000, 5ms
    Sender I/O thread network write :a2, after a1, 2ms
    section Network
    NIC transmit + kernel recv      :b1, after a2, 1ms
    section Broker
    Processor thread reassemble     :c1, after b1, 1ms
    IOHandler log append            :c2, after c1, 2ms
    ISR replication (acks=all)      :c3, after c2, 5ms
    ProduceResponse send            :c4, after c3, 1ms
    section Consumer
    Fetch poll interval             :d1, 015, 5ms
    Broker FetchResponse (HWM)      :d2, after c4, 2ms
    Consumer poll returns           :d3, after d2, 1ms
```

Key latency factors:
- `linger.ms` — deliberate batching delay at producer
- `acks=all` — waits for full ISR replication (cross-rack = 2-5ms extra)
- `fetch.min.bytes` — broker holds response until N bytes available (reduces requests, adds latency)
- `fetch.max.wait.ms` — max hold time for `fetch.min.bytes`

---

## 15. Quota Throttling Internals

```mermaid
flowchart TD
    REQ["ProduceRequest arrives"] --> QC[QuotaManager\ncheck bytes/sec quota]
    QC -->|within quota| APPEND[Log append immediately]
    QC -->|over quota| CALC["Calculate delay:\ndelay_ms = (actual - quota) / quota * window_ms"]
    CALC --> DEFER["Processor thread:\nmute channel for delay_ms\nthrottle_time in response header"]
    DEFER --> CLIENT["Client backs off\nthrottle_time_ms in ProduceResponse"]
    
    subgraph Quota Types
        UQ["User quota\nbytes/sec per principal"]
        CQ["Client ID quota\nbytes/sec per client.id"]
        BQ["Broker-level quota\nreplication throttle"]
    end
```

Quotas use a **sliding window** (default 30 x 1-second windows). Rate is computed as exponential moving average over these windows. When exceeded, the broker sends `ThrottleTime` in the response and mutes the socket channel to apply back-pressure without dropping connections.

---

## Summary: Full Request Lifecycle Map

```mermaid
flowchart TD
    PROD["Producer\nRecordAccumulator\n+Sender Thread"] -->|TCP ProduceRequest| NIO["Broker NIO\nAcceptor→Processor"]
    NIO -->|RequestChannel| IO["IOHandler\nlog append"]
    IO -->|LogManager| SEG["Segment .log file\npage cache write"]
    SEG -->|async OS flush| DISK["Persistent Storage"]
    
    SEG -->|ISR Fetch| FOL["Follower replicas\nFetch → replicate"]
    FOL -->|ACK via FetchResponse| IO
    IO -->|HWM advance| SEG
    
    CON["Consumer\npoll()"] -->|FetchRequest| NIO2["Broker NIO"]
    NIO2 --> IO2["IOHandler\nfetch up to HWM"]
    IO2 -->|sendfile()| CON
    
    CTRL["Controller\n(ZK or KRaft)"] -->|LeaderAndIsrRequest\nUpdateMetadata| NIO
    ADM["AdminClient\nKafkaFuture async"] -->|AdminRequest\nto controller| NIO
```

The broker is a **log-centric append machine**: every operation reduces to writes to append-only segment files, served from OS page cache via zero-copy `sendfile()`. Replication, quota management, and cluster coordination layer on top of this immutable log foundation.
