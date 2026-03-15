/**
 * 문제 068: 이분 그래프 판별 (Is Graph Bipartite)
 *
 * [문제] 그래프가 이분 그래프(두 그룹으로 나눌 수 있는)인지 판별하라.
 *
 * [아키텍트의 시선]
 * 이분 그래프 판별은 시스템의 "두 역할 분리 가능성" 검증이다.
 * 클라이언트-서버 분리, 읽기/쓰기 분리(CQRS), 매칭 문제(구직-채용)의
 * 기초 조건 확인과 동일한 패턴이다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P068Bipartite {
    public static boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n]; // 0: 미색칠, 1/-1: 두 색
        Arrays.fill(color, 0);

        for (int i = 0; i < n; i++) {
            if (color[i] != 0) continue;
            // BFS로 색칠
            Queue<Integer> queue = new LinkedList<>();
            queue.offer(i);
            color[i] = 1;
            while (!queue.isEmpty()) {
                int node = queue.poll();
                for (int neighbor : graph[node]) {
                    if (color[neighbor] == 0) {
                        color[neighbor] = -color[node];
                        queue.offer(neighbor);
                    } else if (color[neighbor] == color[node]) {
                        return false; // 같은 색 인접 → 이분 그래프 아님
                    }
                }
            }
        }
        return true;
    }

    public static void main(String[] args) {
        assert isBipartite(new int[][]{{1,3},{0,2},{1,3},{0,2}});
        assert !isBipartite(new int[][]{{1,2,3},{0,2},{0,1,3},{0,2}});
        assert isBipartite(new int[][]{{}}); // 단일 노드
        System.out.println("✓ 모든 테스트 통과!");
    }
}
