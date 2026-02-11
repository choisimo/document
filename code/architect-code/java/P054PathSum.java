/**
 * 문제 054: 경로 합 (Path Sum)
 *
 * [문제] 루트에서 리프까지의 경로 중 합이 targetSum인 경로가 있는지 판별하라.
 *
 * [아키텍트의 시선]
 * 경로 합 탐색은 비용 제한 경로 탐색(Budget-constrained routing)과 동일하다.
 * SLA 예산 내 서비스 호출 체인 검증, 네트워크 홉 수 제한 경로 탐색,
 * 워크플로우의 총 실행 시간 검증에 직접 활용된다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(h)
 */
public class P054PathSum {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static boolean hasPathSum(TreeNode root, int targetSum) {
        if (root == null) return false;
        // 리프 노드인 경우 남은 합이 현재 값과 같은지 확인
        if (root.left == null && root.right == null) {
            return root.val == targetSum;
        }
        int remaining = targetSum - root.val;
        return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
    }

    public static void main(String[] args) {
        //       5
        //      / \
        //     4   8
        //    /   / \
        //   11  13  4
        //  / \       \
        // 7   2       1
        TreeNode root = new TreeNode(5,
            new TreeNode(4, new TreeNode(11, new TreeNode(7), new TreeNode(2)), null),
            new TreeNode(8, new TreeNode(13), new TreeNode(4, null, new TreeNode(1))));
        assert hasPathSum(root, 22);  // 5→4→11→2
        assert !hasPathSum(root, 1);
        assert !hasPathSum(null, 0);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
