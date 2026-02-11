/**
 * 문제 086: 최장 공통 부분수열 (Longest Common Subsequence)
 *
 * [문제] 두 문자열의 최장 공통 부분수열(LCS)의 길이를 구하라.
 *
 * [아키텍트의 시선]
 * diff 알고리즘의 기초.
 * dp[i][j] = dp[i-1][j-1]+1 if match, else max(dp[i-1][j], dp[i][j-1]).
 * git diff, DNA 서열 비교, 문서 비교의 핵심 알고리즘.
 * 실무: 버전 관리 diff, 표절 탐지, 바이오인포매틱스.
 *
 * [시간 복잡도] O(m*n) [공간 복잡도] O(min(m,n))
 */

public class P086LCS {
    // 1D 최적화된 LCS 길이
    public static int lcsLength(String text1, String text2) {
        if (text1.length() < text2.length()) {
            String tmp = text1; text1 = text2; text2 = tmp;
        }
        int m = text1.length(), n = text2.length();
        int[] prev = new int[n + 1];
        for (int i = 1; i <= m; i++) {
            int[] curr = new int[n + 1];
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                    curr[j] = prev[j - 1] + 1;
                } else {
                    curr[j] = Math.max(prev[j], curr[j - 1]);
                }
            }
            prev = curr;
        }
        return prev[n];
    }

    // 실제 LCS 문자열 복원
    public static String lcsString(String text1, String text2) {
        int m = text1.length(), n = text2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        // 역추적
        StringBuilder sb = new StringBuilder();
        int i = m, j = n;
        while (i > 0 && j > 0) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                sb.append(text1.charAt(i - 1));
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        return sb.reverse().toString();
    }

    public static void main(String[] args) {
        assert lcsLength("abcde", "ace") == 3;
        assert lcsString("abcde", "ace").equals("ace");
        assert lcsLength("abc", "def") == 0;
        assert lcsLength("abc", "abc") == 3;
        assert lcsString("ABCBDAB", "BDCAB").length() == 4; // BDAB 또는 BCAB 등
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
