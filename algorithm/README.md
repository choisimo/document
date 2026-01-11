# Algorithm Study Repository

> 알고리즘과 자료구조를 **First Principles** 관점에서 학습하는 리포지토리입니다.  
> 단순한 코드 암기가 아닌, 시스템 내부의 작동 원리를 이해하는 것을 목표로 합니다.

---

## Repository Structure

```
/Algorithm
├── data-structures/           # 자료구조
│   └── tree/
│       └── binary-search-tree/
│           ├── README.md      # 알고리즘 개념 및 시각화
│           ├── 01_python/     # Python 구현 (Reference Counting)
│           ├── 02_javascript/ # JavaScript 구현 (V8 최적화)
│           ├── 03_java/       # Java 구현 (JVM/GC)
│           └── 04_rust/       # Rust 구현 (Ownership)
├── simulator/                 # 🎮 인터랙티브 시뮬레이터
│   ├── python/               # CLI 시뮬레이터 (터미널)
│   ├── javascript/           # 웹 시뮬레이터 (브라우저)
│   └── java/                 # CLI 시뮬레이터 (터미널)
├── algorithms/                # 알고리즘 (예정)
│   ├── sorting/
│   ├── searching/
│   └── graph/
├── competitive-programming/   # 코딩 테스트
│   └── leetcode/
├── system-programming/        # 시스템 프로그래밍
│   └── C-lang/
├── code/                      # Legacy 코드 (마이그레이션 예정)
└── REVIEW_REPORT.md           # 코드 리뷰 보고서
```

---

## Learning Philosophy

### 1. Visual Simulation
코드가 실행될 때 **메모리(Stack/Heap)**에서 어떻게 데이터가 이동하고 변하는지를 시각적으로 시뮬레이션합니다.

### 2. Language-Specific Deep Dive
같은 알고리즘도 언어마다 다른 특성을 가집니다:
- **Python**: Reference Counting, GIL, 인터프리터 오버헤드
- **JavaScript**: V8 엔진, Hidden Class, JIT 컴파일
- **Java**: JVM 메모리 모델, GC 생애 주기
- **Rust**: Ownership, Borrowing, Zero-cost Abstraction

### 3. Incremental Optimization
1. **Naive**: 가장 직관적인 구현
2. **Refined**: 자료구조/알고리즘 개선
3. **System-Level**: 캐시, 분기 예측 등 하드웨어 수준 최적화

---

## Quick Start

### Python
```bash
cd data-structures/tree/binary-search-tree/01_python
python bst.py
```

### JavaScript
```bash
cd data-structures/tree/binary-search-tree/02_javascript
node bst.js
```

### Java
```bash
cd data-structures/tree/binary-search-tree/03_java
javac BinarySearchTree.java
java BinarySearchTree
```

### Rust
```bash
cd data-structures/tree/binary-search-tree/04_rust
cargo run
```

---

## 🎮 Interactive Simulator

알고리즘의 실행 과정을 **실시간으로 시뮬레이션**하며 학습할 수 있는 인터랙티브 도구입니다.

### 지원 시뮬레이터

| Category | Algorithm | Python | Web | Java |
|----------|-----------|:------:|:---:|:----:|
| **Tree** | Binary Search Tree | ✅ | ✅ | ✅ |
| | AVL Tree | ✅ | - | - |
| **Hash** | Hash Table (Linear Probing) | ✅ | ✅ | ✅ |
| **Heap** | Heap / Priority Queue | ✅ | ✅ | ✅ |
| **Linear** | Linked List | ✅ | - | - |
| | Stack / Queue | ✅ | - | - |
| **Search** | Binary Search | ✅ | - | - |
| **Sort** | Quick / Merge / Heap Sort | ✅ | ✅ | ✅ |
| **Graph** | BFS, DFS, Dijkstra | ✅ | - | - |

### Python Simulator (터미널)
```bash
cd simulator/python

# 자료구조
python bst_simulator.py           # Binary Search Tree
python avl_simulator.py           # AVL Tree (Self-balancing)
python hashtable_simulator.py     # Hash Table
python heap_simulator.py          # Heap / Priority Queue
python linkedlist_simulator.py    # Linked List
python stack_queue_simulator.py   # Stack & Queue

# 알고리즘
python binary_search_simulator.py # Binary Search
python sorting_simulator.py       # Quick/Merge/Heap Sort
python graph_simulator.py         # BFS, DFS, Dijkstra

# 데모 모드
python <simulator>.py --demo
```

### JavaScript Simulator (웹 브라우저)
```bash
cd simulator/javascript
python -m http.server 8080   # 로컬 서버 실행
# 브라우저에서 http://localhost:8080 접속
```

### Java Simulator (터미널)
```bash
cd simulator/java
javac *.java                   # 전체 컴파일
java BSTSimulator              # Binary Search Tree
java HashTableSimulator        # Hash Table
java SortingSimulator          # Quick/Merge/Heap Sort
java HeapSimulator             # Heap / Priority Queue
```

자세한 내용은 [simulator/README.md](simulator/README.md) 참조

---

## Currently Available

### Data Structures
- [x] Binary Search Tree (BST) - 4개 언어 구현
- [x] AVL Tree - Python 시뮬레이터
- [x] Hash Table (Linear Probing) - Python 시뮬레이터
- [x] Heap / Priority Queue - Python 시뮬레이터
- [x] Linked List (Singly/Doubly) - Python 시뮬레이터
- [x] Stack / Queue - Python 시뮬레이터

### Algorithms
- [x] Binary Search - Python 시뮬레이터
- [x] Quick Sort - Python 시뮬레이터
- [x] Merge Sort - Python 시뮬레이터
- [x] Heap Sort - Python 시뮬레이터
- [x] BFS (Breadth-First Search) - Python 시뮬레이터
- [x] DFS (Depth-First Search) - Python 시뮬레이터
- [x] Dijkstra's Algorithm - Python 시뮬레이터

### Coming Soon
- [ ] Red-Black Tree
- [ ] Trie
- [ ] Segment Tree
- [ ] A* Algorithm

---

## Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/new-algorithm`)
3. Follow the existing directory structure
4. Include README.md with visual explanations
5. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE)
