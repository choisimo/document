# Data Structures Internals: Under the Hood

> Source synthesis: Data structures reference books (comp 180–186, 189, 191–192, 213, 241–243) covering memory layout, pointer mechanics, cache behavior, amortized complexity, and algorithmic invariants for all major data structures.

## Assumptions used in this reference

Complexity statements assume the invariant named in each section and a stated cost model. Byte counts, cache misses, growth factors, node capacities, and implementation names are examples, not consequences of Big-O notation. When selecting a structure, record operation mix, maximum input size, ordering/concurrency requirements, allocator/layout, and the benchmark or proof that satisfies the requirement.

---

## 1. Dynamic Array — Amortized Growth Mechanics

```mermaid
flowchart TD
    subgraph Dynamic Array (std::vector / ArrayList)
        Initial["Initial: capacity=1, size=0\n[_]"]
        Push1["push(A): size=1, cap=1\n[A]"]
        Push2["push(B): size>cap\n→ allocate cap×2=2, copy A\n[A, B] cap=2"]
        Push3["push(C): size>cap\n→ allocate cap×2=4, copy A,B\n[A, B, C, _] cap=4"]
        Push4["push(D):\n[A, B, C, D] cap=4, no alloc"]
        Push5["push(E): size>cap\n→ allocate cap×2=8, copy A,B,C,D\n[A,B,C,D,E,_,_,_] cap=8"]
    end

    subgraph Amortized Cost Analysis
        Total["n pushes total cost:\n- copies triggered: 1+2+4+...+n/2 = n-1 (geometric series)\n- each element copied ≤ log₂n times\nTotal work = O(n) → O(1) amortized per push"]
        Memory["Memory layout:\ncontiguous heap allocation\ncache-line friendly (64B = 16 ints)\niteraton = sequential cache hits"]
    end
```

---

## 2. Linked List — Memory and Pointer Anatomy

The doubling trace is one dynamic-array policy. `std::vector` does not standardize its growth factor, and common `ArrayList` implementations use a different factor. Geometric growth by any constant greater than one supports amortized `O(1)` append, while copy/move cost and iterator invalidation remain implementation- and element-type-specific.

```mermaid
flowchart LR
    subgraph Singly Linked List Node Layout
        Node1["Node@0x1000:\n[data: int 'A' | next: 0x1040]"]
        Node2["Node@0x1040:\n[data: int 'B' | next: 0x10A0]"]
        Node3["Node@0x10A0:\n[data: int 'C' | next: NULL]"]
        Head["head → 0x1000"]
        Node1 --> Node2 --> Node3
    end

    subgraph Cache Behavior
        CacheLine["CPU cache line: 64 bytes\nArray traversal: 1 cache miss / 16 ints\nLinked list traversal: 1 cache miss / node\n(pointer chasing: unpredictable addresses)\n→ 10–100× slower for traversal vs array"]
        Prefetch["Hardware prefetcher:\ndetects sequential access → prefetch\nLinked list: random pointer → no prefetch benefit"]
    end

    subgraph XOR Linked List (memory saving)
        XOR["Each node stores: prev XOR next\nTraversal: next = prev XOR node.both\nSave 1 pointer per node (8 bytes)\nbut: no arbitrary pointer arithmetic → rarely used"]
    end
```

---

## 3. Hash Table — Collision Resolution & Probing

“One cache miss per node” and “10–100× slower” are workload hypotheses. Pool allocation, node packing, hardware prefetch, element size, traversal work, and cache state can change the result; use a benchmark with the same allocator and data distribution before choosing on this basis.

```mermaid
flowchart TD
    subgraph Chaining (Java HashMap)
        HT["Array of buckets (capacity=16, load_factor=0.75)\nbucket[i] = linked list (or tree) of entries\nhash(key) = key.hashCode() ^ (key.hashCode() >>> 16)\nbucket_index = hash & (capacity-1)"]
        Chain["Bucket 3: [Entry{k1,v1}] → [Entry{k2,v2}] → null\n(same hash bucket → chain grows)"]
        Tree["Treeify threshold=8:\nchain length ≥ 8 → convert to Red-Black Tree\ntable.length must be ≥ 64\n→ O(n) chain → O(log n) tree lookup"]
        Resize["Resize at size > capacity × 0.75:\nnewCapacity = 2 × capacity\nrehash all entries (OR with new bit)\nbuckets either stay or move by exactly oldCapacity"]
    end

    subgraph Open Addressing (Linear Probing)
        LP["Lookup(key):\ni = hash(key) % capacity\nwhile table[i] ≠ null and table[i].key ≠ key:\n  i = (i + 1) % capacity  ← linear probe\nDelete: use TOMBSTONE marker\n(can't just null: breaks probe chain)"]
        Cluster["Primary clustering:\nconsecutive filled slots form clusters\n→ probe length grows with load\n→ cache-friendly BUT clusters degrade O(n) worst case"]
        Robin["Robin Hood hashing:\ntrack probe distance (PSL) per entry\non insert: if new PSL > existing PSL → displace existing\n→ max probe length bounded: variance reduced"]
    end

    subgraph Double Hashing
        DH["i = (hash1(key) + j × hash2(key)) % capacity\nhash2(key) = R - (key % R), R = prime < capacity\n→ eliminates primary clustering\n→ but non-sequential memory access (cache miss)"]
    end
```

---

## 4. Binary Search Tree — Structural Properties

```mermaid
flowchart TD
    subgraph BST Invariant
        Root2["Root: 50"]
        L1["30"]
        R1["70"]
        L2["20"]
        L3["40"]
        R2["60"]
        R3["80"]
        Root2 --> L1 & R1
        L1 --> L2 & L3
        R1 --> R2 & R3
        Note1["Invariant:\n∀ node n:\n  left subtree keys < n.key\n  right subtree keys > n.key\nSearch/insert/delete: O(h)\nh = O(n) unbalanced, O(log n) balanced"]
    end

    subgraph BST Delete — 3 Cases
        Case1["Case 1: no children\nremove leaf, set parent.child = null"]
        Case2["Case 2: one child\nbypass node: parent.child = node.child"]
        Case3["Case 3: two children\nfind in-order successor (min of right subtree)\nswap key/value into node\ndelete successor (now Case 1 or 2)"]
    end
```

---

## 5. Red-Black Tree — Rotation & Rebalancing

```mermaid
stateDiagram-v2
    [*] --> Insert_RBT
    Insert_RBT --> Case1_RB : uncle is RED
    Case1_RB --> RecolorAndMoveUp : recolor parent+uncle black, grandparent red, move up
    
    Insert_RBT --> Case2_RB : uncle is BLACK, triangle shape
    Case2_RB --> Rotate_to_Case3 : rotate parent in opposite direction → straighten
    
    Insert_RBT --> Case3_RB : uncle is BLACK, line shape
    Case3_RB --> Rotate_and_Recolor : rotate grandparent, swap colors of parent+grandparent
    
    RecolorAndMoveUp --> [*] : root reached or no violation
    Rotate_and_Recolor --> [*]
```

```mermaid
flowchart LR
    subgraph RB-Tree Properties
        P1["1. Every node is RED or BLACK"]
        P2["2. Root is BLACK"]
        P3["3. Every leaf (NIL) is BLACK"]
        P4["4. RED node has only BLACK children (no two reds in a row)"]
        P5["5. All paths from node to leaves: same BLACK depth (black-height)"]
        Guarantee["Guarantee:\nblack-height = bh\n→ height ≤ 2×log₂(n+1)\n→ O(log n) search/insert/delete"]
    end

    subgraph Right Rotation at node x
        Before["    x\n   / \\\n  y   C\n / \\\nA   B"]
        After["  y\n / \\\nA   x\n   / \\\n  B   C\nO(1) pointer updates: 3 nodes affected"]
    end
    P1 & P2 & P3 & P4 & P5 --> Guarantee
```

---

## 6. AVL Tree — Balance Factor & Rotations

```mermaid
flowchart TD
    subgraph AVL Balance Factor
        BF["balance_factor(node) = height(left) - height(right)\nAVL invariant: |BF| ≤ 1 for every node"]
        LL["LL Case (BF=+2, left child BF≥0):\nSingle right rotation at node\nO(1), O(log n) path to fix"]
        LR["LR Case (BF=+2, left child BF=-1):\nLeft rotate left child → LL case\nThen right rotate node"]
        RR["RR Case (BF=-2, right child BF≤0):\nSingle left rotation"]
        RL["RL Case: right rotate right child → RR, then left rotate"]
    end

    subgraph Height Update on Rotation
        Update["After rotation:\nheight(node) = 1 + max(height(left), height(right))\nPropagate height updates up to root O(log n)"]
    end
```

---

## 7. B-Tree — On-Disk Structure

```mermaid
flowchart TD
    subgraph B-Tree of Order t (min degree)
        Root3["Root: [20, 40]\n(2 keys, 3 children)"]
        N1["[5, 10, 15]\n(leaf, 3 keys)"]
        N2["[25, 30]\n(leaf)"]
        N3["[45, 50, 60]\n(leaf)"]
        Root3 --> N1 & N2 & N3

        Props["Properties (order t):\n- Each node: t-1 ≤ keys ≤ 2t-1 (root: 1 ≤ keys)\n- Each internal node: t ≤ children ≤ 2t\n- All leaves at same depth\n- t=500 → each node fits 1 disk block (4KB)\n  → tree height h = O(log_t n)\n  → for n=10^9, t=500: h=3 (3 disk reads!)"]
    end

    subgraph B-Tree Split (insert overflow)
        Full["Node has 2t-1 keys (full)"]
        Split["Split at median key index t:\n- median key promoted to parent\n- left child: keys[0..t-2]\n- right child: keys[t..2t-2]\n- Parent gains 1 key + 1 child ptr\n→ if parent also full: split propagates up"]
        Full --> Split
    end
```

---

## 8. Heap — Array Representation & Heapify

A minimum degree of `t=500` does not by itself imply that a node fits in 4 KiB or that one billion keys require exactly three reads. Capacity depends on key width, child-pointer/record width, headers, fill occupancy, root caching, and whether leaves store values. Compute fan-out from the actual page format before estimating height.

```mermaid
flowchart LR
    subgraph Min-Heap Array Layout
        Arr["Array: [10, 15, 20, 17, 25, 30, 22]\nIndex:  [0,   1,   2,   3,   4,   5,   6]\n\nParent(i) = (i-1)/2\nLeft(i) = 2i+1\nRight(i) = 2i+2"]
        Tree["Tree view:\n        10\n       /  \\\n      15   20\n     / \\ / \\\n   17 25 30 22"]
        Props2["Min-heap property:\nparent ≤ children (for all nodes)\nRoot = minimum element\nExtract-min: O(log n)\nInsert: O(log n)\nBuild-heap (heapify all): O(n)"]
    end

    subgraph Heapify-Down (after extract-min)
        Step1["Replace root with last element\n→ [22, 15, 20, 17, 25, 30]"]
        Step2["Sift down:\n22 > 15 (smaller child) → swap\n→ [15, 22, 20, 17, 25, 30]"]
        Step3["22 > 17 → swap\n→ [15, 17, 20, 22, 25, 30]\n(heap property restored)"]
    end
```

---

## 9. Skip List — Probabilistic Balancing

```mermaid
flowchart LR
    subgraph Skip List Structure
        L3["Level 3: -∞ ────────────────────────── 50 ── +∞"]
        L2["Level 2: -∞ ────── 20 ─────────── 50 ── 70 ── +∞"]
        L1["Level 1: -∞ ── 10 ── 20 ── 30 ── 50 ── 70 ── 90 ── +∞"]
        L0["Level 0: -∞ ── 10 ── 15 ── 20 ── 30 ── 40 ── 50 ── 70 ── 90 ── +∞"]
    end

    subgraph Search(35) path
        S1["Start at L3: -∞, next=50 > 35 → drop to L2"]
        S2["L2: -∞, next=20 < 35 → move; next=50 > 35 → drop to L1"]
        S3["L1: 20, next=30 < 35 → move; next=50 > 35 → drop to L0"]
        S4["L0: 30, next=40 > 35 → NOT FOUND"]
        S1 --> S2 --> S3 --> S4
        Complexity["Search: O(log n) expected\nInsert: flip coin per level (p=0.5), O(log n) expected\nSpace: O(n log n) expected\nUsed in: Redis sorted sets (ZADD/ZRANGE)"]
    end
```

---

## 10. Trie — String Prefix Operations

The skip-list diagram's `O(n log n)` expected-space label is incorrect for independent geometric levels with fixed promotion probability: the expected number of forward pointers is `O(n)`. Search and update remain `O(log n)` in expectation and `O(n)` in the worst case unless an additional probabilistic bound is stated.

```mermaid
flowchart TD
    subgraph Trie Structure
        Root4["Root (no char)"]
        A["a"]
        P["p"]
        Ap["p → 'app'*"]
        Ape["e → 'ape'*"]
        An["n → 'and'*"]
        D["d"]
        Root4 --> A & P
        A --> P & An
        P --> Ap & Ape
        An --> D
        Note2["* = terminal node (is_end=true)\nNode: char c, is_end bool, children[26] (alphabet)\nSpace: O(ALPHABET × max_depth × n) — can be large\nAlternative: hash map for children (sparse)"]
    end

    subgraph Patricia Trie (Compressed)
        P1["app → single edge labeled 'app'\n(no intermediate single-child nodes)\n→ O(n) nodes vs O(n×len) naive trie\n→ used in IP routing (routing table LPM)"]
    end

    subgraph Trie Operations Complexity
        Ops["Insert: O(len)\nSearch: O(len)\nPrefix search: O(len + results)\nDelete: O(len)\n(len = string length — independent of n!)"]
    end
```

---

## 11. Disjoint Set Union (Union-Find)

```mermaid
flowchart TD
    subgraph DSU with Path Compression + Union by Rank
        Init["parent[i] = i (each element is its own root)\nrank[i] = 0"]
        Find["find(x):\nif parent[x] ≠ x:\n  parent[x] = find(parent[x])  ← path compression\n  (all nodes on path directly point to root)\nreturn parent[x]"]
        Union2["union(x, y):\nrx = find(x), ry = find(y)\nif rx == ry: already same set\nif rank[rx] < rank[ry]: parent[rx] = ry\nelif rank[rx] > rank[ry]: parent[ry] = rx\nelse: parent[ry] = rx; rank[rx]++\n(union by rank: attach smaller tree under larger)"]
        Complexity2["Amortized complexity:\nM operations on N elements:\nO(M × α(N)) where α = inverse Ackermann\nα(N) ≤ 4 for all practical N\n→ effectively O(1) per operation"]
    end

    subgraph Application: Kruskal MST
        Kruskal["Sort edges by weight\nFor each edge (u,v,w):\n  if find(u) ≠ find(v):\n    add to MST\n    union(u, v)\n→ O(E log E) for sorting + O(E α(V)) for DSU"]
    end
```

---

## 12. Segment Tree — Range Query Internals

Union by **rank** attaches the root with lower rank below the root with higher rank; rank is an upper-bound heuristic, not necessarily current tree size. Use union by size if “smaller tree” is intended literally. The inverse-Ackermann bound requires both path compression and a rank/size heuristic over a sequence of operations.

```mermaid
flowchart TD
    subgraph Segment Tree (Range Sum)
        Array["Array: [3, 1, 4, 1, 5, 9, 2, 6]"]
        Tree3["Tree (1-indexed):\n[31, 9, 22, 4, 5, 14, 8, 3,1, 4,1, 5,9, 2,6]\nNode i → left=2i, right=2i+1, parent=i/2\nNode covers range [l, r]"]
        Build["Build: O(n)\nfor i = n..1: tree[i] = tree[2i] + tree[2i+1]"]
        Query["Query sum [l,r]: O(log n)\ncollect O(log n) disjoint covering nodes"]
        Update3["Point update: O(log n)\nupdate leaf → propagate up O(log n) parents"]
    end

    subgraph Lazy Propagation (Range Update)
        Lazy["Lazy tag: pending range update\nPush down before accessing children:\nif lazy[node] ≠ 0:\n  apply lazy[node] to children\n  clear lazy[node]\n→ Range update O(log n) instead of O(n log n)"]
    end
```

---

## 13. Graph Representation — Adjacency List vs Matrix

```mermaid
flowchart LR
    subgraph Adjacency List
        AL["vector<vector<int>> adj;\nadj[u] = [v1, v2, v3, ...]\n(edge list per vertex)\n\nSpace: O(V + E)\nEdge check: O(degree(u))\nDFS/BFS: O(V + E)\nBest for: sparse graphs (E << V²)"]
        CSR["CSR (Compressed Sparse Row):\noffset[]: prefix sum of degree\nnbr[]: concatenated neighbor lists\nedge u's neighbors: nbr[offset[u]..offset[u+1]-1]\n→ cache-friendly traversal for large graphs"]
    end

    subgraph Adjacency Matrix
        AM["int adj[V][V];\nadj[u][v] = weight (0 if no edge)\n\nSpace: O(V²)\nEdge check: O(1)\nDFS/BFS: O(V²) (scan row)\nBest for: dense graphs, Floyd-Warshall (O(V³))"]
    end

    subgraph Cache Locality
        CL["Adjacency list DFS:\nacc: random pointer chasing\nCSR DFS: sequential array scan → L1/L2 cache hit\nMatrix BFS: row-major scan → cache-friendly for dense"]
    end
```

---

## 14. Memory Usage & Performance Summary

```mermaid
block-beta
  columns 2
  block:lookup["Lookup Performance"]:1
    l1["Array (index): O(1), cache-line hit"]
    l2["Hash table (avg): O(1), but cache miss on chain"]
    l3["BST (balanced): O(log n), pointer chase"]
    l4["Skip list: O(log n) expected, multiple levels"]
  end
  block:insert_del["Insert/Delete"]:1
    i1["Array (end): O(1) amortized"]
    i2["Array (middle): O(n) shift"]
    i3["Linked list (with ptr): O(1)"]
    i4["Red-Black / AVL: O(log n) + O(1) rotations"]
  end
  block:memory["Memory Overhead per Element"]:1
    m1["Array: 0 extra bytes (contiguous)"]
    m2["Linked list: 8B next pointer (+ heap header ~16B)"]
    m3["Hash table: load factor × array size overhead"]
    m4["RB-Tree node: color bit + 3 pointers = ~32B extra"]
  end
  block:special["Special Structures"]:1
    sp1["Segment tree: 4n array (bit twiddling)"]
    sp2["DSU: 2n arrays (parent + rank)"]
    sp3["Bloom filter: m bits, k hashes (0 false negatives)"]
    sp4["Skip list: O(n log n) expected space"]
  end
```

---

## Key Takeaways

- **Dynamic array amortized O(1)** push works because doubling capacity means the number of copies is bounded by a geometric series — total copies ≤ 2n
- **Hash table chaining vs open addressing**: chaining handles high load factors better; open addressing (Robin Hood / linear probe) has better cache locality but needs careful deletion (tombstones)
- **Red-Black tree** uses color to encode approximate balance — at most 2× height vs perfect BST; only O(1) rotations per insert/delete vs AVL's O(log n) rotations
- **B-Tree node size** is tuned to match disk block / OS page (4KB or 16KB) — each I/O fetches one node with hundreds of keys; tree height stays ≤ 3–4 for billion-record indexes
- **Skip list** in Redis achieves O(log n) range queries by having each node participate in multiple sorted linked lists with geometrically decreasing probability — simpler to implement than balanced BST
- **Segment tree lazy propagation** defers range updates by storing a pending tag in each node — pushed down only when a child is accessed, keeping range updates at O(log n)
- **Union-Find with path compression + union by rank** achieves near-O(1) per operation due to the inverse Ackermann function — the tree height stays practically bounded at 4
