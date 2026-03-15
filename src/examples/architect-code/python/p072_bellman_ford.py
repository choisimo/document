"""
문제 072: 벨만-포드 알고리즘 (Bellman-Ford)
[문제] 음수 가중치를 포함한 그래프에서 최단 거리를 구하고, 음수 사이클을 탐지하라.
[아키텍트의 시선] 완화(Relaxation) 기반 수렴.
V-1회 모든 간선 완화 → 최단 거리 수렴. V번째 완화 시 갱신 발생 = 음수 사이클.
다익스트라보다 느리지만 음수 가중치 허용 → 유연성 vs 성능 트레이드오프.
실무: 환율 차익거래 탐지, 네트워크 비용 최적화 (RIP 프로토콜).
[시간 복잡도] O(V*E) [공간 복잡도] O(V)
"""
from typing import List, Tuple, Dict, Optional

def bellman_ford(n: int, edges: List[Tuple[int, int, int]], src: int) -> Optional[Dict[int, float]]:
    """edges = [(u, v, w), ...], n = 정점 수, src = 시작점
    음수 사이클이면 None 반환"""
    dist = {i: float('inf') for i in range(n)}
    dist[src] = 0

    # V-1회 완화
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w

    # 음수 사이클 탐지: V번째 완화에서 갱신 발생 시
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None  # 음수 사이클 존재

    return dist

if __name__ == "__main__":
    # 기본 테스트
    edges = [(0,1,4), (0,2,1), (2,1,2), (1,3,1), (2,3,5), (3,4,3)]
    dist = bellman_ford(5, edges, 0)
    assert dist is not None
    assert dist[0] == 0
    assert dist[1] == 3
    assert dist[3] == 4
    assert dist[4] == 7
    # 음수 가중치 (사이클 없음)
    edges2 = [(0,1,1), (1,2,-1), (0,2,3)]
    dist2 = bellman_ford(3, edges2, 0)
    assert dist2 is not None
    assert dist2[2] == 0  # 0→1→2 = 1+(-1) = 0
    # 음수 사이클 탐지
    edges3 = [(0,1,1), (1,2,-1), (2,0,-1)]
    assert bellman_ford(3, edges3, 0) is None
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
