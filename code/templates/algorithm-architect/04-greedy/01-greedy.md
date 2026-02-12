# 그리디 (Greedy)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 최적 부분 구조, 탐욕적 선택 속성 |
| **Components** | Sorting (대부분), Selection Logic |
| **Constraint** | 매 순간 최선의 선택이 전체 최적해 보장해야 함 |
| **시간 복잡도** | O(N log N) (정렬 포함) |

---

## 기본 템플릿

```python
# [Greedy 템플릿: 아키텍트 버전]
# Use Case: 최적 부분 구조, 탐욕적 선택 속성
# Components: Sorting (대부분), Selection Logic
# Constraint: 매 순간 최선의 선택이 전체 최적해 보장해야 함

def greedy_template(items):
    # 1. 정렬 레이어 (Sorting Layer)
    #    - 그리디 기준에 따라 정렬
    items.sort(key=lambda x: x[1])  # 예: 종료 시간 기준
    
    # 2. 초기화 (Initialization)
    result = []
    last_selected = None
    
    # 3. 순차 선택 (Sequential Selection)
    for item in items:
        # 4. 선택 조건 (Selection Condition)
        #    - 탐욕적 규칙에 부합하는지 확인
        if is_valid(item, last_selected):
            result.append(item)
            last_selected = item
    
    return result

def is_valid(item, last_selected):
    # 선택 가능 여부 판단 로직
    if last_selected is None:
        return True
    return item[0] >= last_selected[1]  # 예: 시작 시간 >= 이전 종료 시간
```

---

## 예제: 회의실 배정 (Activity Selection)

```python
# [예제: 회의실 배정 (Activity Selection)]
def activity_selection(activities):
    # (시작, 종료) 튜플 리스트
    # 종료 시간 기준 정렬
    activities.sort(key=lambda x: x[1])
    
    result = [activities[0]]
    last_end = activities[0][1]
    
    for start, end in activities[1:]:
        if start >= last_end:
            result.append((start, end))
            last_end = end
    
    return result
```

---

## 예제: 동전 거스름돈 (Coin Change - Greedy)

```python
# [예제: 동전 거스름돈 (Coin Change - Greedy)]
def coin_change_greedy(coins, amount):
    coins.sort(reverse=True)
    count = 0
    
    for coin in coins:
        if amount >= coin:
            count += amount // coin
            amount %= coin
    
    return count if amount == 0 else -1
```

---

## 구조 요약

```text
정렬(그리디 기준) → 순차 순회 → 선택 조건 판단 → 결과 누적
```
