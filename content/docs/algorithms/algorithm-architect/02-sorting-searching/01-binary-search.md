# 이진 탐색 (Binary Search) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `02-sorting-searching/01-binary-search.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 입력 계약과 완료 판정

- 배열은 코드의 비교 연산과 같은 기준으로 오름차순 정렬돼 있어야 합니다.
- 중복 값이 있으면 이 템플릿은 일치하는 인덱스 하나를 반환하며 첫 번째·마지막 위치를 보장하지 않습니다.
- 빈 배열은 `-1`을 반환하고, 찾지 못한 경우의 sentinel도 `-1`입니다.
- 사용자 정의 객체는 정렬과 탐색에 같은 key 또는 comparator를 사용해야 합니다.

완료 조건은 반환 인덱스가 범위 안이고 `arr[index] == target`이거나, `-1`일 때 정렬된 입력에 target이 없다는 것입니다. 첫 위치나 삽입 위치가 필요하면 루프 불변식과 반환 계약을 별도로 바꿉니다.

## 원본 템플릿
- Source: [02-sorting-searching/01-binary-search.md](https://github.com/choisimo/document/blob/main/code/templates/algorithm-architect/02-sorting-searching/01-binary-search.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Set left right bounds] --> B{left right}
    B -- No --> C[Return not found]
    B -- Yes --> D[Compute mid]
    D --> E{arr mid target}
    E -- Yes --> F[Return mid]
    E -- No --> G{arr mid target}
    G -- Yes --> H[left mid 1]
    G -- No --> I[right mid 1]
    H --> B
    I --> B
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant L as left
    participant R as right
    participant M as mid
    L->>M: choose midpoint
    M->>R: compare target
    R-->>L: shrink range
    loop until converged
      L->>M: recompute mid
    end
```

## 핵심 코드
```python
# [Binary Search 템플릿: 아키텍트 버전]
# Use Case: 정렬된 배열에서 O(log N) 탐색
# Components: Left, Right 포인터, Mid
# Constraint: 배열이 정렬되어 있어야 함

def binary_search(arr, target):
    # 1. 초기화 (Initialization Layer)
    #    - 탐색 범위 설정
    left, right = 0, len(arr) - 1
    
    # 2. 분할 루프 (Division Loop)
    #    - 범위가 유효한 동안 반복
    while left <= right:
        # 3. 중간점 계산 (Mid Calculation)
        mid = (left + right) // 2
        
        # 4. 비교 로직 (Comparison Logic)
        if arr[mid] == target:
            return mid  # 발견
        elif arr[mid] < target:
            left = mid + 1  # 오른쪽 절반 탐색
        else:
            right = mid - 1  # 왼쪽 절반 탐색
    
    return -1  # 찾지 못함
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
