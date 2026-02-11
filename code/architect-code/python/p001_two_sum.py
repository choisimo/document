"""
==========================================================
문제 001: 두 수의 합 (Two Sum)
==========================================================

[문제 설명]
정수 배열 nums와 정수 target이 주어질 때,
합이 target이 되는 두 수의 인덱스를 반환하라.
각 입력에 대해 정확히 하나의 해가 존재하며, 같은 원소를 두 번 사용할 수 없다.

[아키텍트의 시선 - 인덱싱 전략과 조회 최적화]
이 문제는 "조회(Lookup)" 비용을 어떻게 줄이느냐의 핵심을 보여준다.
- 브루트포스: O(n²) - 모든 쌍을 비교 (중첩 루프)
- 해시맵: O(n) - "내가 찾는 값이 이미 등장했는가?"를 O(1)로 확인

실무에서 이 패턴은:
- DB 인덱스 설계 (조회 비용 O(n) → O(log n) → O(1))
- 캐시 레이어 (Redis, Memcached)의 존재 이유
- API Gateway의 라우팅 테이블

핵심 교훈: "반복 탐색"이 보이면 "해시맵으로 인덱싱"을 고려하라.

[시간 복잡도] O(n) - 배열 한 번 순회
[공간 복잡도] O(n) - 해시맵 저장 공간
"""

from typing import List


def two_sum(nums: List[int], target: int) -> List[int]:
    """
    해시맵을 사용한 Two Sum 풀이.

    전략: 배열을 순회하면서, 현재 숫자의 "보수(complement)"가
    이미 해시맵에 존재하는지 확인한다.

    complement = target - current_number
    """
    # 해시맵: {값: 인덱스} 매핑
    seen = {}

    for i, num in enumerate(nums):
        complement = target - num

        # 보수가 이미 등장했는가? → O(1) 조회
        if complement in seen:
            return [seen[complement], i]

        # 현재 값을 인덱싱 (나중에 누군가의 보수가 될 수 있음)
        seen[num] = i

    # 해가 없는 경우 (문제 조건상 발생하지 않음)
    return []


def two_sum_brute_force(nums: List[int], target: int) -> List[int]:
    """
    브루트포스 비교용: O(n²) 풀이.
    아키텍트 관점에서 "왜 해시맵이 필요한가"를 체감하기 위한 대조군.
    """
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []


if __name__ == "__main__":
    # 테스트 케이스 1: 기본
    assert two_sum([2, 7, 11, 15], 9) == [0, 1], "테스트 1 실패"

    # 테스트 케이스 2: 중간 위치
    assert two_sum([3, 2, 4], 6) == [1, 2], "테스트 2 실패"

    # 테스트 케이스 3: 같은 값 두 개
    assert two_sum([3, 3], 6) == [0, 1], "테스트 3 실패"

    # 테스트 케이스 4: 음수 포함
    assert two_sum([-1, -2, -3, -4, -5], -8) == [2, 4], "테스트 4 실패"

    # 테스트 케이스 5: 큰 배열
    large = list(range(10000))
    assert two_sum(large, 19997) == [9998, 9999], "테스트 5 실패"

    print("✓ 모든 테스트 통과!")
    print()
    print("=== 아키텍트 핵심 정리 ===")
    print("1. 해시맵은 '이미 본 것'을 O(1)에 찾는 인덱스다")
    print("2. complement 패턴: target - current → 역방향 사고")
    print("3. 실무 적용: DB 인덱스, 캐시, 라우팅 테이블 모두 같은 원리")
