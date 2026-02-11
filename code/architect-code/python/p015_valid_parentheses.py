"""
==========================================================
문제 015: 유효한 괄호 (Valid Parentheses)
==========================================================

[문제 설명]
'(', ')', '{', '}', '[', ']' 로 이루어진 문자열의 괄호 유효성을 판별.

[아키텍트의 시선 - 스택 기반 상태 머신과 구문 분석]
컴파일러의 구문 분석기(Parser)는 이 패턴의 확장.
스택은 "가장 최근에 열린 것을 먼저 닫아야 한다"는 LIFO 제약을 강제.
실무: HTML/XML 파서, 표현식 평가기, IDE 괄호 매칭.

[시간 복잡도] O(n) [공간 복잡도] O(n)
"""


def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}

    for char in s:
        if char in mapping:
            if not stack or stack[-1] != mapping[char]:
                return False
            stack.pop()
        else:
            stack.append(char)

    return len(stack) == 0


if __name__ == "__main__":
    assert is_valid("()") is True
    assert is_valid("()[]{}") is True
    assert is_valid("(]") is False
    assert is_valid("([)]") is False
    assert is_valid("{[]}") is True
    assert is_valid("") is True
    assert is_valid("(") is False

    print("✓ 모든 테스트 통과!")
