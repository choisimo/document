/**
 * 문제 076: 프림 MST (Prim's Minimum Spanning Tree)
 *
 * [문제] 가중치 무방향 그래프의 최소 신장 트리를 프림 알고리즘으로 구하라.
 *
 * [아키텍트의 시선]
 * 프림은 "현재 트리에서 가장 가까운 정점을 추가"하는 탐욕법이다.
 * 밀집 그래프에서 크루스칼보다 효율적이며,
 * 네트워크 확장(새 노드를 기존 인프라에 최소 비용으로 연결)과 동일하다.
 *
 * [시간 복잡도] O((V+E) log V) [공간 복잡도] O(V + E)
 */
import java.util.*;

public class P076Prim {
    @SuppressWarnings("unchecked")
    public static int primMST(int n, int[][] edges) {
        List<int[]>[] graph = new List[n];
        for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
        for (int[] e : edges) {
            graph[e[0]].add(new int[]{e[1], e[2]});
            graph[e[1]].add(new int[]{e[0], e[2]});
        }

        boolean[] inMST = new boolean[n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]); // {노드, 가중치}
        pq.offer(new int[]{0, 0});
        int totalWeight = 0, count = 0;

        while (!pq.isEmpty() && count < n) {
            int[] curr = pq.poll();
            int u = curr[0], w = curr[1];
            if (inMST[u]) continue;
            inMST[u] = true;
            totalWeight += w;
            count++;
            for (int[] edge : graph[u]) {
                if (!inMST[edge[0]]) {
                    pq.offer(new int[]{edge[0], edge[1]});
                }
            }
        }
        return totalWeight;
    }

    public static void main(String[] args) {
        int[][] edges = {{0,1,4},{0,2,1},{1,2,2},{1,3,5},{2,3,8},{3,4,3}};
        assert primMST(5, edges) == 11;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
