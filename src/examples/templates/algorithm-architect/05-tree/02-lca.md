# 최소 공통 조상 (LCA - Lowest Common Ancestor)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 두 노드의 공통 조상 찾기 |
| **Components** | Tree Structure, Parent Tracking |
| **Constraint** | rooted tree, node 존재와 identity·ancestor 정의 필요 |
| **시간 복잡도** | 이 single-query traversal template은 O(N) |

---

## 적용 범위와 검증 기준

- **범위:** 이 template은 rooted tree에서 한 query를 `O(N)`에 처리하는 방식입니다. 많은 query에는 parent/depth preprocessing, binary lifting 또는 Euler/RMQ 등 다른 trade-off가 있습니다.
- **전제:** 두 node의 존재, identity 비교, root와 ancestor 정의를 명시합니다. BST ordering을 이용하는 LCA와 일반 binary tree LCA를 구분합니다.
- **실패 조건:** node 하나/둘 모두 없음, 동일 node, duplicate value, disconnected forest와 deep recursion을 포함합니다.
- **완료 증거:** ancestor-descendant, 서로 다른 subtree, root, missing-node fixture에서 path-to-root reference와 비교합니다.

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
