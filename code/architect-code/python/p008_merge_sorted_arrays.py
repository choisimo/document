"""
==========================================================
문제 008: 배열 합치기 (Merge Sorted Arrays)
==========================================================

[문제 설명]
정렬된 두 배열 nums1(크기 m+n), nums2(크기 n)를 nums1에 in-place 병합.
nums1의 뒤쪽에 0으로 채워진 공간이 확보되어 있다.

[아키텍트의 시선 - 역방향 포인터와 병합 전략]
앞에서부터 병합하면 기존 데이터를 덮어쓴다 → 역방향(뒤→앞)으로 병합.
실무: 외부 정렬(External Sort)의 병합 단계,
CQRS 패턴에서 이벤트 병합 시 동일 패턴.

[시간 복잡도] O(m+n) [공간 복잡도] O(1)
"""

from typing import List


def merge(nums1: List[int], m: int, nums2: List[int], n: int) -> None:
    p1, p2, p = m - 1, n - 1, m + n - 1

    while p2 >= 0:
        if p1 >= 0 and nums1[p1] > nums2[p2]:
            nums1[p] = nums1[p1]
            p1 -= 1
        else:
            nums1[p] = nums2[p2]
            p2 -= 1
        p -= 1


if __name__ == "__main__":
    nums1 = [1, 2, 3, 0, 0, 0]
    merge(nums1, 3, [2, 5, 6], 3)
    assert nums1 == [1, 2, 2, 3, 5, 6]

    nums2 = [1]
    merge(nums2, 1, [], 0)
    assert nums2 == [1]

    nums3 = [0]
    merge(nums3, 0, [1], 1)
    assert nums3 == [1]

    print("✓ 모든 테스트 통과!")
