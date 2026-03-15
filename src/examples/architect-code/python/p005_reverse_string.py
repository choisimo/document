"""
==========================================================
문제 005: 문자열 뒤집기 (Reverse String In-Place)
==========================================================

[문제 설명]
문자 배열 s를 추가 공간 없이 in-place로 뒤집어라.

[아키텍트의 시선 - 불변성 vs 가변성 트레이드오프]
파이썬 str은 불변(immutable), 리스트는 가변(mutable).
시스템 설계에서 불변 객체는 스레드 안전성을 보장하지만,
in-place 수정이 필요할 때는 가변 구조가 필요.
양끝 포인터(Two Pointer) 패턴으로 O(1) 공간에 해결.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""

from typing import List


def reverse_string(s: List[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1


if __name__ == "__main__":
    s1 = ["h", "e", "l", "l", "o"]
    reverse_string(s1)
    assert s1 == ["o", "l", "l", "e", "h"]

    s2 = ["H", "a", "n", "n", "a", "h"]
    reverse_string(s2)
    assert s2 == ["h", "a", "n", "n", "a", "H"]

    s3 = ["a"]
    reverse_string(s3)
    assert s3 == ["a"]

    print("✓ 모든 테스트 통과!")
