# DFS (깊이 우선 탐색)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 경로 탐색, 사이클 검출, 연결 요소 찾기 |
| **Components** | Stack (LIFO) 또는 재귀 |
| **Constraint** | 일반 traversal은 visited 유지; current-path enumeration만 branch 복귀 시 상태 해제 |
| **시간 복잡도** | adjacency list에서 방문 범위 기준 O(V + E); matrix는 O(V²) 가능 |

---

## 적용 범위와 검증 기준

- **범위:** `V`와 `E`는 시작점에서 실제 방문한 정점·edge인지 전체 graph인지 구분합니다. `O(V+E)`는 adjacency list에서 각 항목을 제한된 횟수만 처리하는 경우의 bound이며 matrix 표현은 `O(V²)`가 될 수 있습니다.
- **전제:** 일반 graph traversal은 방문 표시를 유지하고, path enumeration/backtracking은 branch를 되돌릴 때만 현재 경로 상태를 해제합니다. directed/undirected와 cycle 의미를 명시합니다.
- **실패 조건:** visited 처리 누락, recursion depth 초과, disconnected component 누락과 잘못된 parent edge cycle 판정을 포함합니다.
- **완료 증거:** 작은 graph의 예상 순회 집합·cycle·component를 reference와 비교하고 각 정점·edge 처리 횟수와 stack 한계를 확인합니다.

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
