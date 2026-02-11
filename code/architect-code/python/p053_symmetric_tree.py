"""
문제 053: 대칭 트리 (Symmetric Tree)
[문제] 이진 트리가 좌우 대칭(거울상)인지 판별하라.
[아키텍트의 시선] 구조적 동등성 비교.
두 서브트리의 '거울 동등성'을 재귀적으로 검증한다.
is_mirror(left, right) = left.val == right.val AND
is_mirror(left.left, right.right) AND is_mirror(left.right, right.left).
실무: 데이터 무결성 검증, 분산 시스템의 대칭 복제 확인.
[시간 복잡도] O(n) [공간 복잡도] O(h)
"""
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_symmetric(root: Optional[TreeNode]) -> bool:
    if not root:
        return True

    def is_mirror(t1: Optional[TreeNode], t2: Optional[TreeNode]) -> bool:
        if not t1 and not t2:
            return True
        if not t1 or not t2:
            return False
        return (t1.val == t2.val and
                is_mirror(t1.left, t2.right) and
                is_mirror(t1.right, t2.left))

    return is_mirror(root.left, root.right)

if __name__ == "__main__":
    # 대칭:    1
    #        / \\
    #       2   2
    #      / \\ / \\
    #     3  4 4  3
    sym = TreeNode(1, TreeNode(2, TreeNode(3), TreeNode(4)),
                      TreeNode(2, TreeNode(4), TreeNode(3)))
    assert is_symmetric(sym) == True
    # 비대칭
    asym = TreeNode(1, TreeNode(2, None, TreeNode(3)),
                       TreeNode(2, None, TreeNode(3)))
    assert is_symmetric(asym) == False
    assert is_symmetric(None) == True
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
