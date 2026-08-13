# 플로이드-워셜 (Floyd-Warshall) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `01-graph/05-floyd-warshall.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 입력 계약과 완료 판정

- `n`개 정점의 방향성, 인덱스 범위, 간선 튜플 형식을 먼저 고정합니다.
- 같은 두 정점 사이에 간선이 여러 개면 초기 행렬에는 최소 가중치를 넣습니다.
- 도달 불가능한 두 부분 경로의 합을 계산하지 않도록 무한대 처리를 명시합니다.
- 실행 뒤 `dist[v][v] < 0`인 정점은 그 정점을 포함하거나 도달하는 음수 사이클 분석이 필요하다는 신호입니다.

완료 조건은 직접 간선과 대각선 초기값이 보존되고, 모든 `i,j,k`에 대해 우회 경로가 더 짧으면 반영되며, 작은 그래프를 단일 출발점 알고리즘 결과와 교차 확인하는 것입니다. 시간 `O(V^3)`뿐 아니라 거리 행렬 공간 `O(V^2)`도 입력 상한에 포함합니다.

## 원본 템플릿
- Source: [01-graph/05-floyd-warshall.md](https://github.com/choisimo/document/blob/main/code/templates/algorithm-architect/01-graph/05-floyd-warshall.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Build dist matrix] --> B[Set diagonal 0]
    B --> C[Load direct edges]
    C --> D[for k in vertices]
    D --> E[for i in vertices]
    E --> F[for j in vertices]
    F --> G{dist i k dist k j dist i j}
    G -- Yes --> H[Update dist cell]
    G -- No --> I[No change]
    H --> F
    I --> F
    F --> J{j done}
    J -- Yes --> K{i done}
    K -- Yes --> L{k done}
    L -- Yes --> M[All pairs shortest paths]
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant K as via k
    participant I as source i
    participant J as target j
    participant D as distMatrix
    K->>I: choose intermediary
    I->>J: candidate path through k
    J->>D: compare current vs candidate
    D-->>J: min value stored
```

## 핵심 코드
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
