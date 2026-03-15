# Algorithm Architect - GitHub Pages Visual Docs

이 디렉토리는 `code/templates/algorithm-architect`의 모든 템플릿 코드 파일을 GitHub Markdown 친화적으로 재문서화한 결과물입니다.

## 렌더링 원칙
- 모든 페이지는 `mermaid` 코드 블록을 포함합니다.
- 각 페이지는 Flow + Sequence 시각화와 핵심 코드, 레이어 해설을 제공합니다.
- 원본 파일 링크를 포함해 원문과 해설을 왕복할 수 있습니다.

## 문서 색인
- [BFS (너비 우선 탐색)](01-graph/01-bfs.md) (`01-graph/01-bfs.md`)
- [DFS (깊이 우선 탐색)](01-graph/02-dfs.md) (`01-graph/02-dfs.md`)
- [다익스트라 (Dijkstra)](01-graph/03-dijkstra.md) (`01-graph/03-dijkstra.md`)
- [벨만-포드 (Bellman-Ford)](01-graph/04-bellman-ford.md) (`01-graph/04-bellman-ford.md`)
- [플로이드-워셜 (Floyd-Warshall)](01-graph/05-floyd-warshall.md) (`01-graph/05-floyd-warshall.md`)
- [이진 탐색 (Binary Search)](02-sorting-searching/01-binary-search.md) (`02-sorting-searching/01-binary-search.md`)
- [퀵 정렬 (Quick Sort)](02-sorting-searching/02-quick-sort.md) (`02-sorting-searching/02-quick-sort.md`)
- [병합 정렬 (Merge Sort)](02-sorting-searching/03-merge-sort.md) (`02-sorting-searching/03-merge-sort.md`)
- [1차원 DP (1D Dynamic Programming)](03-dynamic-programming/01-dp-1d.md) (`03-dynamic-programming/01-dp-1d.md`)
- [2차원 DP (2D Dynamic Programming - 격자형)](03-dynamic-programming/02-dp-2d.md) (`03-dynamic-programming/02-dp-2d.md`)
- [냅색 문제 (Knapsack)](03-dynamic-programming/03-knapsack.md) (`03-dynamic-programming/03-knapsack.md`)
- [그리디 (Greedy)](04-greedy/01-greedy.md) (`04-greedy/01-greedy.md`)
- [트리 순회 (Tree Traversal)](05-tree/01-tree-traversal.md) (`05-tree/01-tree-traversal.md`)
- [최소 공통 조상 (LCA - Lowest Common Ancestor)](05-tree/02-lca.md) (`05-tree/02-lca.md`)
- [유니온 파인드 (Union-Find / Disjoint Set)](06-union-find/01-union-find.md) (`06-union-find/01-union-find.md`)
- [투 포인터 (Two Pointers)](07-two-pointers/01-two-pointers.md) (`07-two-pointers/01-two-pointers.md`)
- [슬라이딩 윈도우 (Sliding Window)](08-sliding-window/01-sliding-window.md) (`08-sliding-window/01-sliding-window.md`)
- [백트래킹 (Backtracking)](09-backtracking/01-backtracking.md) (`09-backtracking/01-backtracking.md`)
- [위상 정렬 (Topological Sort)](10-topological-sort/01-topological-sort.md) (`10-topological-sort/01-topological-sort.md`)
- [비트 마스킹 (Bit Masking)](11-bit-masking/01-bit-masking.md) (`11-bit-masking/01-bit-masking.md`)
- [convert_md_to_pdf.sh](convert_md_to_pdf.sh.md) (`convert_md_to_pdf.sh`)

## Ultrawork Validation Workflow
- Playwright 검증 러너: `code/templates/algorithm-architect/github-pages-docs/scripts/validate_docs_with_playwright.sh`
- 실행 시 동작:
  - 임시 런타임(`.pw-runtime`)에 Playwright/Marked/Mermaid 의존성을 준비
  - 로컬 HTTP 서버로 문서를 렌더링
  - 모든 문서를 순회하며 Mermaid 렌더링/헤딩 구조/레이아웃을 체크
  - `validation-artifacts/playwright-validation-summary.json` 및 스크린샷 생성

```bash
./code/templates/algorithm-architect/github-pages-docs/scripts/validate_docs_with_playwright.sh
```

- 기본 포트는 `8765`, 필요 시 `DOC_PORT=8877 ./code/templates/algorithm-architect/github-pages-docs/scripts/validate_docs_with_playwright.sh` 형태로 변경 가능
