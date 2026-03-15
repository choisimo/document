"""
문제 067: 깊이 우선 탐색 (DFS - Depth First Search)
[문제] 그래프에서 DFS를 수행하고, 재귀/반복 두 방식으로 구현하라.
[아키텍트의 시선] 스택 기반 탐색과 속성 발견.
DFS = 깊이 우선 → 경로/사이클/연결 컴포넌트 발견에 적합.
재귀(암묵적 스택) vs 반복(명시적 스택)의 트레이드오프.
실무: 파일 시스템 탐색, 가비지 컬렉션(mark), 미로 탐색.
[시간 복잡도] O(V+E) [공간 복잡도] O(V)
"""
from typing import List, Dict, Set

def dfs_recursive(graph: Dict[int, List[int]], start: int) -> List[int]:
    """재귀 DFS"""
    visited = set()
    order = []
    def _dfs(node):
        visited.add(node)
        order.append(node)
        for neighbor in sorted(graph.get(node, [])):
            if neighbor not in visited:
                _dfs(neighbor)
    _dfs(start)
    return order

def dfs_iterative(graph: Dict[int, List[int]], start: int) -> List[int]:
    """반복 DFS (명시적 스택)"""
    visited = set()
    stack = [start]
    order = []
    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        # 역순으로 추가해야 정방향 탐색 순서
        for neighbor in sorted(graph.get(node, []), reverse=True):
            if neighbor not in visited:
                stack.append(neighbor)
    return order

def has_cycle(graph: Dict[int, List[int]], n: int) -> bool:
    """방향 그래프 사이클 탐지"""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    def _dfs(u):
        color[u] = GRAY
        for v in graph.get(u, []):
            if color[v] == GRAY:
                return True
            if color[v] == WHITE and _dfs(v):
                return True
        color[u] = BLACK
        return False
    return any(color[u] == WHITE and _dfs(u) for u in range(n))

if __name__ == "__main__":
    graph = {0: [1, 2], 1: [3], 2: [3], 3: [4], 4: []}
    rec = dfs_recursive(graph, 0)
    assert rec[0] == 0
    assert set(rec) == {0, 1, 2, 3, 4}
    itr = dfs_iterative(graph, 0)
    assert set(itr) == {0, 1, 2, 3, 4}
    # 사이클 탐지
    cyclic = {0: [1], 1: [2], 2: [0]}
    assert has_cycle(cyclic, 3) == True
    acyclic = {0: [1], 1: [2], 2: []}
    assert has_cycle(acyclic, 3) == False
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
