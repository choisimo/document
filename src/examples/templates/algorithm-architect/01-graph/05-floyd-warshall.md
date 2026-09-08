# 플로이드-워셜 (Floyd-Warshall)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 모든 쌍 최단 경로 |
| **Components** | 2D Distance Matrix |
| **Constraint** | O(V³) time·O(V²) memory가 입력과 자원 budget에 맞을 때 사용 |
| **시간 복잡도** | matrix triple loop 기준 O(V³) |

---

## 적용 범위와 검증 기준

- **범위:** dense matrix 기반 all-pairs shortest paths의 대표 template입니다. `O(V³)` time과 `O(V²)` memory의 수용 가능성은 vertex 수, hardware와 latency budget으로 판단합니다.
- **전제:** diagonal, no-edge infinity, directedness와 negative edge를 정의합니다. negative cycle이 있으면 일부 pair의 finite shortest path가 정의되지 않을 수 있습니다.
- **실패 조건:** infinity 덧셈 overflow, initialization 오류, loop order 변경과 negative diagonal 미검출을 포함합니다.
- **완료 증거:** 작은 graph에서 모든 pair를 repeated single-source reference와 비교하고 `dist[i][i] < 0` 및 path reconstruction 요구를 검증합니다.

---

## 기본 템플릿

```python
# [Floyd-Warshall 템플릿: 아키텍트 버전]
# Use Case: 모든 쌍 최단 경로
# Components: 2D Distance Matrix
# Constraint: O(V³) 시간 복잡도, 정점 수 적을 때만 사용

def floyd_warshall(graph, n):
    # 1. 초기화 (Initialization Layer)
    #    - 2차원 거리 행렬 생성
    INF = float('inf')
    dist = [[INF] * (n + 1) for _ in range(n + 1)]
    
    # 자기 자신으로 가는 거리 0
    for i in range(1, n + 1):
        dist[i][i] = 0
    
    # 초기 간선 정보 입력
    for u, v, weight in graph:
        dist[u][v] = weight
    
    # 2. 3중 루프 (Triple Loop)
    #    - k: 경유 노드
    #    - i: 출발 노드
    #    - j: 도착 노드
    for k in range(1, n + 1):  # 경유점
        for i in range(1, n + 1):  # 출발
            for j in range(1, n + 1):  # 도착
                # 3. 갱신 로직 (Update Logic)
                #    - k를 거쳐가는 것이 더 짧은지 확인
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    
    return dist
```

---

## 구조 요약

```text
초기화(2D 행렬) → 3중 루프(경유→출발→도착) → 거리 갱신
```
