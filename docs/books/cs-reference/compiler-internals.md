# Compiler Internals: From Source to Machine Code

> **Under the Hood** — How the Dragon Book's phases transform source text into executable binary: lexer DFA state machines, parser LR automata, type-checking environments, IR lowering, dataflow analysis, and register allocation via graph coloring. Sources: *Compilers: Principles, Techniques & Tools* (Aho/Lam/Sethi/Ullman, 2nd ed. — "Dragon Book"), *Programming Language Pragmatics* (Scott), *Concepts of Programming Languages* (Sebesta).

---

## 1. Compiler Pipeline: End-to-End Phase Architecture

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

## 2. Lexical Analysis: DFA State Machine Internals

The lexer converts a character stream into a token stream using a deterministic finite automaton compiled from regular expressions.

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
    OP --> OP2: = (compound: +=, ==, !=)
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

### Maximal Munch Rule and Backtracking

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

## 3. Parsing: LR(1) Automaton and Shift-Reduce Decisions

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

### Conflict Resolution: Shift/Reduce, Reduce/Reduce

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

## 4. Symbol Table: Scope and Type Environment

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

## 5. Three-Address Code and SSA Form

### Three-Address Code (TAC) Generation

Source: `x = a + b * 2`

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

### SSA (Static Single Assignment) Form

Every variable assigned exactly once. φ-functions at control flow join points.

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

### Control Flow Graph (CFG)

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

## 6. Dataflow Analysis: Liveness and Reaching Definitions

### Liveness Analysis (backward dataflow)

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

**Algorithm**: Iterative fixed-point — start with all LIVE_OUT = ∅, propagate backwards until no change. Used by register allocators to determine register lifetimes (interference).

---

## 7. Register Allocation: Graph Coloring

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

### Coalescing: Eliminating MOV Instructions

```mermaid
flowchart LR
    BEFORE2["Before coalescing:\nt1 = a + b\nt2 = t1     ← MOV instruction\nreturn t2"]
    COALESCE["Coalesce t1 and t2:\nif they don't interfere\nassign same physical register"]
    AFTER["After coalescing:\nt1 = a + b    → both get reg0\nreturn t1    → MOV eliminated"]
    BEFORE2 --> COALESCE --> AFTER
```

---

## 8. Optimization: Loop Transformations

### Loop Invariant Code Motion (LICM)

```mermaid
flowchart LR
    BEFORE3["BEFORE:\nfor (i=0; i<n; i++) {\n  x = y * z;   ← invariant!\n  a[i] = x + i;\n}"]
    AFTER3["AFTER:\nx = y * z;       ← hoisted\nfor (i=0; i<n; i++) {\n  a[i] = x + i;\n}"]
    BEFORE3 -->|"LICM"| AFTER3
```

### Loop Unrolling

```mermaid
flowchart LR
    BEFORE4["BEFORE:\nfor (i=0; i<8; i++) {\n  sum += a[i];\n}"]
    AFTER4["AFTER (unroll 4×):\nfor (i=0; i<8; i+=4) {\n  sum += a[i];\n  sum += a[i+1];\n  sum += a[i+2];\n  sum += a[i+3];\n}"]
    BENEFIT["Benefits:\n- Fewer branch instructions\n- Exposes ILP for OoO CPU\n- Better software pipelining"]
    BEFORE4 -->|"Unroll x4"| AFTER4 --> BENEFIT
```

### Loop Tiling (Cache Optimization)

```mermaid
flowchart TD
    BEFORE5["BEFORE (matrix multiply):\nfor i in 0..N:\n  for j in 0..N:\n    for k in 0..N:\n      C[i][j] += A[i][k] * B[k][j]\nCache behavior: B column access = N strides → all misses"]
    AFTER5["AFTER (tiled):\nfor ii in 0..N step T:\n  for jj in 0..N step T:\n    for kk in 0..N step T:\n      for i in ii..ii+T:\n        for j in jj..jj+T:\n          for k in kk..kk+T:\n            C[i][j] += A[i][k] * B[k][j]\nT×T tiles fit in L1 cache → reuse"]
    BEFORE5 -->|"Tiling"| AFTER5
```

---

## 9. Code Generation: Instruction Selection via Tree Pattern Matching

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

## 10. Linker and Loader Internals

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

### ELF File Structure

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

## 11. JIT Compilation: Dynamic Code Generation

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

## 12. Language Feature → Compiler Mechanism Mapping

| Language Feature | Compiler Mechanism |
|---|---|
| Variables | Symbol table entry + stack frame slot or register |
| Type checking | Type environment + subtype lattice traversal |
| Function calls | Activation record (frame), calling convention (cdecl/fastcall) |
| Closures / lambdas | Closure record: function ptr + captured env heap-allocated |
| Generics (C++ templates) | Monomorphization: instantiate per type at compile time |
| Generics (Java/C#) | Type erasure: single bytecode, runtime casts |
| Virtual dispatch | vtable: array of function pointers, dynamic dispatch |
| Exceptions | Zero-cost tables (DWARF .eh_frame), unwind on throw |
| `async/await` | State machine transformation: locals → struct fields |
| Garbage collection | Safepoints, stack maps, write barriers |
| SIMD vectorization | Auto-vectorizer: loop → `vmovups`, `vaddps` instructions |
