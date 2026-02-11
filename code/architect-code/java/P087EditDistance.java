/**
 * 문제 087: 편집 거리 (Edit Distance / Levenshtein Distance)
 *
 * [문제] 문자열 word1을 word2로 변환하는 최소 연산(삽입/삭제/교체) 수를 구하라.
 *
 * [아키텍트의 시선]
 * 문자열 유사도 측정.
 * dp[i][j] = word1[:i] → word2[:j] 최소 편집.
 * 삽입(dp[i][j-1]+1), 삭제(dp[i-1][j]+1), 교체(dp[i-1][j-1]+1).
 * 실무: 맞춤법 검사, DNA 돌연변이 분석, 퍼지 매칭, 자동 수정.
 *
 * [시간 복잡도] O(m*n) [공간 복잡도] O(min(m,n))
 */

public class P087EditDistance {
    public static int minDistance(String word1, String word2) {
        int m = word1.length(), n = word2.length();
        if (m < n) return minDistance(word2, word1); // 짧은 쪽을 열로
        int[] prev = new int[n + 1];
        for (int j = 0; j <= n; j++) prev[j] = j;
        for (int i = 1; i <= m; i++) {
            int[] curr = new int[n + 1];
            curr[0] = i;
            for (int j = 1; j <= n; j++) {
                if (word1.charAt(i - 1) == word2.charAt(j - 1)) {
                    curr[j] = prev[j - 1];
                } else {
                    curr[j] = 1 + Math.min(prev[j],        // 삭제
                                  Math.min(curr[j - 1],     // 삽입
                                           prev[j - 1]));   // 교체
                }
            }
            prev = curr;
        }
        return prev[n];
    }

    public static void main(String[] args) {
        assert minDistance("horse", "ros") == 3;
        assert minDistance("intention", "execution") == 5;
        assert minDistance("", "abc") == 3;
        assert minDistance("abc", "abc") == 0;
        assert minDistance("kitten", "sitting") == 3;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
