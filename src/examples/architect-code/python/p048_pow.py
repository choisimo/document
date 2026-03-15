"""
문제 048: 거듭제곱 (Pow(x, n))
[문제] x^n을 O(log n)에 계산하라.
[아키텍트의 시선] 분할 정복 거듭제곱 (Fast Exponentiation).
x^n = (x^(n/2))² → 지수를 절반씩 줄임.
실무: 암호학(RSA), 행렬 거듭제곱(피보나치 O(log n)).
[시간 복잡도] O(log n) [공간 복잡도] O(log n) 또는 O(1) 반복
"""

def my_pow(x: float, n: int) -> float:
    if n < 0:
        x = 1 / x
        n = -n
    result = 1
    while n > 0:
        if n % 2 == 1:
            result *= x
        x *= x
        n //= 2
    return result

if __name__ == "__main__":
    assert abs(my_pow(2.0, 10) - 1024.0) < 1e-9
    assert abs(my_pow(2.1, 3) - 9.261) < 1e-3
    assert abs(my_pow(2.0, -2) - 0.25) < 1e-9
    print("✓ 모든 테스트 통과!")
