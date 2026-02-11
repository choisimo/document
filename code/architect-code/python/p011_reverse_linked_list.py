"""
==========================================================
문제 011: 연결 리스트 역순 (Reverse Linked List)
==========================================================

[문제 설명]
단일 연결 리스트의 노드 순서를 뒤집어라.
반복(Iterative)과 재귀(Recursive) 두 가지 방식으로 구현.

[아키텍트의 시선 - Iterative vs Recursive 설계 선택]
반복: 명시적 상태 관리, 스택 오버플로우 없음, 디버깅 용이.
재귀: 선언적 표현, 코드 간결, 하지만 스택 깊이 제한.
실무 선택 기준: 데이터 크기가 예측 불가 → 반복, 트리 구조 → 재귀.

[시간 복잡도] O(n) [공간 복잡도] 반복 O(1), 재귀 O(n)
"""


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def reverse_iterative(head: ListNode) -> ListNode:
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev


def reverse_recursive(head: ListNode) -> ListNode:
    if not head or not head.next:
        return head
    new_head = reverse_recursive(head.next)
    head.next.next = head
    head.next = None
    return new_head


def to_list(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result


def from_list(arr):
    dummy = ListNode(0)
    curr = dummy
    for v in arr:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next


if __name__ == "__main__":
    h1 = from_list([1, 2, 3, 4, 5])
    assert to_list(reverse_iterative(h1)) == [5, 4, 3, 2, 1]

    h2 = from_list([1, 2])
    assert to_list(reverse_recursive(h2)) == [2, 1]

    h3 = from_list([])
    assert to_list(reverse_iterative(h3)) == []

    print("✓ 모든 테스트 통과!")
