"""
문제 050: 섬의 개수 (Number of Islands)
[문제] 2D 그리드에서 '1'로 연결된 섬의 개수를 구하라.
[아키텍트의 시선] 플러드 필(Flood Fill)과 연결 컴포넌트 분석.
DFS/BFS로 연결된 육지를 모두 방문 표시 → 새 섬 발견 시 카운트+1.
실무: 이미지 영역 탐지, 네트워크 클러스터 분석, 소셜 그래프 커뮤니티.
[시간 복잡도] O(m*n) [공간 복잡도] O(m*n) 최악
"""
from typing import List

def num_islands(grid: List[List[str]]) -> int:
    if not grid:
        return 0
    m, n = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)

    for r in range(m):
        for c in range(n):
            if grid[r][c] == "1":
                count += 1
                dfs(r, c)
    return count

if __name__ == "__main__":
    g1 = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]
    assert num_islands(g1) == 1
    g2 = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]
    assert num_islands(g2) == 3
    print("✓ 모든 테스트 통과!")
