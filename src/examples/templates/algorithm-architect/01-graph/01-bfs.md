# BFS (너비 우선 탐색)

> 적용 범위: `O(V + E)`는 adjacency-list graph에서 각 vertex와 edge를 한 번씩 처리하고 `collections.deque`의 `popleft()`를 사용할 때의 복잡도입니다. 인접 행렬, 동적 graph, 가중치 또는 Python list 앞 삭제에는 그대로 적용되지 않습니다.

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 최단 거리, 최소 이동 횟수, 레벨별 탐색 |
| **Components** | Queue (FIFO), Visited Set |
| **Constraint** | 큐에 넣을 때 방문 처리 필수 (중복 방지) |
| **시간 복잡도** | O(V + E) |

---

## 기본 템플릿

```python
from collections import deque

# [BFS 템플릿: 아키텍트 버전]
# Use Case: 최단 거리, 최소 이동 횟수, 레벨별 탐색
# Components: Queue (FIFO), Visited Set
# Constraint: 큐에 넣을 때 방문 처리 필수 (중복 방지)

def bfs(start_node, graph, target=None):
    # 1. 초기화 (Initialization Layer)
    #    - 큐 생성, 시작점 삽입, 방문 처리
    queue = deque([start_node])
    visited = {start_node}
    
    # 2. 메인 루프 (Process Loop)
    #    - 큐가 빌 때까지 반복
    while queue:
        current = queue.popleft()
        
        # 3. 비즈니스 로직 (Core Logic)
        #    - (필요하다면) 여기서 정답 체크 혹은 데이터 가공
        if target is not None and current == target:
            return current
        
        # 4. 확장 로직 (Expansion Layer)
        #    - 연결된 노드 탐색 및 조건 필터링
        for neighbor in graph.get(current, ()):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    
    return None  # 탐색 실패
```

---

## 변형: 거리 추적 버전

```python
from collections import deque

# [BFS 변형: 거리 추적 버전]
def bfs_with_distance(start_node, graph):
    # 1. 초기화 (거리 정보 포함)
    queue = deque([(start_node, 0)])  # (노드, 거리)
    visited = {start_node}
    distances = {start_node: 0}
    
    # 2. 메인 루프
    while queue:
        current, dist = queue.popleft()
        
        # 3. 비즈니스 로직
        # 여기서 거리 기반 처리 가능
        
        # 4. 확장 로직
        for neighbor in graph.get(current, ()):
            if neighbor not in visited:
                visited.add(neighbor)
                distances[neighbor] = dist + 1
                queue.append((neighbor, dist + 1))
    
    return distances
```

---

## 구조 요약

```
초기화 → 큐 루프 → 비즈니스 로직 → 확장(인접 노드 탐색)
```
