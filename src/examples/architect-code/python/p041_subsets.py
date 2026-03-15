"""
문제 041: 부분 집합 (Subsets)
[문제] 중복 없는 정수 배열의 모든 부분집합을 구하라.
[아키텍트의 시선] 비트마스크와 포함/배제 패턴. 2^n개 상태 열거.
실무: 기능 플래그 조합, A/B 테스트 조합, 설정 조합 탐색.
[시간 복잡도] O(n * 2^n) [공간 복잡도] O(n * 2^n)
"""
from typing import List

def subsets(nums: List[int]) -> List[List[int]]:
    result = []
    def backtrack(start, current):
        result.append(current[:])
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()
    backtrack(0, [])
    return result

def subsets_bitmask(nums: List[int]) -> List[List[int]]:
    n = len(nums)
    return [[nums[j] for j in range(n) if i & (1 << j)] for i in range(1 << n)]

if __name__ == "__main__":
    r = subsets([1, 2, 3])
    assert len(r) == 8
    assert [] in r and [1, 2, 3] in r
    assert len(subsets_bitmask([1, 2, 3])) == 8
    print("✓ 모든 테스트 통과!")
