"""
문제 071: 다익스트라 알고리즘 (Dijkstra's Shortest Path)
[문제] 가중 그래프에서 시작 정점으로부터 모든 정점까지의 최단 거리를 구하라.
[아키텍트의 시선] 라우팅과 최단 경로.
탐욕+우선순위 큐: 현재까지 가장 가까운 미방문 정점부터 처리.
음수 가중치 불가 → 한 번 확정된 거리는 변하지 않음(탐욕 성질).
실무: 네트워크 라우팅(OSPF), GPS 내비게이션, CDN 서버 선택.
[시간 복잡도] O((V+E) log V) [공간 복잡도] O(V+E)
"""
from typing import List, Dict, Tuple
import heapq
from collections import defaultdict

def dijkstra(graph: Dict[int, List[Tuple[int, int]]], start: int) -> Dict[int, int]:
    """다익스트라: graph[u] = [(v, weight), ...]"""
    dist = {start: 0}
    pq = [(0, start)]  # (거리, 노드)

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float('inf')):
            continue  # 이미 더 짧은 경로로 처리됨
        for v, w in graph.get(u, []):
            new_dist = d + w
            if new_dist < dist.get(v, float('inf')):
                dist[v] = new_dist
                heapq.heappush(pq, (new_dist, v))

    return dist

def dijkstra_with_path(graph: Dict[int, List[Tuple[int, int]]], start: int, end: int) -> Tuple[int, List[int]]:
    """경로 추적 포함 다익스트라"""
    dist = {start: 0}
    prev = {start: None}
    pq = [(0, start)]

    while pq:
        d, u = heapq.heappop(pq)
        if u == end:
            break
        if d > dist.get(u, float('inf')):
            continue
        for v, w in graph.get(u, []):
            new_dist = d + w
            if new_dist < dist.get(v, float('inf')):
                dist[v] = new_dist
                prev[v] = u
                heapq.heappush(pq, (new_dist, v))

    if end not in dist:
        return -1, []
    path = []
    node = end
    while node is not None:
        path.append(node)
        node = prev[node]
    return dist[end], path[::-1]

if __name__ == "__main__":
    graph = {
        0: [(1, 4), (2, 1)],
        1: [(3, 1)],
        2: [(1, 2), (3, 5)],
        3: [(4, 3)],
        4: []
    }
    dist = dijkstra(graph, 0)
    assert dist[0] == 0
    assert dist[1] == 3  # 0→2→1
    assert dist[3] == 4  # 0→2→1→3
    assert dist[4] == 7  # 0→2→1→3→4
    cost, path = dijkstra_with_path(graph, 0, 4)
    assert cost == 7
    assert path == [0, 2, 1, 3, 4]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
