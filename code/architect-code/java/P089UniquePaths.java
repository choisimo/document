/**
 * 문제 089: 고유 경로 (Unique Paths)
 *
 * [문제] m x n 격자의 좌상단에서 우하단까지 오른쪽/아래로만 이동하는 경로 수를 구하라.
 *
 * [아키텍트의 시선]
 * 격자 DP와 조합론.
 * dp[i][j] = dp[i-1][j] + dp[i][j-1]. 조합론: C(m+n-2, m-1).
 * 1D 최적화: dp[j] += dp[j-1].
 * 실무: 네트워크 패킷 경로 수, 격자 기반 라우팅, 확률 계산.
 *
 * [시간 복잡도] O(m*n) DP / O(min(m,n)) 조합 [공간 복잡도] O(n)
 */

public class P089UniquePaths {
    // 1D DP
    public static int uniquePathsDP(int m, int n) {
        int[] dp = new int[n];
        java.util.Arrays.fill(dp, 1);
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[j] += dp[j - 1];
            }
        }
        return dp[n - 1];
    }

    // 조합론: C(m+n-2, m-1)
    public static long uniquePathsMath(int m, int n) {
        // C(m+n-2, min(m-1, n-1))
        int total = m + n - 2;
        int r = Math.min(m - 1, n - 1);
        long result = 1;
        for (int i = 0; i < r; i++) {
            result = result * (total - i) / (i + 1);
        }
        return result;
    }

    // 장애물이 있는 격자
    public static int uniquePathsObstacles(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        if (grid[0][0] == 1) return 0;
        int[] dp = new int[n];
        dp[0] = 1;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == 1) {
                    dp[j] = 0;
                } else if (j > 0) {
                    dp[j] += dp[j - 1];
                }
            }
        }
        return dp[n - 1];
    }

    public static void main(String[] args) {
        assert uniquePathsDP(3, 7) == 28;
        assert uniquePathsMath(3, 7) == 28;
        assert uniquePathsDP(3, 2) == 3;
        assert uniquePathsMath(3, 2) == 3;
        // 장애물
        assert uniquePathsObstacles(new int[][]{{0,0,0},{0,1,0},{0,0,0}}) == 2;
        assert uniquePathsObstacles(new int[][]{{1}}) == 0;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
