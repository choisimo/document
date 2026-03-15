# Algorithmic Thinking: A Problem-Based Introduction — Under the Hood

> **Source**: Daniel Zingaro, No Starch Press, 2021  
> **Focus**: Internal mechanics of hash tables, BFS queue state, DP memoization cache, heap sift operations, union-find path compression — the memory layouts and pointer mechanics beneath competitive programming patterns

---

## 1. Hash Table Internals: Chaining, Load Factor, and Collision Mechanics

### Memory Layout of a Chained Hash Table

A hash table maps a key → array index → linked list chain. Understanding the memory structure reveals why average O(1) is not worst-case O(1).

```mermaid
block-beta
  columns 1
  block:arr["Hash Array (size=8, backing array in heap)"]
    b0["[0] → NULL"]
    b1["[1] → node{key=9, val=V1} → node{key=1, val=V2} → NULL"]
    b2["[2] → node{key=10, val=V3} → NULL"]
    b3["[3] → NULL"]
    b4["[4] → NULL"]
    b5["[5] → node{key=13, val=V4} → NULL"]
    b6["[6] → NULL"]
    b7["[7] → node{key=7, val=V5} → NULL"]
  end
```

**Hash function internals (for integer keys)**:
```
index = key % table_size
```

For the "Unique Snowflakes" problem (6-element snowflakes), the book uses a composite hash:
```
hash = (s[0] + s[1] + s[2] + s[3] + s[4] + s[5]) % table_size
```

### Collision Resolution: Why Chaining Matters

```mermaid
sequenceDiagram
    participant Key as key = 17 (= 9 mod 8)
    participant Hash as hash(17) = 1
    participant Chain as bucket[1] linked list
    
    Key->>Hash: compute index
    Hash->>Chain: traverse chain for key 17
    Chain->>Chain: node{key=9}? no match → advance
    Chain->>Chain: node{key=17}? match found → return value
    Chain-->>Key: O(chain_length) actual traversal
```

**Load factor λ = n/m** (n = items, m = buckets):
- λ < 0.7: average chain length ≈ 1, effective O(1)
- λ = 1.0: average chain length = 1.0, collisions frequent
- λ > 2.0: chains degrade to linked list scan O(n)

```mermaid
flowchart LR
    Insert["Insert key k"] --> hash["compute index = k % m"]
    hash --> bucket["access array[index]"]
    bucket -->|"chain empty"| direct["set chain head = new node\nO(1)"]
    bucket -->|"chain non-empty"| traverse["traverse chain to find k\nor reach NULL\nO(λ) average"]
    traverse -->|"k found"| update["update value"]
    traverse -->|"k not found"| prepend["prepend new node to chain\nO(1) after traversal"]
```

### Why Pairwise Comparison O(n²) Fails vs Hash O(n)

The book's snowflake problem demonstrates this concretely:

```mermaid
flowchart TD
    subgraph N2["O(n² ) Naive — Pairwise"]
        for1["for i = 0..n-1"] --> for2["for j = i+1..n-1"]
        for2 --> compare["compare snowflake[i] with snowflake[j]\n6 element comparisons each"]
        compare --> total["Total: n*(n-1)/2 * 6 comparisons\n= ~O(n²) for n=100,000 → 10^10 ops"]
    end
    
    subgraph Hash["O(n) Hash Table"]
        iter["for each snowflake s"] --> h["compute hash(s) → index"]
        h --> check["check chain at index for s"]
        check -->|"match"| dup["DUPLICATE found"]
        check -->|"no match"| ins["insert s into chain"]
        ins --> next["next snowflake"]
        total2["Total: n * O(λ) ≈ O(n)"]
    end
```

---

## 2. Trees and Recursion: Call Stack Memory Layout

### Binary Tree Memory Representation

The book represents trees with a node struct array in C:

```mermaid
block-beta
  columns 3
  block:nodes["nodes[] array in heap memory"]:3
    n0["nodes[0]\n.left=1\n.right=2\n.candy=10"]
    n1["nodes[1]\n.left=3\n.right=4\n.candy=5"]
    n2["nodes[2]\n.left=-1\n.right=-1\n.candy=7"]
    n3["nodes[3]\n.left=-1\n.right=-1\n.candy=3"]
    n4["nodes[4]\n.left=-1\n.right=-1\n.candy=8"]
  end
```

**Corresponding tree structure:**
```
        0 (10)
       / \
      1(5) 2(7)
     / \
   3(3) 4(8)
```

### Recursive DFS Call Stack Growth

For the "Halloween Haul" problem, the recursive candy collection traversal has a call stack depth equal to tree height:

```mermaid
sequenceDiagram
    participant main as main()
    participant r0 as collect(node=0)
    participant r1 as collect(node=1)
    participant r3 as collect(node=3)
    
    main->>r0: call (stack depth=1)
    Note over r0: local: left=1, right=2
    r0->>r1: call (stack depth=2)
    Note over r1: local: left=3, right=4
    r1->>r3: call (stack depth=3)
    Note over r3: leaf node → return candy=3
    r3-->>r1: return 3 (stack pops)
    Note over r1: continue with right=4
    r1-->>r0: return 3+8+5=16 (stack pops)
    r0-->>main: return 16+7+10=33 (stack pops)
```

**Stack frame contents per call** (C-style):
- Return address pointer
- `node` parameter (int index)
- Local variables for left/right subtree totals
- Frame pointer

**Memory for tree height h**: O(h) stack frames × ~32 bytes each = O(h) total stack space.  
For balanced tree with n nodes: h = log₂(n), so O(log n) space.  
For degenerate (linked list) tree: h = n, so O(n) stack space → potential stack overflow.

---

## 3. Memoization and Dynamic Programming: Cache Architecture

### Recursive vs Memoized vs DP Memory Access Patterns

The "Burger Fervor" problem illustrates the transition:

**Problem**: Given time t and two burger sizes m, n — can we spend exactly t minutes eating burgers?

```mermaid
stateDiagram-v2
    [*] --> Recursion: solve(t)
    Recursion --> SubR1: solve(t - m)
    Recursion --> SubR2: solve(t - n)
    SubR1 --> SubR1a: solve(t - 2m)
    SubR1 --> SubR1b: solve(t - m - n)
    SubR2 --> SubR2a: solve(t - m - n)
    SubR2 --> SubR2b: solve(t - 2n)
    SubR1b --> OVERLAP: ← DUPLICATE COMPUTATION
    SubR2a --> OVERLAP
    
    OVERLAP --> Memoized: add cache[t] lookup
```

### Memoization Cache Layout

```mermaid
block-bitcoin
  columns 1
  block:cache["memo[] array — indexed by remaining time"]
    c0["memo[0] = SOLVED (base case: 0 minutes = achievable)"]
    c1["memo[1] = UNSOLVABLE"]
    c2["memo[2] = ..."]
    ct["memo[t] = -1 (uncomputed)\n→ compute → store result\n→ return cached on repeat visit"]
  end
```

**Key insight**: Each subproblem `solve(t)` computed exactly once. Total work: O(t) not O(2^t).

### Bottom-Up DP: Eliminating Recursion Entirely

Bottom-up DP fills the table iteratively, avoiding call stack overhead:

```mermaid
flowchart LR
    init["dp[0] = SOLVED\ndp[1..t] = UNSOLVABLE"]
    init --> loop["for i = 1 to t:"]
    loop --> tryM["if i >= m AND dp[i-m] = SOLVED\n→ dp[i] = SOLVED"]
    tryM --> tryN["if i >= n AND dp[i-n] = SOLVED\n→ dp[i] = SOLVED"]
    tryN --> next["i++"]
    next --> loop
    loop -->|"i > t"| done["dp[t] = answer"]
```

**Access pattern**: strictly left-to-right through the array. Cache-friendly — every access hits L1/L2 cache in sequence.

### Space Optimization: Rolling Window

For problems where only the last k values matter:

```mermaid
block-beta
  columns 3
  block:full["Full DP table O(n)"]:1
    row0["dp[0]"]
    row1["dp[1]"]
    rowdot["..."]
    rown["dp[n]"]
  end
  block:arrow:1
    arr["→ reduce to"]
  end
  block:opt["Rolling window O(k)"]:1
    cur["dp[i % k]"]
    prev["dp[(i-1) % k]"]
  end
```

The "Hockey Rivalry" problem demonstrates this: tracking only 2-3 prior states instead of the full sequence.

---

## 4. BFS Internals: Queue State Machine and Level Ordering

### BFS Queue as FIFO Level-Order Traverser

For the "Knight Chase" problem (chess knight on a board), BFS guarantees the **minimum number of moves** because it explores nodes by increasing distance from the source.

```mermaid
flowchart TD
    subgraph Queue["BFS Queue State — Knight at (0,0)"]
        q0["Initial: [(0,0,dist=0)]"]
        q1["After processing (0,0):\n[(1,2,d=1),(2,1,d=1),(-1,2,d=1),...]\n8 knight moves enqueued"]
        q2["After processing all d=1 nodes:\n[all d=2 positions...]"]
        qn["Terminate when target position dequeued"]
    end
    
    q0 --> q1 --> q2 --> qn
```

### Memory Layout of BFS Queue

```mermaid
block-beta
  columns 1
  block:queue["Queue implemented as array (circular buffer)"]
    head["head pointer → oldest unprocessed node"]
    tail["tail pointer → next insertion point"]
    data["data[(row,col,dist), ...]"]
    wrap["wraps around modulo queue_size"]
  end
```

**Why BFS not DFS for shortest path (unweighted)**:

```mermaid
flowchart LR
    subgraph BFS["BFS — Correct Min Distance"]
        bstart["start"] --> bn1["neighbor d=1"]
        bstart --> bn2["neighbor d=1"]
        bn1 --> bn3["neighbor d=2"]
        bn2 --> bn4["neighbor d=2 ← TARGET"]
        style bn4 fill:#27ae60,color:#fff
    end
    
    subgraph DFS["DFS — May Find Wrong Path"]
        dstart["start"] --> dn1["neighbor"]
        dn1 --> dn3["deep neighbor d=5"]
        dn3 --> target2["TARGET (found at depth 5)"]
        dstart --> dn2["neighbor"]
        dn2 --> target3["TARGET (actual min: depth 2 — MISSED)"]
        style target2 fill:#c0392b,color:#fff
        style target3 fill:#27ae60,color:#fff
    end
```

### BFS State Visited Array

Critical invariant: each node must be processed **at most once**. The `visited[row][col]` array prevents re-enqueueing:

```mermaid
sequenceDiagram
    participant Q as BFS Queue
    participant V as visited[row][col]
    participant G as Graph/Grid
    
    Q->>Q: dequeue node (r, c, dist)
    Q->>V: check visited[r][c]
    V-->>Q: already visited? SKIP
    Q->>V: mark visited[r][c] = true
    Q->>G: get all neighbors of (r, c)
    G-->>Q: list of (nr, nc) pairs
    loop for each neighbor
        Q->>V: check visited[nr][nc]
        V-->>Q: not visited → enqueue (nr, nc, dist+1)
    end
```

**Space**: O(V) for visited array + O(V) for queue = O(V) total, where V = number of vertices.

---

## 5. Dijkstra's Algorithm: Priority Queue Mechanics

### Min-Heap as Priority Queue

For weighted shortest paths (the "Mice Maze" problem), BFS's simple queue is replaced by a **min-heap** — always extracting the unvisited node with smallest known distance.

```mermaid
flowchart TD
    subgraph MinHeap["Min-Heap Memory Layout (array-based)"]
        root["heap[0] = (dist=0, node=start)\n← always minimum"]
        l1["heap[1] = (dist=3, node=A)"]
        r1["heap[2] = (dist=5, node=B)"]
        ll["heap[3] = (dist=7, node=C)"]
        lr["heap[4] = (dist=4, node=D)"]
    end
    
    root -->|"left child = 2*0+1"| l1
    root -->|"right child = 2*0+2"| r1
    l1 -->|"left child = 2*1+1"| ll
    l1 -->|"right child = 2*1+2"| lr
```

**Heap parent-child indexing (0-based)**:
- Parent of node i: `(i-1)/2`
- Left child of node i: `2*i+1`
- Right child of node i: `2*i+2`

### Sift-Up and Sift-Down Operations

```mermaid
sequenceDiagram
    participant H as Heap array
    participant New as New node (dist=2)
    
    Note over H: Insert (dist=2) at tail (position 4)
    H->>New: append to heap[4]
    New->>New: parent = heap[(4-1)/2] = heap[1] = (dist=3)
    New->>New: dist=2 < parent dist=3 → SWAP
    New->>New: now at position 1, parent = heap[0] = (dist=0)
    New->>New: dist=2 > parent dist=0 → STOP
    Note over H: Sift-up complete, heap valid
```

**Extract-min (used in Dijkstra)**:
1. Swap root (min) with last element
2. Remove last element (was root, now returned)
3. Sift-down: push new root down until heap property restored

```mermaid
flowchart TD
    ext["extract-min: swap heap[0] ↔ heap[n-1]\nremove heap[n-1] (return it)"] --> sift["sift-down heap[0]"]
    sift --> compare["compare with children heap[1], heap[2]"]
    compare -->|"heap[0] > smaller child"| swap["swap with smaller child"]
    swap --> sift
    compare -->|"heap[0] ≤ both children OR leaf"| done["heap property restored"]
```

### Dijkstra's Algorithm State Machine

```mermaid
stateDiagram-v2
    [*] --> Init: dist[start]=0, all others=INF\npush (0, start) to min-heap
    Init --> Extract: extract-min from heap → (d, u)
    Extract --> Stale: d > dist[u]? (stale entry)
    Stale --> Extract: skip, extract next
    Extract --> Relax: for each neighbor v of u\nif dist[u] + w(u,v) < dist[v]
    Relax --> Update: dist[v] = dist[u] + w(u,v)\npush (dist[v], v) to heap
    Update --> Extract: continue
    Extract --> Done: heap empty → all reachable nodes finalized
```

**Time complexity**: O((V + E) log V) with binary heap.  
**Space**: O(V) for dist[] + O(V+E) for heap entries (can have duplicates) = O(V+E).

---

## 6. Binary Search on Answer Space

### The Key Insight: Search Value, Not Index

Classical binary search finds a value in a sorted array. The book extends this to **searching the answer space** — binary searching over *possible answers* and testing feasibility.

```mermaid
flowchart LR
    subgraph Classical["Classical Binary Search"]
        arr["sorted array[0..n-1]"] -->|"target value"| bs["binary search\nO(log n)"]
        bs --> idx["found index"]
    end
    
    subgraph Parametric["Parametric Binary Search on Answer"]
        range["answer range [lo, hi]"] --> mid["mid = (lo + hi) / 2"]
        mid --> feasible["is_feasible(mid)?"]
        feasible -->|"YES"| shrink_hi["hi = mid, record mid as candidate"]
        feasible -->|"NO"| shrink_lo["lo = mid + 1"]
        shrink_hi --> mid
        shrink_lo --> mid
        mid -->|"lo == hi"| answer["optimal answer = lo"]
    end
```

**For the "River Jump" problem** (find minimum jump distance d such that a frog can cross removing ≤ k stones):

```mermaid
sequenceDiagram
    participant BS as Binary Search (d range: [0, river_length])
    participant Greedy as is_feasible(d): greedy check
    
    BS->>Greedy: is_feasible(d = mid)?
    Greedy->>Greedy: greedy: always jump to farthest reachable stone ≤ d away
    Greedy->>Greedy: count stones removed (those not reachable in any valid jump)
    Greedy-->>BS: stones_removed ≤ k? → feasible
    BS->>BS: if feasible: hi = mid (try smaller d)
    BS->>BS: if not feasible: lo = mid+1 (need larger d)
```

---

## 7. Heap and Segment Tree: Range Query Mechanics

### Max-Heap Insertion: Sift-Up Path

```mermaid
flowchart TD
    subgraph Before["Max-Heap before insert(15)"]
        r["20"]
        l1["17"] 
        r1["10"]
        l2["15 ← inserted here initially"] 
        r2["12"]
    end
    
    subgraph After["After sift-up"]
        r2_["20"]
        l1_["17"]
        r1_["15 ← moved up"]
        l2_["10 ← pushed down"]
        r2_2["12"]
    end
```

### Segment Tree: Internal Nodes as Aggregate Values

A segment tree stores precomputed aggregates (max, min, sum) for array ranges, enabling O(log n) range queries.

```mermaid
block-beta
  columns 7
  space
  space
  space
  n1["max(0..7)=15\n[node 1]"]
  space
  space
  space
  space
  n2["max(0..3)=12\n[node 2]"]
  space
  n3["max(4..7)=15\n[node 3]"]
  space
  space
  n4["max(0..1)=10\n[node 4]"]
  space
  n5["max(2..3)=12\n[node 5]"]
  space
  n6["max(4..5)=15\n[node 6]"]
  space
  n7["max(6..7)=8\n[node 7]"]
  n8["a[0]=7"]
  n9["a[1]=10"]
  n10["a[2]=9"]
  n11["a[3]=12"]
  n12["a[4]=15"]
  n13["a[5]=3"]
  n14["a[6]=8"]
  n15["a[7]=1"]
```

**Array representation of segment tree** (1-indexed):
- Root: index 1
- Left child of node i: `2*i`
- Right child of node i: `2*i+1`
- Array of size: `4 * n` (safe upper bound for n-element input)

### Range Query: Recursive Decomposition

```mermaid
sequenceDiagram
    participant Q as query(node, seg_lo, seg_hi, query_lo, query_hi)
    participant L as query(left_child, ...)
    participant R as query(right_child, ...)
    
    Q->>Q: if [seg_lo..seg_hi] outside [query_lo..query_hi] → return -INF
    Q->>Q: if [seg_lo..seg_hi] inside [query_lo..query_hi] → return node.max
    
    Note over Q: partial overlap: recurse both children
    Q->>L: query(2*node, seg_lo, mid, query_lo, query_hi)
    Q->>R: query(2*node+1, mid+1, seg_hi, query_lo, query_hi)
    L-->>Q: left_max
    R-->>Q: right_max
    Q->>Q: return max(left_max, right_max)
```

**Time**: O(log n) per query — at most 4 nodes at each level of the tree are "partially overlapping."

---

## 8. Union-Find: Path Compression and Union by Size

### Naive Union-Find vs Optimized

```mermaid
flowchart TD
    subgraph Naive["Naive Union-Find — O(n) find"]
        parent1["parent[] = [0,1,2,3,4]\n(each node points to itself initially)"]
        union1["union(0,1): parent[1] = 0"]
        union2["union(1,2): parent[2] = 1"]
        union3["union(2,3): parent[3] = 2"]
        find1["find(3): 3→2→1→0\nchain traversal O(n)"]
    end
    
    subgraph Optimized["Optimized — Path Compression + Union by Size"]
        parent2["After find(3) with path compression:\nparent[3]=0, parent[2]=0\n(all point directly to root)"]
        next_find["Next find(3): 3→0 O(1)"]
    end
    
    Naive --> Optimized
```

### Union by Size: Tree Height Control

```mermaid
flowchart LR
    subgraph NaiveUnion["Naive Union — can create deep trees"]
        a1["A (size=1)"] -->|"union(B, A)\n→ A.parent = B"| b1["B (size=1)"]
        b1 -->|"union(C, B)\n→ B.parent = C"| c1["C (size=1)"]
        c1 --> chain["chain of depth n"]
    end
    
    subgraph SizeUnion["Union by Size — always attach smaller under larger"]
        root_["root (size=4)"]
        child1["child1 (size=2)"]
        child2["child2 (size=1)"]
        child3["child3 (size=1)"]
        root_ --> child1
        root_ --> child2
        child1 --> child3
        height["max height = O(log n)"]
    end
```

### Path Compression Implementation

```mermaid
sequenceDiagram
    participant App as find(x=5)
    participant N5 as node 5 (parent=3)
    participant N3 as node 3 (parent=1)
    participant N1 as node 1 (parent=0)
    participant N0 as node 0 (root, parent=0)
    
    App->>N5: find(5)
    N5->>N3: find(parent[5]=3)
    N3->>N1: find(parent[3]=1)
    N1->>N0: find(parent[1]=0)
    N0-->>N1: return 0 (root)
    N1-->>N1: parent[1] = 0 ✓ (already)
    N1-->>N3: return 0
    N3-->>N3: parent[3] = 0 ← path compressed!
    N3-->>N5: return 0
    N5-->>N5: parent[5] = 0 ← path compressed!
    N5-->>App: return 0
    
    Note over App: next find(5) → O(1), find(3) → O(1)
```

**Combined complexity with both optimizations**:
- Amortized O(α(n)) per operation where α = inverse Ackermann function
- Practically O(1) — α(n) ≤ 4 for any realistic n (up to 2^65536)

### Union-Find for "Friends and Enemies" (Bipartite-Aware)

The book extends union-find with an "enemy" pointer per node — each node i has a virtual "enemy node" i+n. Friends are unified in the same component; enemies are unified across the boundary.

```mermaid
flowchart TD
    subgraph UF["Union-Find with 2n nodes (n friends + n enemies)"]
        f0["node 0 (friend)"] 
        f1["node 1 (friend)"]
        f2["node 2 (friend)"]
        e0["node n+0 (enemy of 0)"]
        e1["node n+1 (enemy of 1)"]
        e2["node n+2 (enemy of 2)"]
        
        f0 --- e1
        f1 --- e0
        f0 --- f1
    end
    
    note1["set_friends(0,1): union(0,1) AND union(n+0, n+1)"]
    note2["set_enemies(0,2): union(0, n+2) AND union(n+0, 2)"]
    note3["are_friends(0,1): find(0) == find(1)?"]
    note4["are_enemies(0,2): find(0) == find(n+2)?"]
```

---

## 9. Algorithm Selection Decision Map

```mermaid
flowchart TD
    problem["Problem Type?"] --> search{"Is graph unweighted?\nFind min steps?"}
    search -->|YES| bfs["BFS\nQueue-based\nO(V+E)"]
    search -->|NO| weighted{"Weighted graph\nmin path?"}
    weighted -->|YES| dijkstra["Dijkstra\nMin-heap\nO((V+E) log V)"]
    weighted -->|"negative weights"| bellman["Bellman-Ford\nO(VE)"]
    
    problem --> dup{"Duplicate/membership\ncheck?"}
    dup --> hash["Hash Table\nO(1) avg lookup\nO(n) space"]
    
    problem --> opt{"Optimal substructure?\nOverlapping subproblems?"}
    opt -->|YES| dp["Dynamic Programming\nBottom-up table\nO(states * transitions)"]
    
    problem --> range{"Range min/max query\non array?"}
    range --> seg["Segment Tree\nO(n) build\nO(log n) query/update"]
    
    problem --> connect{"Connectivity\nqueries?"}
    connect --> uf["Union-Find\nO(α(n)) per op\nnearly O(1)"]
    
    problem --> answer_range{"Monotone feasibility\nfunction?"}
    answer_range --> binary["Binary Search on Answer\nO(log(range) * feasibility_check)"]
```

---

## 10. Summary: Data Structure Space-Time Tradeoffs

| Data Structure | Query | Insert | Delete | Space | Best For |
|---------------|-------|--------|--------|-------|---------|
| Hash Table | O(1) avg | O(1) avg | O(1) avg | O(n) | Exact lookup, dedup |
| BFS Queue | O(V+E) | O(1) | O(1) | O(V) | Min hops, unweighted |
| Min-Heap | O(1) peek | O(log n) | O(log n) | O(n) | Priority scheduling |
| Segment Tree | O(log n) | O(log n) | O(log n) | O(n) | Range max/min/sum |
| Union-Find | O(α(n)) | O(α(n)) | N/A | O(n) | Connectivity, grouping |
| DP table | O(1) after build | O(states) build | N/A | O(states) | Optimal substructure |
| Binary Search | O(log n) | N/A | N/A | O(1) | Sorted/monotone spaces |

**Key insight from Zingaro's approach**: The data structure choice is the algorithm. The "Unique Snowflakes" problem is trivially O(n) with a hash table but O(n²) without it. The knight chess problem is trivially solvable with BFS but intractable with brute force recursion. Every competitive programming problem has a canonical data structure that unlocks the efficient solution — recognizing that pattern is the meta-skill the book teaches.
