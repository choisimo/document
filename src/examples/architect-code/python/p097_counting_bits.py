"""
문제 097: 비트 카운팅 (Counting Bits)
[문제] 0부터 n까지 각 정수의 1-비트 개수를 배열로 반환하라.
[아키텍트의 시선] DP와 비트 연산의 결합.
dp[i] = dp[i >> 1] + (i & 1) — 이전 결과 재활용.
또는 dp[i] = dp[i & (i-1)] + 1 — 최하위 비트 제거.
실무: 에러 율 계산, 해밍 가중치, 비트맵 인덱스.
[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import List

def count_bits(n: int) -> List[int]:
    """DP: dp[i] = dp[i >> 1] + (i & 1)"""
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i >> 1] + (i & 1)
    return dp

def count_bits_v2(n: int) -> List[int]:
    """DP: dp[i] = dp[i & (i-1)] + 1"""
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i & (i - 1)] + 1
    return dp

if __name__ == "__main__":
    assert count_bits(2) == [0, 1, 1]
    assert count_bits(5) == [0, 1, 1, 2, 1, 2]
    assert count_bits_v2(5) == [0, 1, 1, 2, 1, 2]
    assert count_bits(0) == [0]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
