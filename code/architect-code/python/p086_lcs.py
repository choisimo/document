"""
문제 086: 최장 공통 부분수열 (Longest Common Subsequence)
[문제] 두 문자열의 최장 공통 부분수열(LCS)의 길이를 구하라.
[아키텍트의 시선] diff 알고리즘의 기초.
dp[i][j] = dp[i-1][j-1]+1 if match, else max(dp[i-1][j], dp[i][j-1]).
git diff, DNA 서열 비교, 문서 비교의 핵심 알고리즘.
실무: 버전 관리 diff, 표절 탐지, 바이오인포매틱스.
[시간 복잡도] O(m*n) [공간 복잡도] O(min(m,n))
"""


def lcs_length(text1: str, text2: str) -> int:
    """2D DP → 1D 최적화"""
    if len(text1) < len(text2):
        text1, text2 = text2, text1
    m, n = len(text1), len(text2)
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr
    return prev[n]


def lcs_string(text1: str, text2: str) -> str:
    """실제 LCS 문자열 복원"""
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    # 역추적
    result = []
    i, j = m, n
    while i > 0 and j > 0:
        if text1[i - 1] == text2[j - 1]:
            result.append(text1[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(result))


if __name__ == "__main__":
    assert lcs_length("abcde", "ace") == 3
    assert lcs_string("abcde", "ace") == "ace"
    assert lcs_length("abc", "def") == 0
    assert lcs_length("abc", "abc") == 3
    assert len(lcs_string("ABCBDAB", "BDCAB")) == 4  # BDAB 또는 BCAB 등 여러 정답 가능
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
