# 분산 시스템 내부: 합의, 내결함성 및 데이터 일관성

> 내부적으로: 분산 시스템이 신뢰할 수 없는 네트워크 전반에서 합의를 달성하고, 오류를 허용하고, 일관성을 유지하는 방법(정확한 데이터 흐름, 메시지 프로토콜, 상태 시스템 및 수학적 보장).

---

## 1. 근본적인 문제: 부분적인 실패

구성 요소가 원자적으로 실패(충돌 = 중지)되는 단일 시스템과 달리 분산 시스템은 **부분 오류**를 경험합니다. 즉, 일부 노드는 작동하고 일부는 작동하지 않으며, 네트워크 파티션이 구성 요소를 분할하고, 메시지가 순서에 맞지 않게 도착하거나 전혀 도착하지 않습니다.

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

과제: **노드 A의 관점에서 보면 노드 B 충돌은 매우 느리게 응답하는 노드 B와 구별할 수 없습니다.** 시간 초과는 유일한 감지 메커니즘이지만 최대 메시지 지연을 알지 못하면 올바른 시간 초과를 선택하는 것은 불가능합니다.

### 두 장군 문제(불가능)

어떤 프로토콜도 두 당사자가 신뢰할 수 없는 채널을 통해 합의에 도달한다고 보장할 수 없습니다. 이는 **입증된 불가능**입니다. 모든 확인 메시지 자체에는 무한한 확인이 필요합니다.

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

## 2. CAP 정리: 희생해야 하는 것

Brewer의 CAP 정리(Gilbert & Lynch에 의해 공식적으로 입증됨): 분산 시스템은 다음 세 가지를 동시에 보장할 수 없습니다.
- **C** — 일관성: 모든 읽기에는 가장 최근 쓰기가 표시됩니다.
- **A** — 가용성: 모든 요청은 응답을 받습니다.
- **P** — 파티션 허용 오차: 네트워크 분할에도 불구하고 시스템이 작동합니다.

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

**실제로 P가 협상 불가능한 이유**: 네트워크 파티션이 발생합니다. 당신은 그들을 용인해야합니다. 파티션이 발생할 때 실제 선택은 **CP 대 AP**입니다.

- **CP**: 파티션이 복구될 때까지 쓰기 거부(오류 반환) → 일관성은 있지만 사용할 수 없음
- **AP**: 파티션 양쪽에서 쓰기 허용 → 사용 가능하지만 서로 다른 상태

---

## 3. 합의: Paxos 내부 역학

Paxos는 노드 장애에도 불구하고 합의(단일 값에 대한 합의)를 달성합니다. 세 가지 역할: **제안자**, **수락자**, **학습자**.

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

### Paxos 투표용지 번호 불변

각 Acceptor는 `(maxPromised, acceptedBallot, acceptedValue)`을 저장합니다. 불변성:
- 수락자는 **결코** 투표용지에 대해 약속하지 않음 ≤ 해당 maxPromised
- 수락자는 **절대** 투표용지를 수락하지 않습니다. ≤ maxPromised
- 이전 라운드에서 어떤 값이 승인된 경우 제안자는 **반드시** 해당 값을 제안해야 합니다.

이를 통해 쿼럼에서 값이 선택되면 향후 Paxos 라운드에서 다른 값을 선택할 수 없습니다.

---

## 4. 뗏목: 이해할 수 있는 합의

Raft는 합의를 리더 선택, 로그 복제, 안전이라는 세 가지 하위 문제로 분해합니다.

```mermaid
stateDiagram-v2
    [*] --> Follower: Start
    Follower --> Candidate: Election timeout (150-300ms)\nno heartbeat from leader
    Candidate --> Leader: Wins majority vote\nRequestVote RPCs
    Candidate --> Follower: Discovers valid leader\nor higher term
    Leader --> Follower: Discovers server with\nhigher term
    Candidate --> Candidate: Election timeout\n(split vote — retry)
```

### Raft 로그 복제 내부 흐름

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

### 뗏목 안전: 로그 일치 속성

Raft를 안전하게 만드는 두 가지 불변성:
1. **선거 안전**: 임기당 최대 1명의 지도자
2. **로그 일치**: 두 개의 로그에 동일한 항목(색인, 용어)이 포함된 경우 이전 항목은 모두 동일합니다.

AppendEntries의 **prevIndex/prevTerm** 검사는 로그 일치를 시행합니다. 팔로어는 prevIndex에 prevTerm과 일치하는 항목이 없는 경우 거부합니다.

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

## 5. 분산 트랜잭션: 2단계 커밋(2PC)

2PC는 여러 노드(샤드/데이터베이스)에 걸쳐 원자적 커밋을 조정합니다.

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

### 2PC 장애 시나리오 및 WAL 복구

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

**2PC의 아킬레스 건 — 차단**: COMMIT를 작성한 후 참가자에게 보내기 전에 코디네이터가 충돌하는 경우 참가자는 **무기한 차단**됩니다. 즉, 잠금을 유지하지만 코디네이터의 결정 없이는 커밋하거나 중단할 수 없습니다. **3PC**(3단계 커밋)는 차단을 줄이기 위해 사전 커밋 단계를 추가하지만 네트워크 파티션에서 이를 제거하지는 않습니다.

---

## 6. MVCC: 다중 버전 동시성 제어 내부

MVCC(PostgreSQL, MySQL InnoDB, CockroachDB에서 사용)는 각 행의 여러 버전을 유지 관리하여 판독기와 기록기가 서로를 차단하지 않도록 합니다.

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

### MVCC 읽기 경로

각 트랜잭션은 시작 시 **스냅샷**을 받습니다: `(xmin, xmax, active_xids[])`. 다음과 같은 경우 행 버전이 표시됩니다.
- `row.xmin <= snapshot.xmax`(스냅샷 이전에 생성됨)
- `row.xmin`이(가) `active_xids[]`에 없음(작성자가 커밋됨)
- `row.xmax > snapshot.xmin` 또는 `row.xmax`은(는) `active_xids[]`에 있습니다(아직 삭제되지 않음).

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

## 7. 벡터 클럭 및 인과관계 추적

벡터 클록은 동기화된 클록 없이도 분산 시스템에서 **이전에 발생한 일** 관계를 추적합니다.

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

**충돌 감지**: 벡터 클록이 다른 벡터 클록을 지배하지 않는 경우 두 이벤트가 동시에 발생합니다(다른 이벤트보다 먼저 발생하지 않음).
- `A=[2,1,0]` 대 `B=[1,2,0]` → 동시 → 충돌 → 병합 필요

**DynamoDB**는 벡터 시계("버전 벡터"라고 함)를 사용하여 쓰기 충돌을 감지하고 해결을 위해 충돌하는 여러 버전을 애플리케이션에 반환합니다.

---

## 8. 일관된 해싱 및 분산 해시 테이블

일관된 해싱은 노드 가입/탈퇴 시 키 재매핑을 최소화합니다. 링은 동일한 해시 함수를 사용하여 키와 노드를 모두 `[0, 2^32)`에 매핑합니다.

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

### 로드 밸런싱을 위한 가상 노드

단일 노드는 링에서 여러 위치를 얻습니다(가상 노드/vnode):

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

물리적 노드당 vnode가 150개인 경우 로드 불균형은 통계적으로 10% 미만입니다.

---

## 9. 최종 일관성 및 CRDT

**CRDT(충돌 없는 복제 데이터 유형)**은 복제본이 조정 없이 분기 및 병합되도록 허용하여 수학적 구성을 통한 최종 수렴을 보장합니다.

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

### OR-Set(관찰-제거 세트) 내부

단순한 추가/제거 세트에는 "승리 제거"와 "승 추가"가 모호합니다. OR-Set 태그는 각각 고유한 ID로 추가됩니다.

```
add("a") → {("a", uid1)}
add("a") → {("a", uid1), ("a", uid2)}
remove("a") → removes all observed uid pairs for "a"
concurrent add("a") after remove → uid3 survives (not in remove set)
```

---

## 10. 분산 추적: 범위 전파 내부

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

**샘플링 결정 전파**: `traceparent` 플래그 바이트는 샘플링 결정을 인코딩합니다. 루트 범위가 샘플링(확률적, 1%)을 결정하면 모든 다운스트림 서비스는 해당 결정을 **상속**합니다. 이렇게 하면 부분 추적이 아닌 완전한 추적이 보장됩니다.

---

## 11. 가십 프로토콜: 전염병 정보 유포

Gossip(Cassandra, Consul, Redis Cluster에서 사용)은 O(log N) 라운드로 정보를 퍼뜨립니다.

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

### Phi 발생 실패 감지기(Cassandra)

바이너리 활성/비활성 대신 phi 오류 감지기는 하트비트의 도착 간 시간을 기반으로 **의심 수준 ψ**을 출력합니다.

```
φ(t) = -log₁₀(P_later(t - t_last))
```

여기서 `P_later`은(는) 과거 도착 간 시간의 가우스 모델을 고려하여 `t` 시간 이후에 다음 하트비트가 도착할 확률입니다. Φ=1 → 90% 실패 신뢰도. Φ=8 → 99.999999%.

---

## 12. 선형성 vs 직렬성

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

**쓰기 왜곡 예(SI 허용, 직렬화 방지)**:
- Txn A는 "2명의 의사가 통화 중"이라고 읽습니다. → 한 명은 통화를 중단할 수 있다고 결정합니다.
- Txn B는 "2명의 의사가 통화 중"이라고 읽습니다. → 한 명은 통화를 중단할 수 있다고 결정합니다.  
- 둘 다 커밋 → 통화 중인 의사 0명(불변 위반)
- SI에서: 두 가지 모두 통과(각각 상대방이 쓰기 전에 일관된 스냅샷을 읽음)
- 직렬화 가능: 하나가 중단됨(직렬화 충돌이 감지됨)

---

## 13. Google Spanner: TrueTime 및 외부 일관성

Spanner는 제한된 시간 불확실성을 제공하는 GPS + 원자 시계 하드웨어를 사용하여 **외부 일관성**(전 세계적으로 엄격한 직렬화 가능성)을 달성합니다.

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

**커밋 대기**는 외부 일관성의 대가입니다. Spanner는 현재 커밋 이전의 타임스탬프로 향후 트랜잭션이 시작되지 않도록 TrueTime 불확실성 간격으로 COMMIT 확인을 의도적으로 지연합니다.

---

## 14. 파티션 복구: 머클 트리를 이용한 안티엔트로피

네트워크 파티션이 복구된 후 복제본은 분산된 데이터를 조정해야 합니다. 머클 트리는 이를 효율적으로 만듭니다.

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

Cassandra는 **수리** 작업에 Merkle 트리를 사용합니다. 각 노드는 토큰 범위의 머클 트리를 구축합니다. 트리 비교는 조정이 필요한 분기된 리프 노드(개별 키 또는 키 범위)를 식별합니다.

---

## 15. 분산 잠금 서비스: Chubby/etcd 내부

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

**펜싱 토큰**: 개정 번호(100, 101...)는 **펜싱 토큰**이며 단조롭게 증가합니다. C1은 모든 다운스트림 작업에서 개정 100을 사용합니다. 잠금이 만료되고 C2가 수정 버전 101을 받으면 수정 버전 101을 본 후 수정 버전 100이 포함된 C1 요청을 본 모든 다운스트림 서비스는 **거부**합니다(오래된 요청 감지).

---

## 요약: 주요 분산 시스템 속성

| 부동산 | 메커니즘 | 비용 |
|---|---|---|
| 합의 | Paxos/Raft(쿼럼 쓰기) | 읽기용 RTT 1개, 쓰기용 RTT 2개 |
| 외부 일관성 | TrueTime 커밋 대기 | 10~14ms 지연 시간 바닥 |
| 최종 일관성 | CRDT 병합/가십 | 조정 없음, 충돌 가능 |
| 분산형 트랜잭션 | 2PC 코디네이터 | 코디네이터 실패 시 차단 |
| 인과관계 추적 | 벡터 시계 | O(N) 시계 크기 |
| 결함 감지 | 피 발생/심장박동 | 느린 네트워크의 거짓 긍정 위험 |
| 파티션 수리 | 머클 트리 반엔트로피 | 트리 계산을 위한 백그라운드 CPU/IO |
| 분산 잠금 | etcd 임대 + 펜싱 | 충돌 시 임대 만료 대기 시간 |
