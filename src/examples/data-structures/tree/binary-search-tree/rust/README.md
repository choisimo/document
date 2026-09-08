# BST - Rust Implementation

> **Focus:** Ownership, Borrowing, Zero-cost Abstraction, Memory Safety without GC
> Target scope: sizes and emitted assembly depend on architecture, compiler, flags, generic types, and surrounding code. Safe Rust prevents defined memory bugs; it does not prove algorithm correctness, absence of leaks, or thread safety for every design.

---

## Phase 1: The Blueprint

Rust에서 BST를 구현할 때는 **Ownership** 규칙 때문에 다른 언어와 다른 접근이 필요합니다.

### 핵심 도전 과제

1. **트리 노드의 소유권**: 누가 자식 노드를 소유하는가?
2. **재귀적 자료구조**: `Box<T>` 또는 `Option<Box<T>>` 필요
3. **가변 참조 규칙**: 동시에 여러 가변 참조 불가

### 해결책: `Option<Box<Node<T>>>`

```rust
struct Node<T> {
    key: T,
    left: Option<Box<Node<T>>>,   // 자식을 소유 (owned)
    right: Option<Box<Node<T>>>,
}
```

---

## Phase 2: Under the Hood - Ownership & Borrowing

### 메모리 레이아웃

```
Stack vs Heap in Rust BST

Stack Frame (main)             Heap Memory
┌─────────────────────┐        ┌─────────────────────────────┐
│ bst: BinarySearchTree│        │                             │
│   root ─────────────────────►│ Box<Node<5>>                │
│                     │        │ ┌───────────────────────┐   │
│                     │        │ │ key: 5                │   │
│                     │        │ │ left ─────────────────┼───┼──► Box<Node<3>>
│                     │        │ │ right ────────────────┼───┼──► Box<Node<7>>
│                     │        │ └───────────────────────┘   │
└─────────────────────┘        └─────────────────────────────┘

Box<T>: 힙에 할당된 데이터에 대한 단일 소유권 포인터
- 크기: 8 bytes (64-bit 포인터)
- 소유권 전이 시 원본 무효화
- Drop 시 자동으로 힙 메모리 해제
```

### Ownership 흐름: Insert 연산

```rust
fn insert(&mut self, key: T) {
    self.root = Self::insert_recursive(self.root.take(), key);
    //                                           ^^^^
    // take(): Option에서 값을 꺼내고 None으로 대체
    // 소유권 이동 발생!
}

fn insert_recursive(node: Option<Box<Node<T>>>, key: T) -> Option<Box<Node<T>>> {
    match node {
        None => Some(Box::new(Node::new(key))),  // 새 노드 생성
        Some(mut n) => {
            if key < n.key {
                n.left = Self::insert_recursive(n.left.take(), key);
            } else if key > n.key {
                n.right = Self::insert_recursive(n.right.take(), key);
            }
            Some(n)  // 소유권 반환
        }
    }
}
```

### Borrowing 흐름: Search 연산

```rust
fn search(&self, key: &T) -> bool {
    //     ^^^^^ 불변 참조 - 구조 변경 안 함
    Self::search_recursive(&self.root, key)
    //                     ^ 불변 참조만 전달
}

fn search_recursive(node: &Option<Box<Node<T>>>, key: &T) -> bool {
    match node {
        None => false,
        Some(n) => {
            if key == &n.key { true }
            else if key < &n.key { Self::search_recursive(&n.left, key) }
            else { Self::search_recursive(&n.right, key) }
        }
    }
}
```

### Delete: 가장 복잡한 케이스

```rust
// Case 3: 두 자식이 있는 노드 삭제
// Rust에서는 소유권 때문에 까다로움

// 일반적인 전략:
// 1. in-order successor의 key를 복사
// 2. successor를 삭제
// 하지만 Rust에서 "복사"는 T: Clone 필요

fn delete_recursive(node: Option<Box<Node<T>>>, key: &T) -> Option<Box<Node<T>>>
where
    T: Clone,  // 복사를 위해 필요
{
    // ...
    Some(mut n) if key == &n.key => {
        match (n.left.take(), n.right.take()) {
            (None, None) => None,                    // Case 1: Leaf
            (Some(left), None) => Some(left),        // Case 2a
            (None, Some(right)) => Some(right),      // Case 2b
            (Some(left), Some(right)) => {           // Case 3
                let min_key = Self::find_min(&right).clone();  // Clone!
                n.key = min_key.clone();
                n.left = Some(left);
                n.right = Self::delete_recursive(Some(right), &min_key);
                Some(n)
            }
        }
    }
}
```

---

## Phase 3: Zero-cost Abstraction

### 컴파일 후 어셈블리 비교

아래 assembly는 설명용 스케치입니다. C와의 동등성을 주장하려면 동일 ABI·최적화 옵션의 실제 assembly와 benchmark를 보존합니다.

```rust
// Rust 코드
if key < node.key {
    node.left = insert(node.left.take(), key);
}

// 컴파일된 어셈블리 (최적화 후)
// 설명용 예시이며 실제 출력은 rustc/target/flags에 따라 달라짐
cmp     rdi, [rsi]
jge     .else_branch
mov     rax, [rsi+8]    ; node.left 로드
call    insert
mov     [rsi+8], rax    ; 결과 저장
```

### Option<Box<T>>의 Null Pointer Optimization

```
Option<Box<Node<T>>> 메모리 레이아웃:

일반적인 예상:
┌────────────────┐
│ discriminant   │ 1 byte (Some/None 구분)
├────────────────┤
│ Box<Node<T>>   │ 8 bytes
└────────────────┘
= 9 bytes + padding = 16 bytes

실제 (NPO 적용):
┌────────────────┐
│ Box<Node<T>>   │ 8 bytes
│ (null = None)  │
└────────────────┘
= 8 bytes

Box는 절대 null이 될 수 없으므로,
Option<Box<T>>는 null 포인터로 None을 표현!
→ 추가 메모리 없이 Option 구현
```

---

## Phase 4: Unsafe Alternative (Advanced)

```rust
// raw pointer가 필요하다는 profile과 safety invariant를 먼저 문서화해야 함
// unsafe 자체는 성능 개선을 보장하지 않으며 별도 검토와 Miri/테스트가 필요

struct UnsafeNode<T> {
    key: T,
    left: *mut UnsafeNode<T>,   // raw pointer
    right: *mut UnsafeNode<T>,
}

impl<T> UnsafeNode<T> {
    unsafe fn insert(&mut self, key: T) where T: Ord {
        // Manual memory management
        // 실수하면 memory leak, dangling pointer 발생
    }
}
```

---

## 실행

```bash
cd src/examples/data-structures/tree/binary-search-tree/rust
cargo run
```

## 테스트

```bash
cargo test
```
