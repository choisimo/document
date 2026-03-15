# 다익스트라 (Dijkstra)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 가중치 그래프의 최단 경로 |
| **Components** | Priority Queue (Min-Heap), Distance Table |
| **Constraint** | 음수 가중치 불가 |
| **시간 복잡도** | O((V + E) log V) |

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
