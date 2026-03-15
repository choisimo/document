"""
==========================================================
문제 038: 제곱근 구하기 (Sqrt(x))
==========================================================
[문제] 음이 아닌 정수 x의 정수 제곱근을 구하라.
[아키텍트의 시선 - 연속 공간의 이산화와 근사 탐색]
f(m) = m² ≤ x인 최대 m 탐색 → 이진 탐색의 "조건 만족 최대값" 패턴.
실무: 파라메트릭 서치 (최적화 문제를 결정 문제로 변환).
[시간 복잡도] O(log x) [공간 복잡도] O(1)
"""

def my_sqrt(x: int) -> int:
    if x < 2:
        return x
    left, right = 1, x // 2
    while left <= right:
        mid = (left + right) // 2
        if mid * mid == x:
            return mid
        elif mid * mid < x:
            left = mid + 1
        else:
            right = mid - 1
    return right

if __name__ == "__main__":
    assert my_sqrt(4) == 2
    assert my_sqrt(8) == 2
    assert my_sqrt(0) == 0
    assert my_sqrt(1) == 1
    assert my_sqrt(100) == 10
    print("✓ 모든 테스트 통과!")
