/**
 * 문제 005: 문자열 뒤집기 (Reverse String)
 * [문제] 문자 배열을 in-place로 뒤집어라.
 * [아키텍트의 시선] 불변성 vs 가변성 트레이드오프.
 * Java String은 불변 → char[]로 가변 처리. 양끝 포인터 교환.
 * 실무: 버퍼 처리, 인코딩 변환, 데이터 직렬화.
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P005ReverseString {
    public static void reverseString(char[] s) {
        int left = 0, right = s.length - 1;
        while (left < right) {
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            left++;
            right--;
        }
    }

    public static void main(String[] args) {
        char[] a = {'h','e','l','l','o'};
        reverseString(a);
        assert new String(a).equals("olleh");
        char[] b = {'H','a','n','n','a','h'};
        reverseString(b);
        assert new String(b).equals("hannaH");
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
