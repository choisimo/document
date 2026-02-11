"""
==========================================================
문제 037: 행렬 탐색 (Search a 2D Matrix)
==========================================================
[문제] 각 행이 정렬되고, 다음 행의 시작이 이전 행 끝보다 큰 2D 행렬에서 탐색.
[아키텍트의 시선 - 다차원 매핑과 좌표 변환]
m×n 행렬을 1D 배열로 간주: index → (row, col) = (i//n, i%n).
실무: 다차원 데이터의 선형 인덱싱 (이미지, 텐서).
[시간 복잡도] O(log(m*n)) [공간 복잡도] O(1)
"""
from typing import List

def search_matrix(matrix: List[List[int]], target: int) -> bool:
    if not matrix:
        return False
    m, n = len(matrix), len(matrix[0])
    left, right = 0, m * n - 1
    while left <= right:
        mid = (left + right) // 2
        val = matrix[mid // n][mid % n]
        if val == target:
            return True
        elif val < target:
            left = mid + 1
        else:
            right = mid - 1
    return False

if __name__ == "__main__":
    mat = [[1,3,5,7],[10,11,16,20],[23,30,34,60]]
    assert search_matrix(mat, 3) is True
    assert search_matrix(mat, 13) is False
    print("✓ 모든 테스트 통과!")
