"""
==========================================================
문제 012: 연결 리스트 사이클 탐지 (Floyd's Cycle Detection)
==========================================================

[문제 설명]
연결 리스트에 사이클이 존재하는지 판별하라.

[아키텍트의 시선 - 이중 속도 포인터와 불변식 기반 탐지]
Floyd의 토끼와 거북이: slow(1칸), fast(2칸) 이동.
사이클 존재 시 반드시 만남 (수학적 증명 가능).
실무: 데드락 탐지, 순환 참조 감지, 가비지 컬렉션 마크 단계.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def has_cycle(head: ListNode) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False


def detect_cycle_start(head: ListNode) -> ListNode:
    """사이클 시작 노드를 반환. 없으면 None."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None


if __name__ == "__main__":
    n1 = ListNode(3)
    n2 = ListNode(2)
    n3 = ListNode(0)
    n4 = ListNode(-4)
    n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2
    assert has_cycle(n1) is True
    assert detect_cycle_start(n1) is n2

    a1 = ListNode(1)
    a2 = ListNode(2)
    a1.next = a2
    assert has_cycle(a1) is False

    print("✓ 모든 테스트 통과!")
