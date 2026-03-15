/**
 * 문제 072: 벨만-포드 알고리즘 (Bellman-Ford Algorithm)
 *
 * [문제] 음수 가중치 간선이 있는 그래프에서 최단 경로를 구하라.
 * 음수 사이클도 감지하라.
 *
 * [아키텍트의 시선]
 * 벨만-포드의 반복적 완화(Relaxation)는 분산 시스템의 수렴 프로토콜,
 * BGP 라우팅의 경로 갱신, 최종 일관성(Eventual Consistency)과 동일하다.
 * "V-1번 반복하면 수렴" = 네트워크 지름만큼 정보가 전파되면 안정.
 *
 * [시간 복잡도] O(V * E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P072BellmanFord {
    public static int[] bellmanFord(int n, int[][] edges, int src) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        // V-1번 반복: 모든 간선에 대해 완화
        for (int i = 0; i < n - 1; i++) {
            boolean updated = false;
            for (int[] edge : edges) {
                int u = edge[0], v = edge[1], w = edge[2];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    updated = true;
                }
            }
            if (!updated) break; // 조기 종료 최적화
        }

        // 음수 사이클 감지: V번째 반복에서도 갱신되면 음수 사이클 존재
        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], w = edge[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                return null; // 음수 사이클
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        int[][] edges = {{0,1,4},{0,2,1},{2,1,2},{1,3,1},{2,3,5},{3,4,3}};
        int[] dist = bellmanFord(5, edges, 0);
        assert dist != null;
        assert dist[0] == 0;
        assert dist[1] == 3;
        assert dist[3] == 4;
        assert dist[4] == 7;

        // 음수 가중치
        int[][] edges2 = {{0,1,1},{1,2,-3},{2,0,1}};
        int[] dist2 = bellmanFord(3, edges2, 0);
        assert dist2 == null; // 음수 사이클
        System.out.println("✓ 모든 테스트 통과!");
    }
}
