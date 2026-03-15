/**
 * 문제 049: 괄호 생성 (Generate Parentheses)
 *
 * [문제] n쌍의 괄호로 만들 수 있는 모든 유효한 조합을 생성하라.
 *
 * [아키텍트의 시선]
 * 유효한 괄호 생성은 문법 기반 코드 생성, API 스키마 유효성 검증,
 * 컴파일러의 구문 트리 생성과 동일한 패턴이다.
 * "열린 괄호 수 >= 닫힌 괄호 수" 불변식은 리소스 할당/해제의 순서 규칙이다.
 *
 * [시간 복잡도] O(4^n / sqrt(n)) 카탈란 수 [공간 복잡도] O(n)
 */
import java.util.*;

public class P049GenerateParentheses {
    public static List<String> generateParenthesis(int n) {
        List<String> result = new ArrayList<>();
        backtrack(n, 0, 0, new StringBuilder(), result);
        return result;
    }

    private static void backtrack(int n, int open, int close, StringBuilder current, List<String> result) {
        if (current.length() == 2 * n) {
            result.add(current.toString());
            return;
        }
        if (open < n) {
            current.append('(');
            backtrack(n, open + 1, close, current, result);
            current.deleteCharAt(current.length() - 1);
        }
        if (close < open) {
            current.append(')');
            backtrack(n, open, close + 1, current, result);
            current.deleteCharAt(current.length() - 1);
        }
    }

    public static void main(String[] args) {
        List<String> r = generateParenthesis(3);
        assert r.size() == 5; // 카탈란 수 C(3) = 5
        assert r.contains("((()))");
        assert r.contains("(()())");
        assert r.contains("(())()");

        assert generateParenthesis(1).size() == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
