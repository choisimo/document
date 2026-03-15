/**
 * 문제 055: BST 유효성 검증 (Validate Binary Search Tree)
 *
 * [문제] 이진 트리가 유효한 이진 탐색 트리(BST)인지 검증하라.
 *
 * [아키텍트의 시선]
 * BST 유효성 검증은 데이터 무결성 검증의 핵심 패턴이다.
 * 데이터베이스 인덱스 일관성 검증, 분산 시스템의 순서 보장 확인,
 * 이벤트 소싱의 타임스탬프 순서 검증과 동일하다.
 * "로컬은 OK이지만 글로벌은 NO"인 경우를 잡아야 한다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(h)
 */
public class P055ValidateBST {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static boolean isValidBST(TreeNode root) {
        return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    private static boolean validate(TreeNode node, long min, long max) {
        if (node == null) return true;
        if (node.val <= min || node.val >= max) return false;
        return validate(node.left, min, node.val)
            && validate(node.right, node.val, max);
    }

    public static void main(String[] args) {
        TreeNode valid = new TreeNode(2, new TreeNode(1), new TreeNode(3));
        assert isValidBST(valid);

        // 5의 왼쪽 서브트리에 6이 있음 → 무효
        TreeNode invalid = new TreeNode(5,
            new TreeNode(1),
            new TreeNode(4, new TreeNode(3), new TreeNode(6)));
        assert !isValidBST(invalid);

        assert isValidBST(null);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
