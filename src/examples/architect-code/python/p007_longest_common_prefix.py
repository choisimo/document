"""
==========================================================
문제 007: 가장 긴 공통 접두사 (Longest Common Prefix)
==========================================================

[문제 설명]
문자열 배열에서 가장 긴 공통 접두사를 찾아라.

[아키텍트의 시선 - 수직/수평 탐색과 조기 종료(Early Exit)]
수직 탐색: 모든 문자열의 i번째 문자를 동시에 비교 → 불일치 시 즉시 종료.
실무: API 라우팅 매칭, 파일 경로 공통 디렉토리 찾기.
핵심: 조기 종료로 불필요한 비교를 방지.

[시간 복잡도] O(S) S=모든 문자열 문자 수 합 [공간 복잡도] O(1)
"""

from typing import List


def longest_common_prefix(strs: List[str]) -> str:
    if not strs:
        return ""

    for i, char in enumerate(strs[0]):
        for s in strs[1:]:
            if i >= len(s) or s[i] != char:
                return strs[0][:i]

    return strs[0]


if __name__ == "__main__":
    assert longest_common_prefix(["flower", "flow", "flight"]) == "fl"
    assert longest_common_prefix(["dog", "racecar", "car"]) == ""
    assert longest_common_prefix(["a"]) == "a"
    assert longest_common_prefix([""]) == ""
    assert longest_common_prefix(["prefix", "prefix"]) == "prefix"

    print("✓ 모든 테스트 통과!")
