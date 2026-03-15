# 최소 공통 조상 (LCA - Lowest Common Ancestor)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 두 노드의 공통 조상 찾기 |
| **Components** | Tree Structure, Parent Tracking |
| **Constraint** | 트리 구조 필수 |
| **시간 복잡도** | O(N) |

---

## 기본 템플릿

```python
# [LCA 템플릿: 아키텍트 버전]
# Use Case: 두 노드의 공통 조상 찾기
# Components: Tree Structure, Parent Tracking
# Constraint: 트리 구조 필수

def lowest_common_ancestor(root, p, q):
    # 1. 베이스 케이스 (Base Case)
    if not root or root == p or root == q:
        return root
    
    # 2. 재귀 탐색 (Recursive Search)
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    
    # 3. 판단 로직 (Decision Logic)
    if left and right:
        return root  # 양쪽에 모두 있으면 현재 노드가 LCA
    
    return left if left else right  # 한쪽에만 있으면 그쪽 반환
```

---

## 구조 요약

```text
베이스 케이스(null/타겟) → 좌우 재귀 탐색 → 양쪽 존재 여부로 LCA 판단
```
