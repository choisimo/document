# 냅색 문제 (Knapsack)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 배낭에 물건 넣기 (각 물건 0개 또는 1개) |
| **Components** | 2D DP (items × capacity) |
| **Constraint** | 무게 제한 내 최대 가치 |
| **시간 복잡도** | O(N × W) |

---

## 0/1 Knapsack

```python
# [0/1 Knapsack 템플릿: 아키텍트 버전]
# Use Case: 배낭에 물건 넣기 (각 물건 0개 또는 1개)
# Components: 2D DP (items x capacity)
# Constraint: 무게 제한 내 최대 가치

def knapsack_01(weights, values, capacity):
    # 1. 초기화 (Initialization Layer)
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    
    # 2. 2중 루프 (Double Loop)
    #    - i: 물건 인덱스
    #    - w: 현재 용량
    for i in range(1, n + 1):
        for w in range(1, capacity + 1):
            # 3. 선택 로직 (Choice Logic)
            #    - 물건을 넣을 수 있는가?
            if weights[i-1] <= w:
                # 넣는 경우 vs 안 넣는 경우
                include = values[i-1] + dp[i-1][w - weights[i-1]]
                exclude = dp[i-1][w]
                dp[i][w] = max(include, exclude)
            else:
                # 넣을 수 없으면 이전 값 유지
                dp[i][w] = dp[i-1][w]
    
    return dp[n][capacity]
```

---

## 무한 Knapsack (Unbounded)

```python
# [무한 Knapsack (Unbounded)]
def knapsack_unbounded(weights, values, capacity):
    dp = [0] * (capacity + 1)
    
    for w in range(1, capacity + 1):
        for i in range(len(weights)):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    
    return dp[capacity]
```

---

## 구조 요약

```text
0/1: 초기화(2D) → 물건×용량 루프 → 넣기/안넣기 선택
Unbounded: 초기화(1D) → 용량 루프 → 모든 물건 시도
```
