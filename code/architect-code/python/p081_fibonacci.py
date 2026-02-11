"""
문제 081: 피보나치 최적화 (Fibonacci Optimization)
[문제] n번째 피보나치 수를 O(log n)에 구하라. 재귀/반복/행렬 거듭제곱 비교.
[아키텍트의 시선] Top-down vs Bottom-up vs 행렬 거듭제곱.
재귀+메모이제이션(Top-down): 호출 스택 O(n), 직관적.
반복(Bottom-up): 공간 O(1), 실용적.
행렬 거듭제곱: O(log n), 이론적 최적 → 대규모 n에 필수.
실무: 분할 정복의 본질, 상태 전이의 행렬 표현.
[시간 복잡도] O(log n) 행렬 / O(n) 반복 [공간 복잡도] O(1)
"""
from typing import List

def fib_recursive(n: int, memo: dict = None) -> int:
    """Top-down 메모이제이션"""
    if memo is None:
        memo = {}
    if n <= 1:
        return n
    if n in memo:
        return memo[n]
    memo[n] = fib_recursive(n-1, memo) + fib_recursive(n-2, memo)
    return memo[n]

def fib_iterative(n: int) -> int:
    """Bottom-up O(1) 공간"""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

def matrix_mult(A: List[List[int]], B: List[List[int]]) -> List[List[int]]:
    """2x2 행렬 곱셈"""
    return [
        [A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]],
        [A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]]
    ]

def matrix_pow(M: List[List[int]], p: int) -> List[List[int]]:
    """행렬 거듭제곱 O(log p)"""
    result = [[1,0],[0,1]]  # 단위 행렬
    while p > 0:
        if p % 2 == 1:
            result = matrix_mult(result, M)
        M = matrix_mult(M, M)
        p //= 2
    return result

def fib_matrix(n: int) -> int:
    """행렬 거듭제곱 O(log n)"""
    if n <= 1:
        return n
    M = [[1,1],[1,0]]
    result = matrix_pow(M, n - 1)
    return result[0][0]

if __name__ == "__main__":
    for n, expected in [(0,0),(1,1),(2,1),(5,5),(10,55),(20,6765)]:
        assert fib_recursive(n) == expected
        assert fib_iterative(n) == expected
        assert fib_matrix(n) == expected
    assert fib_matrix(50) == 12586269025
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
