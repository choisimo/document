/**
 * 문제 015: 유효한 괄호 (Valid Parentheses)
 *
 * [문제] 괄호 문자열이 올바르게 열리고 닫히는지 검증하라.
 * '(', ')', '{', '}', '[', ']'만 포함.
 *
 * [아키텍트의 시선]
 * 괄호 매칭은 컴파일러 파서, XML/HTML 유효성 검증,
 * 트랜잭션 범위 검증(Begin/Commit/Rollback)의 기본 원리다.
 * 스택은 중첩 구조를 선형으로 처리하는 가장 자연스러운 자료구조다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.Stack;
import java.util.Map;

public class P015ValidParentheses {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        Map<Character, Character> pairs = Map.of(')', '(', '}', '{', ']', '[');

        for (char c : s.toCharArray()) {
            if (pairs.containsValue(c)) {
                stack.push(c);
            } else if (pairs.containsKey(c)) {
                if (stack.isEmpty() || stack.pop() != pairs.get(c)) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        assert isValid("()");
        assert isValid("()[]{}");
        assert !isValid("(]");
        assert !isValid("([)]");
        assert isValid("{[]}");
        assert !isValid("]");
        assert isValid("");
        System.out.println("✓ 모든 테스트 통과!");
    }
}
