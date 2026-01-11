# Bottom-Up 파싱 완전 정복: 개념부터 LR 파싱까지

Bottom-Up 파싱은 입력 문자열을 잎(leaves, 단말 기호)에서부터 시작 심볼(root)으로 환원해 나가는 방식으로, 오른쪽 최단 유도(Rightmost Derivation)를 역추적합니다.

---

## 1. Bottom-Up 파싱 개요
```mermaid
flowchart LR
  A[Leaves (단말 기호)] --> B[Reduce: 프로덕션 역적용]
  B --> C[비단말 기호 환원]
  C --> D{시작 심볼인가?}
  D -- 아니면 --> A
  D -- 예 --> E[Accept]
  classDef accept fill:#cfc,stroke:#393
  class E accept
```

---

## 2. Shift-Reduce 파싱
```mermaid
flowchart LR
  SHIFT[Shift: 토큰을 스택에 push]
  REDUCE[Reduce: RHS → LHS 환원]
  ACCEPT[Accept: 시작 심볼만 남으면 성공]
  ERROR[Error: 파싱 불가]

  SHIFT --> REDUCE
  REDUCE --> SHIFT
  REDUCE --> ACCEPT
  SHIFT --> ERROR
  classDef shift fill:#9f9,stroke:#393
  classDef reduce fill:#ffeb99,stroke:#c90
  classDef accept fill:#cfc,stroke:#393
  classDef error fill:#f99,stroke:#900
```

---

## 3. Handle (핸들) 추적
```mermaid
flowchart LR
  subgraph "스택 상태"
    S0[$]
    S1[$ n]
    S2[$ E]
    S3[$ E +]
    S4[$ E + n]
    S5[$ E]
    S6[$ E']
  end
  S0 -->|shift n| S1
  S1 -->|reduce E→n| S2
  S2 -->|shift +| S3
  S3 -->|shift n| S4
  S4 -->|reduce E→E+n| S5
  S5 -->|reduce E'→E| S6
  classDef shiftState fill:#9f9,stroke:#393
  classDef reduceState fill:#ffeb99,stroke:#c90
  class S1,S3,S4 shiftState
  class S2,S5,S6 reduceState
```

---

## 4. 예시: `n + n` Shift-Reduce 파싱
```mermaid
sequenceDiagram
    participant Stack as 스택
    participant Input as 입력
    participant Action as 액션

    Stack->>Stack: $
    Input-->>Stack: n
    Action-->>Stack: Shift(n)

    Stack->>Stack: $ n
    Action-->>Stack: Reduce(E→n)

    Stack->>Stack: $ E
    Input-->>Stack: +
    Action-->>Stack: Shift(+)

    Stack->>Stack: $ E +
    Input-->>Stack: n
    Action-->>Stack: Shift(n)

    Stack->>Stack: $ E + n
    Action-->>Stack: Reduce(E→E+n)

    Stack->>Stack: $ E
    Action-->>Stack: Reduce(E'→E)

    Stack->>Stack: $ E'
```

---

## 5. LR 파싱 구조
```mermaid
flowchart TB
  Input["Input 버퍼: a₁ a₂ ... aₙ $"]
  Parser["LR Parser"]
  Stack["스택<br/>(상태, 기호)"]
  Table["Parsing Table"]

  Input --> Parser
  Parser --> Stack
  Parser --> Table
  Table -- "Action/Goto" --> Parser

  classDef parser fill:#def,stroke:#369
  classDef table fill:#bbf,stroke:#369
  class Parser parser
  class Table table
```

---

## 6. 파싱 테이블 생성
```mermaid
flowchart LR
  Items["LR 아이템<br/>(A → α · β)"]
  DFA["LR DFA 상태 집합"]
  Table["Action & Goto 테이블"]

  Items --> DFA
  DFA --> Table

  classDef items fill:#bbf,stroke:#369
  classDef dfa fill:#fbd,stroke:#963
  class Items items
  class DFA dfa
```

---

## 7. 파싱 충돌 (Conflicts)
```mermaid
flowchart LR
  SR[Shift-Reduce 충돌] -->|우선순위 지정| Fix1[Operator Precedence]
  RR[Reduce-Reduce 충돌] -->|문법 개선| Fix2[Grammar Refactoring]
  class SR,RR fill:#fdd,stroke:#900
  class Fix1,Fix2 fill:#dfd,stroke:#090
```

---

## 8. 추가 고려사항
```mermaid
flowchart TB
  Aug[Augmented Grammar] --> Parser
  Parser --> Recovery[오류 복구]
  Amb[Inherent Ambiguity] --> Remark[고유 모호성]
  classDef Aug fill:#ddf,stroke:#339
  classDef Recovery fill:#ffd,stroke:#996
  classDef Amb fill:#fdd,stroke:#933
```

## 9. 좌측/우측 최단 유도 및 파싱 방향 차이

### 9.1 유도(Derivation) 방향

| 구분 | 좌측 최단 유도 (Leftmost Derivation) | 우측 최단 유도 (Rightmost Derivation) |
|:----:|:-----------------------------------:|:------------------------------------:|
| 처리 순서 | 가장 왼쪽 비단말 먼저 | 가장 오른쪽 비단말 먼저 |
| 파스 트리 생성 | 위→아래, 왼쪽 자식 우선 | 위→아래, 오른쪽 자식 우선 |
| 핵심 질문 | "다음에 무엇을 만들까?" | "이것은 무엇으로 만들어졌을까?" |

### 9.2 파서 스택 방향 (LL vs LR)

```mermaid
graph TB
  subgraph "LL 파서 (Top-Down)"
    direction LR
    S0["[S, $]"] --> Predict["Predict: S → aB"]
    Predict --> Push["Push: a, B"]
  end
  subgraph "LR 파서 (Bottom-Up)"
    direction LR
    Init["[$] + input 'ab'"] --> ShiftA["Shift: 'a'"]
    ShiftA --> ShiftB["Shift: 'b'"]
    ShiftB --> Reduce["Reduce: A → ab"]
  end
```

- LL 파서: 스택 최상단에서 비단말을 예측(Predict) 및 확장(Expand).
- LR 파서: 스택 최상단에서 핸들(Handle)을 인식(Reduce).

---
