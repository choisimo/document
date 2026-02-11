/**
 * 문제 009: 문자열 압축 (String Compression / RLE)
 * [문제] 연속 반복 문자를 "문자+횟수"로 압축하라.
 * [아키텍트의 시선] Run-Length Encoding과 데이터 직렬화.
 * 데이터 압축의 가장 기본적인 형태. 이미지/팩스에서 사용.
 * 실무: 데이터 직렬화, 로그 압축, 네트워크 패킷 압축.
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
public class P009StringCompression {
    public static String compress(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder();
        int count = 1;
        for (int i = 1; i <= s.length(); i++) {
            if (i < s.length() && s.charAt(i) == s.charAt(i - 1)) {
                count++;
            } else {
                sb.append(s.charAt(i - 1));
                if (count > 1) sb.append(count);
                count = 1;
            }
        }
        return sb.length() < s.length() ? sb.toString() : s;
    }

    public static void main(String[] args) {
        assert compress("aabcccccaaa").equals("a2bc5a3");
        assert compress("abc").equals("abc");
        assert compress("aaa").equals("a3");
        assert compress("").equals("");
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
