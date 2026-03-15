/**
 * 문제 053: 대칭 트리 (Symmetric Tree)
 *
 * [문제] 이진 트리가 좌우 대칭인지 판별하라.
 *
 * [아키텍트의 시선]
 * 대칭 검증은 시스템 이중화 검증의 핵심이다.
 * Active-Active 구성의 대칭성 확인, 데이터 레플리카의 일관성 검증,
 * 로드 밸런서의 균등 분배 확인과 동일한 사고방식이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(h)
 */
public class P053SymmetricTree {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static boolean isSymmetric(TreeNode root) {
        if (root == null) return true;
        return isMirror(root.left, root.right);
    }

    private static boolean isMirror(TreeNode t1, TreeNode t2) {
        if (t1 == null && t2 == null) return true;
        if (t1 == null || t2 == null) return false;
        return t1.val == t2.val
            && isMirror(t1.left, t2.right)
            && isMirror(t1.right, t2.left);
    }

    public static void main(String[] args) {
        TreeNode sym = new TreeNode(1,
            new TreeNode(2, new TreeNode(3), new TreeNode(4)),
            new TreeNode(2, new TreeNode(4), new TreeNode(3)));
        assert isSymmetric(sym);

        TreeNode asym = new TreeNode(1,
            new TreeNode(2, null, new TreeNode(3)),
            new TreeNode(2, null, new TreeNode(3)));
        assert !isSymmetric(asym);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
