# 병합 정렬 (Merge Sort) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `02-sorting-searching/03-merge-sort.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 입력 계약과 완료 판정

- 원소 사이에 일관된 비교 순서가 정의돼 있어야 합니다.
- 이 구현은 분할 슬라이스와 병합 결과를 새로 만들며 입력 리스트 자체를 제자리 정렬하지 않습니다.
- 안정성은 두 값이 같을 때 왼쪽 원소를 먼저 고르는 병합 조건에 의존합니다.
- 점근적 보조 공간 외에도 Python 슬라이스와 재귀가 만드는 할당을 입력 크기 기준으로 고려합니다.

완료 조건은 결과가 비내림차순이고 입력과 같은 원소 다중집합을 가지며, 동일 키 원소의 상대 순서가 안정성 계약과 일치하는 것입니다.

## 원본 템플릿
- Source: [02-sorting-searching/03-merge-sort.md](https://github.com/choisimo/document/blob/main/code/templates/algorithm-architect/02-sorting-searching/03-merge-sort.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Input array] --> B{len 1}
    B -- Yes --> C[Return array]
    B -- No --> D[Split mid]
    D --> E[MergeSort left]
    D --> F[MergeSort right]
    E --> G[Merge two sorted arrays]
    F --> G
    G --> H[Return merged result]
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant Caller
    participant Left
    participant Right
    participant Merge
    Caller->>Left: sort left half
    Caller->>Right: sort right half
    Left-->>Merge: sorted left
    Right-->>Merge: sorted right
    Merge-->>Caller: stable merged array
```

## 핵심 코드
```python
# [Merge Sort 템플릿: 아키텍트 버전]
# Use Case: 안정적인 O(N log N) 정렬
# Components: Divide, Merge
# Constraint: O(N) 추가 공간 필요

def merge_sort(arr):
    # 1. 베이스 케이스 (Base Case)
    if len(arr) <= 1:
        return arr
    
    # 2. 분할 레이어 (Division Layer)
    mid = len(arr) // 2
    left = arr[:mid]
    right = arr[mid:]
    
    # 3. 재귀 정복 (Recursive Conquer)
    left = merge_sort(left)
    right = merge_sort(right)
    
    # 4. 병합 레이어 (Merge Layer)
    return merge(left, right)


def merge(left, right):
    # 1. 초기화 (Initialization)
    result = []
    i = j = 0
    
    # 2. 병합 루프 (Merge Loop)
    #    - 두 배열을 비교하며 작은 것부터 추가
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    # 3. 잔여 처리 (Remaining Elements)
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result
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
