"""
문제 055: BST 유효성 검증 (Validate Binary Search Tree)
[문제] 이진 트리가 유효한 BST인지 검증하라.
BST 조건: 모든 노드에 대해 왼쪽 < 현재 < 오른쪽 (서브트리 전체).
[아키텍트의 시선] 불변식(Invariant) 검증과 범위 제약.
단순히 부모-자식만 비교하면 안 됨. 상위 조상의 범위 제약까지 전파해야 함.
실무: 데이터 무결성 검증, 인덱스 정합성 확인, 설정값 범위 검증.
[시간 복잡도] O(n) [공간 복잡도] O(h)
"""
from typing import Optional
import math

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root: Optional[TreeNode]) -> bool:
    """범위 검증 방식"""
    def validate(node, low, high):
        if not node:
            return True
        if node.val <= low or node.val >= high:
            return False
        return validate(node.left, low, node.val) and validate(node.right, node.val, high)
    return validate(root, -math.inf, math.inf)

def is_valid_bst_inorder(root: Optional[TreeNode]) -> bool:
    """중위 순회 방식: BST의 중위 순회는 오름차순"""
    prev = -math.inf
    def inorder(node):
        nonlocal prev
        if not node:
            return True
        if not inorder(node.left):
            return False
        if node.val <= prev:
            return False
        prev = node.val
        return inorder(node.right)
    return inorder(root)

if __name__ == "__main__":
    # 유효: 2-1-3
    valid = TreeNode(2, TreeNode(1), TreeNode(3))
    assert is_valid_bst(valid) == True
    assert is_valid_bst_inorder(valid) == True
    # 무효: 5-1-4(3,6) → 4가 5보다 작은데 오른쪽에 있음
    invalid = TreeNode(5, TreeNode(1), TreeNode(4, TreeNode(3), TreeNode(6)))
    assert is_valid_bst(invalid) == False
    assert is_valid_bst_inorder(invalid) == False
    # 무효: 5-4-6(3,7) → 3이 5보다 작은데 오른쪽 서브트리에 있음
    tricky = TreeNode(5, TreeNode(4), TreeNode(6, TreeNode(3), TreeNode(7)))
    assert is_valid_bst(tricky) == False
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
