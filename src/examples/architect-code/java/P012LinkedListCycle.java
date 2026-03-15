/**
 * 문제 012: 연결 리스트 순환 탐지 (Linked List Cycle)
 *
 * [문제] 연결 리스트에 순환(cycle)이 있는지 판별하라.
 * 보너스: 순환 시작점을 찾아라.
 *
 * [아키텍트의 시선]
 * Floyd의 토끼와 거북이 알고리즘은 분산 시스템의 데드락 탐지,
 * 의존성 그래프의 순환 참조 감지와 동일한 원리다.
 * O(1) 공간으로 순환을 탐지하는 것은 리소스 제약 환경의 핵심 기법이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P012LinkedListCycle {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Floyd's Cycle Detection: 빠른/느린 포인터
    public static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    // 순환 시작점 찾기
    public static ListNode detectCycleStart(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                // 시작점 탐색: head에서, 만난점에서 동시에 한 칸씩
                ListNode p = head;
                while (p != slow) {
                    p = p.next;
                    slow = slow.next;
                }
                return p;
            }
        }
        return null;
    }

    public static void main(String[] args) {
        // 순환 있는 리스트: 1->2->3->4->2(순환)
        ListNode n1 = new ListNode(1);
        ListNode n2 = new ListNode(2);
        ListNode n3 = new ListNode(3);
        ListNode n4 = new ListNode(4);
        n1.next = n2; n2.next = n3; n3.next = n4; n4.next = n2;
        assert hasCycle(n1);
        assert detectCycleStart(n1) == n2;

        // 순환 없는 리스트
        ListNode a1 = new ListNode(1);
        ListNode a2 = new ListNode(2);
        a1.next = a2;
        assert !hasCycle(a1);
        assert detectCycleStart(a1) == null;

        // 빈 리스트
        assert !hasCycle(null);

        System.out.println("✓ 모든 테스트 통과!");
    }
}
