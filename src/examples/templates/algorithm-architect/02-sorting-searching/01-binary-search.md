# 이진 탐색 (Binary Search)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | comparator 기준 정렬된 random-access sequence의 logarithmic comparison search |
| **Components** | Left, Right 포인터, Mid |
| **Constraint** | 배열이 정렬되어 있어야 함 |
| **시간 복잡도** | constant-cost comparator·access 기준 O(log N) comparisons |

---

## 적용 범위와 검증 기준

- **범위:** comparator 기준으로 정렬되고 random access가 가능한 sequence를 가정합니다. `O(log N)`은 비교 횟수 bound이며 data access나 comparator 비용이 상수라는 전제가 필요합니다.
- **전제:** closed/half-open interval, duplicate 처리, lower/upper bound 정의와 반환할 “없음” 값을 먼저 정합니다.
- **실패 조건:** off-by-one, empty input, integer midpoint overflow, 정렬 기준 불일치와 NaN·custom comparator를 포함합니다.
- **완료 증거:** empty·single·duplicate·boundary·absent key 입력을 linear reference와 비교하고 loop invariant와 종료를 확인합니다.

---

## 기본 템플릿

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

---

## 변형: Lower Bound

> "target 이상인 첫 번째 위치"

```python
# [Binary Search 변형: Lower Bound]
def lower_bound(arr, target):
    left, right = 0, len(arr)
    
    while left < right:
        mid = (left + right) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    return left
```

---

## 변형: Upper Bound

> "target 초과인 첫 번째 위치"

```python
# [Binary Search 변형: Upper Bound]
def upper_bound(arr, target):
    left, right = 0, len(arr)
    
    while left < right:
        mid = (left + right) // 2
        
        if arr[mid] <= target:
            left = mid + 1
        else:
            right = mid
    
    return left
```

---

## 구조 요약

```text
초기화(left, right) → 분할 루프 → 중간점 비교 → 범위 축소
```
