"""
문제 099: 최대 사각형 (Maximal Square)
[문제] 0과 1로 이루어진 2D 행렬에서 모두 1인 가장 큰 정사각형의 넓이를 구하라.
[아키텍트의 시선] 기하학적 DP 최적화.
dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1 (matrix[i][j]=="1"일 때).
왼쪽, 위, 대각선의 최소 정사각형 + 1 = 현재 가능한 최대 변.
실무: 이미지 처리의 영역 탐지, UI 레이아웃 최적 영역, 지도 분석.
[시간 복잡도] O(m*n) [공간 복잡도] O(n)
"""
from typing import List

def maximal_square(matrix: List[List[str]]) -> int:
    if not matrix:
        return 0
    m, n = len(matrix), len(matrix[0])
    dp = [0] * (n + 1)
    max_side = 0
    prev = 0  # dp[i-1][j-1]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            temp = dp[j]
            if matrix[i-1][j-1] == "1":
                dp[j] = min(dp[j], dp[j-1], prev) + 1
                max_side = max(max_side, dp[j])
            else:
                dp[j] = 0
            prev = temp
        prev = 0

    return max_side * max_side

if __name__ == "__main__":
    matrix1 = [
        ["1","0","1","0","0"],
        ["1","0","1","1","1"],
        ["1","1","1","1","1"],
        ["1","0","0","1","0"]
    ]
    assert maximal_square(matrix1) == 4  # 2x2
    matrix2 = [["0","1"],["1","0"]]
    assert maximal_square(matrix2) == 1
    matrix3 = [["0"]]
    assert maximal_square(matrix3) == 0
    matrix4 = [
        ["1","1","1"],
        ["1","1","1"],
        ["1","1","1"]
    ]
    assert maximal_square(matrix4) == 9  # 3x3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
