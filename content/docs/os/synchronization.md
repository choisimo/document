# 제 6장: 동기화 도구 (Synchronization Tools) 🔄

## 📖 목차 (Table of Contents)

1. [개요](#overview)
2. [배경 및 기본 개념](#background)
3. [임계 구역 문제](#critical-section)
4. [피터슨의 해결책](#peterson)
5. [하드웨어 지원](#hardware-support)
6. [뮤텍스 락](#mutex-locks)
7. [세마포어](#semaphores)
8. [모니터](#monitors)
9. [활성 상태와 교착 상태](#liveness-deadlock)
10. [고전적인 동기화 문제](#classic-problems)
11. [핵심 개념 정리](#summary)
12. [연습 문제](#exercises)

---

## 개요 {#overview}

**동기화 도구(Synchronization Tools)**는 다중 프로세스 환경에서 데이터 일관성을 보장하고 프로세스 간의 순서를 제어하는 중요한 메커니즘입니다.

```mermaid
graph TD
    A[동기화 도구] --> B[동기화 문제 식별]
    A --> C[해결책 구현]
    A --> D[성능 최적화]
    
    B --> B1[경합 조건]
    B --> B2[임계 구역]
    B --> B3[데이터 불일치]
    
    C --> C1[소프트웨어 해결책]
    C --> C2[하드웨어 지원]
    C --> C3[고수준 동기화 도구]
    
    C1 --> C11[피터슨 알고리즘]
    C2 --> C21[원자적 명령어]
    C3 --> C31[뮤텍스]
    C3 --> C32[세마포어]
    C3 --> C33[모니터]
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e8
```

### 🎯 학습 목표

이 장을 통해 다음을 이해할 수 있습니다:
- 동시성에서 발생하는 문제점들
- 임계 구역 문제와 해결 요구사항
- 다양한 동기화 도구들의 원리와 활용
- 고전적인 동기화 문제들과 해결책

---

## 배경 및 기본 개념 {#background}

### 💡 동시성과 데이터 일관성

```mermaid
sequenceDiagram
    participant P1 as 프로세스 1
    participant M as 공유 메모리
    participant P2 as 프로세스 2
    
    Note over P1,P2: 공유 데이터: counter = 5
    
    P1->>M: register1 = counter (5)
    P2->>M: register2 = counter (5)
    P1->>P1: register1 = register1 + 1 (6)
    P2->>P2: register2 = register2 - 1 (4)
    P1->>M: counter = register1 (6)
    P2->>M: counter = register2 (4)
    
    Note over P1,P2: 결과: counter = 4 (예상: 5)
```

프로세스들은 **동시에 실행**될 수 있으며, 언제든지 실행이 부분적으로 완료된 상태로 중단될 수 있습니다. 이로 인해 **공유 데이터에 대한 동시 접근**은 데이터 불일치(data inconsistency)를 초래할 수 있습니다.

### 🔍 경합 조건 (Race Condition)

**경합 조건**은 여러 프로세스가 동시에 공유 데이터에 접근할 때, 실행 순서에 따라 결과가 달라지는 상황입니다.

#### 실제 예제: 카운터 증가/감소

```c
// 전역 변수
int counter = 5;

// 프로듀서 프로세스
void producer() {
    register1 = counter;      // T0
    register1 = register1 + 1; // T1
    counter = register1;       // T4
}

// 소비자 프로세스  
void consumer() {
    register2 = counter;       // T2
    register2 = register2 - 1; // T3
    counter = register2;       // T5
}
```

**실행 순서와 결과:**
- T0: 프로듀서 `register1 = counter` (register1 = 5)
- T1: 프로듀서 `register1 = register1 + 1` (register1 = 6)
- T2: 소비자 `register2 = counter` (register2 = 5)
- T3: 소비자 `register2 = register2 - 1` (register2 = 4)
- T4: 프로듀서 `counter = register1` (counter = 6)
- T5: 소비자 `counter = register2` (counter = 4)

**결과:** counter = 4 (예상값: 5)

### 🔐 해결책의 필요성

데이터 일관성을 유지하기 위해서는 **협력하는 프로세스의 순서 있는 실행을 보장하는 메커니즘**이 필요합니다.

---

## 임계 구역 문제 {#critical-section}

### 📝 임계 구역 (Critical Section) 정의

```mermaid
graph LR
    A[진입 구역<br/>Entry Section] --> B[임계 구역<br/>Critical Section]
    B --> C[퇴출 구역<br/>Exit Section]
    C --> D[나머지 구역<br/>Remainder Section]
    D --> A
    
    style B fill:#ffebee
    style A fill:#e8f5e8
    style C fill:#fff3e0
    style D fill:#f3e5f5
```

n개의 프로세스 {P₀, P₁, ..., Pₙ₋₁}로 구성된 시스템에서:

- **임계 구역**: 공통 변수를 변경하거나, 테이블을 업데이트하거나, 파일을 쓰는 등의 작업을 수행하는 코드 세그먼트
- **진입 구역**: 임계 구역에 들어가기 위한 허가를 요청하는 코드
- **퇴출 구역**: 임계 구역을 빠져나온 후 실행되는 코드
- **나머지 구역**: 그 외의 코드

### ⚖️ 임계 구역 해결책의 요구사항

```mermaid
graph TD
    A[임계 구역 해결책] --> B[상호 배제<br/>Mutual Exclusion]
    A --> C[진행<br/>Progress]
    A --> D[유한 대기<br/>Bounded Waiting]
    
    B --> B1["한 프로세스가 임계 구역에<br/>있으면 다른 프로세스는<br/>진입할 수 없다"]
    
    C --> C1["임계 구역에 아무도 없고<br/>진입하려는 프로세스가 있으면<br/>선택 과정이 무한 연기되지 않아야"]
    
    D --> D1["한 프로세스가 임계 구역<br/>진입 요청 후 허가받기까지<br/>다른 프로세스의 진입 횟수에<br/>상한이 있어야"]
    
    style B fill:#ffebee
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

1. **상호 배제 (Mutual Exclusion)**: 프로세스 Pᵢ가 자신의 임계 구역에서 실행 중이면, 다른 어떤 프로세스도 자신의 임계 구역에서 실행될 수 없습니다.

2. **진행 (Progress)**: 임계 구역에서 실행 중인 프로세스가 없고, 자신의 임계 구역에 들어가고자 하는 일부 프로세스가 존재한다면, 다음에 임계 구역에 들어갈 프로세스를 선택하는 과정이 무기한 연기되어서는 안 됩니다.

3. **유한 대기 (Bounded Waiting)**: 프로세스가 임계 구역에 들어가기 위한 요청을 한 후 그 요청이 허가되기까지 다른 프로세스가 자신의 임계 구역에 들어갈 수 있는 횟수에 대한 상한(bound)이 존재해야 합니다.

---

## 피터슨의 해결책 {#peterson}

### 🧠 피터슨 알고리즘 (Peterson's Algorithm)

피터슨의 해결책은 **두 프로세스**를 위한 소프트웨어 기반 해결책입니다.

```mermaid
graph TD
    subgraph "공유 변수"
        A["boolean flag[2]<br/>flag[0] = flag[1] = false"]
        B[int turn<br/>초기값: 0 또는 1]
    end
    
    subgraph "프로세스 i"
        C["flag[i] = true<br/>다른 프로세스에게 준비됨을 알림"]
        D[turn = j<br/>상대방에게 우선권 양보]
        E["while flag[j] && turn == j<br/>상대방이 준비되고 차례이면 대기"]
        F[임계 구역 실행]
        G["flag[i] = false<br/>임계 구역 종료를 알림"]
    end
    
    C --> D --> E --> F --> G
    
    style F fill:#ffebee
    style A fill:#e8f5e8
    style B fill:#e8f5e8
```

#### 구현 코드

```c
// 공유 변수
boolean flag[2] = {false, false};  // 프로세스 준비 상태
int turn = 0;                      // 누구의 차례인지

// 프로세스 i (i = 0 또는 1)
void process_i() {
    while (true) {
        // 진입 구역
        flag[i] = true;           // 나는 준비됨
        turn = j;                 // 상대방에게 우선권
        while (flag[j] && turn == j); // 상대방이 준비되고 차례이면 대기
        
        // 임계 구역
        critical_section();
        
        // 퇴출 구역
        flag[i] = false;          // 임계 구역 종료
        
        // 나머지 구역
        remainder_section();
    }
}
```

### ✅ 피터슨 해결책의 정확성

```mermaid
graph TD
    A[피터슨 알고리즘] --> B[상호 배제 ✓]
    A --> C[진행 ✓]
    A --> D[유한 대기 ✓]
    
    B --> B1["Pi는 flag[j]==false이거나<br/>turn==i인 경우에만 진입"]
    C --> C1["대기 조건을 만족하지 않으면<br/>진입 가능"]
    D --> D1["상대방이 최대 1번만<br/>먼저 진입 가능"]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#e8f5e8
    style D fill:#e8f5e8
```

### ⚠️ 현대 아키텍처에서의 한계

```mermaid
sequenceDiagram
    participant C as 컴파일러/프로세서
    participant T1 as 스레드 1
    participant T2 as 스레드 2
    participant M as 메모리
    
    Note over C: 성능 최적화를 위한 명령어 재배열
    
    T1->>M: flag[0] = true
    T1->>M: turn = 1
    Note over C: 재배열 발생!
    T2->>M: turn = 0 (원래는 flag[1] = true가 먼저)
    T2->>M: flag[1] = true
    
    Note over T1,T2: 둘 다 임계 구역 진입 가능!
```

현대 아키텍처에서는 **명령어 재배열(instruction reordering)**로 인해 피터슨 알고리즘이 제대로 작동하지 않을 수 있습니다.

**예시:**
```c
// 원본 코드
x = 100;
flag = true;

// 재배열된 실행 순서 (가능)
flag = true;
x = 100;
```

---

## 하드웨어 지원 {#hardware-support}

### 🔧 하드웨어 명령어

현대 시스템은 임계 구역 구현을 위한 하드웨어 지원을 제공합니다.

#### Test-and-Set 명령어

```mermaid
graph LR
    A[Test-and-Set 명령어] --> B[현재 값 반환]
    A --> C[새 값으로 설정]
    
    B --> D[원자적으로 실행]
    C --> D
    
    style A fill:#e1f5fe
    style D fill:#ffebee
```

```c
// Test-and-Set 명령어 (하드웨어로 구현)
boolean test_and_set(boolean *target) {
    boolean rv = *target;  // 현재 값을 저장
    *target = true;        // 새 값으로 설정
    return rv;             // 이전 값 반환
}

// 상호 배제 구현
boolean lock = false;  // 공유 변수

void process() {
    while (true) {
        while (test_and_set(&lock)); // 락 획득까지 대기
        
        // 임계 구역
        critical_section();
        
        lock = false;  // 락 해제
        
        // 나머지 구역
        remainder_section();
    }
}
```

#### Compare-and-Swap 명령어

```c
// Compare-and-Swap 명령어
int compare_and_swap(int *value, int expected, int new_value) {
    int temp = *value;
    if (*value == expected)
        *value = new_value;
    return temp;
}
```

### 🔒 원자적 변수 (Atomic Variables)

```c
#include <stdatomic.h>

atomic_int counter = 0;

void increment() {
    atomic_fetch_add(&counter, 1);  // 원자적 증가
}
```

---

## 뮤텍스 락 {#mutex-locks}

### 🔐 뮤텍스 락 개념

**뮤텍스(Mutex, Mutual Exclusion)**는 가장 단순한 동기화 도구입니다.

```mermaid
graph TD
    A[뮤텍스 락] --> B[acquire 함수]
    A --> C[release 함수]
    
    B --> B1["락이 사용 가능하면 획득<br/>사용 불가능하면 대기"]
    C --> C1["락을 해제하여<br/>다른 프로세스가 사용 가능하게"]
    
    subgraph "내부 구현"
        D[boolean available = true]
    end
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e8
```

#### 구현

```c
// 뮤텍스 락 구조체
typedef struct {
    boolean available;
} mutex;

// 락 획득
void acquire(mutex *m) {
    while (!m->available); // 바쁜 대기 (busy waiting)
    m->available = false;
}

// 락 해제
void release(mutex *m) {
    m->available = true;
}

// 사용 예제
mutex m = {true};

void process() {
    while (true) {
        acquire(&m);
        
        // 임계 구역
        critical_section();
        
        release(&m);
        
        // 나머지 구역
        remainder_section();
    }
}
```

### 🔄 스핀락 (Spinlock)

뮤텍스 락은 **바쁜 대기(busy waiting)**를 사용하므로 **스핀락**이라고도 불립니다.

**장점:**
- 컨텍스트 스위치 오버헤드 없음
- 짧은 임계 구역에 적합

**단점:**
- CPU 사이클 낭비
- 우선순위 역전 문제 가능성

---

## 세마포어 {#semaphores}

### 📊 세마포어 개념

**세마포어(Semaphore)**는 정수 변수 S와 두 개의 원자적 연산 `wait()`와 `signal()`로 구성됩니다.

```mermaid
graph TD
    A[세마포어 S] --> B[wait 연산<br/>P 연산]
    A --> C[signal 연산<br/>V 연산]
    
    B --> B1["S 값을 감소<br/>S < 0이면 대기"]
    C --> C1["S 값을 증가<br/>대기 중인 프로세스 깨움"]
    
    subgraph "세마포어 유형"
        D[이진 세마포어<br/>값: 0 또는 1]
        E[카운팅 세마포어<br/>값: 제한 없음]
    end
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e8
```

#### 기본 연산

```c
// wait 연산 (P 연산)
void wait(semaphore *S) {
    S->value--;
    if (S->value < 0) {
        // 프로세스를 대기 큐에 추가
        // 프로세스를 블록 상태로 전환
    }
}

// signal 연산 (V 연산)  
void signal(semaphore *S) {
    S->value++;
    if (S->value <= 0) {
        // 대기 큐에서 프로세스 하나 제거
        // 해당 프로세스를 준비 상태로 전환
    }
}
```

### 🔧 세마포어 사용 예시

#### 1. 임계 구역 문제 해결

```c
semaphore mutex = 1;  // 이진 세마포어

void process() {
    while (true) {
        wait(&mutex);      // 임계 구역 진입
        
        // 임계 구역
        critical_section();
        
        signal(&mutex);    // 임계 구역 퇴출
        
        // 나머지 구역
        remainder_section();
    }
}
```

#### 2. 실행 순서 동기화

```mermaid
sequenceDiagram
    participant P1 as 프로세스 P1
    participant S as 세마포어 synch
    participant P2 as 프로세스 P2
    
    Note over S: synch = 0 (초기값)
    
    P1->>P1: S1 실행
    P1->>S: signal(synch)
    Note over S: synch = 1
    
    P2->>S: wait(synch)
    Note over S: synch = 0
    P2->>P2: S2 실행
    
    Note over P1,P2: S1이 S2보다 먼저 실행됨을 보장
```

```c
semaphore synch = 0;  // 동기화 세마포어

// 프로세스 P1
void process1() {
    S1;              // 먼저 실행되어야 하는 구문
    signal(&synch);  // P2에게 신호 전송
}

// 프로세스 P2  
void process2() {
    wait(&synch);    // P1의 신호 대기
    S2;              // 나중에 실행되어야 하는 구문
}
```

### 🚫 세마포어 문제점

```mermaid
graph TD
    A[세마포어 잘못된 사용] --> B[signal → wait]
    A --> C[wait → wait]
    A --> D[연산 누락]
    
    B --> B1["여러 프로세스가<br/>동시에 임계 구역 진입"]
    C --> C1["프로세스가<br/>영구적으로 블록"]
    D --> D1["예상치 못한<br/>결과 발생"]
    
    style A fill:#ffebee
    style B fill:#ffcdd2
    style C fill:#ffcdd2
    style D fill:#ffcdd2
```

**잘못된 사용 예시:**

1. **signal → wait**: 상호 배제 실패
```c
signal(&mutex);  // 잘못된 순서!
// 임계 구역
wait(&mutex);
```

2. **wait → wait**: 영구 블록
```c
wait(&mutex);
wait(&mutex);  // 두 번째 wait에서 영구 대기
```

3. **연산 누락**: 예측 불가능한 동작

---

## 모니터 {#monitors}

### 🏗️ 모니터 개념

**모니터(Monitor)**는 프로세스 동기화를 위한 고수준 추상화 메커니즘입니다.

```mermaid
graph TD
    A[모니터] --> B[공유 변수]
    A --> C[프로시저들]
    A --> D[조건 변수]
    A --> E[초기화 코드]
    
    B --> B1["내부에서만 접근 가능"]
    C --> C1["상호 배제 자동 보장"]
    D --> D1["wait/signal 연산"]
    E --> E1["모니터 시작 시 실행"]
    
    style A fill:#e1f5fe
    style C fill:#e8f5e8
```

#### 모니터 구조

```c
monitor MonitorName {
    // 공유 변수 선언
    shared_variable_declarations;
    
    // 프로시저 정의
    procedure P1(...) { ... }
    procedure P2(...) { ... }
    ...
    procedure Pn(...) { ... }
    
    // 조건 변수
    condition x, y;
    
    // 초기화 코드
    initialization_code(...) { ... }
}
```

### 🔄 조건 변수 (Condition Variables)

```mermaid
graph LR
    A[조건 변수 x] --> B[x.wait]
    A --> C[x.signal]
    
    B --> B1["호출한 프로세스를<br/>중단하고 대기"]
    C --> C1["대기 중인 프로세스<br/>하나를 재시작"]
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e8
```

#### 조건 변수 연산

```c
// x.wait() 연산
void x_wait() {
    // 현재 프로세스를 조건 변수 x의 대기 큐에 추가
    // 프로세스를 중단하고 모니터 락 해제
    // 다른 프로세스가 x.signal()을 호출할 때까지 대기
}

// x.signal() 연산
void x_signal() {
    // 조건 변수 x의 대기 큐에서 프로세스 하나 제거
    // 해당 프로세스를 재시작
    // 대기 중인 프로세스가 없으면 아무 동작 안 함
}
```

### 🍽️ 예제: 식사하는 철학자 문제 (모니터 해결책)

```c
monitor DiningPhilosophers {
    enum {THINKING, HUNGRY, EATING} state[5];
    condition self[5];
    
    void pickup(int i) {
        state[i] = HUNGRY;
        test(i);
        if (state[i] != EATING)
            self[i].wait();
    }
    
    void putdown(int i) {
        state[i] = THINKING;
        test((i + 4) % 5);  // 왼쪽 이웃 확인
        test((i + 1) % 5);  // 오른쪽 이웃 확인
    }
    
    void test(int i) {
        if ((state[(i + 4) % 5] != EATING) &&
            (state[i] == HUNGRY) &&
            (state[(i + 1) % 5] != EATING)) {
            state[i] = EATING;
            self[i].signal();
        }
    }
    
    initialization_code() {
        for (int i = 0; i < 5; i++)
            state[i] = THINKING;
    }
}
```

---

## 활성 상태와 교착 상태 {#liveness-deadlock}

### 🔄 활성 상태 (Liveness)

**활성 상태**는 시스템이 프로세스의 진행을 보장하기 위해 충족해야 하는 속성 집합입니다.

```mermaid
graph TD
    A[활성 상태 실패] --> B[교착 상태<br/>Deadlock]
    A --> C[굶주림<br/>Starvation]
    A --> D[우선순위 역전<br/>Priority Inversion]
    
    B --> B1["둘 이상의 프로세스가<br/>무기한 상호 대기"]
    C --> C1["프로세스가 무기한<br/>자원을 할당받지 못함"]
    D --> D1["낮은 우선순위가<br/>높은 우선순위를 블록"]
    
    style A fill:#ffebee
    style B fill:#ffcdd2
    style C fill:#fff3e0
    style D fill:#f3e5f5
```

### ⚠️ 교착 상태 예시

```c
semaphore S = 1, Q = 1;

// 프로세스 P0
wait(S);
wait(Q);
// ...
signal(Q);
signal(S);

// 프로세스 P1  
wait(Q);
wait(S);
// ...
signal(S);
signal(Q);
```

**교착 상태 시나리오:**
1. P0가 `wait(S)` 실행 → S = 0
2. P1이 `wait(Q)` 실행 → Q = 0  
3. P0가 `wait(Q)` 실행 → 대기 (Q = 0)
4. P1이 `wait(S)` 실행 → 대기 (S = 0)
5. **교착 상태!** 둘 다 서로를 기다림

---

## 고전적인 동기화 문제 {#classic-problems}

### 🏭 유한 버퍼 문제 (Producer-Consumer Problem)

```mermaid
graph LR
    A[프로듀서] -->|아이템 생산| B[공유 버퍼]
    B -->|아이템 소비| C[소비자]
    
    subgraph "세마포어"
        D[mutex = 1<br/>상호 배제]
        E[full = 0<br/>가득 찬 버퍼 수]
        F[empty = n<br/>빈 버퍼 수]
    end
    
    style B fill:#e1f5fe
    style D fill:#fff3e0
    style E fill:#ffebee
    style F fill:#e8f5e8
```

#### 해결책

```c
semaphore mutex = 1;    // 버퍼 접근 제어
semaphore full = 0;     // 가득 찬 버퍼 개수
semaphore empty = n;    // 빈 버퍼 개수

// 프로듀서
void producer() {
    while (true) {
        // 아이템 생산
        produce_item();
        
        wait(&empty);   // 빈 버퍼 대기
        wait(&mutex);   // 버퍼 접근 권한 획득
        
        // 버퍼에 아이템 추가
        add_to_buffer();
        
        signal(&mutex); // 버퍼 접근 권한 해제
        signal(&full);  // 가득 찬 버퍼 수 증가
    }
}

// 소비자
void consumer() {
    while (true) {
        wait(&full);    // 가득 찬 버퍼 대기
        wait(&mutex);   // 버퍼 접근 권한 획득
        
        // 버퍼에서 아이템 제거
        remove_from_buffer();
        
        signal(&mutex); // 버퍼 접근 권한 해제
        signal(&empty); // 빈 버퍼 수 증가
        
        // 아이템 소비
        consume_item();
    }
}
```

### 📚 읽기-쓰기 문제 (Readers-Writers Problem)

```mermaid
graph TD
    A[데이터베이스] --> B[읽기 프로세스들<br/>동시 접근 가능]
    A --> C[쓰기 프로세스<br/>독점 접근 필요]
    
    B --> B1["여러 개가 동시에<br/>읽기 가능"]
    C --> C1["하나만 쓰기 가능<br/>읽기와 동시 불가"]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#ffebee
```

#### 해결책 (First Readers-Writers Problem)

```c
semaphore rw_mutex = 1;  // 읽기/쓰기 상호 배제
semaphore mutex = 1;     // read_count 보호
int read_count = 0;      // 현재 읽기 중인 프로세스 수

// 쓰기 프로세스
void writer() {
    while (true) {
        wait(&rw_mutex);
        
        // 쓰기 수행
        write_data();
        
        signal(&rw_mutex);
    }
}

// 읽기 프로세스
void reader() {
    while (true) {
        wait(&mutex);
        read_count++;
        if (read_count == 1)    // 첫 번째 읽기 프로세스
            wait(&rw_mutex);    // 쓰기 프로세스 차단
        signal(&mutex);
        
        // 읽기 수행
        read_data();
        
        wait(&mutex);
        read_count--;
        if (read_count == 0)    // 마지막 읽기 프로세스
            signal(&rw_mutex);  // 쓰기 프로세스 허용
        signal(&mutex);
    }
}
```

---

## 핵심 개념 정리 {#summary}

### 📝 동기화 도구 비교

| 동기화 도구 | 장점 | 단점 | 적용 분야 |
|------------|------|------|-----------|
| **뮤텍스 락** | • 단순함<br/>• 빠른 응답 | • 바쁜 대기<br/>• CPU 낭비 | 짧은 임계 구역 |
| **세마포어** | • 블로킹 대기<br/>• 카운팅 가능 | • 프로그래밍 오류 가능 | 자원 관리 |
| **모니터** | • 고수준 추상화<br/>• 오류 방지 | • 언어/OS 지원 필요 | 복잡한 동기화 |

### 🔍 선택 기준

```mermaid
graph TD
    A[동기화 도구 선택] --> B[임계 구역 길이]
    A --> C[시스템 자원]
    A --> D[프로그래밍 복잡도]
    
    B --> B1[짧음: 뮤텍스/스핀락]
    B --> B2[긺: 세마포어/모니터]
    
    C --> C1[제한적: 뮤텍스]
    C --> C2[풍부함: 세마포어]
    
    D --> D1[단순함: 뮤텍스]
    D --> D2[복잡함: 모니터]
    
    style A fill:#e1f5fe
```

---

## 연습 문제 {#exercises}

### 🧩 문제 1: 세마포어 사용

다음 요구사항을 만족하는 세마포어 기반 해결책을 작성하세요:
- 프로세스 A의 구문 X가 프로세스 B의 구문 Y보다 먼저 실행되어야 함
- 프로세스 B의 구문 Y가 프로세스 C의 구문 Z보다 먼저 실행되어야 함

**답안:**
```c
semaphore sync1 = 0;  // A → B 동기화
semaphore sync2 = 0;  // B → C 동기화

// 프로세스 A
void processA() {
    X;                // 구문 X 실행
    signal(&sync1);   // B에게 신호
}

// 프로세스 B  
void processB() {
    wait(&sync1);     // A의 신호 대기
    Y;                // 구문 Y 실행
    signal(&sync2);   // C에게 신호
}

// 프로세스 C
void processC() {
    wait(&sync2);     // B의 신호 대기
    Z;                // 구문 Z 실행
}
```

### 🧩 문제 2: 모니터 설계

최대 3명이 동시에 사용할 수 있는 컴퓨터실을 모니터로 설계하세요.

**답안:**
```c
monitor ComputerLab {
    int available_seats = 3;
    condition waiting;
    
    void enter() {
        if (available_seats == 0)
            waiting.wait();
        available_seats--;
    }
    
    void exit() {
        available_seats++;
        waiting.signal();
    }
}
```

### 🧩 문제 3: 오류 분석

다음 코드의 문제점을 찾고 수정하세요:

```c
semaphore mutex = 1;

void process1() {
    wait(&mutex);
    // 임계 구역
    signal(&mutex);
    signal(&mutex);  // 추가 signal
}

void process2() {
    wait(&mutex);
    // 임계 구역  
    signal(&mutex);
}
```

**문제점:** process1에서 signal을 두 번 호출하여 mutex 값이 2가 될 수 있음. 이로 인해 두 프로세스가 동시에 임계 구역에 진입할 수 있음.

**수정안:**
```c
void process1() {
    wait(&mutex);
    // 임계 구역
    signal(&mutex);  // 한 번만 호출
}
```

---

### 📚 참고 자료

- **운영체제 개념** - Abraham Silberschatz, Peter Baer Galvin, Greg Gagne
- **Modern Operating Systems** - Andrew S. Tanenbaum
- **Operating System Concepts with Java** - Abraham Silberschatz

### 🔗 관련 링크

- [POSIX Threads Programming](https://computing.llnl.gov/tutorials/pthreads/)
- [Java Concurrency Tutorial](https://docs.oracle.com/javase/tutorial/essential/concurrency/)
- [Linux Kernel Synchronization](https://www.kernel.org/doc/Documentation/locking/)

---

*© 2024 Operating Systems Study Guide. 모든 권리 보유.*
