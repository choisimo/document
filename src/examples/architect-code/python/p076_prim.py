"""
문제 076: 프림 알고리즘 (Prim's MST)
[문제] 가중 무방향 그래프에서 프림 알고리즘으로 MST를 구하라.
[아키텍트의 시선] 정점 기반 네트워크 확장.
임의의 정점에서 시작 → 현재 MST와 연결된 최소 가중치 간선 선택.
우선순위 큐로 최소 간선 효율적 추출.
크루스칼(간선 중심) vs 프림(정점 중심): 밀집 그래프에서 프림이 유리.
실무: 네트워크 확장 설계, 점진적 인프라 구축.
[시간 복잡도] O((V+E) log V) [공간 복잡도] O(V+E)
"""
from typing import List, Tuple, Dict
import heapq
from collections import defaultdict

def prim(n: int, edges: List[Tuple[int, int, int]]) -> Tuple[int, List[Tuple[int, int, int]]]:
    """n=정점 수, edges=[(u, v, w), ...] → (총 비용, MST 간선들)"""
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((w, v))
        graph[v].append((w, u))

    visited = set()
    mst = []
    total_cost = 0
    # (가중치, 현재 노드, 이전 노드)
    pq = [(0, 0, -1)]

    while pq and len(visited) < n:
        w, u, prev = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        total_cost += w
        if prev != -1:
            mst.append((prev, u, w))
        for weight, v in graph[u]:
            if v not in visited:
                heapq.heappush(pq, (weight, v, u))

    return total_cost, mst

if __name__ == "__main__":
    edges = [(0,1,4), (0,2,1), (1,2,2), (1,3,5), (2,3,3)]
    cost, mst = prim(4, edges)
    assert cost == 6  # 같은 MST: 비용 6
    assert len(mst) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
