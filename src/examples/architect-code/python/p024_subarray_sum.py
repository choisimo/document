"""
==========================================================
문제 024: 부분 배열의 합 (Subarray Sum Equals K)
==========================================================

[문제 설명]
정수 배열에서 합이 k인 연속 부분 배열의 개수를 구하라.

[아키텍트의 시선 - 누적합(Prefix Sum)과 역 매핑 최적화]
prefix_sum[j] - prefix_sum[i] = k → prefix_sum[i] = prefix_sum[j] - k
해시맵으로 "과거의 누적합"을 기록하여 O(1)에 검색.
실무: 시계열 데이터의 구간 합 쿼리, 금융 거래 집계.

[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import List
from collections import defaultdict


def subarray_sum(nums: List[int], k: int) -> int:
    count = 0
    prefix_sum = 0
    prefix_map = defaultdict(int)
    prefix_map[0] = 1

    for num in nums:
        prefix_sum += num
        count += prefix_map[prefix_sum - k]
        prefix_map[prefix_sum] += 1

    return count


if __name__ == "__main__":
    assert subarray_sum([1, 1, 1], 2) == 2
    assert subarray_sum([1, 2, 3], 3) == 2
    assert subarray_sum([1, -1, 0], 0) == 3
    print("✓ 모든 테스트 통과!")
