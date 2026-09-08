# 트리 순회 (Tree Traversal)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 트리 탐색, 표현식 계산 |
| **Components** | Recursive or Stack |
| **Constraint** | 노드 방문 순서가 핵심 |
| **시간 복잡도** | finite tree의 각 node를 한 번 방문하면 O(N) |

---

## 적용 범위와 검증 기준

- **범위:** node가 한 번씩 연결된 finite tree를 순회할 때 `O(N)`입니다. 일반 graph나 shared/cyclic structure에는 visited 처리가 필요합니다.
- **공간 전제:** recursive DFS stack은 tree height `O(H)`, level-order queue는 최대 width에 비례합니다. skewed tree에서 stack overflow 가능성을 검토합니다.
- **실패 조건:** null root, cycle/shared child, deep skew, mutation during traversal와 잘못된 visit order를 포함합니다.
- **완료 증거:** empty·single·balanced·skewed fixture의 expected order와 node multiset을 비교하고 각 node를 정확히 한 번 처리하는지 확인합니다.

---

## TreeNode 정의

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

---

## Inorder (중위 순회): Left → Root → Right

```python
# [Inorder (중위 순회): Left -> Root -> Right]
def inorder_traversal(root):
    # 1. 베이스 케이스
    if not root:
        return []
    
    # 2. 재귀 순회
    result = []
    result.extend(inorder_traversal(root.left))   # Left
    result.append(root.val)                        # Root
    result.extend(inorder_traversal(root.right))  # Right
    
    return result
```

---

## Preorder (전위 순회): Root → Left → Right

```python
# [Preorder (전위 순회): Root -> Left -> Right]
def preorder_traversal(root):
    if not root:
        return []
    
    result = [root.val]                           # Root
    result.extend(preorder_traversal(root.left))  # Left
    result.extend(preorder_traversal(root.right)) # Right
    
    return result
```

---

## Postorder (후위 순회): Left → Right → Root

```python
# [Postorder (후위 순회): Left -> Right -> Root]
def postorder_traversal(root):
    if not root:
        return []
    
    result = []
    result.extend(postorder_traversal(root.left))  # Left
    result.extend(postorder_traversal(root.right)) # Right
    result.append(root.val)                        # Root
    
    return result
```

---

## Level Order (레벨 순회): BFS 기반

```python
# [Level Order (레벨 순회): BFS 기반]
def level_order_traversal(root):
    if not root:
        return []
    
    result = []
    queue = [root]
    
    while queue:
        level_size = len(queue)
        level = []
        
        for _ in range(level_size):
            node = queue.pop(0)
            level.append(node.val)
            
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        
        result.append(level)
    
    return result
```

---

## 구조 요약

```text
Inorder:    Left → Root → Right  (BST에서 정렬된 순서)
Preorder:   Root → Left → Right  (트리 복사)
Postorder:  Left → Right → Root  (트리 삭제)
Level Order: BFS 기반 레벨별 탐색
```
