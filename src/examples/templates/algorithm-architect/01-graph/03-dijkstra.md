# 다익스트라 (Dijkstra)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 가중치 그래프의 최단 경로 |
| **Components** | Priority Queue (Min-Heap), Distance Table |
| **Constraint** | edge weight가 음수가 아니어야 이 template의 shortest-path 확정 논리 성립 |
| **시간 복잡도** | adjacency list + binary heap 기준 O((V + E) log V) |

---

## 적용 범위와 검증 기준

- **범위:** source에서의 single-source shortest path이며 edge weight가 음수가 아닌 graph를 가정합니다. 음수 edge가 있으면 이 template의 greedy 확정 논리가 성립하지 않습니다.
- **복잡도 전제:** adjacency list와 binary heap, stale entry skip을 가정하면 보통 `O((V+E) log V)`이며 graph representation과 priority queue에 따라 달라집니다.
- **실패 조건:** unreachable node, duplicate heap entry, distance overflow, 잘못된 infinity와 negative weight 입력을 명시적으로 처리합니다.
- **완료 증거:** 작은 graph를 Bellman-Ford/reference와 비교하고 relaxation invariant, predecessor path와 unreachable 표현을 검증합니다.

---

## 기본 템플릿

```python
# [Dijkstra 템플릿: 아키텍트 버전]
# Use Case: 가중치 그래프의 최단 경로
# Components: Priority Queue (Min-Heap), Distance Table
# Constraint: 음수 가중치 불가

import heapq

def dijkstra(start, graph, n):
    # 1. 초기화 (Initialization Layer)
    #    - 거리 테이블 무한대로 초기화
    #    - 우선순위 큐에 시작점 삽입
    INF = float('inf')
    distances = [INF] * (n + 1)
    distances[start] = 0
    pq = [(0, start)]  # (거리, 노드)
    
    # 2. 메인 루프 (Process Loop)
    #    - 우선순위 큐가 빌 때까지
    while pq:
        current_dist, current_node = heapq.heappop(pq)
        
        # 3. 최적화 레이어 (Optimization Layer)
        #    - 이미 처리된 노드는 스킵
        if current_dist > distances[current_node]:
            continue
        
        # 4. 확장 로직 (Expansion Layer)
        #    - 인접 노드의 거리 갱신
        for neighbor, weight in graph[current_node]:
            new_dist = current_dist + weight
            
            # 5. 갱신 조건 (Update Condition)
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return distances
```

---

## 구조 요약

```
초기화(거리 테이블) → 힙 루프 → 스킵 체크 → 인접 노드 거리 갱신
```
