"""
문제 058: 트리 직렬화/역직렬화 (Serialize and Deserialize Binary Tree)
[문제] 이진 트리를 문자열로 직렬화하고 다시 트리로 복원하라.
[아키텍트의 시선] 데이터 교환 프로토콜 설계.
구조 데이터를 문자열로 변환 → 네트워크 전송 → 복원. JSON, Protobuf의 본질.
전위 순회 + null 마커로 트리 구조를 완벽히 보존.
실무: RPC 직렬화, 캐시 저장/복원, 세션 상태 전이.
[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import Optional
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        """전위 순회 기반 직렬화"""
        tokens = []
        def dfs(node):
            if not node:
                tokens.append("#")
                return
            tokens.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return ",".join(tokens)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        """토큰 스트림 기반 역직렬화"""
        tokens = deque(data.split(","))
        def dfs():
            token = tokens.popleft()
            if token == "#":
                return None
            node = TreeNode(int(token))
            node.left = dfs()
            node.right = dfs()
            return node
        return dfs()

if __name__ == "__main__":
    #     1
    #    / \\
    #   2   3
    #      / \\
    #     4   5
    root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
    codec = Codec()
    serialized = codec.serialize(root)
    restored = codec.deserialize(serialized)
    assert codec.serialize(restored) == serialized
    assert codec.serialize(None) == "#"
    assert codec.deserialize("#") is None
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
