# Functional Programming Internals: Lambda Calculus, Type Systems & Runtime Mechanics

> Under the Hood: How closures capture environments in memory, how Haskell's lazy evaluation builds thunk chains, how monads thread state without mutation, how the Hindley-Milner type inference algorithm works — the exact heap layouts, reduction strategies, and denotational semantics behind functional programming.

---

## 1. Lambda Calculus: The Foundation

Lambda calculus is the computational model underlying all functional languages. Three constructs:

```
e ::= x          (variable)
    | λx.e       (abstraction: function)  
    | e₁ e₂      (application: call function)
```

### Beta Reduction: Function Application Mechanics

```mermaid
flowchart TD
    subgraph "Beta Reduction Steps"
        E1["(λx. x + 1) 5\napply: substitute x=5 in body"]
        E2["5 + 1\nreduce addition"]
        E3["6\nnormal form (no more redexes)"]
        E1 --> E2 --> E3
    end
    subgraph "Church Encoding: True/False as Functions"
        TRUE["TRUE = λt. λf. t\n(returns first argument)"]
        FALSE["FALSE = λt. λf. f\n(returns second argument)"]
        IF["IF = λb. λt. λf. b t f\nIF TRUE x y\n= (λt.λf.t) x y\n= x\n(no built-in conditionals needed!)"]
        TRUE --> IF
        FALSE --> IF
    end
```

**Confluence (Church-Rosser theorem)**: Regardless of reduction order, if an expression has a normal form, all reduction paths reach the same normal form. This justifies lazy evaluation — reduce only when needed, always get the same result.

---

## 2. Closure Representation in Memory

A closure = function code pointer + captured environment (heap-allocated).

```mermaid
flowchart TD
    subgraph "JavaScript Closure Memory Layout"
        CODE["Function object\n  [[Code]]: pointer to bytecode\n  [[Environment]]: → Env record"]
        ENV["Environment Record (heap)\n  x: 10\n  y: 20\n  outer: → parent env"]
        PARENT["Parent Environment Record\n  z: 5\n  outer: global"]
        CODE --> ENV --> PARENT
    end
    subgraph "Closure Capture in Source"
        SRC["function outer() {\n  let x = 10;\n  return function inner() {\n    return x + 1; // captures x\n  };\n}\nlet f = outer();\n// outer() stack frame GONE\n// but x=10 still alive on heap!\nf(); // returns 11"]
    end
```

### Stack vs Heap: Escape Analysis

```mermaid
flowchart LR
    subgraph "Without Closure (Stack-allocated)"
        F1["function add(a, b) {\n  return a + b; // no capture\n}"]
        STACK["a, b on call stack\nPopped on return\nO(1) memory, fast"]
        F1 --> STACK
    end
    subgraph "With Closure (Heap-allocated)"
        F2["function counter() {\n  let n = 0;\n  return () => ++n; // n escapes!\n}"]
        HEAP["n promoted to heap\nClosure object on heap\nGC manages lifetime\nSlower, but necessary"]
        F2 --> HEAP
    end
    subgraph "JVM Escape Analysis (javac + JIT)"
        EA["JIT checks: does object\nescape method scope?\nNo → stack allocate\n(eliminates GC pressure)"]
    end
```

---

## 3. Haskell Lazy Evaluation: Thunk Mechanics

Haskell is **non-strict**: expressions are not evaluated until their value is needed. Unevaluated expressions are **thunks** — heap-allocated closures awaiting evaluation.

```mermaid
flowchart TD
    subgraph "Thunk Heap Representation"
        T1["Thunk: (1 + 2)\n  code: ADD\n  args: [Thunk(1), Thunk(2)]\n  evaluated: false"]
        WHNF["WHNF (Weak Head Normal Form)\n  force outer constructor\n  leave args as thunks"]
        NF["Normal Form\n  all thunks fully evaluated"]
        T1 -->|seq / pattern match| WHNF -->|deepseq| NF
    end
    subgraph "Infinite List: fibs = 0:1:zipWith (+) fibs (tail fibs)"
        T_fibs["fibs thunk\n  = Cons 0 (thunk: 1:zipWith...)\n  Only as much computed\n  as demanded by consumer"]
        TAKE["take 5 fibs\n  → forces 5 Cons cells\n  → [0,1,1,2,3]"]
        T_fibs --> TAKE
    end
```

### Thunk Sharing (Graph Reduction)

Haskell uses **graph reduction** — shared thunks are updated in-place to their value after first evaluation, preventing recomputation:

```mermaid
sequenceDiagram
    participant Main as Main
    participant T as Thunk: expensive_compute 42
    participant Heap as Heap

    Main->>T: First demand
    T->>Heap: Evaluate expensive_compute 42 → result=99
    Note over T: Update thunk in-place\nReplaces code+args with\nINDIRECTION → 99

    Main->>T: Second demand (same thunk)
    Note over T: Already INDIRECTION → 99\nReturn immediately (no recompute!)
```

### Space Leaks from Lazy Accumulation

```
-- BAD: builds up n thunks before summing
sum [1..1000000]
= 1 + (2 + (3 + ... (999999 + 1000000)...))
-- Stack overflow or O(N) heap

-- GOOD: foldl' forces accumulator at each step
import Data.List (foldl')
foldl' (+) 0 [1..1000000]
-- Strict accumulator: O(1) heap
```

---

## 4. Hindley-Milner Type Inference Algorithm W

HM infers types without annotations using **unification**.

```mermaid
flowchart TD
    subgraph "Algorithm W Steps"
        SRC["Expression: \\x -> x + 1"]
        
        STEP1["1. Assign fresh type vars:\n   x :: α\n   1 :: Int\n   (+) :: Num a => a -> a -> a\n   (Instantiate: (+) :: β -> β -> β)"]
        
        STEP2["2. Generate constraints:\n   Application: x applied to (+):\n   α = β  (x must match first arg)\n   Result of (x+1) = β\n   1 must unify with β → β = Int"]
        
        STEP3["3. Unification:\n   Substitution: {β := Int, α := Int}\n   Apply to result type:\n   λx -> x + 1 :: Int -> Int"]
        
        STEP4["4. Generalize free vars:\n   No free vars → monomorphic\n   ∀. Int -> Int"]
        
        SRC --> STEP1 --> STEP2 --> STEP3 --> STEP4
    end
```

### Polymorphic Type Inference

```haskell
-- id :: a -> a  (inferred, not annotated)
id x = x
-- Fresh type var: x :: α, body :: α → infer id :: α -> α
-- Generalize: id :: ∀a. a -> a

-- map :: (a -> b) -> [a] -> [b]
map f [] = []
map f (x:xs) = f x : map f xs
-- Algorithm W infers this automatically from pattern matching
```

---

## 5. Monads: Sequencing Effects Without Mutation

A Monad is a type constructor `M` with:
- `return :: a -> M a` (wrap value)
- `(>>=) :: M a -> (a -> M b) -> M b` (bind/chain)

Satisfying three laws:
1. `return a >>= f  ≡  f a`  (left identity)
2. `m >>= return    ≡  m`    (right identity)
3. `(m >>= f) >>= g  ≡  m >>= (λx -> f x >>= g)`  (associativity)

```mermaid
flowchart TD
    subgraph "Maybe Monad: Short-Circuit on Nothing"
        P1["getUser uid :: Maybe User"]
        P2[">>= getAddress :: User -> Maybe Address"]
        P3[">>= getCity :: Address -> Maybe City"]
        P4["Result: Maybe City"]
        
        P1 -->|Just user| P2 -->|Just addr| P3 -->|Just city| P4
        P1 -->|Nothing| Short1["Nothing (propagates)"]
        P2 -->|Nothing| Short2["Nothing (propagates)"]
    end
    subgraph "IO Monad: Sequencing Side Effects"
        IO1["getLine :: IO String\n(describes reading, doesn't DO it yet)"]
        IO2[">>= putStrLn :: String -> IO ()\n(chain: use result of getLine)"]
        RUN["Haskell runtime executes IO chain\nside effects happen in order\nPure code never sees effects"]
        IO1 --> IO2 --> RUN
    end
```

### State Monad: Threading State Without Global Variables

```mermaid
flowchart LR
    subgraph "State Monad Desugared"
        TYPE["type State s a = s -> (a, s)\n(function from state to value+new-state)"]
        BIND["(>>=): chaining State computations\n(>>=) m f = \\s ->\n  let (a, s') = m s\n      (b, s'') = f a s'\n  in (b, s'')"]
        GET["get :: State s s\nget = \\s -> (s, s)"]
        PUT["put :: s -> State s ()\nput s = \\_ -> ((), s)"]
        TYPE --> BIND
        BIND --> GET
        BIND --> PUT
    end
```

No mutable global state — the state value is **threaded through** function calls as an explicit argument, transformed at each step.

---

## 6. Algebraic Data Types and Pattern Matching Compilation

```haskell
data Tree a = Leaf | Node (Tree a) a (Tree a)

-- Pattern match compiles to jump table / decision tree
insert :: Ord a => a -> Tree a -> Tree a
insert x Leaf         = Node Leaf x Leaf
insert x (Node l v r)
  | x < v    = Node (insert x l) v r
  | x > v    = Node l v (insert x r)
  | otherwise = Node l v r
```

```mermaid
flowchart TD
    subgraph "Pattern Match → Decision Tree Compilation"
        PM["Pattern match: case tree of\n  Leaf → ...\n  Node l v r → ..."]
        
        D1["Test: constructor tag\n= TAG_LEAF (0) or TAG_NODE (1)?"]
        
        D2["TAG_LEAF branch:\n  Return leaf result"]
        
        D3["TAG_NODE branch:\n  Bind l = field[0]\n  Bind v = field[1]\n  Bind r = field[2]\n  Evaluate guards: x < v"]
        
        PM --> D1
        D1 -->|tag=0| D2
        D1 -->|tag=1| D3
    end
    subgraph "Memory Layout: Node constructor"
        HEAP["Heap block (Node L 5 R):\n  word 0: TAG_NODE (1)\n  word 1: ptr to L (Tree a)\n  word 2: int 5\n  word 3: ptr to R (Tree a)"]
    end
```

---

## 7. Purely Functional Data Structures: Persistent Immutable Trees

```mermaid
flowchart TD
    subgraph "Path Copying on Insert"
        T1["Original Tree:\n        5\n       / \\\n      3   7\n     / \\\n    2   4"]
        
        T2["After insert(6):\n        5'  ← new node (shares 3,2,4)\n       / \\\n      3   7' ← new node (shares 7)\n             \\\n              6' ← new leaf"]
        
        T1 -->|insert 6| T2
        Note["Unchanged subtrees SHARED\nOnly O(log N) new nodes allocated\nBoth T1 and T2 valid simultaneously\n(persistent / immutable)"]
    end
    subgraph "Finger Trees (Haskell Seq type)"
        FT["Balanced tree with\nO(1) push/pop both ends\nO(log N) concat + split\nDigit buffers at spine tips:\nO(1) amortized enqueue"]
    end
```

---

## 8. Category Theory Concepts in Code

```mermaid
flowchart LR
    subgraph "Functor: Structure-Preserving Map"
        F["fmap :: (a -> b) -> f a -> f b\nLaws:\n  fmap id = id\n  fmap (f . g) = fmap f . fmap g"]
        EX["fmap (+1) [1,2,3] = [2,3,4]\nfmap (+1) (Just 5) = Just 6\nfmap (+1) Nothing = Nothing\nSame operation, different containers"]
        F --> EX
    end
    subgraph "Natural Transformation"
        NT["η :: F a -> G a\n(transform container type, preserve contents)\nExample: maybeToList :: Maybe a -> [a]\n  maybeToList Nothing = []\n  maybeToList (Just x) = [x]"]
    end
    subgraph "Applicative: Independent Effects"
        AP["(<*>) :: f (a->b) -> f a -> f b\nf <$> x <*> y <*> z\n= apply f to x,y,z independently\n(not sequentially like >>=)\nEnables parallel execution!"]
    end
```

---

## 9. STM: Software Transactional Memory Internals

Haskell's STM provides composable atomic blocks without locks:

```mermaid
sequenceDiagram
    participant T1 as Thread 1
    participant T2 as Thread 2
    participant LOG as Transaction Log
    participant TV as TVar (shared variable)

    Note over T1: atomically $ do
    T1->>LOG: Start log (read_set=[], write_set=[])
    T1->>TV: readTVar x (value=5)
    LOG-->>T1: Return 5, log read: (x, version=42)
    T1->>LOG: writeTVar x 10
    LOG-->>T1: Record write: (x, 10) — NOT yet committed

    Note over T2: Concurrent write
    T2->>TV: atomically writeTVar x 99
    Note over TV: x = 99, version = 43

    Note over T1: Commit attempt
    T1->>TV: Validate: x.version == 42?
    Note over TV: version = 43 ≠ 42!
    TV-->>T1: Conflict detected — RETRY
    Note over T1: Transaction rolled back\nlog cleared\nre-execute atomically block
```

**No deadlocks possible**: STM uses optimistic concurrency — no locks acquired during transaction execution, only at commit. Retry is safe because transactions are **pure** (no observable side effects until commit).

---

## 10. Functional Reactive Programming: Signal Graph Internals

```mermaid
flowchart TD
    subgraph "FRP Signal Dependency Graph"
        MOUSE_X["Signal: mouse_x\n(stream of x coordinates over time)"]
        MOUSE_Y["Signal: mouse_y"]
        VELOCITY["Signal: velocity\n= sqrt(dx² + dy²)\ndepends on mouse_x, mouse_y"]
        DISPLAY["Signal: display_color\n= if velocity > 100 then Red else Blue\ndepends on velocity"]
        
        MOUSE_X --> VELOCITY
        MOUSE_Y --> VELOCITY
        VELOCITY --> DISPLAY
    end
    subgraph "Reactive Push-Based Update"
        EV["Event: mouse moves to (150, 200)"]
        UPD1["Update mouse_x=150, mouse_y=200"]
        UPD2["Recompute velocity = sqrt(50² + 30²) = 58.3"]
        UPD3["Recompute display_color = Blue (58<100)"]
        RENDER["Re-render only affected nodes\n(topological sort of dependency graph)"]
        EV --> UPD1 --> UPD2 --> UPD3 --> RENDER
    end
```

---

## 11. Tail Call Optimization: Stack Frame Elimination

```mermaid
flowchart TD
    subgraph "Non-Tail-Recursive (Stack Growth)"
        NTR["factorial(5)\n= 5 * factorial(4)\n= 5 * (4 * factorial(3))\n= 5 * (4 * (3 * factorial(2)))\n= 5 * (4 * (3 * (2 * factorial(1))))\nStack depth = N = O(N) stack space"]
    end
    subgraph "Tail-Recursive (Constant Stack)"
        TR["factorial_acc(5, 1)\n= factorial_acc(4, 5)\n= factorial_acc(3, 20)\n= factorial_acc(2, 60)\n= factorial_acc(1, 120)\nTCO: each call REPLACES current frame\nO(1) stack space"]
    end
    subgraph "JVM Tail Call Reality"
        JVM["JVM bytecode: invokeVirtual\nNo TCO at bytecode level\nScala/Kotlin: @tailrec annotation\n→ compiler rewrites to loop\nClojure: recur keyword\n→ compiler inserts goto\nNOT: general TCO in JVM"]
    end
```

---

## 12. Effect Systems and Free Monads

```mermaid
flowchart TD
    subgraph "Free Monad: Separate DSL from Interpreter"
        DSL["type Program a =\n  | ReadFile String (String -> Program a)\n  | WriteFile String String (Program a)\n  | Return a"]
        
        PURE["Pure program (data structure!)\nreadFile 'x.txt' >>= writeFile 'y.txt'\n= ReadFile 'x.txt' (\\content ->\n    WriteFile 'y.txt' content (Return ()))"]
        
        INTERP1["Production interpreter:\n  actually performs file I/O\n  IO monad"]
        INTERP2["Test interpreter:\n  simulates I/O in-memory\n  State monad over Map"]
        
        DSL --> PURE
        PURE --> INTERP1
        PURE --> INTERP2
    end
```

**Extensible Effects (Eff)**: The `Eff` monad generalizes Free monads to allow combining multiple effect types (Reader, Writer, State, Exception) without monad transformer stacks, using algebraic effect handlers at the call site.

---

## Summary: FP Core Mechanisms

| Concept | Runtime Mechanism | Key Property |
|---|---|---|
| Closure | Heap-allocated environment record | Captures variables beyond stack lifetime |
| Lazy thunk | Heap pointer + update-in-place | Evaluate once, memoize, enable infinite structures |
| HM type inference | Unification + substitution | O(n log n) inference, no annotations needed |
| Persistent data structure | Path copying + structural sharing | O(log N) updates, old versions preserved |
| Monad | Function composition over wrapped types | Sequencing with effects, composable |
| STM | Optimistic concurrency + transaction log | No deadlocks, composable atomic blocks |
| TCO | Replace current stack frame (goto) | O(1) stack for tail-recursive algorithms |
| Pattern matching | Tag check + field extraction + guards | Compiled to efficient decision tree |
