"""
==========================================================
문제 014: 중간 노드 찾기 (Middle of Linked List)
==========================================================

[문제 설명]
연결 리스트의 중간 노드를 반환하라. 두 개일 경우 두 번째.

[아키텍트의 시선 - 빠른/느린 포인터의 일반화]
slow(1칸) + fast(2칸): fast가 끝에 도달할 때 slow는 중간.
이 패턴은 1/3 지점, 1/4 지점 등으로 일반화 가능.
실무: 부하 분산에서 중간점 기반 파티셔닝.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


def middle_node(head: ListNode) -> ListNode:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow


def from_list(arr):
    dummy = ListNode(0)
    c = dummy
    for v in arr:
        c.next = ListNode(v)
        c = c.next
    return dummy.next


if __name__ == "__main__":
    h1 = from_list([1, 2, 3, 4, 5])
    assert middle_node(h1).val == 3

    h2 = from_list([1, 2, 3, 4, 5, 6])
    assert middle_node(h2).val == 4

    h3 = from_list([1])
    assert middle_node(h3).val == 1

    print("✓ 모든 테스트 통과!")
