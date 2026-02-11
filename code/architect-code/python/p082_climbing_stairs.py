"""
문제 082: 계단 오르기 (Climbing Stairs)
[문제] n개의 계단을 1칸 또는 2칸씩 올라갈 때, 가능한 방법의 수를 구하라.
[아키텍트의 시선] 상태 전이와 점화식.
dp[i] = dp[i-1] + dp[i-2] — 피보나치와 동일한 점화식.
복잡한 문제를 '마지막 선택'으로 분해하는 DP의 핵심 사고.
실무: 경로 수 계산, 상태 머신 경로 분석, 웹 네비게이션 패턴.
[시간 복잡도] O(n) [공간 복잡도] O(1)
"""

def climb_stairs(n: int) -> int:
    """Bottom-up O(1) 공간"""
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

def climb_stairs_k(n: int, k: int) -> int:
    """일반화: 1~k칸씩 오를 수 있을 때"""
    dp = [0] * (n + 1)
    dp[0] = 1
    for i in range(1, n + 1):
        for step in range(1, min(k, i) + 1):
            dp[i] += dp[i - step]
    return dp[n]

if __name__ == "__main__":
    assert climb_stairs(1) == 1
    assert climb_stairs(2) == 2
    assert climb_stairs(3) == 3
    assert climb_stairs(5) == 8
    assert climb_stairs(10) == 89
    # 일반화 (1~3칸)
    assert climb_stairs_k(3, 3) == 4  # {1+1+1, 1+2, 2+1, 3}
    assert climb_stairs_k(4, 3) == 7
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
