/**
 * 문제 050: 섬의 개수 (Number of Islands)
 *
 * [문제] '1'(육지)과 '0'(물)로 이루어진 2D 격자에서 섬의 개수를 구하라.
 * 상하좌우로 연결된 '1'은 하나의 섬이다.
 *
 * [아키텍트의 시선]
 * 연결 요소(Connected Component) 탐색은 네트워크 토폴로지에서
 * 독립 클러스터 식별, 소셜 네트워크의 커뮤니티 탐지,
 * 마이크로서비스 의존성 그래프의 독립 그룹 발견과 동일하다.
 * DFS/BFS/Union-Find 모두 적용 가능한 다면적 문제다.
 *
 * [시간 복잡도] O(m * n) [공간 복잡도] O(m * n) 최악 재귀 스택
 */
public class P050NumberOfIslands {
    public static int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        int m = grid.length, n = grid[0].length;
        int count = 0;

        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == '1') {
                    count++;
                    dfs(grid, i, j, m, n);
                }
            }
        }
        return count;
    }

    private static void dfs(char[][] grid, int i, int j, int m, int n) {
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] != '1') return;
        grid[i][j] = '0'; // 방문 마킹 (물로 변환)
        dfs(grid, i+1, j, m, n);
        dfs(grid, i-1, j, m, n);
        dfs(grid, i, j+1, m, n);
        dfs(grid, i, j-1, m, n);
    }

    public static void main(String[] args) {
        char[][] g1 = {
            {'1','1','1','1','0'},
            {'1','1','0','1','0'},
            {'1','1','0','0','0'},
            {'0','0','0','0','0'}
        };
        assert numIslands(g1) == 1;

        char[][] g2 = {
            {'1','1','0','0','0'},
            {'1','1','0','0','0'},
            {'0','0','1','0','0'},
            {'0','0','0','1','1'}
        };
        assert numIslands(g2) == 3;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
