# 다익스트라 (Dijkstra) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `01-graph/03-dijkstra.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 입력 계약과 완료 판정

- `graph[u]`의 원소 형식과 정점 범위를 `(neighbor, weight)`, `1..n`으로 고정합니다.
- 모든 도달 가능한 간선 가중치는 0 이상이어야 합니다. 음수 간선이 하나라도 있으면 이 템플릿을 사용하지 않습니다.
- 힙에서 꺼낸 거리가 현재 거리표보다 크면 오래된 항목이므로 건너뜁니다.
- 도달할 수 없는 정점은 `float('inf')`로 남는다는 출력 계약을 호출자가 처리해야 합니다.

완료 조건은 시작점 거리가 0이고, 모든 간선에 `dist[v] <= dist[u] + w`가 성립하며, 작은 그래프의 알려진 최단 경로와 결과가 일치하는 것입니다. 복잡도는 이진 힙과 인접 리스트에서 일반적으로 `O((V+E) log V)`로 설명합니다.

## 원본 템플릿
- Source: [01-graph/03-dijkstra.md](https://github.com/choisimo/document/blob/main/code/templates/algorithm-architect/01-graph/03-dijkstra.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Init distances INF] --> B[Push start to min heap]
    B --> C{Heap empty}
    C -- No --> D[Pop shortest node]
    D --> E{Stale distance}
    E -- Yes --> C
    E -- No --> F[Relax outgoing edges]
    F --> G{Better distance found}
    G -- Yes --> H[Update dist and push heap]
    G -- No --> I[Skip]
    H --> C
    I --> C
    C -- Yes --> J[Return distance table]
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant H as MinHeap
    participant D as DistTable
    participant G as Graph
    H->>H: pop min node
    H->>G: neighbors node
    G-->>H: neighbor weight
    H->>D: compare and relax
    D-->>H: updated dist
    H->>H: push updated node
```

## 핵심 코드
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

## 코드 레이어 해설
- **Initialization**: 상태 테이블/포인터/큐/스택/부모 배열 등 탐색의 기준 상태를 만든다.
- **Process Loop / Recursion**: 입력 공간을 순회하며 상태 전이를 반복한다.
- **Decision Rule**: 분기 조건(완화 가능 여부, 유효 선택 여부, 종료 조건)을 적용한다.
- **State Update**: 거리/DP/집합/결과 배열을 갱신하고 다음 단계로 전달한다.
- **Termination**: 목표 도달, 범위 소진, 큐/스택 고갈, 사이클 검출 등으로 종료한다.

## 실전 적용 체크리스트
- 입력 자료구조 형식(인접 리스트, 간선 리스트, 정렬 여부, 1-index/0-index)을 먼저 고정한다.
- 시간 복잡도 한계에 맞게 자료구조를 교체한다 (`list.pop(0)` -> `deque.popleft` 등).
- 실패/예외 경로를 명시한다 (도달 불가, 음수 사이클, 빈 결과, 사이클 존재).
- 테스트는 최소 3개: 정상 케이스, 경계 케이스, 반례 케이스를 포함한다.
