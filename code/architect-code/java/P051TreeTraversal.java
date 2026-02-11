/**
 * 문제 051: 이진 트리 순회 (Binary Tree Traversal)
 *
 * [문제] 이진 트리의 전위/중위/후위/레벨 순회를 모두 구현하라.
 *
 * [아키텍트의 시선]
 * 트리 순회는 파일 시스템 탐색, DOM 트리 처리, AST 분석의 기본이다.
 * 전위=복사, 중위=정렬된 출력, 후위=삭제/의존성 해소, 레벨=BFS.
 * 순회 방식의 선택이 곧 처리 순서 전략이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P051TreeTraversal {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    // 전위 순회 (Root → Left → Right)
    public static List<Integer> preorder(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        preorderHelper(root, result);
        return result;
    }
    private static void preorderHelper(TreeNode node, List<Integer> result) {
        if (node == null) return;
        result.add(node.val);
        preorderHelper(node.left, result);
        preorderHelper(node.right, result);
    }

    // 중위 순회 (Left → Root → Right)
    public static List<Integer> inorder(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        inorderHelper(root, result);
        return result;
    }
    private static void inorderHelper(TreeNode node, List<Integer> result) {
        if (node == null) return;
        inorderHelper(node.left, result);
        result.add(node.val);
        inorderHelper(node.right, result);
    }

    // 후위 순회 (Left → Right → Root)
    public static List<Integer> postorder(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        postorderHelper(root, result);
        return result;
    }
    private static void postorderHelper(TreeNode node, List<Integer> result) {
        if (node == null) return;
        postorderHelper(node.left, result);
        postorderHelper(node.right, result);
        result.add(node.val);
    }

    // 레벨 순회 (BFS)
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
            result.add(level);
        }
        return result;
    }

    public static void main(String[] args) {
        //     1
        //    / \
        //   2   3
        //  / \
        // 4   5
        TreeNode root = new TreeNode(1,
            new TreeNode(2, new TreeNode(4), new TreeNode(5)),
            new TreeNode(3));

        assert preorder(root).equals(Arrays.asList(1, 2, 4, 5, 3));
        assert inorder(root).equals(Arrays.asList(4, 2, 5, 1, 3));
        assert postorder(root).equals(Arrays.asList(4, 5, 2, 3, 1));

        List<List<Integer>> levels = levelOrder(root);
        assert levels.get(0).equals(Arrays.asList(1));
        assert levels.get(1).equals(Arrays.asList(2, 3));
        assert levels.get(2).equals(Arrays.asList(4, 5));
        System.out.println("✓ 모든 테스트 통과!");
    }
}
