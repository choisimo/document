# 기능적 프로그래밍 내부: 람다 미적분학, 유형 시스템 및 런타임 메커니즘

> 내부 내용: 클로저가 메모리 내 환경을 캡처하는 방법, Haskell의 지연 평가가 썽크 체인을 구축하는 방법, 모나드가 돌연변이 없이 스레드 상태를 유지하는 방법, Hindley-Milner 유형 추론 알고리즘이 작동하는 방법 — 정확한 힙 레이아웃, 축소 전략 및 함수형 프로그래밍 뒤에 있는 표시 의미.

---

## 1. 람다 미적분학: 기초

람다 미적분학은 모든 기능적 언어의 기본이 되는 계산 모델입니다. 세 가지 구성:

```
e ::= x          (variable)
    | λx.e       (abstraction: function)  
    | e₁ e₂      (application: call function)
```

### 베타 감소: 함수 적용 메커니즘

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

**합류(Church-Rosser 정리)**: 축소 순서에 관계없이 표현식이 정규 형식을 가지면 모든 축소 경로가 동일한 정규 형식에 도달합니다. 이는 게으른 평가를 정당화합니다. 필요한 경우에만 축소하고 항상 동일한 결과를 얻습니다.

---

## 2. 메모리에서의 클로저 표현

클로저 = 함수 코드 포인터 + 캡처된 환경(힙 할당)

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

### 스택 vs 힙: 이스케이프 분석

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

## 3. 하스켈 지연 평가: 썽크 메커니즘

Haskell은 **엄격하지 않습니다**: 표현식은 해당 값이 필요할 때까지 평가되지 않습니다. 평가되지 않은 표현식은 **썽크**입니다. 즉, 평가를 기다리는 힙 할당 클로저입니다.

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

### 썽크 공유(그래프 축소)

Haskell은 **그래프 감소**를 사용합니다. 공유 썽크는 첫 번째 평가 후 해당 값으로 업데이트되어 재계산을 방지합니다.

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

### 게으른 축적으로 인한 공간 누수

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

## 4. Hindley-Milner 유형 추론 알고리즘 W

HM은 **통합**을 사용하여 주석 없이 유형을 추론합니다.

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

### 다형성 유형 추론

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

## 5. 모나드: 돌연변이 없는 시퀀싱 효과

모나드는 다음을 포함하는 유형 생성자 `M`입니다.
- `return :: a -> M a`(랩 값)
- `(>>=) :: M a -> (a -> M b) -> M b` (바인드/체인)

세 가지 법칙을 충족합니다.
1. `return a >>= f  ≡  f a` (왼쪽 신원)
2. `m >>= return    ≡  m` (올바른 신원)
3. `(m >>= f) >>= g  ≡  m >>= (λx -> f x >>= g)`(연관성)

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

### 상태 모나드: 전역 변수가 없는 스레딩 상태

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

변경할 수 있는 전역 상태가 없습니다. 상태 값은 명시적 인수로 함수 호출을 통해 **스레딩**되어 각 단계에서 변환됩니다.

---

## 6. 대수적 데이터 유형 및 패턴 일치 컴파일

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

## 7. 순수하게 기능적인 데이터 구조: 영속적 불변 트리

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

## 8. 코드의 범주 이론 개념

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

## 9. STM: 소프트웨어 트랜잭션 메모리 내부

Haskell의 STM은 잠금 없이 구성 가능한 원자 블록을 제공합니다.

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

**교착 상태 없음**: STM은 낙관적 동시성을 사용합니다. 즉, 트랜잭션 실행 중에 잠금을 획득하지 않고 커밋 시에만 획득합니다. 트랜잭션은 **순수**(커밋할 때까지 관찰 가능한 부작용이 없음)이므로 재시도는 안전합니다.

---

## 10. 기능적 반응형 프로그래밍: 신호 그래프 내부

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

## 11. 테일 콜 최적화: 스택 프레임 제거

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

## 12. 효과 시스템과 무료 모나드

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

**확장 가능한 효과(Eff)**: `Eff` 모나드는 호출 사이트에서 대수 효과 처리기를 사용하여 모나드 변환기 스택 없이 여러 효과 유형(Reader, Writer, State, Exception)을 결합할 수 있도록 무료 모나드를 일반화합니다.

---

## 요약: FP 핵심 메커니즘

| 개념 | 런타임 메커니즘 | 주요 속성 |
|---|---|---|
| 폐쇄 | 힙 할당 환경 레코드 | 스택 수명 이후의 변수 캡처 |
| 게으른 썽크 | 힙 포인터 + 내부 업데이트 | 한 번 평가하고, 메모하고, 무한 구조 활성화 |
| HM 유형 추론 | 통일+대체 | O(n log n) 추론, 주석이 필요하지 않음 |
| 영구 데이터 구조 | 경로 복사 + 구조 공유 | O(log N) 업데이트, 이전 버전 보존 |
| 모나드 | 래핑된 유형에 대한 함수 구성 | 효과를 사용한 시퀀싱, 구성 가능 |
| STM | 낙관적 동시성 + 트랜잭션 로그 | 교착 상태 없음, 구성 가능한 원자 블록 |
| 총소유비용 | 현재 스택 프레임 바꾸기(goto) | 꼬리 재귀 알고리즘을 위한 O(1) 스택 |
| 패턴 매칭 | 태그 확인 + 필드 추출 + 가드 | 효율적인 의사결정 트리로 컴파일 |
