/**
 * 문제 098: 행렬 곱셈 순서 (Matrix Chain Multiplication / Interval DP)
 *
 * [문제] n개 행렬의 곱셈 순서를 최적화하여 최소 스칼라 곱셈 횟수를 구하라.
 *        dims = [d0, d1, ..., dn] -> 행렬 i는 dims[i] x dims[i+1].
 *
 * [아키텍트의 시선]
 * 구간 DP (Interval DP)와 최적 분할.
 * dp[i][j] = min(dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1])
 * 구간의 길이를 점점 늘려가며 최적 분할점 탐색.
 * 실무: 쿼리 실행 계획 최적화, 컴파일러 최적화, 자원 분배 전략.
 *
 * [시간 복잡도] O(n^3) [공간 복잡도] O(n^2)
 */

public class P098MatrixChain {
    // Bottom-up 구간 DP
    public static int matrixChainOrder(int[] dims) {
        int n = dims.length - 1; // 행렬 수
        int[][] dp = new int[n][n];
        for (int length = 2; length <= n; length++) { // 구간 길이
            for (int i = 0; i <= n - length; i++) {
                int j = i + length - 1;
                dp[i][j] = Integer.MAX_VALUE;
                for (int k = i; k < j; k++) {
                    int cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                    dp[i][j] = Math.min(dp[i][j], cost);
                }
            }
        }
        return dp[0][n - 1];
    }

    public static void main(String[] args) {
        // A(10x30) * B(30x5) * C(5x60)
        assert matrixChainOrder(new int[]{10, 30, 5, 60}) == 4500;
        // (A*B)*C = 10*30*5 + 10*5*60 = 1500+3000 = 4500
        assert matrixChainOrder(new int[]{40, 20, 30, 10, 30}) == 26000;
        assert matrixChainOrder(new int[]{10, 20}) == 0; // 단일 행렬
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
