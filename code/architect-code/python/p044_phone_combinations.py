"""
문제 044: 전화번호 문자 조합 (Letter Combinations of Phone Number)
[문제] 전화 다이얼의 숫자 조합으로 가능한 모든 문자 조합을 구하라.
[아키텍트의 시선] 카티전 프로덕트와 매핑 테이블. 각 자릿수는 독립.
[시간 복잡도] O(4^n) [공간 복잡도] O(n)
"""
from typing import List

PHONE_MAP = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl",
             "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}

def letter_combinations(digits: str) -> List[str]:
    if not digits:
        return []
    result = []
    def backtrack(idx, path):
        if idx == len(digits):
            result.append("".join(path))
            return
        for char in PHONE_MAP[digits[idx]]:
            path.append(char)
            backtrack(idx + 1, path)
            path.pop()
    backtrack(0, [])
    return result

if __name__ == "__main__":
    assert sorted(letter_combinations("23")) == sorted(["ad","ae","af","bd","be","bf","cd","ce","cf"])
    assert letter_combinations("") == []
    assert letter_combinations("2") == ["a", "b", "c"]
    print("✓ 모든 테스트 통과!")
