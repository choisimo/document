"""
문제 063: 데이터 스트림의 중앙값 (Find Median from Data Stream)
[문제] 정수 스트림에서 addNum, findMedian을 지원하는 자료구조를 설계하라.
[아키텍트의 시선] 실시간 통계 시스템.
이중 힙: max-heap(작은 쪽) + min-heap(큰 쪽)으로 중앙 분리.
항상 max_heap.size >= min_heap.size 유지 → peek만으로 중앙값 계산.
실무: 실시간 P50/P99 계산, 스트리밍 분석, 모니터링 대시보드.
[시간 복잡도] addNum O(log n), findMedian O(1) [공간 복잡도] O(n)
"""
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []  # max-heap (부호 반전)
        self.large = []  # min-heap

    def add_num(self, num: int) -> None:
        # 1. 작은 쪽에 추가
        heapq.heappush(self.small, -num)
        # 2. 작은 쪽의 최대가 큰 쪽의 최소보다 크면 이동
        if self.small and self.large and (-self.small[0]) > self.large[0]:
            val = -heapq.heappop(self.small)
            heapq.heappush(self.large, val)
        # 3. 크기 균형: small이 최대 1개 더 많게
        if len(self.small) > len(self.large) + 1:
            val = -heapq.heappop(self.small)
            heapq.heappush(self.large, val)
        elif len(self.large) > len(self.small):
            val = heapq.heappop(self.large)
            heapq.heappush(self.small, -val)

    def find_median(self) -> float:
        if len(self.small) > len(self.large):
            return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2.0

if __name__ == "__main__":
    mf = MedianFinder()
    mf.add_num(1)
    assert mf.find_median() == 1.0
    mf.add_num(2)
    assert mf.find_median() == 1.5
    mf.add_num(3)
    assert mf.find_median() == 2.0
    mf.add_num(4)
    assert mf.find_median() == 2.5
    mf.add_num(5)
    assert mf.find_median() == 3.0
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
