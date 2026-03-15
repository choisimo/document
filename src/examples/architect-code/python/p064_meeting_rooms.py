"""
문제 064: 회의실 배정 (Meeting Rooms II)
[문제] 회의 시간표 intervals[i]=[start, end]가 주어질 때
       동시에 필요한 최소 회의실 수를 구하라.
[아키텍트의 시선] 자원 할당 최적화.
이벤트 포인트 기법: 시작(+1), 종료(-1)로 변환 후 정렬 → 최대 동시 수.
또는 min-heap으로 가장 빨리 끝나는 회의 추적.
실무: 서버 동시 접속 수, 쿠버네티스 파드 스케줄링, 리소스 풀 관리.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import List
import heapq

def min_meeting_rooms_heap(intervals: List[List[int]]) -> int:
    """힙 기반: 가장 빨리 끝나는 회의실 재사용"""
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])
    heap = []  # 종료 시간 min-heap
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)  # 회의실 재사용
        heapq.heappush(heap, end)
    return len(heap)

def min_meeting_rooms_sweep(intervals: List[List[int]]) -> int:
    """스위프 라인: 이벤트 포인트"""
    events = []
    for start, end in intervals:
        events.append((start, 1))   # 시작: +1
        events.append((end, -1))    # 종료: -1
    events.sort()
    max_rooms = current = 0
    for _, delta in events:
        current += delta
        max_rooms = max(max_rooms, current)
    return max_rooms

if __name__ == "__main__":
    assert min_meeting_rooms_heap([[0,30],[5,10],[15,20]]) == 2
    assert min_meeting_rooms_sweep([[0,30],[5,10],[15,20]]) == 2
    assert min_meeting_rooms_heap([[7,10],[2,4]]) == 1
    assert min_meeting_rooms_sweep([[7,10],[2,4]]) == 1
    assert min_meeting_rooms_heap([[1,5],[2,6],[3,7],[4,8]]) == 4
    assert min_meeting_rooms_heap([]) == 0
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
