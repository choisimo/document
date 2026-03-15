"""
==========================================================
문제 035: 회전 정렬 배열 탐색 (Search in Rotated Sorted Array)
==========================================================
[문제] 한 지점에서 회전된 정렬 배열에서 목표값을 O(log n)에 찾아라.
[아키텍트의 시선 - 조건부 탐색 공간 분할]
배열을 반으로 나누면 한쪽은 반드시 정렬. 정렬된 쪽에서 target 포함 여부 판단.
[시간 복잡도] O(log n) [공간 복잡도] O(1)
"""
from typing import List

def search(nums: List[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1

if __name__ == "__main__":
    assert search([4, 5, 6, 7, 0, 1, 2], 0) == 4
    assert search([4, 5, 6, 7, 0, 1, 2], 3) == -1
    assert search([1], 0) == -1
    print("✓ 모든 테스트 통과!")
