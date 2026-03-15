/**
 * 문제 077: 강한 연결 요소 (Strongly Connected Components — Kosaraju)
 *
 * [문제] 방향 그래프에서 강한 연결 요소(SCC)를 찾아라.
 *
 * [아키텍트의 시선]
 * SCC는 시스템의 순환 의존성 그룹을 식별한다.
 * 마이크로서비스의 순환 호출 그룹, 데이터베이스 테이블의 순환 FK,
 * 패키지 의존성의 순환 그룹 감지에 핵심이다.
 * SCC 내부는 모두 상호 도달 가능 → 하나의 모듈로 응집해야 한다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P077SCC {
    @SuppressWarnings("unchecked")
    public static List<List<Integer>> kosaraju(int n, int[][] edges) {
        // 1. 원본 그래프 구축
        List<Integer>[] graph = new List[n];
        List<Integer>[] reverse = new List[n];
        for (int i = 0; i < n; i++) { graph[i] = new ArrayList<>(); reverse[i] = new ArrayList<>(); }
        for (int[] e : edges) {
            graph[e[0]].add(e[1]);
            reverse[e[1]].add(e[0]);
        }

        // 2. 첫 번째 DFS: 종료 순서 기록
        boolean[] visited = new boolean[n];
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (!visited[i]) dfs1(graph, i, visited, stack);
        }

        // 3. 역방향 그래프에서 DFS: SCC 추출
        visited = new boolean[n];
        List<List<Integer>> sccs = new ArrayList<>();
        while (!stack.isEmpty()) {
            int node = stack.pop();
            if (!visited[node]) {
                List<Integer> scc = new ArrayList<>();
                dfs2(reverse, node, visited, scc);
                sccs.add(scc);
            }
        }
        return sccs;
    }

    private static void dfs1(List<Integer>[] graph, int node, boolean[] visited, Deque<Integer> stack) {
        visited[node] = true;
        for (int next : graph[node]) {
            if (!visited[next]) dfs1(graph, next, visited, stack);
        }
        stack.push(node);
    }

    private static void dfs2(List<Integer>[] reverse, int node, boolean[] visited, List<Integer> scc) {
        visited[node] = true;
        scc.add(node);
        for (int next : reverse[node]) {
            if (!visited[next]) dfs2(reverse, next, visited, scc);
        }
    }

    public static void main(String[] args) {
        // 0→1→2→0 (SCC), 1→3→4→3 (SCC {3,4})
        int[][] edges = {{0,1},{1,2},{2,0},{1,3},{3,4},{4,3}};
        List<List<Integer>> sccs = kosaraju(5, edges);
        assert sccs.size() == 2;
        // 각 SCC를 정렬해서 확인
        Set<Set<Integer>> sccSets = new HashSet<>();
        for (List<Integer> scc : sccs) sccSets.add(new HashSet<>(scc));
        assert sccSets.contains(new HashSet<>(Arrays.asList(0, 1, 2)));
        assert sccSets.contains(new HashSet<>(Arrays.asList(3, 4)));
        System.out.println("✓ 모든 테스트 통과!");
    }
}
