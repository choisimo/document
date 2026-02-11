"""
==========================================================
문제 019: 슬라이딩 윈도우 최대값 (Sliding Window Maximum)
==========================================================

[문제 설명]
배열 nums와 윈도우 크기 k가 주어질 때,
크기 k의 슬라이딩 윈도우가 이동하며 각 위치의 최대값을 반환.

[아키텍트의 시선 - 덱 기반 윈도우 관리와 스트림 처리]
덱(Deque)에 "유망한 후보"만 유지 → 최대값을 O(1)에 조회.
실무: 실시간 모니터링의 이동 평균/최대, 네트워크 패킷 분석.

[시간 복잡도] O(n) [공간 복잡도] O(k)
"""
from typing import List
from collections import deque


def max_sliding_window(nums: List[int], k: int) -> List[int]:
    dq = deque()  # 인덱스 저장, 값 내림차순 유지
    result = []

    for i, num in enumerate(nums):
        # 윈도우 범위 밖의 인덱스 제거
        while dq and dq[0] < i - k + 1:
            dq.popleft()

        # 현재 값보다 작은 뒤쪽 원소 제거 (절대 최대가 될 수 없으므로)
        while dq and nums[dq[-1]] < num:
            dq.pop()

        dq.append(i)

        if i >= k - 1:
            result.append(nums[dq[0]])

    return result


if __name__ == "__main__":
    assert max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3) == [3, 3, 5, 5, 6, 7]
    assert max_sliding_window([1], 1) == [1]
    assert max_sliding_window([9, 11], 2) == [11]

    print("✓ 모든 테스트 통과!")
