"""
문제 043: 조합 (Combinations)
[문제] 1~n에서 k개를 선택하는 모든 조합을 구하라.
[아키텍트의 시선] 가지치기로 탐색 공간 축소. 남은 개수 부족 시 조기 종료.
[시간 복잡도] O(C(n,k) * k) [공간 복잡도] O(C(n,k) * k)
"""
from typing import List

def combine(n: int, k: int) -> List[List[int]]:
    result = []
    def backtrack(start, current):
        if len(current) == k:
            result.append(current[:])
            return
        remaining_needed = k - len(current)
        for i in range(start, n - remaining_needed + 2):
            current.append(i)
            backtrack(i + 1, current)
            current.pop()
    backtrack(1, [])
    return result

if __name__ == "__main__":
    assert len(combine(4, 2)) == 6
    assert [1, 2] in combine(4, 2)
    assert len(combine(5, 3)) == 10
    print("✓ 모든 테스트 통과!")
