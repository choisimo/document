"""
==========================================================
문제 034: 이진 탐색 (Binary Search)
==========================================================
[문제] 정렬된 배열에서 목표값의 인덱스를 찾아라.
[아키텍트의 시선 - 탐색 공간 축소와 루프 불변식]
매 반복마다 탐색 범위를 절반으로 축소 → O(log n).
불변식: target이 존재한다면 [left, right] 범위 안에 있다.
[시간 복잡도] O(log n) [공간 복잡도] O(1)
"""
from typing import List

def binary_search(nums: List[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def lower_bound(nums: List[int], target: int) -> int:
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left

if __name__ == "__main__":
    assert binary_search([-1, 0, 3, 5, 9, 12], 9) == 4
    assert binary_search([-1, 0, 3, 5, 9, 12], 2) == -1
    assert lower_bound([1, 2, 2, 2, 3], 2) == 1
    print("✓ 모든 테스트 통과!")
