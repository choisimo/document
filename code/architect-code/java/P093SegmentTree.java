/**
 * 문제 093: 세그먼트 트리 (Segment Tree)
 *
 * [문제] 구간 합 쿼리와 단일 원소 갱신을 지원하는 세그먼트 트리를 구현하라.
 *
 * [아키텍트의 시선]
 * 구간 쿼리와 지연 전파.
 * 배열을 완전 이진 트리로 표현. 각 노드가 구간의 합(또는 min/max) 저장.
 * 업데이트/쿼리 모두 O(log n). 지연 전파로 범위 업데이트도 O(log n).
 * 실무: 주가 범위 쿼리, 네트워크 대역폭 모니터링, 게임 랭킹 시스템.
 *
 * [시간 복잡도] O(log n) per query/update [공간 복잡도] O(n)
 */

public class P093SegmentTree {
    private int[] tree;
    private int n;

    public P093SegmentTree(int[] nums) {
        n = nums.length;
        tree = new int[4 * n];
        if (n > 0) build(nums, 1, 0, n - 1);
    }

    private void build(int[] nums, int node, int start, int end) {
        if (start == end) { tree[node] = nums[start]; return; }
        int mid = (start + end) / 2;
        build(nums, 2 * node, start, mid);
        build(nums, 2 * node + 1, mid + 1, end);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    public void update(int idx, int val) {
        update(1, 0, n - 1, idx, val);
    }
    private void update(int node, int start, int end, int idx, int val) {
        if (start == end) { tree[node] = val; return; }
        int mid = (start + end) / 2;
        if (idx <= mid) update(2 * node, start, mid, idx, val);
        else update(2 * node + 1, mid + 1, end, idx, val);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    public int query(int left, int right) {
        return query(1, 0, n - 1, left, right);
    }
    private int query(int node, int start, int end, int left, int right) {
        if (right < start || end < left) return 0;
        if (left <= start && end <= right) return tree[node];
        int mid = (start + end) / 2;
        return query(2 * node, start, mid, left, right)
             + query(2 * node + 1, mid + 1, end, left, right);
    }

    public static void main(String[] args) {
        P093SegmentTree st = new P093SegmentTree(new int[]{1, 3, 5, 7, 9, 11});
        assert st.query(0, 2) == 9;   // 1+3+5
        assert st.query(1, 4) == 24;  // 3+5+7+9
        assert st.query(0, 5) == 36;  // 전체
        st.update(2, 10);             // 5 -> 10
        assert st.query(0, 2) == 14;  // 1+3+10
        assert st.query(0, 5) == 41;  // 1+3+10+7+9+11
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
