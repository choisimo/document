"""
==========================================================
문제 031: 병합 정렬 (Merge Sort)
==========================================================
[문제] 배열을 병합 정렬로 정렬하라.
[아키텍트의 시선 - 분할 정복 패러다임과 안정성(Stability)]
분할 → 정복 → 결합. 안정 정렬(같은 값의 상대 순서 유지).
실무: 외부 정렬, 연결 리스트 정렬, MapReduce의 Reduce 단계.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import List

def merge_sort(arr: List[int]) -> List[int]:
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left: List[int], right: List[int]) -> List[int]:
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

if __name__ == "__main__":
    assert merge_sort([38, 27, 43, 3, 9, 82, 10]) == [3, 9, 10, 27, 38, 43, 82]
    assert merge_sort([5, 1, 4, 2, 8]) == [1, 2, 4, 5, 8]
    assert merge_sort([]) == []
    assert merge_sort([1]) == [1]
    print("✓ 모든 테스트 통과!")
