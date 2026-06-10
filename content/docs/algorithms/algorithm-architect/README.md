# Algorithm Architect 전체 색인 학습 및 기록 노트

> 💡 **이 글을 쓰는 이유:** 이 README는 Algorithm Architect 문서 묶음의 전체 목차다. 개별 알고리즘 문서가 늘어날수록 전체 목록, 원본 경로, 검증 워크플로우를 한곳에서 관리해야 문서 묶음이 길을 잃지 않는다.

---

## 1. 왜 필요한가? (Pain Point & Motivation)

* **이 개념이 구원해 줄 문제:** 알고리즘 템플릿 문서가 여러 디렉터리에 나뉘어 있을 때 전체 목록과 검증 방법을 한 번에 확인하게 해 준다.
* **대안들의 한계 (기존의 똥떵어리들):** 개별 파일만 있으면 전체 범위를 파악하기 어렵고, 어떤 문서가 빠졌는지 알기 어렵다. 검증 워크플로우가 흩어지면 Mermaid 렌더링이나 링크 문제를 놓친다.

## 2. 현재 나의 상태 (Baseline)

* **여기까진 안다 (익숙한 땅):** 문서 묶음은 그래프, 정렬/탐색, 동적 계획법, 그리디, 트리, 기타 알고리즘 패턴으로 구성되어 있다.
* **뇌정지 오는 부분 (안개 속):** README가 단순 소개 문서인지, 검증과 범위 관리를 맡는 색인인지 역할이 흐려질 수 있다.
* **아직은 무리 (워너비):** 새 문서가 추가될 때 README 색인, MkDocs nav, 실제 파일 경로가 함께 맞아야 한다.

## 3. 도달하고 싶은 목표 (Target State)

* **이 글을 끝내고 할 수 있는 일:** Algorithm Architect 문서 묶음의 전체 문서 목록과 검증 관점을 설명할 수 있다.
* **이것만은 건지자 (최소 성공 기준):** README는 전체 색인, 문서 구성 원칙, 검증 워크플로우를 보존해야 한다.

## 4. 시스템 번역 (Data Flow)

*이 개념을 하나의 살아있는 함수나 파이프라인으로 바라보고 해부해 봅니다.*

* **📥 인풋 (Input):** 알고리즘 문서 파일 목록, 원본 템플릿 경로, 검증 스크립트 정보
* **⚙️ 프로세스 (Processing):** 각 문서를 주제별 목록으로 정리하고, 사용자가 개별 문서나 검증 절차로 이동하게 한다.
* **📤 아웃풋 (Output):** 전체 알고리즘 문서 색인, 검증 워크플로우 안내
* **💾 상태 (State):** 문서 목록, 링크 경로, 검증 명령, 문서 작성 원칙
* **🚨 터지는 조건 (Exception):** 문서 목록 누락, 링크 깨짐, 검증 명령 경로 불일치, 실제 문서와 색인 불일치

## 5. 핵심 구성요소 (Building Blocks)

* **레고 블록 1 (문서 색인):** 모든 알고리즘 학습 문서로 가는 링크 목록이다.
* **레고 블록 2 (렌더링 원칙):** Mermaid, 핵심 코드, 레이어 해설을 포함한다는 문서 구성 기준이다.
* **레고 블록 3 (Validation Workflow):** 문서 렌더링과 구조를 확인하는 검증 절차다.
* **서로 어떻게 맞물려 돌아가는가?:** 색인이 전체 범위를 보여 주고, 렌더링 원칙이 개별 문서 품질을 맞추며, 검증 워크플로우가 변경 후 깨짐을 확인한다.

## 6. 상태 전이 (State Transition)

*상태가 어떻게 변하는지 흐름을 한눈에 보여줍니다. (표 안의 문장은 짧고 직관적으로!)*

| 초기 상태 | 이벤트 (트리거) | 전이 조건 | 변경 후 상태 | "바뀐 걸 어떻게 알지?" (관찰 방법) |
| :--- | :--- | :--- | :--- | :--- |
| `DOC_SET` | 문서 추가 | 새 Markdown 파일 생성 | `INDEX_REQUIRED` | README에 링크 필요 |
| `INDEX_REQUIRED` | 색인 갱신 | 상대 경로 확인 | `INDEX_UPDATED` | 목록에서 새 문서 확인 |
| `INDEX_UPDATED` | 검증 실행 | 렌더링/링크 확인 | `VALIDATED` | 검증 결과 통과 |
| `VALIDATED` | 사용자 탐색 | 링크 클릭 | `DOC_OPENED` | 대상 문서 열림 |

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

* **하늘이 무너져도 지켜야 할 조건:** README의 문서 목록은 실제 알고리즘 문서 파일 목록과 동기화되어야 한다.
* **이게 깨지면 생기는 대참사:** 새 문서가 발견되지 않거나 삭제된 문서 링크가 남아 문서 허브의 신뢰도가 떨어진다.
* **수수방관 금지 (검증법):** `find`로 실제 Markdown 목록을 확인하고 README 링크 목록과 비교하며, 문서 검증기를 실행한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

* **뇌컴파일이 가능한 수준의 인풋:** `01-graph/01-bfs.md` 문서가 존재한다.
* **한 스텝씩 뜯어보기:** README 문서 색인에 BFS 링크를 추가하고, 링크가 실제 파일을 가리키는지 확인한다.
* **해피 엔딩 (결과):** 사용자는 README에서 BFS 문서로 이동할 수 있다.

문서 색인:

- [BFS (너비 우선 탐색)](01-graph/01-bfs.md)
- [DFS (깊이 우선 탐색)](01-graph/02-dfs.md)
- [다익스트라 (Dijkstra)](01-graph/03-dijkstra.md)
- [벨만-포드 (Bellman-Ford)](01-graph/04-bellman-ford.md)
- [플로이드-워셜 (Floyd-Warshall)](01-graph/05-floyd-warshall.md)
- [이진 탐색 (Binary Search)](02-sorting-searching/01-binary-search.md)
- [퀵 정렬 (Quick Sort)](02-sorting-searching/02-quick-sort.md)
- [병합 정렬 (Merge Sort)](02-sorting-searching/03-merge-sort.md)
- [1차원 DP (1D Dynamic Programming)](03-dynamic-programming/01-dp-1d.md)
- [2차원 DP (2D Dynamic Programming)](03-dynamic-programming/02-dp-2d.md)
- [냅색 문제 (Knapsack)](03-dynamic-programming/03-knapsack.md)
- [그리디 (Greedy)](04-greedy/01-greedy.md)
- [트리 순회 (Tree Traversal)](05-tree/01-tree-traversal.md)
- [최소 공통 조상 (LCA)](05-tree/02-lca.md)
- [유니온 파인드 (Union-Find)](06-union-find/01-union-find.md)
- [투 포인터 (Two Pointers)](07-two-pointers/01-two-pointers.md)
- [슬라이딩 윈도우 (Sliding Window)](08-sliding-window/01-sliding-window.md)
- [백트래킹 (Backtracking)](09-backtracking/01-backtracking.md)
- [위상 정렬 (Topological Sort)](10-topological-sort/01-topological-sort.md)
- [비트 마스킹 (Bit Masking)](11-bit-masking/01-bit-masking.md)
- [convert_md_to_pdf.sh](convert_md_to_pdf.sh.md)

## 9. 실패 사례 (What could go wrong?)

* **폭망 시나리오 1:** 문서 파일명은 바뀌었는데 README 링크는 예전 경로를 유지한다.
* **폭망 시나리오 2:** 검증 워크플로우 경로가 구 구조를 가리켜 실행되지 않는다.
* **폭망 시나리오 3:** 색인 순서가 실제 학습 흐름과 달라 관련 주제를 찾기 어렵다.
* **범인 검거 (어떤 불변식이 깨졌나?):** README 문서 목록과 실제 파일 목록이 동기화되어야 한다는 7번 불변식이 깨졌다.

## 10. 뇌 확장하기 (Evolution & Variants)

* **조건을 살짝 바꾸면?:** 문서가 많아지면 단일 목록보다 난이도별/문제 유형별 하위 색인을 추가한다.
* **비슷한 놈들과 계급장 떼고 비교하기:** `index.md`는 랜딩과 빠른 이동에 초점을 두고, README는 전체 목록과 검증 맥락을 더 자세히 남긴다.
* **다른 데서 써먹기:** 자료구조 문서 묶음, 운영 런북 묶음, 프로젝트 ADR 묶음의 전체 색인에도 같은 구조를 쓸 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

*글 작성 후 아래 항목을 채웠는지 확인하는 셀프 검토용 목록이다.*

- [x] 1초 만에 이해하는 한 문장 요약이 있는가?
- [x] 일목요연한 상태 전이 표를 채웠는가?
- [x] 머릿속 그림을 표현한 구조도(다이어그램)가 포함되었는가?
- [x] 직접 굴려본 실습 결과(코드/로그)를 첨부했는가?
- [x] 에러를 마주하고 해결한 오답 노트가 있는가?
- [x] 주니어 동료에게 막힘없이 설명할 수 있는 수준인가?

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

*복습 시 이 문장만 보고도 핵심을 떠올릴 수 있도록 빈칸을 채운다.*

> 이 개념은 결국 **알고리즘 문서 묶음의 전체 범위와 검증 흐름을 잃지 않는 문제**를 해결하기 위해 태어났고,
> 우리가 계속 감시해야 할 핵심 상태는 **README 링크 목록과 실제 문서 파일 목록** 이며,
> **문서를 추가/이동/삭제하는** 조건이 발동할 때 상태가 바뀐다.
> 그리고 무슨 일이 있어도 **README의 문서 목록은 실제 알고리즘 문서 파일 목록과 동기화되어야 한다** 라는 불변식은 반드시 유지되어야만 한다!
