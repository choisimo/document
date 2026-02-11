# Algorithm Repository - Senior Tech Lead Code Review Report

> **Reviewer:** Senior Tech Lead & QA 총괄 책임자  
> **Date:** 2026-01-11  
> **Project:** Algorithm Learning Repository  
> **Status:** Initial Prototype → Production Level 격상 필요

---

## Executive Summary

이 프로젝트는 **알고리즘 학습 리포지토리**로, 현재 초기 프로토타입 단계입니다. 웹 애플리케이션이 아닌 순수 알고리즘 코드 모음이므로, 원래 요청된 프론트엔드-백엔드 연동 검증은 해당되지 않습니다. 대신, **알고리즘 학습 자료로서의 품질 향상**에 초점을 맞춘 리뷰를 진행합니다.

### Key Findings

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 Critical | `saki.c` Command Injection 취약점 | 보안 위험 |
| 🔴 High | 의미없는 디렉토리 구조 (`p1`, `p2`, `p3`) | 유지보수성 저하 |
| 🟡 Medium | 컴파일 아티팩트가 소스와 혼재 | 불필요한 Git 추적 |
| 🟡 Medium | 일관성 없는 I/O 패턴 | 학습 자료 품질 저하 |
| 🟢 Low | README 미비 | 프로젝트 이해도 저하 |

---

## Action Item 1: Architecture & Clean Code Review

### 1.1 Directory Structure Refactoring

#### Before (현재 구조 - 문제점)
```
/Algorithm
├── C-lang/
│   └── linux/
│       └── Mutsumi/           ❌ 의미불명의 폴더명
│           ├── saki.c         ❌ 알고리즘과 무관한 네이밍
│           └── Mutsumi.h
├── LeetCode/
│   └── .lcpr_data/            ✅ 플러그인 데이터 (OK)
├── code/
│   ├── p1/                    ❌ p1, p2, p3 → 무슨 알고리즘인지 알 수 없음
│   │   ├── Main.java
│   │   ├── Main.class         ❌ 컴파일 아티팩트가 Git에 포함
│   │   └── Main$Node.class
│   ├── p2/
│   └── p3/
├── .gitignore                 ⚠️ .class 파일 제외 규칙 누락
└── README.md                  ❌ 내용 거의 없음
```

#### After (제안 구조 - Feature-based Architecture)
```
/Algorithm
├── data-structures/
│   ├── tree/
│   │   ├── binary-search-tree/
│   │   │   ├── README.md                    # 알고리즘 설명
│   │   │   ├── 01_python/
│   │   │   │   ├── bst.py
│   │   │   │   └── README.md                # Python 특화 설명
│   │   │   ├── 02_javascript/
│   │   │   │   ├── bst.js
│   │   │   │   └── README.md
│   │   │   ├── 03_java/
│   │   │   │   ├── BinarySearchTree.java
│   │   │   │   └── README.md
│   │   │   └── 04_rust/
│   │   │       ├── src/
│   │   │       │   └── lib.rs
│   │   │       └── README.md
│   │   └── avl-tree/
│   │       └── ...
│   └── hash-table/
│       ├── linear-probing/
│       │   ├── README.md
│       │   ├── 01_python/
│       │   ├── 02_javascript/
│       │   ├── 03_java/
│       │   └── 04_rust/
│       └── chaining/
├── algorithms/
│   ├── sorting/
│   │   ├── quick-sort/
│   │   ├── merge-sort/
│   │   └── heap-sort/
│   ├── searching/
│   │   ├── binary-search/
│   │   └── dfs-bfs/
│   └── graph/
│       ├── dijkstra/
│       └── bellman-ford/
├── competitive-programming/
│   └── leetcode/
│       └── .lcpr_data/
├── system-programming/                      # C/Linux 관련 (분리)
│   └── process-management/
│       └── fork-exec-demo/
│           ├── README.md
│           ├── fork_demo.c                  # 보안 수정된 버전
│           └── Makefile
├── docs/
│   ├── CONTRIBUTING.md
│   └── STYLE_GUIDE.md
├── .gitignore                               # 업데이트 필요
├── LICENSE
└── README.md                                # 프로젝트 개요
```

### 1.2 Naming Convention Issues

#### 변수/함수명 개선

| File | Before | After | Reason |
|------|--------|-------|--------|
| p1/Main.java | `cnt` | `insertionCallCount` | 의미 명확화 |
| p1/Main.java | `x` | `keyToInsert` | 파라미터 의도 명확화 |
| p2/Main.java | `t` | `currentNode` | 약어 → 명시적 이름 |
| p2/Main.java | `sb` | `traversalResult` | StringBuilder 용도 명확화 |
| p3/Main.java | `idx` | `hashIndex` | 해시 컨텍스트 명확화 |
| saki.c | `TogawaSakiko` | (삭제) | 무의미한 매크로 제거 |

#### 엔드포인트/파일명 통일

```
// Before: 일관성 없음
p1/Main.java
p2/Main.java
code/p3/Main.java

// After: 알고리즘 명칭 기반
binary-search-tree/BinarySearchTree.java
hash-table/LinearProbingHashTable.java
```

---

## Action Item 2: End-to-End Data Flow Simulation

> **Note:** 이 프로젝트는 웹 애플리케이션이 아닌 알고리즘 학습 코드이므로, 프론트엔드-백엔드 연동 대신 **알고리즘 실행 흐름 시뮬레이션**을 제공합니다.

### [Scenario 1: BST 삽입 및 호출 횟수 카운트 - p1/Main.java]

#### 1. User Input
```
5
3 1 4 1 5
```

#### 2. Data Flow Simulation
```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Scanner로 n=5 읽기                                       │
│ ► Stack: main() frame { n=5, treeRoot=null, cnt=0 }             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: insert(null, 3) 호출                                     │
│ ► Stack: insert() frame { tree=null, x=3 }                      │
│ ► cnt++ → cnt=1                                                 │
│ ► tree==null → new Node(3) 생성                                 │
│ ► Heap: Node@0x001 { key=3, left=null, right=null }             │
│ ► Return: Node@0x001                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: insert(Node@0x001, 1) 호출                               │
│ ► cnt++ → cnt=2                                                 │
│ ► 1 < 3 → 왼쪽으로                                               │
│ ► insert(null, 1) 재귀 호출                                      │
│   ├── cnt++ → cnt=3                                             │
│   ├── new Node(1) → Node@0x002                                  │
│   └── return Node@0x002                                         │
│ ► Node@0x001.left = Node@0x002                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ... (동일 패턴으로 4, 1, 5 삽입) ...
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FINAL STATE:                                                    │
│                                                                 │
│ Heap Memory:                    Tree Structure:                 │
│ ┌────────────────┐                    [3]                       │
│ │ Node@0x001     │                   /   \                      │
│ │ key=3          │                 [1]   [4]                    │
│ │ left=@0x002    │                   \     \                    │
│ │ right=@0x003   │                   [1]   [5]                  │
│ └────────────────┘              (duplicate)                     │
│                                                                 │
│ cnt = 9 (총 호출 횟수)                                           │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. 취약점 분석

| Line | Issue | Severity | Description |
|------|-------|----------|-------------|
| 28-29 | **중복 키 처리 버그** | 🔴 High | `x >= tree.key`일 때 오른쪽에 삽입 → 중복 허용됨 (BST 일반 규칙 위반) |
| 46 | **Integer Overflow 가능성** | 🟡 Medium | n이 매우 크면 `nextInt()` 예외 미처리 |
| 34-35 | **Scanner 리소스 미해제** | 🟢 Low | `sc.close()` 누락 (main 종료 시 자동 해제되긴 함) |

#### 4. 수정 제안

```java
// Before (Line 28-29)
if (x < tree.key) { tree.left = insert(tree.left, x); }
else { tree.right = insert(tree.right, x); }  // 중복 포함 삽입

// After (중복 무시 버전)
if (x < tree.key) {
    tree.left = insert(tree.left, x);
} else if (x > tree.key) {
    tree.right = insert(tree.right, x);
}
// x == tree.key인 경우 아무것도 안 함 (중복 무시)
return tree;
```

---

### [Scenario 2: 해시 테이블 Linear Probing - p3/Main.java]

#### 1. User Input
```
5
10 22 31 4 15
```

#### 2. Data Flow Simulation
```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: 테이블 크기 계산                                          │
│ ► n=5 → 2*n=10 → nextPrime(10) = 11                             │
│ ► table = new Integer[11] (모두 null)                           │
│ ► collisions = 0                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: value=10 삽입                                           │
│ ► idx = 10 % 11 = 10                                            │
│ ► table[10] == null → 삽입                                      │
│ ► table: [_, _, _, _, _, _, _, _, _, _, 10]                     │
│ ► collisions = 0                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: value=22 삽입                                           │
│ ► idx = 22 % 11 = 0                                             │
│ ► table[0] == null → 삽입                                       │
│ ► table: [22, _, _, _, _, _, _, _, _, _, 10]                    │
│ ► collisions = 0                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: value=31 삽입                                           │
│ ► idx = 31 % 11 = 9                                             │
│ ► table[9] == null → 삽입                                       │
│ ► table: [22, _, _, _, _, _, _, _, _, 31, 10]                   │
│ ► collisions = 0                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: value=4 삽입                                            │
│ ► idx = 4 % 11 = 4                                              │
│ ► table[4] == null → 삽입                                       │
│ ► table: [22, _, _, _, 4, _, _, _, _, 31, 10]                   │
│ ► collisions = 0                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: value=15 삽입                                           │
│ ► idx = 15 % 11 = 4                                             │
│ ► table[4] != null → collision!                                 │
│ ► collisions++ → collisions=1                                   │
│ ► idx = (4+1) % 11 = 5                                          │
│ ► table[5] == null → 삽입                                       │
│ ► table: [22, _, _, _, 4, 15, _, _, _, 31, 10]                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUT: 1                                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. 취약점 분석

| Line | Issue | Severity | Description |
|------|-------|----------|-------------|
| 39-42 | **무한 루프 가능성** | 🔴 High | 테이블이 가득 차면 while 무한 루프 |
| 32 | **불필요한 long 타입** | 🟢 Low | `0l` → `0L` 또는 `0` (스타일) |
| 36-37 | **음수 처리 비효율** | 🟡 Medium | Java에서 `%`는 음수 유지, Math.floorMod() 권장 |

#### 4. 수정 제안

```java
// Before (Line 39-42) - 무한 루프 가능
while (table[idx] != null) {
    collisions++;
    idx = (idx + 1) % tableSize;
}

// After - 안전한 버전
int attempts = 0;
while (table[idx] != null && attempts < tableSize) {
    collisions++;
    idx = (idx + 1) % tableSize;
    attempts++;
}
if (attempts >= tableSize) {
    throw new IllegalStateException("Hash table is full");
}
table[idx] = value;
```

---

### [Scenario 3: CRITICAL - saki.c Command Injection]

#### Security Analysis

```c
// saki.c:11 - CRITICAL VULNERABILITY
char *cmd[] = {"/bin/bash", "-c", (char*)action, NULL};
execvp(cmd[0], cmd);
```

#### Attack Vector
```
$ ./saki
Enter name: test
Enter action: rm -rf /  # 악의적 입력 → 시스템 전체 삭제 가능!
```

#### Data Flow (악성 입력 시나리오)
```
┌─────────────────────────────────────────────────────────────────┐
│ User Input:                                                     │
│ name = "attacker"                                               │
│ action = "; cat /etc/passwd; rm -rf ~/*"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ fork() → Child Process (pid=0)                                  │
│ ► move("attacker", "; cat /etc/passwd; rm -rf ~/*")             │
│ ► execvp("/bin/bash", ["-c", "; cat /etc/passwd; rm -rf ~/*"])  │
│ ► 💥 시스템 명령어 실행됨!                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Remediation (필수)

```c
// BEFORE (취약한 코드)
void move(const char *name, void* action){
    char *cmd[] = {"/bin/bash", "-c", (char*)action, NULL};
    execvp(cmd[0], cmd);
}

// AFTER (안전한 버전) - 학습용이므로 명령어 실행 제거
#include <string.h>

// Whitelist 기반 검증
static const char* ALLOWED_ACTIONS[] = {"thinking...", "walking", "running"};

int is_allowed_action(const char* action) {
    for (int i = 0; i < sizeof(ALLOWED_ACTIONS)/sizeof(ALLOWED_ACTIONS[0]); i++) {
        if (strcmp(action, ALLOWED_ACTIONS[i]) == 0) {
            return 1;
        }
    }
    return 0;
}

void move(const char *name, const char* action) {
    if (name == NULL || action == NULL) {
        fprintf(stderr, "Error: name and action must not be null\n");
        return;
    }
    
    if (!is_allowed_action(action)) {
        fprintf(stderr, "Error: Action '%s' is not allowed\n", action);
        return;
    }
    
    printf("Process [%d]: %s is %s\n", getpid(), name, action);
    // 실제 명령어 실행은 학습 목적에 맞지 않으므로 제거
}
```

---

## Action Item 3: UX/UI & "Agentic Feel" Removal

> **Note:** 이 프로젝트는 CLI 기반 알고리즘 코드이므로, 웹 UI가 아닌 **CLI UX 개선** 관점에서 제안합니다.

### 3.1 현재 문제점

1. **사용자 피드백 부재**: 입력 형식이 틀려도 무응답 또는 크래시
2. **진행 상황 표시 없음**: 대량 데이터 처리 시 무반응
3. **에러 메시지 불친절**: 예외 발생 시 스택 트레이스만 출력

### 3.2 개선 예시

```java
// BEFORE - p1/Main.java (기계적)
public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt();  // 잘못된 입력 시 크래시
    // ...
}

// AFTER - 사용자 친화적
public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    
    System.out.println("=== Binary Search Tree Insertion Counter ===");
    System.out.print("Enter number of elements (n): ");
    
    int n;
    try {
        n = sc.nextInt();
        if (n <= 0) {
            System.out.println("ℹ️  Empty tree. Insertion count: 0");
            return;
        }
    } catch (InputMismatchException e) {
        System.err.println("❌ Error: Please enter a valid integer.");
        return;
    }
    
    System.out.printf("Enter %d integers separated by space: ", n);
    // ...
    
    System.out.printf("%n✅ Total insertion calls: %d%n", cnt);
}
```

---

## Mock/Dummy Data & Hardcoding Analysis

### 검색 결과
- `mock`, `dummy`, `temp`, `faker` 키워드: **발견되지 않음** ✅
- 하드코딩된 테스트 데이터: **없음** (표준 입력 사용) ✅

### 발견된 "하드코딩 유사 항목"

| File | Line | Code | Status |
|------|------|------|--------|
| saki.c | 39 | `"thinking..."` | ⚠️ 매직 스트링 - 상수화 권장 |
| saki.c | 5 | `#define TogawaSakiko saki` | ❌ 의미없는 매크로 - 제거 권장 |

---

## Final Recommendations

### Immediate Actions (즉시 수행)

1. **🔴 CRITICAL**: `saki.c`의 Command Injection 취약점 수정 또는 파일 삭제
2. **🔴 HIGH**: `.gitignore`에 `*.class` 추가
3. **🟡 MEDIUM**: 디렉토리 구조 재설계 (위 제안 구조 참고)

### Short-term Actions (1-2주)

4. README.md 보강 (프로젝트 개요, 실행 방법, 기여 가이드)
5. 각 알고리즘별 README.md 작성 (시간 복잡도, 공간 복잡도, 사용 사례)
6. Java 코드 I/O 패턴 통일 (BufferedReader 기반)

### Long-term Actions (1개월+)

7. 다국어 버전 추가 (Python, JavaScript, Rust)
8. 단위 테스트 추가
9. CI/CD 파이프라인 구축 (코드 컴파일 검증)

---

## Appendix: .gitignore 업데이트 제안

```gitignore
# Existing rules...

# Java
*.class
*.jar
*.war
*.ear
.idea/
*.iml

# Python
__pycache__/
*.py[cod]
.venv/
venv/

# Rust
target/
Cargo.lock

# Node.js
node_modules/

# IDE
.vscode/
*.swp
*.swo
```

---

*Report generated by Senior Tech Lead Code Review System*
