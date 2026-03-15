"""
문제 080: K 경유 최소 비용 항공편 (Cheapest Flights Within K Stops)
[문제] n개 도시, flights[i]=[from, to, price]. src에서 dst까지
       최대 K번 경유하여 갈 수 있는 최소 비용을 구하라.
[아키텍트의 시선] 제약 조건부 멀티홉 라우팅.
벨만-포드 변형: K+1회만 완화. 각 라운드에서 이전 라운드 결과만 사용.
또는 BFS + 레벨 제한. 다익스트라는 K 제한이 어려움.
실무: 네트워크 홉 제한 라우팅, TTL 기반 패킷 전달, CDN 경유 수 제한.
[시간 복잡도] O(K*E) [공간 복잡도] O(V)
"""
from typing import List

def find_cheapest_price(n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
    """벨만-포드 변형: K+1회 완화"""
    INF = float('inf')
    dist = [INF] * n
    dist[src] = 0

    for _ in range(k + 1):
        temp = dist[:]  # 이전 라운드 결과 복사 (핵심!)
        for u, v, w in flights:
            if dist[u] != INF and dist[u] + w < temp[v]:
                temp[v] = dist[u] + w
        dist = temp

    return dist[dst] if dist[dst] != INF else -1

if __name__ == "__main__":
    flights = [[0,1,100],[1,2,100],[0,2,500]]
    assert find_cheapest_price(3, flights, 0, 2, 1) == 200  # 0→1→2
    assert find_cheapest_price(3, flights, 0, 2, 0) == 500  # 직항만
    flights2 = [[0,1,1],[0,2,5],[1,2,1],[2,3,1]]
    assert find_cheapest_price(4, flights2, 0, 3, 1) == 6  # 0→2→3
    assert find_cheapest_price(4, flights2, 0, 3, 2) == 3  # 0→1→2→3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
