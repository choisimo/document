"""
문제 047: 단어 탐색 (Word Search)
[문제] 2D 문자 그리드에서 상하좌우 이동으로 주어진 단어를 찾을 수 있는지 판별.
[아키텍트의 시선] DFS + 방문 상태 관리. 각 셀에서 시작하여 재귀 탐색.
실무: 패턴 매칭 엔진, 경로 탐색, 게임 AI.
[시간 복잡도] O(m*n*4^L) L=단어길이 [공간 복잡도] O(L) 재귀 스택
"""
from typing import List

def exist(board: List[List[str]], word: str) -> bool:
    m, n = len(board), len(board[0])

    def dfs(r, c, idx):
        if idx == len(word):
            return True
        if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != word[idx]:
            return False
        tmp = board[r][c]
        board[r][c] = "#"
        found = any(dfs(r+dr, c+dc, idx+1) for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)])
        board[r][c] = tmp
        return found

    return any(dfs(r, c, 0) for r in range(m) for c in range(n))

if __name__ == "__main__":
    board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]
    assert exist(board, "ABCCED") is True
    assert exist(board, "SEE") is True
    assert exist(board, "ABCB") is False
    print("✓ 모든 테스트 통과!")
