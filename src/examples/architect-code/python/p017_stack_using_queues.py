"""
==========================================================
문제 017: 큐를 이용한 스택 구현 (Stack using Queues)
==========================================================

[문제 설명]
두 개의 큐만을 사용하여 LIFO(스택) 동작을 구현하라.

[아키텍트의 시선 - 어댑터 패턴과 인터페이스 변환]
GoF Adapter Pattern의 전형적 사례.
기존 인터페이스(Queue/FIFO)를 다른 인터페이스(Stack/LIFO)로 변환.
실무: 레거시 시스템 래핑, 프로토콜 변환 게이트웨이.

[시간 복잡도] push O(n), pop O(1) [공간 복잡도] O(n)
"""
from collections import deque


class MyStack:
    def __init__(self):
        self.queue = deque()

    def push(self, x: int) -> None:
        self.queue.append(x)
        for _ in range(len(self.queue) - 1):
            self.queue.append(self.queue.popleft())

    def pop(self) -> int:
        return self.queue.popleft()

    def top(self) -> int:
        return self.queue[0]

    def empty(self) -> bool:
        return len(self.queue) == 0


if __name__ == "__main__":
    s = MyStack()
    s.push(1)
    s.push(2)
    assert s.top() == 2
    assert s.pop() == 2
    assert s.empty() is False
    assert s.pop() == 1
    assert s.empty() is True

    print("✓ 모든 테스트 통과!")
