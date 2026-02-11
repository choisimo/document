"""
==========================================================
문제 027: 과반수 원소 (Majority Element - Boyer-Moore Voting)
==========================================================

[문제 설명]
배열에서 n/2번 이상 등장하는 원소를 찾아라. 항상 존재한다고 가정.

[아키텍트의 시선 - 스트리밍 알고리즘과 상태 압축]
Boyer-Moore 투표: O(1) 공간으로 과반수 원소 탐지.
"다른 원소와 상쇄" → 과반수는 상쇄 후에도 남는다.
실무: 대규모 분산 시스템의 리더 선출, 네트워크 다수결.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""
from typing import List


def majority_element(nums: List[int]) -> int:
    candidate = None
    count = 0

    for num in nums:
        if count == 0:
            candidate = num
        count += 1 if num == candidate else -1

    return candidate


if __name__ == "__main__":
    assert majority_element([3, 2, 3]) == 3
    assert majority_element([2, 2, 1, 1, 1, 2, 2]) == 2
    assert majority_element([1]) == 1
    print("✓ 모든 테스트 통과!")
