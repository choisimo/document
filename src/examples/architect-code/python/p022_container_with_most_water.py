"""
==========================================================
문제 022: 물 담기 (Container With Most Water)
==========================================================

[문제 설명]
높이 배열이 주어질 때, 가장 많은 물을 담을 수 있는 두 벽을 찾아라.

[아키텍트의 시선 - 탐욕적 수축과 최적 부분 구조]
양 끝에서 시작하여 짧은 쪽을 안쪽으로 이동 (더 높은 벽을 찾아).
짧은 벽을 유지하면 면적이 절대 증가할 수 없으므로 안전한 탐욕 선택.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""
from typing import List


def max_area(height: List[int]) -> int:
    left, right = 0, len(height) - 1
    max_water = 0

    while left < right:
        w = right - left
        h = min(height[left], height[right])
        max_water = max(max_water, w * h)

        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return max_water


if __name__ == "__main__":
    assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49
    assert max_area([1, 1]) == 1
    assert max_area([4, 3, 2, 1, 4]) == 16
    print("✓ 모든 테스트 통과!")
