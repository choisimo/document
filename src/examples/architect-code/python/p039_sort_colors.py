"""
==========================================================
문제 039: 정렬 색깔 (Dutch National Flag Problem)
==========================================================
[문제] 0, 1, 2로 구성된 배열을 한 번의 순회로 in-place 정렬.
[아키텍트의 시선 - 3-way Partitioning과 단일 패스]
세 포인터: low(0 경계), mid(탐색), high(2 경계).
실무: 다중 분류 문제, 네트워크 패킷 우선순위 분류.
[시간 복잡도] O(n) [공간 복잡도] O(1)
"""
from typing import List

def sort_colors(nums: List[int]) -> None:
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1

if __name__ == "__main__":
    a = [2, 0, 2, 1, 1, 0]
    sort_colors(a)
    assert a == [0, 0, 1, 1, 2, 2]
    b = [2, 0, 1]
    sort_colors(b)
    assert b == [0, 1, 2]
    print("✓ 모든 테스트 통과!")
