/**
 * 문제 067: 깊이 우선 탐색 (Depth-First Search)
 *
 * [문제] 그래프에서 DFS를 구현하라 (재귀/반복 모두).
 * 연결 요소의 수를 세는 응용도 구현하라.
 *
 * [아키텍트의 시선]
 * DFS는 "가능한 깊이 탐색" 전략이다.
 * 파일 시스템의 재귀적 검색, 의존성 해석(npm install 순서),
 * 가비지 컬렉터의 도달 가능성 분석(Mark-and-Sweep)과 동일하다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P067DFS {
    // 재귀 DFS
    public static List<Integer> dfsRecursive(Map<Integer, List<Integer>> graph, int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        dfsHelper(graph, start, visited, order);
        return order;
    }

    private static void dfsHelper(Map<Integer, List<Integer>> graph, int node,
                                   Set<Integer> visited, List<Integer> order) {
        visited.add(node);
        order.add(node);
        for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
            if (!visited.contains(neighbor)) {
                dfsHelper(graph, neighbor, visited, order);
            }
        }
    }

    // 반복 DFS (스택)
    public static List<Integer> dfsIterative(Map<Integer, List<Integer>> graph, int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Stack<Integer> stack = new Stack<>();
        stack.push(start);
        while (!stack.isEmpty()) {
            int node = stack.pop();
            if (visited.contains(node)) continue;
            visited.add(node);
            order.add(node);
            List<Integer> neighbors = graph.getOrDefault(node, Collections.emptyList());
            for (int i = neighbors.size() - 1; i >= 0; i--) {
                if (!visited.contains(neighbors.get(i))) {
                    stack.push(neighbors.get(i));
                }
            }
        }
        return order;
    }

    // 연결 요소 수
    public static int countComponents(int n, Map<Integer, List<Integer>> graph) {
        Set<Integer> visited = new HashSet<>();
        int count = 0;
        for (int i = 0; i < n; i++) {
            if (!visited.contains(i)) {
                dfsHelper(graph, i, visited, new ArrayList<>());
                count++;
            }
        }
        return count;
    }

    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(0, 3));
        graph.put(2, Arrays.asList(0));
        graph.put(3, Arrays.asList(1));

        List<Integer> r = dfsRecursive(graph, 0);
        assert r.size() == 4;
        assert r.get(0) == 0;

        List<Integer> ri = dfsIterative(graph, 0);
        assert ri.size() == 4;

        // 연결 요소: {0,1,2,3}, {4}
        graph.put(4, Collections.emptyList());
        assert countComponents(5, graph) == 2;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
