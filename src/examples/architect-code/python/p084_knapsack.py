"""
문제 084: 0/1 배낭 문제 (0/1 Knapsack)
[문제] n개 물건(무게 w[i], 가치 v[i])을 용량 W인 배낭에 넣을 때 최대 가치를 구하라.
[아키텍트의 시선] 제약 하 최적화의 원형.
dp[i][w] = max(dp[i-1][w], dp[i-1][w-w[i]] + v[i])
'넣는다/안 넣는다' 이진 선택 → 제약 최적화 문제의 기본 프레임.
1D 배열 최적화: 역순 갱신으로 O(W) 공간.
실무: 예산 배분, 서버 용량 할당, 포트폴리오 최적화.
[시간 복잡도] O(n*W) [공간 복잡도] O(W)
"""
from typing import List

def knapsack_2d(weights: List[int], values: List[int], capacity: int) -> int:
    """2D DP 풀이"""
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i-1][w]  # 안 넣는 경우
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])
    return dp[n][capacity]

def knapsack_1d(weights: List[int], values: List[int], capacity: int) -> int:
    """1D DP 최적화 (역순 갱신)"""
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # 역순!
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]

if __name__ == "__main__":
    weights = [2, 3, 4, 5]
    values = [3, 4, 5, 6]
    assert knapsack_2d(weights, values, 5) == 7  # 물건0+물건1
    assert knapsack_1d(weights, values, 5) == 7
    assert knapsack_2d(weights, values, 8) == 10  # 물건1+물건3 또는 물건0+물건2+...
    assert knapsack_1d(weights, values, 8) == 10
    assert knapsack_1d([], [], 10) == 0
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
