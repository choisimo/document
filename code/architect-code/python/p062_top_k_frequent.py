"""
문제 062: Top K 빈출 요소 (Top K Frequent Elements)
[문제] 정수 배열에서 가장 빈번한 K개 원소를 반환하라.
[아키텍트의 시선] 부분 정렬과 우선순위 필터링.
전체 정렬(O(n log n)) 대신 힙으로 상위 K개만 유지(O(n log k)).
더 나은 방법: 버킷 정렬 O(n) - 빈도를 인덱스로 사용.
실무: 인기 검색어, 트래픽 상위 URL, 캐시 핫 키 분석.
[시간 복잡도] O(n) 버킷 / O(n log k) 힙 [공간 복잡도] O(n)
"""
from typing import List
from collections import Counter
import heapq

def top_k_frequent_bucket(nums: List[int], k: int) -> List[int]:
    """버킷 정렬 방식 O(n)"""
    count = Counter(nums)
    # 빈도를 인덱스로 사용하는 버킷
    buckets: List[List[int]] = [[] for _ in range(len(nums) + 1)]
    for num, freq in count.items():
        buckets[freq].append(num)
    result = []
    for freq in range(len(buckets) - 1, 0, -1):
        for num in buckets[freq]:
            result.append(num)
            if len(result) == k:
                return result
    return result

def top_k_frequent_heap(nums: List[int], k: int) -> List[int]:
    """힙 방식 O(n log k)"""
    count = Counter(nums)
    return [item for item, _ in heapq.nlargest(k, count.items(), key=lambda x: x[1])]

if __name__ == "__main__":
    assert set(top_k_frequent_bucket([1,1,1,2,2,3], 2)) == {1, 2}
    assert set(top_k_frequent_heap([1,1,1,2,2,3], 2)) == {1, 2}
    assert top_k_frequent_bucket([1], 1) == [1]
    assert set(top_k_frequent_bucket([4,4,4,1,1,2,2,2,3], 2)) == {4, 2}
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
