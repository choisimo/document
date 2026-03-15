"""
문제 069: 그래프 복제 (Clone Graph)
[문제] 무방향 연결 그래프를 깊은 복사(deep copy)하라.
[아키텍트의 시선] 깊은 복사와 순환 참조 처리.
해시맵으로 원본→복사본 매핑. DFS/BFS로 순회하며 이미 복사한 노드는 재사용.
순환 참조가 있어도 무한 루프 방지 → visited 맵이 핵심.
실무: 객체 그래프 직렬화, 프로토타입 패턴, 스냅샷 생성.
[시간 복잡도] O(V+E) [공간 복잡도] O(V)
"""
from typing import Optional, Dict

class Node:
    def __init__(self, val: int = 0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def clone_graph(node: Optional[Node]) -> Optional[Node]:
    """DFS + 해시맵 방식"""
    if not node:
        return None
    cloned: Dict[Node, Node] = {}

    def dfs(original: Node) -> Node:
        if original in cloned:
            return cloned[original]
        copy = Node(original.val)
        cloned[original] = copy
        for neighbor in original.neighbors:
            copy.neighbors.append(dfs(neighbor))
        return copy

    return dfs(node)

if __name__ == "__main__":
    # 1 -- 2
    # |    |
    # 4 -- 3
    n1, n2, n3, n4 = Node(1), Node(2), Node(3), Node(4)
    n1.neighbors = [n2, n4]
    n2.neighbors = [n1, n3]
    n3.neighbors = [n2, n4]
    n4.neighbors = [n1, n3]
    clone = clone_graph(n1)
    # 값 동일 확인
    assert clone.val == 1
    assert len(clone.neighbors) == 2
    # 참조 다름 확인 (깊은 복사)
    assert clone is not n1
    assert clone.neighbors[0] is not n2
    # None 처리
    assert clone_graph(None) is None
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
