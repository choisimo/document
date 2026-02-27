# Advanced Algorithms Internals: Dynamic Programming, Graph Theory & Complexity

> Under the Hood: How DP subproblem DAGs encode optimal substructure, how network flow algorithms saturate augmenting paths, how NP reductions prove hardness, how randomized algorithms guarantee probabilistic correctness — the exact recurrences, graph transformations, and computational models.

---

## 1. Dynamic Programming: Subproblem DAG and Memoization

DP works when problems have **optimal substructure** (optimal solution composed from optimal sub-solutions) and **overlapping subproblems** (same sub-problems solved multiple times).

```mermaid
flowchart TD
    subgraph "Fibonacci: Exponential → Linear"
        NAIVE["fib(5)\n├─ fib(4)\n│  ├─ fib(3)\n│  │  ├─ fib(2)\n│  │  │  ├─ fib(1)\n│  │  │  └─ fib(0)\n│  │  └─ fib(1)  ← REPEATED\n│  └─ fib(2)  ← REPEATED\n└─ fib(3)  ← REPEATED\nO(2^N) calls!"]
        MEMO["With memoization:\nfib(5) → fib(4) → fib(3) → fib(2) → fib(1)\nEach sub-problem solved ONCE\nO(N) time, O(N) space (or O(1) with rolling)"]
        NAIVE --> MEMO
    end
    subgraph "DP Subproblem DAG (Acyclic!)"
        D5["fib(5)"]
        D4["fib(4)"]
        D3["fib(3)"]
        D2["fib(2)"]
        D1["fib(1)"]
        D0["fib(0)"]
        D5 --> D4 --> D3 --> D2 --> D1
        D5 --> D3
        D4 --> D2
        D3 --> D1
        D2 --> D0
        D3 --> D0
    end
```

### Longest Common Subsequence: DP Table

```mermaid
flowchart LR
    subgraph "LCS('ABCDE', 'ACE')"
        TABLE["    ''  A  C  E\n''  [0, 0, 0, 0]\nA   [0, 1, 1, 1]\nB   [0, 1, 1, 1]\nC   [0, 1, 2, 2]\nD   [0, 1, 2, 2]\nE   [0, 1, 2, 3]\n\nRecurrence:\nif s1[i]==s2[j]: dp[i][j] = dp[i-1][j-1]+1\nelse: dp[i][j] = max(dp[i-1][j], dp[i][j-1])\nAnswer: dp[5][3] = 3 ('ACE')"]
    end
```

---

## 2. Knapsack Problem: Complete DP Analysis

0/1 Knapsack: n items, each with weight wᵢ and value vᵢ. Maximize total value with capacity W.

```mermaid
flowchart TD
    subgraph "DP Recurrence"
        REC["dp[i][w] = max value using first i items, capacity w\n  if wᵢ > w: dp[i][w] = dp[i-1][w]  (can't take item i)\n  else: dp[i][w] = max(dp[i-1][w],  dp[i-1][w-wᵢ] + vᵢ)\n  Time: O(NW), Space: O(W) (rolling array)"]
    end
    subgraph "Why 0/1 Knapsack is NP-Hard"
        COMPLEX["O(NW) is pseudo-polynomial:\n  W can be exponential in input bits\n  Input size = O(N log W + N log V)\n  O(NW) = O(N × 2^(log W)) exponential!\n  FPTAS exists: ε-approx in O(N²/ε)"]
    end
```

---

## 3. Network Flow: Ford-Fulkerson to Push-Relabel

```mermaid
sequenceDiagram
    participant FF as Ford-Fulkerson
    participant RG as Residual Graph
    participant PATH as Augmenting Path Finder

    Note over FF: Start: flow=0, residual=capacity everywhere
    loop While augmenting path exists
        FF->>PATH: Find s→t path in residual graph (BFS/DFS)
        PATH-->>FF: Path P with bottleneck b
        FF->>RG: Augment: reduce forward edges by b,\nincrease backward edges by b
        Note over FF: total_flow += b
    end
    Note over FF: No path found → max flow reached\n(min cut = max flow: Ford-Fulkerson theorem)
```

### Min Cut ↔ Max Flow Duality

```mermaid
flowchart LR
    subgraph "Max-Flow Min-Cut Theorem"
        CUT["Min S-T Cut:\n  Partition V into S (contains source)\n  and T (contains sink)\n  Cut capacity = sum of capacities\n  of edges crossing S→T\n  Min cut = bottleneck of the network"]
        FLOW["Max Flow:\n  Maximum flow from s to t\n  Limited by: most constrained\n  set of edges separating s from t\n  = min cut!"]
        EQUIV["Max flow value = Min cut capacity\n(Strong duality — not just inequality!)"]
        CUT --> EQUIV
        FLOW --> EQUIV
    end
```

### Push-Relabel Algorithm: O(V²√E)

```mermaid
flowchart TD
    subgraph "Push-Relabel Key Operations"
        PUSH["PUSH(u,v):\n  Send min(excess[u], residual[u,v]) units\n  excess[u] -= pushed\n  excess[v] += pushed\n  Update residual graph"]
        RELABEL["RELABEL(u):\n  u has excess but no admissible outgoing edge\n  (all neighbors have height ≥ height[u])\n  height[u] = 1 + min(height[v]) for valid (u,v)\n  (raise height to unblock flow)"]
        DISCHARGE["DISCHARGE(u):\n  PUSH while excess[u]>0 and admissible edge\n  If no admissible edge: RELABEL\n  Repeat until excess drained or height too high"]
        PUSH --> RELABEL --> DISCHARGE
    end
```

---

## 4. String Algorithms: KMP and Suffix Arrays

### KMP: Failure Function Mechanics

```mermaid
flowchart LR
    subgraph "KMP Pattern 'ABABC'"
        FAIL["Failure function (lps array):\n  A: 0 (no proper prefix=suffix)\n  B: 0\n  A: 1 ('A' is prefix=suffix of 'ABA')\n  B: 2 ('AB' is prefix=suffix of 'ABAB')\n  C: 0\nlps = [0,0,1,2,0]"]
        
        SEARCH["Mismatch at pattern[j], text[i]:\n  j=0: advance i only (skip text char)\n  j>0: j = lps[j-1]  (DON'T advance i!)\n  → Never re-scan text characters\n  → O(N+M) total"]
        FAIL --> SEARCH
    end
```

### Suffix Array: O(N log N) Construction

```mermaid
flowchart TD
    subgraph "Suffix Array for 'BANANA$'"
        ALL["All suffixes (with terminal $):\n  0: BANANA$\n  1: ANANA$\n  2: NANA$\n  3: ANA$\n  4: NA$\n  5: A$\n  6: $"]
        SORTED["Sorted suffixes (SA):\n  [6,5,3,1,0,4,2]\n  $\n  A$\n  ANA$\n  ANANA$\n  BANANA$\n  NA$\n  NANA$"]
        LCP["LCP array (between adjacent SA entries):\n  [0,0,1,3,0,0,2]\n  Used for: pattern search, longest repeated substring"]
        ALL --> SORTED --> LCP
    end
```

---

## 5. Computational Complexity: Reduction Mechanics

```mermaid
flowchart TD
    subgraph "NP Complexity Hierarchy"
        P["P: Solvable in polynomial time\n(sorting, shortest path, linear programming)"]
        NP["NP: Verifiable in polynomial time\n(given solution, can check quickly)\nIncludes: SAT, TSP, knapsack, clique"]
        NPC["NP-Complete:\n  In NP AND NP-Hard\n  Every NP problem reduces to it\n  in polynomial time\n  (Cook-Levin theorem: SAT is NP-C)"]
        NPH["NP-Hard:\n  At least as hard as any NP problem\n  May not be in NP\n  (Halting problem is NP-Hard but not NP)"]
        PSPACE["PSPACE: Solvable in polynomial space\n(includes NP; QBF is PSPACE-complete)"]
        P --> NP --> NPC
        NPC --> NPH
        NP --> PSPACE
    end
```

### Polynomial Reduction: 3-SAT → Independent Set

```mermaid
flowchart LR
    subgraph "Reduction Instance"
        CLAUSES["3-SAT formula:\n  (x₁ ∨ x₂ ∨ ¬x₃) ∧ (¬x₁ ∨ x₃ ∨ x₄)"]
        GADGETS["Convert to graph:\n  Clause gadget: triangle for each clause\n  (x₁)—(x₂)—(¬x₃)—(x₁)\n  (¬x₁)—(x₃)—(x₄)—(¬x₁)\n  Conflict edges: connect xᵢ ↔ ¬xᵢ across clauses\n  (a variable and its negation can't both be true)"]
        ISET["Independent Set of size k = k clauses\n  = satisfying assignment!\n  Pick one node per triangle = one literal per clause\n  No conflict edges = consistent assignment\n  3-SAT ≤_P Independent-Set (poly reduction)"]
        CLAUSES --> GADGETS --> ISET
    end
```

---

## 6. Randomized Algorithms: Correctness and Probability

### QuickSort Expected O(N log N)

```mermaid
flowchart TD
    subgraph "Randomized QuickSort Analysis"
        PIVOT["Random pivot: each of N elements equally likely"]
        SPLIT["Split: elements < pivot vs > pivot\nExpected: each has N/2 elements (balanced)"]
        RECUR["Recursion depth: expected O(log N)\n(Probability of bad split ≤ 1/2 per level)"]
        COMPARE["Count comparisons:\n  Each pair (i,j) compared iff one is pivot\n  when the other is still in the same subarray\n  E[comparisons] = Σᵢ<ⱼ 2/(j-i+1) = O(N log N)"]
        PIVOT --> SPLIT --> RECUR --> COMPARE
    end
```

### Bloom Filter: False Positive Analysis

```mermaid
flowchart TD
    subgraph "Bloom Filter with k hash functions, m bits, n elements"
        INSERT["Insert x:\n  Compute h₁(x), h₂(x), ..., hₖ(x)\n  Set bits at those positions"]
        QUERY["Query x:\n  Check ALL k bit positions\n  ALL 1 → MAYBE in set\n  ANY 0 → DEFINITELY not in set"]
        FPR["False Positive Rate:\n  P(fp) = (1 - e^(-kn/m))^k\n  Optimal k = (m/n) × ln(2)\n  With k optimal: P(fp) ≈ (0.6185)^(m/n)\n  At m/n=10: P(fp) ≈ 0.82% (1.2% with 7 hashes)"]
        INSERT --> QUERY --> FPR
    end
```

---

## 7. Amortized Analysis: Accounting Method

### Dynamic Array Push_Back

```mermaid
flowchart TD
    subgraph "Amortized O(1) Analysis"
        CHARGE["Actual cost:\n  Push without resize: O(1)\n  Push with resize (copy N elements): O(N)\n  Resizes happen at sizes: 1,2,4,8,...,2^k"]
        ACCOUNT["Accounting method:\n  Charge each push $3:\n    $1: actual insert cost\n    $2: saved for future copy\n  When copy triggered at size N:\n    N/2 elements have $2 saved = N credits\n    Exact cost to copy = N ✓"]
        TOTAL["Total charged for N pushes: 3N\nTotal actual cost: ≤ 3N (amortized O(1))"]
        CHARGE --> ACCOUNT --> TOTAL
    end
```

---

## 8. Approximation Algorithms: Vertex Cover and TSP

### 2-Approximation for Vertex Cover

```mermaid
flowchart LR
    subgraph "Greedy Matching Approximation"
        ALG["Algorithm:\n  While edges remain:\n    Pick any edge (u,v)\n    Add BOTH u and v to cover\n    Remove all edges incident to u or v\n  Return cover"]
        ANALYSIS["Analysis:\n  Let M = set of picked edges (a matching)\n  OPT must cover each edge in M\n  → OPT ≥ |M|\n  Our cover = 2|M| ≤ 2×OPT\n  → 2-approximation!"]
        ALG --> ANALYSIS
    end
```

### Christofides Algorithm: 1.5-Approximation for TSP (metric)

```mermaid
flowchart TD
    STEPS["1. MST T of graph (cost ≤ OPT)\n2. Find minimum perfect matching M\n   on odd-degree vertices of T\n   (cost ≤ OPT/2 for metric TSP)\n3. Combine T ∪ M: Eulerian multigraph\n4. Find Euler tour\n5. Shortcut repeated vertices (triangle inequality)\nTotal cost ≤ T + M ≤ OPT + OPT/2 = 1.5×OPT"]
```

---

## 9. Competitive Programming: Classic Problem Patterns

```mermaid
flowchart TD
    subgraph "Problem Pattern Recognition"
        PATTERNS["Optimize over intervals → Segment tree / Sparse table\nCount inversions → Merge sort / BIT\nShortest path with weights → Dijkstra / Bellman-Ford\nMaximum matching in bipartite → Hungarian / Hopcroft-Karp\nConnected components dynamically → DSU / Link-Cut Tree\nSubstring search → KMP / Aho-Corasick / Z-function\nNumber theory → Euler sieve / Fast exponentiation\nGame theory → Sprague-Grundy nim-values"]
    end
    subgraph "Binary Indexed Tree (Fenwick Tree)"
        BIT["Prefix sums with point updates:\n  bit[i] covers range [i - lowbit(i) + 1 .. i]\n  lowbit(i) = i & (-i)\n  Update: i → i + lowbit(i) → ...\n  Query: i → i - lowbit(i) → ...\n  O(log N) both operations\n  O(N) space (vs O(N log N) for segment tree)"]
    end
```

---

## 10. Computational Geometry: Convex Hull Internals

### Graham Scan: O(N log N)

```mermaid
sequenceDiagram
    participant ALGO as Graham Scan
    participant STACK as Stack

    Note over ALGO: 1. Find lowest point P0 (anchor)
    Note over ALGO: 2. Sort remaining points by polar angle from P0
    Note over ALGO: 3. Process sorted points:

    loop For each point P
        ALGO->>STACK: While top-2 stack points + P make right turn\n  (cross product ≤ 0 → clockwise)\n  pop top
        ALGO->>STACK: Push P
    end
    Note over STACK: Remaining stack = convex hull (CCW order)
```

**Cross product test**: Given points A, B, C — check if they make a left turn:
```
cross = (B.x-A.x)*(C.y-A.y) - (B.y-A.y)*(C.x-A.x)
cross > 0: left turn (CCW) — keep B
cross < 0: right turn (CW) — pop B
cross = 0: collinear — depends on requirements
```

---

## Summary: Algorithm Complexity Reference

| Problem | Algorithm | Time | Space |
|---|---|---|---|
| Sorting | Merge sort | O(N log N) | O(N) |
| Pattern search | KMP | O(N+M) | O(M) |
| Max flow | Push-Relabel | O(V²√E) | O(V+E) |
| MST | Prim (binary heap) | O(E log V) | O(V) |
| SSSP (non-neg) | Dijkstra (Fibonacci heap) | O(E + V log V) | O(V) |
| SSSP (neg weights) | Bellman-Ford | O(VE) | O(V) |
| LCS | DP table | O(NM) | O(min(N,M)) |
| Knapsack | DP (pseudo-poly) | O(NW) | O(W) |
| Convex hull | Graham scan | O(N log N) | O(N) |
| Vertex cover approx | Maximal matching | O(E) | O(V) |
