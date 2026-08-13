# 퀵 정렬 (Quick Sort) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `02-sorting-searching/02-quick-sort.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 원본 템플릿
- Source: [02-sorting-searching/02-quick-sort.md](../../02-sorting-searching/02-quick-sort.md)

## 적용 계약과 근거 경계

- Python 3.x의 상호 비교 가능한 값 sequence를 받아 새 list를 반환하며 입력을 수정하지 않습니다.
- 중간 **위치**의 값을 피벗으로 고르는 것은 최악 분할 방지 보장이 아닙니다. 시간은 보통 `O(N log N)`, 피벗이 반복해서 극단값이면 `O(N²)`입니다.
- list comprehension과 연결로 추가 할당이 발생합니다. 내장 `sorted`보다 빠르다는 주장은 벤치마크 없이 할 수 없습니다.

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Choose pivot] --> B[Partition array]
    B --> C[Left pivot]
    B --> D[Equal pivot]
    B --> E[Right pivot]
    C --> F{size 1}
    E --> G{size 1}
    F -- Yes --> H[QuickSort left]
    G -- Yes --> I[QuickSort right]
    F -- No --> J[Keep left]
    G -- No --> K[Keep right]
    H --> L[Concatenate left mid right]
    I --> L
    J --> L
    K --> L
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant Q as QuickSort
    participant P as Pivot
    participant A as Array
    Q->>P: pick pivot
    Q->>A: partition around pivot
    Q->>Q: recurse left
    Q->>Q: recurse right
    Q-->>A: merged order
```

## 핵심 코드
```python
# [Quick Sort 템플릿: 아키텍트 버전]
# Use Case: 평균 O(N log N) 정렬
# Components: Pivot, Partition
# Constraint: 최악 O(N²) (피벗이 반복해서 극단값이 되는 입력)

def quick_sort(arr):
    # 1. 베이스 케이스 (Base Case)
    if len(arr) <= 1:
        return arr
    
    # 2. 피벗 선택 (Pivot Selection)
    #    - 중간 위치의 값을 피벗으로 선택하되 최악 케이스를 보장해 피하지는 않음
    pivot = arr[len(arr) // 2]
    
    # 3. 분할 로직 (Partition Logic)
    #    - 피벗 기준으로 3개 그룹으로 분할
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    # 4. 재귀 정복 (Recursive Conquer)
    return quick_sort(left) + middle + quick_sort(right)
```

## 코드 레이어 해설
- **Initialization**: 상태 테이블/포인터/큐/스택/부모 배열 등 탐색의 기준 상태를 만든다.
- **Process Loop / Recursion**: 입력 공간을 순회하며 상태 전이를 반복한다.
- **Decision Rule**: 분기 조건(완화 가능 여부, 유효 선택 여부, 종료 조건)을 적용한다.
- **State Update**: 거리/DP/집합/결과 배열을 갱신하고 다음 단계로 전달한다.
- **Termination**: 목표 도달, 범위 소진, 큐/스택 고갈, 사이클 검출 등으로 종료한다.

## 실전 적용 체크리스트
- 빈·단일·정렬·역정렬·전체 동일·중복 많은 입력을 시험합니다.
- 분할 결과가 원소 multiset을 보존하고 left/middle/right 조건을 만족하는지 확인합니다.
- 결과를 `sorted(arr)`와 무작위·적대적 입력에서 대조합니다.
- 재귀 깊이와 할당량이 한도를 넘으면 내장 정렬이나 보장된 알고리즘으로 전환합니다.
