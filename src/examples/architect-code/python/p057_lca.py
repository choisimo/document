"""
문제 057: 최소 공통 조상 (Lowest Common Ancestor)
[문제] 이진 트리에서 두 노드 p, q의 최소 공통 조상(LCA)을 찾아라.
[아키텍트의 시선] 트리 쿼리와 분기점 탐색.
후위 순회로 왼쪽/오른쪽에서 각각 p, q를 찾으면 현재가 LCA.
한쪽에서만 찾으면 그쪽이 LCA (둘 다 같은 서브트리에 있으므로).
실무: 버전 관리의 merge-base, 조직도 공통 상위 관리자, DOM 공통 조상.
[시간 복잡도] O(n) [공간 복잡도] O(h)
"""
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def lowest_common_ancestor(root: Optional[TreeNode], p: TreeNode, q: TreeNode) -> Optional[TreeNode]:
    if not root or root == p or root == q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root  # p, q가 양쪽에 하나씩 → 현재가 LCA
    return left if left else right

if __name__ == "__main__":
    #       3
    #      / \\
    #     5   1
    #    / \\ / \\
    #   6  2 0  8
    #     / \\
    #    7   4
    n = {}
    for v in [3,5,1,6,2,0,8,7,4]:
        n[v] = TreeNode(v)
    n[3].left, n[3].right = n[5], n[1]
    n[5].left, n[5].right = n[6], n[2]
    n[1].left, n[1].right = n[0], n[8]
    n[2].left, n[2].right = n[7], n[4]
    assert lowest_common_ancestor(n[3], n[5], n[1]) == n[3]
    assert lowest_common_ancestor(n[3], n[5], n[4]) == n[5]
    assert lowest_common_ancestor(n[3], n[7], n[4]) == n[2]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
