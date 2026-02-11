/**
 * 문제 099: 최대 사각형 (Maximal Square)
 *
 * [문제] 0과 1로 이루어진 2D 행렬에서 모두 1인 가장 큰 정사각형의 넓이를 구하라.
 *
 * [아키텍트의 시선]
 * 기하학적 DP 최적화.
 * dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1 (matrix[i][j]=='1'일 때).
 * 왼쪽, 위, 대각선의 최소 정사각형 + 1 = 현재 가능한 최대 변.
 * 실무: 이미지 처리의 영역 탐지, UI 레이아웃 최적 영역, 지도 분석.
 *
 * [시간 복잡도] O(m*n) [공간 복잡도] O(n)
 */

public class P099MaximalSquare {
    public static int maximalSquare(char[][] matrix) {
        if (matrix.length == 0) return 0;
        int m = matrix.length, n = matrix[0].length;
        int[] dp = new int[n + 1];
        int maxSide = 0, prev = 0;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                int temp = dp[j];
                if (matrix[i - 1][j - 1] == '1') {
                    dp[j] = Math.min(dp[j], Math.min(dp[j - 1], prev)) + 1;
                    maxSide = Math.max(maxSide, dp[j]);
                } else {
                    dp[j] = 0;
                }
                prev = temp;
            }
            prev = 0;
        }
        return maxSide * maxSide;
    }

    public static void main(String[] args) {
        char[][] m1 = {
            {'1','0','1','0','0'},
            {'1','0','1','1','1'},
            {'1','1','1','1','1'},
            {'1','0','0','1','0'}
        };
        assert maximalSquare(m1) == 4;  // 2x2
        char[][] m2 = {{'0','1'},{'1','0'}};
        assert maximalSquare(m2) == 1;
        char[][] m3 = {{'0'}};
        assert maximalSquare(m3) == 0;
        char[][] m4 = {{'1','1','1'},{'1','1','1'},{'1','1','1'}};
        assert maximalSquare(m4) == 9;  // 3x3
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
