/**
 * 문제 006: 애너그램 판별 (Valid Anagram)
 * [문제] 두 문자열이 애너그램인지 판별하라.
 * [아키텍트의 시선] 데이터 정규화와 동등성 비교.
 * 카운팅 배열로 문자 빈도 비교 → O(n) 시간, O(1) 공간.
 * 실무: 해시 기반 그룹핑, 데이터 정규화, 중복 탐지.
 * [시간 복잡도] O(n) [공간 복잡도] O(1) (26글자)
 */
public class P006ValidAnagram {
    public static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
            count[t.charAt(i) - 'a']--;
        }
        for (int c : count) {
            if (c != 0) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        assert isAnagram("anagram", "nagaram") == true;
        assert isAnagram("rat", "car") == false;
        assert isAnagram("", "") == true;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
