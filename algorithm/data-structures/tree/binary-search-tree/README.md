# Binary Search Tree (BST) - 이진 탐색 트리

> **"First Principles"** 관점에서 BST의 본질을 이해하고, 메모리 구조와 런타임 거동을 시각적으로 시뮬레이션합니다.

---

## 개요

이진 탐색 트리(BST)는 **정렬된 데이터를 효율적으로 탐색, 삽입, 삭제**하기 위한 자료구조입니다.

### 핵심 속성 (Invariant)
```
모든 노드 N에 대해:
├── N.left의 모든 값 < N.key
└── N.right의 모든 값 > N.key
```

### 시간 복잡도

| 연산 | Average | Worst (Skewed) |
|------|---------|----------------|
| 탐색 | O(log n) | O(n) |
| 삽입 | O(log n) | O(n) |
| 삭제 | O(log n) | O(n) |

---

## Visual Simulation: 메모리와 데이터 흐름

### 삽입 시나리오: `[5, 3, 7, 1, 4]` 순서로 삽입

```
════════════════════════════════════════════════════════════════════
 STEP 1: insert(5) - 첫 번째 노드
════════════════════════════════════════════════════════════════════
 
 Stack Memory                    Heap Memory
 ┌─────────────────┐             ┌─────────────────┐
 │ main()          │             │ Node@0x1000     │
 │   root ──────────────────────►│ key: 5          │
 └─────────────────┘             │ left: null      │
                                 │ right: null     │
                                 └─────────────────┘
 
 Tree Visualization:    [5]
 
════════════════════════════════════════════════════════════════════
 STEP 2: insert(3) - 5보다 작음 → 왼쪽으로
════════════════════════════════════════════════════════════════════
 
 Stack (Recursive Call)          Heap Memory
 ┌─────────────────┐             ┌─────────────────┐
 │ insert(root, 3) │             │ Node@0x1000     │
 │   ↓ 3 < 5       │             │ key: 5          │
 │ insert(null, 3) │             │ left ───────────┼──┐
 │   return new    │             │ right: null     │  │
 └─────────────────┘             └─────────────────┘  │
                                 ┌─────────────────┐  │
                                 │ Node@0x1008     │◄─┘
                                 │ key: 3          │
                                 │ left: null      │
                                 │ right: null     │
                                 └─────────────────┘
 
 Tree Visualization:    [5]
                        /
                      [3]
 
════════════════════════════════════════════════════════════════════
 STEP 3: insert(7) - 5보다 큼 → 오른쪽으로
════════════════════════════════════════════════════════════════════
 
 Tree Visualization:    [5]
                        / \
                      [3] [7]
 
════════════════════════════════════════════════════════════════════
 STEP 4: insert(1) - 5보다 작음 → 3보다 작음 → 왼쪽의 왼쪽
════════════════════════════════════════════════════════════════════
 
 Recursive Call Stack:
 ┌────────────────────────────────┐
 │ insert(root@0x1000, 1)         │ ← 1 < 5, go left
 │   └── insert(node@0x1008, 1)   │ ← 1 < 3, go left
 │       └── insert(null, 1)      │ ← Create Node@0x1010
 │           return Node@0x1010   │
 │       node.left = Node@0x1010  │
 │       return node              │
 │   root.left = node             │
 │   return root                  │
 └────────────────────────────────┘
 
 Tree Visualization:      [5]
                          / \
                        [3] [7]
                        /
                      [1]
 
════════════════════════════════════════════════════════════════════
 STEP 5: insert(4) - 5보다 작음 → 3보다 큼 → 왼쪽의 오른쪽
════════════════════════════════════════════════════════════════════
 
 Final Tree:              [5]
                          / \
                        [3] [7]
                        / \
                      [1] [4]
 
 Final Heap Layout:
 ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
 │ @0x1000      │ @0x1008      │ @0x1010      │ @0x1018      │ @0x1020      │
 │ key=5        │ key=3        │ key=1        │ key=7        │ key=4        │
 │ L=@0x1008    │ L=@0x1010    │ L=null       │ L=null       │ L=null       │
 │ R=@0x1018    │ R=@0x1020    │ R=null       │ R=null       │ R=null       │
 └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 삭제 시나리오: 세 가지 케이스

```
Case 1: Leaf Node 삭제 (자식 없음)
═══════════════════════════════════════
Before:     [5]          After:      [5]
            / \                      / \
          [3] [7]                  [3] [7]
          /                        
        [1] ← 삭제                  
        
Action: parent.left = null
Memory: Node@0x1010 GC 대상

═══════════════════════════════════════
Case 2: Single Child 삭제 (자식 1개)
═══════════════════════════════════════
Before:     [5]          After:      [5]
            / \                      / \
          [3] [7]                  [1] [7]
          /   ↑ 삭제                    
        [1]                        

Action: parent.left = node.left (bypass)
Memory: Node@0x1008 GC 대상

═══════════════════════════════════════
Case 3: Two Children 삭제 (자식 2개)
═══════════════════════════════════════
Before:       [5] ← 삭제     After:       [7]
              / \                        / 
            [3] [7]                    [3]   
            / \                        / \
          [1] [4]                    [1] [4]

Strategy: In-order Successor (오른쪽 서브트리의 최소값)
1. Find min of right subtree: 7
2. Copy key: node.key = 7
3. Delete 7 from right subtree (Case 1 적용)
```

---

## Language Implementations

| Language | Focus | File |
|----------|-------|------|
| Python | 직관적 이해, Reference Counting | `01_python/bst.py` |
| JavaScript | V8 엔진 최적화, Hidden Class | `02_javascript/bst.js` |
| Java | JVM 메모리 모델, GC 생애 주기 | `03_java/BinarySearchTree.java` |
| Rust | Ownership, Zero-cost Abstraction | `04_rust/src/lib.rs` |

---

## Incremental Optimization Roadmap

### Step 1: Naive Implementation
- 기본 BST (불균형 가능)
- Worst case: O(n) - Skewed Tree

### Step 2: Self-Balancing
- AVL Tree / Red-Black Tree
- Guaranteed O(log n)

### Step 3: Cache Optimization
- B-Tree / B+ Tree (디스크 최적화)
- Cache-Oblivious Data Structures

---

## 사용 사례

1. **데이터베이스 인덱싱** - B+ Tree (BST 변형)
2. **Set/Map 구현** - TreeSet, TreeMap (Java)
3. **파일 시스템** - 디렉토리 구조
4. **자동 완성** - Trie (BST 변형)

---

## 연습 문제 (LeetCode)

- [98. Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
- [701. Insert into a Binary Search Tree](https://leetcode.com/problems/insert-into-a-binary-search-tree/)
- [450. Delete Node in a BST](https://leetcode.com/problems/delete-node-in-a-bst/)
- [230. Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)
