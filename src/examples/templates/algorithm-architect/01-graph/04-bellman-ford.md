# 벨만-포드 (Bellman-Ford)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 음수 가중치 허용, 음수 사이클 탐지 |
| **Components** | Distance Table, Edge List |
| **Constraint** | source-reachable negative cycle 범위와 distance overflow 처리 필요 |
| **시간 복잡도** | worst-case O(VE); early termination 시 일부 입력에서 감소 |

---

## 적용 범위와 검증 기준

- **범위:** source에서 reachable한 음수 edge를 허용하는 shortest-path 문제입니다. 검출 대상은 source에서 도달 가능한 negative cycle인지 graph 전체 cycle인지 구분합니다.
- **복잡도 전제:** 모든 edge를 최대 `V-1` rounds 확인하는 worst-case가 `O(VE)`이며 early stop은 일부 입력의 실행량만 줄입니다.
- **실패 조건:** unreachable distance에 weight를 더하는 overflow, cycle 영향 범위 미표시, 잘못된 vertex count와 edge direction을 포함합니다.
- **완료 증거:** negative edge·unreachable node·reachable/unreachable negative cycle fixture에서 distance와 cycle 판정을 reference와 비교합니다.

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
