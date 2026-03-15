"""
문제 066: 너비 우선 탐색 (BFS - Breadth First Search)
[문제] 그래프에서 시작 정점으로부터 BFS를 수행하고, 최단 거리를 구하라.
[아키텍트의 시선] 계층적 탐색과 최단 경로.
BFS = 레벨별 탐색. 가중치 없는 그래프에서 최단 경로 보장.
큐 기반 → FIFO 순서가 '가까운 것 먼저' 보장.
실무: 소셜 네트워크 촌수, 네트워크 홉 수, 최단 경로 라우팅.
[시간 복잡도] O(V+E) [공간 복잡도] O(V)
"""

from typing import List, Dict, Set
from collections import deque, defaultdict


def bfs(graph: Dict[int, List[int]], start: int) -> List[int]:
    """BFS 순회 순서 반환"""
    visited = set([start])
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in sorted(graph.get(node, [])):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order


def bfs_shortest_distance(graph: Dict[int, List[int]], start: int) -> Dict[int, int]:
    """시작점에서 각 노드까지의 최단 거리"""
    dist = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph.get(node, []):
            if neighbor not in dist:
                dist[neighbor] = dist[node] + 1
                queue.append(neighbor)
    return dist


if __name__ == "__main__":
    graph = {0: [1, 2], 1: [0, 3, 4], 2: [0, 4], 3: [1, 5], 4: [1, 2, 5], 5: [3, 4]}
    order = bfs(graph, 0)
    assert order[0] == 0
    assert set(order) == {0, 1, 2, 3, 4, 5}
    dist = bfs_shortest_distance(graph, 0)
    assert dist[0] == 0
    assert dist[1] == 1
    assert dist[3] == 2
    assert dist[5] == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
