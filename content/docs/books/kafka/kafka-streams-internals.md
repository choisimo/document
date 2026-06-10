# Kafka Streams — Under the Hood: Topology Execution, State, and Stream Processing Internals

> Source: *Kafka Streams in Action* — William P. Bejeck Jr. (Manning, 2018)

---

## 1. The Processor Topology: A DAG of Transforms

Kafka Streams is not a distributed cluster service — it is a **client library** that runs inside a JVM. Its fundamental execution model is a **Directed Acyclic Graph (DAG)** of processor nodes, built at startup time and executed per-record.

```mermaid
flowchart TD
  src["Source Node\n(Kafka topic consumer)"]
  mask["Masking Processor\nmapValues: CC→xxxx"]
  patterns["Purchase Patterns Processor\nmap: Purchase→PurchasePattern"]
  rewards["Rewards Processor\nmap: Purchase→RewardAccumulator"]
  purchases["Purchases Processor\n(identity / passthrough)"]
  patSink["patterns topic\n(Sink Node)"]
  rewSink["rewards topic\n(Sink Node)"]
  purSink["purchases topic\n(Sink Node)"]

  src --> mask
  mask --> patterns
  mask --> rewards
  mask --> purchases
  patterns --> patSink
  rewards --> rewSink
  purchases --> purSink
```

**Depth-first traversal**: each record entering the source node is fully processed through all connected processors before the next record is dequeued. This eliminates backpressure — there is no inter-node buffering, no async queue between processors in the same topology. The record traverses the entire DAG synchronously on a single thread before the next record begins.

**Consequence**: if one processor branch is slow (e.g., state store lookup), the entire DAG slows proportionally. There is no independent parallelism across branches within one task.

---

## 2. Task Model: Partitions → Tasks → Threads

```mermaid
flowchart TD
  subgraph KafkaCluster["Kafka Cluster"]
    P0["Topic Partition 0"]
    P1["Topic Partition 1"]
    P2["Topic Partition 2"]
    P3["Topic Partition 3"]
  end

  subgraph StreamsApp["Kafka Streams App (1 JVM)"]
    subgraph Thread1["StreamThread-1"]
      T0["StreamTask-0\n(owns P0)"]
      T1["StreamTask-1\n(owns P1)"]
    end
    subgraph Thread2["StreamThread-2"]
      T2["StreamTask-2\n(owns P2)"]
      T3["StreamTask-3\n(owns P3)"]
    end
  end

  P0 --> T0
  P1 --> T1
  P2 --> T2
  P3 --> T3
```

**Tasks are the unit of parallelism.** The number of tasks equals `max(partitions across all source topics)`. Each task owns exactly one partition per source topic. A `StreamThread` runs multiple tasks in a round-robin poll loop.

**Scaling**: add more partitions → more tasks. Add more `num.stream.threads` → tasks distributed across more threads. Add more JVM instances → tasks distributed across more processes (each process is a separate Kafka consumer group member).

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Created
  Created --> Running : start()
  Running --> Partitions_Revoked : rebalance triggered
  Partitions_Revoked --> Partitions_Assigned : SyncGroup complete
  Partitions_Assigned --> Running : resume processing
  Running --> Closing : close()
  Closing --> [*]
```

---

## 3. KStream vs KTable: Stream-Table Duality

```mermaid
flowchart LR
  subgraph KStream["KStream — Event Stream"]
    direction TB
    E1["offset=0 key=A val=1"]
    E2["offset=1 key=B val=10"]
    E3["offset=2 key=A val=2"]
    E4["offset=3 key=A val=3"]
    E5["All records retained\n(append semantics)"]
  end

  subgraph KTable["KTable — Changelog / Materialized View"]
    direction TB
    KV1["key=A → val=3 (latest)"]
    KV2["key=B → val=10 (latest)"]
    KV3["Only latest value per key\n(update semantics)"]
  end

  KStream -->|"group + aggregate\nor table()"| KTable
  KTable -->|"toStream()"| KStream
```

A `KTable` is a **materialized view** backed by a changelog topic. When a new record arrives with key `K`, the table's local state store is updated in-place — old value is overwritten. Downstream processors see only the latest value for each key.

**Changelog topic**: every KTable state store update is also written to a Kafka topic (`<app-id>-<store-name>-changelog`). On restart or reassignment, the Streams app rebuilds the state store by **replaying** this changelog topic from the beginning — restoring exact state without coordination.

---

## 4. State Stores: RocksDB and In-Memory

```mermaid
flowchart TD
  subgraph StreamTask["StreamTask"]
    Processor["Stateful Processor\n(aggregate, join)"]
    subgraph StateStore["State Store"]
      RocksDB["RocksDB\n(persistent, default)"]
      MemStore["In-Memory Store\n(volatile, fast)"]
      ChangelogProducer["Changelog Producer\n(writes to Kafka topic)"]
    end
  end

  Processor -->|"get(key)"| RocksDB
  Processor -->|"put(key, value)"| RocksDB
  RocksDB -->|"every write also forwarded"| ChangelogProducer
  ChangelogProducer -->|"async produce"| ChangelogTopic["changelog topic\n(Kafka)"]
  ChangelogTopic -->|"on restart: replay"| RocksDB
```

**RocksDB** (embedded LSM-tree key-value store) is the default persistent state store. Key properties:
- Data stored in `state.dir` on local disk (default `/tmp/kafka-streams/`)
- Bloom filters + SST file compaction enable O(1) average reads
- Write path: MemTable → WAL → SSTable flush → compaction
- Kafka Streams calls RocksDB's `put()` synchronously; changelog write is async

**Standby replicas** (`num.standby.replicas`): other StreamsApp instances maintain warm copies of state stores by consuming the changelog topic. On failover, the new task owner only needs to catch up the delta since the standby's checkpoint — sub-second recovery.

---

## 5. Windowing Internals

Windows enable aggregation over bounded time ranges. Kafka Streams implements several window types, each with distinct state organization.

```mermaid
flowchart LR
  subgraph TumblingWindow["Tumbling Window (non-overlapping)"]
    W0["[0,5) sec → agg A"]
    W1["[5,10) sec → agg B"]
    W2["[10,15) sec → agg C"]
  end

  subgraph HoppingWindow["Hopping Window (overlapping)"]
    H0["[0,10) sec"]
    H1["[5,15) sec"]
    H2["[10,20) sec"]
  end

  subgraph SessionWindow["Session Window (gap-based)"]
    S0["[t1,t3)\nactivity burst"]
    G0["gap > inactivity.gap → close session"]
    S1["[t5,t7)\nnew session"]
  end
```

**Window state store key schema**: `(originalKey, windowStart, windowEnd)`. Each window has its own slot in RocksDB. When a record arrives at time `t`, Streams computes which windows it falls into and does a `get` + `put` for each.

**Late arrivals**: records arriving after `grace.period.ms` are discarded. The grace period allows out-of-order records (from network delays) to be incorporated into the correct window before it closes.

```mermaid
sequenceDiagram
  participant Record
  participant Streams
  participant WindowStore
  participant DownstreamSink

  Record->>Streams: event(key=X, ts=1000ms)
  Streams->>Streams: compute window start = 1000 - (1000 % windowSize)
  Streams->>WindowStore: get(X, windowStart)
  WindowStore-->>Streams: currentAgg (or null)
  Streams->>Streams: newAgg = aggregator(currentAgg, record.value)
  Streams->>WindowStore: put(X, windowStart, newAgg)
  WindowStore->>WindowStore: write changelog record
  Streams->>Streams: check if window is closed (stream time > windowEnd + grace)
  Streams->>DownstreamSink: emit(X, windowStart, newAgg)
```

**Stream time vs wall clock time**: Streams advances "stream time" based on the maximum observed record timestamp, not the system clock. This ensures deterministic window behavior even when records arrive out-of-order or during replay.

---

## 6. Joins: Co-Partitioning Requirement

Joins in Kafka Streams require **co-partitioned topics** — both input topics must have the same number of partitions and the same partitioning strategy. This ensures that records with the same key are always assigned to the same Streams task.

```mermaid
flowchart TD
  subgraph CoPartitioned["Co-partitioned Topics (required)"]
    Orders["orders topic\n4 partitions\nkey=orderId"]
    Products["products topic\n4 partitions\nkey=productId... wait, WRONG"]
  end

  subgraph CorrectJoin["Correct Join Setup"]
    Orders2["orders topic\n4 partitions\nkey=productId (rekeyed)"]
    Products2["products topic\n4 partitions\nkey=productId"]
    JoinResult["Join Result\norder enriched with product"]
  end

  Orders2 -->|"KStream-KTable join"| JoinResult
  Products2 -->|"KTable lookup"| JoinResult
```

**KStream-KStream join**: both streams are windowed. Records are matched if keys match AND timestamps fall within `JoinWindows.of(Duration)`. Both sides are stored in in-memory or RocksDB windowed stores.

**KStream-KTable join**: the KTable acts as a lookup table. No windowing needed — latest KTable value for the key is used at the time the KStream record arrives. The KTable must be fully caught up (changelog replayed) before joins produce results.

**GlobalKTable**: replicated in full on every Streams instance (no co-partitioning requirement). The source topic's all partitions are consumed by every instance. Used for reference data (e.g., product catalog) that must be available for any key without repartitioning.

```mermaid
flowchart LR
  subgraph GlobalKTable
    GKT1["instance-1\nfull copy of table"]
    GKT2["instance-2\nfull copy of table"]
    GKT3["instance-3\nfull copy of table"]
  end

  RefTopic["reference topic\n(all partitions)"] --> GKT1
  RefTopic --> GKT2
  RefTopic --> GKT3
```

---

## 7. Processor API: Low-Level Node Building

The DSL (KStream/KTable) compiles down to the Processor API, which provides direct control.

```mermaid
flowchart TD
  subgraph TopologyBuilder["Topology (built via Processor API)"]
    SourceNode["addSource()\nname='source'\ntopics=['transactions']"]
    ProcNode["addProcessor()\nname='enricher'\nparent='source'\nprocessorSupplier=EnrichProcessor::new"]
    StoreNode["addStateStore()\nname='product-store'\nconnect to 'enricher'"]
    SinkNode["addSink()\nname='sink'\ntopic='enriched-transactions'\nparent='enricher'"]
  end

  SourceNode --> ProcNode
  StoreNode -.->|"attached to"| ProcNode
  ProcNode --> SinkNode
```

```java
// Processor lifecycle
class EnrichProcessor implements Processor<String, Order, String, EnrichedOrder> {
    ProcessorContext<String, EnrichedOrder> context;
    KeyValueStore<String, Product> productStore;

    @Override
    public void init(ProcessorContext<String, EnrichedOrder> context) {
        this.context = context;
        this.productStore = context.getStateStore("product-store");
        // Schedule punctuation: periodic callback
        context.schedule(Duration.ofSeconds(30), PunctuationType.STREAM_TIME,
            timestamp -> { /* cleanup stale state */ });
    }

    @Override
    public void process(Record<String, Order> record) {
        Product product = productStore.get(record.value().productId());
        EnrichedOrder enriched = new EnrichedOrder(record.value(), product);
        context.forward(record.withValue(enriched));
    }
}
```

**Punctuation** (`context.schedule`): a callback invoked either on stream time advancement (`STREAM_TIME`) or wall-clock time (`WALL_CLOCK_TIME`). Used for periodic state cleanup, emitting aggregates, or heartbeat-style operations. Stream-time punctuation only fires when records arrive — if no records come in, stream time does not advance.

---

## 8. Commit and Offset Management

```mermaid
sequenceDiagram
  participant StreamsTask
  participant Consumer
  participant Broker
  participant StateStore
  participant ChangelogTopic

  loop Every commit.interval.ms (default 30s) or cache full
    StreamsTask->>StateStore: flush() — write pending cache entries to RocksDB
    StateStore->>ChangelogTopic: flush changelog producer (sync)
    StreamsTask->>Consumer: commitSync(offsets)
    Consumer->>Broker: OffsetCommit to __consumer_offsets
  end
```

**Processing guarantee**: `processing.guarantee=exactly_once_v2` (Kafka 2.5+)

- Uses Kafka transactions internally
- Each task wraps its processing in a transaction: state store writes + changelog writes + output topic writes + offset commits are all atomic
- Requires Kafka broker 2.5+ and at least 3 replicas for internal topics

```mermaid
flowchart TD
  subgraph ExactlyOnce["exactly_once_v2 Transaction"]
    BeginTxn["beginTransaction()"]
    ProcessRecord["process record → state store put"]
    WriteChangelog["write changelog record (transactional)"]
    WriteOutput["write output topic record (transactional)"]
    CommitOffsets["sendOffsetsToTransaction()"]
    CommitTxn["commitTransaction()"]
  end

  BeginTxn --> ProcessRecord --> WriteChangelog --> WriteOutput --> CommitOffsets --> CommitTxn
```

If the application crashes mid-transaction, the broker aborts the incomplete transaction. On restart, the state store is rebuilt from the changelog (which only contains committed data), and the input consumer resumes from the last committed offset.

---

## 9. Interactive Queries: Exposing Local State

```mermaid
flowchart LR
  subgraph App1["Instance 1 (handles P0, P1)"]
    LocalStore1["state store\n(P0, P1 data)"]
    QueryServer1["REST endpoint\nport 8080"]
  end
  subgraph App2["Instance 2 (handles P2, P3)"]
    LocalStore2["state store\n(P2, P3 data)"]
    QueryServer2["REST endpoint\nport 8081"]
  end

  Client -->|"GET /state/key=X"| QueryServer1
  QueryServer1 -->|"key X → partition 2 → remote"| QueryServer2
  QueryServer2 -->|"localStore.get(X)"| LocalStore2
  LocalStore2 --> QueryServer2 --> QueryServer1 --> Client
```

`KafkaStreams.queryMetadataForKey(storeName, key, serializer)` returns the `StreamsMetadata` containing the host and port of the instance that owns the partition for that key. Application code must implement the HTTP layer and proxy requests to the correct instance.

```mermaid
sequenceDiagram
  participant Client
  participant Instance1
  participant Instance2
  participant RocksDB2

  Client->>Instance1: GET /query?key=customer-456
  Instance1->>Instance1: keyQueryMetadata(store, "customer-456", StringSer)
  Instance1-->>Instance1: → host=instance2:8081
  Instance1->>Instance2: HTTP GET /local-query?key=customer-456
  Instance2->>RocksDB2: get("customer-456")
  RocksDB2-->>Instance2: CustomerState{...}
  Instance2-->>Instance1: JSON response
  Instance1-->>Client: JSON response
```

---

## 10. Serdes: Serialization in the Topology

Every node boundary in the topology requires serialization/deserialization. Kafka Streams uses `Serde<T>` (Serializer + Deserializer pair).

```mermaid
flowchart LR
  KafkaTopic["Kafka Topic\n(byte[] key, byte[] value)"]
  SourceNode["Source Node\ndeserialize: Serde<K>, Serde<V>"]
  DSL["DSL Operations\n(in-memory Java objects)"]
  SinkNode["Sink Node\nserialize: Serde<K>, Serde<V>"]
  OutputTopic["Output Topic\n(byte[] key, byte[] value)"]

  KafkaTopic -->|"byte[]→K, byte[]→V"| SourceNode
  SourceNode --> DSL --> SinkNode
  SinkNode -->|"K→byte[], V→byte[]"| OutputTopic
```

**SerdeException** pitfall: if a Serde cannot deserialize a record (corrupt data, schema change), the task throws a `DeserializationException`. Default behavior: log and skip. Configure `default.deserialization.exception.handler` to control this.

**State store Serdes**: state stores also need Serdes for key and value types. These are configured separately from the topic Serdes. Mismatch causes runtime `ClassCastException` or corrupted state.

---

## 11. Topology Inspection and Testing

The `Topology.describe()` method returns a textual description of the full DAG:

```
Topologies:
  Sub-topology: 0
    Source: KSTREAM-SOURCE-0000000000 (topics: [transactions])
      --> KSTREAM-MAPVALUES-0000000001
    Processor: KSTREAM-MAPVALUES-0000000001 (stores: [])
      --> KSTREAM-BRANCH-0000000002
    Processor: KSTREAM-BRANCH-0000000002 (stores: [])
      --> KSTREAM-BRANCHCHILD-0000000003, KSTREAM-BRANCHCHILD-0000000004
```

**TopologyTestDriver**: runs the entire topology in-process, without a real Kafka cluster:

```mermaid
sequenceDiagram
  participant Test
  participant TopologyTestDriver
  participant Topology
  participant StateStore

  Test->>TopologyTestDriver: new TopologyTestDriver(topology, props)
  TopologyTestDriver->>Topology: initialize all processors
  Test->>TopologyTestDriver: pipeInput(inputTopic, key, value)
  TopologyTestDriver->>Topology: process record through full DAG
  Topology->>StateStore: put/get (real RocksDB or in-memory)
  Test->>TopologyTestDriver: readOutput(outputTopic)
  TopologyTestDriver-->>Test: OutputRecord<K,V>
  Test->>Test: assertEquals(expected, actual)
```

The `TopologyTestDriver` uses a **MockProcessorContext** that supports injecting event-time by setting record timestamps manually. Punctuations can be triggered by calling `advanceWallClockTime()`. This makes window-boundary behavior fully deterministic in unit tests.

---

## 12. Full Internal Data Flow: End-to-End

```mermaid
flowchart TD
  subgraph Kafka["Apache Kafka"]
    InTopic["Input Topic\n(partitioned)"]
    Changelog["Changelog Topics\n(state backup)"]
    OutTopic["Output Topic"]
  end

  subgraph StreamsInstance["Kafka Streams Instance"]
    subgraph Thread["StreamThread"]
      subgraph Task0["StreamTask (partition 0)"]
        Consumer0["KafkaConsumer\n(poll records)"]
        DAG0["Processor Topology\n(depth-first per record)"]
        Store0["RocksDB State Store\n(local disk)"]
        Producer0["KafkaProducer\n(output + changelog)"]
      end
    end
  end

  InTopic -->|"FetchRequest"| Consumer0
  Consumer0 --> DAG0
  DAG0 <-->|"get/put"| Store0
  Store0 -->|"changelog write"| Producer0
  DAG0 -->|"output record"| Producer0
  Producer0 -->|"ProduceRequest"| Changelog
  Producer0 -->|"ProduceRequest"| OutTopic
```

The entire processing cycle per record:
1. `KafkaConsumer.poll()` returns `ConsumerRecords` batch
2. For each record, traverse DAG depth-first (synchronous)
3. State store operations read/write RocksDB synchronously
4. Output records buffered in `KafkaProducer.RecordAccumulator`
5. Every `commit.interval.ms`: flush state stores → flush changelog producer → commit consumer offsets
6. `RecordAccumulator` drains to Kafka asynchronously on Sender thread

The absence of inter-node queues within a task means **zero-copy** between processors — the record object is passed by reference through the DAG, with no serialization until it hits a sink node or state store.
