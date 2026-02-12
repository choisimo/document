# 투 포인터 (Two Pointers)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 정렬된 배열에서 합/차 찾기, 부분 배열 |
| **Components** | Left, Right 포인터 |
| **Constraint** | 정렬 필수 (대부분) |
| **시간 복잡도** | O(N) |

---

## 기본 템플릿

```python
# [Two Pointers 템플릿: 아키텍트 버전]
# Use Case: 정렬된 배열에서 합/차 찾기, 부분 배열
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

---

## 예제: 두 수의 합

```python
# [예제: 두 수의 합]
def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    
    while left < right:
        current = arr[left] + arr[right]
        
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1
    
    return []
```

---

## 예제: 세 수의 합 (3Sum)

```python
# [예제: 세 수의 합 (3Sum)]
def three_sum(arr):
    arr.sort()
    result = []
    
    for i in range(len(arr) - 2):
        # 중복 제거
        if i > 0 and arr[i] == arr[i-1]:
            continue
        
        left, right = i + 1, len(arr) - 1
        target = -arr[i]
        
        while left < right:
            current = arr[left] + arr[right]
            
            if current == target:
                result.append([arr[i], arr[left], arr[right]])
                
                # 중복 제거
                while left < right and arr[left] == arr[left+1]:
                    left += 1
                while left < right and arr[right] == arr[right-1]:
                    right -= 1
                
                left += 1
                right -= 1
            elif current < target:
                left += 1
            else:
                right -= 1
    
    return result
```

---

## 구조 요약

```text
초기화(left, right) → 포인터 이동 루프 → 합 비교 → 방향 결정
```
