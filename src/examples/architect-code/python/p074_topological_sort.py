"""
문제 074: 위상 정렬 (Topological Sort)
[문제] DAG(방향 비순환 그래프)의 위상 정렬 결과를 구하라.
[아키텍트의 시선] 의존성 해결과 스케줄링.
Kahn's: 진입 차수 0인 노드부터 처리 → 의존성이 해결된 순서.
DFS: 후위 순회의 역순 = 위상 정렬.
실무: 빌드 시스템(Make), 패키지 매니저(npm), 과목 선수 체계, CI/CD 파이프라인.
[시간 복잡도] O(V+E) [공간 복잡도] O(V+E)
"""
from typing import List, Dict
from collections import deque, defaultdict

def topological_sort_kahn(n: int, edges: List[List[int]]) -> List[int]:
    """Kahn's 알고리즘 (BFS 기반)"""
    graph = defaultdict(list)
    in_degree = [0] * n
    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1

    queue = deque([i for i in range(n) if in_degree[i] == 0])
    result = []

    while queue:
        node = queue.popleft()
        result.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result if len(result) == n else []  # 빈 리스트 = 사이클 존재

def topological_sort_dfs(n: int, edges: List[List[int]]) -> List[int]:
    """DFS 기반 위상 정렬"""
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)

    visited = set()
    stack = []

    def dfs(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)
        stack.append(node)

    for i in range(n):
        if i not in visited:
            dfs(i)

    return stack[::-1]

if __name__ == "__main__":
    # 0 → 1 → 3
    # 0 → 2 → 3
    edges = [[0,1], [0,2], [1,3], [2,3]]
    kahn = topological_sort_kahn(4, edges)
    assert len(kahn) == 4
    assert kahn.index(0) < kahn.index(1)
    assert kahn.index(0) < kahn.index(2)
    assert kahn.index(1) < kahn.index(3)
    dfs_result = topological_sort_dfs(4, edges)
    assert len(dfs_result) == 4
    assert dfs_result.index(0) < dfs_result.index(3)
    # 사이클 탐지
    cyclic = [[0,1], [1,2], [2,0]]
    assert topological_sort_kahn(3, cyclic) == []
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
