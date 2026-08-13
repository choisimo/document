# 백트래킹 (Backtracking) - GitHub Pages 해설

## 문서 목적
- 원본 템플릿 `09-backtracking/01-backtracking.md` 의 내부 동작을 GitHub Markdown에서 바로 읽을 수 있게 설명합니다.
- 코드 레이어(초기화/루프/조건/갱신/종료)를 분해하고, Mermaid로 제어 흐름을 시각화합니다.
- 실전 문제에 적용할 때 choice·constraint·restore·pruning 근거를 검토할 checklist를 제공합니다.

## 원본 템플릿
- Source: [09-backtracking/01-backtracking.md](../../09-backtracking/01-backtracking.md)

## 적용 범위와 검증 기준

- **범위:** 이 해설은 linked backtracking template의 control-flow model입니다. 실제 search tree의 branching, depth, output 수와 source revision에 따라 설명과 복잡도가 달라집니다.
- **알고리즘 전제:** choice, constraint, goal, mutable state와 restore 순서를 정의합니다. pruning은 valid solution을 제거하지 않는다는 completeness 근거가 있을 때만 적용합니다.
- **실패 조건:** state restore 누락, duplicate result, invalid prune, recursion depth, unbounded search와 output-memory 폭증을 포함합니다.
- **완료 증거:** 작은 domain의 exhaustive generator와 solution set을 비교하고 validity, uniqueness, prune count와 source link 동기화를 확인합니다.

---

## 내부 메커니즘 (Flow)
```mermaid
flowchart TD
    A[Enter recursion frame] --> B{Goal reached}
    B -- Yes --> C[Copy path to result]
    B -- No --> D[Iterate candidates]
    D --> E{Pruning condition}
    E -- Yes --> F[Skip branch]
    E -- No --> G[Choose candidate]
    G --> H[Recurse deeper]
    H --> I[Unchoose rollback]
    I --> D
    F --> D
```

## 내부 상호작용 (Sequence)
```mermaid
sequenceDiagram
    participant BT as backtrack
    participant Path
    participant Result
    BT->>Path: choose
    BT->>BT: recurse
    BT->>Path: unchoose
    alt solution found
      BT->>Result: append copy path
    end
```

## 핵심 코드
```python
# [Backtracking 템플릿: 아키텍트 버전]
# Use Case: 모든 경우의 수 탐색, 조합, 순열
# Components: Recursive DFS, Choice, Constraint
# Constraint: 가지치기(Pruning)로 최적화

def backtrack_template(candidates, target):
    # 1. 초기화 (Initialization Layer)
    result = []
    
    # 2. 백트래킹 함수 (Backtracking Function)
    def backtrack(path, start, remaining):
        # 3. 종료 조건 (Base Case)
        if remaining == 0:
            result.append(path[:])  # 복사 필수
            return
        
        # 4. 후보 탐색 (Candidate Exploration)
        for i in range(start, len(candidates)):
            # 5. 가지치기 (Pruning)
            if candidates[i] > remaining:
                break  # 정렬되어 있다면 조기 종료
            
            # 6. 선택 (Choose)
            path.append(candidates[i])
            
            # 7. 재귀 탐색 (Explore)
            backtrack(path, i, remaining - candidates[i])
            
            # 8. 복원 (Unchoose / Backtrack)
            path.pop()
    
    candidates.sort()  # 가지치기 효율화
    backtrack([], 0, target)
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
- test 수보다 empty·duplicate·invalid-prune·deep-search와 exhaustive reference coverage를 기준으로 삼는다.
