# 컴파일러 내부: 소스에서 기계 코드까지

> **고급** — Dragon Book의 단계가 소스 텍스트를 실행 가능한 바이너리로 변환하는 방법: 렉서 DFA 상태 머신, 파서 LR 오토마타, 유형 확인 환경, IR 낮추기, 데이터 흐름 분석 및 그래프 색상 지정을 통한 레지스터 할당. 출처: *컴파일러: 원리, 기법 및 도구*(Aho/Lam/Sethi/Ullman, 2판 — "Dragon Book"), *프로그래밍 언어 화용론*(Scott), *프로그래밍 언어의 개념*(Sebesta).

---

## 1. 컴파일러 파이프라인: 엔드투엔드 단계 아키텍처

```mermaid
flowchart TD
    SRC["Source Code\n`int x = a + b * 2;`"]
    
    subgraph FRONTEND["Front End (Language-Dependent)"]
        LEXER["Lexer / Scanner\nCharacter stream → Tokens\nDFA-based"]
        PARSER["Parser\nTokens → Parse Tree (CST)\nLR/LALR automaton"]
        SEMA["Semantic Analysis\nCST → AST + Scope\nType checking\nSymbol table build"]
    end
    
    subgraph MIDDLEEND["Middle End (Language-Independent)"]
        IR["Intermediate Representation\nThree-address code / SSA\nCFG construction"]
        OPT["Optimization Passes\nDCE, CSE, inlining\nLoop transforms"]
    end
    
    subgraph BACKEND["Back End (Architecture-Dependent)"]
        ISEL["Instruction Selection\nIR → target instructions\nTree pattern matching"]
        REGALLOC["Register Allocation\nVirtual → physical regs\nGraph coloring / spilling"]
        SCHED["Instruction Scheduling\nReorder for latency hiding\nList scheduling"]
        EMIT["Code Emission\nObject file / binary\nRelocation entries"]
    end
    
    SRC --> LEXER --> PARSER --> SEMA --> IR --> OPT --> ISEL --> REGALLOC --> SCHED --> EMIT
```

---

## 2. 어휘 분석: DFA 상태 머신 내부

어휘 분석기는 정규식에서 컴파일된 결정론적 유한 자동 장치를 사용하여 문자 스트림을 토큰 스트림으로 변환합니다.

```mermaid
stateDiagram-v2
    [*] --> START
    
    START --> INT_LIT: digit
    INT_LIT --> INT_LIT: digit
    INT_LIT --> [*]: non-digit → emit INT token
    
    START --> ID_START: letter | _
    ID_START --> ID_CONT: letter | digit | _
    ID_CONT --> ID_CONT: letter | digit | _
    ID_CONT --> [*]: non-id char → check keyword table → emit ID or KEYWORD
    
    START --> OP: + - * / = < > ! & |
    OP --> OP2: = (compound ops += / == / !=)
    OP --> [*]: single-char op
    OP2 --> [*]: emit compound op token
    
    START --> SLASH: /
    SLASH --> COMMENT: /  (line comment)
    SLASH --> BLOCK_CMT: *  (block comment)
    COMMENT --> COMMENT: non-newline
    COMMENT --> [*]: newline → discard
    BLOCK_CMT --> BLOCK_CMT: non-*
    BLOCK_CMT --> BLOCK_END: *
    BLOCK_END --> [*]: / → discard comment
    BLOCK_END --> BLOCK_CMT: non-/
```

### 최대 뭉크 법칙과 역추적

```mermaid
flowchart LR
    INPUT["Input: `<=`"]
    STATE_LESS["State: saw `<`\nEmit LESS? Not yet..."]
    STATE_LE["State: saw `<=`\nEmit LESSEQ ✓"]
    INPUT --> STATE_LESS --> STATE_LE
    
    INPUT2["Input: `<<`"]
    STATE_LESS2["State: saw `<`"]
    STATE_LSHIFT["State: saw `<<`\nEmit LSHIFT ✓"]
    INPUT2 --> STATE_LESS2 --> STATE_LSHIFT
    
    NOTE["Maximal Munch:\nalways consume as many characters\nas possible before emitting a token"]
```

---

## 3. 구문 분석: LR(1) Automaton 및 Shift-Reduce 결정

```mermaid
flowchart TD
    subgraph LR_PARSE["LR(1) Parser Internals"]
        INPUT_TOKENS["Token Stream\nfrom Lexer"]
        STACK["Parse Stack\n[state, symbol] pairs\nstack = [(s0, ⊥), (s3, +), ...]"]
        ACTION["ACTION Table\n[state × terminal] → shift/reduce/accept/error"]
        GOTO["GOTO Table\n[state × nonterminal] → next state"]
        DRIVER["LR Driver Loop:\n1. a = peek next token\n2. Look up ACTION[state, a]\n3. Shift: push(next_state, a)\n4. Reduce: pop RHS symbols,\n   push(GOTO[top, LHS], LHS)"]
    end
    INPUT_TOKENS --> DRIVER
    STACK <--> DRIVER
    ACTION --> DRIVER
    GOTO --> DRIVER
```

### 충돌 해결: 이동/감소, 감소/감소

```mermaid
flowchart TD
    subgraph SR_CONFLICT["Shift/Reduce Conflict Example"]
        GRAM["Grammar:\nS → if E then S\nS → if E then S else S\nInput: if E then if E then S • else S"]
        AMBIG["Parser sees `else`:\nReduce: complete inner if-then\nShift: attach else to nearest if"]
        RESOLVE["Resolution rule:\nShift wins (else attaches to nearest if)\nYACC/Bison default behavior"]
        GRAM --> AMBIG --> RESOLVE
    end
    subgraph RR_CONFLICT["Reduce/Reduce Conflict"]
        RR_EX["Two rules can reduce same string\nTypically grammar ambiguity error\nMust redesign grammar"]
    end
```

---

## 4. 기호표: 범위 및 유형 환경

```mermaid
flowchart TD
    subgraph SCOPE_CHAIN["Scope Chain (Lexical Scoping)"]
        GLOBAL["Global Scope\nprintf: (char*, ...) → int\nstdin: FILE*"]
        FUNC_SCOPE["Function Scope: main\nargc: int\nargv: char**"]
        BLOCK_1["Block Scope: for-loop\ni: int"]
        BLOCK_2["Block Scope: if-body\ntemp: double"]
        GLOBAL --> FUNC_SCOPE --> BLOCK_1 --> BLOCK_2
        LOOKUP["Symbol Lookup:\nSearch current scope first\nWalk up chain to global\nO(depth) worst case"]
    end
    subgraph SYM_ENTRY["Symbol Table Entry"]
        NAME["name: string → hash"]
        TYPE["type: TypeDescriptor\n  base: {int, float, ptr, array, func}\n  qualifiers: {const, volatile}\n  pointed-to: TypeDescriptor*"]
        SCOPE2["scope_level: int"]
        OFFSET["storage_offset: int\n(stack frame or BSS/data)"]
        NAME & TYPE & SCOPE2 & OFFSET
    end
```

---

## 5. 3개 주소 코드 및 SSA 양식

### 3개 주소 코드(TAC) 생성

출처: `x = a + b * 2`

```mermaid
flowchart LR
    SRC2["a + b * 2"]
    T1["t1 = b * 2\n(temp for subexpr)"]
    T2["t2 = a + t1"]
    X["x = t2"]
    SRC2 --> T1 --> T2 --> X
```

```
Generated TAC:
  t1 = b * 2
  t2 = a + t1
  x  = t2
```

### SSA(정적 단일 할당) 양식

모든 변수는 정확히 한 번만 할당됩니다. 제어 흐름 조인 포인트의 Φ 기능.

```mermaid
flowchart TD
    subgraph BEFORE["Before SSA"]
        B1["x = 1\nif cond"]
        B2["x = 2   (then-branch)"]
        B3["x = 3   (else-branch)"]
        B4["y = x + 1  (join)"]
        B1 --> B2 & B3 --> B4
    end
    subgraph AFTER["After SSA"]
        A1["x₀ = 1\nif cond"]
        A2["x₁ = 2   (then)"]
        A3["x₂ = 3   (else)"]
        A4["x₃ = φ(x₁, x₂)  (join)\ny₀ = x₃ + 1"]
        A1 --> A2 & A3 --> A4
    end
```

### 제어 흐름 그래프(CFG)

```mermaid
flowchart TD
    ENTRY["Entry Block\nB0: param setup"]
    LOOP_HDR["Loop Header\nB1: i < n?"]
    LOOP_BODY["Loop Body\nB2: sum = sum + a[i]\ni = i + 1"]
    LOOP_EXIT["Loop Exit\nB3: return sum"]
    ENTRY --> LOOP_HDR
    LOOP_HDR -->|"true"| LOOP_BODY
    LOOP_BODY -->|"back edge"| LOOP_HDR
    LOOP_HDR -->|"false"| LOOP_EXIT
    
    DOM["Dominance tree:\nB0 dominates all\nB1 dominates B2, B3\nB2 dominates nothing extra"]
```

---

## 6. 데이터 흐름 분석: 활성 및 도달 정의

### 활동성 분석(역방향 데이터 흐름)

```mermaid
flowchart BT
    B3_OUT["B3 OUT: {}\n(function exit)"]
    B3_IN["B3 IN: USE[B3] ∪ (OUT - DEF[B3])\n= {sum} ∪ ({} - {}) = {sum}"]
    
    B2_OUT["B2 OUT: IN[B1] = {i, sum, a, n}"]
    B2_IN["B2 IN: {i, sum, a, n}"]
    
    B1_OUT["B1 OUT: IN[B2] ∪ IN[B3]"]
    B1_IN["B1 IN: {i, sum, a, n}"]
    
    B3_OUT --> B3_IN
    B2_OUT --> B2_IN
    B1_OUT --> B1_IN
    B2_IN --> B1_OUT
    B3_IN --> B1_OUT
```

**알고리즘**: 반복 고정 소수점 — 모든 LIVE_OUT = ∅로 시작하고 변경 사항이 없을 때까지 뒤로 전파합니다. 레지스터 수명(간섭)을 결정하기 위해 레지스터 할당자가 사용합니다.

---

## 7. 레지스터 할당: 그래프 컬러링

```mermaid
flowchart TD
    subgraph INTERFERENCE["Interference Graph Construction"]
        LIVE["Liveness analysis\nFor each def d of variable v:\n  if v is live-out of def's basic block\n  → v interferes with all other live variables"]
        NODES["Nodes: virtual registers (temporaries)"]
        EDGES["Edges: two nodes connected if\nboth simultaneously live (interfere)"]
        LIVE --> NODES & EDGES
    end
    subgraph COLORING["Graph Coloring (Chaitin algorithm)"]
        STEP1["1. Simplify:\nFind node with degree < k (k=num physical regs)\nRemove it (push on stack)"]
        STEP2["2. Spill:\nIf all nodes degree ≥ k\nChoose spill candidate (heuristic)\nMark as spill, continue simplify"]
        STEP3["3. Select:\nPop stack, assign color (register)\nnot used by neighbors"]
        STEP4["4. Spill code:\nFor spilled vars: emit load/store\naround each use/def"]
        STEP1 --> STEP2 --> STEP3 --> STEP4
    end
    subgraph EXAMPLE["4-register machine, 6 variables"]
        IG["Interference graph:\na—b, a—c, b—c, b—d, c—e, d—e\na:reg0, b:reg1, c:reg2, d:reg0, e:reg1"]
    end
```

### 통합: MOV 명령어 제거

```mermaid
flowchart LR
    BEFORE2["Before coalescing:\nt1 = a + b\nt2 = t1     ← MOV instruction\nreturn t2"]
    COALESCE["Coalesce t1 and t2:\nif they don't interfere\nassign same physical register"]
    AFTER["After coalescing:\nt1 = a + b    → both get reg0\nreturn t1    → MOV eliminated"]
    BEFORE2 --> COALESCE --> AFTER
```

---

## 8. 최적화: 루프 변환

### 루프 불변 코드 모션(LICM)

```mermaid
flowchart LR
    BEFORE3["BEFORE:\nfor (i=0; i<n; i++) {\n  x = y * z;   ← invariant!\n  a[i] = x + i;\n}"]
    AFTER3["AFTER:\nx = y * z;       ← hoisted\nfor (i=0; i<n; i++) {\n  a[i] = x + i;\n}"]
    BEFORE3 -->|"LICM"| AFTER3
```

### 루프 풀기

```mermaid
flowchart LR
    BEFORE4["BEFORE:\nfor (i=0; i<8; i++) {\n  sum += a[i];\n}"]
    AFTER4["AFTER (unroll 4×):\nfor (i=0; i<8; i+=4) {\n  sum += a[i];\n  sum += a[i+1];\n  sum += a[i+2];\n  sum += a[i+3];\n}"]
    BENEFIT["Benefits:\n- Fewer branch instructions\n- Exposes ILP for OoO CPU\n- Better software pipelining"]
    BEFORE4 -->|"Unroll x4"| AFTER4 --> BENEFIT
```

### 루프 타일링(캐시 최적화)

```mermaid
flowchart TD
    BEFORE5["BEFORE (matrix multiply):\nfor i in 0..N:\n  for j in 0..N:\n    for k in 0..N:\n      C[i][j] += A[i][k] * B[k][j]\nCache behavior: B column access = N strides → all misses"]
    AFTER5["AFTER (tiled):\nfor ii in 0..N step T:\n  for jj in 0..N step T:\n    for kk in 0..N step T:\n      for i in ii..ii+T:\n        for j in jj..jj+T:\n          for k in kk..kk+T:\n            C[i][j] += A[i][k] * B[k][j]\nT×T tiles fit in L1 cache → reuse"]
    BEFORE5 -->|"Tiling"| AFTER5
```

---

## 9. 코드 생성: 트리 패턴 매칭을 통한 명령어 선택

```mermaid
flowchart TD
    subgraph IR_TREE["IR Tree for `*(p + 4)`"]
        MEM["MEM"]
        ADD["ADD"]
        P["p (reg)"]
        FOUR["4 (const)"]
        MEM --> ADD --> P & FOUR
    end
    subgraph PATTERNS["Target Machine Patterns"]
        PAT1["MEM(ADD(reg, const))\n→ MOV dst, [reg + const]\n1 instruction"]
        PAT2["MEM(reg)\n→ MOV dst, [reg]\n1 instruction"]
        PAT3["MEM(ADD(MEM(reg), const))\n→ MOV tmp, [reg]\n   MOV dst, [tmp + const]\n2 instructions"]
    end
    IR_TREE -->|"Best-match tiling\n(Aho-Corasick or\ndynamic programming)"| PAT1
    PAT1 -->|"Selected"| EMIT2["MOV R0, [p + 4]"]
```

---

## 10. 링커 및 로더 내부

```mermaid
flowchart TD
    subgraph LINK["Linker Pass"]
        OBJ1["foo.o\nSymbol table:\n  global: foo() @ 0x0\n  undef: bar()\nRelocation entries:\n  R_X86_64_PLT32 @ 0x15 (call to bar)"]
        OBJ2["bar.o\nSymbol table:\n  global: bar() @ 0x0"]
        LIBC["libc.a\nArchive of .o files"]
        LINKER["Linker\n1. Merge .text sections\n2. Resolve symbol references\n3. Patch relocation entries\n4. Build .plt / .got for dynamic syms"]
        EXE["a.out / ELF\nLinked executable\nAll relocations resolved"]
        OBJ1 & OBJ2 & LIBC --> LINKER --> EXE
    end
    subgraph LOAD["Dynamic Loader (ld.so)"]
        DL["ld-linux.so\n1. Load ELF segments into VAS\n2. Map .so libraries\n3. Lazy PLT resolution (LD_BIND_NOW=0)\n4. Run .init sections\n5. Jump to main()"]
        EXE --> DL
    end
```

### ELF 파일 구조

```mermaid
block-beta
    columns 1
    A["ELF Header\nMagic, arch, entry point, section/segment table offsets"]
    B[".text section\nExecutable code (read-only, exec)"]
    C[".rodata section\nString literals, const data"]
    D[".data section\nInitialized globals (read-write)"]
    E[".bss section\nUninitialized globals (zero-filled at load)"]
    F[".symtab / .dynsym\nSymbol table entries"]
    G[".rela.text / .rela.dyn\nRelocation entries"]
    H["Section Header Table\nOffset, size, flags per section"]
    I["Program Header Table\nSegments (LOAD, DYNAMIC, PT_INTERP)"]
```

---

## 11. JIT 컴파일: 동적 코드 생성

```mermaid
sequenceDiagram
    participant INTERP as Interpreter
    participant JIT as JIT Compiler
    participant PROF as Profiler
    participant CODE as Native Code Cache

    INTERP->>PROF: Execute bytecode, track hotness
    PROF->>PROF: Count method invocations\nback-edge iterations
    
    alt Method is hot (>10000 invocations)
        PROF->>JIT: Trigger compilation
        JIT->>JIT: Deoptimize speculative assumptions
        JIT->>JIT: Build IR from bytecode
        JIT->>JIT: Type-specialize (assume int, not Object)
        JIT->>JIT: Inline callees
        JIT->>JIT: Emit native code
        JIT->>CODE: Store compiled method
        CODE-->>INTERP: Replace bytecode dispatch with native call
    end
    
    loop Hot path
        CODE->>CODE: Execute native code at full speed
    end
    
    alt Deoptimization (assumption violated)
        CODE->>INTERP: Bail out to interpreter
        Note over INTERP: Recompile with broader types
    end
```

---

## 12. 언어 기능 → 컴파일러 메커니즘 매핑

| 언어 기능 | 컴파일러 메커니즘 |
|---|---|
| 변수 | 심볼 테이블 항목 + 스택 프레임 슬롯 또는 레지스터 |
| 유형 확인 | 유형 환경 + 하위 유형 격자 순회 |
| 함수 호출 | 활성화 기록(프레임), 호출 규칙(cdecl/fastcall) |
| 클로저/람다 | 클로저 레코드: 함수 ptr + 캡처된 환경 힙 할당 |
| 제네릭(C++ 템플릿) | 단일화: 컴파일 타임에 유형별로 인스턴스화 |
| 제네릭(Java/C#) | 유형 삭제: 단일 바이트코드, 런타임 캐스트 |
| 가상 파견 | vtable: 함수 포인터 배열, 동적 디스패치 |
| 예외 | 비용이 없는 테이블(DWARF .eh_frame), 던지면 풀기 |
| `async/await` | 상태 머신 변환: locals → 구조체 필드 |
| 쓰레기 수거 | Safepoint, 스택 맵, 쓰기 장벽 |
| SIMD 벡터화 | 자동 벡터화기: 루프 → `vmovups`, `vaddps` 지침 |
