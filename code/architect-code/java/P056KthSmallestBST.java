/**
 * 문제 056: BST에서 K번째로 작은 원소 (Kth Smallest Element in BST)
 *
 * [문제] BST에서 k번째로 작은 값을 찾아라.
 *
 * [아키텍트의 시선]
 * BST의 중위 순회는 정렬된 순서를 O(n)에 생성한다.
 * 이는 정렬 인덱스에서 페이지네이션, 순위 기반 질의(RANK),
 * 리더보드 시스템의 순위 조회와 동일한 패턴이다.
 *
 * [시간 복잡도] O(h + k) [공간 복잡도] O(h)
 */
import java.util.*;

public class P056KthSmallestBST {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static int kthSmallest(TreeNode root, int k) {
        // 반복적 중위 순회 (스택 사용)
        Stack<TreeNode> stack = new Stack<>();
        TreeNode curr = root;
        int count = 0;

        while (curr != null || !stack.isEmpty()) {
            while (curr != null) {
                stack.push(curr);
                curr = curr.left;
            }
            curr = stack.pop();
            count++;
            if (count == k) return curr.val;
            curr = curr.right;
        }
        return -1; // 도달 불가
    }

    public static void main(String[] args) {
        //     3
        //    / \
        //   1   4
        //    \
        //     2
        TreeNode root = new TreeNode(3,
            new TreeNode(1, null, new TreeNode(2)),
            new TreeNode(4));
        assert kthSmallest(root, 1) == 1;
        assert kthSmallest(root, 2) == 2;
        assert kthSmallest(root, 3) == 3;
        assert kthSmallest(root, 4) == 4;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
