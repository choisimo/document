/**
 * 문제 060: 이진 트리를 연결 리스트로 평탄화 (Flatten Binary Tree to Linked List)
 *
 * [문제] 이진 트리를 전위 순회 순서의 단일 연결 리스트(right 포인터만 사용)로 평탄화하라.
 *
 * [아키텍트의 시선]
 * 트리 → 리스트 변환은 계층 구조를 순차 구조로 변환하는 패턴이다.
 * 중첩 JSON을 플랫 키-값으로 변환, 재귀적 메뉴 구조를 브레드크럼으로 변환,
 * 트리 기반 인덱스를 정렬된 스캔 리스트로 변환하는 것과 동일하다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1) Morris 방법
 */
import java.util.*;

public class P060FlattenTree {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    // Morris 순회 아이디어: O(1) 공간
    public static void flatten(TreeNode root) {
        TreeNode curr = root;
        while (curr != null) {
            if (curr.left != null) {
                // 왼쪽 서브트리의 가장 오른쪽 노드를 찾아 현재의 right를 연결
                TreeNode rightmost = curr.left;
                while (rightmost.right != null) {
                    rightmost = rightmost.right;
                }
                rightmost.right = curr.right;
                curr.right = curr.left;
                curr.left = null;
            }
            curr = curr.right;
        }
    }

    static List<Integer> toList(TreeNode root) {
        List<Integer> result = new ArrayList<>();
        while (root != null) {
            result.add(root.val);
            assert root.left == null; // 평탄화 확인
            root = root.right;
        }
        return result;
    }

    public static void main(String[] args) {
        //     1
        //    / \
        //   2   5
        //  / \   \
        // 3   4   6
        TreeNode root = new TreeNode(1,
            new TreeNode(2, new TreeNode(3), new TreeNode(4)),
            new TreeNode(5, null, new TreeNode(6)));
        flatten(root);
        assert toList(root).equals(Arrays.asList(1, 2, 3, 4, 5, 6));

        flatten(null); // null 처리
        System.out.println("✓ 모든 테스트 통과!");
    }
}
