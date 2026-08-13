# 알고리즘 아키텍트 템플릿 라이브러리

코딩 테스트 및 실무에서 자주 사용되는 핵심 알고리즘들을 **아키텍트 관점**으로 정리한 템플릿 모음입니다.

## 범위와 사용 전제

- 대상은 Python 3.x 학습 예제입니다. 정확한 인터프리터 버전과 입력 크기·형식을 기록하세요.
- 템플릿은 문제의 정답이나 프로덕션 성능을 보장하지 않습니다. 입력 계약, 불변식, 실패 sentinel, 숫자 범위와 메모리 한도를 문제에 맞게 확정해야 합니다.
- 복잡도는 RAM 모델의 점근적 분석입니다. 실제 성능 비교는 동일 환경·입력 분포에서 측정해야 합니다.
- 아래 디렉터리와 링크는 게시 시점의 기대 구조입니다. 문서 빌드에서 링크 존재 여부와 코드 실행을 별도로 검사해야 합니다.

---

## 디렉토리 구조

```text
algorithm-architect/
├── README.md
├── 01-graph/                        # 그래프 탐색
│   ├── 01-bfs.md                    # BFS (너비 우선 탐색)
│   ├── 02-dfs.md                    # DFS (깊이 우선 탐색)
│   ├── 03-dijkstra.md               # 다익스트라
│   ├── 04-bellman-ford.md           # 벨만-포드
│   └── 05-floyd-warshall.md         # 플로이드-워셜
├── 02-sorting-searching/            # 정렬 & 탐색
│   ├── 01-binary-search.md          # 이진 탐색
│   ├── 02-quick-sort.md             # 퀵 정렬
│   └── 03-merge-sort.md             # 병합 정렬
├── 03-dynamic-programming/          # 동적 계획법
│   ├── 01-dp-1d.md                  # 1차원 DP
│   ├── 02-dp-2d.md                  # 2차원 DP (격자형)
│   └── 03-knapsack.md               # 냅색 문제
├── 04-greedy/                       # 그리디
│   └── 01-greedy.md                 # 그리디 템플릿
├── 05-tree/                         # 트리
│   ├── 01-tree-traversal.md         # 트리 순회
│   └── 02-lca.md                    # 최소 공통 조상 (LCA)
├── 06-union-find/                   # 유니온 파인드
│   └── 01-union-find.md             # Union-Find + 크루스칼
├── 07-two-pointers/                 # 투 포인터
│   └── 01-two-pointers.md           # 투 포인터 + 3Sum
├── 08-sliding-window/               # 슬라이딩 윈도우
│   └── 01-sliding-window.md         # 고정/가변 윈도우
├── 09-backtracking/                 # 백트래킹
│   └── 01-backtracking.md           # 조합, 순열, N-Queens
├── 10-topological-sort/             # 위상 정렬
│   └── 01-topological-sort.md       # BFS/DFS 기반
└── 11-bit-masking/                  # 비트 마스킹
    └── 01-bit-masking.md            # 비트 연산 + 부분 집합
```

---

## 목차

### 1. 그래프 탐색 (Graph Traversal)
- [BFS (너비 우선 탐색)](01-graph/01-bfs.md)
- [DFS (깊이 우선 탐색)](01-graph/02-dfs.md)
- [다익스트라 (Dijkstra)](01-graph/03-dijkstra.md)
- [벨만-포드 (Bellman-Ford)](01-graph/04-bellman-ford.md)
- [플로이드-워셜 (Floyd-Warshall)](01-graph/05-floyd-warshall.md)

### 2. 정렬 & 탐색 (Sorting & Searching)
- [이진 탐색 (Binary Search)](02-sorting-searching/01-binary-search.md)
- [퀵 정렬 (Quick Sort)](02-sorting-searching/02-quick-sort.md)
- [병합 정렬 (Merge Sort)](02-sorting-searching/03-merge-sort.md)

### 3. 동적 계획법 (Dynamic Programming)
- [1차원 DP](03-dynamic-programming/01-dp-1d.md)
- [2차원 DP (격자형)](03-dynamic-programming/02-dp-2d.md)
- [냅색 문제 (Knapsack)](03-dynamic-programming/03-knapsack.md)

### 4. 그리디 (Greedy)
- [그리디 템플릿](04-greedy/01-greedy.md)

### 5. 트리 (Tree)
- [트리 순회 (Inorder, Preorder, Postorder)](05-tree/01-tree-traversal.md)
- [최소 공통 조상 (LCA)](05-tree/02-lca.md)

### 6. 유니온 파인드 (Union-Find / Disjoint Set)
- [유니온 파인드 + 크루스칼](06-union-find/01-union-find.md)

### 7. 투 포인터 (Two Pointers)
- [투 포인터 + 3Sum](07-two-pointers/01-two-pointers.md)

### 8. 슬라이딩 윈도우 (Sliding Window)
- [고정/가변 윈도우](08-sliding-window/01-sliding-window.md)

### 9. 백트래킹 (Backtracking)
- [조합, 순열, N-Queens](09-backtracking/01-backtracking.md)

### 10. 위상 정렬 (Topological Sort)
- [BFS/DFS 기반 위상 정렬](10-topological-sort/01-topological-sort.md)

### 11. 비트 마스킹 (Bit Masking)
- [비트 연산 + 부분 집합](11-bit-masking/01-bit-masking.md)

---

## 사용 가이드

### 각 템플릿을 활용하는 방법

1. **문제 분석**: 입력·출력·실패 조건과 가중치·정렬·그래프 방향 같은 전제를 먼저 고정
2. **템플릿 선택**: 해당 카테고리의 템플릿을 가져옴
3. **주석 해석**: 각 레이어(초기화, 메인 루프, 확장 등)가 무엇을 하는지 이해
4. **비즈니스 로직 삽입**: Core Logic 섹션에 문제 특화 코드 작성
5. **검증**: 불변식을 설명하고 작은 입력의 전수 탐색 또는 신뢰할 수 있는 oracle과 대조

### 암기 전략

- **스켈레톤(뼈대)**: 각 템플릿의 구조(초기화 → 루프 → 확장)만 먼저 외우기
- **주석 활용**: 주석을 보고 "아, 여기는 확장 레이어구나" 하며 역할 이해
- **백지 복원**: 템플릿을 보지 않고 처음부터 끝까지 작성 연습

### 패턴 매핑 가이드

| 문제 유형 | 추천 알고리즘 |
|-----------|-------------|
| 최단 거리 (무가중치 또는 동일 가중치) | BFS |
| 최단 거리 (모든 간선 가중치가 0 이상) | Dijkstra |
| 음수 간선 허용, 시작점에서 도달 가능한 음수 사이클 판정 | Bellman-Ford |
| 작은·밀집 그래프의 모든 쌍 최단 거리 | Floyd-Warshall |
| 연결 요소 / 경로 탐색 | DFS |
| 정렬된 배열 탐색 | Binary Search |
| 최적 부분 구조 + 중복 부분 | DP |
| 탐욕 선택의 최적성을 교환 논증 등으로 증명 가능 | Greedy |
| 모든 경우의 수 | Backtracking |
| 선후 관계 정렬 | Topological Sort |
| 집합 합치기 | Union-Find |
| 정렬된 배열 합/차 | Two Pointers |
| 연속 구간 최적화 | Sliding Window |
| 상태 집합 관리 | Bit Masking |

## 완료 기준

각 템플릿은 최소 예제 개수가 아니라 계약별 증거로 완료를 판정합니다. 정상·빈 입력·최소 크기·중복·도달 불가·최악 형태의 반례를 선택하고, 가능한 경우 표준 라이브러리나 전수 탐색과 결과를 대조합니다. 예외와 `None`/`-1`/`inf`의 의미를 호출자와 합의하고, 시간·메모리 한도를 넘는 입력은 명시적으로 거부하거나 다른 알고리즘으로 전환합니다.
