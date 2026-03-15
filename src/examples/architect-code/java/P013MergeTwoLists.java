/**
 * 문제 013: 정렬된 연결 리스트 병합 (Merge Two Sorted Lists)
 *
 * [문제] 두 개의 정렬된 연결 리스트를 하나의 정렬된 리스트로 병합하라.
 *
 * [아키텍트의 시선]
 * 정렬된 스트림 병합은 K-way merge, 외부 정렬, CQRS 이벤트 병합의 기초다.
 * 여러 데이터 소스를 시간순 통합하는 패턴은 로그 집계 시스템의 핵심이다.
 *
 * [시간 복잡도] O(n+m) [공간 복잡도] O(1)
 */
public class P013MergeTwoLists {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    public static ListNode merge(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) {
                curr.next = l1;
                l1 = l1.next;
            } else {
                curr.next = l2;
                l2 = l2.next;
            }
            curr = curr.next;
        }
        curr.next = (l1 != null) ? l1 : l2;
        return dummy.next;
    }

    static ListNode fromArray(int[] arr) {
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (int v : arr) { curr.next = new ListNode(v); curr = curr.next; }
        return dummy.next;
    }

    static int[] toArray(ListNode head) {
        java.util.List<Integer> list = new java.util.ArrayList<>();
        while (head != null) { list.add(head.val); head = head.next; }
        return list.stream().mapToInt(i -> i).toArray();
    }

    public static void main(String[] args) {
        assert java.util.Arrays.equals(
            toArray(merge(fromArray(new int[]{1,3,5}), fromArray(new int[]{2,4,6}))),
            new int[]{1,2,3,4,5,6});
        assert java.util.Arrays.equals(
            toArray(merge(fromArray(new int[]{}), fromArray(new int[]{1,2}))),
            new int[]{1,2});
        assert merge(null, null) == null;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
