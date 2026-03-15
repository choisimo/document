# 슬라이딩 윈도우 (Sliding Window)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 부분 배열/문자열의 최댓값/최솟값 |
| **Components** | Window (Left, Right), HashMap (빈도) |
| **Constraint** | 연속된 구간만 가능 |
| **시간 복잡도** | O(N) |

---

## 고정 크기 윈도우

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

---

## 가변 크기 윈도우

```python
def sliding_window_variable(s, k):
    # [가변 크기 윈도우]
    # 예: 서로 다른 문자 k개 이하인 최장 부분 문자열
    
    # 1. 초기화
    left = 0
    max_length = 0
    char_count = {}
    
    # 2. Right 포인터 확장
    for right in range(len(s)):
        # 3. 윈도우 확장 (Expand Window)
        char = s[right]
        char_count[char] = char_count.get(char, 0) + 1
        
        # 4. 윈도우 축소 (Shrink Window)
        #    - 조건 위반 시 left 이동
        while len(char_count) > k:
            left_char = s[left]
            char_count[left_char] -= 1
            if char_count[left_char] == 0:
                del char_count[left_char]
            left += 1
        
        # 5. 최댓값 갱신
        max_length = max(max_length, right - left + 1)
    
    return max_length
```

---

## 예제: 최소 윈도우 부분 문자열

```python
# [예제: 최소 윈도우 부분 문자열]
def min_window_substring(s, t):
    from collections import Counter
    
    # 1. 타겟 문자 빈도 계산
    target_count = Counter(t)
    required = len(target_count)
    
    left = 0
    formed = 0
    window_counts = {}
    
    min_len = float('inf')
    min_left = 0
    
    # 2. Right 확장
    for right in range(len(s)):
        char = s[right]
        window_counts[char] = window_counts.get(char, 0) + 1
        
        if char in target_count and window_counts[char] == target_count[char]:
            formed += 1
        
        # 3. 조건 만족 시 Left 축소
        while left <= right and formed == required:
            # 최솟값 갱신
            if right - left + 1 < min_len:
                min_len = right - left + 1
                min_left = left
            
            # Left 이동
            char = s[left]
            window_counts[char] -= 1
            if char in target_count and window_counts[char] < target_count[char]:
                formed -= 1
            left += 1
    
    return "" if min_len == float('inf') else s[min_left:min_left + min_len]
```

---

## 구조 요약

```text
고정: 초기 윈도우 → 슬라이드(추가/제거) → 갱신
가변: Right 확장 → 조건 위반 시 Left 축소 → 최적값 갱신
```
