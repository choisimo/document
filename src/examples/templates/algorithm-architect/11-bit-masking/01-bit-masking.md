# 비트 마스킹 (Bit Masking)

## 적용 계약

- 대상은 Python 3.x의 **0 이상 정수** 비트마스크입니다. Python 정수는 임의 정밀도이므로 32~64개 제한은 언어 제한이 아니라 메모리·시간 및 외부 저장 형식의 제약입니다.
- 비트 인덱스 `i`는 0 이상이어야 합니다. 음수 마스크는 Python의 부호 확장 때문에 아래 비트 개수 루프의 계약 밖입니다.
- 부분 집합을 실제 리스트로 만들면 시간과 출력 공간 모두 원소 복사를 포함합니다. 복잡도 표기는 단위 연산 가정의 분석값이며 실행 시간 보장이 아닙니다.

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 집합 상태 관리, 부분 집합 |
| **Components** | Bitmask (정수), Bit Operations |
| **Constraint** | 비트 인덱스와 마스크는 0 이상, 열거는 작은 `N`에만 적용 |
| **시간 복잡도** | 모든 부분 집합 materialization: `O(N·2^N)` |

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

## 예제: 비어 있지 않은 부분 집합의 최소 XOR 값

```python
# 빈 부분 집합은 제외한다. arr 원소는 0 이상 정수라고 가정한다.
def min_nonempty_subset_xor(arr):
    reachable = set()

    for num in arr:
        next_values = {num}
        next_values.update(xor_value ^ num for xor_value in reachable)
        reachable.update(next_values)

    return min(reachable) if reachable else None
```

---

## 완료 및 실패 증거

빈 입력, 중복 원소, 0 포함, 단일 원소를 확인하고 작은 입력은 `itertools.combinations`로 만든 전수 결과와 대조합니다. `None`은 비어 있지 않은 부분 집합이 없다는 뜻입니다. 큰 `N`에서는 `2^N` 출력 자체가 실패 원인이므로 시간·메모리 한도를 먼저 정합니다.

## 구조 요약

```text
비트 연산: Check(&), Set(|), Clear(&~), Toggle(^)
부분 집합: 0 ~ 2^N 순회 → 각 비트 확인 → 원소 포함 여부 결정
```
