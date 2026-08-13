# Software Engineering Internals: Under the Hood

> Source synthesis: Software engineering reference books (comp 13, 15, 17, 67–68, 69, 76, 79, 105, 293, 323, 329, 331, 334–335, 337) covering design patterns internals, concurrency models, testing frameworks, build systems, and software architecture mechanics.

---

> **Reading contract:** This synthesis is for engineers comparing mechanisms, not for selecting a framework from diagrams alone. Spring, JUnit, Mockito, Gradle, Bazel, Git, reactive libraries, and JVM behavior require an explicit product version, runtime, configuration, and operating environment. Treat language or protocol rules as **facts**, architecture mappings as **interpretations**, and thresholds, byte counts, ratios, and timings as **examples**. A claim is complete only when its source location, preconditions, failure behavior, retry or rollback path, and reproducible evidence are recorded. If evidence changes, return the claim to provisional status.

## 1. Design Patterns — Internal Mechanics

### Observer Pattern — Event Dispatch Internals

```mermaid
flowchart TD
    subgraph Observer (Event Bus)
        Subject["Subject (EventEmitter)\nobservers: Map<eventType, List<Observer>>\nnotify(event):\n  for obs in observers[event.type]:\n    obs.update(event)  ← synchronous dispatch\n(or async: enqueue to event loop)"]
        O1["Observer A\nupdate(evt): handle evt"]
        O2["Observer B\nupdate(evt): handle evt"]
        O3["Observer C\nupdate(evt): handle evt"]
        Subject -->|"notify loop"| O1 & O2 & O3
    end

    subgraph Push vs Pull Model
        Push["Push: Subject sends full event data\n→ Observer gets all info immediately\n→ Coupling: Observer must know event structure"]
        Pull["Pull: Subject sends minimal notification\n→ Observer calls getState() to get details\n→ Lazy: Observer fetches only what it needs"]
    end

    subgraph Memory Leak Risk
        Leak["Observer registered but never unregistered\n→ Subject holds strong reference\n→ Observer and its closure can never be GC'd\nFix: weak references (WeakRef) or explicit unsubscribe()"]
    end
```

### Strategy Pattern — Dispatch Mechanics

```mermaid
flowchart LR
    subgraph Strategy (Function Pointer / Interface)
        Context["Context\nstrategy: SortStrategy\nsort(data):\n  strategy.execute(data)  ← virtual dispatch"]
        S1["QuickSortStrategy\nexecute(data): in-place partitioning\nO(n log n) expected time\nrecursion stack depends on pivot and implementation"]
        S2["MergeSortStrategy\nexecute(data): merge sort\nO(n log n), O(n) space, stable"]
        S3["TimSortStrategy\nexecute(data): timsort\n(runs + merge, Python/Java default)"]
        Context -->|"polymorphic call\nvtable lookup"| S1 & S2 & S3
    end

    subgraph vs Switch Statement
        Switch["switch(strategy_type) {\n  case QUICK: quicksort(data); break;\n  case MERGE: mergesort(data); break;\n}\n→ Open/Closed Principle violated:\n  adding sort requires modifying switch\nStrategy: add new class, no existing code changes"]
    end
```

---

## 2. Dependency Injection — Wiring Internals

```mermaid
flowchart TD
    subgraph DI Container (Spring IoC)
        Config["ApplicationContext\n- reads @Configuration classes\n- scans @Component/@Service/@Repository\n- parses @Bean methods"]
        BeanDef["BeanDefinition registry:\n{beanName → BeanDefinition}\n(class, scope, initMethod, dependsOn,\n constructor args, properties)"]
        Instantiate["Bean instantiation:\n1. resolveDependencies (recursive)\n2. newInstance (reflection or CGLIB proxy)\n3. inject @Autowired fields/constructors\n4. call @PostConstruct\n5. register in singleton cache"]
        Proxy["CGLIB proxy:\n@Transactional @Cacheable etc.\n→ subclass generated at runtime\n→ method interceptors wrap around real method\n→ bean reference = proxy, not real instance"]
    end

    subgraph Circular Dependency
        Circ["A depends on B, B depends on A\n→ Detection: currently-being-created set\n→ Resolution: setter injection (A created first,\n  B injected, then A.setB(B))\n→ Constructor injection: CANNOT resolve circles\n  (A constructor needs B, B constructor needs A)\n→ Fail-fast on circular constructor deps"]
    end
```

---

## 3. Concurrency Models — Thread Internals

```mermaid
flowchart TD
    subgraph Thread States (Java)
        NEW["NEW: Thread object created\nbut start() not called"]
        RUNNABLE["RUNNABLE: ready to run\nor actively running (OS decides)"]
        BLOCKED["BLOCKED: waiting for monitor lock\n(another thread holds it)"]
        WAITING["WAITING: Object.wait()\nThread.join()\nLockSupport.park()"]
        TIMED_WAITING["TIMED_WAITING: sleep(ms)\nwait(ms)\njoin(ms)"]
        TERMINATED["TERMINATED: run() returned\nor threw exception"]
    end
    NEW --> RUNNABLE
    RUNNABLE --> BLOCKED & WAITING & TIMED_WAITING
    BLOCKED & WAITING & TIMED_WAITING --> RUNNABLE
    RUNNABLE --> TERMINATED

    subgraph Thread Pool Internals (ThreadPoolExecutor)
        TPE["ThreadPoolExecutor:\ncorePoolSize=10, maxPoolSize=20\nworkQueue=LinkedBlockingQueue(1000)\nrejectedExecutionHandler\n\nLogic:\n1. tasks < corePoolSize → create new thread\n2. queue not full → enqueue task\n3. threads < maxPoolSize → create thread\n4. all full → reject (CallerRunsPolicy/AbortPolicy)"]
    end
```

### Java Memory Model — Happens-Before

```mermaid
sequenceDiagram
    participant T1 as Thread 1
    participant Mem as Shared Memory
    participant T2 as Thread 2

    T1->>T1: x = 42 (write)
    T1->>Mem: synchronized(lock) { publish = true }
    Note over Mem: monitor release happens-before monitor acquire
    T2->>Mem: synchronized(lock) { read publish }
    T2->>T2: read x  ← guaranteed to see 42
    Note over T2: without synchronization: T2 might see x=0 (stale cache line)
```

---

## 4. Test-Driven Development — Test Execution Internals

```mermaid
flowchart TD
    subgraph JUnit 5 Execution Pipeline
        Discovery["Test Discovery:\nClasspath scan for @Test methods\nBuild TestPlan (tree of TestDescriptors)"]
        Engine["TestEngine (JUnit Jupiter)\nfor each TestClass:\n  instantiate (new instance per @Test method)\n  execute @BeforeAll (static)\n  for each @Test:\n    execute @BeforeEach\n    execute test method\n    execute @AfterEach\n  execute @AfterAll"]
        Extensions["Extension Points:\n@ExtendWith(MockitoExtension.class)\nbeforeEach: inject @Mock fields\nafterEach: verify expectations\n→ lifecycle hooks at every phase"]
        Reporting["Event listener:\nTestExecutionListener\n→ Surefire XML report\n→ IDE real-time feedback"]
    end

    subgraph Mockito Internals
        ByteBuddy["ByteBuddy (byte code generation):\ncreate subclass of MyService at runtime\noverride all methods with:\n  invoke InvocationHandler → check stubbings\n  → if stubbed: return stubbed value\n  → if not stubbed: return default (null/0/false)"]
        Verify["verify(mock).method(args)\n→ check InvocationContainer:\n  was method called with matching args?\n  ArgumentMatcher: equals() / any() / argThat()"]
        ByteBuddy --> Verify
    end
```

---

## 5. Build Systems — Dependency Graph & Incremental Builds

```mermaid
flowchart LR
    subgraph Gradle Build Internals
        Config["Configuration phase:\nevaluate build.gradle scripts\nbuild Task DAG\n(task dependencies: A → B means B runs before A)"]
        Exec["Execution phase:\ntopological sort of DAG\nexecute tasks in order\n→ parallel execution (--parallel):\n  independent tasks run concurrently\n  max workers = CPU cores"]
        Incr["Incremental build:\ntask inputs/outputs declared\nfingerprint: hash(inputs)\nif fingerprint unchanged: UP-TO-DATE (skip)\n→ avoids recompiling unchanged modules"]
        BuildCache["Build cache:\noutput keyed by input fingerprint\nremote cache (S3/GCS) for CI sharing\n→ team members share cache hits"]
    end

    subgraph Bazel Remote Build Execution
        Hermetic["Hermetic builds:\nall inputs explicitly declared\n→ sandbox: no access to filesystem outside declared inputs\n→ reproducible: same inputs → same outputs (bit-for-bit)\n→ cache key = hash(all transitive deps + flags)"]
        Remote["Remote execution:\nactions sent to remote workers\noutputs cached by action hash\n→ 100-core parallelism without local CPU cost"]
    end
```

---

## 6. Version Control Internals — Git Object Store

```mermaid
flowchart TD
    subgraph Git Object Model
        Blob["Blob:\ncontent-addressed: SHA1(\"blob {len}\\0{content}\")\nStores file content only (no filename)\nDeduplication: same content = same SHA1 = stored once"]
        Tree["Tree:\ncontent-addressed\nList of {mode, name, SHA1} entries\n040000 tree abc123  src/\n100644 blob def456  README.md"]
        Commit["Commit:\ntree SHA1\nparent SHA1 (chain = history)\nauthor, committer, timestamp, message\n→ parent chain = immutable linked list"]
        Tag["Annotated Tag:\ntag object SHA1\npoints to commit SHA1\nmessage, tagger"]
    end

    subgraph Pack File (gc optimization)
        Loose["Loose objects: .git/objects/{2-char}/{38-char}\n(one file per object)"]
        Pack["Pack file: .git/objects/pack/pack-{sha1}.pack\n+ index: pack-{sha1}.idx\n→ delta compression: base object + binary diff\n→ 10–100× smaller than loose objects\n→ git gc: repack loose → pack"]
    end

    subgraph Merge Internals
        ThreeWay["Three-way merge:\nbase = common ancestor\noursA = our changes from base\ntheirsB = their changes from base\nmerge: combine A+B diffs\n→ conflict: same lines modified differently\n→ non-conflict: different lines → auto-merge"]
    end
```

---

## 7. SOLID Principles — Mechanical Implications

```mermaid
flowchart LR
    subgraph Single Responsibility (SRP)
        Before["class UserService {\n  createUser(), sendEmail(),\n  generateReport(), saveToCSV()\n}\n→ 4 reasons to change"]
        After["class UserService { createUser() }\nclass EmailService { sendEmail() }\nclass ReportService { generateReport() }\n→ each class: 1 reason to change\n→ smaller compilation units\n→ easier parallel team work"]
    end

    subgraph Open/Closed (OCP)
        OCP["class Discount {\n  if (type==PERCENT) ...\n  else if (type==FIXED) ...\n}\n→ every new discount type: modify class\nVS:\ninterface Discount { apply(price) }\nclass PercentDiscount implements Discount\nclass FixedDiscount implements Discount\n→ add new type: add new class, no existing modification"]
    end

    subgraph Dependency Inversion (DIP)
        DIP["High-level: OrderService\nDepends on abstraction: IPaymentGateway\nLow-level: StripeGateway implements IPaymentGateway\n→ OrderService compiled independently of Stripe SDK\n→ swap: inject MockGateway in tests\n→ runtime: IoC container injects StripeGateway"]
    end
```

---

## 8. Clean Code — Cyclomatic Complexity

```mermaid
flowchart TD
    subgraph Cyclomatic Complexity
        Formula["Complexity M = E - N + 2P\n(E=edges, N=nodes, P=connected components)\n= number of linearly independent paths through code\n= number of if/else/for/while/case/catch + 1"]
        Thresholds["Complexity bands are team policy,\nnot universal risk boundaries\nUse change rate, defects, ownership,\nand test evidence with M"]
        Test["M counts a basis of independent paths\nIt does not prove all paths feasible\nor prescribe an exact test count"]
    end

    subgraph Code Smell Metrics
        LongMethod["Long method: >20 lines\n→ extract smaller functions\n(each function = one level of abstraction)"]
        LargeClass["Large class: >300 lines\n→ split by responsibility (SRP)"]
        LongParam["Long parameter list: >3 params\n→ introduce Parameter Object\n→ reduces coupling"]
        DeepNest["Deep nesting: >3 levels\n→ early return (guard clauses)\n→ extract method"]
    end
```

---

## 9. Hexagonal Architecture — Port & Adapter Internals

```mermaid
flowchart LR
    subgraph Hexagonal Architecture
        Core["Domain Core\n(pure business logic)\nno dependencies on framework/DB/HTTP\nDomain entities + use cases"]
        InPort["Inbound Ports (interfaces):\nOrderService.createOrder()\n(called by adapters)"]
        OutPort["Outbound Ports (interfaces):\nOrderRepository.save()\nEmailGateway.send()"]
        HTTPAdapt["HTTP Adapter (inbound):\nSpring @RestController\ncalls InPort methods\n→ core has no Spring dependency"]
        DBAdapt["DB Adapter (outbound):\nJPA Repository implements OutPort\n→ core has no JPA dependency"]
        TestAdapt["Test Adapter:\nMock implements OutPort\n→ unit test core without DB"]
    end
    HTTPAdapt -->|"calls"| Core
    Core --> InPort & OutPort
    DBAdapt -->|"implements"| OutPort
    TestAdapt -->|"implements"| OutPort
```

---

## 10. Reactive Programming — Backpressure Internals

```mermaid
sequenceDiagram
    participant Pub as Publisher (fast source)
    participant Op as Operator (map/filter)
    participant Sub as Subscriber (slow consumer)

    Sub->>Op: subscribe(subscriber)
    Op->>Pub: subscribe(operatorSubscriber)
    Pub-->>Op: onSubscribe(Subscription)
    Op-->>Sub: onSubscribe(Subscription)
    
    Sub->>Op: request(10)  ← demand signal
    Op->>Pub: request(10)  ← propagate upstream
    Pub-->>Op: onNext(item1..10)
    Op->>Op: apply map/filter
    Op-->>Sub: onNext(filtered_items)
    
    Note over Sub: Sub processes, then
    Sub->>Op: request(5)  ← backpressure: only ask for 5
    Op->>Pub: request(5)  ← publisher throttled
    Note over Pub: Publisher sends at subscriber's pace (pull model)
```

### RxJava Hot vs Cold Observable

```mermaid
flowchart LR
    subgraph Cold Observable
        Cold["Cold: each subscriber gets its own data stream\nsubscribe → producer starts fresh\nHTTP request, file read\n→ 2 subscribers = 2 requests"]
    end
    subgraph Hot Observable
        Hot["Hot: shared stream, subscribers tap in\nsource runs regardless of subscribers\nmouse events, Kafka topic\n→ subscribers miss items if subscribed late\nPublish().RefCount() makes multicasting work"]
    end
    subgraph Subject (bridge)
        Subj["Subject = Observable + Observer\ncan emit items imperatively\n→ convert imperative code to reactive\nBehaviorSubject: replay last item to new subscribers"]
    end
```

---

## 11. Design Patterns — Proxy & Decorator Memory Layout

```mermaid
flowchart TD
    subgraph JDK Dynamic Proxy
        Interface["interface Service { void doWork(); }"]
        RealObj["RealService implements Service\n(actual implementation)"]
        Proxy2["Proxy.newProxyInstance(\n  classloader,\n  new Class[]{Service.class},\n  invocationHandler\n)\n→ generates bytecode for $Proxy0 class at runtime\noverrides doWork() to call handler.invoke()"]
        Handler["InvocationHandler:\ninvoke(proxy, method, args):\n  before()  ← cross-cutting concern (logging, auth)\n  result = method.invoke(realObj, args)\n  after()\n  return result"]
        RealObj --> Proxy2 --> Handler
    end

    subgraph Decorator Pattern
        Component["interface Coffee { double cost(); }"]
        Simple["SimpleCoffee: cost() = 1.0"]
        Milk["MilkDecorator wraps Coffee: cost() = wrapped.cost() + 0.25"]
        Sugar["SugarDecorator wraps Coffee: cost() = wrapped.cost() + 0.10"]
        Comp["milkCoffee = Milk(Sugar(Simple()))\nmilkCoffee.cost() = 1.0 + 0.10 + 0.25 = 1.35\n→ runtime composition without subclass explosion"]
        Component --> Simple --> Sugar --> Milk --> Comp
    end
```

---

## 12. Event Sourcing & CQRS Pattern — State Reconstruction

```mermaid
flowchart TD
    subgraph Event Store State Machine
        InitState["aggregate state = initial"]
        Events["Event stream:\nAccountOpened{id=1, balance=0}\nMoneyDeposited{id=1, amount=1000}\nMoneyWithdrawn{id=1, amount=200}"]
        Fold["state = fold(events, initialState)\nfor each event:\n  state = apply(state, event)\n→ final state: balance=800\n(pure function, no side effects)"]
        Snapshot["Snapshot every N events:\nsave current state + last event position\n→ replay from snapshot, not from beginning"]
    end
    InitState --> Events --> Fold --> Snapshot

    subgraph Append-Only Event Store
        WAL2["event_store table:\n(aggregate_id, version, event_type, payload, created_at)\nINSERT only (no UPDATE, no DELETE)\nOptimistic locking: WHERE version = expected_version"]
        Concurrency["Optimistic concurrency:\nIF conflicting version: retry or fail\n→ no distributed locks needed\n→ events = immutable facts"]
    end
```

---

## Key Takeaways

- **Observer pattern** dispatch is synchronous by default — a slow observer blocks all others; async dispatch (event queue + worker thread) decouples observer speed from publisher throughput
- **DI container bean lifecycle** uses reflection + CGLIB bytecode generation for proxying — `@Transactional` methods work because the proxy intercepts the call, not the real instance
- **ThreadPoolExecutor** fills core threads first, then queues, then creates up to max — a common mistake is setting queue capacity to `Integer.MAX_VALUE` which prevents max pool expansion
- **Git objects** are content-addressed (SHA-1 of content) — identical files across commits share the same blob; pack file delta compression finds similar blobs and stores only the binary diff
- **Hexagonal architecture** decouples business logic from frameworks by inverting dependencies through ports — the domain never imports Spring/JPA/HTTP, making it unit-testable in microseconds
- **Reactive backpressure** is a pull model — the subscriber controls the flow rate by calling `request(n)`; the publisher must not emit more than requested (preventing unbounded buffer growth)
- **Cyclomatic complexity** measures independent control-flow paths. It can guide basis-path testing, but it neither fixes the minimum test count nor proves branch coverage, path feasibility, or assertion quality.
