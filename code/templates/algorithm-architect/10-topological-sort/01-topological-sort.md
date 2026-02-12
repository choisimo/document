# 위상 정렬 (Topological Sort)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | DAG(방향 비순환 그래프)의 선후 관계 정렬 |
| **Components** | Indegree Array, Queue |
| **Constraint** | 사이클이 있으면 불가능 |
| **시간 복잡도** | O(V + E) |

---

## BFS 기반 (Kahn's Algorithm)

```python
# [Topological Sort 템플릿: 아키텍트 버전]
# Use Case: DAG(방향 비순환 그래프)의 선후 관계 정렬
# Components: Indegree Array, Queue
# Constraint: 사이클이 있으면 불가능

def topological_sort_bfs(n, edges):
    # [Kahn's Algorithm (BFS 기반)]
    
    # 1. 초기화 (Initialization Layer)
    #    - 진입 차수(Indegree) 계산
    graph = [[] for _ in range(n)]
    indegree = [0] * n
    
    for u, v in edges:
        graph[u].append(v)
        indegree[v] += 1
    
    # 2. 진입 차수 0인 노드를 큐에 삽입
    queue = [i for i in range(n) if indegree[i] == 0]
    result = []
    
    # 3. 메인 루프 (Process Loop)
    while queue:
        current = queue.pop(0)
        result.append(current)
        
        # 4. 인접 노드의 진입 차수 감소
        for neighbor in graph[current]:
            indegree[neighbor] -= 1
            
            # 5. 진입 차수가 0이 되면 큐에 추가
            if indegree[neighbor] == 0:
                queue.append(neighbor)
    
    # 6. 사이클 검출 (Cycle Detection)
    if len(result) != n:
        return []  # 사이클 존재
    
    return result
```

---

## DFS 기반 위상 정렬

```python
# [DFS 기반 위상 정렬]
def topological_sort_dfs(n, edges):
    # 1. 그래프 구성
    graph = [[] for _ in range(n)]
    for u, v in edges:
        graph[u].append(v)
    
    # 2. 방문 상태 관리
    visited = [0] * n  # 0: 미방문, 1: 방문 중, 2: 방문 완료
    result = []
    
    def dfs(node):
        # 사이클 검출
        if visited[node] == 1:
            return False
        if visited[node] == 2:
            return True
        
        # 방문 시작
        visited[node] = 1
        
        for neighbor in graph[node]:
            if not dfs(neighbor):
                return False
        
        # 방문 완료
        visited[node] = 2
        result.append(node)
        return True
    
    # 3. 모든 노드 탐색
    for i in range(n):
        if visited[i] == 0:
            if not dfs(i):
                return []  # 사이클 존재
    
    return result[::-1]  # 역순 반환
```

---

## 구조 요약

```text
BFS: 진입차수 계산 → 차수 0 큐 삽입 → 차수 감소 루프 → 사이클 검출
DFS: 방문 상태 관리(미방문/방문중/완료) → 역순 결과 → 사이클 검출
```
