"""
==========================================================
문제 025: 그룹 애너그램 (Group Anagrams)
==========================================================

[문제 설명]
문자열 배열에서 애너그램끼리 그룹핑하라.

[아키텍트의 시선 - 정규화 키 기반 분류(Canonical Key Classification)]
각 문자열을 "정렬된 형태"로 변환 → 동일 키 = 같은 그룹.
실무: 데이터 분류, 중복 탐지, 클러스터링의 기초.

[시간 복잡도] O(n * k log k) k=최대 문자열 길이 [공간 복잡도] O(n*k)
"""
from typing import List
from collections import defaultdict


def group_anagrams(strs: List[str]) -> List[List[str]]:
    groups = defaultdict(list)
    for s in strs:
        key = "".join(sorted(s))
        groups[key].append(s)
    return list(groups.values())


if __name__ == "__main__":
    result = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
    result_sorted = sorted([sorted(g) for g in result])
    expected = sorted([sorted(g) for g in [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]])
    assert result_sorted == expected
    assert group_anagrams([""]) == [[""]]
    assert group_anagrams(["a"]) == [["a"]]
    print("✓ 모든 테스트 통과!")
