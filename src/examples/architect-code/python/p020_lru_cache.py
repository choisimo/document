"""
==========================================================
문제 020: LRU 캐시 (Least Recently Used Cache)
==========================================================

[문제 설명]
get(key)과 put(key, value)를 O(1)에 수행하는 LRU 캐시를 설계.
용량 초과 시 가장 오래 전에 사용된 항목을 제거.

[아키텍트의 시선 - 캐시 교체 정책과 복합 자료구조 설계]
해시맵(O(1) 조회) + 이중 연결 리스트(O(1) 삽입/삭제)의 결합.
실무: 웹 브라우저 캐시, CDN, DB 버퍼 풀, CPU 캐시 교체 정책.
핵심: 단일 자료구조로 불가능한 것을 복합 구조로 해결.

[시간 복잡도] get/put O(1) [공간 복잡도] O(capacity)
"""


class DLinkedNode:
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.head = DLinkedNode()
        self.tail = DLinkedNode()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: DLinkedNode) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node: DLinkedNode) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])
            del self.cache[key]

        node = DLinkedNode(key, value)
        self._add_to_front(node)
        self.cache[key] = node

        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]


if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    assert cache.get(1) == 1
    cache.put(3, 3)  # 2 제거됨
    assert cache.get(2) == -1
    cache.put(4, 4)  # 1 제거됨
    assert cache.get(1) == -1
    assert cache.get(3) == 3
    assert cache.get(4) == 4

    print("✓ 모든 테스트 통과!")
