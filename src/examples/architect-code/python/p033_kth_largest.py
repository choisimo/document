"""
==========================================================
문제 033: K번째 큰 수 (Kth Largest Element - Quick Select)
==========================================================
[문제] 배열에서 K번째로 큰 원소를 O(n) 평균에 찾아라.
[아키텍트의 시선 - 부분 정렬과 기대 시간 복잡도]
전체 정렬 O(n log n) vs Quick Select 평균 O(n).
"전체를 알 필요 없이 원하는 것만 빠르게" → 선택적 계산.
[시간 복잡도] 평균 O(n) [공간 복잡도] O(1)
"""
from typing import List
import random

def find_kth_largest(nums: List[int], k: int) -> int:
    target = len(nums) - k
    def quick_select(left, right):
        pi = random.randint(left, right)
        nums[pi], nums[right] = nums[right], nums[pi]
        pivot = nums[right]
        store = left
        for i in range(left, right):
            if nums[i] <= pivot:
                nums[store], nums[i] = nums[i], nums[store]
                store += 1
        nums[store], nums[right] = nums[right], nums[store]
        if store == target:
            return nums[store]
        elif store < target:
            return quick_select(store + 1, right)
        else:
            return quick_select(left, store - 1)
    return quick_select(0, len(nums) - 1)

if __name__ == "__main__":
    assert find_kth_largest([3, 2, 1, 5, 6, 4], 2) == 5
    assert find_kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4
    print("✓ 모든 테스트 통과!")
