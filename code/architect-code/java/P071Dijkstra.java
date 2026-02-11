/**
 * 문제 071: 다익스트라 최단 경로 (Dijkstra's Algorithm)
 *
 * [문제] 가중치 그래프에서 단일 출발점 최단 경로를 구하라.
 * 음수 가중치는 없다고 가정.
 *
 * [아키텍트의 시선]
 * 다익스트라는 네트워크 라우팅(OSPF), GPS 네비게이션,
 * CDN 경로 최적화의 핵심 알고리즘이다.
 * 우선순위 큐 + 탐욕법 = "현재까지 최선의 선택이 전체 최선을 보장"하는 구조다.
 *
 * [시간 복잡도] O((V+E) log V) [공간 복잡도] O(V)
 */
import java.util.*;

public class P071Dijkstra {
    public static int[] dijkstra(int n, List<int[]>[] graph, int src) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        // {거리, 노드} 최소 힙
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.offer(new int[]{0, src});

        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int d = curr[0], u = curr[1];
            if (d > dist[u]) continue; // 이미 더 짧은 경로 발견됨

            for (int[] edge : graph[u]) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }
        return dist;
    }

    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        int n = 5;
        List<int[]>[] graph = new List[n];
        for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
        // 간선: {도착, 가중치}
        graph[0].add(new int[]{1, 4}); graph[0].add(new int[]{2, 1});
        graph[1].add(new int[]{3, 1});
        graph[2].add(new int[]{1, 2}); graph[2].add(new int[]{3, 5});
        graph[3].add(new int[]{4, 3});

        int[] dist = dijkstra(n, graph, 0);
        assert dist[0] == 0;
        assert dist[1] == 3; // 0→2→1
        assert dist[2] == 1; // 0→2
        assert dist[3] == 4; // 0→2→1→3
        assert dist[4] == 7; // 0→2→1→3→4
        System.out.println("✓ 모든 테스트 통과!");
    }
}
