# Advanced Algorithms — Under the Hood

## Assumptions and proof boundaries

Complexity and correctness claims in this synthesis depend on the graph model, edge-weight ties, computation model, randomization, and error probability. In the MST diagram, a light edge is guaranteed to belong to some MST under the cut-property conditions; it belongs to every MST only with an appropriate uniqueness condition. Likewise, a cycle edge is excluded from every MST only when it is uniquely heaviest. Treat “all known algorithms” and register-level descriptions as explanatory synthesis rather than a theorem from the cited course. A section is complete when it states the input model, maintained invariant, tie or probability assumptions, proof step, and time·space bound in the same model.

## CMU 15-850 (Anupam Gupta, Fall 2020) · Internal Mechanics

> **Not a tutorial.** This document maps how data flows through memory structures, how mathematical invariants propagate, and how algorithmic state evolves at the register/heap level — from MST history through graph matchings, metric embeddings, streaming sketches, and dimension reduction.

---

## 1. Minimum Spanning Trees — 100 Years of Internal Optimization

### 1.1 The Cut & Cycle Rules as Invariant Pumps

All MST algorithms are ultimately invariant-maintenance engines. Two rules govern what edges can be safely colored:

```mermaid
flowchart TD
    subgraph CUT_RULE["Cut Rule (Blue Rule)"]
        CR1[Partition V into S and V\\S] --> CR2{Min-weight crossing edge e?}
        CR2 --> CR3[Color e BLUE — must be in MST]
        CR3 --> CR4[Exchange proof: any tree T without e has\nhigher weight tree T' = T - e' + e where w(e') > w(e)]
    end
    subgraph CYCLE_RULE["Cycle Rule (Red Rule)"]
        RR1[Identify a cycle C in G] --> RR2{Heaviest edge e on C?}
        RR2 --> RR3[Color e RED — cannot be in MST]
        RR3 --> RR4[Contradiction: removing e' from T and adding e\ngives lower-weight spanning tree]
    end
    CUT_RULE -->|"Blue edges form\nspanning tree → done"| DONE["MST Complete"]
    CYCLE_RULE -->|"Non-red edges\nacyclic → done"| DONE
```

**Key insight**: The algorithms discussed here can be explained through cut-property safe edges and, for Karger-Klein-Tarjan filtering, cycle-property reasoning. This is a scope statement for this document, not a claim about every deterministic MST algorithm.

### 1.2 Algorithm Complexity Timeline — Why It Matters Internally

```mermaid
timeline
    title MST Algorithm Complexity Evolution
    1926 : Borůvka O(m log n)
           Parallel edge selection per component
    1930 : Jarník/Prim O(m log n)
           Priority queue frontier expansion
    1956 : Kruskal O(m log n)
           Sort + Union-Find connectivity
    1975 : Yao O(m log log n)
           Borůvka + linear median-finding subroutine
    1984 : Fredman-Tarjan O(m log* n)
           Fibonacci heaps + bounded frontier trick
    1995 : Karger-Klein-Tarjan O(m) randomized
           Random sampling + cycle rule filtering
    1997 : Chazelle O(m·α(n)) deterministic
           Soft heaps with controlled corruption
    1998 : Pettie-Ramachandran O(MST*(m,n))
           Optimal but runtime unknown
```

### 1.3 Kruskal's Algorithm — Memory and Data Flow

Kruskal processes edges in weight order, maintaining a **Union-Find** forest in memory:

```mermaid
sequenceDiagram
    participant Sort as Edge Sorter
    participant UF as Union-Find Forest
    participant MST as MST Edge List

    Note over Sort: O(m log m) sort pass<br/>edges[] in weight order
    loop For each edge e = (u,v) in sorted order
        Sort->>UF: find(u), find(v)
        UF-->>Sort: root_u, root_v
        alt root_u ≠ root_v (different components)
            Sort->>MST: add edge e
            Sort->>UF: union(root_u, root_v)
            Note over UF: Path compression + rank union<br/>amortized O(α(m)) per op
        else root_u = root_v (same component)
            Note over Sort: Skip — would form cycle<br/>(Cycle Rule implicit)
        end
    end
    Note over MST: n-1 edges collected → MST complete
```

**Union-Find memory layout** — path compression collapses chains in-place:

```mermaid
block-beta
    columns 5
    block:BEFORE["Before path_compress(5)"]:5
        A["parent[1]=1\n(root)"]
        B["parent[2]=1"]
        C["parent[3]=2"]
        D["parent[4]=3"]
        E["parent[5]=4"]
    end
    block:AFTER["After find(5) with path compression"]:5
        A2["parent[1]=1\n(root)"]
        B2["parent[2]=1"]
        C2["parent[3]=1\n← compressed"]
        D2["parent[4]=1\n← compressed"]
        E2["parent[5]=1\n← compressed"]
    end
```

The **inverse Ackermann function α(n)** represents how many times you can apply `log*` before reaching 1. For all practical n, α(n) ≤ 4.

### 1.4 Prim/Jarník — Priority Queue as Frontier Memory

Prim maintains a **priority queue** encoding the cheapest known connection from the growing tree T to each external vertex:

```mermaid
stateDiagram-v2
    [*] --> INIT: Insert all V\{r} with key=∞; r with key=0
    INIT --> EXTRACT: extractMin() → vertex u with min key
    EXTRACT --> GROW: Add u to tree T, add edge (parent[u], u) to MST
    GROW --> UPDATE: For each neighbor v of u
    UPDATE --> DECREASE: decreaseKey(v, w(u,v)) if w(u,v) < key[v]
    DECREASE --> CHECK: All V in T?
    CHECK --> DONE: Yes → MST complete
    CHECK --> EXTRACT: No → continue
    DONE --> [*]
```

**Fibonacci Heap vs Binary Heap** — the internal difference:

```mermaid
flowchart LR
    subgraph BINARY_HEAP["Binary Heap"]
        BH1["insert: O(log n)\nworst case"] 
        BH2["decreaseKey: O(log n)\nbubble-up sift"]
        BH3["extractMin: O(log n)\nheapify-down"]
        BH4["Total Prim: O(m log n)"]
    end
    subgraph FIB_HEAP["Fibonacci Heap"]
        FH1["insert: O(1)\namortized — lazy meld"]
        FH2["decreaseKey: O(1)\namortized — cut + add to root list"]
        FH3["extractMin: O(log H)\namortized — consolidate trees"]
        FH4["Total Prim: O(m + n log n)"]
    end
    BINARY_HEAP -->|"m decreaseKey calls\ndominate"| PERF_B["O(m log n)"]
    FIB_HEAP -->|"m O(1) decreaseKeys\n+ n O(log n) extractMins"| PERF_F["O(m + n log n)"]
```

### 1.5 Borůvka — Parallel Contraction Rounds

Borůvka's algorithm is the MST algorithm most amenable to **parallelism**:

```mermaid
flowchart TD
    G0["G₀ = original graph\nn nodes, m edges"]
    
    G0 --> R1["Round 1: Each node selects\ncheapest outgoing edge"]
    R1 --> C1["Contract selected edges\n(guaranteed to form forest\nsince distinct weights)"]
    C1 --> G1["G₁: ≤ n/2 super-nodes\n(each node paired with ≥1 other)"]
    
    G1 --> R2["Round 2: Each super-node selects\ncheapest outgoing edge"]
    R2 --> C2["Contract again"]
    C2 --> G2["G₂: ≤ n/4 super-nodes"]
    
    G2 --> DOTS["... log₂(n) rounds maximum ..."]
    DOTS --> SINGLE["Single super-node\n→ MST edges extracted"]
    
    Note1["Each round: O(m) work\nTotal: O(m log n) rounds\nParallel: O(log²n) with PRAM"]
    DOTS --- Note1
```

### 1.6 Fredman-Tarjan — Bounded-Frontier Trick

The breakthrough insight: limit Prim's heap size to K, restart when boundary exceeds threshold:

```mermaid
sequenceDiagram
    participant PQ as Fibonacci Heap
    participant T as Current Tree
    participant FOREST as Blue Forest

    Note over PQ,FOREST: Round r, threshold K = 2^(2^r)
    
    loop While unmarked vertices remain
        PQ->>T: Start Jarník/Prim from unmarked vertex
        loop Grow T
            T->>PQ: extractMin() — O(log K) cost
            PQ-->>T: vertex u with min key
            T->>T: Add u, update N(T) neighbors
            alt |N(T)| ≥ K or u was marked
                T->>FOREST: STOP — mark all T vertices
                Note over FOREST: Save cheapest external edge per node
            end
        end
    end
    
    Note over FOREST: Borůvka contraction step
    FOREST->>PQ: Contract forest → new graph
    Note over PQ: log*(n) rounds until single node
```

**Key complexity**: Each Prim phase has at most K insertions, so heap size ≤ K, so each extractMin costs O(log K). With K phases per round and the Borůvka contraction halving n, total rounds = O(log* n).

---

## 2. Graph Matchings — Augmenting Path Mechanics

### 2.1 Berge's Theorem — State Machine View

```mermaid
stateDiagram-v2
    [*] --> START_MATCHING: M = empty matching
    START_MATCHING --> SEARCH: Search for M-augmenting path P
    SEARCH --> AUGMENT: Found P → M := M △ P
    AUGMENT --> SEARCH: |M| increased by 1
    SEARCH --> DONE: No augmenting path exists
    DONE --> [*]: M is maximum matching
    
    note right of AUGMENT
        Symmetric difference M △ P
        toggles path edges:
        matched ↔ unmatched
        P has odd length (2k+1 edges)
        |M| gains exactly 1 edge
    end note
```

**Why augmenting paths work** — the invariant at the bit level:

```mermaid
flowchart LR
    subgraph PATH["Augmenting Path P (length 2k+1)"]
        direction LR
        O1["●\nopen"] ---U1["───\nunmatched"] --- M1["●\nmatched"] ---MM1["═══\nmatched"] --- M2["●\nmatched"] --- U2["───\nunmatched"] --- O2["●\nopen"]
    end
    subgraph TOGGLE["After M := M △ P"]
        direction LR
        O1b["●\nnow matched"] ---U1b["═══\nnow in M"] --- M1b["●\nstill matched"] ---MM1b["───\nnow out of M"] --- M2b["●\nstill matched"] --- U2b["═══\nnow in M"] --- O2b["●\nnow matched"]
    end
    PATH -->|"XOR edges"| TOGGLE
    Note["k+1 new M edges\nk removed M edges\nNet gain: +1"]
    TOGGLE --- Note
```

### 2.2 Bipartite Matching — Alternating BFS State

König's theorem proof gives an alternating BFS that simultaneously finds augmenting paths or constructs minimum vertex covers:

```mermaid
sequenceDiagram
    participant L as Left Vertices (L)
    participant R as Right Vertices (R)
    participant BFS as Alternating BFS Queue

    Note over L,BFS: X₀ ← all open (unmatched) vertices in L
    BFS->>L: Enqueue all open L vertices at level 0
    
    loop BFS expansion
        BFS->>R: X₂ᵢ₊₁ ← neighbors via NON-matching edges
        alt Open vertex v found in R
            BFS-->>L: AUGMENTING PATH FOUND
            Note over BFS: Trace back path, augment M
        end
        BFS->>L: X₂ᵢ₊₂ ← neighbors via MATCHING edges only
    end
    
    Note over L,R: If BFS exhausted without augmenting path:
    Note over L: Vertex cover C = (L \ X) ∪ (R ∩ X)
    Note over R: |C| = |M| → König's theorem proved
```

**Vertex Cover Construction from BFS layers**:

```mermaid
flowchart TD
    BFS_TREE["BFS Layer Structure"]
    
    BFS_TREE --> L_MARKED["L ∩ X: marked left vertices\n(reachable from open L via BFS)"]
    BFS_TREE --> R_MARKED["R ∩ X: marked right vertices\n(reachable via non-M edges)"]
    BFS_TREE --> L_UNMARKED["L \\ X: unmarked left vertices\n(blocked from BFS)"]
    BFS_TREE --> R_UNMARKED["R \\ X: unmarked right vertices\n(never reached)"]
    
    L_UNMARKED --> COVER["Vertex Cover C"]
    R_MARKED --> COVER
    
    COVER --> PROOF["Proof |C| = |M|:\n• Every R∩X vertex is matched\n  (else augmenting path found)\n• Every L\\X vertex is matched\n  (else it's open, so it's in X₀)\n• No M edge between L\\X and R∩X\n  (else L vertex would be in X)\n→ Bijection: C ↔ M edges"]
```

### 2.3 Blossom Algorithm — Handling Odd Cycles

General graphs have **blossoms** (odd cycles) that break the bipartite alternating BFS:

```mermaid
flowchart TD
    subgraph BLOSSOM_DETECTION["Odd Cycle Detection"]
        V1["Vertex v"] --> E1["Unmatched edge"]
        E1 --> V2["Vertex u (already in current alternating tree)"]
        V2 --> ODD["v and u at same 'parity' in tree\n→ BFS found ODD cycle = BLOSSOM"]
    end
    
    subgraph CONTRACTION["Blossom Contraction"]
        B1["Contract blossom B into single super-vertex b"]
        B2["Continue augmenting path search on contracted G/B"]
        B3["Found augmenting path in G/B → lift to path in G"]
        B1 --> B2 --> B3
    end
    
    subgraph LIFTING["Path Lifting through Blossom"]
        P1["Augmenting path enters blossom at some vertex"]
        P2["Route through blossom: alternating edges within B"]
        P3["Maintain alternating structure end-to-end"]
        P1 --> P2 --> P3
    end
    
    BLOSSOM_DETECTION --> CONTRACTION --> LIFTING
```

**Edmonds' Blossom complexity**: O(mn²) — each of n augmentations requires O(m) BFS with O(n) blossom contractions.

---

## 3. Metric Embeddings — Distortion Mechanics

### 3.1 Low-Stretch Spanning Trees

The fundamental question: can we approximate arbitrary metrics by tree metrics?

```mermaid
flowchart LR
    subgraph ORIGINAL["Original Metric (G, d)"]
        direction TB
        N1["n nodes\narbitrary distances"]
        N2["d(u,v) = shortest path\nin weighted graph G"]
    end
    
    subgraph TREE["Tree Metric (T, d_T)"]
        direction TB
        T1["Same n nodes\ntree structure only"]
        T2["d_T(u,v) = path length\nin spanning tree T"]
    end
    
    subgraph QUALITY["Embedding Quality"]
        Q1["Stretch(e) = d_T(u,v) / d(u,v)\nfor tree edge e = (u,v)"]
        Q2["Average stretch = Σ d(u,v)·stretch(e)\n/ Σ d(u,v)"]
        Q3["Goal: low average stretch\nfor all edge pairs"]
    end
    
    ORIGINAL -->|"embed into"| TREE
    TREE --> QUALITY
```

**Bartal's Probabilistic Tree Embedding**:

```mermaid
sequenceDiagram
    participant MET as Metric (G, d)
    participant ALG as Bartal's Algorithm
    participant TREE as Random Tree T

    ALG->>MET: Compute diameter Δ of metric
    Note over ALG: Pick random root r, random scale β ∈ [Δ/2, Δ]
    
    loop Recursive decomposition
        ALG->>MET: Find all vertices within distance β of r
        ALG->>TREE: Create cluster C(r) with these vertices
        ALG->>ALG: Cut metric at scale β/2
        Note over ALG: Recurse on each sub-cluster
        Note over ALG: Expected distortion per level: O(log n)
    end
    
    Note over TREE: Final tree T with edge weights
    Note over ALG: E[d_T(u,v)] ≤ O(log n · log Δ) · d(u,v)
    Note over ALG: Bartal (1996): O(log² n) distortion\nFakcharoenphol-Rao-Talwar (2003): O(log n) tight
```

### 3.2 Application: Oblivious Routing

```mermaid
flowchart TD
    subgraph NETWORK["Network G with demands"]
        SRC["Source s"] --> |"demand d(s,t)"| SINK["Sink t"]
    end
    
    subgraph TREE_ROUTING["Tree-based Oblivious Routing"]
        T1["Sample tree T from Bartal distribution"]
        T2["Route each (s,t) demand on unique s→t path in T"]
        T3["Map tree paths back to edges in G"]
        T1 --> T2 --> T3
    end
    
    subgraph GUARANTEE["Congestion Guarantee"]
        G1["True OPT routing: congestion C*"]
        G2["Tree routing congestion: O(log n) · C*"]
        G3["Proof: expected distortion O(log n)\n→ expected edge load O(log n) more"]
        G1 --> G2 --> G3
    end
    
    NETWORK --> TREE_ROUTING --> GUARANTEE
```

---

## 4. Dimension Reduction — JL Lemma Internals

### 4.1 Johnson-Lindenstrauss Transform

**Goal**: Embed n points from ℝᵈ into ℝᵏ (k ≪ d) while preserving pairwise distances.

```mermaid
flowchart LR
    subgraph HIGH_DIM["High-dim space ℝᵈ"]
        P1["Point x₁ ∈ ℝᵈ"]
        P2["Point x₂ ∈ ℝᵈ"]
        D1["‖x₁ - x₂‖₂ = D"]
    end
    
    subgraph TRANSFORM["Random Projection Matrix A"]
        A1["A ∈ ℝᵏˣᵈ, k = O(log n / ε²)"]
        A2["Each entry Aᵢⱼ ~ N(0, 1/k)"]
        A3["OR: Aᵢⱼ = ±1/√k with equal prob"]
    end
    
    subgraph LOW_DIM["Low-dim space ℝᵏ"]
        Q1["Ax₁ ∈ ℝᵏ"]
        Q2["Ax₂ ∈ ℝᵏ"]
        D2["‖Ax₁ - Ax₂‖₂ ∈ [(1-ε)D, (1+ε)D]"]
        D3["With probability ≥ 1 - 1/n²"]
    end
    
    HIGH_DIM --> TRANSFORM --> LOW_DIM
```

**Why random Gaussian matrices work** — moment calculation:

```mermaid
sequenceDiagram
    participant VEC as Vector y = Ax (projected)
    participant MOMENT as Moment Analysis
    participant CONC as Concentration Bound

    Note over VEC: y = Ax, want E[‖y‖²] = ‖x‖²
    VEC->>MOMENT: E[yᵢ²] = E[(∑ⱼ Aᵢⱼxⱼ)²]
    MOMENT->>MOMENT: = ∑ⱼ E[Aᵢⱼ²]·xⱼ² + cross terms
    MOMENT->>MOMENT: Cross terms = 0 (independence)
    MOMENT->>MOMENT: = ∑ⱼ (1/k)·xⱼ² = ‖x‖²/k
    MOMENT->>VEC: E[‖y‖²] = k · ‖x‖²/k = ‖x‖²  ✓

    VEC->>CONC: Use χ²(k) concentration
    CONC->>CONC: P[|‖y‖²/‖x‖² - 1| > ε] ≤ 2exp(-ε²k/4)
    CONC->>CONC: Set k = 4 log(n)/ε² for 1/n² failure prob
    CONC-->>VEC: Union bound over all C(n,2) pairs → all preserved
```

### 4.2 Subgaussian Variables — Memory of Tail Behavior

```mermaid
flowchart TD
    subgraph GAUSSIANS["Gaussian: X ~ N(0,σ²)"]
        G1["E[e^(tX)] = e^(σ²t²/2)"]
        G2["Tail: P[X > t] ≤ exp(-t²/2σ²)"]
        G3["MGF bounded by Gaussian MGF"]
    end
    
    subgraph SUBGAUSSIAN["Subgaussian: X with proxy σ"]
        S1["E[e^(tX)] ≤ e^(σ²t²/2) for all t"]
        S2["Same tail bound as Gaussian"]
        S3["Examples: Bounded r.v. [-a,a],\nRademacher ±1/√k,\nGaussian itself"]
    end
    
    subgraph APPLICATION["JL Proof via Subgaussian"]
        A1["Aᵢⱼ·xⱼ are independent subgaussian"]
        A2["Sum of independent subgaussian\nis subgaussian with σ²=Σσⱼ²"]
        A3["yᵢ = ∑ⱼ Aᵢⱼxⱼ is subgaussian"]
        A4["Concentration follows from subgaussian tail bound"]
        A1 --> A2 --> A3 --> A4
    end
    
    SUBGAUSSIAN -->|"yᵢ inherits\nsubgaussian tail"| APPLICATION
```

---

## 5. Streaming Algorithms — Sketching Over Data Streams

### 5.1 Frequency Moment Estimation

Process a stream of elements from [n] = {1,...,n}, maintain a small-space **sketch** to estimate Fₖ = Σᵢ aᵢᵏ (k-th frequency moment):

```mermaid
flowchart LR
    subgraph STREAM["Data Stream"]
        direction TB
        S1["element i₁"] --> S2["element i₂"] --> S3["..."] --> SN["element iₘ"]
    end
    
    subgraph SKETCH["AMS Sketch (Alon-Matias-Szegedy)"]
        H1["h: [n] → {±1} random hash function"]
        Z1["Z = Σₜ h(iₜ) — running sum"]
        EST["Estimator: Z² ≈ F₂ = Σᵢ aᵢ²"]
    end
    
    subgraph ANALYSIS["Why Z² Works"]
        E1["Z = Σᵢ aᵢ·h(i)"]
        E2["Z² = (Σᵢ aᵢ·h(i))²"]
        E3["E[Z²] = Σᵢ aᵢ² + 2·Σᵢ≠ⱼ aᵢaⱼ·E[h(i)h(j)]"]
        E4["E[h(i)h(j)] = 0 (4-wise independence)"]
        E5["E[Z²] = Σᵢ aᵢ² = F₂  ✓"]
        E1 --> E2 --> E3 --> E4 --> E5
    end
    
    STREAM --> SKETCH --> ANALYSIS
```

**Memory layout** of streaming sketch:

```mermaid
block-beta
    columns 4
    block:HASH["Hash Functions\n(seeded PRG)"]:1
        H1["h₁: [n]→±1\nO(log n) bits"]
        H2["h₂: [n]→±1\nO(log n) bits"]
        HT["...t copies..."]
    end
    block:COUNTERS["Running Sums"]:1
        Z1["Z₁ = 0\nupdated each element"]
        Z2["Z₂ = 0\nupdated each element"]
        ZT["...t counters..."]
    end
    block:ESTIMATE["Median-of-Means"]:1
        M1["Group t into s groups\nMedian of group means"]
        M2["Fail prob ≤ δ\nwith s = O(log 1/δ)"]
    end
    block:TOTAL["Total Space"]:1
        SP["O(ε⁻² log 1/δ · log n)\nbits for (ε,δ)-approx of F₂"]
    end
```

### 5.2 Stream as Vector Model — Turnstile Updates

```mermaid
sequenceDiagram
    participant STREAM as Stream (i, Δ)
    participant VEC as Frequency Vector f ∈ ℤⁿ
    participant SKETCH as Sketch Matrix S·f

    Note over STREAM: Element arrives: update (i, +1) or (i, -1)
    STREAM->>VEC: f[i] += Δ
    Note over VEC: Conceptual — too large to store (n entries)
    
    Note over SKETCH: S is random matrix: k×n, k ≪ n
    STREAM->>SKETCH: For each update (i,Δ): sketch[j] += S[j,i]·Δ
    Note over SKETCH: O(k) work per update, O(k) space total
    
    SKETCH-->>SKETCH: Recover S·f = approximation of f
    Note over SKETCH: ‖S·f - f‖ ≤ ε·‖f‖ with high probability
    Note over SKETCH: This is compressed sensing / sparse recovery
```

---

## 6. Graph Matchings II — Algebraic Algorithms

### 6.1 Schwartz-Zippel and Polynomial Identity Testing

Detecting a perfect matching reduces to **determinant computation** over a random field:

```mermaid
flowchart TD
    subgraph TUTTE_MATRIX["Tutte Matrix Construction"]
        TM1["For bipartite G=(L,R,E):\nTutte matrix T where\nT[i,j] = xᵢⱼ if (i,j)∈E, else 0"]
        TM2["Xᵢⱼ are distinct indeterminates"]
        TM3["Fact: G has perfect matching ⟺ det(T) ≢ 0"]
    end
    
    subgraph RANDOMIZATION["Randomized Detection (Schwartz-Zippel)"]
        R1["Substitute random values for xᵢⱼ from large field F"]
        R2["Compute det(T) numerically: O(n^ω) time"]
        R3["If det(T) ≠ 0: perfect matching exists (with high prob)"]
        R4["If det(T) = 0: likely no perfect matching"]
        R1 --> R2 --> R3
        R1 --> R2 --> R4
    end
    
    subgraph ERROR["Error Probability"]
        E1["By Schwartz-Zippel: P[det=0 | G has PM] ≤ deg(det)/|F|"]
        E2["deg(det) ≤ n (one variable per edge per row)"]
        E3["Choose |F| = n² → error ≤ 1/n"]
    end
    
    TUTTE_MATRIX --> RANDOMIZATION --> ERROR
```

### 6.2 Isolation Lemma — Finding a Unique Minimum Witness

```mermaid
sequenceDiagram
    participant G as Graph G
    participant ISO as Isolation Lemma
    participant MATCH as Perfect Matching Finder

    Note over G: Assign random weights w(e) ∈ [1, 2m] to edges
    G->>ISO: Compute minimum weight perfect matching weight W*
    
    Note over ISO: Isolation Lemma: P[unique min-weight PM] ≥ 1/2
    ISO-->>MATCH: With prob ≥ 1/2, exactly ONE PM has weight W*
    
    MATCH->>MATCH: For each edge e: remove e, check if min PM weight changes
    Note over MATCH: If min weight increases: e is in THE unique min PM
    Note over MATCH: O(n) determinant computations → O(n^(ω+1)) total
    
    MATCH-->>G: Return unique minimum perfect matching
```

---

## 7. All-Pairs Shortest Paths — Matrix Multiplication Bridge

### 7.1 Min-Plus Product (Tropical Semiring)

APSP reduces to repeated squaring in the **min-plus semiring**:

```mermaid
flowchart LR
    subgraph SEMIRING["Min-Plus Semiring (ℝ, min, +)"]
        OPS["Addition: a ⊕ b = min(a,b)\nMultiplication: a ⊗ b = a+b\nIdentity for ⊕: +∞\nIdentity for ⊗: 0"]
    end
    
    subgraph MATRIX_POWER["Repeated Squaring"]
        D0["D⁰[i,j] = {\n  0 if i=j\n  w(i,j) if edge\n  +∞ otherwise\n}"]
        D1["D¹ = D⁰ ⊗ D⁰\nD¹[i,j] = min over k of (D⁰[i,k] + D⁰[k,j])\n= shortest path using ≤2 edges"]
        DK["Dᵏ[i,j] = min over k-hop paths"]
        DONE["D^(log n) = exact APSP"]
        D0 --> D1 --> DK --> DONE
    end
    
    subgraph COMPLEXITY["Complexity Hierarchy"]
        C1["Naïve APSP: O(n³)"]
        C2["Repeated squaring: O(n³ log n)"]
        C3["With fast (min,+) multiply: open problem!"]
        C4["Integer weights W: O(n³/log n) or better"]
    end
    
    SEMIRING --> MATRIX_POWER
    MATRIX_POWER --> COMPLEXITY
```

### 7.2 APSP via Fast Matrix Multiplication (Undirected)

For undirected graphs with small integer weights, APSP can leverage standard matrix multiplication:

```mermaid
sequenceDiagram
    participant G as Graph G (integer weights)
    participant ADJ as Adjacency Matrix A
    participant MM as Matrix Multiplier (O(n^ω))
    participant APSP as APSP Result

    Note over G: n nodes, integer edge weights in [1,W]
    G->>ADJ: Build n×n adjacency matrix
    
    loop O(log n) iterations
        ADJ->>MM: Compute A^k (ordinary matrix power)
        MM-->>ADJ: Count paths of length exactly k
        Note over MM: A^k[i,j] = # paths of length k from i to j
    end
    
    Note over MM: Extract shortest path lengths from path counts
    Note over MM: Combines with "witnesses" for path reconstruction
    MM->>APSP: D[i,j] for all pairs
    
    Note over APSP: Total: O(n^ω · log² n · log W)
    Note over APSP: Beats O(n³) when ω < 3
```

---

## 8. The Ackermann Function and Union-Find — Inverse Tower

### 8.1 Ackermann Tower Internals

```mermaid
flowchart TD
    subgraph ACKERMANN["Ackermann Function A(m,n)"]
        A1["A(1,n) = 2n — doubles n\nA(2,n) = 2ⁿ·n — exponential\nA(3,n) = 2^(2^...(2^n))  n times — tower\nA(k,n) = A(k-1, A(k-1, ..., A(k-1, n)))"]
    end
    
    subgraph INVERSE["Inverse Ackermann α(n)"]
        AI1["α(n) = min{k : A(k,k) ≥ n}"]
        AI2["α(1) = 1, α(2) = 1, α(3) = 2"]
        AI3["α(2^65536) = 4 — for all practical n, α(n) ≤ 4"]
    end
    
    subgraph UNION_FIND["Why Union-Find is O(mα(m))"]
        UF1["Path compression: flatten find() paths\nEach find() amortized O(α(n)) time"]
        UF2["Union by rank: trees stay shallow\nDepth bounded by O(log n)"]
        UF3["Combined: m operations in O(mα(m)) time\nTarjan's 1975 proof via potential function"]
        UF1 --> UF3
        UF2 --> UF3
    end
    
    ACKERMANN --> INVERSE --> UNION_FIND
```

---

## 9. Concentration of Measure — Probabilistic Algorithm Foundations

### 9.1 Chernoff Bounds — Tail Decay Mechanism

```mermaid
flowchart LR
    subgraph SETUP["Setup: X = Σ Xᵢ, independent Bernoulli"]
        S1["Xᵢ ∈ {0,1}, P[Xᵢ=1] = pᵢ"]
        S2["μ = E[X] = Σpᵢ"]
    end
    
    subgraph MGF_TRICK["MGF + Markov"]
        M1["P[X ≥ (1+δ)μ] = P[e^(tX) ≥ e^(t(1+δ)μ)]"]
        M2["≤ E[e^(tX)] / e^(t(1+δ)μ)    (Markov)"]
        M3["= Πᵢ E[e^(tXᵢ)] / e^(t(1+δ)μ)    (independence)"]
        M4["E[e^(tXᵢ)] = 1 + pᵢ(eᵗ-1) ≤ exp(pᵢ(eᵗ-1))"]
        M5["Πᵢ E[e^(tXᵢ)] ≤ exp(μ(eᵗ-1))"]
        M6["Minimize over t: t = ln(1+δ)"]
        M7["P[X ≥ (1+δ)μ] ≤ (eᵟ/(1+δ)^(1+δ))^μ"]
        M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7
    end
    
    subgraph SIMPLIFIED["Simplified Bound"]
        SB1["P[X ≥ (1+δ)μ] ≤ exp(-δ²μ/3) for δ ≤ 1"]
        SB2["P[X ≥ cμ] ≤ (e/c)^(cμ) for c > e"]
    end
    
    SETUP --> MGF_TRICK --> SIMPLIFIED
```

### 9.2 Power of Two Choices — Load Balancing

```mermaid
sequenceDiagram
    participant BALLS as n Balls
    participant HASH as Two Random Bins
    participant BINS as m Bins

    loop For each ball
        BALLS->>HASH: Pick 2 random bins b₁, b₂
        HASH->>BINS: Query load[b₁] and load[b₂]
        BINS-->>HASH: Return counts
        HASH->>BINS: Place ball in min(load[b₁], load[b₂])
    end
    
    Note over BINS: One choice: max load = O(log n / log log n) w.h.p.
    Note over BINS: Two choices: max load = O(log log n) w.h.p.
    Note over BINS: Exponential improvement from one extra hash query!
    Note over BINS: Application: hash tables, load balancers, memory allocation
```

---

## 10. Summary — Algorithmic State Transitions Map

```mermaid
flowchart TD
    subgraph MST_LAND["MST Algorithms"]
        K["Kruskal:\nSort→UF-merge\nO(m log n)"]
        P["Prim:\nFibHeap+decreaseKey\nO(m+n log n)"]
        B["Borůvka:\nParallel contraction\nO(m log n)"]
        FT["Fredman-Tarjan:\nBounded heap+Borůvka\nO(m log* n)"]
        KKT["Karger-Klein-Tarjan:\nRandom sampling+cycle filter\nO(m) expected"]
    end
    
    subgraph MATCHING_LAND["Matching Algorithms"]
        BIOL["Bipartite:\nAlt-BFS\nO(mn)"]
        HK["Hopcroft-Karp:\nMulti-path BFS\nO(m√n)"]
        BLOSSOM["Blossom:\nOdd-cycle contraction\nO(mn²)"]
        ALG["Algebraic:\nTutte det + isolation\nO(n^ω)"]
    end
    
    subgraph EMBEDDING_LAND["Embeddings & Dimension"]
        BARTAL["Bartal trees:\nO(log² n) distortion"]
        JL["JL Lemma:\nO(log n/ε²) dims"]
        SK["Streaming sketches:\nO(ε⁻² log n) space"]
    end
    
    UF["Union-Find\nO(mα(m))"] --> K
    FIBH["Fibonacci Heap\nO(1) amortized ins/decKey"] --> P
    UF --> B
    FIBH --> FT
    B --> KKT
    P --> FT
    
    BIOL --> HK
    HK --> BLOSSOM
    BLOSSOM --> ALG
    
    BARTAL --> JL
    JL --> SK
```

---

*Source: CMU 15-850 Advanced Algorithms, Anupam Gupta (Fall 2020). All diagrams synthesize internal algorithmic mechanics — not reproduced text.*
