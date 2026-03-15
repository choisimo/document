"""
Binary Search Tree - Python Implementation

Focus: Reference Counting, Intuitive Understanding, Prototyping
Author: Algorithm Study Repository
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Generator, List
import sys


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

    # ═══════════════════════════════════════════════════════════════
    # Core Operations
    # ═══════════════════════════════════════════════════════════════

    def insert(self, key: int) -> None:
        """삽입 연산 - O(log n) average, O(n) worst"""
        self._root = self._insert_recursive(self._root, key)
        self._size += 1

    def _insert_recursive(self, node: Optional[Node], key: int) -> Node:
        if node is None:
            return Node(key)

        if key < node.key:
            node.left = self._insert_recursive(node.left, key)
        elif key > node.key:
            node.right = self._insert_recursive(node.right, key)
        # key == node.key: 중복 무시

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
        self._root, deleted = self._delete_recursive(self._root, key)
        if deleted:
            self._size -= 1

    def _delete_recursive(
        self, node: Optional[Node], key: int
    ) -> tuple[Optional[Node], bool]:
        if node is None:
            return None, False

        deleted = False

        if key < node.key:
            node.left, deleted = self._delete_recursive(node.left, key)
        elif key > node.key:
            node.right, deleted = self._delete_recursive(node.right, key)
        else:
            deleted = True
            # Case 1 & 2: 자식이 0개 또는 1개
            if node.left is None:
                return node.right, True
            if node.right is None:
                return node.left, True

            # Case 3: 자식이 2개 - In-order successor 사용
            successor = self._find_min(node.right)
            node.key = successor.key
            node.right, _ = self._delete_recursive(node.right, successor.key)

        return node, deleted

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
        """중위 순회 - 정렬된 순서 출력"""
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

    def level_order(self) -> Generator[List[int], None, None]:
        """레벨 순회 (BFS)"""
        if self._root is None:
            return

        from collections import deque

        queue = deque([self._root])

        while queue:
            level_size = len(queue)
            level = []
            for _ in range(level_size):
                node = queue.popleft()
                level.append(node.key)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            yield level

    # ═══════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════

    @property
    def size(self) -> int:
        return self._size

    @property
    def height(self) -> int:
        return self._height_recursive(self._root)

    def _height_recursive(self, node: Optional[Node]) -> int:
        if node is None:
            return -1
        return 1 + max(
            self._height_recursive(node.left), self._height_recursive(node.right)
        )

    def is_valid_bst(self) -> bool:
        """BST 속성 검증"""

        def validate(node: Optional[Node], min_val: float, max_val: float) -> bool:
            if node is None:
                return True
            if not (min_val < node.key < max_val):
                return False
            return validate(node.left, min_val, node.key) and validate(
                node.right, node.key, max_val
            )

        return validate(self._root, float("-inf"), float("inf"))

    def __len__(self) -> int:
        return self._size

    def __contains__(self, key: int) -> bool:
        return self.search(key)

    def __iter__(self):
        return self.inorder()


# ═══════════════════════════════════════════════════════════════════
# Visualization Helper
# ═══════════════════════════════════════════════════════════════════


def visualize_tree(bst: BinarySearchTree) -> str:
    """트리 구조를 문자열로 시각화"""

    def _build(node: Optional[Node], prefix: str = "", is_left: bool = True) -> str:
        if node is None:
            return ""

        result = ""
        if node.right is not None:
            new_prefix = prefix + ("│   " if is_left else "    ")
            result += _build(node.right, new_prefix, False)

        result += prefix + ("└── " if is_left else "┌── ") + str(node.key) + "\n"

        if node.left is not None:
            new_prefix = prefix + ("    " if is_left else "│   ")
            result += _build(node.left, new_prefix, True)

        return result

    if bst._root is None:
        return "(empty tree)"
    return _build(bst._root, "", True)


# ═══════════════════════════════════════════════════════════════════
# Main Demo
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("Binary Search Tree - Python Demo")
    print("=" * 60)

    bst = BinarySearchTree()
    elements = [5, 3, 7, 1, 4, 6, 8]

    print(f"\n삽입 순서: {elements}\n")

    for elem in elements:
        bst.insert(elem)

    print("Tree Structure:")
    print(visualize_tree(bst))

    print(f"Size: {len(bst)}")
    print(f"Height: {bst.height}")
    print(f"Is Valid BST: {bst.is_valid_bst()}")

    print(f"\nInorder (정렬됨): {list(bst.inorder())}")
    print(f"Preorder: {list(bst.preorder())}")
    print(f"Postorder: {list(bst.postorder())}")
    print(f"Level Order: {list(bst.level_order())}")

    print(f"\nSearch 4: {4 in bst}")
    print(f"Search 10: {10 in bst}")

    print("\nAfter delete(5) - root deletion:")
    bst.delete(5)
    print(visualize_tree(bst))
