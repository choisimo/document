"""
==========================================================
문제 029: 최소 윈도우 부분 문자열 (Minimum Window Substring)
==========================================================

[문제 설명]
문자열 s에서 t의 모든 문자를 포함하는 최소 길이 부분 문자열을 구하라.

[아키텍트의 시선 - 조건부 윈도우 최적화와 필터링 파이프라인]
확장-수축 패턴: 오른쪽으로 확장하여 조건 충족 → 왼쪽에서 수축하여 최소화.
실무: 데이터 스트림에서 조건 만족 구간 탐지, 네트워크 패킷 필터.

[시간 복잡도] O(|s| + |t|) [공간 복잡도] O(|t|)
"""
from collections import Counter


def min_window(s: str, t: str) -> str:
    if not s or not t:
        return ""

    need = Counter(t)
    missing = len(t)
    left = 0
    best_start, best_len = 0, float("inf")

    for right, char in enumerate(s):
        if need[char] > 0:
            missing -= 1
        need[char] -= 1

        while missing == 0:
            window_len = right - left + 1
            if window_len < best_len:
                best_start, best_len = left, window_len

            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1

    return "" if best_len == float("inf") else s[best_start:best_start + best_len]


if __name__ == "__main__":
    assert min_window("ADOBECODEBANC", "ABC") == "BANC"
    assert min_window("a", "a") == "a"
    assert min_window("a", "aa") == ""
    print("✓ 모든 테스트 통과!")
