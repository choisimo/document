# 백트래킹 (Backtracking)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 모든 경우의 수 탐색, 조합, 순열 |
| **Components** | Recursive DFS, Choice, Constraint |
| **Constraint** | 가지치기(Pruning)로 최적화 |
| **시간 복잡도** | 문제에 따라 다름 (지수적) |

---

## 기본 템플릿

```python
# [Backtracking 템플릿: 아키텍트 버전]
# Use Case: 모든 경우의 수 탐색, 조합, 순열
# Components: Recursive DFS, Choice, Constraint
# Constraint: 가지치기(Pruning)로 최적화

def backtrack_template(candidates, target):
    # 1. 초기화 (Initialization Layer)
    result = []
    
    # 2. 백트래킹 함수 (Backtracking Function)
    def backtrack(path, start, remaining):
        # 3. 종료 조건 (Base Case)
        if remaining == 0:
            result.append(path[:])  # 복사 필수
            return
        
        # 4. 후보 탐색 (Candidate Exploration)
        for i in range(start, len(candidates)):
            # 5. 가지치기 (Pruning)
            if candidates[i] > remaining:
                break  # 정렬되어 있다면 조기 종료
            
            # 6. 선택 (Choose)
            path.append(candidates[i])
            
            # 7. 재귀 탐색 (Explore)
            backtrack(path, i, remaining - candidates[i])
            
            # 8. 복원 (Unchoose / Backtrack)
            path.pop()
    
    candidates.sort()  # 가지치기 효율화
    backtrack([], 0, target)
    return result
```

---

## 예제: 조합 (Combinations)

```python
# [예제: 조합 (Combinations)]
def combinations(n, k):
    result = []
    
    def backtrack(start, path):
        # 종료 조건
        if len(path) == k:
            result.append(path[:])
            return
        
        for i in range(start, n + 1):
            path.append(i)
            backtrack(i + 1, path)  # 다음 숫자부터
            path.pop()
    
    backtrack(1, [])
    return result
```

---

## 예제: 순열 (Permutations)

```python
# [예제: 순열 (Permutations)]
def permutations(nums):
    result = []
    
    def backtrack(path):
        # 종료 조건
        if len(path) == len(nums):
            result.append(path[:])
            return
        
        for num in nums:
            if num in path:
                continue  # 이미 사용한 숫자
            
            path.append(num)
            backtrack(path)
            path.pop()
    
    backtrack([])
    return result
```

---

## 예제: N-Queens

```python
# [예제: N-Queens]
def n_queens(n):
    result = []
    
    def backtrack(row, cols, diag1, diag2, board):
        # 종료 조건
        if row == n:
            result.append([''.join(r) for r in board])
            return
        
        for col in range(n):
            # 가지치기: 공격 가능한지 확인
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue
            
            # 선택
            board[row][col] = 'Q'
            cols.add(col)
            diag1.add(row - col)
            diag2.add(row + col)
            
            # 재귀
            backtrack(row + 1, cols, diag1, diag2, board)
            
            # 복원
            board[row][col] = '.'
            cols.remove(col)
            diag1.remove(row - col)
            diag2.remove(row + col)
    
    board = [['.' for _ in range(n)] for _ in range(n)]
    backtrack(0, set(), set(), set(), board)
    return result
```

---

## 구조 요약

```text
초기화 → 종료 조건 → 후보 탐색 → 가지치기 → 선택 → 재귀 → 복원
```
