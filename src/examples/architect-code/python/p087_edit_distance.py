"""
문제 087: 편집 거리 (Edit Distance / Levenshtein Distance)
[문제] 문자열 word1을 word2로 변환하는 최소 연산(삽입/삭제/교체) 수를 구하라.
[아키텍트의 시선] 문자열 유사도 측정.
dp[i][j] = word1[:i] → word2[:j] 최소 편집.
삽입(dp[i][j-1]+1), 삭제(dp[i-1][j]+1), 교체(dp[i-1][j-1]+1).
실무: 맞춤법 검사, DNA 돌연변이 분석, 퍼지 매칭, 자동 수정.
[시간 복잡도] O(m*n) [공간 복잡도] O(min(m,n))
"""

def min_distance(word1: str, word2: str) -> int:
    """1D 공간 최적화"""
    m, n = len(word1), len(word2)
    if m < n:
        word1, word2 = word2, word1
        m, n = n, m
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                curr[j] = prev[j-1]
            else:
                curr[j] = 1 + min(prev[j],      # 삭제
                                  curr[j-1],     # 삽입
                                  prev[j-1])     # 교체
        prev = curr
    return prev[n]

if __name__ == "__main__":
    assert min_distance("horse", "ros") == 3
    assert min_distance("intention", "execution") == 5
    assert min_distance("", "abc") == 3
    assert min_distance("abc", "abc") == 0
    assert min_distance("kitten", "sitting") == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
