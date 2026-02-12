# 알고리즘 아키텍트 템플릿 라이브러리

코딩 테스트 및 실무에서 자주 사용되는 핵심 알고리즘들을 **아키텍트 관점**으로 정리한 템플릿 모음입니다.

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

1. **문제 분석**: 문제가 어떤 패턴인지 파악 (최단 거리 → BFS, 모든 경우의 수 → 백트래킹)
2. **템플릿 선택**: 해당 카테고리의 템플릿을 가져옴
3. **주석 해석**: 각 레이어(초기화, 메인 루프, 확장 등)가 무엇을 하는지 이해
4. **비즈니스 로직 삽입**: Core Logic 섹션에 문제 특화 코드 작성
5. **테스트**: 엣지 케이스(빈 배열, 단일 원소 등) 확인

### 암기 전략

- **스켈레톤(뼈대)**: 각 템플릿의 구조(초기화 → 루프 → 확장)만 먼저 외우기
- **주석 활용**: 주석을 보고 "아, 여기는 확장 레이어구나" 하며 역할 이해
- **백지 복원**: 템플릿을 보지 않고 처음부터 끝까지 작성 연습

### 패턴 매핑 가이드

| 문제 유형 | 추천 알고리즘 |
|-----------|-------------|
| 최단 거리 (가중치 없음) | BFS |
| 최단 거리 (가중치 있음) | Dijkstra |
| 음수 가중치 | Bellman-Ford |
| 모든 쌍 최단 거리 | Floyd-Warshall |
| 연결 요소 / 경로 탐색 | DFS |
| 정렬된 배열 탐색 | Binary Search |
| 최적 부분 구조 + 중복 부분 | DP |
| 매 순간 최선 → 전체 최적 | Greedy |
| 모든 경우의 수 | Backtracking |
| 선후 관계 정렬 | Topological Sort |
| 집합 합치기 | Union-Find |
| 정렬된 배열 합/차 | Two Pointers |
| 연속 구간 최적화 | Sliding Window |
| 상태 집합 관리 | Bit Masking |
