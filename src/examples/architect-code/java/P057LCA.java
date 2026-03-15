/**
 * 문제 057: 최소 공통 조상 (Lowest Common Ancestor)
 *
 * [문제] 이진 트리에서 두 노드의 최소 공통 조상(LCA)을 찾아라.
 *
 * [아키텍트의 시선]
 * LCA는 조직 구조에서 두 팀의 공통 상위 관리자,
 * 버전 관리 시스템에서 두 브랜치의 공통 조상 커밋(git merge-base),
 * 네트워크에서 두 노드 간 통신의 최소 공통 라우터와 동일하다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(h)
 */
public class P057LCA {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;

        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);

        // 양쪽에서 모두 찾았으면 현재 노드가 LCA
        if (left != null && right != null) return root;
        return (left != null) ? left : right;
    }

    public static void main(String[] args) {
        //       3
        //      / \
        //     5   1
        //    / \ / \
        //   6  2 0  8
        //     / \
        //    7   4
        TreeNode n7 = new TreeNode(7), n4 = new TreeNode(4);
        TreeNode n6 = new TreeNode(6);
        TreeNode n2 = new TreeNode(2, n7, n4);
        TreeNode n5 = new TreeNode(5, n6, n2);
        TreeNode n0 = new TreeNode(0), n8 = new TreeNode(8);
        TreeNode n1 = new TreeNode(1, n0, n8);
        TreeNode root = new TreeNode(3, n5, n1);

        assert lowestCommonAncestor(root, n5, n1) == root;
        assert lowestCommonAncestor(root, n5, n4) == n5;
        assert lowestCommonAncestor(root, n6, n4) == n5;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
