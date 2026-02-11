/**
 * 문제 066: 너비 우선 탐색 (Breadth-First Search)
 *
 * [문제] 그래프에서 BFS를 구현하고, 최단 경로(무가중치)를 찾아라.
 *
 * [아키텍트의 시선]
 * BFS는 "최소 홉 수" 경로를 찾는 알고리즘이다.
 * 소셜 네트워크의 N-degree 연결, 네트워크 라우팅의 최소 홉,
 * 웹 크롤러의 레벨별 탐색과 동일한 패턴이다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P066BFS {
    public static List<Integer> bfs(Map<Integer, List<Integer>> graph, int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        visited.add(start);
        queue.offer(start);
        while (!queue.isEmpty()) {
            int node = queue.poll();
            order.add(node);
            for (int neighbor : graph.getOrDefault(node, Collections.emptyList())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(neighbor);
                }
            }
        }
        return order;
    }

    // 최단 경로 (무가중치)
    public static int shortestPath(Map<Integer, List<Integer>> graph, int start, int end) {
        if (start == end) return 0;
        Set<Integer> visited = new HashSet<>();
        Queue<int[]> queue = new LinkedList<>(); // {node, distance}
        visited.add(start);
        queue.offer(new int[]{start, 0});
        while (!queue.isEmpty()) {
            int[] curr = queue.poll();
            for (int neighbor : graph.getOrDefault(curr[0], Collections.emptyList())) {
                if (neighbor == end) return curr[1] + 1;
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.offer(new int[]{neighbor, curr[1] + 1});
                }
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        Map<Integer, List<Integer>> graph = new HashMap<>();
        graph.put(0, Arrays.asList(1, 2));
        graph.put(1, Arrays.asList(0, 3));
        graph.put(2, Arrays.asList(0, 3));
        graph.put(3, Arrays.asList(1, 2, 4));
        graph.put(4, Arrays.asList(3));

        List<Integer> order = bfs(graph, 0);
        assert order.get(0) == 0;
        assert order.size() == 5;

        assert shortestPath(graph, 0, 4) == 3;
        assert shortestPath(graph, 0, 0) == 0;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
