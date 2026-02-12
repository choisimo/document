# DFS (깊이 우선 탐색)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 경로 탐색, 사이클 검출, 연결 요소 찾기 |
| **Components** | Stack (LIFO) 또는 재귀 |
| **Constraint** | 백트래킹 시 방문 해제 필요한 경우 있음 |
| **시간 복잡도** | O(V + E) |

---

## 재귀 버전

```python
# [DFS 템플릿: 아키텍트 버전]
# Use Case: 경로 탐색, 사이클 검출, 연결 요소 찾기
# Components: Stack (LIFO) 또는 재귀
# Constraint: 백트래킹 시 방문 해제 필요한 경우 있음

# [DFS 재귀 버전]
def dfs_recursive(node, graph, visited=None, target=None):
    # 1. 초기화 (Initialization Layer)
    #    - 방문 집합 생성 (최초 호출 시)
    if visited is None:
        visited = set()
    
    # 2. 방문 처리 (Visit Layer)
    visited.add(node)
    
    # 3. 비즈니스 로직 (Core Logic)
    #    - 목표 발견 시 조기 종료
    if target and node == target:
        return True
    
    # 4. 재귀 확장 (Recursive Expansion)
    #    - 인접 노드로 깊이 우선 탐색
    for neighbor in graph[node]:
        if neighbor not in visited:
            if dfs_recursive(neighbor, graph, visited, target):
                return True
    
    return False
```

---

## 스택 버전

```python
# [DFS 스택 버전]
def dfs_iterative(start_node, graph, target=None):
    # 1. 초기화 (Initialization Layer)
    stack = [start_node]
    visited = set()
    
    # 2. 메인 루프 (Process Loop)
    while stack:
        current = stack.pop()
        
        # 이미 방문했으면 스킵
        if current in visited:
            continue
        
        # 3. 방문 처리
        visited.add(current)
        
        # 4. 비즈니스 로직 (Core Logic)
        if target and current == target:
            return True
        
        # 5. 확장 로직 (Expansion Layer)
        #    - 역순으로 넣어야 작은 번호부터 탐색 (선택사항)
        for neighbor in reversed(graph[current]):
            if neighbor not in visited:
                stack.append(neighbor)
    
    return False
```

---

## 구조 요약

```
초기화 → 방문 처리 → 비즈니스 로직 → 재귀/스택 확장
```
