/**
 * 문제 073: 플로이드-워셜 알고리즘 (Floyd-Warshall Algorithm)
 *
 * [문제] 모든 정점 쌍 간의 최단 경로를 구하라.
 *
 * [아키텍트의 시선]
 * 플로이드-워셜은 "모든 쌍" 최단 경로를 구하는 DP 알고리즘이다.
 * 네트워크 토폴로지의 전체 라우팅 테이블 계산,
 * 도시 간 최소 비용 매트릭스, 서비스 간 지연시간 매트릭스 구축에 활용된다.
 *
 * [시간 복잡도] O(V^3) [공간 복잡도] O(V^2)
 */
public class P073FloydWarshall {
    static final int INF = 100000;

    public static int[][] floydWarshall(int[][] graph) {
        int n = graph.length;
        int[][] dist = new int[n][n];
        for (int i = 0; i < n; i++) {
            System.arraycopy(graph[i], 0, dist[i], 0, n);
        }

        // 경유지 k를 거치는 경로가 더 짧은지 확인
        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                    }
                }
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        int[][] graph = {
            {0,   3,   INF, 5},
            {2,   0,   INF, 4},
            {INF, 1,   0,   INF},
            {INF, INF, 2,   0}
        };
        int[][] result = floydWarshall(graph);
        assert result[0][0] == 0;
        assert result[0][1] == 3;
        assert result[0][2] == 7;  // 0→3→2
        assert result[0][3] == 5;
        assert result[2][0] == 3;  // 2→1→0
        assert result[1][2] == 6;  // 1→3→2
        System.out.println("✓ 모든 테스트 통과!");
    }
}
