/**
 * 문제 078: 네트워크 지연 시간 (Network Delay Time)
 *
 * [문제] n개의 노드와 가중치 방향 간선이 주어질 때,
 * 소스 노드에서 모든 노드에 신호가 도달하는 최소 시간을 구하라.
 * 모든 노드에 도달 불가능하면 -1.
 *
 * [아키텍트의 시선]
 * 네트워크 지연 = 최장 최단 경로 = 다익스트라 결과의 최대값이다.
 * CDN 전파 시간, 분산 합의 수렴 시간, 배치 작업의 완료 시간은
 * 모두 "가장 느린 경로"에 의해 결정된다.
 *
 * [시간 복잡도] O((V+E) log V) [공간 복잡도] O(V + E)
 */
import java.util.*;

public class P078NetworkDelay {
    @SuppressWarnings("unchecked")
    public static int networkDelayTime(int[][] times, int n, int k) {
        List<int[]>[] graph = new List[n + 1];
        for (int i = 0; i <= n; i++) graph[i] = new ArrayList<>();
        for (int[] t : times) graph[t[0]].add(new int[]{t[1], t[2]});

        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[k] = 0;

        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        pq.offer(new int[]{0, k});

        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int d = curr[0], u = curr[1];
            if (d > dist[u]) continue;
            for (int[] edge : graph[u]) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }

        int maxDist = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) return -1;
            maxDist = Math.max(maxDist, dist[i]);
        }
        return maxDist;
    }

    public static void main(String[] args) {
        assert networkDelayTime(new int[][]{{2,1,1},{2,3,1},{3,4,1}}, 4, 2) == 2;
        assert networkDelayTime(new int[][]{{1,2,1}}, 2, 1) == 1;
        assert networkDelayTime(new int[][]{{1,2,1}}, 2, 2) == -1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
