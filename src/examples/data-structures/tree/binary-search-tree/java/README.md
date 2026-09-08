# BST - Java Implementation

> Runtime scope: object layout, compressed references, GC timing, JIT compilation, and I/O performance depend on JDK distribution/version, VM flags, heap, architecture, and workload. Diagrams and byte counts are one possible model, not Java guarantees.

> **Focus:** JVM 메모리 모델, GC 생애 주기, Young/Old Generation

---

## Phase 1: The Blueprint

```java
public class BinarySearchTree<T extends Comparable<T>> {
    
    private static class Node<T> {
        T key;
        Node<T> left;
        Node<T> right;
        
        Node(T key) {
            this.key = key;
        }
    }
    
    private Node<T> root;
    private int size;
    
    public void insert(T key) {
        root = insertRecursive(root, key);
        size++;
    }
    
    private Node<T> insertRecursive(Node<T> node, T key) {
        if (node == null) {
            return new Node<>(key);
        }
        
        int cmp = key.compareTo(node.key);
        if (cmp < 0) {
            node.left = insertRecursive(node.left, key);
        } else if (cmp > 0) {
            node.right = insertRecursive(node.right, key);
        }
        
        return node;
    }
    
    public boolean search(T key) {
        return searchRecursive(root, key);
    }
    
    private boolean searchRecursive(Node<T> node, T key) {
        if (node == null) return false;
        
        int cmp = key.compareTo(node.key);
        if (cmp == 0) return true;
        if (cmp < 0) return searchRecursive(node.left, key);
        return searchRecursive(node.right, key);
    }
    
    // ... delete, traversals 생략 (구현은 Main.java 참고)
}
```

---

## Phase 2: Under the Hood - JVM Memory Model

### Heap 구조와 GC

```
JVM Heap Memory Layout
┌─────────────────────────────────────────────────────────────────┐
│                         Heap                                    │
├─────────────────────────────────────────────────────────────────┤
│  Young Generation (Minor GC)                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Eden Space                │  Survivor S0  │  Survivor S1 │  │
│  │  ┌─────────────────────┐   │  ┌─────────┐  │  ┌─────────┐ │  │
│  │  │ new Node(5) ────────┼───┼──► (aging) │  │  │ (empty) │ │  │
│  │  │ new Node(3)         │   │  └─────────┘  │  └─────────┘ │  │
│  │  │ new Node(7)         │   │               │               │  │
│  │  └─────────────────────┘   │               │               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Old Generation (Major GC / Full GC)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  장수 객체들 (age threshold 초과)                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Node(root) - 오래 살아남은 루트 노드                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Node 객체의 GC 생애 주기

```
BST에서 Node 삭제 시 GC 흐름:

1. delete(3) 호출
   ┌────────────────────────────────────────────────────────────┐
   │ Before:         [5]                                        │
   │                 / \                                        │
   │        Node@A [3] [7] Node@C                               │
   │               /                                            │
   │       Node@B [1]                                           │
   └────────────────────────────────────────────────────────────┘

2. 참조 끊김: node.left = node.left.left (bypass)
   ┌────────────────────────────────────────────────────────────┐
   │ After:          [5]                                        │
   │                 / \                                        │
   │        Node@B [1] [7]                                      │
   │                                                            │
   │        Node@A [3] ← 더 이상 참조 없음!                      │
   └────────────────────────────────────────────────────────────┘

3. Minor GC 발생 시:
   - Node@A는 GC Root에서 도달 불가 → Unreachable
   - Eden/Survivor에서 제거됨

4. 만약 Node@A가 Old Gen에 있었다면:
   - Major GC 때까지 살아있다가 제거
   - System.gc() 호출해도 즉시 제거 보장 안됨
```

### Object Header Overhead

The estimate below assumes a 64-bit HotSpot-style JVM with compressed class and ordinary object pointers. Confirm the layout under the same runtime flags before capacity planning.

```
Java Object Memory Layout (64-bit JVM, Compressed OOPs)

┌─────────────────────────────────────────────────────────────────┐
│ Node<Integer> 객체                                              │
├─────────────────────────────────────────────────────────────────┤
│ Mark Word        │ 8 bytes │ GC age, lock state, identity hash │
│ Class Pointer    │ 4 bytes │ Node.class 참조 (compressed)       │
│ key (reference)  │ 4 bytes │ Integer 객체 참조                  │
│ left (reference) │ 4 bytes │ Node 참조                          │
│ right (reference)│ 4 bytes │ Node 참조                          │
│ Padding          │ 0 bytes │ 8의 배수로 정렬                    │
├─────────────────────────────────────────────────────────────────┤
│ Total            │ 24 bytes│                                    │
└─────────────────────────────────────────────────────────────────┘

+ Integer(key) 자체도 16 bytes (header 12 + int 4)
= 이 가정에서 Node와 별도 Integer를 합친 단순 추정: 약 40 bytes

비교: C의 struct node { int key; node* left; node* right; }
= 24 bytes (64-bit) - Java보다 40% 적음
```

### Generic Type Erasure

```java
// 컴파일 타임
BinarySearchTree<Integer> bst = new BinarySearchTree<>();
bst.insert(5);

// 런타임 (Type Erasure 후)
BinarySearchTree bst = new BinarySearchTree();
bst.insert(Integer.valueOf(5));  // Autoboxing

// 타입 정보는 사라지지만 compareTo()는 정상 작동
// 왜? Integer는 Comparable<Integer> 구현
```

---

## Phase 3: Optimization Tips for Java

### 1. Primitive vs Wrapper

```java
// ❌ 메모리 비효율 - Integer 객체 생성
BinarySearchTree<Integer> bst = new BinarySearchTree<>();

// ✅ 메모리 효율 - primitive 전용 구현
public class IntBinarySearchTree {
    private static class Node {
        int key;  // primitive - no boxing
        Node left, right;
    }
}
```

### 2. 반복문 버전 (Stack Overflow 방지)

```java
public void insertIterative(T key) {
    Node<T> newNode = new Node<>(key);
    if (root == null) {
        root = newNode;
        return;
    }
    
    Node<T> current = root;
    while (true) {
        int cmp = key.compareTo(current.key);
        if (cmp < 0) {
            if (current.left == null) {
                current.left = newNode;
                return;
            }
            current = current.left;
        } else if (cmp > 0) {
            if (current.right == null) {
                current.right = newNode;
                return;
            }
            current = current.right;
        } else {
            return;  // 중복 무시
        }
    }
}
```

### 3. 빠른 I/O (경쟁 프로그래밍)

```java
// 큰 token 입력에서 상대적으로 느릴 수 있음; benchmark로 선택
Scanner sc = new Scanner(System.in);

// parsing과 buffer 처리를 직접 제어하는 대안
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
StringTokenizer st = new StringTokenizer(br.readLine());
int n = Integer.parseInt(st.nextToken());
```

---

## 실행

```bash
javac BinarySearchTree.java
java BinarySearchTree
```
