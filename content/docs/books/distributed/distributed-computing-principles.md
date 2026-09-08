# Distributed Computing: Principles, Algorithms, and Systems — Under the Hood

> Source: *Distributed Computing: Principles, Algorithms, and Systems* — Ajay D. Kshemkalyani & Mukesh Singhal, Cambridge University Press, 2008 (756 pages)

---

> **Reading contract:** This is a theory-oriented reading of a 2008 textbook for readers who can track system and fault models. Every theorem or message bound must name synchrony, channel reliability and ordering, membership, crash or Byzantine faults, authentication, quorum construction, and termination assumptions. Proof sketches are **derivations**; product mappings and round-trip counts are **examples**. A protocol is complete only with safety and liveness arguments, recovery state, retry/idempotency rules, and fault-injection evidence for the claimed model. Outside that model, retain the result as unproven rather than extending it by analogy.

## 1. The Distributed Execution Model: Events, Causality, and Global State

A distributed system is not a sequential machine. There is no global clock — each process has its own local clock and communicates only by message passing. The fundamental unit of analysis is an **event**: a local computation, a send, or a receive.

```mermaid
flowchart LR
    subgraph P1["Process P1"]
        E1["e₁¹ (local)"] --> E2["e₂¹ (send m1)"] --> E3["e₃¹ (receive m2)"] --> E4["e₄¹ (local)"]
    end
    subgraph P2["Process P2"]
        F1["f₁² (local)"] --> F2["f₂² (receive m1)"] --> F3["f₃² (send m2)"] --> F4["f₄² (local)"]
    end
    E2 -->|"m1 (message in transit)"| F2
    F3 -->|"m2"| E3

    subgraph HAPPENS_BEFORE["Happens-Before (→) Relation"]
        HB1["e₂¹ → f₂²  (send before receive)"]
        HB2["f₂² → f₃²  (same process, sequential)"]
        HB3["f₃² → e₃¹  (send before receive)"]
        HB4["e₂¹ → e₃¹  (transitivity)"]
    end
```

**Lamport's happens-before** (→) is a partial order — not all event pairs are comparable. Two events `a` and `b` are **concurrent** (a ∥ b) if neither `a → b` nor `b → a`. This is the root cause of distributed system complexity: concurrent events cannot be linearized without coordination.

---

## 2. Logical Clocks: Assigning Timestamps Without a Global Clock

### Lamport Scalar Clocks

Each process `Pi` maintains a counter `C[i]`. The rules:
1. Before every event: `C[i] += 1`
2. On send: piggyback `C[i]` in message
3. On receive(msg with timestamp `t`): `C[i] = max(C[i], t) + 1`

```mermaid
sequenceDiagram
    participant P1 as P1 (C=0)
    participant P2 as P2 (C=0)
    participant P3 as P3 (C=0)

    Note over P1: C=1: local event e₁
    P1->>P2: m1 (timestamp=1)
    Note over P2: C=max(0,1)+1=2: receive m1
    Note over P2: C=3: local event f₂
    P2->>P3: m2 (timestamp=3)
    Note over P3: C=max(0,3)+1=4: receive m2
    Note over P1: C=2: local event e₂

    Note over P1,P3: Lamport: a→b ⟹ C(a) < C(b)\nBut C(a) < C(b) ⟹ NOT necessarily a→b\n(false positives: concurrent events may share ordering)
```

**Limitation**: Scalar clocks cannot detect concurrency. If `C(a) < C(b)`, it could mean `a → b` OR `a ∥ b`.

### Vector Clocks: Capturing Full Causality

Process `Pi` maintains vector `VC[i][1..n]`. Rules:
1. Before event at `Pi`: `VC[i][i] += 1`
2. On send: piggyback entire vector `VC[i]`
3. On receive at `Pi` from `Pj` with timestamp `VT`: `VC[i][k] = max(VC[i][k], VT[k])` for all k, then `VC[i][i] += 1`

```mermaid
sequenceDiagram
    participant P1 as P1 VC=[0,0,0]
    participant P2 as P2 VC=[0,0,0]
    participant P3 as P3 VC=[0,0,0]

    Note over P1: VC=[1,0,0]: send m1
    P1->>P2: m1 (VC=[1,0,0])
    Note over P2: VC=[1,1,0]: receive m1, then +1 own
    Note over P2: VC=[1,2,0]: send m2
    P2->>P3: m2 (VC=[1,2,0])
    Note over P3: VC=[1,2,1]: receive
    Note over P1: VC=[2,0,0]: independent local event

    Note over P1,P3: e@P1=[2,0,0], f@P3=[1,2,1]\ne∥f: neither dominates the other component-wise
```

**Vector clock comparison**: `VC(a) < VC(b)` iff `VC(a)[k] ≤ VC(b)[k]` for all k and strict for at least one. This is a **necessary and sufficient** condition for `a → b`. Concurrent events are detected when neither dominates.

---

## 3. Global State and Consistent Cuts

A **global state** is a tuple of local process states and channel states. A **consistent cut** is a global state where for every message received, the corresponding send is also included.

```mermaid
flowchart LR
    subgraph TIME["Space-Time Diagram"]
        direction TB
        P1_LINE["P1: e₁ ——● e₂ ——● e₃ ——●"]
        P2_LINE["P2: f₁ ——● f₂ ——● f₃ ——●"]
        P3_LINE["P3: g₁ ——● g₂ ——● g₃ ——●"]
    end

    subgraph CUTS["Cut Comparison"]
        CUT_A["Consistent Cut C₁:\ne₂, f₁, g₃\nAll received messages\nalso have senders included"]
        CUT_B["Inconsistent Cut C₂:\ne₁, f₂, g₁\nf₂ = receive(m from P1)\nbut P1 cut at e₁ (before send)\n→ INCONSISTENT"]
    end
```

### Chandy-Lamport Snapshot Algorithm

Records a consistent global state without freezing the system:

```mermaid
sequenceDiagram
    participant P1 as P1 (initiator)
    participant P2 as P2
    participant P3 as P3

    P1->>P1: Record own state S1
    P1->>P2: MARKER (on channel c12)
    P1->>P3: MARKER (on channel c13)
    Note over P1: Begin recording messages on incoming channels

    P2->>P2: Receive MARKER from P1\n→ Record state S2\nRecord c12 state = {} (empty: MARKER was first)
    P2->>P3: MARKER (on channel c23)
    Note over P2: Record incoming msgs from P3 (not yet seen MARKER from P3)

    P3->>P3: Receive MARKER from P1\n→ Record state S3
    P3->>P3: Receive MARKER from P2\n→ Record c23 state = {msgs since S3 snapshot}

    Note over P1,P3: Global snapshot = (S1, S2, S3, c12={}, c13={}, c23={msgs})
    Note over P1,P3: This is a consistent cut:\neach received message also has its send in snapshot
```

**Key insight**: The MARKER acts as a timestamp separator. Everything before the MARKER on a channel belongs to the snapshot; everything after does not. The algorithm is non-intrusive — normal computation continues.

---

## 4. Distributed Mutual Exclusion: Algorithms and Complexity

### Lamport's Algorithm (1978)

Uses Lamport clocks to totally order requests. Every site maintains a request queue sorted by `(timestamp, site_id)`.

```mermaid
sequenceDiagram
    participant Si as Site Si
    participant Sj as Site Sj (all other sites)
    participant CS as Critical Section

    Si->>Sj: REQUEST(tsi, i) broadcast to all
    Si->>Si: Add (tsi, i) to own queue
    Sj-->>Si: REPLY(tsj) after adding to own queue
    Note over Si: Si enters CS when:\n1. (tsi,i) is at head of queue\n2. Received REPLY from ALL other sites
    Si->>CS: Enter Critical Section
    CS->>Si: Exit CS
    Si->>Sj: RELEASE broadcast
    Sj->>Sj: Remove (tsi,i) from queue
```

**Message complexity**: 3(N-1) messages per CS entry (N-1 REQUESTs + N-1 REPLYs + N-1 RELEASEs). **Synchronization delay**: T (one message round trip).

### Ricart-Agrawala Algorithm (1981): Optimized

Eliminates explicit RELEASE messages by merging them into deferred REPLYs:

```mermaid
sequenceDiagram
    participant Si as Si (wants CS)
    participant Sj as Sj (in CS or wants CS)
    participant Sk as Sk (idle)

    Si->>Sj: REQUEST(tsi, i)
    Si->>Sk: REQUEST(tsi, i)
    Sk-->>Si: REPLY immediately (Sk doesn't want CS)

    Note over Sj: Sj in CS → defer REPLY to Si
    Sj->>CS: (finishes CS)
    Sj-->>Si: REPLY (deferred)

    Note over Si: Received N-1 REPLYs → Enter CS
    Si->>CS: Enter CS
```

**Message complexity**: 2(N-1) messages (N-1 REQUESTs + N-1 REPLYs). **Correctness**: Total order on requests via timestamps ensures no two sites are in CS simultaneously.

### Maekawa's Quorum-Based Algorithm: √N Messages

Instead of broadcasting to all N sites, each site broadcasts to only its **quorum set** of size ~√N:

```mermaid
flowchart TD
    subgraph QUORUM_SETS["Quorum Sets for N=9 sites (3×3 grid)"]
        Q1["R(S1) = {S1, S2, S3, S4, S7}"]
        Q2["R(S5) = {S5, S2, S8, S4, S6}"]
        Q3["Any two quorum sets intersect:\nR(S1) ∩ R(S5) = {S2, S4}"]
    end
    DEADLOCK["Deadlock Problem:\nSi locks Sij, Sj locks Sjk, Sk locks Ski\n→ Circular wait"]
    RESOLVE["Resolution:\nFAILED / INQUIRE / YIELD messages\n→ 5√N messages worst case"]
    QUORUM_SETS --> DEADLOCK --> RESOLVE
```

**Why quorums guarantee safety**: Any two quorum sets must intersect — so two sites can never simultaneously hold locks on disjoint sets. The intersection site acts as the "common voter" serializing access.

---

## 5. Deadlock Detection: Wait-For Graphs

### Centralized Deadlock Detection

```mermaid
flowchart TD
    subgraph WFG["Wait-For Graph (WFG)"]
        P1(["P1"]) -->|"waiting for resource held by"| P2(["P2"])
        P2 -->|waiting for| P3(["P3"])
        P3 -->|waiting for| P1
        NOTE["Cycle P1→P2→P3→P1 = DEADLOCK"]
    end
    subgraph CENTRALIZED["Centralized Algorithm"]
        LOCAL1["Local WFG at Site 1\nP1 → P2"] -->|periodic update| CONTROLLER["Central Deadlock\nDetector"]
        LOCAL2["Local WFG at Site 2\nP2 → P3"] --> CONTROLLER
        LOCAL3["Local WFG at Site 3\nP3 → P1"] --> CONTROLLER
        CONTROLLER -->|"Cycle detection\n(DFS/BFS)"| RESOLVE["Kill youngest\nor cheapest process"]
    end
```

### Chandy-Misra-Haas Algorithm for Distributed Deadlock (AND model)

```mermaid
sequenceDiagram
    participant P1 as P1 (blocked)
    participant P2 as P2 (blocked, intermediary)
    participant P3 as P3 (blocked)

    Note over P1: P1 is blocked waiting for P2
    P1->>P2: PROBE(P1, P1, P2) [initiator, sender, receiver]
    Note over P2: P2 is also blocked → propagate PROBE
    P2->>P3: PROBE(P1, P2, P3)
    Note over P3: P3 is blocked, waiting for P1
    P3->>P1: PROBE(P1, P3, P1)
    Note over P1: Receive PROBE with initiator=P1\n→ DEADLOCK DETECTED
    Note over P1: P1 initiates victim selection:\nkill the process with max PID in cycle
```

**Complexity**: O(e) messages where e = edges in WFG. Probes propagate along waiting edges — the PROBE returns to its initiator only if there is a cycle.

---

## 6. Consensus and Agreement: The FLP Impossibility

The **Fischer-Lynch-Paterson (FLP) impossibility theorem** (1985) is the most important result in distributed systems theory:

> **FLP scope:** No deterministic consensus protocol can guarantee termination in every admissible execution of a fully asynchronous message-passing system with even one possible crash failure. The result does not say safety is impossible or that practical protocols never terminate under added timing assumptions.

```mermaid
stateDiagram-v2
    [*] --> BIVALENT_INITIAL: Initial state\n(some process may crash)
    BIVALENT_INITIAL --> DECISION_ATTEMPT: Execute one step
    DECISION_ATTEMPT --> BIVALENT_AGAIN: Step taken by potentially\ncrashed process — indistinguishable\nfrom live-but-slow process
    BIVALENT_AGAIN --> DECISION_ATTEMPT: Repeat forever
    note right of BIVALENT_AGAIN: Bivalent = both 0 and 1\nstill reachable\n\nMonovalent = only 0 or 1\nreachable (decided)\n\nFLP: Can never deterministically\ntransition bivalent→monovalent\nin async system with failures
```

**Why this matters**: Any system claiming Byzantine/crash fault tolerance in an asynchronous network must either:
1. Use **randomization** (Randomized consensus, Ben-Or algorithm)
2. Use **partial synchrony** assumptions (Paxos, Raft — assume messages eventually arrive)
3. Solve a **weaker problem** (k-set consensus, approximate agreement)

### Paxos: Consensus Under Partial Synchrony

Paxos assumes **eventually synchronous** channels — messages may be delayed but eventually arrive. It uses two phases:

```mermaid
sequenceDiagram
    participant PROPOSER as Proposer (Leader)
    participant A1 as Acceptor 1
    participant A2 as Acceptor 2
    participant A3 as Acceptor 3

    Note over PROPOSER: Phase 1a: Prepare
    PROPOSER->>A1: PREPARE(n=5)
    PROPOSER->>A2: PREPARE(n=5)
    PROPOSER->>A3: PREPARE(n=5)

    Note over A1,A3: Accept if n > highest_promised
    A1-->>PROPOSER: PROMISE(n=5, last_accepted=null)
    A2-->>PROPOSER: PROMISE(n=5, last_accepted=(n=3, v=42))
    A3-->>PROPOSER: PROMISE(n=5, last_accepted=null)

    Note over PROPOSER: Phase 2a: Accept\nIf any PROMISE had prior value,\nmust use that value (v=42)\nOtherwise propose own value
    PROPOSER->>A1: ACCEPT(n=5, v=42)
    PROPOSER->>A2: ACCEPT(n=5, v=42)
    PROPOSER->>A3: ACCEPT(n=5, v=42)

    A1-->>PROPOSER: ACCEPTED(n=5)
    A2-->>PROPOSER: ACCEPTED(n=5)
    Note over PROPOSER: Quorum (2/3) → COMMIT v=42
    PROPOSER->>A1: COMMIT(v=42)
    PROPOSER->>A2: COMMIT(v=42)
    PROPOSER->>A3: COMMIT(v=42)
```

**Why Phase 1b must return the highest prior accepted value**: If an acceptor has already accepted value `v` in a prior round, there may be a quorum that has committed `v`. The new proposer must preserve this value to prevent two different values being committed in different rounds.

### Raft: Understandable Paxos

```mermaid
stateDiagram-v2
    [*] --> Follower: Node starts
    Follower --> Candidate: Election timeout\n(no heartbeat from leader)
    Candidate --> Leader: Receives votes from majority
    Candidate --> Follower: Discovers leader\nor higher term
    Leader --> Follower: Discovers higher term
    Leader --> Leader: Sends heartbeats\nevery 150-300ms

    state Leader {
        [*] --> AppendEntries_RPC
        AppendEntries_RPC --> Commit: Majority acknowledgment
        Commit --> [*]
    }
```

**Raft log commitment:** Majority replication is necessary, but the current leader advances commit through the Raft commitment rules, including the restriction on directly committing entries from prior terms. Client reply timing is an implementation contract. Uncommitted entries may be overwritten; committed-entry durability still assumes the Raft storage and membership model.

---

## 7. Failure Detectors: The Theory Behind Heartbeats

Chandra and Toueg (1996) formalized **failure detectors** as oracle modules:

```mermaid
flowchart TD
    subgraph CLASSES["Failure Detector Classes (by two properties)"]
        subgraph COMPLETENESS["Completeness\n(correct detectors eventually suspect crashed processes)"]
            STRONG["Strong: every crashed process\neventually suspected by ALL correct processes"]
            WEAK["Weak: every crashed process\neventually suspected by SOME correct process"]
        end
        subgraph ACCURACY["Accuracy\n(how often correct processes are wrongly suspected)"]
            STRONG_ACC["Strong: no correct process ever suspected"]
            WEAK_ACC["Weak: some correct process is never suspected"]
            EVENTUAL_S["Eventual Strong: after some time,\nno correct process ever suspected"]
            EVENTUAL_W["Eventual Weak: after some time,\nsome correct process never suspected"]
        end
    end

    STRONG --> PERFECT["Perfect Failure Detector\n(Strong Completeness + Strong Accuracy)\nRequires synchrony"]
    EVENTUAL_S --> EVENTUALLY_PERFECT["Eventually Perfect ◇P\n(eventual strong both)\nSufficient for consensus!"]
    EVENTUAL_W --> EVENTUALLY_WEAK["Eventually Weak ◇W\n(weakest detector for consensus)"]
```

**Theorem (Chandra-Toueg)**: Consensus is solvable with failure detector class `◇W` (eventually weak) even in asynchronous systems. This justifies why Zookeeper, etcd, and Raft can solve consensus despite the FLP impossibility — they use timeouts (implementing `◇P`) and accept false suspicions temporarily.

### Phi Accrual Failure Detector (used in Akka, Cassandra)

Instead of binary "alive/dead", outputs a suspicion level φ:

```mermaid
flowchart TD
    HEARTBEATS["Inter-arrival intervals of heartbeats\n[t₁, t₂, t₃, ..., tₙ]"] --> STATS["Compute distribution:\nmean μ, std dev σ\n(exponential distribution assumed)"]
    STATS --> PHI["φ(t_now) = -log₁₀(P(T > t_now))\nwhere T ~ Exponential(1/μ)"]
    PHI -->|"φ < threshold (e.g. 8)"| ALIVE["Process considered ALIVE"]
    PHI -->|"φ ≥ threshold"| SUSPECTED["Process SUSPECTED\n(application decides action)"]

    NOTE["φ = 8 → P(false suspicion) ≈ 10⁻⁸\nφ = 10 → P(false suspicion) ≈ 10⁻¹⁰\nAdjust threshold for network conditions"]
```

---

## 8. Distributed Transactions: 2PC and 3PC Internals

### Two-Phase Commit (2PC): Blocking Protocol

```mermaid
sequenceDiagram
    participant COORD as Coordinator
    participant P1 as Participant 1
    participant P2 as Participant 2
    participant P3 as Participant 3

    Note over COORD: Phase 1: Voting
    COORD->>P1: PREPARE (canCommit?)
    COORD->>P2: PREPARE
    COORD->>P3: PREPARE
    P1-->>COORD: YES (logged PREPARED to WAL)
    P2-->>COORD: YES
    P3-->>COORD: NO (e.g., constraint violation)

    Note over COORD: Any NO → ABORT
    COORD->>P1: ABORT
    COORD->>P2: ABORT
    COORD->>P3: ABORT

    Note over COORD,P3: BLOCKING SCENARIO:\nIf coordinator crashes after\nparticipants voted YES but before\nsending COMMIT/ABORT,\nparticipants are BLOCKED waiting forever
```

**2PC blocking problem**: A participant that has voted YES is uncertain — it cannot unilaterally abort (another participant may have committed) nor commit (another may have aborted). It must wait for the coordinator to recover.

### Three-Phase Commit (3PC): Non-Blocking

3PC adds a **pre-commit** phase that allows participants to detect coordinator failure and safely commit:

```mermaid
sequenceDiagram
    participant COORD as Coordinator
    participant P1 as Participant 1
    participant P2 as Participant 2

    COORD->>P1: PREPARE
    COORD->>P2: PREPARE
    P1-->>COORD: VOTE_COMMIT
    P2-->>COORD: VOTE_COMMIT

    COORD->>P1: PRE-COMMIT ← NEW PHASE
    COORD->>P2: PRE-COMMIT
    P1-->>COORD: ACK
    P2-->>COORD: ACK

    COORD->>P1: COMMIT
    COORD->>P2: COMMIT

    Note over P1,P2: If coordinator crashes after PRE-COMMIT:\nnew coordinator queries participants.\nAll saw PRE-COMMIT → safe to COMMIT\n(all voted YES, none can abort)
```

**Non-blocking scope:** 3PC's non-blocking argument requires bounded-delay or failure-detection assumptions and no partition that makes states indistinguishable. A bound on the number of crashes alone is insufficient. The pre-commit phase does not make arbitrary partitioned executions safe.

---

## 9. Peer-to-Peer Overlay Networks: Chord DHT Internals

### Consistent Hashing Ring

```mermaid
flowchart LR
    subgraph RING["Chord Ring (m=6 bits, 2⁶=64 positions)"]
        N0["Node 0\n(holds keys 57-0)"]
        N14["Node 14\n(holds keys 1-14)"]
        N32["Node 32\n(holds keys 15-32)"]
        N45["Node 45\n(holds keys 33-45)"]
        N51["Node 51\n(holds keys 46-51)"]
        N57["Node 57\n(holds keys 52-57)"]
    end
    N0 --> N14 --> N32 --> N45 --> N51 --> N57 --> N0
```

### Chord Finger Table: O(log N) Lookup

Each node `n` maintains a finger table where `finger[i] = successor(n + 2^(i-1) mod 2^m)`:

```mermaid
flowchart TD
    subgraph FT_N0["Finger Table of Node 0 (m=6)"]
        F1["finger[1] = succ(0+1) = N14"]
        F2["finger[2] = succ(0+2) = N14"]
        F3["finger[3] = succ(0+4) = N14"]
        F4["finger[4] = succ(0+8) = N14"]
        F5["finger[5] = succ(0+16) = N32"]
        F6["finger[6] = succ(0+32) = N45"]
    end
    subgraph LOOKUP["Lookup key k=40 from N0"]
        STEP1["N0: finger[6]=N45 > 40? No → finger[5]=N32 > 40? No"]
        STEP2["N0 forwards to N32"]
        STEP3["N32: finger[6]=succ(32+32)=N0 → wrap. finger[5]=succ(32+16)=N51 > 40? Yes"]
        STEP4["N32 forwards to N45"]
        STEP5["N45: 40 ∈ (32, 45] → N45 is responsible. FOUND."]
    end
    FT_N0 --> LOOKUP
```

**Lookup complexity**: O(log N) hops with O(log N) finger table entries per node. When a node joins, it needs to update at most O(log² N) other nodes' finger tables.

---

## 10. Spanning Trees and Broadcast/Convergecast

Distributed algorithms for information dissemination rely on **spanning trees** — tree overlays connecting all processes with no cycles.

```mermaid
sequenceDiagram
    participant ROOT as Root (P1)
    participant P2 as P2
    participant P3 as P3
    participant P4 as P4 (leaf)

    Note over ROOT: Broadcast: root sends message
    ROOT->>P2: FLOOD(msg, P1)
    ROOT->>P3: FLOOD(msg, P1)
    P2->>P4: FLOOD(msg, P1) [P2 is P4's parent in tree]
    Note over P4: Received — leaf node, no children

    Note over P4,ROOT: Convergecast: aggregate result back up
    P4-->>P2: RESULT(partial: subtree of P4)
    P3-->>ROOT: RESULT(partial: subtree of P3)
    P2-->>ROOT: RESULT(partial: subtree of P2 + P4)
    Note over ROOT: Combine all results → global aggregate (min/max/sum)
```

**Message complexity**: Broadcast = O(n) messages on tree. Convergecast = O(n) messages. Building the spanning tree = O(m + n log n) messages (Gallagher-Humblet-Spira MST algorithm).

---

## 11. Byzantine Fault Tolerance: Dealing with Liars

In the classic unauthenticated Byzantine agreement model, tolerating up to `f` arbitrary faulty processes requires `n ≥ 3f + 1`. Authentication, synchrony, quorum and protocol assumptions can change the exact resilience statement.

```mermaid
sequenceDiagram
    participant G as General (Commander)
    participant L1 as Lieutenant 1 (loyal)
    participant L2 as Lieutenant 2 (loyal)
    participant T as Traitor

    G->>L1: ATTACK
    G->>L2: ATTACK
    G->>T: ATTACK

    T->>L1: (claims General said) RETREAT
    T->>L2: (claims General said) ATTACK

    Note over L1: Received: ATTACK (from G), RETREAT (from T)\nMajority of 3 loyal process values → ?

    Note over L1,L2: With n=4, f=1: n ≥ 3(1)+1=4 ✓\nAlgorithm: OM(m) runs m+1 rounds\nwhere m = number of traitors\nEach loyal Lt eventually decides on majority vote
```

**Why n ≥ 3f + 1**: With n = 3f, the f traitors can confuse the 2f loyal generals into a tie. The extra f+1 loyal generals provide the decisive majority.

### Practical BFT: PBFT Protocol

```mermaid
sequenceDiagram
    participant CLIENT as Client
    participant PRIMARY as Primary Replica
    participant R1 as Replica 1
    participant R2 as Replica 2
    participant R3 as Replica 3 (faulty)

    CLIENT->>PRIMARY: Request(op)
    Note over PRIMARY: Phase 1: Pre-prepare
    PRIMARY->>R1: PRE-PREPARE(v, n, digest(m))
    PRIMARY->>R2: PRE-PREPARE(v, n, digest(m))
    PRIMARY->>R3: PRE-PREPARE(v, n, digest(m))

    Note over R1,R3: Phase 2: Prepare (multicast to all)
    R1->>R2: PREPARE(v, n, digest, i=1)
    R2->>R1: PREPARE(v, n, digest, i=2)
    R3--xR1: PREPARE (faulty: wrong digest)

    Note over R1: Received 2f PREPARE msgs → PREPARED
    Note over R1,R3: Phase 3: Commit
    R1->>R2: COMMIT(v, n, digest, i=1)
    R2->>R1: COMMIT(v, n, digest, i=2)
    Note over R1: 2f+1 COMMIT msgs → EXECUTE and REPLY to client
    R1-->>CLIENT: Reply(result)
    R2-->>CLIENT: Reply(result)

    Note over CLIENT: Accept reply after f+1 identical replies\n(guarantees at least one reply from honest replica)
```

**PBFT complexity**: O(n²) messages per request (all replicas multicast to all). This limits PBFT to small replica counts (~dozens). Modern systems like HotStuff reduce this to O(n) via threshold signatures.

---

## 12. Distributed Shared Memory and Memory Consistency Models

```mermaid
flowchart TD
    subgraph MODELS["Memory Consistency Models (weakest to strongest)"]
        EVENTUAL["Eventual Consistency\nReplicas diverge temporarily\n→ eventually converge (DNS, DynamoDB)"]
        CAUSAL["Causal Consistency\nCausally related writes seen in order\nConcurrent writes may differ (COPS)"]
        SEQUENTIAL["Sequential Consistency\n(Lamport)\nAll processes see same total order\nNot necessarily real-time"]
        LINEARIZABLE["Linearizability\n(Herlihy-Wing)\nSequential + real-time order\netcd, Zookeeper, Spanner"]
    end
    EVENTUAL --> CAUSAL --> SEQUENTIAL --> LINEARIZABLE
    LINEARIZABLE -->|"Higher cost\n(requires coordination)"| PERF["Lower Performance"]
    EVENTUAL -->|"Lower cost\n(async replication)"| PERF2["Higher Performance"]
```

### CAP Theorem Internals

```mermaid
flowchart TD
    CAP["CAP Theorem:\nIn the presence of network Partition,\nchoose Consistency OR Availability\n(but not both)"]

    subgraph CA["CP Systems (Consistent + Partition-tolerant)"]
        ETCd["etcd/ZooKeeper\n(Raft/Paxos)\nRejects writes if no quorum\n→ Unavailable during partition"]
        SPANNER["Google Spanner\n(TrueTime + Paxos)\nStrongly consistent,\nbut can't serve during partition"]
    end

    subgraph AP["AP Systems (Available + Partition-tolerant)"]
        CASSANDRA["Apache Cassandra\n(Eventual consistency)\nAlways accepts writes\nReads may see stale data"]
        DYNAMO["Amazon DynamoDB\n(tunable consistency)\nSloppy quorums allow divergence"]
    end

    CAP --> CA
    CAP --> AP
```

---

## 13. Complete Data Flow: Message Through a Distributed System

```mermaid
sequenceDiagram
    participant CLIENT as Client
    participant LB as Load Balancer
    participant SVC_A as Service A (replica 1)
    participant SVC_A2 as Service A (replica 2)
    participant DB_COORD as DB Coordinator (Paxos leader)
    participant DB_F1 as DB Follower 1
    participant DB_F2 as DB Follower 2

    CLIENT->>LB: HTTP Request
    LB->>SVC_A: Forward (round-robin)

    SVC_A->>DB_COORD: BEGIN TRANSACTION\nWRITE(key=k, val=v)
    DB_COORD->>DB_F1: AppendEntries(log entry)
    DB_COORD->>DB_F2: AppendEntries(log entry)
    DB_F1-->>DB_COORD: ACK (quorum: 2/3)
    DB_COORD->>DB_COORD: Commit (mark durable in WAL)
    DB_COORD-->>SVC_A: COMMIT OK (with vector clock VC=[5,3,2])

    SVC_A-->>CLIENT: 200 OK

    Note over SVC_A2: Lagging replica\nVC=[5,2,2] (not yet seen entry)
    CLIENT->>LB: Read same key
    LB->>SVC_A2: Forward
    SVC_A2->>DB_F2: READ(k)
    DB_F2-->>SVC_A2: Old value (DB_F2 not yet applied commit)
    Note over SVC_A2: Stale read — AP/eventual consistency\nFor strong consistency: SVC_A2 must\nread from leader (DB_COORD)
```

---

## Summary: Complexity Landscape

```mermaid
block-beta
    columns 3
    H1["Algorithm"]:1 H2["Messages per Operation"]:1 H3["Synchronization Delay"]:1
    R1["Lamport ME"]:1 M1["3(N-1)"]:1 D1["T (one round trip)"]:1
    R2["Ricart-Agrawala"]:1 M2["2(N-1)"]:1 D2["T"]:1
    R3["Maekawa Quorum"]:1 M3["5√N (with deadlock)"]:1 D3["2T"]:1
    R4["Paxos Consensus"]:1 M4["4(N-1) typical"]:1 D4["2 round trips"]:1
    R5["PBFT Byzantine"]:1 M5["O(N²)"]:1 D5["3 round trips"]:1
    R6["Chord Lookup"]:1 M6["O(log N) hops"]:1 D6["O(log N) × T"]:1
    R7["Chandy-Lamport Snapshot"]:1 M7["O(e) — one per channel"]:1 D7["Non-blocking"]:1
```

Stronger guarantees often add coordination, messages, or latency under the same fault and workload model, but batching, locality, hardware and weaker baseline implementations can change measured performance. The table is a model-specific comparison, not a universal ranking of etcd, Kafka, Cassandra, or ZooKeeper.
