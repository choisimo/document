/**
 * 문제 097: 비트 카운팅 (Counting Bits)
 *
 * [문제] 0부터 n까지 각 정수의 1-비트 개수를 배열로 반환하라.
 *
 * [아키텍트의 시선]
 * DP와 비트 연산의 결합.
 * dp[i] = dp[i >> 1] + (i & 1) — 이전 결과 재활용.
 * 또는 dp[i] = dp[i & (i-1)] + 1 — 최하위 비트 제거.
 * 실무: 에러 율 계산, 해밍 가중치, 비트맵 인덱스.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.Arrays;

public class P097CountingBits {
    // DP: dp[i] = dp[i >> 1] + (i & 1)
    public static int[] countBits(int n) {
        int[] dp = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            dp[i] = dp[i >> 1] + (i & 1);
        }
        return dp;
    }

    // DP: dp[i] = dp[i & (i-1)] + 1
    public static int[] countBitsV2(int n) {
        int[] dp = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            dp[i] = dp[i & (i - 1)] + 1;
        }
        return dp;
    }

    public static void main(String[] args) {
        assert Arrays.equals(countBits(2), new int[]{0, 1, 1});
        assert Arrays.equals(countBits(5), new int[]{0, 1, 1, 2, 1, 2});
        assert Arrays.equals(countBitsV2(5), new int[]{0, 1, 1, 2, 1, 2});
        assert Arrays.equals(countBits(0), new int[]{0});
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
