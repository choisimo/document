/**
 * 문제 059: 이진 트리 오른쪽 뷰 (Binary Tree Right Side View)
 *
 * [문제] 이진 트리를 오른쪽에서 바라봤을 때 보이는 노드의 값을 반환하라.
 *
 * [아키텍트의 시선]
 * 레벨별 마지막 노드 선택은 각 계층에서 대표 인스턴스를 선정하는 패턴이다.
 * 모니터링 대시보드에서 각 서비스 레이어의 상태 대표값 선정,
 * 조직도에서 각 레벨의 가장 최근 입사자 조회와 동일하다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P059RightSideView {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static List<Integer> rightSideView(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        if (root == null) return result;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                if (i == size - 1) result.add(node.val); // 각 레벨의 마지막 노드
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
        }
        return result;
    }

    public static void main(String[] args) {
        //   1
        //  / \
        // 2   3
        //  \   \
        //   5   4
        TreeNode root = new TreeNode(1,
            new TreeNode(2, null, new TreeNode(5)),
            new TreeNode(3, null, new TreeNode(4)));
        assert rightSideView(root).equals(Arrays.asList(1, 3, 4));
        assert rightSideView(null).isEmpty();
        System.out.println("✓ 모든 테스트 통과!");
    }
}
