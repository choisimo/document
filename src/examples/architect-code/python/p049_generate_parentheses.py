"""
문제 049: 괄호 생성 (Generate Parentheses)
[문제] n쌍의 유효한 괄호 조합을 모두 생성하라.
[아키텍트의 시선] 문법 생성(Grammar Production)과 카탈란 수.
조건: open < n이면 여는 괄호 추가, close < open이면 닫는 괄호 추가.
실무: 구문 트리 생성, 코드 자동 생성, 템플릿 엔진.
[시간 복잡도] O(4^n / sqrt(n)) - 카탈란 수
"""
from typing import List

def generate_parenthesis(n: int) -> List[str]:
    result = []
    def backtrack(current, open_count, close_count):
        if len(current) == 2 * n:
            result.append("".join(current))
            return
        if open_count < n:
            current.append("(")
            backtrack(current, open_count + 1, close_count)
            current.pop()
        if close_count < open_count:
            current.append(")")
            backtrack(current, open_count, close_count + 1)
            current.pop()
    backtrack([], 0, 0)
    return result

if __name__ == "__main__":
    assert sorted(generate_parenthesis(3)) == sorted(["((()))","(()())","(())()","()(())","()()()"])
    assert generate_parenthesis(1) == ["()"]
    print("✓ 모든 테스트 통과!")
