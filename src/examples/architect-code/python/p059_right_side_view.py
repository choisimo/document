"""
문제 059: 이진 트리 우측 뷰 (Binary Tree Right Side View)
[문제] 이진 트리를 오른쪽에서 보았을 때 보이는 노드들을 반환하라.
[아키텍트의 시선] View Projection 패턴.
각 레벨의 마지막 노드만 수집 → 레벨 순회(BFS)에서 마지막 원소 추출.
실무: 대시보드 요약 뷰, 조직도 계층별 대표자, 트리 구조 시각화.
[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import Optional, List
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def right_side_view(root: Optional[TreeNode]) -> List[int]:
    """BFS: 각 레벨의 마지막 노드"""
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)
        for i in range(level_size):
            node = queue.popleft()
            if i == level_size - 1:
                result.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return result

def right_side_view_dfs(root: Optional[TreeNode]) -> List[int]:
    """DFS: 오른쪽 먼저, 깊이별 첫 방문만 기록"""
    result = []
    def dfs(node, depth):
        if not node:
            return
        if depth == len(result):
            result.append(node.val)
        dfs(node.right, depth + 1)
        dfs(node.left, depth + 1)
    dfs(root, 0)
    return result

if __name__ == "__main__":
    #     1
    #    / \\
    #   2   3
    #    \\   \\
    #     5   4
    root = TreeNode(1, TreeNode(2, None, TreeNode(5)), TreeNode(3, None, TreeNode(4)))
    assert right_side_view(root) == [1, 3, 4]
    assert right_side_view_dfs(root) == [1, 3, 4]
    # 왼쪽이 더 깊은 경우
    root2 = TreeNode(1, TreeNode(2, TreeNode(4)), TreeNode(3))
    assert right_side_view(root2) == [1, 3, 4]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
