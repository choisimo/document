# 고급 알고리즘 내부: 동적 프로그래밍, 그래프 이론 및 복잡성

> 내부적으로: DP 하위 문제 DAG가 최적의 하위 구조를 인코딩하는 방법, 네트워크 흐름 알고리즘이 증가 경로를 포화시키는 방법, NP 감소가 경도를 증명하는 방법, 무작위 알고리즘이 확률적 정확성을 보장하는 방법(정확한 반복, 그래프 변환 및 계산 모델).

---

## 1. 동적 프로그래밍: 하위 문제 DAG 및 메모

DP는 문제에 **최적 하위 구조**(최적 하위 솔루션으로 구성된 최적 솔루션) 및 **겹치는 하위 문제**(동일 하위 문제가 여러 번 해결됨)가 있을 때 작동합니다.

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

### 가장 긴 공통 부분 수열: DP 테이블

```mermaid
flowchart LR
    subgraph "LCS('ABCDE', 'ACE')"
        TABLE["    ''  A  C  E\n''  [0, 0, 0, 0]\nA   [0, 1, 1, 1]\nB   [0, 1, 1, 1]\nC   [0, 1, 2, 2]\nD   [0, 1, 2, 2]\nE   [0, 1, 2, 3]\n\nRecurrence:\nif s1[i]==s2[j]: dp[i][j] = dp[i-1][j-1]+1\nelse: dp[i][j] = max(dp[i-1][j], dp[i][j-1])\nAnswer: dp[5][3] = 3 ('ACE')"]
    end
```

---

## 2. 배낭 문제: 완전한 DP 분석

0/1 배낭: n개 항목, 각각 무게 wᵢ 및 가치 vᵢ. 용량 W로 총 가치를 극대화합니다.

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

## 3. 네트워크 흐름: Ford-Fulkerson에서 Push-Relabel까지

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

### 최소 컷 ⇔ 최대 흐름 이중성

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

### 푸시 재레이블 알고리즘: O(V²√E)

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

## 4. 문자열 알고리즘: KMP 및 접미사 배열

### KMP: 실패 기능 메커니즘

```mermaid
flowchart LR
    subgraph "KMP Pattern 'ABABC'"
        FAIL["Failure function (lps array):\n  A: 0 (no proper prefix=suffix)\n  B: 0\n  A: 1 ('A' is prefix=suffix of 'ABA')\n  B: 2 ('AB' is prefix=suffix of 'ABAB')\n  C: 0\nlps = [0,0,1,2,0]"]
        
        SEARCH["Mismatch at pattern[j], text[i]:\n  j=0: advance i only (skip text char)\n  j>0: j = lps[j-1]  (DON'T advance i!)\n  → Never re-scan text characters\n  → O(N+M) total"]
        FAIL --> SEARCH
    end
```

### 접미사 배열: O(N log N) 구성

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

## 5. 계산 복잡성: 축소 메커니즘

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

### 다항식 축소: 3-SAT → 독립 집합

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

## 6. 무작위 알고리즘: 정확성과 확률

### QuickSort 예상 O(N log N)

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

### 블룸 필터: 거짓 긍정 분석

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

## 7. 상각분석: 회계처리 방법

### 동적 어레이 푸시백

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

## 8. 근사 알고리즘: 정점 커버 및 TSP

### 2-정점 커버에 대한 근사

```mermaid
flowchart LR
    subgraph "Greedy Matching Approximation"
        ALG["Algorithm:\n  While edges remain:\n    Pick any edge (u,v)\n    Add BOTH u and v to cover\n    Remove all edges incident to u or v\n  Return cover"]
        ANALYSIS["Analysis:\n  Let M = set of picked edges (a matching)\n  OPT must cover each edge in M\n  → OPT ≥ |M|\n  Our cover = 2|M| ≤ 2×OPT\n  → 2-approximation!"]
        ALG --> ANALYSIS
    end
```

### Christofides 알고리즘: 1.5-TSP에 대한 근사치(미터법)

```mermaid
flowchart TD
    STEPS["1. MST T of graph (cost ≤ OPT)\n2. Find minimum perfect matching M\n   on odd-degree vertices of T\n   (cost ≤ OPT/2 for metric TSP)\n3. Combine T ∪ M: Eulerian multigraph\n4. Find Euler tour\n5. Shortcut repeated vertices (triangle inequality)\nTotal cost ≤ T + M ≤ OPT + OPT/2 = 1.5×OPT"]
```

---

## 9. 경쟁 프로그래밍: 고전적인 문제 패턴

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

## 10. 계산 기하학: 볼록 껍질 내부

### 그레이엄 스캔: O(N log N)

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

**외적 테스트**: 주어진 A, B, C 지점에서 좌회전하는지 확인합니다.
```
cross = (B.x-A.x)*(C.y-A.y) - (B.y-A.y)*(C.x-A.x)
cross > 0: left turn (CCW) — keep B
cross < 0: right turn (CW) — pop B
cross = 0: collinear — depends on requirements
```

---

## 요약: 알고리즘 복잡성 참조

| 문제 | 알고리즘 | 시간 | 공간 |
|---|---|---|---|
| 정렬 | 병합 정렬 | O(N 로그 N) | 오(엔) |
| 패턴 검색 | KMP | O(N+M) | 오(남) |
| 최대 유량 | 푸시 라벨 재지정 | O(V²√E) | O(V+E) |
| MST | 프림(바이너리 힙) | O(E로그V) | 오(V) |
| SSSP(음수가 아님) | 다익스트라(피보나치 힙) | O(E + V 로그 V) | 오(V) |
| SSSP(음의 가중치) | 벨먼-포드 | O(VE) | 오(V) |
| LCS | DP 테이블 | 오(NM) | O(최소(N,M)) |
| 배낭 | DP(유사폴리) | 오(북서) | 오(W) |
| 볼록 껍질 | 그레이엄 스캔 | O(N 로그 N) | 오(엔) |
| 정점 커버 약 | 최대 매칭 | O(E) | 오(V) |
