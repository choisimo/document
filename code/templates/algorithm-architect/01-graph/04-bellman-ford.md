# 벨만-포드 (Bellman-Ford)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 음수 가중치 허용, 음수 사이클 탐지 |
| **Components** | Distance Table, Edge List |
| **Constraint** | O(VE) 시간 복잡도 (느림) |
| **시간 복잡도** | O(VE) |

---

## 기본 템플릿

```python
# [Bellman-Ford 템플릿: 아키텍트 버전]
# Use Case: 음수 가중치 허용, 음수 사이클 탐지
# Components: Distance Table, Edge List
# Constraint: O(VE) 시간 복잡도 (느림)

def bellman_ford(start, edges, n):
    # 1. 초기화 (Initialization Layer)
    INF = float('inf')
    distances = [INF] * (n + 1)
    distances[start] = 0
    
    # 2. 완화 반복 (Relaxation Loop)
    #    - (V-1)번 반복: 최단 경로는 최대 V-1개의 간선
    for i in range(n - 1):
        # 3. 간선 순회 (Edge Iteration)
        for u, v, weight in edges:
            if distances[u] != INF and distances[u] + weight < distances[v]:
                distances[v] = distances[u] + weight
    
    # 4. 음수 사이클 검출 (Negative Cycle Detection)
    #    - 한 번 더 완화가 일어나면 음수 사이클 존재
    for u, v, weight in edges:
        if distances[u] != INF and distances[u] + weight < distances[v]:
            return None  # 음수 사이클 존재
    
    return distances
```

---

## 구조 요약

```text
초기화 → (V-1)번 간선 완화 → 음수 사이클 검출
```
