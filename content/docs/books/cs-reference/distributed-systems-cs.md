# Distributed Systems Internals: Consensus, Fault Tolerance & Data Consistency

> Under the Hood: How distributed systems achieve agreement, tolerate failures, and maintain consistency across unreliable networks — the exact data flows, message protocols, state machines, and mathematical guarantees.

---

## 1. The Fundamental Problem: Partial Failures

Unlike a single machine where components fail atomically (crash = stop), distributed systems experience **partial failures**: some nodes work, some don't, network partitions split components, messages arrive out of order or not at all.

```mermaid
flowchart TD
    subgraph "Single Machine Failure Model"
        SM[Process] -->|crash| SD[Everything stops atomically]
    end

    subgraph "Distributed Failure Model"
        N1[Node A: alive] 
        N2[Node B: crashed]
        N3[Node C: alive but partitioned]
        N4[Node D: alive but slow]
        N1 <-->|partition| N3
        N1 -->|timeout?| N2
        N4 -->|message delay 30s| N1
    end
```

The challenge: **from Node A's perspective, Node B crashed is indistinguishable from Node B responding very slowly.** Timeouts are the only detection mechanism — but choosing the right timeout is impossible without knowing the maximum message delay.

### The Two Generals Problem (Impossibility)

No protocol can guarantee two parties reach agreement over an unreliable channel. This is a **proven impossibility** — any confirmation message itself needs confirmation, ad infinitum.

```mermaid
sequenceDiagram
    participant GA as General A
    participant Net as Unreliable Network
    participant GB as General B

    GA->>Net: "Attack at dawn" (msg 1)
    Note over Net: May be lost
    Net-->>GB: msg 1 (maybe)
    GB->>Net: "Acknowledged" (msg 2)
    Note over Net: May be lost
    Net-->>GA: msg 2 (maybe)
    Note over GA: GA needs to confirm receipt of ACK...
    Note over GA: Infinite regress — no finite protocol works
```

---

## 2. CAP Theorem: What You Must Sacrifice

Brewer's CAP theorem (proven formally by Gilbert & Lynch): a distributed system cannot simultaneously guarantee all three of:
- **C** — Consistency: every read sees the most recent write
- **A** — Availability: every request receives a response
- **P** — Partition tolerance: system works despite network splits

```mermaid
graph TD
    subgraph "CAP Triangle"
        C[Consistency\nEvery read = latest write]
        A[Availability\nEvery request gets response]
        P[Partition Tolerance\nWorks despite network split]

        C <-->|CA systems\nMySQL single-node| A
        C <-->|CP systems\nHBase, ZooKeeper, etcd| P
        A <-->|AP systems\nDynamoDB, Cassandra, CouchDB| P
    end
```

**Why P is non-negotiable in practice**: Network partitions happen. You must tolerate them. The real choice is **CP vs AP** when a partition occurs:

- **CP**: Refuse writes (return error) until partition heals → consistent but unavailable
- **AP**: Accept writes on both sides of partition → available but divergent state

---

## 3. Consensus: Paxos Internal Mechanics

Paxos achieves consensus (agreement on a single value) despite node failures. Three roles: **Proposer**, **Acceptor**, **Learner**.

```mermaid
sequenceDiagram
    participant P as Proposer
    participant A1 as Acceptor 1
    participant A2 as Acceptor 2
    participant A3 as Acceptor 3

    Note over P: Phase 1a: PREPARE
    P->>A1: Prepare(n=5)
    P->>A2: Prepare(n=5)
    P->>A3: Prepare(n=5)

    Note over A1,A3: Phase 1b: PROMISE
    A1-->>P: Promise(n=5, accepted=(3,v1))
    A2-->>P: Promise(n=5, accepted=nil)
    A3-->>P: Promise(n=5, accepted=nil)

    Note over P: Quorum received (2/3)
    Note over P: Picks highest accepted value: v1
    Note over P: Phase 2a: ACCEPT

    P->>A1: Accept(n=5, v=v1)
    P->>A2: Accept(n=5, v=v1)
    P->>A3: Accept(n=5, v=v1)

    Note over A1,A3: Phase 2b: ACCEPTED
    A1-->>P: Accepted(n=5, v=v1)
    A2-->>P: Accepted(n=5, v=v1)
    A3-->>P: Accepted(n=5, v=v1)

    Note over P: Quorum accepted → value v1 chosen
```

### Paxos Ballot Number Invariant

Each Acceptor stores `(maxPromised, acceptedBallot, acceptedValue)`. The invariant:
- An acceptor **never** promises to a ballot ≤ its maxPromised
- An acceptor **never** accepts a ballot ≤ its maxPromised
- If any value was accepted in a previous round, the proposer **must** propose that value

This ensures: once a value is chosen by a quorum, no future Paxos round can choose a different value.

---

## 4. Raft: Understandable Consensus

Raft decomposes consensus into three sub-problems: leader election, log replication, safety.

```mermaid
stateDiagram-v2
    [*] --> Follower: Start
    Follower --> Candidate: Election timeout (150-300ms)\nno heartbeat from leader
    Candidate --> Leader: Wins majority vote\nRequestVote RPCs
    Candidate --> Follower: Discovers valid leader\nor higher term
    Leader --> Follower: Discovers server with\nhigher term
    Candidate --> Candidate: Election timeout\n(split vote — retry)
```

### Raft Log Replication Internal Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant L as Leader
    participant F1 as Follower 1
    participant F2 as Follower 2

    C->>L: Write(x=5)
    Note over L: Append to local log\nEntry: (term=3, index=7, x=5)
    L->>F1: AppendEntries(term=3, prevIndex=6, prevTerm=3, entries=[{7,x=5}], leaderCommit=6)
    L->>F2: AppendEntries(...)

    F1-->>L: Success (matchIndex=7)
    F2-->>L: Success (matchIndex=7)

    Note over L: Majority confirmed index=7\ncommitIndex advances to 7
    Note over L: Apply to state machine: x=5
    L-->>C: Success

    Note over F1,F2: Next AppendEntries carries\nleaderCommit=7 → followers apply
```

### Raft Safety: Log Matching Property

Two invariants make Raft safe:
1. **Election Safety**: At most one leader per term
2. **Log Matching**: If two logs contain an entry with same (index, term), all preceding entries are identical

The **prevIndex/prevTerm** check in AppendEntries enforces Log Matching — a follower rejects if it doesn't have a matching entry at prevIndex with prevTerm.

```mermaid
flowchart LR
    subgraph "Leader Log"
        L1["idx=1 t=1 SET x=1"]
        L2["idx=2 t=1 SET y=2"]
        L3["idx=3 t=2 SET x=3"]
        L4["idx=4 t=3 SET z=4"]
        L1-->L2-->L3-->L4
    end
    subgraph "Follower Log (diverged)"
        F1["idx=1 t=1 SET x=1"]
        F2["idx=2 t=1 SET y=2"]
        F3_wrong["idx=3 t=2 SET x=99\n(from old leader)"]
        F1-->F2-->F3_wrong
    end
    Note["AppendEntries at idx=3 fails\nprevTerm check → leader\ndecrements nextIndex and\nretries from idx=2 until\nmatch found, then overwrites"]
```

---

## 5. Distributed Transactions: Two-Phase Commit (2PC)

2PC coordinates atomic commits across multiple nodes (shards/databases).

```mermaid
sequenceDiagram
    participant TM as Transaction Manager\n(Coordinator)
    participant P1 as Participant 1\n(Shard A)
    participant P2 as Participant 2\n(Shard B)

    Note over TM: Phase 1: PREPARE
    TM->>P1: Prepare(txn_id=42)
    TM->>P2: Prepare(txn_id=42)

    Note over P1: Acquire locks\nWrite to WAL: PREPARED
    Note over P2: Acquire locks\nWrite to WAL: PREPARED
    P1-->>TM: Vote YES
    P2-->>TM: Vote YES

    Note over TM: Write COMMIT to WAL\n(point of no return)
    Note over TM: Phase 2: COMMIT
    TM->>P1: Commit(txn_id=42)
    TM->>P2: Commit(txn_id=42)

    P1-->>TM: ACK
    P2-->>TM: ACK
    Note over TM: Write END to WAL\nRelease transaction
```

### 2PC Failure Scenarios and WAL Recovery

```mermaid
flowchart TD
    subgraph "Coordinator WAL States"
        S1[INIT] --> S2[PREPARED]
        S2 --> S3[COMMITTED]
        S2 --> S4[ABORTED]
        S3 --> S5[ENDED]
        S4 --> S5
    end

    subgraph "Recovery Logic on Restart"
        R1{WAL contains\nCOMMITTED?} -->|yes| R2[Re-send COMMIT to all participants]
        R1 -->|no, contains PREPARED| R3[Re-send ABORT to all participants]
        R1 -->|no WAL record| R4[Transaction never started — ignore]
    end
```

**2PC's Achilles Heel — Blocking**: If the coordinator crashes after writing COMMIT but before sending to participants, participants are **blocked indefinitely** — they hold locks but cannot commit or abort without coordinator decision. **3PC** (Three-Phase Commit) adds a pre-commit phase to reduce blocking but doesn't eliminate it under network partitions.

---

## 6. MVCC: Multi-Version Concurrency Control Internals

MVCC (used by PostgreSQL, MySQL InnoDB, CockroachDB) maintains multiple versions of each row, allowing readers and writers to not block each other.

```mermaid
flowchart TD
    subgraph "Row Versions in PostgreSQL"
        V1["xmin=100, xmax=200\nname='Alice', salary=50000\n(visible to txns 100..199)"]
        V2["xmin=200, xmax=350\nname='Alice', salary=60000\n(visible to txns 200..349)"]
        V3["xmin=350, xmax=INF\nname='Alice', salary=70000\n(visible to txns 350+)"]
        V1 --> V2 --> V3
    end

    subgraph "Transaction Snapshot"
        T["Txn 280 sees xmax>280\n→ reads V2 (salary=60000)\nNever sees V3 (xmin=350 > 280)"]
    end
```

### MVCC Read Path

Each transaction receives a **snapshot** at start: `(xmin, xmax, active_xids[])`. A row version is visible if:
- `row.xmin <= snapshot.xmax` (created before snapshot)
- `row.xmin` not in `active_xids[]` (creator committed)
- `row.xmax > snapshot.xmin` OR `row.xmax` is in `active_xids[]` (not yet deleted)

```mermaid
sequenceDiagram
    participant App as Application
    participant DB as PostgreSQL
    participant WAL as Write-Ahead Log

    App->>DB: BEGIN TRANSACTION
    DB-->>App: Snapshot: xmin=500, active=[502,503]
    App->>DB: SELECT salary FROM emp WHERE id=1
    Note over DB: Heap scan: find all versions of id=1\nFilter by snapshot visibility
    DB-->>App: Returns version with xmin=498 (committed, not active)
    App->>DB: UPDATE emp SET salary=80000 WHERE id=1
    Note over DB: Mark old version xmax=current_txn_id\nInsert new version with xmin=current_txn_id
    Note over WAL: WAL records: old row xmax + new row insert
    DB-->>App: 1 row updated
    App->>DB: COMMIT
    Note over WAL: WAL flush to disk (fsync)\nCommit record written
    DB-->>App: COMMIT OK
```

---

## 7. Vector Clocks and Causality Tracking

Vector clocks track **happened-before** relationships in distributed systems without requiring synchronized clocks.

```mermaid
flowchart LR
    subgraph "Node A"
        A1["A:[1,0,0]\nWrite x=1"]
        A2["A:[2,0,0]\nSend msg to B"]
        A3["A:[3,2,0]\nReceive from B\nmerge: max([2],[1,2,0])=[3,2,0]"]
    end
    subgraph "Node B"
        B1["B:[1,1,0]\nReceive from A\nA's clock:[2,0,0] → merge=[2,1,0]"]
        B2["B:[2,2,0]\nWrite y=5"]
        B3["B:[3,3,0]\nSend msg to A"]
    end
    A2 -->|send [2,0,0]| B1
    B3 -->|send [3,3,0]| A3
```

**Conflict detection**: Two events are concurrent (neither happened-before the other) if neither vector clock dominates the other:
- `A=[2,1,0]` vs `B=[1,2,0]` → concurrent → conflict → need merge

**DynamoDB** uses vector clocks (called "version vectors") to detect write conflicts and return multiple conflicting versions to the application for resolution.

---

## 8. Consistent Hashing and Distributed Hash Tables

Consistent hashing minimizes key remapping when nodes join/leave. The ring maps both keys and nodes to `[0, 2^32)` using the same hash function.

```mermaid
flowchart TD
    subgraph "Hash Ring [0, 2^32)"
        direction LR
        K1["Key 'user:1'\nhash=15%"] -->|clockwise lookup| N1["Node A\nposition=20%"]
        K2["Key 'user:5'\nhash=45%"] -->|clockwise lookup| N2["Node B\nposition=50%"]
        K3["Key 'user:9'\nhash=85%"] -->|clockwise lookup| N3["Node C\nposition=90%"]
        N3 --> N1
    end
    subgraph "Node Join: Node D at 35%"
        D["Node D added\nposition=35%"]
        Remapped["Keys 21%-35%\nmove from B to D\n(~1/N of B's keys)"]
        Unchanged["All other keys\nunchanged"]
    end
```

### Virtual Nodes for Load Balance

A single node gets multiple positions on the ring (virtual nodes / vnodes):

```mermaid
flowchart LR
    RealA["Physical Node A"]
    RealB["Physical Node B"]
    RealC["Physical Node C"]

    VA1["A-vnode-1 @5%"] --> RealA
    VA2["A-vnode-2 @40%"] --> RealA
    VA3["A-vnode-3 @75%"] --> RealA

    VB1["B-vnode-1 @15%"] --> RealB
    VB2["B-vnode-2 @55%"] --> RealB
    VB3["B-vnode-3 @85%"] --> RealB

    VC1["C-vnode-1 @25%"] --> RealC
    VC2["C-vnode-2 @65%"] --> RealC
    VC3["C-vnode-3 @95%"] --> RealC
```

With 150 vnodes per physical node, load imbalance is <10% statistically.

---

## 9. Eventual Consistency and CRDTs

**CRDTs (Conflict-free Replicated Data Types)** allow replicas to diverge and merge without coordination, guaranteeing eventual convergence by mathematical construction.

```mermaid
flowchart TD
    subgraph "G-Counter CRDT (Grow-Only)"
        N1S["Node 1: {N1:3, N2:2, N3:5}\nlocal total=10"]
        N2S["Node 2: {N1:3, N2:4, N3:5}\nlocal total=12"]
        Merge["Merge: element-wise max\n{N1:3, N2:4, N3:5}\ntotal=12"]
        N1S --> Merge
        N2S --> Merge
    end
    subgraph "PN-Counter (Increment + Decrement)"
        P["P (positive): G-Counter"]
        N["N (negative): G-Counter"]
        Val["value = sum(P) - sum(N)"]
        P --> Val
        N --> Val
    end
    subgraph "LWW-Register (Last-Write-Wins)"
        W1["Write(x=5, ts=T1)"]
        W2["Write(x=7, ts=T2, T2>T1)"]
        Res["Result: x=7 (T2 wins)\nRequires synchronized clocks\nor Lamport timestamps"]
        W1 --> Res
        W2 --> Res
    end
```

### OR-Set (Observed-Remove Set) Internals

Simple add/remove sets have the "remove wins" vs "add wins" ambiguity. OR-Set tags each add with a unique ID:

```
add("a") → {("a", uid1)}
add("a") → {("a", uid1), ("a", uid2)}
remove("a") → removes all observed uid pairs for "a"
concurrent add("a") after remove → uid3 survives (not in remove set)
```

---

## 10. Distributed Tracing: Span Propagation Internals

```mermaid
sequenceDiagram
    participant Client as Browser Client
    participant API as API Gateway
    participant Auth as Auth Service
    participant DB as Database

    Note over Client: traceparent: 00-trace_id-span_id-01
    Client->>API: HTTP GET /orders\ntraceparent: 00-abc123-0001-01
    Note over API: Extract trace_id=abc123\nCreate child span_id=0002\nparent_span_id=0001

    API->>Auth: gRPC CheckToken\ngrpc-trace-bin: (abc123, 0002)
    Note over Auth: Create child span_id=0003
    Auth-->>API: Token valid (span 0003 ends)

    API->>DB: SELECT * FROM orders\nComment: /* traceid=abc123 spanid=0004 */
    Note over DB: Query executed (span 0004 ends)
    DB-->>API: Results

    Note over API: Span 0002 ends
    API-->>Client: 200 OK

    Note over Client,DB: Async: spans exported to\nJaeger/Zipkin via OTLP\n(batched, out-of-band)
```

**Sampling Decision Propagation**: The `traceparent` flag byte encodes the sampling decision. If the root span decides to sample (probabilistic, 1%), all downstream services **inherit** that decision — this ensures complete traces, not partial traces.

---

## 11. Gossip Protocol: Epidemic Information Dissemination

Gossip (used by Cassandra, Consul, Redis Cluster) spreads information in O(log N) rounds.

```mermaid
flowchart TD
    subgraph "Round 1 (1 infected)"
        I["Node A\n(knows new info)"]
        I -->|random peer| R1["Node D\n(now infected)"]
    end
    subgraph "Round 2 (2 infected)"
        I2["Node A"] -->|random| R2["Node B"]
        ID2["Node D"] -->|random| R3["Node G"]
    end
    subgraph "Round 3 (4 infected)"
        N1["A→F"] 
        N2["B→C"]
        N3["D→H"]
        N4["G→E"]
    end
    subgraph "Convergence"
        Conv["After k=log₂(N) rounds\n~50% nodes informed\nAfter 3k rounds\n~99.9% nodes informed\nP(not_infected) = (1-1/N)^(kN) ≈ e^(-k)"]
    end
```

### Phi Accrual Failure Detector (Cassandra)

Instead of binary alive/dead, phi failure detector outputs a **suspicion level φ** based on inter-arrival times of heartbeats:

```
φ(t) = -log₁₀(P_later(t - t_last))
```

Where `P_later` is the probability that the next heartbeat arrives after time `t` given a Gaussian model of past inter-arrival times. φ=1 → 90% confidence of failure. φ=8 → 99.999999%.

---

## 12. Linearizability vs Serializability

```mermaid
flowchart TD
    subgraph "Consistency Models Hierarchy"
        SR["Strict Serializability\n(strongest)\nLinearizable + serializable\nSpanner, FoundationDB"]
        LIN["Linearizability\n(single-object real-time)\nEtcd, ZooKeeper\nOpens a 'register' abstraction"]
        SEQ["Sequential Consistency\n(global order, not real-time)\nOld CPUs, some GPU memory models"]
        SER["Serializability\n(multi-object transactions)\nPostgreSQL SERIALIZABLE\nno real-time constraint"]
        SI["Snapshot Isolation\nMVCC read consistency\nbut write skew possible"]
        RC["Read Committed\nno dirty reads\nphantas reads possible"]
        RU["Read Uncommitted\ndirty reads allowed"]
        SR --> LIN
        SR --> SER
        LIN --> SEQ
        SER --> SI
        SI --> RC
        RC --> RU
    end
```

**Write Skew Example (SI allows, Serializable prevents)**:
- Txn A reads: "2 doctors on call" → decides one can go off call
- Txn B reads: "2 doctors on call" → decides one can go off call  
- Both commit → 0 doctors on call (violates invariant)
- Under SI: both pass (each read a consistent snapshot before the other's write)
- Under Serializable: one aborts (serialization conflict detected)

---

## 13. Google Spanner: TrueTime and External Consistency

Spanner achieves **external consistency** (strict serializability globally) using GPS + atomic clock hardware providing bounded time uncertainty.

```mermaid
sequenceDiagram
    participant App as Application
    participant S as Spanner Server
    participant TT as TrueTime API

    App->>S: COMMIT transaction T
    S->>TT: TT.now()
    TT-->>S: [earliest=T.early, latest=T.late]\nuncertainty ε typically 1-7ms

    Note over S: commit_timestamp = T.late + ε\n(after the absolute latest possible now)
    Note over S: WAIT until TT.now().earliest > commit_timestamp\n("commit wait" — typically 10-14ms)
    S-->>App: COMMIT OK with timestamp=T_commit

    Note over App,S: Any future transaction that starts\nafter receiving this ACK will have\nstart_timestamp > T_commit\n→ guaranteed to see this write\n(external consistency)
```

The **commit wait** is the price of external consistency: Spanner deliberately delays COMMIT acknowledgment by the TrueTime uncertainty interval to ensure no future transaction starts with a timestamp before the current commit.

---

## 14. Partition Repair: Anti-Entropy with Merkle Trees

After a network partition heals, replicas must reconcile diverged data. Merkle trees make this efficient.

```mermaid
flowchart TD
    subgraph "Replica A Merkle Tree"
        RA_root["Root: hash(AB+CD)=H1a"]
        RA_ab["hash(A+B)=H2a"]
        RA_cd["hash(C+D)=H3a"]
        RA_a["A: h(v1)"]
        RA_b["B: h(v2)"]
        RA_c["C: h(v3)"]
        RA_d["D: h(v4a)\n(diverged)"]
        RA_root --> RA_ab --> RA_a
        RA_ab --> RA_b
        RA_root --> RA_cd --> RA_c
        RA_cd --> RA_d
    end
    subgraph "Replica B Merkle Tree"
        RB_root["Root: hash(AB+CD)=H1b\n≠H1a → diverged"]
        RB_ab["hash(A+B)=H2b=H2a\n(same — skip subtree)"]
        RB_cd["hash(C+D)=H3b\n≠H3a → recurse"]
        RB_d["D: h(v4b)\n(different value)"]
        RB_root --> RB_ab
        RB_root --> RB_cd --> RB_d
    end
    subgraph "Sync Result"
        SR["Only key D needs sync\nO(log N) tree traversal\nvs O(N) full comparison"]
    end
```

Cassandra uses Merkle trees for **repair** operations. Each node builds a Merkle tree of its token range. Tree comparison identifies diverged leaf nodes (individual keys or key ranges) that need reconciliation.

---

## 15. Distributed Lock Service: Chubby/etcd Internals

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant E as etcd Cluster
    participant L as Lease Manager

    Note over C1: Acquire distributed lock
    C1->>E: PUT /locks/resource-x\nvalue=client1-id\nLease TTL=10s (CreateLease first)
    Note over E: Raft consensus: replicate to majority
    E-->>C1: OK, lease_id=42, revision=100

    C2->>E: PUT /locks/resource-x (try)
    Note over E: Key already exists
    E-->>C2: Key exists — watch for DELETE

    Note over C1: C1 must keepalive lease
    loop every 5s
        C1->>E: LeaseKeepAlive(lease_id=42)
        E-->>C1: TTL renewed
    end

    Note over C1: C1 crashes (no more keepalive)
    Note over E: Lease 42 expires after 10s\nKey /locks/resource-x deleted
    E-->>C2: Watch event: DELETE revision=101
    C2->>E: PUT /locks/resource-x\nvalue=client2-id, new lease
    E-->>C2: OK — lock acquired
```

**Fencing Token**: The revision number (100, 101...) is a **fencing token** — monotonically increasing. C1 uses revision 100 in all downstream operations. When the lock expires and C2 gets revision 101, any downstream service that sees a C1 request with revision 100 after seeing revision 101 **rejects it** (stale request detection).

---

## Summary: Key Distributed Systems Properties

| Property | Mechanism | Cost |
|---|---|---|
| Consensus | Paxos/Raft (quorum writes) | 1 RTT for reads, 2 RTTs for writes |
| External Consistency | TrueTime commit wait | 10-14ms latency floor |
| Eventual Consistency | CRDT merge / gossip | No coordination, conflict possible |
| Distributed Txn | 2PC coordinator | Blocking on coordinator failure |
| Causality Tracking | Vector clocks | O(N) clock size |
| Fault Detection | Phi accrual / heartbeat | False positive risk on slow network |
| Partition Repair | Merkle tree anti-entropy | Background CPU/IO for tree computation |
| Distributed Lock | etcd lease + fencing | Lease expiry latency on crash |
