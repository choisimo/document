"""
문제 060: 트리를 연결 리스트로 변환 (Flatten Binary Tree to Linked List)
[문제] 이진 트리를 전위 순회 순서로 right 포인터만 사용하는 연결 리스트로 변환하라.
[아키텍트의 시선] 구조의 선형화와 모리스 순회.
트리 구조를 선형 구조로 변환 → 메모리 지역성 향상, 순차 접근 최적화.
모리스 순회: O(1) 공간으로 트리 순회 (스레드 기법).
실무: DB 인덱스 선형화, 트리 직렬화, 이터레이터 패턴.
[시간 복잡도] O(n) [공간 복잡도] O(1) 모리스, O(h) 재귀
"""
from typing import Optional, List

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def flatten(root: Optional[TreeNode]) -> None:
    """모리스 순회 기반 O(1) 공간"""
    current = root
    while current:
        if current.left:
            # 왼쪽 서브트리의 가장 오른쪽 노드 찾기
            rightmost = current.left
            while rightmost.right:
                rightmost = rightmost.right
            # 현재의 오른쪽을 왼쪽 서브트리의 가장 오른쪽에 연결
            rightmost.right = current.right
            current.right = current.left
            current.left = None
        current = current.right

def tree_to_list(root: Optional[TreeNode]) -> List[int]:
    """검증용: 연결 리스트를 배열로 변환"""
    result = []
    while root:
        result.append(root.val)
        assert root.left is None, "left must be None"
        root = root.right
    return result

if __name__ == "__main__":
    #     1
    #    / \\
    #   2   5
    #  / \\   \\
    # 3   4   6
    root = TreeNode(1,
        TreeNode(2, TreeNode(3), TreeNode(4)),
        TreeNode(5, None, TreeNode(6)))
    flatten(root)
    assert tree_to_list(root) == [1, 2, 3, 4, 5, 6]
    # 빈 트리
    flatten(None)
    # 단일 노드
    single = TreeNode(0)
    flatten(single)
    assert tree_to_list(single) == [0]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
