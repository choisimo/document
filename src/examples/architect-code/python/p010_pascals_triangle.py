"""
==========================================================
문제 010: 파스칼의 삼각형 (Pascal's Triangle)
==========================================================

[문제 설명]
양의 정수 numRows가 주어질 때, 파스칼의 삼각형의 처음 numRows개 행을 생성.

[아키텍트의 시선 - 메모이제이션과 점화식 기반 데이터 생성]
점화식: T[i][j] = T[i-1][j-1] + T[i-1][j]
이전 행의 결과로 현재 행을 계산 → Bottom-up DP의 기초.
실무: 캐시 워밍업, 조합론 기반 확률 계산, 이항 계수.

[시간 복잡도] O(n²) [공간 복잡도] O(n²)
"""

from typing import List


def generate(num_rows: int) -> List[List[int]]:
    triangle = []

    for i in range(num_rows):
        row = [1] * (i + 1)
        for j in range(1, i):
            row[j] = triangle[i - 1][j - 1] + triangle[i - 1][j]
        triangle.append(row)

    return triangle


if __name__ == "__main__":
    assert generate(5) == [
        [1],
        [1, 1],
        [1, 2, 1],
        [1, 3, 3, 1],
        [1, 4, 6, 4, 1],
    ]
    assert generate(1) == [[1]]
    assert generate(2) == [[1], [1, 1]]

    print("✓ 모든 테스트 통과!")
