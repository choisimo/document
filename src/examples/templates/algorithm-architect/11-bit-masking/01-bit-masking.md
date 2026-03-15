# 비트 마스킹 (Bit Masking)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 집합 상태 관리, 부분 집합 |
| **Components** | Bitmask (정수), Bit Operations |
| **Constraint** | 최대 32~64개 원소 |
| **시간 복잡도** | O(2^N) (부분 집합 생성) |

---

## 기본 비트 연산

```python
# [Bit Masking 템플릿: 아키텍트 버전]
# Use Case: 집합 상태 관리, 부분 집합
# Components: Bitmask (정수), Bit Operations
# Constraint: 최대 32~64개 원소

def bit_operations():
    # 1. 기본 비트 연산 (Basic Operations)
    
    # i번째 비트 확인 (Check)
    def check_bit(mask, i):
        return (mask & (1 << i)) != 0
    
    # i번째 비트 설정 (Set)
    def set_bit(mask, i):
        return mask | (1 << i)
    
    # i번째 비트 해제 (Clear)
    def clear_bit(mask, i):
        return mask & ~(1 << i)
    
    # i번째 비트 토글 (Toggle)
    def toggle_bit(mask, i):
        return mask ^ (1 << i)
    
    # 켜진 비트 개수 (Count)
    def count_bits(mask):
        count = 0
        while mask:
            count += mask & 1
            mask >>= 1
        return count
    
    return check_bit, set_bit, clear_bit, toggle_bit, count_bits
```

---

## 예제: 모든 부분 집합 생성

```python
# [예제: 모든 부분 집합 생성]
def generate_subsets(arr):
    n = len(arr)
    result = []
    
    # 2^n 개의 부분 집합
    for mask in range(1 << n):
        subset = []
        for i in range(n):
            if mask & (1 << i):
                subset.append(arr[i])
        result.append(subset)
    
    return result
```

---

## 예제: 최소 XOR 값 (DP with Bitmask)

```python
# [예제: 최소 XOR 값 (DP with Bitmask)]
def min_xor_subset(arr):
    n = len(arr)
    dp = {0}  # 가능한 XOR 값들
    
    for num in arr:
        new_dp = set()
        for xor_val in dp:
            new_dp.add(xor_val ^ num)
        dp.update(new_dp)
    
    return min(dp)
```

---

## 구조 요약

```text
비트 연산: Check(&), Set(|), Clear(&~), Toggle(^)
부분 집합: 0 ~ 2^N 순회 → 각 비트 확인 → 원소 포함 여부 결정
```
