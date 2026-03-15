"""
==========================================================
문제 026: 최장 연속 수열 (Longest Consecutive Sequence)
==========================================================

[문제 설명]
정렬되지 않은 배열에서 가장 긴 연속 수열의 길이를 O(n)에 구하라.

[아키텍트의 시선 - 시퀀스 시작점 탐지와 유니온 파인드]
해시셋에 모든 값 저장 → num-1이 없는 값이 시퀀스 시작점.
시작점에서만 확장하므로 각 원소 최대 2번 접근 → O(n).
실무: 이벤트 시퀀스 탐지, 로그 연속 패턴 분석.

[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import List


def longest_consecutive(nums: List[int]) -> int:
    num_set = set(nums)
    max_length = 0

    for num in num_set:
        if num - 1 not in num_set:  # 시퀀스 시작점만 처리
            current = num
            length = 1
            while current + 1 in num_set:
                current += 1
                length += 1
            max_length = max(max_length, length)

    return max_length


if __name__ == "__main__":
    assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4
    assert longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]) == 9
    assert longest_consecutive([]) == 0
    print("✓ 모든 테스트 통과!")
