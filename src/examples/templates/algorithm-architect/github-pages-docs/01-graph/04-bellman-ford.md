# 벨만-포드 (Bellman-Ford) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `01-graph/04-bellman-ford.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 원본 템플릿
- Source: [01-graph/04-bellman-ford.md](../../01-graph/04-bellman-ford.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Initialize dist array] --> B[Repeat V 1 rounds]
    B --> C[Scan every edge u v]
    C --> D{dist u w dist v}
    D -- Yes --> E[Relax dist v]
    D -- No --> F[Keep current]
    E --> G{More edges}
    F --> G
    G -- Yes --> C
    G -- No --> H[One extra scan]
    H --> I{Still relaxes}
    I -- Yes --> J[Negative cycle]
    I -- No --> K[Return distances]
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant Lp as V1Loop
    participant E as EdgeList
    participant D as DistTable
    Lp->>E: iterate edges
    E->>D: try relax u v w
    D-->>Lp: changed or not
    Lp->>E: final cycle check
```

## 핵심 코드
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
