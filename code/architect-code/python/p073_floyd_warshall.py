"""
문제 073: 플로이드-워셜 알고리즘 (Floyd-Warshall)
[문제] 모든 정점 쌍 간의 최단 거리를 구하라.
[아키텍트의 시선] 전이적 폐쇄(Transitive Closure)와 DP.
dp[i][j] = min(dp[i][j], dp[i][k] + dp[k][j]) — k를 경유지로 고려.
3중 루프로 모든 쌍 계산 → O(V^3). 밀집 그래프에 적합.
실무: 도시 간 최단 거리, 네트워크 라우팅 테이블, 도달 가능성 분석.
[시간 복잡도] O(V^3) [공간 복잡도] O(V^2)
"""
from typing import List

INF = float('inf')

def floyd_warshall(n: int, edges: List[List[int]]) -> List[List[float]]:
    """edges = [[u, v, w], ...], n = 정점 수"""
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = w

    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist

if __name__ == "__main__":
    edges = [[0,1,3], [0,2,8], [1,2,2], [2,3,1], [3,0,4]]
    dist = floyd_warshall(4, edges)
    assert dist[0][0] == 0
    assert dist[0][1] == 3
    assert dist[0][2] == 5  # 0→1→2
    assert dist[0][3] == 6  # 0→1→2→3
    assert dist[3][1] == 7  # 3→0→1
    assert dist[1][3] == 3  # 1→2→3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
