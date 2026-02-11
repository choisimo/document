/**
 * 문제 014: 연결 리스트 중간 노드 (Middle of Linked List)
 *
 * [문제] 연결 리스트의 중간 노드를 반환하라. 노드가 짝수개면 두 번째 중간 노드를 반환.
 *
 * [아키텍트의 시선]
 * 빠른/느린 포인터 패턴은 로드 밸런서의 중간점 분할,
 * 스트리밍 데이터의 중앙값 추적, 분산 시스템의 파티셔닝 기준점 선정과 같다.
 * 단일 순회로 중간을 찾는 것은 메모리 효율적 파이프라인 설계의 핵심이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P014MiddleOfLinkedList {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // 빠른/느린 포인터: slow는 1칸, fast는 2칸
    public static ListNode middleNode(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    static ListNode fromArray(int[] arr) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (int v : arr) { curr.next = new ListNode(v); curr = curr.next; }
        return dummy.next;
    }

    public static void main(String[] args) {
        assert middleNode(fromArray(new int[]{1,2,3,4,5})).val == 3;
        assert middleNode(fromArray(new int[]{1,2,3,4,5,6})).val == 4;
        assert middleNode(fromArray(new int[]{1})).val == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
