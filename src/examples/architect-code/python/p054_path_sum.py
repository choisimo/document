"""
문제 054: 경로 합 (Path Sum)
[문제] 루트~리프 경로 중 합이 targetSum인 경로가 있는지 판별하라.
[아키텍트의 시선] 경로 탐색과 목표 분해.
각 노드에서 남은 목표를 줄여가며 리프에서 0이 되는지 확인.
'큰 문제를 단계별로 줄여가는' DP/재귀적 사고의 전형.
실무: 비용 경로 분석, 의존성 체인의 총 비용 계산.
[시간 복잡도] O(n) [공간 복잡도] O(h)
"""
from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def has_path_sum(root: Optional[TreeNode], target_sum: int) -> bool:
    """경로 합 존재 여부"""
    if not root:
        return False
    if not root.left and not root.right:
        return root.val == target_sum
    remainder = target_sum - root.val
    return has_path_sum(root.left, remainder) or has_path_sum(root.right, remainder)

def path_sum_all(root: Optional[TreeNode], target_sum: int) -> List[List[int]]:
    """모든 경로 합 반환 (확장)"""
    result = []
    def dfs(node, remaining, path):
        if not node:
            return
        path.append(node.val)
        if not node.left and not node.right and remaining == node.val:
            result.append(path[:])
        dfs(node.left, remaining - node.val, path)
        dfs(node.right, remaining - node.val, path)
        path.pop()
    dfs(root, target_sum, [])
    return result

if __name__ == "__main__":
    #       5
    #      / \\
    #     4   8
    #    /   / \\
    #   11  13  4
    #  / \\      \\
    # 7   2      1
    root = TreeNode(5,
        TreeNode(4, TreeNode(11, TreeNode(7), TreeNode(2))),
        TreeNode(8, TreeNode(13), TreeNode(4, None, TreeNode(1))))
    assert has_path_sum(root, 22) == True
    assert has_path_sum(root, 26) == True
    assert has_path_sum(root, 100) == False
    assert path_sum_all(root, 22) == [[5, 4, 11, 2]]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
