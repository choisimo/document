"""
==========================================================
문제 032: 퀵 정렬 (Quick Sort)
==========================================================
[문제] 배열을 퀵 정렬로 정렬하라. 랜덤 피벗 사용.
[아키텍트의 시선 - 피벗 선택 전략과 최악 케이스 방어]
고정 피벗 → O(n²) 최악. 랜덤 피벗 → 기대 O(n log n).
실무: 대부분의 언어 내장 정렬이 퀵소트 변형 (Timsort, Introsort).
[시간 복잡도] 평균 O(n log n), 최악 O(n²) [공간 복잡도] O(log n) 스택
"""
from typing import List
import random

def quick_sort(arr: List[int]) -> List[int]:
    if len(arr) <= 1:
        return arr
    pivot = random.choice(arr)
    less = [x for x in arr if x < pivot]
    equal = [x for x in arr if x == pivot]
    greater = [x for x in arr if x > pivot]
    return quick_sort(less) + equal + quick_sort(greater)

def quick_sort_inplace(arr: List[int], low: int = 0, high: int = None) -> None:
    if high is None:
        high = len(arr) - 1
    if low < high:
        pi = partition(arr, low, high)
        quick_sort_inplace(arr, low, pi - 1)
        quick_sort_inplace(arr, pi + 1, high)

def partition(arr: List[int], low: int, high: int) -> int:
    ri = random.randint(low, high)
    arr[ri], arr[high] = arr[high], arr[ri]
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

if __name__ == "__main__":
    assert quick_sort([10, 7, 8, 9, 1, 5]) == [1, 5, 7, 8, 9, 10]
    arr = [3, 6, 8, 10, 1, 2, 1]
    quick_sort_inplace(arr)
    assert arr == [1, 1, 2, 3, 6, 8, 10]
    print("✓ 모든 테스트 통과!")
