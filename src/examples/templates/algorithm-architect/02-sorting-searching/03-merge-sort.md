# 병합 정렬 (Merge Sort)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 안정적인 O(N log N) 정렬 |
| **Components** | Divide, Merge |
| **Constraint** | O(N) 추가 공간 필요 |
| **시간 복잡도** | O(N log N) |

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
