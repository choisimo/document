# 투 포인터 (Two Pointers) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `07-two-pointers/01-two-pointers.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 원본 템플릿
- Source: [07-two-pointers/01-two-pointers.md](../../07-two-pointers/01-two-pointers.md)

## 적용 계약과 근거 경계

- `arr`는 오름차순이며 원소와 target은 덧셈·비교가 일관된 값이어야 합니다. 이 코드는 연속 부분 배열이나 차이 탐색의 범용 템플릿이 아닙니다.
- 합이 target인 index pair 하나를 반환하고 없으면 `None`입니다. 중복 값에서 어떤 pair를 고를지는 보장하지 않습니다.
- 이미 정렬된 입력에 시간 `O(n)`, 추가 공간 `O(1)`이며 정렬 비용은 포함하지 않습니다.

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Set left and right] --> B{left right}
    B -- No --> C[Stop]
    B -- Yes --> D[Compute current metric]
    D --> E{matches target}
    E -- Yes --> F[Record answer]
    E -- No --> G{too small too large}
    G -- too small --> H[left]
    G -- too large --> I[right]
    H --> B
    I --> B
    F --> B
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant L as left ptr
    participant R as right ptr
    participant A as array
    L->>A: read arr left
    R->>A: read arr right
    A-->>L: compare sum
    L->>L: move inward
    R->>R: move inward
```

## 핵심 코드
```python
# [Two Pointers 템플릿: 아키텍트 버전]
# Use Case: 정렬된 배열에서 두 원소의 합 찾기
# Components: Left, Right 포인터
# Constraint: 정렬 필수 (대부분)

def two_pointers_template(arr, target):
    # 1. 초기화 (Initialization Layer)
    left, right = 0, len(arr) - 1
    
    # 2. 포인터 이동 루프 (Pointer Movement Loop)
    while left < right:
        # 3. 계산 레이어 (Calculation Layer)
        current_sum = arr[left] + arr[right]
        
        # 4. 조건 판단 (Condition Check)
        if current_sum == target:
            return (left, right)
        elif current_sum < target:
            left += 1   # 합을 키워야 함
        else:
            right -= 1  # 합을 줄여야 함
    
    return None
```

## 코드 레이어 해설
- **Initialization**: 상태 테이블/포인터/큐/스택/부모 배열 등 탐색의 기준 상태를 만든다.
- **Process Loop / Recursion**: 입력 공간을 순회하며 상태 전이를 반복한다.
- **Decision Rule**: 분기 조건(완화 가능 여부, 유효 선택 여부, 종료 조건)을 적용한다.
- **State Update**: 거리/DP/집합/결과 배열을 갱신하고 다음 단계로 전달한다.
- **Termination**: 목표 도달, 범위 소진, 큐/스택 고갈, 사이클 검출 등으로 종료한다.

## 실전 적용 체크리스트
- 빈·단일 입력, 음수, 중복, 여러 정답, 정답 없음과 정렬 위반을 시험합니다.
- 합이 작으면 왼쪽 이동 시 버리는 pair가 정답일 수 없다는 단조성 근거를 확인합니다.
- 작은 배열은 모든 index pair `O(n²)` 전수 결과와 대조합니다.
- 모든 pair가 필요하거나 입력이 정렬되지 않았으면 반환 계약과 알고리즘을 바꿉니다.
