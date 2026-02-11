/**
 * 문제 069: 그래프 복제 (Clone Graph)
 *
 * [문제] 무방향 연결 그래프의 깊은 복사본을 만들어라.
 *
 * [아키텍트의 시선]
 * 그래프 깊은 복사는 시스템 스냅샷, VM 복제, 데이터베이스 레플리카 생성의
 * 기본 원리다. 순환 참조 처리가 핵심 — 무한 루프 방지를 위해
 * 복사 레지스트리(방문 맵)가 필수다. Prototype 패턴의 구현이다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P069CloneGraph {
    static class Node {
        int val;
        List<Node> neighbors;
        Node(int val) {
            this.val = val;
            this.neighbors = new ArrayList<>();
        }
    }

    public static Node cloneGraph(Node node) {
        if (node == null) return null;
        Map<Node, Node> cloned = new HashMap<>();
        return dfsClone(node, cloned);
    }

    private static Node dfsClone(Node node, Map<Node, Node> cloned) {
        if (cloned.containsKey(node)) return cloned.get(node);

        Node copy = new Node(node.val);
        cloned.put(node, copy);
        for (Node neighbor : node.neighbors) {
            copy.neighbors.add(dfsClone(neighbor, cloned));
        }
        return copy;
    }

    public static void main(String[] args) {
        // 1 -- 2
        // |    |
        // 4 -- 3
        Node n1 = new Node(1), n2 = new Node(2), n3 = new Node(3), n4 = new Node(4);
        n1.neighbors.addAll(Arrays.asList(n2, n4));
        n2.neighbors.addAll(Arrays.asList(n1, n3));
        n3.neighbors.addAll(Arrays.asList(n2, n4));
        n4.neighbors.addAll(Arrays.asList(n1, n3));

        Node clone = cloneGraph(n1);
        assert clone != n1;           // 다른 객체
        assert clone.val == 1;
        assert clone.neighbors.size() == 2;
        assert clone.neighbors.get(0).val == 2;
        assert clone.neighbors.get(0) != n2; // 깊은 복사

        assert cloneGraph(null) == null;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
