"""
==========================================================
문제 004: 최대 부분 배열 합 (Kadane's Algorithm)
==========================================================

[문제 설명]
정수 배열 nums에서 연속 부분 배열의 최대 합을 구하라.

[아키텍트의 시선 - 온라인 알고리즘과 상태 전이]
Kadane's Algorithm은 "온라인 알고리즘"의 전형.
데이터를 한 번만 순회하면서 답을 구한다 (스트리밍 처리).
상태 전이: current_sum = max(num, current_sum + num)
"이전까지의 합을 이어갈 것인가, 여기서 새로 시작할 것인가"

실무: 실시간 모니터링 시스템의 구간 최대값/최소값 추적.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""

from typing import List


def max_subarray(nums: List[int]) -> int:
    current_sum = max_sum = nums[0]

    for num in nums[1:]:
        # 상태 전이: 이어갈 것인가 vs 새로 시작할 것인가
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)

    return max_sum


if __name__ == "__main__":
    assert max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]) == 6  # [4,-1,2,1]
    assert max_subarray([1]) == 1
    assert max_subarray([5, 4, -1, 7, 8]) == 23
    assert max_subarray([-1]) == -1
    assert max_subarray([-2, -1]) == -1  # 모두 음수일 때

    print("✓ 모든 테스트 통과!")
