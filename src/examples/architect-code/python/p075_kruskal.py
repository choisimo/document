"""
문제 075: 크루스칼 알고리즘 (Kruskal's MST)
[문제] 가중 무방향 그래프에서 최소 신장 트리(MST)를 구하라.
[아키텍트의 시선] 간선 기반 탐욕 + Union-Find.
가중치 오름차순 정렬 → 사이클을 만들지 않는 간선만 선택.
Union-Find로 사이클 판별 O(alpha(n)) ≈ O(1).
실무: 네트워크 케이블 최소 비용, 클러스터링, 전력망 설계.
[시간 복잡도] O(E log E) [공간 복잡도] O(V+E)
"""
from typing import List, Tuple

class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 경로 압축
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        px, py = self.find(x), self.find(y)
        if px == py:
            return False  # 이미 같은 집합
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True

def kruskal(n: int, edges: List[Tuple[int, int, int]]) -> Tuple[int, List[Tuple[int, int, int]]]:
    """n=정점 수, edges=[(u, v, w), ...] → (총 비용, MST 간선들)"""
    edges_sorted = sorted(edges, key=lambda e: e[2])
    uf = UnionFind(n)
    mst = []
    total_cost = 0

    for u, v, w in edges_sorted:
        if uf.union(u, v):
            mst.append((u, v, w))
            total_cost += w
            if len(mst) == n - 1:
                break

    return total_cost, mst

if __name__ == "__main__":
    # 0-1(4), 0-2(1), 1-2(2), 1-3(5), 2-3(3)
    edges = [(0,1,4), (0,2,1), (1,2,2), (1,3,5), (2,3,3)]
    cost, mst = kruskal(4, edges)
    assert cost == 6  # 0-2(1) + 1-2(2) + 2-3(3)
    assert len(mst) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
