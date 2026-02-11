"""
==========================================================
문제 040: 구간 병합 (Merge Intervals)
==========================================================
[문제] 겹치는 구간들을 병합하라.
[아키텍트의 시선 - 이벤트 기반 정렬과 구간 관리]
시작점으로 정렬 → 순회하며 겹침 판단 후 병합.
실무: 일정 관리, IP 범위 병합, 시계열 데이터 구간 합치기.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import List

def merge_intervals(intervals: List[List[int]]) -> List[List[int]]:
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

if __name__ == "__main__":
    assert merge_intervals([[1,3],[2,6],[8,10],[15,18]]) == [[1,6],[8,10],[15,18]]
    assert merge_intervals([[1,4],[4,5]]) == [[1,5]]
    assert merge_intervals([[1,4],[0,4]]) == [[0,4]]
    print("✓ 모든 테스트 통과!")
