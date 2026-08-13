# Programming Languages — Under the Hood: Runtimes, Type Systems, and Compilation Internals

> **Focus**: Not syntax or API usage — but how language runtimes schedule goroutines, how compilers monomorphize generics, how CPS transforms suspend coroutines, and how type inference propagates constraints across polymorphic call sites.

---

## Scope, Semantic Guarantees, and Runtime Evidence

This document compares language semantics with representative compiler and runtime implementations. A language rule, an optimization performed by one compiler, and a benchmark result must not be treated as the same kind of guarantee.

- **Scope:** Record language edition, compiler or runtime version, target, optimization flags, garbage collector, standard library, and relevant feature flags.
- **Semantic boundary:** Type safety, ownership, evaluation, and concurrency rules come from the language model. Stack layout, scheduler queues, object headers, JIT tiers, and lowering strategies are implementation details that may change.
- **Complexity and numbers:** Stack sizes, pause times, dispatch costs, allocation sizes, and asymptotic bounds require the input representation and dense or sparse assumptions. They are examples until reproduced.
- **Evidence and uncertainty:** Use compiler IR or assembly, runtime traces, allocation and GC profiles, race or sanitizer results, and statistically sound benchmarks. Infer an optimization only when the generated artifact shows it.
- **Failure and completion:** Cover panic or exception paths, cancellation, races, FFI ownership, deoptimization, stack growth, and resource cleanup. Completion requires preserved semantics plus measured improvement under a fixed workload.

---

## 1. Go Runtime: Goroutine Scheduler Internals

Go's runtime implements M:N green-thread scheduling — N goroutines multiplexed over M OS threads using a work-stealing scheduler (GMP model).

```mermaid
flowchart TD
    subgraph "GMP Scheduler Model"
        G1[Goroutine G] -->|assigned to| P1[Processor P]
        G2[Goroutine G] -->|assigned to| P1
        P1 -->|runs on| M1[OS Thread M]
        P2[Processor P] -->|runs on| M2[OS Thread M]
        GQ[Global Run Queue] -->|steal| P2
        P1 -->|local run queue 256| LRQ1[Local RunQ]
        P2 -->|local run queue 256| LRQ2[Local RunQ]
        LRQ1 -->|work steal| LRQ2
    end
    M1 -->|blocks on syscall| M3[New OS Thread M]
    P1 -->|handoff P| M3
```

### Goroutine Stack Growth

A particular Go runtime version may start goroutines with an approximately 2KB stack and grow it by copying, while OS-thread stack reservations vary by OS and configuration and are not universally 2MB. Verify both values and the growth strategy against the target runtime:

```mermaid
sequenceDiagram
    participant G as Goroutine
    participant RT as Runtime
    participant GC as Stack Allocator

    G->>RT: function call exceeds stack guard
    RT->>RT: morestack() triggered
    RT->>GC: allocate 2× stack
    GC-->>RT: new stack pointer
    RT->>RT: copy all frames to new stack
    RT->>RT: update all stack pointers (escape analysis)
    RT-->>G: resume on new stack
```

In Go runtimes that grow stacks by copying, stack-relative pointers known to the runtime are adjusted. This does not mean every arbitrary `unsafe.Pointer` pattern can be rewritten safely; Go’s pointer and escape rules, compiler metadata, cgo, and `unsafe` restrictions define the valid cases.

### Goroutine State Machine

```mermaid
stateDiagram-v2
    [*] --> Runnable: go func()
    Runnable --> Running: P picks up G
    Running --> Runnable: preempted (10ms async signal)
    Running --> Waiting: channel block / syscall / mutex
    Waiting --> Runnable: channel send / syscall return
    Running --> Dead: function returns
    Running --> Syscall: syscall enter
    Syscall --> Runnable: syscall exit (P reacquired)
    Syscall --> Waiting: syscall blocks (P handed off)
```

### Work Stealing Algorithm

```mermaid
flowchart LR
    subgraph "Steal Decision"
        P_idle[Idle P] -->|1. check local| LRQ[Local RunQ empty?]
        LRQ -->|yes| GRQ[Check Global RunQ]
        GRQ -->|empty| Netpoll[Check epoll netpoller]
        Netpoll -->|empty| Steal[Steal from random P]
        Steal -->|take half| VictimQ[Victim P RunQ]
    end
```

Stealing takes **half** of the victim's local run queue — reduces contention while ensuring fairness. The global run queue is checked every 61st scheduling tick to prevent starvation.

### Channel Internals: hchan Structure

```mermaid
block-beta
    columns 4
    block:hchan:4
        qcount["qcount\n(len)"]
        dataqsiz["dataqsiz\n(cap)"]
        buf["buf *\n(ring buffer)"]
        elemsize["elemsize"]
        closed["closed uint32"]
        sendx["sendx (write idx)"]
        recvx["recvx (read idx)"]
        recvq["recvq\n(waiting receivers)"]
        sendq["sendq\n(waiting senders)"]
        lock["mutex"]
    end
```

**Direct send optimization**: If a receiver is blocked in `recvq`, the sender copies data **directly to receiver's stack** (bypassing the buffer), then wakes the receiver — zero extra copy.

---

## 2. Go Garbage Collector: Tri-Color Concurrent Mark

Go uses a **concurrent tri-color mark-and-sweep** GC with a write barrier to maintain invariants while the mutator runs:

```mermaid
flowchart TD
    subgraph "Tri-Color Invariant"
        White[White: not yet visited] -->|scan| Gray[Gray: discovered, children unscanned]
        Gray -->|scan children| Black[Black: fully scanned]
        Black -->|write barrier: new ptr| Gray2[Re-gray if needed]
    end
    subgraph "GC Phases"
        P1[STW mark setup + enable write barrier] --> P2[Concurrent mark: scan roots + heap]
        P2 --> P3[STW mark termination]
        P3 --> P4[Concurrent sweep: return white spans to allocator]
    end
```

**Dijkstra write barrier**: On any pointer write `*slot = ptr`, if `*slot` was black and `ptr` is white, shade `ptr` gray. This ensures no black→white reference without gray intermediary.

GOGC=100 means GC triggers when live heap doubles. GC target: `goal = live * (1 + GOGC/100)`.

---

## 3. Rust: Ownership, Borrow Checker, and Zero-Cost Abstractions

### Ownership as Type System State

```mermaid
stateDiagram-v2
    [*] --> Owned: let x = T.new()
    Owned --> Moved: let y = x (move semantics)
    Moved --> [*]: y drops (drop called)
    Owned --> BorrowedShared: &x (multiple allowed)
    Owned --> BorrowedMut: &mut x (exclusive)
    BorrowedShared --> Owned: borrow expires (NLL)
    BorrowedMut --> Owned: borrow expires (NLL)
    Owned --> [*]: scope end (drop)
```

**NLL (Non-Lexical Lifetimes)**: Borrows end at **last use**, not scope close. The borrow checker operates over the MIR (Mid-level IR) control flow graph, not AST.

### Monomorphization vs Dynamic Dispatch

```mermaid
flowchart LR
    subgraph "Generic fn<T: Trait>"
        GFn["fn process<T: Display>(x: T)"]
        GFn -->|monomorphize| F1["fn process_i32(x: i32)"]
        GFn -->|monomorphize| F2["fn process_String(x: String)"]
        GFn -->|monomorphize| F3["fn process_Vec_u8(x: Vec<u8>)"]
    end
    subgraph "dyn Trait (fat pointer)"
        DFn["fn process(x: &dyn Display)"]
        DFn --> FP["fat pointer: (data_ptr, vtable_ptr)"]
        FP --> VT["vtable: [drop_fn, size, align, display_fn, ...]"]
    end
```

Monomorphization: **zero runtime cost**, code bloat, inlined. `dyn Trait`: one copy, indirection via vtable, prevents inlining.

### Memory Layout: Stack vs Heap

```mermaid
block-beta
    columns 2
    block:stack:1
        columns 1
        s_label["STACK"]
        s1["&str: (ptr=0x..., len=5)"]
        s2["Vec header: (ptr, len, cap)"]
        s3["Box<T>: ptr only"]
        s4["i32: 4 bytes inline"]
    end
    block:heap:1
        columns 1
        h_label["HEAP"]
        h1["str data: 'hello'"]
        h2["Vec backing array: [1,2,3,...]"]
        h3["Boxed T value"]
        h4["Arc<T>: {strong_count, weak_count, T}"]
    end
```

`String` = heap-allocated UTF-8. `&str` = stack fat pointer (ptr + len) into any string data. `Vec<T>` = heap buffer with (ptr, len, cap) header on stack.

### LLVM IR Pipeline

```mermaid
flowchart TD
    Rust[Rust source] --> HIR[HIR: type checking]
    HIR --> THIR[THIR: pattern matching]
    THIR --> MIR[MIR: borrow checking + optimization]
    MIR --> LLVMIR[LLVM IR: codegen]
    LLVMIR --> Passes[LLVM optimization passes: inlining, LICM, vectorization]
    Passes --> MachineCode[Target machine code]
```

MIR is the key stage: it's a **control flow graph with explicit drops** — every variable drop is made explicit, allowing the borrow checker to verify safety without understanding complex control flow.

---

## 4. Scala: Type System, JVM Compilation, and Implicits

### Variance and Higher-Kinded Types

```mermaid
flowchart TD
    subgraph "Variance"
        INV["Invariant: F[A]\nno subtyping between F[Cat] and F[Animal]"]
        COV["Covariant: F[+A]\nF[Cat] <: F[Animal] if Cat <: Animal\n(List[+A], Option[+A])"]
        CONTRA["Contravariant: F[-A]\nF[Animal] <: F[Cat]\n(Function1[-A, +B])"]
    end
    subgraph "Higher-Kinded"
        HK["type F[_] — type constructor\nFunctor[F[_]]: map[A,B](fa: F[A])(f: A=>B): F[B]"]
        HK --> List_inst["instance Functor[List]"]
        HK --> Option_inst["instance Functor[Option]"]
    end
```

**Liskov Substitution** determines variance: covariant positions (return types, read-only containers) allow `+A`. Contravariant positions (function parameters) require `-A`.

### Implicit Resolution Algorithm

```mermaid
sequenceDiagram
    participant Compiler
    participant Local as Local Scope
    participant Import as Explicit Imports
    participant Companion as Companion Objects

    Compiler->>Local: search implicit val/def in scope
    Local-->>Compiler: not found
    Compiler->>Import: search imported implicits
    Import-->>Compiler: not found
    Compiler->>Companion: search companion of type A and B (implicit scope)
    Companion-->>Compiler: found: Ordering[Int] in Int companion
    Compiler->>Compiler: insert implicit argument at call site
```

Implicit search is **deterministic** but can diverge if implicit chains form cycles. Scala 3 (Dotty) replaced implicits with `given`/`using` for clarity and better error messages.

### Scala JVM Bytecode: Traits and Mixins

```mermaid
flowchart TD
    subgraph "Scala Trait → JVM"
        T["trait Foo { def bar: Int; def baz = bar + 1 }"]
        T --> Interface["interface Foo { int bar(); default int baz() }"]
        T --> StaticImpl["Foo$.baz$impl(Foo self)"]
        Interface -->|class mixin| Class["class C extends Foo: bar=42"]
        Class -->|baz delegates| StaticImpl
    end
```

Traits with concrete methods compile to Java interfaces with `default` methods (JVM 8+). For complex diamond inheritance, a **static forwarder** is generated.

---

## 5. Kotlin: Coroutines as CPS Transformation

### Continuation-Passing Style Transformation

```mermaid
flowchart TD
    subgraph "Source Code"
        S1["suspend fun fetchUser(id: Int): User {\n  val data = httpGet(url)  // suspend point\n  return parse(data)\n}"]
    end
    subgraph "Compiled State Machine"
        S2["fun fetchUser(id: Int, cont: Continuation<User>): Any {\n  val sm = cont as? SM ?: SM(cont)\n  when(sm.label) {\n    0: { sm.label=1; return httpGet(url, sm) }\n    1: { val data = sm.result; return parse(data) }\n  }\n}"]
    end
    S1 -->|CPS transform| S2
```

Each `suspend` call site becomes a **state machine label**. The `Continuation` object holds local variables across suspension. On resume, execution jumps to the correct `when` branch.

### Coroutine Continuation Object Memory Layout

```mermaid
block-beta
    columns 1
    block:cont:1
        columns 2
        label1["label: Int\n(current state)"]
        result1["result: Any?\n(resumed value)"]
        locals1["captured locals\n(vars live across suspend)"]
        parent1["completion: Continuation\n(caller's continuation)"]
        ctx1["context: CoroutineContext\n(Dispatcher, Job, CoroutineId)"]
    end
```

Heap-allocated continuation object replaces the stack frame at each suspension. This is **stackless coroutines** — no dedicated OS stack per coroutine (unlike Go goroutines which have growable stacks).

### Dispatcher and Thread Mapping

```mermaid
flowchart LR
    subgraph "Dispatchers"
        D_Default["Dispatchers.Default\nShared thread pool (CPU count)"]
        D_IO["Dispatchers.IO\nElastic pool up to 64 threads\n(blocking IO)"]
        D_Main["Dispatchers.Main\nUI thread (Android Looper)"]
        D_Unconf["Dispatchers.Unconfined\nCaller thread until first suspend"]
    end
    subgraph "Scheduling"
        Resume["Continuation.resume()"] --> Dispatch["dispatcher.dispatch(context, runnable)"]
        Dispatch --> ThreadPool[Thread executes block]
        ThreadPool -->|hits suspend| Park[Thread released back to pool]
    end
```

`withContext(Dispatchers.IO)` suspends current coroutine, dispatches to IO thread pool, resumes original dispatcher on completion — **no thread blocking** in the caller.

### Structured Concurrency and Job Tree

```mermaid
flowchart TD
    Scope[CoroutineScope] -->|launch| Job1[Job: fetchUser]
    Scope -->|launch| Job2[Job: fetchPosts]
    Job1 -->|launch| Job1a[Job: parseUser]
    Job2 -->|fails| Cancel[CancellationException propagates up]
    Cancel -->|cancels siblings| Job1
    Cancel -->|cancels children| Job1a
    Cancel -->|notifies parent| Scope
```

Cancellation is **cooperative** — coroutines must check `isActive` or call suspend functions that are cancellation-aware. A parent Job failure cancels all children (structured concurrency).

---

## 6. JVM Internals: HotSpot JIT Compilation

```mermaid
flowchart TD
    Source[Java/Kotlin/Scala source] --> Bytecode[JVM Bytecode .class]
    Bytecode --> Interpreter[Interpreter: first execution]
    Interpreter -->|profiling counters| C1[C1 Compiler: light optimization\n~1500 invocations]
    C1 -->|profile-guided| C2[C2 Compiler: aggressive optimization\n~15000 invocations]
    C2 --> NativeCode[Optimized native code]
    NativeCode -->|deoptimize on wrong speculation| Interpreter
```

**Speculative optimizations** in C2:
- **Inlining**: virtual call devirtualized if only one implementation seen in profile
- **Escape analysis**: object stays on stack if it doesn't escape method
- **Loop unrolling + vectorization**: SIMD intrinsics for array operations
- **Null check elimination**: remove redundant null checks after profile confirms non-null

### JVM Memory Layout

```mermaid
block-beta
    columns 3
    block:heap:2
        columns 2
        eden["Eden (Young Gen)\nNew object allocation\nBump pointer alloc"]
        s0["Survivor S0"]
        s1["Survivor S1"]
        old["Old Gen (Tenured)\nObjects surviving N GCs\nG1/ZGC concurrent collect"]
    end
    block:nonheap:1
        columns 1
        meta["Metaspace\nClass metadata\nMethod bytecode\nJIT compiled code"]
        stack["Thread Stacks\nStack frames\nLocal vars"]
    end
```

---

## 7. Go vs Rust vs JVM: Runtime Comparison

```mermaid
flowchart LR
    subgraph "Memory Management"
        Go_MM["Go: Concurrent GC\ntri-color mark-sweep\n~1ms STW pauses"]
        Rust_MM["Rust: Compile-time\nownership + drop\nzero runtime overhead"]
        JVM_MM["JVM: Generational GC\nG1/ZGC/Shenandoah\nconfigurable pauses"]
    end
    subgraph "Concurrency"
        Go_C["Go: goroutines\nM:N scheduling\nwork-stealing GMP"]
        Rust_C["Rust: async/await\nFuture polling model\ntokio/async-std runtimes"]
        JVM_C["JVM: OS threads\nProject Loom virtual threads\n(Java 21+)"]
    end
    subgraph "Type System"
        Go_T["Go: structural interfaces\nno generics variance\ntype parameters (1.18+)"]
        Rust_T["Rust: traits + lifetimes\nhigher-ranked trait bounds\nno GC needed via ownership"]
        JVM_T["JVM: nominal typing\ntype erasure (Java generics)\nreified generics (Kotlin)"]
    end
```

### Async/Await vs Goroutines: Core Difference

```mermaid
sequenceDiagram
    participant RustFuture as Rust Future (Stackless)
    participant GoRoutine as Go Goroutine (Stackful)

    Note over RustFuture: poll() returns Poll::Pending
    RustFuture->>RustFuture: stores state in Future struct (heap)
    RustFuture->>RustFuture: registers Waker with reactor
    Note over RustFuture: Thread returns to event loop

    Note over GoRoutine: goroutine blocks on channel/syscall
    GoRoutine->>GoRoutine: goroutine stack preserved (2KB–nMB)
    GoRoutine->>GoRoutine: P handed to another goroutine
    Note over GoRoutine: OS thread may park or handle another G
```

Rust futures are **poll-driven, zero-stack** — no allocation per suspension unless explicitly boxed. Go goroutines are **continuation-on-stack** — simpler to write (looks sync), higher per-goroutine baseline.

---

## 8. Functional Language Runtimes: Haskell GHC and OCaml

### GHC: Lazy Evaluation and Thunk Mechanics

```mermaid
flowchart TD
    subgraph "Thunk Lifecycle"
        T_created["Thunk created: closure ptr + env"] -->|first force| T_eval["Evaluate: enter closure"]
        T_eval -->|result| T_value["Update thunk to Value (WHNF)"]
        T_value -->|subsequent force| T_value
    end
    subgraph "Heap Object Layout"
        HO["Info Table Ptr | Payload..."]
        IT["Info Table: entry code | GC info | arity | srt"]
        HO --> IT
    end
```

**WHNF (Weak Head Normal Form)**: evaluation stops at outermost constructor — `Just _` is WHNF even if `_` is a thunk. Full NF evaluation requires `deepseq`.

### GHC Runtime System (RTS) Scheduler

```mermaid
flowchart LR
    HEC1["HEC 1 (OS Thread)\nHaskell Execution Context"] --> RunQ1[Spark Queue]
    HEC2["HEC 2 (OS Thread)"] --> RunQ2[Spark Queue]
    RunQ1 -->|work steal| RunQ2
    HEC1 -->|STM transaction| TLog[Transaction Log]
    TLog -->|commit: validate| STMHeap[STM Heap vars]
    TLog -->|conflict: retry| TLog
```

GHC's `par`/`seq` spark pool enables speculative parallelism. The **STM (Software Transactional Memory)** runtime uses optimistic concurrency: each transaction logs reads/writes, validates atomically on commit, retries on conflict.

---

## 9. Language Feature: Pattern Matching Compilation

Many ML-family compilers lower pattern matching to decision trees, jump tables, or mixed tests. Dispatch is not universally O(1); it depends on pattern form, constructor representation, guards, compiler strategy, and the path taken:

```mermaid
flowchart TD
    Match["match expr with\n| (0, _) -> A\n| (_, 0) -> B\n| (x, y) -> C"] -->|compile| DT["Decision Tree"]
    DT --> T1["test expr.0 == 0?"]
    T1 -->|yes| A["return A"]
    T1 -->|no| T2["test expr.1 == 0?"]
    T2 -->|yes| B["return B"]
    T2 -->|no| C["return C(x, y)"]
```

Compiler selects between **switch dispatch** (integer tags) and **if-chain** based on constructor density. Rust `match` on enums compiles to a jump table indexed by discriminant tag.

### Algebraic Data Type Memory Layout (Rust/Haskell)

```mermaid
block-beta
    columns 2
    block:rust_enum:1
        columns 1
        r_label["Rust: enum Option<T>"]
        r_none["None: discriminant=0, no payload"]
        r_some["Some(T): discriminant=1, T inline"]
        r_opt["niche optimization: &T None=0x0"]
    end
    block:haskell_adt:1
        columns 1
        h_label["Haskell: data Maybe a"]
        h_nothing["Nothing: info_ptr → Nothing_info, tag=0"]
        h_just["Just a: info_ptr → Just_info, a=thunk_ptr"]
    end
```

Rust applies **niche optimization**: `Option<&T>` uses null pointer as `None` — same size as `&T`, no discriminant needed.

---

## 10. Type Inference: Algorithm W / HM Unification

```mermaid
sequenceDiagram
    participant TC as Type Checker
    participant Env as Type Environment
    participant Uni as Unifier

    TC->>TC: generate fresh type var α for unknown
    TC->>Env: lookup variable → τ
    TC->>TC: instantiate polymorphic type (fresh vars)
    TC->>Uni: add constraint: τ1 = τ2
    Uni->>Uni: unify: walk structure recursively
    Uni->>Uni: occurs check: α ≠ F(α) (prevents infinite types)
    Uni-->>TC: substitution σ
    TC->>TC: generalize: ∀α. τ (if α free in τ, not in env)
    TC-->>TC: principal type derived
```

**Unification** is the core operation: `unify(List α, List Int)` → `α := Int`. Unification failure = type error. Occurs check prevents `α = List α` (infinite type).

### Rank-2 Polymorphism (Rust/Haskell HRTB)

```mermaid
flowchart TD
    R1["Rank-1: ∀a. a → a\nType var instantiated at call site by caller"]
    R2["Rank-2: (∀a. a → a) → Int\nCallee receives a polymorphic function\nMust work for ANY a, not a specific one"]
    R1 -->|subsumes| R2
    R2 -->|Rust syntax| HRTB["for<'a> Fn(&'a T) -> &'a U\nHigher-Ranked Trait Bound"]
```

Rust uses HRTBs for expressing that a closure must work for **any lifetime** — not just a specific inferred lifetime.

---

## 11. Cross-Language: Interoperability and FFI Mechanics

```mermaid
sequenceDiagram
    participant Rust
    participant CRuntime as C ABI (cdecl/SysV)
    participant Python as Python (CPython)

    Rust->>CRuntime: #[no_mangle] extern "C" fn foo()
    CRuntime->>Python: ctypes.CDLL → dlopen + dlsym
    Python->>Python: convert Python int → c_int (boxing)
    Python->>CRuntime: call via function pointer
    CRuntime->>Rust: stack frame in C calling convention
    Rust-->>CRuntime: return value
    CRuntime-->>Python: unbox to Python int
```

**PyO3 (Rust↔Python)**: GIL must be held when calling Python API. `pyo3::Python<'py>` token is a compile-time proof the GIL is held — safe Rust prevents GIL bugs at type level.

**JNI (Java↔C/Rust)**: JNIEnv pointer passed to native; every Java object reference is a handle (JNI local/global ref) — not a direct heap pointer. GC can move objects; JNI refs pin them.

---

## Summary: Language Runtime Internals Map

> Sizes, thresholds, dispatch costs, and lowering strategies below are version-specific examples. Language-level guarantees remain valid only where the governing specification defines them.

```mermaid
mindmap
  root((Language Runtimes))
    Go
      GMP scheduler M:N
      Work-stealing local runq
      Growable goroutine stacks
      Tri-color concurrent GC
      hchan direct send optimization
    Rust
      Ownership = compile-time GC
      MIR borrow checker CFG
      Monomorphization zero-cost
      LLVM backend optimization
      Async stackless Future polling
    Kotlin/JVM
      CPS transform suspend fns
      Continuation state machine
      Structured concurrency Job tree
      HotSpot C1/C2 JIT tiers
      G1/ZGC generational GC
    Scala/JVM
      Variance +A/-A type system
      Implicit resolution scope chain
      Trait → default method bytecode
      Higher-kinded type parameters
    Haskell/GHC
      Lazy thunk force + update
      WHNF evaluation strategy
      STM optimistic concurrency
      Spark pool parallel HEC
```
