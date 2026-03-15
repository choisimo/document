"""
==========================================================
문제 023: 가장 긴 부분 문자열 (Longest Substring Without Repeating Characters)
==========================================================

[문제 설명]
문자열에서 중복 문자가 없는 가장 긴 부분 문자열의 길이를 구하라.

[아키텍트의 시선 - 윈도우 기반 스트림 분석]
슬라이딩 윈도우: 오른쪽 확장 + 조건 위반 시 왼쪽 수축.
실무: 네트워크 패킷 분석, 로그 스트림의 고유 세션 탐지.

[시간 복잡도] O(n) [공간 복잡도] O(min(m,n)) m=문자셋 크기
"""


def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = max_len = 0

    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        char_index[char] = right
        max_len = max(max_len, right - left + 1)

    return max_len


if __name__ == "__main__":
    assert length_of_longest_substring("abcabcbb") == 3
    assert length_of_longest_substring("bbbbb") == 1
    assert length_of_longest_substring("pwwkew") == 3
    assert length_of_longest_substring("") == 0
    print("✓ 모든 테스트 통과!")
