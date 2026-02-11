# BST - JavaScript Implementation

> **Focus:** V8 엔진 최적화, Hidden Class, Event Loop 관점

---

## Phase 1: The Blueprint

```javascript
class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this._root = null;
    this._size = 0;
  }

  insert(key) {
    this._root = this._insertRecursive(this._root, key);
    this._size++;
  }

  _insertRecursive(node, key) {
    if (node === null) {
      return new Node(key);
    }

    if (key < node.key) {
      node.left = this._insertRecursive(node.left, key);
    } else if (key > node.key) {
      node.right = this._insertRecursive(node.right, key);
    }

    return node;
  }

  search(key) {
    return this._searchRecursive(this._root, key);
  }

  _searchRecursive(node, key) {
    if (node === null) return false;
    if (key === node.key) return true;
    if (key < node.key) return this._searchRecursive(node.left, key);
    return this._searchRecursive(node.right, key);
  }

  delete(key) {
    const { node, deleted } = this._deleteRecursive(this._root, key);
    this._root = node;
    if (deleted) this._size--;
  }

  _deleteRecursive(node, key) {
    if (node === null) return { node: null, deleted: false };

    let deleted = false;

    if (key < node.key) {
      const result = this._deleteRecursive(node.left, key);
      node.left = result.node;
      deleted = result.deleted;
    } else if (key > node.key) {
      const result = this._deleteRecursive(node.right, key);
      node.right = result.node;
      deleted = result.deleted;
    } else {
      deleted = true;
      if (node.left === null) return { node: node.right, deleted: true };
      if (node.right === null) return { node: node.left, deleted: true };

      const successor = this._findMin(node.right);
      node.key = successor.key;
      const result = this._deleteRecursive(node.right, successor.key);
      node.right = result.node;
    }

    return { node, deleted };
  }

  _findMin(node) {
    let current = node;
    while (current.left !== null) {
      current = current.left;
    }
    return current;
  }

  *inorder() {
    yield* this._inorderRecursive(this._root);
  }

  *_inorderRecursive(node) {
    if (node !== null) {
      yield* this._inorderRecursive(node.left);
      yield node.key;
      yield* this._inorderRecursive(node.right);
    }
  }

  get size() {
    return this._size;
  }
}
```

---

## Phase 2: Under the Hood - V8 Engine Optimization

### Hidden Classes (Shapes)

V8 엔진은 객체의 **Hidden Class**를 생성하여 프로퍼티 접근을 최적화합니다.

```
Node 생성 흐름:
┌─────────────────────────────────────────────────────────────────┐
│ new Node(5)                                                     │
│ ► V8이 Hidden Class 생성                                        │
│                                                                 │
│   Hidden Class C0 (초기)                                        │
│   ┌─────────────────────┐                                       │
│   │ properties: []       │                                      │
│   └─────────────────────┘                                       │
│            ↓ this.key = key                                     │
│   Hidden Class C1                                               │
│   ┌─────────────────────┐                                       │
│   │ key: offset 0        │                                      │
│   └─────────────────────┘                                       │
│            ↓ this.left = null                                   │
│   Hidden Class C2                                               │
│   ┌─────────────────────┐                                       │
│   │ key: offset 0        │                                      │
│   │ left: offset 1       │                                      │
│   └─────────────────────┘                                       │
│            ↓ this.right = null                                  │
│   Hidden Class C3 (final)                                       │
│   ┌─────────────────────┐                                       │
│   │ key: offset 0        │                                      │
│   │ left: offset 1       │                                      │
│   │ right: offset 2      │                                      │
│   └─────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘

모든 Node 인스턴스는 같은 Hidden Class C3를 공유
→ Inline Cache (IC) 활용 가능 → 빠른 프로퍼티 접근
```

### Inline Caching (IC)

```javascript
// 반복적인 node.key 접근 시:
// 1. 첫 호출: Hidden Class 확인 → offset 조회 → 값 반환
// 2. 이후 호출: IC에 캐시된 offset으로 직접 접근 (매우 빠름)

function accessKey(node) {
  return node.key;  // IC가 offset 0으로 직접 접근
}
```

### Monomorphic vs Polymorphic

```javascript
// ✅ Monomorphic (빠름) - 항상 같은 타입
nodes.forEach(node => node.key);  // 모든 node가 같은 Hidden Class

// ❌ Polymorphic (느림) - 다른 타입 혼재
mixedArray.forEach(item => item.key);  // Node, Object, Array 혼합
```

### JIT Compilation

```
BST.insert() 호출 흐름:
┌───────────────────────────────────────────────────────────────┐
│ 1. Interpreter (Ignition)                                     │
│    - 바이트코드 실행                                           │
│    - 프로파일링 데이터 수집                                     │
│                                                               │
│ 2. 호출 횟수 증가 (Hot Function 감지)                          │
│                                                               │
│ 3. Optimizing Compiler (TurboFan)                             │
│    - 바이트코드 → 최적화된 기계어                               │
│    - Inlining, Dead Code Elimination 등 적용                  │
│                                                               │
│ 4. 타입 변경 감지 시 → Deoptimization                          │
│    - 기계어 폐기 → Interpreter로 회귀                          │
└───────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Optimization Tips for JavaScript

### 1. 프로퍼티 초기화 순서 일관성 유지

```javascript
// ❌ Bad - Hidden Class 불일치
class BadNode {
  constructor(key) {
    if (key > 0) {
      this.key = key;
      this.left = null;
    } else {
      this.left = null;  // 순서 다름!
      this.key = key;
    }
    this.right = null;
  }
}

// ✅ Good - 항상 같은 순서
class GoodNode {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}
```

### 2. undefined 대신 null 사용

```javascript
// V8은 null을 더 잘 최적화함
this.left = null;  // ✅ Preferred
this.left = undefined;  // ❌ Avoid
```

### 3. 배열 기반 구현 (Cache Locality)

```javascript
class ArrayBST {
  constructor(capacity = 1024) {
    this.keys = new Int32Array(capacity);
    this.hasValue = new Uint8Array(capacity);
  }

  getLeftIndex(i) { return 2 * i + 1; }
  getRightIndex(i) { return 2 * i + 2; }
}
```

---

## 실행

```bash
node bst.js
```
