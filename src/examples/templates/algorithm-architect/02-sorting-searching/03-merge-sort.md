# 병합 정렬 (Merge Sort)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | equal-key tie rule을 지키면 stable한 O(N log N) sort |
| **Components** | Divide, Merge |
| **Constraint** | 이 array 구현은 O(N) auxiliary buffer 사용; variant별로 다름 |
| **시간 복잡도** | O(N log N) |

---

## 적용 범위와 검증 기준

- **범위:** array 기반 top-down merge sort의 대표 bound는 `O(N log N)`입니다. `O(N)` auxiliary space는 이 구현 계열의 특성이며 linked-list나 specialized in-place variant에 그대로 적용되지 않습니다.
- **전제:** stability는 equal key에서 left element를 먼저 선택하는 merge rule과 comparator consistency를 전제로 합니다.
- **실패 조건:** split/merge boundary, temp buffer 크기, copy-back 누락, empty input과 recursion limit을 포함합니다.
- **완료 증거:** duplicate key에 original order tag를 붙여 ordering·stability·permutation을 reference sort와 비교합니다.

---

## 기본 템플릿

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

---

## 구조 요약

```text
베이스 케이스 → 분할(mid) → 재귀 정복 → 병합(두 배열 비교 합치기)
```
