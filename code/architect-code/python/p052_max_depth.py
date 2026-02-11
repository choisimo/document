"""
문제 052: 최대 깊이 (Maximum Depth of Binary Tree)
[문제] 이진 트리의 최대 깊이(루트~리프 최장 경로의 노드 수)를 구하라.
[아키텍트의 시선] 트리 속성의 재귀적 분해.
max_depth(node) = 1 + max(max_depth(left), max_depth(right)).
단순하지만 핵심: 복잡한 트리 속성을 부분 문제로 분해하는 패턴.
실무: 디렉토리 깊이 제한, DOM 깊이 분석, 조직 계층 측정.
[시간 복잡도] O(n) [공간 복잡도] O(h) h=트리 높이
"""
from typing import Optional
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def max_depth_recursive(root: Optional[TreeNode]) -> int:
    """재귀 DFS 풀이"""
    if not root:
        return 0
    return 1 + max(max_depth_recursive(root.left), max_depth_recursive(root.right))

def max_depth_iterative(root: Optional[TreeNode]) -> int:
    """반복 BFS 풀이"""
    if not root:
        return 0
    depth = 0
    queue = deque([root])
    while queue:
        depth += 1
        for _ in range(len(queue)):
            node = queue.popleft()
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return depth

if __name__ == "__main__":
    root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))
    assert max_depth_recursive(root) == 3
    assert max_depth_iterative(root) == 3
    assert max_depth_recursive(None) == 0
    assert max_depth_recursive(TreeNode(1)) == 1
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
