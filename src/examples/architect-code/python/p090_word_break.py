"""
문제 090: 단어 분리 (Word Break)
[문제] 문자열 s를 사전 wordDict의 단어들로 분리할 수 있는지 판별하라.
[아키텍트의 시선] 문자열 DP와 트라이 기반 최적화.
dp[i] = s[:i]가 분리 가능한가. dp[i] = any(dp[j] and s[j:i] in dict).
트라이 사용 시 접두사 매칭 최적화 가능.
실무: 자연어 처리(형태소 분석), URL 파싱, 토크나이저.
[시간 복잡도] O(n^2) 또는 O(n*m) m=최대 단어 길이 [공간 복잡도] O(n)
"""
from typing import List

def word_break(s: str, word_dict: List[str]) -> bool:
    """DP 풀이"""
    word_set = set(word_dict)
    n = len(s)
    dp = [False] * (n + 1)
    dp[0] = True
    for i in range(1, n + 1):
        for j in range(i):
            if dp[j] and s[j:i] in word_set:
                dp[i] = True
                break
    return dp[n]

def word_break_all(s: str, word_dict: List[str]) -> List[str]:
    """모든 분리 방법 반환 (백트래킹)"""
    word_set = set(word_dict)
    result = []
    def backtrack(start, path):
        if start == len(s):
            result.append(" ".join(path))
            return
        for end in range(start + 1, len(s) + 1):
            word = s[start:end]
            if word in word_set:
                backtrack(end, path + [word])
    backtrack(0, [])
    return result

if __name__ == "__main__":
    assert word_break("leetcode", ["leet", "code"]) == True
    assert word_break("applepenapple", ["apple", "pen"]) == True
    assert word_break("catsandog", ["cats", "dog", "sand", "and", "cat"]) == False
    # 모든 분리
    result = word_break_all("catsanddog", ["cat","cats","and","sand","dog"])
    assert "cats and dog" in result
    assert "cat sand dog" in result
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
