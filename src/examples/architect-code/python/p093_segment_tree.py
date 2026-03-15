"""
문제 093: 세그먼트 트리 (Segment Tree)
[문제] 구간 합 쿼리와 단일 원소 갱신을 지원하는 세그먼트 트리를 구현하라.
[아키텍트의 시선] 구간 쿼리와 지연 전파.
배열을 완전 이진 트리로 표현. 각 노드가 구간의 합(또는 min/max) 저장.
업데이트/쿼리 모두 O(log n). 지연 전파로 범위 업데이트도 O(log n).
실무: 주가 범위 쿼리, 네트워크 대역폭 모니터링, 게임 랭킹 시스템.
[시간 복잡도] O(log n) per query/update [공간 복잡도] O(n)
"""
from typing import List

class SegmentTree:
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)

    def _build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = nums[start]
            return
        mid = (start + end) // 2
        self._build(nums, 2*node, start, mid)
        self._build(nums, 2*node+1, mid+1, end)
        self.tree[node] = self.tree[2*node] + self.tree[2*node+1]

    def update(self, idx: int, val: int) -> None:
        self._update(1, 0, self.n - 1, idx, val)

    def _update(self, node, start, end, idx, val):
        if start == end:
            self.tree[node] = val
            return
        mid = (start + end) // 2
        if idx <= mid:
            self._update(2*node, start, mid, idx, val)
        else:
            self._update(2*node+1, mid+1, end, idx, val)
        self.tree[node] = self.tree[2*node] + self.tree[2*node+1]

    def query(self, left: int, right: int) -> int:
        return self._query(1, 0, self.n - 1, left, right)

    def _query(self, node, start, end, left, right):
        if right < start or end < left:
            return 0
        if left <= start and end <= right:
            return self.tree[node]
        mid = (start + end) // 2
        return (self._query(2*node, start, mid, left, right) +
                self._query(2*node+1, mid+1, end, left, right))

if __name__ == "__main__":
    st = SegmentTree([1, 3, 5, 7, 9, 11])
    assert st.query(0, 2) == 9   # 1+3+5
    assert st.query(1, 4) == 24  # 3+5+7+9
    assert st.query(0, 5) == 36  # 전체
    st.update(2, 10)  # 5 → 10
    assert st.query(0, 2) == 14  # 1+3+10
    assert st.query(0, 5) == 41  # 1+3+10+7+9+11
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
