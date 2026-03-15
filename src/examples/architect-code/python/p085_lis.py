"""
문제 085: 최장 증가 부분수열 (Longest Increasing Subsequence)
[문제] 정수 배열에서 가장 긴 순증가 부분수열의 길이를 구하라.
[아키텍트의 시선] Patience Sorting과 이진 탐색 최적화.
O(n^2) DP: dp[i] = max(dp[j]+1) for j < i, nums[j] < nums[i].
O(n log n): tails 배열 + 이진 탐색 → Patience Sorting과 동치.
실무: 버전 관리의 체인 길이, 의존성 최장 경로, 데이터 트렌드 분석.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import List
import bisect

def lis_dp(nums: List[int]) -> int:
    """O(n^2) DP"""
    if not nums:
        return 0
    n = len(nums)
    dp = [1] * n
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

def lis_binary_search(nums: List[int]) -> int:
    """O(n log n) 이진 탐색"""
    tails = []
    for num in nums:
        pos = bisect.bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)

if __name__ == "__main__":
    assert lis_dp([10,9,2,5,3,7,101,18]) == 4  # [2,3,7,101]
    assert lis_binary_search([10,9,2,5,3,7,101,18]) == 4
    assert lis_dp([0,1,0,3,2,3]) == 4
    assert lis_binary_search([0,1,0,3,2,3]) == 4
    assert lis_dp([7,7,7,7]) == 1
    assert lis_binary_search([7,7,7,7]) == 1
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
