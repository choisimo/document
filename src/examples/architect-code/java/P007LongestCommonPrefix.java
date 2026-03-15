/**
 * 문제 007: 최장 공통 접두사 (Longest Common Prefix)
 * [문제] 문자열 배열의 최장 공통 접두사를 구하라.
 * [아키텍트의 시선] 조기 종료(Early Exit) 전략.
 * 수직 탐색: 첫 문자열의 각 위치에서 모든 문자열 비교 → 불일치 시 즉시 반환.
 * 실무: 파일 경로 공통 접두사, DNS 접미사 매칭, 라우팅 테이블.
 * [시간 복잡도] O(S) S=모든 문자 총합 [공간 복잡도] O(1)
 */
public class P007LongestCommonPrefix {
    public static String longestCommonPrefix(String[] strs) {
        if (strs == null || strs.length == 0) return "";
        for (int i = 0; i < strs[0].length(); i++) {
            char c = strs[0].charAt(i);
            for (int j = 1; j < strs.length; j++) {
                if (i >= strs[j].length() || strs[j].charAt(i) != c) {
                    return strs[0].substring(0, i);
                }
            }
        }
        return strs[0];
    }

    public static void main(String[] args) {
        assert longestCommonPrefix(new String[]{"flower","flow","flight"}).equals("fl");
        assert longestCommonPrefix(new String[]{"dog","racecar","car"}).equals("");
        assert longestCommonPrefix(new String[]{"a"}).equals("a");
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
