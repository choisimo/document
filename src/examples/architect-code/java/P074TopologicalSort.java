/**
 * 문제 074: 위상 정렬 (Topological Sort)
 *
 * [문제] DAG(방향 비순환 그래프)의 위상 정렬을 구하라.
 * Kahn 알고리즘(BFS 기반)과 DFS 기반 모두 구현.
 *
 * [아키텍트의 시선]
 * 위상 정렬은 빌드 시스템(Make, Gradle), 패키지 의존성 해석(npm),
 * 워크플로우 실행 순서(Airflow DAG), 데이터 파이프라인 스케줄링의 핵심이다.
 * "의존하는 것이 먼저" = 선행 조건 만족 후 실행.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P074TopologicalSort {
    // Kahn 알고리즘 (BFS + 진입차수)
    @SuppressWarnings("unchecked")
    public static List<Integer> kahnSort(int n, int[][] edges) {
        List<Integer>[] graph = new List[n];
        int[] inDegree = new int[n];
        for (int i = 0; i < n; i++) graph[i] = new ArrayList<>();
        for (int[] e : edges) {
            graph[e[0]].add(e[1]);
            inDegree[e[1]]++;
        }

        Queue<Integer> queue = new LinkedList<>();
        for (int i = 0; i < n; i++) {
            if (inDegree[i] == 0) queue.offer(i);
        }

        List<Integer> result = new ArrayList<>();
        while (!queue.isEmpty()) {
            int node = queue.poll();
            result.add(node);
            for (int neighbor : graph[node]) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0) queue.offer(neighbor);
            }
        }
        return result.size() == n ? result : Collections.emptyList(); // 사이클 감지
    }

    public static void main(String[] args) {
        // 0 → 1 → 3
        // 0 → 2 → 3
        int[][] edges = {{0,1},{0,2},{1,3},{2,3}};
        List<Integer> result = kahnSort(4, edges);
        assert result.size() == 4;
        assert result.indexOf(0) < result.indexOf(1);
        assert result.indexOf(0) < result.indexOf(2);
        assert result.indexOf(1) < result.indexOf(3);
        assert result.indexOf(2) < result.indexOf(3);

        // 사이클 감지
        int[][] cyclic = {{0,1},{1,2},{2,0}};
        assert kahnSort(3, cyclic).isEmpty();
        System.out.println("✓ 모든 테스트 통과!");
    }
}
