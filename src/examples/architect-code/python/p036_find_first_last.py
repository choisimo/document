"""
==========================================================
문제 036: 첫/마지막 위치 (Find First and Last Position)
==========================================================
[문제] 정렬된 배열에서 target의 시작/끝 인덱스를 O(log n)에 구하라.
[아키텍트의 시선 - 경계 탐색(Boundary Search)과 범위 쿼리]
lower_bound (첫 번째 위치)와 upper_bound (마지막+1 위치) 패턴.
실무: DB 인덱스 범위 스캔, B-Tree 범위 쿼리.
[시간 복잡도] O(log n) [공간 복잡도] O(1)
"""
from typing import List

def search_range(nums: List[int], target: int) -> List[int]:
    def find_left():
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return lo

    def find_right():
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] <= target:
                lo = mid + 1
            else:
                hi = mid - 1
        return hi

    left, right = find_left(), find_right()
    if left <= right:
        return [left, right]
    return [-1, -1]

if __name__ == "__main__":
    assert search_range([5, 7, 7, 8, 8, 10], 8) == [3, 4]
    assert search_range([5, 7, 7, 8, 8, 10], 6) == [-1, -1]
    assert search_range([], 0) == [-1, -1]
    print("✓ 모든 테스트 통과!")
