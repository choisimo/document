# Competitive Programming Internals — Under the Hood
## Antti Laaksonen's Competitive Programmer's Handbook · Internal Mechanics

> **Not a tutorial.** This document maps selected techniques from the cited handbook to memory structures, complexity transitions, DP table order, and bit operations.

---

> **Reading contract:** Source scope is the July 3, 2018 handbook draft named at the end. Judge throughput, recursion limits, integer widths, memory limits, and library costs vary by platform, so the tables are estimation heuristics, not acceptance guarantees. Before selecting an algorithm, bind the claim to the exact constraints, input distribution, numeric range, data-structure variant, and worst-case or expected bound. Selection is complete only when correctness and resource bounds fit the judge limits with margin; a timeout, overflow, excessive memory use, or violated invariant returns the choice to an unverified state.

## 1. Time Complexity — The Internal Machine Model

### 1.1 Complexity Estimation Table — What Actually Runs

Complexity classes constrain growth, while actual runtime depends on the judge hardware, language, constants, cache behavior, and time limit. The often-used ~10⁸ simple operations/second figure is only a rough sizing heuristic and must be calibrated against the target judge.

```mermaid
flowchart TD
    subgraph INPUT_SIZE["Input Size n"]
        N1["n ≤ 10"]
        N2["n ≤ 20"]
        N3["n ≤ 500"]
        N4["n ≤ 5000"]
        N5["n ≤ 10⁶"]
        N6["n ≤ 10⁷–10⁸"]
    end
    
    subgraph COMPLEXITY["Target Complexity"]
        C1["O(n!) — permutation generation"]
        C2["O(2ⁿ) — subset enumeration"]
        C3["O(n³) — 3-nested loops, matrix multiply"]
        C4["O(n²) — 2-nested loops"]
        C5["O(n log n) — sort, tree ops"]
        C6["O(n) — linear scan"]
    end
    
    N1 --> C1
    N2 --> C2
    N3 --> C3
    N4 --> C4
    N5 --> C5
    N6 --> C6
```

### 1.2 Maximum Subarray Sum — Three Algorithm Generations

The classic O(n³)→O(n²)→O(n) reduction demonstrates how **memory access patterns** change complexity:

```mermaid
sequenceDiagram
    participant ARRAY as Array a[0..n-1]
    participant ALG as Algorithm
    participant BEST as Best Sum

    Note over ALG: O(n³) — Triple loop
    loop All O(n²) pairs (i,j)
        loop Sum from i to j
            ALG->>ARRAY: Read a[k] for k in [i..j]
            ALG->>BEST: Compare sum(i..j) with best
        end
    end

    Note over ALG: O(n²) — Prefix sum trick
    Note over ARRAY: Precompute prefix[k] = sum(0..k-1) in one pass
    loop All O(n²) pairs (i,j)
        ALG->>ARRAY: sum(i..j) = prefix[j+1] - prefix[i]   ← O(1)!
        ALG->>BEST: Update best
    end

    Note over ALG: O(n) — Kadane's algorithm
    Note over ALG: State: max_ending_here, max_so_far
    loop Each element a[k]
        ALG->>ALG: max_ending_here = max(a[k], max_ending_here + a[k])
        ALG->>BEST: max_so_far = max(max_so_far, max_ending_here)
    end
```

**Kadane's state machine** — the invariant that makes O(n) work:

```mermaid
stateDiagram-v2
    [*] --> POSITIVE: max_ending_here > 0
    POSITIVE --> POSITIVE: a[k] added keeps sum positive
    POSITIVE --> RESET: a[k] makes sum ≤ 0
    RESET --> POSITIVE: a[k] > 0 — start fresh subarray here
    RESET --> RESET: a[k] ≤ 0 — continue discarding
    
    note right of POSITIVE
        max_ending_here = max(a[k], max_ending_here + a[k])
        If max_ending_here resets to a[k]:
        this element starts a new candidate subarray
    end note
```

---

## 2. Sorting Internals — Memory Movement Patterns

### 2.1 Merge Sort — Cache Line Behavior

Merge sort's recursive halving creates a **call stack** that determines memory access locality:

```mermaid
sequenceDiagram
    participant STACK as Call Stack
    participant MEM as Memory (array)
    participant MERGE as Merge Buffer

    STACK->>MEM: mergesort(0, n-1)
    STACK->>STACK: push frame: mergesort(0, n/2)
    STACK->>STACK: push frame: mergesort(0, n/4)
    Note over STACK: Recurse down to base cases (1-element)
    Note over STACK: Stack depth: O(log n)
    
    STACK->>MERGE: merge(0, n/4, n/2)
    MERGE->>MEM: Read L[0..n/4] and R[n/4..n/2] sequentially
    MERGE->>MEM: Write merged result to temp buffer
    Note over MERGE: O(n) work, O(n) temp memory
    Note over MERGE: Each merge pass touches 2 cache lines simultaneously
    
    STACK->>MERGE: merge(0, n/2, n-1) — final merge
    MERGE-->>MEM: Write final sorted array
```

**Sorting algorithm comparison** — internal operation counts:

```mermaid
flowchart LR
    subgraph COUNTING["Counting Sort O(n+k)"]
        CS1["Pass 1: count[a[i]]++\nfor each element\n→ populates count[] array"]
        CS2["Pass 2: compute prefix sums\ncount[i] += count[i-1]\n→ output positions"]
        CS3["Pass 3: place elements\noutput[count[a[i]]-1] = a[i]\n→ stable placement"]
        CS1 --> CS2 --> CS3
    end
    
    subgraph COMPARISON["Comparison-based O(n log n) lower bound"]
        CB1["Decision tree height ≥ log₂(n!) ≈ n log n\nEach comparison → one branch"]
        CB2["Any algorithm needs ≥ n log n comparisons\nin the worst case"]
        CB1 --> CB2
    end
```

### 2.2 Binary Search — Invariant Maintenance

```mermaid
stateDiagram-v2
    [*] --> SETUP: lo=0, hi=n-1
    SETUP --> LOOP: Invariant: answer in [lo..hi]
    LOOP --> CHECK: mid = (lo+hi)/2
    CHECK --> LEFT: a[mid] > target → hi=mid-1
    CHECK --> RIGHT: a[mid] < target → lo=mid+1
    CHECK --> FOUND: a[mid] == target
    LEFT --> LOOP: Invariant maintained: answer in [lo..mid-1]
    RIGHT --> LOOP: Invariant maintained: answer in [mid+1..hi]
    FOUND --> [*]: Return mid
    LOOP --> NOTFOUND: lo > hi
    NOTFOUND --> [*]: Return -1
    
    note right of LOOP
        Each iteration: search space halves
        [lo..hi] shrinks from n to 1 in log₂(n) steps
    end note
```

---

## 3. Data Structures — Memory Layout and Operation Costs

### 3.1 Dynamic Arrays — Amortized Doubling

```mermaid
flowchart TD
    subgraph GROWTH["Vector Doubling Strategy"]
        G1["capacity=1, size=0\n[_]"]
        G2["push_back: capacity=2\n[a|_]"]
        G3["push_back: capacity=4\n[a|b|_|_]"]
        G4["push_back: capacity=8\n[a|b|c|d|_|_|_|_]"]
        G1 --> G2 --> G3 --> G4
    end
    
    subgraph AMORTIZED["Amortized Analysis"]
        A1["Copy cost when doubling:\n1+2+4+...+n = 2n total copies\nfor n pushbacks"]
        A2["Amortized O(1) per pushback\n= O(n) total / n operations"]
        A3["Worst case single pushback: O(n)\n(when doubling triggers)"]
        A1 --> A2 --> A3
    end
```

### 3.2 Segment Tree — Internal Node Memory Layout

Segment trees store a complete binary tree in a flat array with the **1-indexed parent-child relationship**:

```mermaid
block-beta
    columns 8
    block:ROOT["Index 1\ntree[1]\nsum[0..7]"]:8
    end
    block:L2A["tree[2]\nsum[0..3]"]:4
    block:L2B["tree[3]\nsum[4..7]"]:4
    block:L3A["tree[4]\n[0..1]"]:2
    block:L3B["tree[5]\n[2..3]"]:2
    block:L3C["tree[6]\n[4..5]"]:2
    block:L3D["tree[7]\n[6..7]"]:2
    tree8["[8]\na[0]"]
    tree9["[9]\na[1]"]
    tree10["[10]\na[2]"]
    tree11["[11]\na[3]"]
    tree12["[12]\na[4]"]
    tree13["[13]\na[5]"]
    tree14["[14]\na[6]"]
    tree15["[15]\na[7]"]
```

**Navigation rules**: left child = `2k`, right child = `2k+1`, parent = `k/2`

```mermaid
sequenceDiagram
    participant QUERY as query(l, r)
    participant TREE as Segment Tree Nodes
    participant RESULT as Accumulated Sum

    Note over QUERY: query(3, 6) — sum of a[3..6]
    QUERY->>TREE: Check node 1 (covers 0..7): not within [3..6]
    TREE->>TREE: Recurse to node 2 (0..3) and node 3 (4..7)
    TREE->>TREE: Node 2 (0..3): partially overlaps [3..6]
    TREE->>TREE: Recurse to node 5 (2..3): partially overlaps
    TREE->>TREE: Node 11 (3..3): fully within [3..6] → ADD tree[11]
    TREE->>RESULT: += tree[11]
    TREE->>TREE: Node 3 (4..7): partially overlaps [3..6]
    TREE->>TREE: Node 6 (4..5): fully within [3..6] → ADD tree[6]
    TREE->>RESULT: += tree[6]
    TREE->>TREE: Node 7 (6..7): partially overlaps
    TREE->>TREE: Node 14 (6..6): fully within → ADD tree[14]
    TREE->>RESULT: += tree[14]
    RESULT-->>QUERY: Return sum = tree[11]+tree[6]+tree[14]
    Note over QUERY: O(log n) nodes visited
```

### 3.3 Binary Indexed Tree (Fenwick) — Bit Magic Navigation

The BIT uses LSB (least significant bit) to determine which range each index covers:

```mermaid
flowchart LR
    subgraph BIT_STRUCTURE["BIT Internal Structure"]
        B1["bit[1] = a[1]\nLSB(1)=1 → covers 1 element"]
        B2["bit[2] = a[1]+a[2]\nLSB(2)=2 → covers 2 elements"]
        B3["bit[3] = a[3]\nLSB(3)=1 → covers 1 element"]
        B4["bit[4] = a[1]+a[2]+a[3]+a[4]\nLSB(4)=4 → covers 4 elements"]
        B5["bit[5] = a[5]\nLSB(5)=1 → covers 1 element"]
        B6["bit[6] = a[5]+a[6]\nLSB(6)=2 → covers 2 elements"]
        B7["bit[7] = a[7]\nLSB(7)=1 → covers 1 element"]
        B8["bit[8] = a[1]+...+a[8]\nLSB(8)=8 → covers 8 elements"]
    end
    
    subgraph QUERY["sum(1..k) traversal"]
        Q1["k=7: add bit[7], k -= LSB(7)=1 → k=6"]
        Q2["k=6: add bit[6], k -= LSB(6)=2 → k=4"]
        Q3["k=4: add bit[4], k -= LSB(4)=4 → k=0"]
        Q4["Done in 3 steps = log₂(8) steps"]
        Q1 --> Q2 --> Q3 --> Q4
    end
    
    subgraph UPDATE["update(k, delta) traversal"]
        U1["k=3: update bit[3], k += LSB(3)=1 → k=4"]
        U2["k=4: update bit[4], k += LSB(4)=4 → k=8"]
        U3["k=8: update bit[8], k += LSB(8)=8 → k=16 > n"]
        U4["Done in 3 steps = log₂(8) steps"]
        U1 --> U2 --> U3 --> U4
    end
```

---

## 4. Dynamic Programming — Table Fill Mechanics

### 4.1 Coin Change — State Transition Graph

```mermaid
stateDiagram-v2
    [*] --> DP_INIT: dp[0] = 0, dp[x] = ∞ for x > 0
    DP_INIT --> FILL: For x = 1 to target
    FILL --> TRANSITION: For each coin c in coins
    TRANSITION --> CHECK: if x ≥ c
    CHECK --> UPDATE: dp[x] = min(dp[x], dp[x-c] + 1)
    UPDATE --> FILL: Continue to next x
    FILL --> DONE: dp[target] = min coins needed
    
    note right of TRANSITION
        dp[x] = min coins to make sum x
        Reachability: if dp[x-c] ≠ ∞
        then we can reach x via coin c
    end note
```

**Memory access pattern** — 1D DP fill for coin problem:

```mermaid
block-beta
    columns 7
    IDX["Index:"] IDX0["0"] IDX1["1"] IDX2["2"] IDX3["3"] IDX4["4"] IDX5["5"]
    INIT["Init:"] V0["0"] V1["∞"] V2["∞"] V3["∞"] V4["∞"] V5["∞"]
    COIN1["After c=1:"] W0["0"] W1["1"] W2["2"] W3["3"] W4["4"] W5["5"]
    COIN2["After c=3:"] X0["0"] X1["1"] X2["2"] X3["1"] X4["2"] X5["3"]
    COIN3["After c=4:"] Y0["0"] Y1["1"] Y2["2"] Y3["1"] Y4["1"] Y5["2"]
```

### 4.2 Longest Increasing Subsequence (LIS) — Two Approaches

```mermaid
flowchart LR
    subgraph O_N2["O(n²) DP approach"]
        DP1["dp[i] = length of LIS ending at i"]
        DP2["dp[i] = max{dp[j]+1 : j < i, a[j] < a[i]}"]
        DP3["For each i: scan all j < i — O(n) per element"]
        DP1 --> DP2 --> DP3
    end
    
    subgraph O_NlogN["O(n log n) patience sorting"]
        PS1["Maintain tails[] array:\ntails[k] = smallest tail of any\nIS of length k+1 seen so far"]
        PS2["For each a[i]:\nbinary search for first tail ≥ a[i]"]
        PS3["Replace that tail with a[i]\nOR append a[i] to extend LIS"]
        PS1 --> PS2 --> PS3
    end
    
    O_N2 --> MEMORY["O(n) memory for dp[]\nO(n²) total ops"]
    O_NlogN --> MEMORY2["O(n) memory for tails[]\nO(n log n) — binary search each step"]
```

**LIS patience sort state evolution** for `[3, 1, 4, 1, 5, 9, 2, 6]`:

```mermaid
sequenceDiagram
    participant A as Array element
    participant T as tails[]
    participant LEN as LIS length

    A->>T: 3 → tails=[3], LEN=1
    A->>T: 1 → replace tails[0]=3 with 1 → tails=[1], LEN=1
    A->>T: 4 → 4>all tails → tails=[1,4], LEN=2
    A->>T: 1 → replace tails[0]=1 with 1 → tails=[1,4], LEN=2
    A->>T: 5 → 5>all tails → tails=[1,4,5], LEN=3
    A->>T: 9 → 9>all tails → tails=[1,4,5,9], LEN=4
    A->>T: 2 → replace tails[1]=4 with 2 → tails=[1,2,5,9], LEN=4
    A->>T: 6 → replace tails[2]=5 with 6 → tails=[1,2,6,9], LEN=4
    Note over T,LEN: Final LIS length = 4 (e.g., [1,4,5,9] or [1,4,5,6])
```

### 4.3 Grid Path DP — 2D Memory Fill Order

```mermaid
flowchart TD
    subgraph GRID["Grid DP (count paths to bottom-right)"]
        INIT["dp[0][0] = 1 (start)"]
        FILL["Fill left-to-right, top-to-bottom"]
        RECUR["dp[i][j] = dp[i-1][j] + dp[i][j-1]\n(from above + from left)"]
        BOUND["dp[i][j] = 0 if wall/blocked"]
        INIT --> FILL --> RECUR --> BOUND
    end
    
    subgraph MEMORY_LAYOUT["Memory Access Pattern"]
        R0["Row 0: [1, 1, 1, 1, ...]"]
        R1["Row 1: [1, 2, 3, 4, ...]"]
        R2["Row 2: [1, 3, 6, 10, ...]"]
        R3["Row 3: [1, 4, 10, 20, ...]"]
        R0 --> R1 --> R2 --> R3
    end
    
    subgraph OPTIMIZATION["1D Memory Optimization"]
        OPT["Use single dp[n] array\nUpdate in-place left-to-right:\ndp[j] += dp[j-1] per row"]
        OPT2["From O(n²) space to O(n) space\ndp[j] from previous row + dp[j-1] from current row"]
        OPT --> OPT2
    end
```

### 4.4 Knapsack — 2D vs 1D Memory and Fill Direction

```mermaid
sequenceDiagram
    participant ITEMS as Items (weight, value)
    participant DP as dp[0..W] array
    participant OPT as Optimal Value

    Note over DP: 0/1 Knapsack: each item usable ONCE
    Note over DP: Fill RIGHT-TO-LEFT to avoid reuse
    
    loop For each item (w, v)
        loop j from W down to w
            DP->>DP: dp[j] = max(dp[j], dp[j-w] + v)
            Note over DP: Reading dp[j-w] from "previous item's row"
            Note over DP: because we fill right-to-left
        end
    end
    
    Note over DP: UNBOUNDED Knapsack: each item usable MANY times
    Note over DP: Fill LEFT-TO-RIGHT to allow reuse!
    loop For each item (w, v)
        loop j from w up to W
            DP->>DP: dp[j] = max(dp[j], dp[j-w] + v)
            Note over DP: Reading dp[j-w] from "current item's row"
            Note over DP: because we fill left-to-right
        end
    end
    
    DP-->>OPT: dp[W] = maximum value
```

**Critical difference**: direction of inner loop determines if items can be reused:

```mermaid
flowchart LR
    subgraph RIGHTLEFT["Right-to-left (0/1 knapsack)"]
        RL1["When computing dp[j]:\ndp[j-w] was NOT updated yet\nin this item's pass\n→ comes from previous item row\n→ item used at most once"]
    end
    
    subgraph LEFTRIGHT["Left-to-right (unbounded knapsack)"]
        LR1["When computing dp[j]:\ndp[j-w] was ALREADY updated\nin this item's pass\n→ item can be included again\n→ item usable multiple times"]
    end
```

---

## 5. Amortized Analysis — Two Pointers and Sliding Window

### 5.1 Two Pointers — Telescoping State

```mermaid
stateDiagram-v2
    [*] --> INIT: left=0, right=0, window_sum=0
    INIT --> EXPAND: Expand right pointer
    EXPAND --> CHECK: window_sum > target?
    CHECK --> SHRINK: Yes → shrink from left
    CHECK --> EXPAND: No → expand right
    SHRINK --> CHECK: window_sum -= a[left], left++
    EXPAND --> DONE: right == n
    DONE --> [*]: Found minimum window
    
    note right of EXPAND
        left and right each move
        at most n times total
        → O(n) total moves
        → O(n) amortized
    end note
```

### 5.2 Sliding Window Minimum — Monotone Deque

The **monotone deque** maintains the invariant that front always holds the current window minimum:

```mermaid
sequenceDiagram
    participant A as Array a[0..n-1]
    participant DEQUE as Deque (front=min, back=newest)
    participant OUT as Output minimums

    Note over DEQUE: Window size k=3, process a=[1,3,2,5,4]
    A->>DEQUE: i=0, a[0]=1 → deque: [0] (indices)
    A->>DEQUE: i=1, a[1]=3 → 3>a[0], append → deque: [0,1]
    A->>DEQUE: i=2, a[2]=2 → pop 1(a[1]=3>2), append → deque:[0,2]
    DEQUE->>OUT: Window [0..2]: min = a[deque.front=0] = 1
    
    A->>DEQUE: i=3, a[3]=5 → pop nothing, append → deque:[0,2,3]
    DEQUE->>DEQUE: Remove front 0 (outside window [1..3])
    DEQUE->>OUT: Window [1..3]: min = a[deque.front=2] = 2
    
    A->>DEQUE: i=4, a[4]=4 → pop 3(a[3]=5>4), append → deque:[2,4]
    DEQUE->>DEQUE: Remove front 2 (outside window [2..4])
    DEQUE->>OUT: Window [2..4]: min = a[deque.front=2] = 2
    
    Note over DEQUE: Each element enters/exits deque at most once → O(n) total
```

---

## 6. Bit Manipulation — Register-Level Operations

### 6.1 Set Representation in Integers

Every subset of {0..n-1} maps to one integer. Operations become single CPU instructions:

```mermaid
block-beta
    columns 9
    B8["bit 8"] B7["bit 7"] B6["bit 6"] B5["bit 5"] B4["bit 4"] B3["bit 3"] B2["bit 2"] B1["bit 1"] B0["bit 0"]
    S8["0"] S7["0"] S6["0"] S5["0"] S4["1"] S3["0"] S2["0"] S1["1"] S0["0"]
    L8[" "] L7[" "] L6[" "] L5[" "] L4["∈S"] L3[" "] L2[" "] L1["∈S"] L0[" "]
```

*Set {1, 4} represented as integer 18 = 2¹ + 2⁴*

```mermaid
flowchart LR
    subgraph OPERATIONS["Bit Set Operations (O(1) each)"]
        ADD["Add element x:\nS |= (1 << x)"]
        DEL["Delete element x:\nS &= ~(1 << x)"]
        MEMBER["Test x ∈ S:\n(S >> x) & 1"]
        UNION["Union A ∪ B:\nA | B"]
        INTER["Intersection A ∩ B:\nA & B"]
        DIFF["Difference A \\ B:\nA & ~B"]
        SIZE["Popcount |S|:\n__builtin_popcount(S)"]
    end
    
    subgraph SUBSET_ITER["Iterate subsets of S"]
        SI1["for b=(b-1)&S; b!=0; b=(b-1)&S"]
        SI2["Each iteration: b = next smaller subset of S"]
        SI3["(b-1) clears lowest set bit and fills below\n& S keeps only bits that were in S"]
        SI1 --> SI2 --> SI3
    end
```

### 6.2 Bitmask DP — Subset State Transitions

```mermaid
sequenceDiagram
    participant STATES as DP States (2^n integers)
    participant TRANS as Transition via bitmask
    participant RESULT as Optimal result

    Note over STATES: TSP-like: dp[mask][v] = shortest path\nvisiting exactly vertices in mask, ending at v
    
    Note over STATES: Base: dp[1<<v][v] = 0 for all v (start anywhere)
    
    loop For each mask (in increasing order of bits)
        loop For each endpoint v in mask
            loop For each neighbor u NOT in mask
                STATES->>TRANS: new_mask = mask | (1<<u)
                TRANS->>STATES: dp[new_mask][u] = min(dp[new_mask][u],\ndp[mask][v] + dist[v][u])
            end
        end
    end
    
    STATES-->>RESULT: min over v of dp[(1<<n)-1][v] + dist[v][start]
    Note over RESULT: Time: O(2^n · n²), Space: O(2^n · n)
```

---

## 7. Graph Algorithms — Internal Traversal State

### 7.1 DFS/BFS — Stack vs Queue Memory Dynamics

```mermaid
flowchart TD
    subgraph DFS_STACK["DFS via Explicit Stack"]
        DS1["Push start node"]
        DS2["Pop node u, mark visited"]
        DS3["Push all unvisited neighbors of u"]
        DS4["Stack holds 'frontier of paths not yet explored'"]
        DS1 --> DS2 --> DS3 --> DS4 --> DS2
    end
    
    subgraph BFS_QUEUE["BFS via FIFO Queue"]
        BQ1["Enqueue start node, mark distance[start]=0"]
        BQ2["Dequeue node u"]
        BQ3["For unvisited neighbor v:\nmark distance[v] = distance[u]+1, enqueue v"]
        BQ4["Queue holds 'wave frontier at current distance'"]
        BQ1 --> BQ2 --> BQ3 --> BQ4 --> BQ2
    end
    
    subgraph PROPERTY["Key Property Difference"]
        P1["DFS: explores one path fully before backtracking\nDepth-first = LIFO order"]
        P2["BFS: explores all nodes at distance d before d+1\nBreadth-first = FIFO order → shortest paths in unweighted graphs"]
    end
```

### 7.2 Dijkstra — Priority Queue State Evolution

```mermaid
sequenceDiagram
    participant PQ as Priority Queue (min-heap by dist)
    participant DIST as dist[] array
    participant VISITED as visited[] set

    Note over PQ: Initial: push (0, source), dist[source]=0, all others=∞
    
    loop While PQ not empty
        PQ->>DIST: Pop (d, u) — minimum distance node
        alt u already visited
            Note over PQ: Skip — stale entry in PQ
        else
            DIST->>VISITED: Mark u as visited
            loop For each edge (u, v, w)
                DIST->>DIST: if dist[u] + w < dist[v]
                DIST->>DIST: dist[v] = dist[u] + w
                DIST->>PQ: push (dist[v], v)
                Note over PQ: Lazy deletion: old (dist_old, v) still in PQ\nwill be ignored when popped (u already visited)
            end
        end
    end
    Note over DIST: All dist[] = shortest path distances from source
```

### 7.3 Bellman-Ford — Edge Relaxation Wave

```mermaid
flowchart TD
    subgraph BELLMAN_FORD["Bellman-Ford Rounds"]
        R0["Round 0: dist[source]=0, all others=∞"]
        R1["Round 1: Relax all m edges\n→ correct shortest paths using ≤1 edge"]
        R2["Round 2: Relax all m edges again\n→ correct shortest paths using ≤2 edges"]
        RK["Round k: correct for ≤k edge paths"]
        DONE["Round n-1: correct for all paths (if no negative cycle)\nif any improvement in Round n → NEGATIVE CYCLE exists"]
        R0 --> R1 --> R2 --> RK --> DONE
    end
    
    subgraph NEG_DETECT["Negative Cycle Detection"]
        ND1["Run n rounds instead of n-1"]
        ND2["If dist[v] still decreases in round n:\nnegative cycle reachable to v"]
        ND1 --> ND2
    end
```

---

## 8. String Algorithms — Pattern Matching Internals

### 8.1 Z-Algorithm — Z-Array Construction

The Z-array at index i stores the length of the longest substring starting at i that matches a prefix of the string:

```mermaid
sequenceDiagram
    participant S as String s
    participant Z as Z[] array
    participant WIN as [l, r] current Z-box

    Note over S,WIN: s = "aabxaa", compute Z[]
    Note over WIN: Z[0] = n by convention (whole string)
    
    loop i from 1 to n-1
        alt i > r (outside current Z-box)
            Z->>S: Naive compare: s[0..?] vs s[i..?]
            S-->>Z: Z[i] = matched length
            Z->>WIN: Update l=i, r=i+Z[i]-1 if Z[i]>0
        else i ≤ r (inside current Z-box)
            Z->>Z: k = i - l (position within current match)
            alt Z[k] < r - i + 1
                Z->>Z: Z[i] = Z[k] (bounded by box)
            else Z[k] >= r - i + 1
                Z->>S: Extend beyond r: compare s[r+1..] vs s[r-i+1..]
                S-->>Z: Z[i] = r-i+1 + extension
                Z->>WIN: Update l=i, r=i+Z[i]-1
            end
        end
    end
    Note over Z: Each character compared at most twice → O(n) total
```

### 8.2 Huffman Coding — Greedy Tree Construction

```mermaid
sequenceDiagram
    participant FREQ as Character Frequencies
    participant PQ as Min-Priority Queue (by freq)
    participant TREE as Huffman Tree

    FREQ->>PQ: Insert all characters as leaf nodes with their frequencies
    
    loop While PQ.size > 1
        PQ->>TREE: Pop two minimum-frequency nodes L and R
        TREE->>TREE: Create internal node with freq = L.freq + R.freq
        TREE->>TREE: Internal.left = L, Internal.right = R
        TREE->>PQ: Push internal node back to PQ
    end
    
    PQ->>TREE: Final node = root of Huffman tree
    TREE->>TREE: Traverse: left edge = '0', right edge = '1'
    TREE-->>FREQ: Assign codewords — frequently used chars get shorter codes
    
    Note over TREE: Optimal prefix-free code: total bit length minimized
    Note over TREE: Proof: exchange argument — swapping two sub-trees of\ndifferent depths never improves total cost
```

---

## 9. Range Queries — Sparse Table and Sqrt Decomposition

### 9.1 Sparse Table — Offline O(1) RMQ

```mermaid
flowchart TD
    subgraph PRECOMPUTE["Sparse Table Build O(n log n)"]
        SP1["sparse[i][j] = min of a[i..i+2^j-1]"]
        SP2["Base: sparse[i][0] = a[i] for all i"]
        SP3["Recurrence: sparse[i][j] = min(sparse[i][j-1],\nsparse[i+2^(j-1)][j-1])"]
        SP4["Fill j=1..log n, i=0..n-1"]
        SP2 --> SP3 --> SP4
    end
    
    subgraph QUERY["Range Min Query O(1)"]
        Q1["RMQ(l, r): compute k = floor(log₂(r-l+1))"]
        Q2["Answer = min(sparse[l][k], sparse[r-2^k+1][k])"]
        Q3["Two overlapping blocks of size 2^k covering [l..r]"]
        Q4["Overlap is OK for min — repeated elements don't affect result"]
        Q1 --> Q2 --> Q3 --> Q4
    end
    
    subgraph TRADEOFF["Space vs Update"]
        T1["O(n log n) space, O(1) query, NO updates allowed"]
        T2["vs Segment tree: O(n) space, O(log n) query, O(log n) update"]
    end
```

### 9.2 Mo's Algorithm — Query Reordering

Mo's algorithm answers offline range queries by reordering them to minimize total pointer movement:

```mermaid
sequenceDiagram
    participant QUERIES as Queries [l,r]
    participant SORT as Sort by (block(l), r)
    participant PTRS as [cur_l, cur_r] pointers
    participant ANSWER as Per-query answer

    QUERIES->>SORT: Sort queries: block size = √n
    Note over SORT: Primary: block(l) = l / √n
    Note over SORT: Secondary: r ascending in odd blocks, descending in even

    loop For each sorted query (l, r)
        loop Extend/shrink cur_r to r
            PTRS->>PTRS: add/remove a[cur_r] from current window
            Note over PTRS: cur_r pointer moves at most O(n) per block
        end
        loop Move cur_l to l
            PTRS->>PTRS: add/remove a[cur_l] from current window
            Note over PTRS: cur_l moves O(√n) per query
        end
        PTRS->>ANSWER: Record current window statistic
    end
    
    Note over PTRS: Total r moves: O(n √n) — r sweeps n per block, √n blocks
    Note over PTRS: Total l moves: O(q √n) — each query moves l ≤ √n
    Note over PTRS: Total: O((n+q)√n)
```

---

## 10. Number Theory — Modular Arithmetic Internals

### 10.1 Modular Exponentiation — Binary Method

```mermaid
sequenceDiagram
    participant EXP as exponent b (binary)
    participant RESULT as result = 1
    participant BASE as base = a

    Note over EXP: Compute a^b mod m
    Note over EXP: b in binary: b = b_{k}...b_1 b_0
    
    loop While b > 0
        alt b is odd (b & 1 == 1)
            RESULT->>RESULT: result = result * base % m
        end
        BASE->>BASE: base = base * base % m
        EXP->>EXP: b >>= 1 (right shift)
    end
    
    RESULT-->>EXP: Return result = a^b mod m
    Note over EXP: O(log b) multiplications instead of O(b)
    Note over EXP: Key: a^b = (a^(b/2))² if b even\na^b = a * a^(b-1) if b odd
```

### 10.2 Sieve of Eratosthenes — Cache Access Pattern

```mermaid
flowchart TD
    subgraph SIEVE["Sieve Internal State"]
        S1["is_prime[0..n] = true initially"]
        S2["Mark 0,1 as false"]
        S3["For p=2 to √n:\nif is_prime[p]:\nmark p², p²+p, p²+2p, ... as false"]
        S4["After sieve: is_prime[k] = true ⟺ k is prime"]
        S1 --> S2 --> S3 --> S4
    end
    
    subgraph CACHE["Cache Behavior"]
        C1["Inner loop: stride = p\nFor small p: stride small, cache-friendly"]
        C2["For large p (near √n): few multiples to mark\ntotal work = O(n log log n)"]
        C3["Harmonic series: n/2 + n/3 + n/5 + ... ≈ n·Σ(1/p) ≈ n ln ln n"]
        C1 --> C3
        C2 --> C3
    end
    
    subgraph SEGMENTED["Segmented Sieve for Large n"]
        SS1["Sieve primes up to √n first"]
        SS2["Process array in blocks of √n (fits in L1 cache)"]
        SS3["For each block: mark multiples of precomputed primes"]
        SS4["Cache-optimal: O(n log log n) but with better constant"]
        SS1 --> SS2 --> SS3 --> SS4
    end
```

---

## 11. Game Theory — Nim and Sprague-Grundy

### 11.1 Nim — XOR Invariant

```mermaid
flowchart TD
    subgraph NIM_STATE["Nim State Analysis"]
        N1["Piles: (a₁, a₂, ..., aₙ)"]
        N2["Nim-value = a₁ XOR a₂ XOR ... XOR aₙ"]
        N3["P-position (previous player wins) = Nim-value 0"]
        N4["N-position (next player wins) = Nim-value ≠ 0"]
        N1 --> N2 --> N3
        N1 --> N2 --> N4
    end
    
    subgraph PROOF["Why XOR works"]
        P1["Terminal: all piles 0 → XOR=0 → P-position ✓"]
        P2["From XOR≠0: always exists a move to XOR=0\n(take from pile where highest set bit of XOR is set)"]
        P3["From XOR=0: any move creates XOR≠0\n(must change at least one pile)"]
        P1 --> P2 --> P3
    end
    
    subgraph GRUNDY["Sprague-Grundy Generalization"]
        G1["Grundy(pos) = MEX of {Grundy(next_pos) : all moves}"]
        G2["MEX = Minimum Excludant = smallest non-negative integer not in set"]
        G3["Composite game: XOR of individual Grundy values"]
        G4["Grundy=0 → P-position (losing for mover)"]
        G1 --> G2 --> G3 --> G4
    end
```

---

## 12. Summary — Algorithm Selection Decision Tree

```mermaid
flowchart TD
    PROBLEM["Problem Input"] --> Q1{"Query type?"}
    
    Q1 -->|"Range sum/min/max\nonline updates"| SEG["Segment Tree\nO(log n) query+update"]
    Q1 -->|"Range sum\nonly additions"| BIT["Binary Indexed Tree (Fenwick)\nO(log n) simpler code"]
    Q1 -->|"Range min/max\nno updates"| SPARSE["Sparse Table\nO(1) query, O(n log n) build"]
    Q1 -->|"Many offline queries\nexpensive range stat"| MO["Mo's Algorithm\nO((n+q)√n)"]
    
    Q1 -->|"Shortest path\nnon-negative weights"| DIJ["Dijkstra\nO((V+E) log V)"]
    Q1 -->|"Shortest path\nnegative weights"| BELL["Bellman-Ford\nO(VE)"]
    Q1 -->|"All-pairs shortest"| FW["Floyd-Warshall\nO(V³)"]
    
    Q1 -->|"DP with subset state\nn ≤ 20"| BMASK["Bitmask DP\nO(2^n · n²)"]
    Q1 -->|"Counting/opt\noverlapping subproblems"| DP["Standard DP\nidentify state, recurrence, order"]
    
    Q1 -->|"Connectivity\nMST"| UF["Union-Find / Kruskal\nO(m log m)"]
    Q1 -->|"Matching"| HOPKARP["Hopcroft-Karp (bipartite)\nO(m√n)"]
    
    Q1 -->|"Max flow"| FF["Ford-Fulkerson / Dinic\nO(V²E) or O(E√V)"]
    Q1 -->|"String matching"| Z["Z-algorithm\nO(n+m)"]
```

---

*Source: Antti Laaksonen, "Competitive Programmer's Handbook" (Draft July 3, 2018). All diagrams synthesize internal algorithmic mechanics — data flows, memory layouts, state transitions — not reproduced text.*
