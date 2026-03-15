/**
 * 문제 044: 전화번호 문자 조합 (Letter Combinations of a Phone Number)
 *
 * [문제] 전화 키패드의 숫자에 해당하는 모든 문자 조합을 반환하라.
 *
 * [아키텍트의 시선]
 * 다중 입력의 카르테시안 곱(Cartesian Product)은
 * API 파라미터 조합 테스트, 설정 매트릭스 생성,
 * 멀티 플랫폼 빌드 매트릭스(CI/CD)와 동일한 패턴이다.
 *
 * [시간 복잡도] O(4^n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P044PhoneLetterCombinations {
    private static final String[] MAPPING = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };

    public static List<String> letterCombinations(String digits) {
        List<String> result = new ArrayList<>();
        if (digits == null || digits.isEmpty()) return result;
        backtrack(digits, 0, new StringBuilder(), result);
        return result;
    }

    private static void backtrack(String digits, int idx, StringBuilder current, List<String> result) {
        if (idx == digits.length()) {
            result.add(current.toString());
            return;
        }
        String letters = MAPPING[digits.charAt(idx) - '0'];
        for (char c : letters.toCharArray()) {
            current.append(c);
            backtrack(digits, idx + 1, current, result);
            current.deleteCharAt(current.length() - 1);
        }
    }

    public static void main(String[] args) {
        List<String> r = letterCombinations("23");
        assert r.size() == 9; // 3 * 3
        assert r.contains("ad");
        assert r.contains("cf");

        assert letterCombinations("").isEmpty();
        assert letterCombinations("2").size() == 3;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
