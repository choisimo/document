"""
문제 077: 강한 연결 요소 (Strongly Connected Components)
[문제] 방향 그래프에서 모든 강한 연결 요소(SCC)를 찾아라.
[아키텍트의 시선] 시스템 순환 의존성 탐지.
코사라주: 1차 DFS(완료 순서 기록) → 역방향 그래프 → 2차 DFS(SCC 추출).
타잔: 단일 DFS + 스택으로 SCC 추출 (더 효율적).
실무: 순환 의존성 탐지, 모듈 분석, 데드락 탐지.
[시간 복잡도] O(V+E) [공간 복잡도] O(V+E)
"""
from typing import List, Dict
from collections import defaultdict

def kosaraju_scc(n: int, edges: List[List[int]]) -> List[List[int]]:
    """코사라주 알고리즘"""
    graph = defaultdict(list)
    reverse_graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        reverse_graph[v].append(u)

    # 1단계: 원본 그래프에서 DFS, 완료 순서 기록
    visited = set()
    finish_order = []
    def dfs1(node):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs1(neighbor)
        finish_order.append(node)

    for i in range(n):
        if i not in visited:
            dfs1(i)

    # 2단계: 역방향 그래프에서 완료 역순 DFS → SCC
    visited.clear()
    sccs = []
    def dfs2(node, component):
        visited.add(node)
        component.append(node)
        for neighbor in reverse_graph[node]:
            if neighbor not in visited:
                dfs2(neighbor, component)

    for node in reversed(finish_order):
        if node not in visited:
            component = []
            dfs2(node, component)
            sccs.append(sorted(component))

    return sccs

if __name__ == "__main__":
    # 0→1→2→0 (SCC: {0,1,2}), 2→3, 3→4→3 (SCC: {3,4})
    edges = [[0,1],[1,2],[2,0],[2,3],[3,4],[4,3]]
    sccs = kosaraju_scc(5, edges)
    scc_sets = [set(s) for s in sccs]
    assert {0,1,2} in scc_sets
    assert {3,4} in scc_sets
    # DAG (각 노드가 자체 SCC)
    dag_edges = [[0,1],[1,2]]
    dag_sccs = kosaraju_scc(3, dag_edges)
    assert len(dag_sccs) == 3
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
