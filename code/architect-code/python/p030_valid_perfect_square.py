"""
==========================================================
문제 030: 제곱수 판별 (Valid Perfect Square)
==========================================================

[문제 설명]
양의 정수 num이 완전 제곱수인지 판별하라. 내장 함수 사용 불가.

[아키텍트의 시선 - 수학적 이진 탐색과 탐색 공간 정의]
탐색 공간: [1, num] → mid² == num이면 완전 제곱수.
이진 탐색은 "정렬된 배열"뿐 아니라 "단조 함수"에도 적용 가능.
실무: 최적값 탐색, 파라메트릭 서치의 기초.

[시간 복잡도] O(log n) [공간 복잡도] O(1)
"""


def is_perfect_square(num: int) -> bool:
    left, right = 1, num
    while left <= right:
        mid = (left + right) // 2
        sq = mid * mid
        if sq == num:
            return True
        elif sq < num:
            left = mid + 1
        else:
            right = mid - 1
    return False


if __name__ == "__main__":
    assert is_perfect_square(16) is True
    assert is_perfect_square(14) is False
    assert is_perfect_square(1) is True
    assert is_perfect_square(100) is True
    assert is_perfect_square(808201) is True  # 899²
    print("✓ 모든 테스트 통과!")
