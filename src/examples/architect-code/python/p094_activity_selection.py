"""
문제 094: 활동 선택 문제 (Activity Selection - Greedy)
[문제] 시작/종료 시간이 주어진 활동들 중 겹치지 않는 최대 활동 수를 구하라.
[아키텍트의 시선] 탐욕 선택 속성과 최적성 증명.
종료 시간 기준 정렬 → 가장 빨리 끝나는 활동 선택 → 남은 시간 최대화.
탐욕이 최적인 이유: 교환 논증(Exchange Argument)으로 증명 가능.
실무: 회의실 최대 활용, CPU 스케줄링(SJF), 자원 할당.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import List, Tuple

def activity_selection(activities: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """종료 시간 기준 탐욕 선택"""
    sorted_acts = sorted(activities, key=lambda x: x[1])
    selected = [sorted_acts[0]]
    for start, end in sorted_acts[1:]:
        if start >= selected[-1][1]:
            selected.append((start, end))
    return selected

def max_activities_count(activities: List[Tuple[int, int]]) -> int:
    return len(activity_selection(activities))

if __name__ == "__main__":
    acts = [(1,4), (3,5), (0,6), (5,7), (3,9), (5,9), (6,10), (8,11), (8,12), (2,14), (12,16)]
    selected = activity_selection(acts)
    assert len(selected) == 4  # (1,4), (5,7), (8,11), (12,16)
    # 겹침 없는지 검증
    for i in range(1, len(selected)):
        assert selected[i][0] >= selected[i-1][1]
    acts2 = [(1,2), (2,3), (3,4)]
    assert max_activities_count(acts2) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
