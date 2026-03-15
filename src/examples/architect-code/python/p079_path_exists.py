"""
문제 079: 경로 존재 여부 (Find if Path Exists in Graph)
[문제] 무방향 그래프에서 source에서 destination까지의 경로가 존재하는지 판별하라.
[아키텍트의 시선] 도달 가능성과 서비스 가용성.
BFS/DFS 또는 Union-Find로 연결성 판별.
Union-Find: 오프라인 쿼리에 효율적, 동적 연결성 관리.
실무: 서비스 가용성 확인, 네트워크 연결 검증, 방화벽 규칙 분석.
[시간 복잡도] O(V+E) [공간 복잡도] O(V+E)
"""
from typing import List
from collections import deque

def valid_path_bfs(n: int, edges: List[List[int]], source: int, destination: int) -> bool:
    """BFS 방식"""
    if source == destination:
        return True
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)

    visited = set([source])
    queue = deque([source])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor == destination:
                return True
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return False

def valid_path_uf(n: int, edges: List[List[int]], source: int, destination: int) -> bool:
    """Union-Find 방식"""
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(x, y):
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for u, v in edges:
        union(u, v)
    return find(source) == find(destination)

if __name__ == "__main__":
    assert valid_path_bfs(3, [[0,1],[1,2],[2,0]], 0, 2) == True
    assert valid_path_bfs(6, [[0,1],[0,2],[3,5],[5,4],[4,3]], 0, 5) == False
    assert valid_path_uf(3, [[0,1],[1,2],[2,0]], 0, 2) == True
    assert valid_path_uf(6, [[0,1],[0,2],[3,5],[5,4],[4,3]], 0, 5) == False
    assert valid_path_bfs(1, [], 0, 0) == True
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
