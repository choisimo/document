"""
문제 088: 집 도둑 (House Robber)
[문제] 일렬 집들의 금액 nums[]에서 인접한 집을 털 수 없을 때 최대 금액을 구하라.
[아키텍트의 시선] 상태 정의의 핵심 — 선택/비선택 DP.
dp[i] = max(dp[i-1], dp[i-2] + nums[i])
'현재를 선택하면 이전 불가, 선택 안 하면 이전까지의 최적 유지'
실무: 자원 할당에서 충돌 제약, 스케줄링 제약, 독립 집합 최적화.
[시간 복잡도] O(n) [공간 복잡도] O(1)
"""
from typing import List

def rob(nums: List[int]) -> int:
    """선형 배열"""
    if not nums:
        return 0
    if len(nums) <= 2:
        return max(nums)
    prev2, prev1 = nums[0], max(nums[0], nums[1])
    for i in range(2, len(nums)):
        curr = max(prev1, prev2 + nums[i])
        prev2, prev1 = prev1, curr
    return prev1

def rob_circular(nums: List[int]) -> int:
    """원형 배열 (House Robber II)"""
    if len(nums) == 1:
        return nums[0]
    def rob_range(start, end):
        prev2 = prev1 = 0
        for i in range(start, end):
            curr = max(prev1, prev2 + nums[i])
            prev2, prev1 = prev1, curr
        return prev1
    return max(rob_range(0, len(nums)-1), rob_range(1, len(nums)))

if __name__ == "__main__":
    assert rob([1,2,3,1]) == 4  # 1+3
    assert rob([2,7,9,3,1]) == 12  # 2+9+1
    assert rob([2,1,1,2]) == 4  # 2+2
    # 원형
    assert rob_circular([2,3,2]) == 3
    assert rob_circular([1,2,3,1]) == 4
    assert rob_circular([1,2,3]) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
