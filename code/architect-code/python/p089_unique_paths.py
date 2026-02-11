"""
문제 089: 고유 경로 (Unique Paths)
[문제] m x n 격자의 좌상단에서 우하단까지 오른쪽/아래로만 이동하는 경로 수를 구하라.
[아키텍트의 시선] 격자 DP와 조합론.
dp[i][j] = dp[i-1][j] + dp[i][j-1]. 조합론: C(m+n-2, m-1).
1D 최적화: dp[j] += dp[j-1].
실무: 네트워크 패킷 경로 수, 격자 기반 라우팅, 확률 계산.
[시간 복잡도] O(m*n) DP / O(min(m,n)) 조합 [공간 복잡도] O(n)
"""
from math import comb

def unique_paths_dp(m: int, n: int) -> int:
    """1D DP"""
    dp = [1] * n
    for i in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j-1]
    return dp[n-1]

def unique_paths_math(m: int, n: int) -> int:
    """조합론: C(m+n-2, m-1)"""
    return comb(m + n - 2, m - 1)

def unique_paths_obstacles(grid: list) -> int:
    """장애물이 있는 격자"""
    m, n = len(grid), len(grid[0])
    if grid[0][0] == 1:
        return 0
    dp = [0] * n
    dp[0] = 1
    for i in range(m):
        for j in range(n):
            if grid[i][j] == 1:
                dp[j] = 0
            elif j > 0:
                dp[j] += dp[j-1]
    return dp[n-1]

if __name__ == "__main__":
    assert unique_paths_dp(3, 7) == 28
    assert unique_paths_math(3, 7) == 28
    assert unique_paths_dp(3, 2) == 3
    assert unique_paths_math(3, 2) == 3
    # 장애물
    assert unique_paths_obstacles([[0,0,0],[0,1,0],[0,0,0]]) == 2
    assert unique_paths_obstacles([[1]]) == 0
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
