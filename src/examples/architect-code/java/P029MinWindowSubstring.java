/**
 * 문제 029: 최소 윈도우 부분 문자열 (Minimum Window Substring)
 *
 * [문제] 문자열 s에서 문자열 t의 모든 문자를 포함하는 최소 길이 윈도우를 찾아라.
 *
 * [아키텍트의 시선]
 * 슬라이딩 윈도우의 확장/축소는 auto-scaling의 정수다.
 * "필요한 조건을 만족할 때까지 확장, 만족하면 축소" —
 * 이는 리소스 프로비저닝, 커넥션 풀 조절과 동일한 알고리즘이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(문자집합 크기)
 */
import java.util.*;

public class P029MinWindowSubstring {
    public static String minWindow(String s, String t) {
        if (s.isEmpty() || t.isEmpty()) return "";

        Map<Character, Integer> need = new HashMap<>();
        for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);

        int required = need.size(); // 만족시켜야 할 고유 문자 수
        int formed = 0;
        Map<Character, Integer> window = new HashMap<>();
        int[] ans = {Integer.MAX_VALUE, 0, 0}; // {길이, 시작, 끝}
        int left = 0;

        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            window.merge(c, 1, Integer::sum);

            if (need.containsKey(c) && window.get(c).intValue() == need.get(c).intValue()) {
                formed++;
            }

            // 조건 만족 → 윈도우 축소 시도
            while (left <= right && formed == required) {
                if (right - left + 1 < ans[0]) {
                    ans[0] = right - left + 1;
                    ans[1] = left;
                    ans[2] = right;
                }
                char lc = s.charAt(left);
                window.merge(lc, -1, Integer::sum);
                if (need.containsKey(lc) && window.get(lc) < need.get(lc)) {
                    formed--;
                }
                left++;
            }
        }
        return ans[0] == Integer.MAX_VALUE ? "" : s.substring(ans[1], ans[2] + 1);
    }

    public static void main(String[] args) {
        assert minWindow("ADOBECODEBANC", "ABC").equals("BANC");
        assert minWindow("a", "a").equals("a");
        assert minWindow("a", "aa").equals("");
        System.out.println("✓ 모든 테스트 통과!");
    }
}
