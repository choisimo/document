"""
문제 045: N-Queens
[문제] N×N 체스판에 N개의 퀸을 서로 공격 불가능하게 배치하는 모든 방법.
[아키텍트의 시선] 제약 만족 문제(CSP)와 백트래킹.
행 단위로 배치하며, 열/대각선 충돌을 O(1)에 검사 (집합 사용).
[시간 복잡도] O(N!) [공간 복잡도] O(N²)
"""
from typing import List

def solve_n_queens(n: int) -> List[List[str]]:
    result = []
    cols = set()
    diag1 = set()  # row - col
    diag2 = set()  # row + col

    def backtrack(row, board):
        if row == n:
            result.append(["".join(r) for r in board])
            return
        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            cols.add(col); diag1.add(row - col); diag2.add(row + col)
            board[row][col] = "Q"
            backtrack(row + 1, board)
            board[row][col] = "."
            cols.remove(col); diag1.remove(row - col); diag2.remove(row + col)

    board = [["." for _ in range(n)] for _ in range(n)]
    backtrack(0, board)
    return result

if __name__ == "__main__":
    assert len(solve_n_queens(4)) == 2
    assert len(solve_n_queens(1)) == 1
    assert len(solve_n_queens(8)) == 92
    print("✓ 모든 테스트 통과!")
