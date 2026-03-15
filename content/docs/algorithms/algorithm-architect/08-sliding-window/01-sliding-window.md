# 슬라이딩 윈도우 (Sliding Window) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `08-sliding-window/01-sliding-window.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 붙일 때 반드시 수정해야 하는 지점을 체크리스트로 제공합니다.

## 원본 템플릿
- Source: [08-sliding-window/01-sliding-window.md](https://github.com/choisimo/document/blob/main/code/templates/algorithm-architect/08-sliding-window/01-sliding-window.md)

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Initialize window state] --> B[Expand right pointer]
    B --> C[Update frequency sum]
    C --> D{Window violates constraint}
    D -- Yes --> E[Shrink left pointer]
    E --> C
    D -- No --> F[Update best answer]
    F --> G{More right positions}
    G -- Yes --> B
    G -- No --> H[Return best window result]
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant R as right
    participant L as left
    participant W as window-state
    loop iterate right
      R->>W: add new element
      alt invalid window
        L->>W: remove old element
      end
      W-->>R: best metric update
    end
```

## 핵심 코드
```python
# [Sliding Window 템플릿: 아키텍트 버전]
# Use Case: 부분 배열/문자열의 최댓값/최솟값
# Components: Window (Left, Right), HashMap (빈도)
# Constraint: 연속된 구간만 가능

def sliding_window_fixed(arr, k):
    # [고정 크기 윈도우]
    # 1. 초기화 (Initialization Layer)
    window_sum = sum(arr[:k])
    max_sum = window_sum
    
    # 2. 윈도우 이동 (Window Sliding)
    for i in range(k, len(arr)):
        # 3. 업데이트 로직 (Update Logic)
        #    - 새로운 원소 추가, 이전 원소 제거
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    
    return max_sum
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
