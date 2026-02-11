/**
 * 문제 083: 동전 교환 (Coin Change)
 *
 * [문제] coins[] 동전으로 amount를 만드는 최소 동전 수를 구하라. 불가능하면 -1.
 *
 * [아키텍트의 시선]
 * 완전 탐색→DP 사고 전환 (완전 배낭).
 * dp[i] = min(dp[i], dp[i - coin] + 1) for each coin.
 * 탐욕(가장 큰 동전부터)은 실패 가능 → DP가 필수인 이유.
 * 실무: 리소스 최적 할당, API 호출 최소화, 패킷 분할.
 *
 * [시간 복잡도] O(amount * coins.length) [공간 복잡도] O(amount)
 */
import java.util.*;

public class P083CoinChange {
    // 최소 동전 수
    public static int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int coin : coins) {
                if (coin <= i && dp[i - coin] + 1 < dp[i]) {
                    dp[i] = dp[i - coin] + 1;
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }

    // 조합 수 (방법의 수)
    public static int coinChangeCount(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        dp[0] = 1;
        for (int coin : coins) {
            for (int i = coin; i <= amount; i++) {
                dp[i] += dp[i - coin];
            }
        }
        return dp[amount];
    }

    public static void main(String[] args) {
        assert coinChange(new int[]{1,5,10,25}, 30) == 2;  // 25+5
        assert coinChange(new int[]{1,2,5}, 11) == 3;       // 5+5+1
        assert coinChange(new int[]{2}, 3) == -1;
        assert coinChange(new int[]{1}, 0) == 0;
        // 조합 수
        assert coinChangeCount(new int[]{1,2,5}, 5) == 4;   // {5, 2+2+1, 2+1+1+1, 1*5}
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
