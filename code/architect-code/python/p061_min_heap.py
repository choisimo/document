"""
문제 061: 최소 힙 구현 (Min Heap Implementation)
[문제] 배열 기반 최소 힙을 직접 구현하라. insert, extract_min, peek 연산.
[아키텍트의 시선] 완전 이진 트리의 배열 표현.
힙은 배열로 트리를 표현하는 전형적 패턴. parent=i//2, children=2i, 2i+1.
포인터 없이 트리 구조를 유지 → 캐시 친화적, 메모리 효율적.
실무: OS 스케줄러, 이벤트 루프의 타이머 큐, 우선순위 기반 태스크 관리.
[시간 복잡도] insert/extract O(log n), peek O(1) [공간 복잡도] O(n)
"""
from typing import List, Optional

class MinHeap:
    def __init__(self):
        self.heap: List[int] = []

    def _parent(self, i: int) -> int:
        return (i - 1) // 2

    def _left(self, i: int) -> int:
        return 2 * i + 1

    def _right(self, i: int) -> int:
        return 2 * i + 2

    def _swap(self, i: int, j: int) -> None:
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]

    def _sift_up(self, i: int) -> None:
        """삽입 후 위로 이동"""
        while i > 0 and self.heap[i] < self.heap[self._parent(i)]:
            self._swap(i, self._parent(i))
            i = self._parent(i)

    def _sift_down(self, i: int) -> None:
        """추출 후 아래로 이동"""
        size = len(self.heap)
        smallest = i
        left, right = self._left(i), self._right(i)
        if left < size and self.heap[left] < self.heap[smallest]:
            smallest = left
        if right < size and self.heap[right] < self.heap[smallest]:
            smallest = right
        if smallest != i:
            self._swap(i, smallest)
            self._sift_down(smallest)

    def insert(self, val: int) -> None:
        self.heap.append(val)
        self._sift_up(len(self.heap) - 1)

    def extract_min(self) -> int:
        if not self.heap:
            raise IndexError("Heap is empty")
        min_val = self.heap[0]
        last = self.heap.pop()
        if self.heap:
            self.heap[0] = last
            self._sift_down(0)
        return min_val

    def peek(self) -> int:
        if not self.heap:
            raise IndexError("Heap is empty")
        return self.heap[0]

    def size(self) -> int:
        return len(self.heap)

if __name__ == "__main__":
    h = MinHeap()
    for v in [5, 3, 8, 1, 2, 7]:
        h.insert(v)
    assert h.peek() == 1
    assert h.extract_min() == 1
    assert h.extract_min() == 2
    assert h.extract_min() == 3
    assert h.size() == 3
    # 정렬 검증
    sorted_rest = []
    while h.size() > 0:
        sorted_rest.append(h.extract_min())
    assert sorted_rest == [5, 7, 8]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
