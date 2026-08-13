# Designing Event-Driven Systems — Under the Hood: Event Streaming Architecture Internals

> **Source**: *Designing Event-Driven Systems* — Ben Stopford (O'Reilly, 2018). Focus: not how to use Kafka topics, but how event-driven architectures restructure data ownership, how the log becomes a shared source of truth, and how services collaborate through immutable event streams without tight coupling.

## Reading boundary

- This is an architectural interpretation of a 2018 source, not a current Kafka configuration reference.
- Treat log-centric ownership, CQRS, and choreography as design options. State the authoritative record for each aggregate rather than assuming the log is authoritative everywhere.
- Separate Kafka's transactional boundary from database writes, HTTP calls, and other external effects. Those paths still require idempotency, reconciliation, and observable failure states.
- Validate a proposed design with schema evolution, replay time, consumer lag, duplicate delivery, and recovery-point objectives before calling it complete.

---

## 1. The Core Insight: The Database Inside Out

Traditional architectures can place a shared database at the center, while a log-centric design can make selected domain events authoritative and derive particular views from them. The choice is per domain boundary: not every database, cache, or external side effect is necessarily reconstructable from one log.

```mermaid
flowchart LR
    subgraph "Traditional: Database-Centric"
        S1[Service A] -->|read/write| DB[(Shared DB)]
        S2[Service B] -->|read/write| DB
        S3[Service C] -->|read/write| DB
    end
    subgraph "Event-Driven: Log-Centric"
        P1[Service A] -->|publish events| LOG[("Event Log\n(Kafka Topic)\nImmutable append-only")]
        LOG -->|subscribe + materialize| V1[(Service B's DB\nderived view)]
        LOG -->|subscribe + materialize| V2[(Service C's DB\nderived view)]
        LOG -->|subscribe + materialize| V3[(Analytics Store)]
    end
```

In the design modeled here, the log is more than transient transport: retained events are replayable inputs for named projections. Calling it a system of record requires retention, schema, ordering, access-control, and restoration contracts. Inserts or updates outside that contract remain authoritative in their owning systems.

---

## 2. Event Types: Commands vs Events vs Queries

```mermaid
flowchart TD
    subgraph "Messaging Patterns"
        CMD["Command: PlaceOrder(orderId, items)\nImperative: do this\nDirected to ONE receiver\nExpects ACK/NAK"]
        EVT["Event: OrderPlaced{orderId, items, ts}\nDeclarative: this happened\nBroadcast to ALL interested\nNo expected response"]
        QRY["Query: getOrder(id)\nRequest-response\nSynchronous"]
    end
    CMD -->|rejected on failure| Retry
    EVT -->|persisted permanently| LOG["Kafka Topic\nimmutable log"]
    LOG -->|replayable| Rebuild["Rebuild any downstream state\nat any time"]
```

**Why events over commands**: Commands create direct coupling (caller knows receiver exists). Events decouple — publisher doesn't know who consumes. New consumers can be added without changing the publisher.

---

## 3. Kafka as Shared Nervous System

```mermaid
flowchart TD
    subgraph "Kafka Broker Internals Recap"
        ProducerA["Producer: Order Service"] -->|batch append| Partition0["Partition 0\nSegment files: .log + .index"]
        ProducerB["Producer: Inventory Service"] -->|batch append| Partition1["Partition 1"]
        Partition0 -->|replicate| Follower0["ISR Follower"]
        Partition1 -->|replicate| Follower1["ISR Follower"]
    end
    subgraph "Consumer Groups"
        CG1["Consumer Group: Analytics\noffset: 0→latest"] --> Partition0
        CG2["Consumer Group: Fulfillment\noffset: 0→latest (independent)"] --> Partition0
        CG3["Consumer Group: Audit\noffset: 0 (replay from start)"] --> Partition0
    end
```

Multiple consumer groups read the **same partition independently** — each maintains its own committed offset. This is fundamentally different from a queue (message deleted after one consumer reads). The log is retained for days/weeks, allowing:
- **New services** to replay history and bootstrap their state
- **Reprocessing** after bug fixes
- **Audit trails** of every business event

---

## 4. The Kappa Architecture: Stream-Only Processing

```mermaid
flowchart LR
    subgraph "Lambda Architecture (Old)"
        Batch["Batch Layer\n(Hadoop MapReduce)\naccurate but slow"] --> BatchView["Batch View"]
        Speed["Speed Layer\n(Storm/Flink)\nfast but approximate"] --> SpeedView["Speed View"]
        BatchView & SpeedView --> Merge["Merged Query"]
    end
    subgraph "Kappa Architecture (Stream-only)"
        Log["Kafka Log\n(permanent retention)"] --> Stream["Stream Processing\n(Kafka Streams / Flink)\nsingle code path"]
        Stream --> View["Materialized View\n(RocksDB / DB)"]
        Log -->|reprocess from offset 0| Stream
    end
```

**Kappa**: one codebase handles both real-time and historical reprocessing. When logic changes, replay from beginning with new code into a new output topic/table. Eliminates the operational complexity of maintaining two separate processing paths.

---

## 5. Event Collaboration and Choreography

```mermaid
sequenceDiagram
    participant OrderService
    participant KafkaTopic as Kafka: orders
    participant InventoryService
    participant FulfillmentService
    participant KafkaOut as Kafka: fulfillments

    OrderService->>KafkaTopic: publish OrderPlaced{id=42, items=[...]}
    KafkaTopic-->>InventoryService: consume OrderPlaced
    InventoryService->>InventoryService: decrement stock
    InventoryService->>KafkaTopic: publish InventoryReserved{orderId=42}
    KafkaTopic-->>FulfillmentService: consume InventoryReserved
    FulfillmentService->>KafkaOut: publish ShipmentScheduled{orderId=42}
```

**Choreography vs Orchestration**:
- Choreography: each service reacts to events independently — no central coordinator
- Orchestration: a saga orchestrator sends commands and awaits replies

Choreography is more decoupled but harder to trace. Distributed tracing (correlationId in event headers) compensates.

---

## 6. Compacted Topics: Database Semantics Over a Log

```mermaid
flowchart TD
    subgraph "Regular Topic (retention-based)"
        RT1["offset 0: {key=user:1, value={name:Alice}}"]
        RT2["offset 1: {key=user:2, value={name:Bob}}"]
        RT3["offset 2: {key=user:1, value={name:Alice Smith}}"]
        RT4["offset 3: {key=user:1, value=null}  ← tombstone (delete)"]
        RT1 -->|expired after 7 days| GC1["deleted"]
        RT2 -->|expired| GC2["deleted"]
    end
    subgraph "Compacted Topic (log compaction)"
        CT1["user:2 → {name:Bob}  ← latest only"]
        CT2["user:1 → null  ← tombstone (eventually deleted)"]
    end
```

**Log compaction** runs in the background: Cleaner thread reads dirty segments, keeps only the **latest value per key**, writes to a new clean segment. Result: infinite retention of latest state per key = embedded key-value store in Kafka.

### Compaction Mechanics

```mermaid
sequenceDiagram
    participant Cleaner as Log Cleaner Thread
    participant Dirty as Dirty Segments
    participant Clean as Clean Segments

    Cleaner->>Dirty: build offsetMap (key → highest offset seen)
    Cleaner->>Dirty: scan from start
    loop for each message
        alt message.offset == offsetMap[message.key]
            Cleaner->>Clean: keep (latest value for this key)
        else
            Cleaner->>Cleaner: discard (older version)
        end
    end
    Cleaner->>Clean: write compacted segment
    Cleaner->>Dirty: replace with clean segment
```

---

## 7. Stream-Table Duality

```mermaid
flowchart LR
    Stream["Stream: all events over time\n{user:1 → age:25}, {user:1 → age:26},...\nunbounded, ordered"] -->|aggregate latest| Table["Table: current state per key\nuser:1 → age:26\nbounded snapshot"]
    Table -->|changelog| Stream
```

**A stream is a table's changelog. A table is a stream's materialized snapshot.**

This duality is foundational to Kafka Streams KTable semantics:
- `KStream` — each record is a standalone event (append)
- `KTable` — each record is an upsert to a key (latest wins)

### Stream-Table Join Internals

```mermaid
sequenceDiagram
    participant KS as KStream (clickstream)
    participant KT as KTable (user profiles)
    participant RocksDB as RocksDB (local state store)
    participant Out as Output Topic

    Note over KT: materialize table locally in RocksDB
    KT->>RocksDB: upsert user:1 → {country: US}
    KS->>KS: event: {userId:1, page: /checkout}
    KS->>RocksDB: lookup userId:1
    RocksDB-->>KS: {country: US}
    KS->>Out: enriched: {userId:1, page:/checkout, country:US}
```

The KTable is co-partitioned with the KStream (same partition count + same key) so lookups are always local — no network hop needed.

---

## 8. Event Sourcing and CQRS at Scale

```mermaid
flowchart TD
    subgraph "Event Sourcing"
        CMD2["Command: UpdateUserAddress"] --> Handler["Command Handler\nvalidate + produce event"]
        Handler --> ES_Log["Event Log (Kafka)\nUserAddressChanged{userId, newAddr, ts}"]
        ES_Log --> Proj1["Projection: User Service DB\n(current address)"]
        ES_Log --> Proj2["Projection: Shipping Service DB\n(pending shipments update)"]
        ES_Log --> Proj3["Audit Log\n(all historical addresses)"]
    end
    subgraph "CQRS"
        WriteModel["Write Model\n(command side: Kafka)"] -.-> ReadModel["Read Model\n(query side: materialized views)"]
    end
```

**Event sourcing benefits for distributed systems**:
- State is always reconstructible by replaying events
- Temporal queries: "what was the user's address on date X?" — query log at that offset
- Zero-downtime schema migration: add new projection consumer, replay, cut over

---

## 9. Handling Failures: Idempotency and Exactly-Once

```mermaid
sequenceDiagram
    participant Producer
    participant Broker as Kafka Broker (leader)
    participant Consumer

    Note over Producer: idempotent producer enabled
    Producer->>Broker: ProduceRequest (PID=5, seq=0, batch=[evt1,evt2])
    Broker-->>Producer: ACK
    Note over Producer: network timeout - did it succeed?
    Producer->>Broker: retry: ProduceRequest (PID=5, seq=0, batch=[evt1,evt2])
    Broker->>Broker: seq=0 already seen for PID=5 → deduplicate
    Broker-->>Producer: ACK (no duplicate in log)

    Note over Consumer: transactional consumer
    Consumer->>Broker: fetch — sees abort markers, skips aborted txn records
    Consumer->>Broker: commit offset only after processing success
```

**Kafka read-process-write exactly-once behavior** requires both within the configured Kafka boundary:
1. **Idempotent producer**: `enable.idempotence=true` — PID + sequence number deduplication per partition
2. **Transactional API**: atomic multi-partition produce + offset commit in one Kafka transaction

This does not make an external database update or API call exactly once. Consumers must use an idempotency key, transactional outbox/inbox, or reconciliation process for effects outside Kafka.

---

## 10. Microservices Communication Patterns

```mermaid
flowchart TD
    subgraph "Synchronous (RPC/REST)"
        A -->|HTTP| B -->|HTTP| C
        style A fill:#f99
        style B fill:#f99
        style C fill:#f99
        Note1["Cascading failures\nBackpressure coupling\nTimeout management required"]
    end
    subgraph "Asynchronous (Event-Driven)"
        A2["Service A"] -->|produce OrderPlaced| K["Kafka"]
        K -->|consume| B2["Service B (async)"]
        K -->|consume| C2["Service C (async)"]
        style K fill:#9f9
        Note2["Temporal decoupling\nService B can be down\nindependently scalable"]
    end
```

### Back-Pressure Through Kafka Partitions

```mermaid
flowchart LR
    FastProducer["Fast Producer\n1M events/sec"] -->|writes| KafkaPartitions["Kafka Partitions\n(durable buffer)"]
    KafkaPartitions -->|consumer lag grows| SlowConsumer["Slow Consumer\n10K events/sec"]
    SlowConsumer -->|when recovered, catches up| KafkaPartitions
```

Kafka acts as a **durable backpressure buffer** — the producer and consumer are fully decoupled in time. Consumer lag is observable (via `__consumer_offsets`) and monitored for SLA alerts.

---

## 11. Building Stateful Services on Event Logs

```mermaid
stateDiagram-v2
    [*] --> Bootstrap: service starts
    Bootstrap --> Replay: consume topic from offset 0
    Replay --> Ready: caught up to end of log (lag=0)
    Ready --> Processing: new events arrive
    Processing --> Ready: event processed + state updated
    Ready --> Snapshot: periodic state snapshot to S3/disk
    Snapshot --> Ready: resume from snapshot on restart
```

**Bootstrap time** is the key operational concern — large topics with years of history can take hours to replay. Mitigations:
- **Compacted topics** for current state (only latest per key, much smaller)
- **Snapshots** stored externally, consumer starts from snapshot offset
- **Changelog topics** in Kafka Streams (RocksDB state snapshotted to Kafka internally)

---

## 12. Data Pipelines: The Turning Database Inside Out

```mermaid
flowchart LR
    OLTP["OLTP Database\n(PostgreSQL)"] -->|Debezium CDC\nwrite-ahead log tail| ChangeLog["Kafka Topic\n(changelog events)"]
    ChangeLog -->|Kafka Connect Sink| DW["Data Warehouse\n(Snowflake/BigQuery)"]
    ChangeLog -->|Kafka Streams| Enriched["Enriched topic\n(join + aggregate)"]
    Enriched -->|Kafka Connect Sink| Search["Elasticsearch\n(search index)"]
    ChangeLog -->|Kafka Streams| Analytics["Real-time dashboard\n(ksqlDB materialized view)"]
```

**Debezium** captures PostgreSQL changes via `pg_logical` WAL decoding — every INSERT/UPDATE/DELETE becomes a Kafka event with before/after row images. Downstream systems stay in sync without polling queries.

---

## Summary: Event-Driven Architecture Internals

```mermaid
mindmap
  root((Event-Driven Internals))
    Log as Source of Truth
      Immutable append-only
      Consumer group independence
      Replay from any offset
    Stream-Table Duality
      KStream: event log
      KTable: latest-value snapshot
      Compacted topic: KV store
    Event Patterns
      Events vs Commands vs Queries
      Choreography vs Orchestration
      Temporal decoupling
    Exactly-Once Semantics
      PID + sequence dedup
      Transactional produce+commit
    Stateful Services
      Bootstrap from log
      Snapshot + resume
      Changelog topics
    Data Integration
      CDC via Debezium WAL tail
      Kafka Connect sink connectors
      OLTP → event stream → derived views
```
