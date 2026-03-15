"""
문제 078: 네트워크 지연 시간 (Network Delay Time)
[문제] N개 노드의 네트워크에서 K번 노드에서 신호를 보낼 때
       모든 노드가 수신하는 최소 시간을 구하라. 불가능하면 -1.
[아키텍트의 시선] 전파 시뮬레이션과 다익스트라 응용.
다익스트라로 시작점에서 모든 노드까지 최단 거리 → 그 중 최대값 = 답.
도달 불가 노드 존재 시 -1.
실무: CDN 전파 시간, 분산 시스템 합의 시간, 장애 전파 분석.
[시간 복잡도] O((V+E) log V) [공간 복잡도] O(V+E)
"""
from typing import List
import heapq
from collections import defaultdict

def network_delay_time(times: List[List[int]], n: int, k: int) -> int:
    """times = [[u, v, w], ...], n = 노드 수, k = 시작 노드"""
    graph = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))

    dist = {}
    pq = [(0, k)]

    while pq:
        d, u = heapq.heappop(pq)
        if u in dist:
            continue
        dist[u] = d
        for v, w in graph[u]:
            if v not in dist:
                heapq.heappush(pq, (d + w, v))

    if len(dist) != n:
        return -1
    return max(dist.values())

if __name__ == "__main__":
    assert network_delay_time([[2,1,1],[2,3,1],[3,4,1]], 4, 2) == 2
    assert network_delay_time([[1,2,1]], 2, 2) == -1  # 2에서 1 도달 불가
    assert network_delay_time([[1,2,1],[2,3,2],[1,3,4]], 3, 1) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
