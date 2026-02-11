"""
문제 046: 스도쿠 풀기 (Sudoku Solver)
[문제] 9×9 스도쿠 퍼즐을 풀어라.
[아키텍트의 시선] 제약 전파 + 백트래킹. 빈 칸에 가능한 숫자를 시도,
제약 위반 시 되돌림. 실무: SAT 솔버, 스케줄링 엔진의 기초.
[시간 복잡도] O(9^(빈칸수)) 최악, 실제로는 가지치기로 훨씬 빠름
"""
from typing import List

def solve_sudoku(board: List[List[str]]) -> None:
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empty = []

    for r in range(9):
        for c in range(9):
            if board[r][c] != ".":
                d = board[r][c]
                rows[r].add(d); cols[c].add(d); boxes[(r//3)*3+c//3].add(d)
            else:
                empty.append((r, c))

    def backtrack(idx):
        if idx == len(empty):
            return True
        r, c = empty[idx]
        box_id = (r // 3) * 3 + c // 3
        for d in "123456789":
            if d not in rows[r] and d not in cols[c] and d not in boxes[box_id]:
                board[r][c] = d
                rows[r].add(d); cols[c].add(d); boxes[box_id].add(d)
                if backtrack(idx + 1):
                    return True
                board[r][c] = "."
                rows[r].remove(d); cols[c].remove(d); boxes[box_id].remove(d)
        return False

    backtrack(0)

if __name__ == "__main__":
    board = [
        ["5","3",".",".","7",".",".",".","."],
        ["6",".",".","1","9","5",".",".","."],
        [".","9","8",".",".",".",".","6","."],
        ["8",".",".",".","6",".",".",".","3"],
        ["4",".",".","8",".","3",".",".","1"],
        ["7",".",".",".","2",".",".",".","6"],
        [".","6",".",".",".",".","2","8","."],
        [".",".",".","4","1","9",".",".","5"],
        [".",".",".",".","8",".",".","7","9"]
    ]
    solve_sudoku(board)
    assert board[0][2] == "4"
    assert board[4][4] == "5"
    print("✓ 모든 테스트 통과!")
