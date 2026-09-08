# 퀵 정렬 (Quick Sort)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | pivot/input 가정 아래 평균 O(N log N) comparison sort |
| **Components** | Pivot, Partition |
| **Constraint** | 불균형 partition이면 입력 순서와 무관하게 worst O(N²) 가능 |
| **시간 복잡도** | pivot distribution 전제의 average O(N log N), worst O(N²) |

---

## 적용 범위와 검증 기준

- **범위:** comparison quicksort template입니다. 평균 `O(N log N)`은 pivot distribution/input order 가정에 의존하며 worst `O(N²)`는 이미 정렬된 입력 외에도 불균형 partition에서 발생합니다.
- **공간·성질:** in-place 표기는 auxiliary array를 피한다는 뜻이며 recursion stack은 평균 `O(log N)`, worst `O(N)`일 수 있습니다. 일반 구현은 stable sort가 아닙니다.
- **실패 조건:** duplicate pivot, partition 미진행, recursion depth, comparator inconsistency와 adversarial input을 포함합니다.
- **완료 증거:** sorted/reverse/equal/random fixture를 trusted sort와 비교하고 permutation·ordering invariant와 depth를 확인합니다.

---

## 기본 템플릿

```python
# [Quick Sort 템플릿: 아키텍트 버전]
# Use Case: 평균 O(N log N) 정렬
# Components: Pivot, Partition
# Constraint: 최악 O(N²) (이미 정렬된 경우)

def quick_sort(arr):
    # 1. 베이스 케이스 (Base Case)
    if len(arr) <= 1:
        return arr
    
    # 2. 피벗 선택 (Pivot Selection)
    #    - 중간값을 피벗으로 (최악 케이스 방지)
    pivot = arr[len(arr) // 2]
    
    # 3. 분할 로직 (Partition Logic)
    #    - 피벗 기준으로 3개 그룹으로 분할
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    # 4. 재귀 정복 (Recursive Conquer)
    return quick_sort(left) + middle + quick_sort(right)
```

---

## In-place 버전

```python
# [Quick Sort In-place 버전]
def quick_sort_inplace(arr, low, high):
    if low < high:
        # 1. 파티션 레이어 (Partition Layer)
        pi = partition(arr, low, high)
        
        # 2. 재귀 분할 (Recursive Division)
        quick_sort_inplace(arr, low, pi - 1)
        quick_sort_inplace(arr, pi + 1, high)

def partition(arr, low, high):
    # 피벗을 맨 오른쪽으로 선택
    pivot = arr[high]
    i = low - 1
    
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1
```

---

## 구조 요약

```text
베이스 케이스 → 피벗 선택 → 분할 → 재귀 정복
```
