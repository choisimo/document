# LR Parser 학습 및 기록 노트

## 1. 왜 필요한가? (Pain Point & Motivation)

LR parser는 input을 left-to-right로 읽으면서 rightmost derivation의 역순을 bottom-up으로 복원한다. LL parser보다 넓은 문법을 다룰 수 있지만, LR item, closure, goto, Action/Goto table을 이해하지 못하면 shift/reduce conflict와 reduce/reduce conflict의 원인을 추적하기 어렵다.

이 문서는 원문의 LR(0) item 기반 DFA 구축 설명을 parsing state, closure/goto, table action, conflict 중심으로 재작성한다.

## 2. 현재 나의 상태 (Baseline)

- Bottom-up parsing의 shift/reduce 개념은 알고 있다.
- LR item의 dot이 production RHS에서 어디까지 인식했는지를 표시한다는 점을 이해해야 한다.
- Closure가 nonterminal 기대 상태에서 관련 production을 추가하는 이유를 정리해야 한다.
- GOTO 연산이 item DFA의 transition과 parsing table을 만든다는 연결이 필요하다.
- LR(0), SLR, LALR, LR(1)의 차이를 conflict 처리 관점으로 구분해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

- LR item `A -> alpha . beta`의 의미를 설명한다.
- Augmented grammar `S' -> S`가 accept condition을 만든다는 점을 이해한다.
- Closure와 GOTO로 canonical LR item set DFA를 만든다.
- DFA state에서 Action/Goto table row가 어떻게 만들어지는지 설명한다.
- LR(0) conflict가 왜 생기고 lookahead 기반 parser가 어떻게 완화하는지 이해한다.

## 4. 시스템 번역 (Data Flow)

```mermaid
flowchart TD
    A[Grammar] --> B[Augmented grammar]
    B --> C[Initial item S' -> .S]
    C --> D[Closure]
    D --> E[LR item set state]
    E --> F[GOTO on grammar symbol]
    F --> G[Canonical item DFA]
    G --> H[Action/Goto table]
    H --> I[Shift/Reduce parser]
```

LR parser generator는 grammar를 item DFA로 바꾸고, 각 DFA state를 parsing table의 행으로 사용한다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 핵심 질문 |
| --- | --- | --- |
| Augmented grammar | accept 상태 정의 | `S' -> S`를 추가했는가? |
| LR item | production 진행 위치 표시 | dot 왼쪽은 인식했고 오른쪽은 기대한다 |
| Complete item | reduce 가능 상태 | dot이 RHS 끝에 있는가? |
| Closure | 기대 nonterminal의 production 추가 | dot 뒤 nonterminal이 있는가? |
| GOTO | symbol을 읽은 뒤 다음 item set 계산 | dot을 symbol 뒤로 옮기는가? |
| Item DFA | LR parser state graph | item set이 상태 하나인가? |
| Action table | terminal lookahead에서 동작 결정 | shift/reduce/accept/error |
| Goto table | nonterminal reduce 후 state 이동 | LHS로 어느 state에 가는가? |

## 6. 상태 전이 (State Transition)

```mermaid
stateDiagram-v2
    [*] --> ItemSet
    ItemSet --> Shift: dot before terminal
    ItemSet --> GotoNonterminal: dot before nonterminal
    ItemSet --> Reduce: complete item
    ItemSet --> Accept: S' -> S.
    ItemSet --> Conflict: action이 둘 이상
    Shift --> ItemSet
    GotoNonterminal --> ItemSet
    Reduce --> ItemSet
    Accept --> [*]
```

LR(0)는 lookahead 없이 item set만 보고 action을 결정한다. 이 때문에 complete item과 shift 가능한 item이 같은 상태에 있으면 conflict가 발생할 수 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- DFA state는 단일 item이 아니라 closure가 적용된 LR item set이어야 한다.
- `S' -> S.` item은 입력 종료 marker와 함께 accept를 의미해야 한다.
- `A -> alpha . X beta`에서 `GOTO(I, X)`는 dot을 `X` 뒤로 옮긴 item들의 closure여야 한다.
- Complete item `A -> alpha .`은 stack top의 `alpha`를 `A`로 reduce하는 후보가 된다.
- 한 table cell에 shift와 reduce가 동시에 들어가면 shift/reduce conflict다.
- 한 table cell에 reduce가 둘 이상 들어가면 reduce/reduce conflict다.
- LR(0)에서 해결되지 않는 conflict는 SLR/LALR/LR(1) lookahead 또는 grammar rewrite가 필요하다.

## 8. 가장 작은 예제 (Minimal Viable Example)

문법:

```text
S' -> S
S  -> ( S ) S
S  -> epsilon
```

초기 closure:

```text
I0 = closure({ S' -> . S })
   = {
       S' -> . S,
       S  -> . ( S ) S,
       S  -> .
     }
```

주요 GOTO:

| 연산 | 결과 item set |
| --- | --- |
| `GOTO(I0, S)` | `{ S' -> S . }` |
| `GOTO(I0, ()` | `{ S -> ( . S ) S, S -> . ( S ) S, S -> . }` |
| `GOTO(I2, S)` | `{ S -> ( S . ) S }` |
| `GOTO(I3, ))` | `{ S -> ( S ) . S, S -> . ( S ) S, S -> . }` |
| `GOTO(I4, S)` | `{ S -> ( S ) S . }` |

```mermaid
flowchart LR
    I0[I0] -- S --> I1[I1: accept item]
    I0 -- "(" --> I2[I2]
    I2 -- S --> I3[I3]
    I2 -- "(" --> I2
    I3 -- ")" --> I4[I4]
    I4 -- S --> I5[I5: reduce S -> (S)S]
    I4 -- "(" --> I2
```

이 예제의 `I0`에는 `S -> .` complete item과 `S -> . ( S ) S` shift 가능 item이 함께 있다. LR(0)는 lookahead를 보지 않으므로 conflict가 생기지만, SLR은 `S -> epsilon` reduce를 FOLLOW(S)인 `)`와 `$`에서만 적용해 `(` shift와 분리할 수 있다.

## 9. 실패 사례 (What could go wrong?)

- Closure를 한 번만 적용하고 새로 추가된 item의 dot 뒤 nonterminal을 다시 확장하지 않는다.
- DFA state를 item 하나로 착각해 관련 production 후보를 누락한다.
- Complete item이 있는 모든 상태를 무조건 accept로 처리한다.
- LR(0) reduce action을 lookahead 없이 모든 terminal에 넣어 conflict를 만든다.
- Shift/reduce conflict를 grammar 의미 분석 없이 precedence 선언으로만 덮는다.
- Reduce/reduce conflict에서 production 순서로 선택해 실제 모호성을 숨긴다.
- SLR/LALR/LR(1)의 lookahead 범위 차이를 무시한다.

## 10. 뇌 확장하기 (Evolution & Variants)

- SLR은 LR(0) item DFA를 쓰되 reduce lookahead를 FOLLOW(LHS)로 제한한다.
- LR(1)은 item에 lookahead terminal을 포함해 더 정밀하게 conflict를 줄인다.
- LALR(1)은 LR(1) item set 중 core가 같은 상태를 병합해 table 크기를 줄인다.
- Parser generator는 conflict report를 통해 grammar ambiguity, precedence, associativity 문제를 드러낸다.
- Bottom-up 기본 흐름은 [Bottom-Up](bottom-up.md), grammar 구조는 [CFG](cfg.md)와 함께 봐야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [x] LR item, closure, GOTO, item DFA의 역할을 정리했다.
- [x] Augmented grammar와 accept item의 의미를 설명했다.
- [x] 괄호 grammar 예제로 LR(0) item set 전이를 보였다.
- [x] Shift/reduce와 reduce/reduce conflict의 원인을 포함했다.
- [x] 원문 LR parser 문서를 12개 섹션 템플릿으로 재작성했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

LR parser는 grammar를 LR item DFA로 바꾸고, 현재 state와 lookahead를 table에서 조회해 shift와 reduce를 결정한다.
