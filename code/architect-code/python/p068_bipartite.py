"""
문제 068: 이분 그래프 판별 (Is Graph Bipartite)
[문제] 주어진 그래프가 이분 그래프인지 판별하라.
[아키텍트의 시선] 그래프 색칠(Coloring)과 분류.
2-색칠 가능 여부 = 이분 그래프. BFS/DFS로 인접 노드를 번갈아 색칠.
같은 색의 인접 노드 발견 시 이분 그래프 아님.
실무: 매칭 문제(구직-구인), 충돌 탐지, 스케줄링 호환성.
[시간 복잡도] O(V+E) [공간 복잡도] O(V)
"""
from typing import List
from collections import deque

def is_bipartite(graph: List[List[int]]) -> bool:
    """BFS 기반 2-색칠"""
    n = len(graph)
    color = [-1] * n  # -1: 미방문
    for start in range(n):
        if color[start] != -1:
            continue
        queue = deque([start])
        color[start] = 0
        while queue:
            node = queue.popleft()
            for neighbor in graph[node]:
                if color[neighbor] == -1:
                    color[neighbor] = 1 - color[node]
                    queue.append(neighbor)
                elif color[neighbor] == color[node]:
                    return False
    return True

if __name__ == "__main__":
    # 이분 그래프: 0-1, 0-3, 1-2, 2-3 (사각형)
    assert is_bipartite([[1,3],[0,2],[1,3],[0,2]]) == True
    # 비이분 그래프: 0-1-2-0 (삼각형, 홀수 사이클)
    assert is_bipartite([[1,2,3],[0,2],[0,1,3],[0,2]]) == False
    # 단절된 그래프
    assert is_bipartite([[1],[0],[3],[2]]) == True
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
