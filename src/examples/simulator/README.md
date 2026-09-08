# Algorithm Simulator - 알고리즘 시각화 에뮬레이터

> 알고리즘의 이산 단계를 표현하는 학습용 도구입니다. animation timing은 실제 runtime 성능이나 memory layout을 재현하지 않습니다.
> 지원 표의 체크는 문서상 entrypoint를 뜻하며 실행 성공을 보장하지 않습니다. runtime 버전과 대표·오류 입력 결과를 기록한 뒤 `검증됨`으로 표시합니다.

---

## 지원 알고리즘

### ✅ Data Structures
| Algorithm | Python | JavaScript | Java |
|-----------|:------:|:----------:|:----:|
| Binary Search Tree (BST) | ✅ | ✅ | ✅ |
| AVL Tree (Self-balancing) | ✅ | - | - |
| Hash Table (Linear Probing) | ✅ | ✅ | ✅ |
| Heap / Priority Queue | ✅ | ✅ | ✅ |
| Linked List (Singly/Doubly) | ✅ | - | - |
| Stack / Queue | ✅ | - | - |

### ✅ Algorithms
| Algorithm | Python | JavaScript | Java |
|-----------|:------:|:----------:|:----:|
| Binary Search | ✅ | - | - |
| Quick Sort | ✅ | ✅ | ✅ |
| Merge Sort | ✅ | ✅ | ✅ |
| Heap Sort | ✅ | ✅ | ✅ |
| BFS (Breadth-First Search) | ✅ | - | - |
| DFS (Depth-First Search) | ✅ | - | - |
| Dijkstra's Algorithm | ✅ | - | - |

---

## 구성 요소

```
/simulator
├── python/                        # Python CLI 시뮬레이터
│   ├── bst_simulator.py           # Binary Search Tree
│   ├── avl_simulator.py           # AVL Tree (Self-balancing)
│   ├── hashtable_simulator.py     # Hash Table (Linear Probing)
│   ├── heap_simulator.py          # Heap / Priority Queue
│   ├── linkedlist_simulator.py    # Linked List
│   ├── stack_queue_simulator.py   # Stack & Queue
│   ├── binary_search_simulator.py # Binary Search
│   ├── sorting_simulator.py       # Quick/Merge/Heap Sort
│   ├── graph_simulator.py         # BFS, DFS, Dijkstra
│   └── memory_visualizer.py       # 공통 메모리 시각화 모듈
│
├── javascript/                    # 웹 기반 시각화 (BST, Hash Table, Sorting, Heap)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── bst.js                 # Binary Search Tree
│       ├── hashtable.js           # Hash Table
│       ├── sorting.js             # Quick/Merge/Heap Sort
│       ├── heap.js                # Heap / Priority Queue
│       ├── visualizer.js          # Tree visualization
│       └── simulator.js           # Main controller
│
├── java/                          # Java CLI 시뮬레이터
│   ├── BSTSimulator.java          # Binary Search Tree
│   ├── HashTableSimulator.java    # Hash Table (Linear Probing)
│   ├── SortingSimulator.java      # Quick/Merge/Heap Sort
│   └── HeapSimulator.java         # Heap / Priority Queue
│
└── shared/
    └── test_cases.json
```

---

## Quick Start

### Python 시뮬레이터

```bash
cd simulator/python

# Binary Search Tree
python bst_simulator.py
python bst_simulator.py --demo

# AVL Tree (자가 균형 트리)
python avl_simulator.py
python avl_simulator.py --demo

# Hash Table
python hashtable_simulator.py
python hashtable_simulator.py --demo

# Heap / Priority Queue
python heap_simulator.py
python heap_simulator.py --demo

# Linked List
python linkedlist_simulator.py
python linkedlist_simulator.py --demo

# Stack / Queue
python stack_queue_simulator.py
python stack_queue_simulator.py --demo

# Binary Search
python binary_search_simulator.py
python binary_search_simulator.py --demo

# Sorting Algorithms (Quick, Merge, Heap Sort)
python sorting_simulator.py
python sorting_simulator.py --demo

# Graph Algorithms (BFS, DFS, Dijkstra)
python graph_simulator.py
python graph_simulator.py --demo
```

### JavaScript 시뮬레이터 (웹 브라우저)
```bash
cd simulator/javascript
python -m http.server 8080
# http://localhost:8080 접속
```

### Java 시뮬레이터
```bash
cd simulator/java

# Compile all
javac *.java

# Run simulators
java BSTSimulator              # Binary Search Tree
java HashTableSimulator        # Hash Table (Linear Probing)
java SortingSimulator          # Quick/Merge/Heap Sort
java HeapSimulator             # Heap / Priority Queue

# Demo mode
java BSTSimulator --demo
java HashTableSimulator --demo
java SortingSimulator --demo
java HeapSimulator --demo
```

---

## 공통 명령어

공통 구현이 제공되는 Python 시뮬레이터에서 사용할 수 있는 명령어입니다. 각 entrypoint의 `help`로 지원 여부를 확인합니다.

| Command | Description |
|---------|-------------|
| `help` | 사용 가능한 명령어 표시 |
| `display` | 현재 상태 시각화 |
| `speed <mode>` | 애니메이션 속도 (instant/fast/normal/slow) |
| `step` | 단계별 실행 모드 토글 |
| `demo` | 데모 모드 실행 |
| `quit` | 종료 |

---

## 시뮬레이터별 상세 명령어

### BST / AVL Tree
```
insert <value>  - 값 삽입
delete <value>  - 값 삭제
search <value>  - 값 탐색
inorder         - 중위 순회
```

### Hash Table
```
insert <value>  - 값 삽입
search <value>  - 값 탐색
delete <value>  - 값 삭제
stats           - 통계 정보 (적재율, 충돌 횟수)
resize [size]   - 테이블 리사이징
```

### Heap / Priority Queue
```
insert <value>  - 값 삽입
extract         - 최대/최소값 추출
peek            - 최상위 값 확인
build <values>  - 배열로 힙 구축
sort            - 힙 정렬 실행
type <max/min>  - 최대/최소 힙 전환
```

### Linked List
```
insertf <data>   - 앞에 삽입
insertb <data>   - 뒤에 삽입
insertat <i> <d> - 특정 위치에 삽입
deletef          - 앞에서 삭제
deleteb          - 뒤에서 삭제
reverse          - 리스트 뒤집기
type <s/d>       - 단일/이중 연결 리스트 전환
```

### Stack / Queue
```
# Stack mode
push <data>     - 스택에 추가
pop             - 스택에서 제거
peek            - 최상위 값 확인

# Queue mode
enqueue <data>  - 큐에 추가
dequeue         - 큐에서 제거
front           - 앞 값 확인
rear            - 뒤 값 확인
```

### Binary Search
```
set <values>      - 배열 설정 (자동 정렬)
search <target>   - 이진 탐색 (반복)
searchr <target>  - 이진 탐색 (재귀)
lower <target>    - Lower bound
upper <target>    - Upper bound
```

### Sorting
```
set <values>    - 배열 설정
random [n] [m]  - 랜덤 배열 생성
quicksort       - 퀵 정렬
mergesort       - 병합 정렬
heapsort        - 힙 정렬
reset           - 원래 배열로 복원
```

### Graph
```
add <u> <v> [w]   - 엣지 추가 (가중치 선택)
remove <u> <v>    - 엣지 제거
sample <type>     - 샘플 그래프 (simple/weighted/tree)
bfs <start>       - BFS 실행
dfs <start>       - DFS 실행
dijkstra <s> [e]  - 다익스트라 (시작점, 도착점 선택)
directed          - 방향/무방향 그래프 전환
```

---

## 기능

### 1. 단계별 실행 (Step-by-Step)
- `step` 명령으로 활성화
- 각 연산 단계마다 Enter 키로 진행
- 현재 상태 시각화

### 2. 메모리 시각화
- Stack/Heap 메모리 레이아웃
- 포인터/참조 관계 표시
- 노드 주소 및 참조 카운트

### 3. 애니메이션
- `speed` 명령으로 속도 조절
- 단계별 상태 변화 관찰

### 4. 데모 모드
- `--demo` 플래그 또는 `demo` 명령
- 자동으로 예제 시나리오 실행

---

## 학습 시나리오 예시

### 1. BST 학습
```bash
python bst_simulator.py
bst> step
bst> insert 5
bst> insert 3
bst> insert 7
bst> search 3
bst> delete 5
```

### 2. 해시 테이블 충돌 관찰
```bash
python hashtable_simulator.py
hash> insert 15
hash> insert 26    # 15 % 11 = 4, 26 % 11 = 4 → 충돌!
hash> insert 37    # 계속 충돌 관찰
hash> stats
```

### 3. AVL 트리 회전 관찰
```bash
python avl_simulator.py
avl> step
avl> insert 10
avl> insert 20
avl> insert 30     # Right-Right case → Left rotation!
```

### 4. 그래프 탐색 비교
```bash
python graph_simulator.py
graph> sample simple
graph> bfs 0       # BFS: 레벨별 탐색
graph> dfs 0       # DFS: 깊이 우선 탐색
```
