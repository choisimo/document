"""
문제 056: BST에서 K번째 작은 수 (Kth Smallest Element in BST)
[문제] BST에서 K번째로 작은 원소를 찾아라.
[아키텍트의 시선] Order-Statistic과 이터레이터 패턴.
BST의 중위 순회 = 정렬 순서. K번째 방문 시 즉시 반환하면 O(h+k).
전체 정렬 불필요 → 지연 평가(Lazy Evaluation)의 전형적 적용.
실무: 데이터베이스 ORDER BY LIMIT k, 스트림에서 k번째 원소.
[시간 복잡도] O(H+k) [공간 복잡도] O(H) H=트리 높이
"""
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def kth_smallest(root: Optional[TreeNode], k: int) -> int:
    """반복적 중위 순회 (스택)"""
    stack = []
    current = root
    count = 0
    while stack or current:
        while current:
            stack.append(current)
            current = current.left
        current = stack.pop()
        count += 1
        if count == k:
            return current.val
        current = current.right
    return -1

def kth_smallest_recursive(root: Optional[TreeNode], k: int) -> int:
    """재귀적 중위 순회"""
    result = [0]
    counter = [0]
    def inorder(node):
        if not node:
            return
        inorder(node.left)
        counter[0] += 1
        if counter[0] == k:
            result[0] = node.val
            return
        inorder(node.right)
    inorder(root)
    return result[0]

if __name__ == "__main__":
    #       3
    #      / \\
    #     1   4
    #      \\
    #       2
    root = TreeNode(3, TreeNode(1, None, TreeNode(2)), TreeNode(4))
    assert kth_smallest(root, 1) == 1
    assert kth_smallest(root, 2) == 2
    assert kth_smallest(root, 3) == 3
    assert kth_smallest_recursive(root, 1) == 1
    assert kth_smallest_recursive(root, 3) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
