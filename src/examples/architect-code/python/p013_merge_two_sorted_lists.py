"""
==========================================================
문제 013: 두 연결 리스트 병합 (Merge Two Sorted Lists)
==========================================================

[문제 설명]
정렬된 두 연결 리스트를 하나의 정렬된 리스트로 병합하라.

[아키텍트의 시선 - 분할 정복과 합병(Merge) 추상화]
병합 정렬의 핵심 서브루틴. 두 정렬된 스트림을 하나로 합치는 패턴.
실무: k-way 병합의 기초, 이벤트 소싱에서 시간순 이벤트 병합.

[시간 복잡도] O(m+n) [공간 복잡도] O(1) (노드 재활용)
"""


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def merge_two_lists(l1: ListNode, l2: ListNode) -> ListNode:
    dummy = ListNode(0)
    curr = dummy

    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1
            l1 = l1.next
        else:
            curr.next = l2
            l2 = l2.next
        curr = curr.next

    curr.next = l1 or l2
    return dummy.next


def to_list(head):
    r = []
    while head:
        r.append(head.val)
        head = head.next
    return r


def from_list(arr):
    dummy = ListNode(0)
    c = dummy
    for v in arr:
        c.next = ListNode(v)
        c = c.next
    return dummy.next


if __name__ == "__main__":
    r1 = merge_two_lists(from_list([1, 2, 4]), from_list([1, 3, 4]))
    assert to_list(r1) == [1, 1, 2, 3, 4, 4]

    r2 = merge_two_lists(from_list([]), from_list([0]))
    assert to_list(r2) == [0]

    print("✓ 모든 테스트 통과!")
