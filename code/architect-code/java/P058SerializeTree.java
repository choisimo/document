/**
 * 문제 058: 이진 트리 직렬화/역직렬화 (Serialize and Deserialize Binary Tree)
 *
 * [문제] 이진 트리를 문자열로 직렬화하고, 다시 트리로 역직렬화하라.
 *
 * [아키텍트의 시선]
 * 직렬화/역직렬화는 마이크로서비스 간 데이터 교환(protobuf, JSON),
 * 캐시 저장/복원, 메시지 큐를 통한 복잡한 객체 전달의 근본 원리다.
 * 구조화된 데이터의 평탄화(flatten)와 복원은 아키텍처 통합의 핵심이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P058SerializeTree {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    // 전위 순회 기반 직렬화
    public static String serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        serializeHelper(root, sb);
        return sb.toString();
    }

    private static void serializeHelper(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.append("null,");
            return;
        }
        sb.append(node.val).append(",");
        serializeHelper(node.left, sb);
        serializeHelper(node.right, sb);
    }

    public static TreeNode deserialize(String data) {
        Queue<String> queue = new LinkedList<>(Arrays.asList(data.split(",")));
        return deserializeHelper(queue);
    }

    private static TreeNode deserializeHelper(Queue<String> queue) {
        String val = queue.poll();
        if (val == null || val.equals("null")) return null;
        TreeNode node = new TreeNode(Integer.parseInt(val));
        node.left = deserializeHelper(queue);
        node.right = deserializeHelper(queue);
        return node;
    }

    // 트리 비교 유틸
    static boolean isSame(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && isSame(a.left, b.left) && isSame(a.right, b.right);
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(1);
        root.left = new TreeNode(2);
        root.right = new TreeNode(3);
        root.right.left = new TreeNode(4);
        root.right.right = new TreeNode(5);

        String serialized = serialize(root);
        TreeNode deserialized = deserialize(serialized);
        assert isSame(root, deserialized);

        // 빈 트리
        assert deserialize(serialize(null)) == null;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
