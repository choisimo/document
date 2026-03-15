/**
 * 문제 011: 연결 리스트 뒤집기 (Reverse Linked List)
 *
 * [문제] 단일 연결 리스트를 뒤집어라.
 *
 * [아키텍트의 시선]
 * 연결 리스트 뒤집기는 이벤트 소싱에서 시간 역순 조회,
 * Undo 스택 구현, 역방향 데이터 스트림 처리의 기초다.
 * 포인터 조작은 마이크로서비스 간 의존성 방향 전환과 유사하다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P011ReverseLinkedList {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    // 반복적 방법: 세 포인터(prev, curr, next) 활용
    public static ListNode reverse(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next; // 다음 노드 저장
            curr.next = prev;          // 방향 전환
            prev = curr;               // prev 전진
            curr = next;               // curr 전진
        }
        return prev;
    }

    // 재귀적 방법
    public static ListNode reverseRecursive(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode newHead = reverseRecursive(head.next);
        head.next.next = head;
        head.next = null;
        return newHead;
    }

    static int[] toArray(ListNode head) {
        java.util.List<Integer> list = new java.util.ArrayList<>();
        while (head != null) { list.add(head.val); head = head.next; }
        return list.stream().mapToInt(i -> i).toArray();
    }

    static ListNode fromArray(int[] arr) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (int v : arr) { curr.next = new ListNode(v); curr = curr.next; }
        return dummy.next;
    }

    public static void main(String[] args) {
        assert java.util.Arrays.equals(toArray(reverse(fromArray(new int[]{1,2,3,4,5}))), new int[]{5,4,3,2,1});
        assert java.util.Arrays.equals(toArray(reverse(fromArray(new int[]{1}))), new int[]{1});
        assert reverse(null) == null;
        assert java.util.Arrays.equals(toArray(reverseRecursive(fromArray(new int[]{1,2,3}))), new int[]{3,2,1});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
