# BST - Python Implementation

> **Focus:** 인터프리터 오버헤드, Reference Counting, 직관적 프로토타이핑
> Runtime scope: reference counting and immediate destruction descriptions target CPython; other implementations may differ. Timing and memory figures require a Python version, platform, allocator state, input distribution, and measurement command.

---

## Phase 1: The Blueprint

### Base Code (Idiomatic Python)

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Generator
import sys

# Reference Counting 시각화를 위해 sys.getrefcount 활용
@dataclass
class Node:
    """BST 노드 - dataclass로 boilerplate 최소화"""
    key: int
    left: Optional[Node] = None
    right: Optional[Node] = None


class BinarySearchTree:
    """
    이진 탐색 트리 구현
    
    Python 특성:
    - 모든 객체는 힙에 할당됨 (스택 변수도 참조)
    - Reference Counting + Cyclic GC
    - 재귀 깊이 제한 (default: 1000)
    """
    
    def __init__(self) -> None:
        self._root: Optional[Node] = None
        self._size: int = 0
    
    def insert(self, key: int) -> None:
        """삽입 연산 - O(log n) average, O(n) worst"""
        if self.search(key):
            return  # duplicate policy: ignore without changing size
        self._root = self._insert_recursive(self._root, key)
        self._size += 1
    
    def _insert_recursive(self, node: Optional[Node], key: int) -> Node:
        # Base case: 빈 위치 도달
        if node is None:
            return Node(key)
        
        # 재귀 탐색
        if key < node.key:
            node.left = self._insert_recursive(node.left, key)
        elif key > node.key:
            node.right = self._insert_recursive(node.right, key)
        # key == node.key: 중복 무시 (또는 정책에 따라 처리)
        
        return node
    
    def search(self, key: int) -> bool:
        """탐색 연산"""
        return self._search_recursive(self._root, key)
    
    def _search_recursive(self, node: Optional[Node], key: int) -> bool:
        if node is None:
            return False
        if key == node.key:
            return True
        elif key < node.key:
            return self._search_recursive(node.left, key)
        else:
            return self._search_recursive(node.right, key)
    
    def delete(self, key: int) -> None:
        """삭제 연산"""
        if not self.search(key):
            return
        self._root = self._delete_recursive(self._root, key)
        self._size -= 1
    
    def _delete_recursive(self, node: Optional[Node], key: int) -> Optional[Node]:
        if node is None:
            return None
        
        if key < node.key:
            node.left = self._delete_recursive(node.left, key)
        elif key > node.key:
            node.right = self._delete_recursive(node.right, key)
        else:
            # 삭제할 노드 발견
            # Case 1 & 2: 자식이 0개 또는 1개
            if node.left is None:
                return node.right
            if node.right is None:
                return node.left
            
            # Case 3: 자식이 2개 - In-order successor 사용
            successor = self._find_min(node.right)
            node.key = successor.key
            node.right = self._delete_recursive(node.right, successor.key)
        
        return node
    
    def _find_min(self, node: Node) -> Node:
        """서브트리의 최솟값 노드 찾기"""
        current = node
        while current.left is not None:
            current = current.left
        return current
    
    # ═══════════════════════════════════════════════════════════════
    # Traversals - Generator 패턴 (메모리 효율적)
    # ═══════════════════════════════════════════════════════════════
    
    def inorder(self) -> Generator[int, None, None]:
        """중위 순회 - Generator로 lazy evaluation"""
        yield from self._inorder_recursive(self._root)
    
    def _inorder_recursive(self, node: Optional[Node]) -> Generator[int, None, None]:
        if node is not None:
            yield from self._inorder_recursive(node.left)
            yield node.key
            yield from self._inorder_recursive(node.right)
    
    def preorder(self) -> Generator[int, None, None]:
        """전위 순회"""
        yield from self._preorder_recursive(self._root)
    
    def _preorder_recursive(self, node: Optional[Node]) -> Generator[int, None, None]:
        if node is not None:
            yield node.key
            yield from self._preorder_recursive(node.left)
            yield from self._preorder_recursive(node.right)
    
    def postorder(self) -> Generator[int, None, None]:
        """후위 순회"""
        yield from self._postorder_recursive(self._root)
    
    def _postorder_recursive(self, node: Optional[Node]) -> Generator[int, None, None]:
        if node is not None:
            yield from self._postorder_recursive(node.left)
            yield from self._postorder_recursive(node.right)
            yield node.key
    
    @property
    def size(self) -> int:
        return self._size
    
    def __len__(self) -> int:
        return self._size
    
    def __contains__(self, key: int) -> bool:
        return self.search(key)


# ═══════════════════════════════════════════════════════════════════
# Visual Simulation
# ═══════════════════════════════════════════════════════════════════

def visualize_memory():
    """
    [Visual Simulation] - 메모리 참조 카운팅 시연
    
    Python에서 모든 변수는 객체에 대한 '참조'입니다.
    할당 시 reference count가 증가하고, 범위를 벗어나면 감소합니다.
    count가 0이 되면 즉시 메모리 해제됩니다.
    """
    print("=" * 60)
    print("Python Reference Counting Demonstration")
    print("=" * 60)
    
    node = Node(42)
    print(f"Node 생성 후 refcount: {sys.getrefcount(node) - 1}")  # -1: getrefcount 자체 참조 제외
    
    alias = node  # 같은 객체를 참조
    print(f"alias 할당 후 refcount: {sys.getrefcount(node) - 1}")
    
    del alias
    print(f"alias 삭제 후 refcount: {sys.getrefcount(node) - 1}")
    
    print()


def visualize_tree_structure(bst: BinarySearchTree) -> None:
    """트리 구조 시각화"""
    def _build_tree_string(node: Optional[Node], prefix: str = "", is_left: bool = True) -> str:
        if node is None:
            return ""
        
        result = ""
        if node.right is not None:
            new_prefix = prefix + ("│   " if is_left else "    ")
            result += _build_tree_string(node.right, new_prefix, False)
        
        result += prefix + ("└── " if is_left else "┌── ") + str(node.key) + "\n"
        
        if node.left is not None:
            new_prefix = prefix + ("    " if is_left else "│   ")
            result += _build_tree_string(node.left, new_prefix, True)
        
        return result
    
    if bst._root is None:
        print("(empty tree)")
    else:
        print(_build_tree_string(bst._root, "", True))


# ═══════════════════════════════════════════════════════════════════
# Main - 데모 실행
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    visualize_memory()
    
    print("=" * 60)
    print("BST Operations Demo")
    print("=" * 60)
    
    bst = BinarySearchTree()
    elements = [5, 3, 7, 1, 4, 6, 8]
    
    print(f"삽입 순서: {elements}")
    print()
    
    for elem in elements:
        bst.insert(elem)
        print(f"After insert({elem}):")
        visualize_tree_structure(bst)
    
    print("Inorder (정렬된 순서):", list(bst.inorder()))
    print("Preorder:", list(bst.preorder()))
    print("Postorder:", list(bst.postorder()))
    
    print()
    print(f"Search 4: {4 in bst}")
    print(f"Search 10: {10 in bst}")
    
    print()
    print("After delete(3):")
    bst.delete(3)
    visualize_tree_structure(bst)
```

---

## Phase 2: Under the Hood - Python 특성

### 1. Reference Counting & GC

```
Python 메모리 모델:
┌─────────────────────────────────────────────────────────────┐
│ Stack Frame (main)          │ Heap (PyObject)              │
├─────────────────────────────┼──────────────────────────────┤
│ bst ────────────────────────┼──► BinarySearchTree          │
│                             │    ├── _root ──► Node(5)     │
│                             │    │            ├── left ──► Node(3)
│                             │    │            └── right ──► Node(7)
│                             │    └── _size: 3              │
└─────────────────────────────┴──────────────────────────────┘

Reference Count 흐름:
1. node = Node(5)     → refcount(Node(5)) = 1
2. bst._root = node   → refcount(Node(5)) = 2
3. del node           → refcount(Node(5)) = 1
4. bst._root = None   → 다른 참조와 cycle이 없다면 CPython에서 refcount 0 후 해제
```

### 2. 재귀 깊이 제한

```python
import sys
print(sys.getrecursionlimit())  # 흔한 CPython 기본값은 1000이며 runtime에서 확인

# Skewed tree (n=10000)에서 insert 시:
# RecursionError: maximum recursion depth exceeded

# 해결책 1: 제한 증가 (권장하지 않음)
sys.setrecursionlimit(100000)

# 해결책 2: 반복문 버전으로 변환 (권장)
def insert_iterative(self, key: int) -> None:
    new_node = Node(key)
    if self._root is None:
        self._root = new_node
        return
    
    current = self._root
    while True:
        if key < current.key:
            if current.left is None:
                current.left = new_node
                return
            current = current.left
        else:
            if current.right is None:
                current.right = new_node
                return
            current = current.right
```

### 3. 성능 특성

다음 수치는 측정 환경이 없는 예시입니다. 대상 runtime에서 같은 workload를 반복 측정해 교체하기 전에는 비교 근거로 사용하지 않습니다.

| 연산 | Python 오버헤드 | 이유 |
|------|----------------|------|
| 객체 생성 | ~100ns | PyObject 헤더 할당 |
| 속성 접근 | ~50ns | `__dict__` 조회 (slots로 최적화 가능) |
| 함수 호출 | ~100ns | Frame 객체 생성 |
| 비교 연산 | ~20ns | `__lt__`, `__gt__` 매직 메서드 |

### 4. `__slots__` 최적화

```python
# Before: __dict__ 사용 (유연하지만 느림)
@dataclass
class Node:
    key: int
    left: Optional[Node] = None
    right: Optional[Node] = None

# After: __slots__ 사용 (메모리 절약 + 빠른 접근)
class Node:
    __slots__ = ('key', 'left', 'right')
    
    def __init__(self, key: int):
        self.key = key
        self.left: Optional[Node] = None
        self.right: Optional[Node] = None

# 메모리 비교 (10000 노드 기준):
# __dict__: ~1.6 MB
# __slots__: ~0.8 MB (특정 측정 예시; 절감률은 runtime과 측정 범위에 따라 다름)
```

---

## Phase 3: Incremental Optimization

### Step 1: Naive (현재 구현)
- 불균형 트리 가능
- Worst: O(n)

### Step 2: Iterative Version
- RecursionError 방지
- 스택 오버헤드 제거

### Step 3: Cache-Friendly (실험적)
```python
# 노드 배열 기반 구현 (Cache Locality 향상)
class ArrayBasedBST:
    def __init__(self, capacity: int = 1024):
        self.keys = [None] * capacity
        # index 0 = root
        # left child = 2*i + 1
        # right child = 2*i + 2
```

---

## 실행 방법

```bash
python bst.py
```

## 테스트

```bash
python -m pytest test_bst.py -v
```
