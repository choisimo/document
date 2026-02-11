/**
 * 문제 079: 경로 존재 확인 (Path Exists in Graph)
 *
 * [문제] 무방향 그래프에서 두 노드 사이에 경로가 있는지 판별하라.
 *
 * [아키텍트의 시선]
 * 경로 존재 확인은 네트워크 연결성 테스트, 서비스 도달 가능성 검증,
 * 방화벽 규칙의 트래픽 경로 확인과 동일하다.
 * BFS/DFS/Union-Find 중 상황에 맞는 선택이 중요하다.
 *
 * [시간 복잡도] O(V + E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P079PathExists {
    // Union-Find 방법
    static int[] parent;

    static int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }

    public static boolean validPath(int n, int[][] edges, int source, int destination) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;

        for (int[] e : edges) {
            int px = find(e[0]), py = find(e[1]);
            if (px != py) parent[px] = py;
        }
        return find(source) == find(destination);
    }

    public static void main(String[] args) {
        assert validPath(3, new int[][]{{0,1},{1,2},{2,0}}, 0, 2);
        assert !validPath(6, new int[][]{{0,1},{0,2},{3,5},{5,4},{4,3}}, 0, 5);
        assert validPath(1, new int[][]{}, 0, 0);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
