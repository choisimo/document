"""
문제 042: 순열 (Permutations)
[문제] 중복 없는 정수 배열의 모든 순열을 구하라.
[아키텍트의 시선] 상태 공간 트리와 백트래킹. n! 경우의 수.
실무: 작업 스케줄링 순서 최적화, 조합 최적화 문제.
[시간 복잡도] O(n * n!) [공간 복잡도] O(n!)
"""
from typing import List

def permute(nums: List[int]) -> List[List[int]]:
    result = []
    def backtrack(current, remaining):
        if not remaining:
            result.append(current[:])
            return
        for i in range(len(remaining)):
            current.append(remaining[i])
            backtrack(current, remaining[:i] + remaining[i+1:])
            current.pop()
    backtrack([], nums)
    return result

if __name__ == "__main__":
    r = permute([1, 2, 3])
    assert len(r) == 6
    assert [1, 2, 3] in r and [3, 2, 1] in r
    print("✓ 모든 테스트 통과!")
