"""
==========================================================
문제 006: 애너그램 판별 (Valid Anagram)
==========================================================

[문제 설명]
두 문자열 s와 t가 주어질 때, t가 s의 애너그램인지 판별하라.

[아키텍트의 시선 - 데이터 정규화와 동등성 비교]
"같음"을 판별하려면 먼저 "정규화(Normalization)"가 필요.
문자열을 정렬하거나, 문자 빈도수로 변환하여 비교.
실무: API 입력 정규화, DB 중복 검사, 해시 기반 분류.

[시간 복잡도] O(n) [공간 복잡도] O(1) - 알파벳 26자 고정
"""

from collections import Counter


def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    return Counter(s) == Counter(t)


def is_anagram_array(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    count = [0] * 26
    for cs, ct in zip(s, t):
        count[ord(cs) - ord("a")] += 1
        count[ord(ct) - ord("a")] -= 1
    return all(c == 0 for c in count)


if __name__ == "__main__":
    assert is_anagram("anagram", "nagaram") is True
    assert is_anagram("rat", "car") is False
    assert is_anagram("", "") is True
    assert is_anagram("a", "ab") is False

    assert is_anagram_array("anagram", "nagaram") is True
    assert is_anagram_array("rat", "car") is False

    print("✓ 모든 테스트 통과!")
