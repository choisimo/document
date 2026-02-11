"""
문제 065: 그래프 표현 (Graph Representation)
[문제] 인접 리스트와 인접 행렬로 그래프를 구현하고, 간선 추가/조회/삭제를 지원하라.
[아키텍트의 시선] 공간-시간 트레이드오프의 전형.
인접 행렬: O(1) 간선 조회, O(V^2) 공간 → 밀집 그래프.
인접 리스트: O(degree) 간선 조회, O(V+E) 공간 → 희소 그래프.
실무: SNS 팔로우(희소→리스트), 게임 맵(밀집→행렬), 마이크로서비스 의존성.
[시간 복잡도] 표현에 따라 다름 [공간 복잡도] O(V+E) 또는 O(V^2)
"""
from typing import List, Set, Dict
from collections import defaultdict

class AdjacencyList:
    """인접 리스트 (희소 그래프용)"""
    def __init__(self, directed: bool = False):
        self.graph: Dict[int, Set[int]] = defaultdict(set)
        self.directed = directed

    def add_edge(self, u: int, v: int) -> None:
        self.graph[u].add(v)
        if not self.directed:
            self.graph[v].add(u)

    def has_edge(self, u: int, v: int) -> bool:
        return v in self.graph[u]

    def remove_edge(self, u: int, v: int) -> None:
        self.graph[u].discard(v)
        if not self.directed:
            self.graph[v].discard(u)

    def neighbors(self, u: int) -> Set[int]:
        return self.graph[u]

class AdjacencyMatrix:
    """인접 행렬 (밀집 그래프용)"""
    def __init__(self, n: int, directed: bool = False):
        self.n = n
        self.matrix = [[0] * n for _ in range(n)]
        self.directed = directed

    def add_edge(self, u: int, v: int) -> None:
        self.matrix[u][v] = 1
        if not self.directed:
            self.matrix[v][u] = 1

    def has_edge(self, u: int, v: int) -> bool:
        return self.matrix[u][v] == 1

    def remove_edge(self, u: int, v: int) -> None:
        self.matrix[u][v] = 0
        if not self.directed:
            self.matrix[v][u] = 0

    def neighbors(self, u: int) -> List[int]:
        return [v for v in range(self.n) if self.matrix[u][v] == 1]

if __name__ == "__main__":
    # 인접 리스트 테스트
    g = AdjacencyList()
    g.add_edge(0, 1)
    g.add_edge(0, 2)
    g.add_edge(1, 2)
    assert g.has_edge(0, 1) == True
    assert g.has_edge(1, 0) == True  # 무방향
    assert g.has_edge(0, 3) == False
    g.remove_edge(0, 1)
    assert g.has_edge(0, 1) == False
    # 인접 행렬 테스트
    m = AdjacencyMatrix(4)
    m.add_edge(0, 1)
    m.add_edge(1, 2)
    assert m.has_edge(0, 1) == True
    assert m.has_edge(2, 3) == False
    assert sorted(m.neighbors(1)) == [0, 2]
    # 방향 그래프
    dg = AdjacencyList(directed=True)
    dg.add_edge(0, 1)
    assert dg.has_edge(0, 1) == True
    assert dg.has_edge(1, 0) == False
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
