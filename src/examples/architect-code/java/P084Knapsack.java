/**
 * 문제 084: 0/1 배낭 문제 (0/1 Knapsack)
 *
 * [문제] n개 물건(무게 w[i], 가치 v[i])을 용량 W인 배낭에 넣을 때 최대 가치를 구하라.
 *
 * [아키텍트의 시선]
 * 제약 하 최적화의 원형.
 * dp[i][w] = max(dp[i-1][w], dp[i-1][w-w[i]] + v[i])
 * '넣는다/안 넣는다' 이진 선택 → 제약 최적화 문제의 기본 프레임.
 * 1D 배열 최적화: 역순 갱신으로 O(W) 공간.
 * 실무: 예산 배분, 서버 용량 할당, 포트폴리오 최적화.
 *
 * [시간 복잡도] O(n*W) [공간 복잡도] O(W)
 */

public class P084Knapsack {
    // 2D DP
    public static int knapsack2D(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[][] dp = new int[n + 1][capacity + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w]; // 안 넣는 경우
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                }
            }
        }
        return dp[n][capacity];
    }

    // 1D DP 최적화 (역순 갱신)
    public static int knapsack1D(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int i = 0; i < weights.length; i++) {
            for (int w = capacity; w >= weights[i]; w--) { // 역순!
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
        return dp[capacity];
    }

    public static void main(String[] args) {
        int[] weights = {2, 3, 4, 5};
        int[] values = {3, 4, 5, 6};
        assert knapsack2D(weights, values, 5) == 7;  // 물건0+물건1
        assert knapsack1D(weights, values, 5) == 7;
        assert knapsack2D(weights, values, 8) == 10;
        assert knapsack1D(weights, values, 8) == 10;
        assert knapsack1D(new int[]{}, new int[]{}, 10) == 0;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
