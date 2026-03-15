"""
문제 051: 트리 순회 (Binary Tree Traversal)
[문제] 이진 트리의 전위/중위/후위/레벨 순회 결과를 각각 반환하라.
[아키텍트의 시선] Visitor Pattern과 순회 전략.
트리 순회는 Visitor 패턴의 본질이다. 전위=루트 먼저(DOM 렌더링),
중위=정렬 순서(BST 출력), 후위=자식 먼저(의존성 해소, GC),
레벨=BFS(계층 탐색, 조직도). 실무에서 AST 파서, 컴파일러, UI 렌더링 트리에 필수.
[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import List, Optional
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def preorder(root: Optional[TreeNode]) -> List[int]:
    """전위 순회: 루트 → 왼쪽 → 오른쪽"""
    result = []
    def dfs(node):
        if not node:
            return
        result.append(node.val)
        dfs(node.left)
        dfs(node.right)
    dfs(root)
    return result

def inorder(root: Optional[TreeNode]) -> List[int]:
    """중위 순회: 왼쪽 → 루트 → 오른쪽"""
    result = []
    def dfs(node):
        if not node:
            return
        dfs(node.left)
        result.append(node.val)
        dfs(node.right)
    dfs(root)
    return result

def postorder(root: Optional[TreeNode]) -> List[int]:
    """후위 순회: 왼쪽 → 오른쪽 → 루트"""
    result = []
    def dfs(node):
        if not node:
            return
        dfs(node.left)
        dfs(node.right)
        result.append(node.val)
    dfs(root)
    return result

def levelorder(root: Optional[TreeNode]) -> List[List[int]]:
    """레벨 순회: BFS 기반"""
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)
    return result

if __name__ == "__main__":
    #       1
    #      / \\
    #     2   3
    #    / \\
    #   4   5
    root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))
    assert preorder(root) == [1, 2, 4, 5, 3]
    assert inorder(root) == [4, 2, 5, 1, 3]
    assert postorder(root) == [4, 5, 2, 3, 1]
    assert levelorder(root) == [[1], [2, 3], [4, 5]]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
