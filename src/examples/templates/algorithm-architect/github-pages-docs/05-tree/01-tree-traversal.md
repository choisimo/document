# 트리 순회 (Tree Traversal) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `05-tree/01-tree-traversal.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 수정 지점을 체크리스트로 정리한다.

## 원본 템플릿
- Source: [05-tree/01-tree-traversal.md](../../05-tree/01-tree-traversal.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Visit TreeNode] --> B{Traversal type}
    B -- Inorder --> C[Left Root Right]
    B -- Preorder --> D[Root Left Right]
    B -- Postorder --> E[Left Right Root]
    B -- LevelOrder --> F[Queue BFS by level]
    C --> G[Collect values]
    D --> G
    E --> G
    F --> G
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant Node
    participant Left
    participant Right
    participant Out as output list
    Node->>Left: recurse
    Left-->>Out: values
    Node->>Out: emit root by order
    Node->>Right: recurse
    Right-->>Out: values
```

## 핵심 코드
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
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
