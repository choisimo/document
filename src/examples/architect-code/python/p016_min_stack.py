"""
==========================================================
문제 016: 최소 스택 (Min Stack)
==========================================================

[문제 설명]
push, pop, top, getMin 모두 O(1)에 동작하는 스택을 설계하라.

[아키텍트의 시선 - 보조 데이터 구조와 CQRS 패턴]
보조 스택에 "현재까지의 최솟값"을 추적 → 조회 O(1) 보장.
CQRS(Command Query Responsibility Segregation) 관점:
쓰기(push/pop)와 읽기(getMin)의 책임을 분리한 구조.

[시간 복잡도] 모든 연산 O(1) [공간 복잡도] O(n)
"""


class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []

    def push(self, val: int) -> None:
        self.stack.append(val)
        min_val = min(val, self.min_stack[-1] if self.min_stack else val)
        self.min_stack.append(min_val)

    def pop(self) -> None:
        self.stack.pop()
        self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def get_min(self) -> int:
        return self.min_stack[-1]


if __name__ == "__main__":
    ms = MinStack()
    ms.push(-2)
    ms.push(0)
    ms.push(-3)
    assert ms.get_min() == -3
    ms.pop()
    assert ms.top() == 0
    assert ms.get_min() == -2

    print("✓ 모든 테스트 통과!")
