/**
 * 문제 023: 반복 없는 가장 긴 부분 문자열 (Longest Substring Without Repeating Characters)
 *
 * [문제] 문자열에서 중복 문자 없는 가장 긴 부분 문자열의 길이를 구하라.
 *
 * [아키텍트의 시선]
 * 슬라이딩 윈도우 + 해시맵은 스트리밍 데이터에서 고유 세션 추적,
 * 네트워크 패킷의 중복 감지 윈도우, 실시간 유니크 사용자 카운팅과 동일하다.
 * 윈도우의 확장/축소는 auto-scaling의 원리와 같다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(min(n, 문자집합크기))
 */
import java.util.*;

public class P023LongestSubstringWithoutRepeating {
    public static int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> lastSeen = new HashMap<>();
        int maxLen = 0;
        int start = 0;

        for (int end = 0; end < s.length(); end++) {
            char c = s.charAt(end);
            if (lastSeen.containsKey(c) && lastSeen.get(c) >= start) {
                start = lastSeen.get(c) + 1; // 중복 문자 다음으로 윈도우 시작점 이동
            }
            lastSeen.put(c, end);
            maxLen = Math.max(maxLen, end - start + 1);
        }
        return maxLen;
    }

    public static void main(String[] args) {
        assert lengthOfLongestSubstring("abcabcbb") == 3;
        assert lengthOfLongestSubstring("bbbbb") == 1;
        assert lengthOfLongestSubstring("pwwkew") == 3;
        assert lengthOfLongestSubstring("") == 0;
        assert lengthOfLongestSubstring("abcdef") == 6;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
