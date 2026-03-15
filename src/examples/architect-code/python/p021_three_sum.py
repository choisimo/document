"""
==========================================================
문제 021: 세 수의 합 (3Sum)
==========================================================

[문제 설명]
정수 배열에서 합이 0인 고유한 세 수 조합을 모두 찾아라.

[아키텍트의 시선 - 정렬 + 투 포인터와 중복 제거 전략]
정렬 후 하나를 고정, 나머지 둘을 투 포인터로 탐색.
중복 제거: 같은 값 건너뛰기로 O(1) 추가 비용.
실무: 다중 조건 검색에서의 차원 축소 전략.

[시간 복잡도] O(n²) [공간 복잡도] O(1) (결과 제외)
"""
from typing import List


def three_sum(nums: List[int]) -> List[List[int]]:
    nums.sort()
    result = []
    n = len(nums)

    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
    return result


if __name__ == "__main__":
    assert three_sum([-1, 0, 1, 2, -1, -4]) == [[-1, -1, 2], [-1, 0, 1]]
    assert three_sum([0, 1, 1]) == []
    assert three_sum([0, 0, 0]) == [[0, 0, 0]]
    print("✓ 모든 테스트 통과!")
