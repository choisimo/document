"""
==========================================================
문제 028: 두 배열의 교집합 (Intersection of Two Arrays II)
==========================================================

[문제 설명]
두 배열의 교집합을 구하라 (중복 포함).

[아키텍트의 시선 - 멀티셋 연산과 데이터 조인 전략]
해시맵으로 빈도수 카운팅 → SQL의 INNER JOIN과 동일.
실무: DB 조인 최적화, 집합 연산, 데이터 매칭.

[시간 복잡도] O(m+n) [공간 복잡도] O(min(m,n))
"""
from typing import List
from collections import Counter


def intersect(nums1: List[int], nums2: List[int]) -> List[int]:
    counts = Counter(nums1)
    result = []
    for num in nums2:
        if counts[num] > 0:
            result.append(num)
            counts[num] -= 1
    return result


if __name__ == "__main__":
    assert sorted(intersect([1, 2, 2, 1], [2, 2])) == [2, 2]
    assert sorted(intersect([4, 9, 5], [9, 4, 9, 8, 4])) == [4, 9]
    print("✓ 모든 테스트 통과!")
