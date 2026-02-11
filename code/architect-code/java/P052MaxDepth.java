/**
 * 문제 052: 이진 트리 최대 깊이 (Maximum Depth of Binary Tree)
 *
 * [문제] 이진 트리의 최대 깊이(루트~리프 경로의 최대 노드 수)를 구하라.
 *
 * [아키텍트의 시선]
 * 트리 깊이는 시스템의 계층 복잡도를 나타낸다.
 * 조직도의 관리 계층 수, 마이크로서비스 호출 체인 깊이,
 * 재귀적 의존성 트리의 최대 깊이 — 깊을수록 취약해진다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(h) h=트리 높이
 */
public class P052MaxDepth {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(3,
            new TreeNode(9),
            new TreeNode(20, new TreeNode(15), new TreeNode(7)));
        assert maxDepth(root) == 3;
        assert maxDepth(null) == 0;
        assert maxDepth(new TreeNode(1)) == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
