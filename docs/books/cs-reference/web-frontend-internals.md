# Web & Frontend Internals: Browser Engine, JavaScript Runtime & React Reconciliation

> Under the Hood: How a browser parses HTML into a render tree, how the JavaScript event loop processes microtasks and macrotasks, how React's reconciler diffs virtual DOM trees, how V8 JIT-compiles hot functions — the exact pipelines, data structures, and scheduling mechanics behind modern web development.

---

## 1. Browser Rendering Pipeline: Critical Path

```mermaid
flowchart LR
    subgraph "Critical Rendering Path"
        HTML["HTML bytes\n(network)"]
        DOM["DOM Tree\n(tokenizer → parser\n→ element nodes)"]
        CSSOM["CSSOM Tree\n(parallel CSS parse\n→ style rules)"]
        RENDER["Render Tree\n(DOM + CSSOM merged\ninvisible nodes excluded)"]
        LAYOUT["Layout (Reflow)\n(box model compute:\nwidth, height, position\nCPU-intensive)"]
        PAINT["Paint\n(draw to layers:\nbackgrounds, borders, text\nrasterize to pixels)"]
        COMPOSITE["Composite\n(GPU: merge layers\nwith transforms/opacity\nGPU-accelerated)"]
        HTML --> DOM
        HTML --> CSSOM
        DOM --> RENDER
        CSSOM --> RENDER
        RENDER --> LAYOUT --> PAINT --> COMPOSITE
    end
```

### HTML Tokenizer State Machine

The HTML tokenizer is a state machine with ~80 states. It cannot simply regex-parse HTML due to context-sensitive rules:

```mermaid
stateDiagram-v2
    [*] --> Data: Initial state
    Data --> TagOpen: < character
    TagOpen --> StartTagName: [a-z]
    TagOpen --> EndTagOpen: /
    StartTagName --> BeforeAttributeName: whitespace
    StartTagName --> Data: >
    BeforeAttributeName --> AttributeName: [a-z]
    AttributeName --> BeforeAttributeValue: =
    BeforeAttributeValue --> AttributeValueDoubleQuoted: "
    AttributeValueDoubleQuoted --> AfterAttributeValue: "
    AfterAttributeValue --> Data: >
    Data --> RCDATA: title/textarea start tag
    RCDATA --> Data: matching end tag
```

**Script blocking**: When the parser encounters a `<script>` tag (without `async`/`defer`), it **pauses HTML parsing**, executes the script (which may modify the DOM), then resumes. This is why `<script>` at the end of `<body>` is critical for performance.

---

## 2. JavaScript Event Loop: Microtask vs Macrotask

```mermaid
flowchart TD
    subgraph "V8 Event Loop Phases"
        CALL["Call Stack\n(synchronous execution)"]
        MICRO["Microtask Queue\nPromise.then, queueMicrotask,\nMutationObserver callbacks"]
        MACRO["Macrotask Queue\nsetTimeout, setInterval,\nI/O callbacks, UI events"]
        RAF["requestAnimationFrame\n(before next paint)"]
        RENDER["Render Pipeline\n(layout + paint + composite)"]

        CALL -->|stack empty| MICRO
        MICRO -->|drain ALL microtasks| MICRO
        MICRO -->|queue empty| RAF
        RAF --> RENDER
        RENDER --> MACRO
        MACRO -->|pick one| CALL
    end
```

### Microtask Starvation Example

```javascript
// This BLOCKS rendering indefinitely:
function infiniteMicrotasks() {
    Promise.resolve().then(infiniteMicrotasks);
    // Microtask queue never empties → RAF never runs → page freezes
}

// Correct: yield to macrotask queue
function yieldToRender(callback) {
    setTimeout(callback, 0);  // or: scheduler.postTask()
}
```

### Promise Internal State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending: Promise created
    Pending --> Fulfilled: resolve(value) called
    Pending --> Rejected: reject(reason) called
    Fulfilled --> [*]: .then(onFulfilled) queues microtask
    Rejected --> [*]: .catch(onRejected) queues microtask
    note right of Fulfilled: State is immutable\nonce settled
```

---

## 3. V8 JIT Compilation Pipeline

```mermaid
flowchart LR
    subgraph "V8 Compiler Tiers"
        SRC["JavaScript source"]
        PARSE["Parser → AST\n(Abstract Syntax Tree)"]
        IGN["Ignition Interpreter\n(bytecode — executes immediately)\nCollects type feedback"]
        SPARK["Sparkplug Compiler\n(fast baseline JIT\nbytecode→machine code\nno optimization)\n~10ms warm-up"]
        TURBO["TurboFan Optimizing JIT\n(triggered when function 'hot')\nSpeculative optimization\nbased on type feedback"]
        DEOPT["Deoptimization\n(if assumption violated:\ne.g., type changes)\nFall back to Ignition"]
        SRC --> PARSE --> IGN --> SPARK --> TURBO
        TURBO --> DEOPT --> IGN
    end
```

### TurboFan Speculative Optimization

```mermaid
sequenceDiagram
    participant JS as Hot Function: add(a, b) = a + b
    participant TF as TurboFan
    participant IC as Inline Cache

    Note over IC: Called 10000× with integers
    IC->>TF: Type feedback: a=Smi, b=Smi (small ints)
    Note over TF: Speculate: always integers
    Note over TF: Emit MOV rax,[a], ADD rax,[b], RET
    Note over TF: Insert guard: CHECK type(a)==Smi
    TF-->>JS: Optimized machine code

    Note over JS: Called with add("hello", 5)
    Note over JS: Type guard FAILS (a is String!)
    JS->>TF: DEOPTIMIZE
    TF-->>JS: Back to Ignition bytecode
    Note over IC: Type feedback now: String|Smi\nRe-optimize with union type (slower)
```

### Hidden Classes (Shapes/Maps)

V8 optimizes property access by assigning a **hidden class** (shape) to objects with the same property layout:

```mermaid
flowchart LR
    subgraph "Object Shape Transitions"
        C0["Shape C0: {}"]
        C1["Shape C1: {x: offset=0}"]
        C2["Shape C2: {x: offset=0, y: offset=8}"]

        C0 -->|obj.x = 5| C1
        C1 -->|obj.y = 10| C2
    end
    subgraph "Shape Sharing (Fast)"
        P1["point1 = {x:1, y:2}\n→ Shape C2"]
        P2["point2 = {x:3, y:4}\n→ Shape C2 (same!)"]
        FAST["Property read point1.x:\n  lookup offset[C2.x] = 0\n  read memory[ptr+0]\n  O(1) — no hash table!"]
        P1 --> FAST
        P2 --> FAST
    end
    subgraph "Shape Miss (Slow)"
        P3["point3 = {y:2, x:1}\n→ different shape C3!\n(different insertion order)"]
        SLOW["Cannot share shape with C2\nSeparate shape chain"]
    end
```

---

## 4. React Reconciliation: Fiber Architecture

```mermaid
flowchart TD
    subgraph "React Fiber Tree"
        WIP["Work-In-Progress Tree\n(being built/updated)"]
        CURR["Current Tree\n(on screen)"]
        ALT["alternate pointer:\nFiber nodes recycled\nbetween current and WIP"]
        WIP <--> ALT
        CURR <--> ALT
    end
    subgraph "Fiber Node Structure"
        FN["Fiber {\n  type: 'div' | ComponentFn\n  key: string\n  stateNode: DOM node | class instance\n  child: → first child fiber\n  sibling: → next sibling fiber\n  return: → parent fiber\n  pendingProps: {}\n  memoizedProps: {}\n  memoizedState: Hook list\n  effectTag: UPDATE|PLACEMENT|DELETION\n  updateQueue: linked list of updates\n}"]
    end
```

### Reconciliation: Diffing Algorithm

```mermaid
sequenceDiagram
    participant App as State Update: setCount(5)
    participant Sched as React Scheduler
    participant Render as Render Phase (pure)
    participant Commit as Commit Phase (DOM)

    App->>Sched: scheduleUpdateOnFiber()
    Note over Sched: Assign priority (lane)\nScheduler: postMessage for async work\nor synchronous for urgent updates

    Sched->>Render: beginWork(fiber)\nTop-down tree traversal\n(can be paused/resumed!)
    Note over Render: Compare new element type + key:\n  same type → update props\n  different type → unmount + remount\n  list: key matching for minimal DOM ops

    Render->>Render: completeWork(fiber)\nCollect effectList\n(mutations needed)

    Render->>Commit: Synchronous (cannot pause)\ncommitMutationEffects: apply DOM changes\ncommitLayoutEffects: run useLayoutEffect\ncommitPassiveEffects: run useEffect (async)
```

### Concurrent Mode: Time Slicing

React 18 Concurrent Mode uses the **scheduler** to break rendering work into 5ms slices:

```mermaid
flowchart TD
    WORK["Rendering 1000 components\n~50ms total work"]
    SLICE1["Work slice 1: 5ms\n→ yield to browser"]
    INPUT["Browser: handle user input\n(0.5ms — stays responsive!)"]
    SLICE2["Work slice 2: 5ms"]
    PAINT["Browser: paint frame\n(16ms budget kept!)"]
    CONT["Continue until complete\n(10 slices × 5ms)"]
    WORK --> SLICE1 --> INPUT --> SLICE2 --> PAINT --> CONT
```

---

## 5. Virtual DOM Diffing: Key Algorithm

```mermaid
flowchart TD
    subgraph "Tree Diff O(N) Heuristics"
        H1["Heuristic 1: Different root type\n→ tear down entire subtree\n→ don't recurse into it"]
        H2["Heuristic 2: Same type element\n→ update attributes only\n→ recurse into children"]
        H3["Heuristic 3: key prop on lists\n→ match by key across renders\n→ minimal moves/inserts/deletes"]
    end
    subgraph "List Reconciliation with Keys"
        OLD["Old: [A(key=1), B(key=2), C(key=3)]"]
        NEW["New: [C(key=3), A(key=1), B(key=2)]"]
        DIFF["Without keys: 3 updates (wrong)
With keys:\n  C: move to position 0\n  A: move to position 1\n  B: move to position 2\n= 2 DOM moves (efficient)"]
        OLD --> DIFF
        NEW --> DIFF
    end
```

---

## 6. CSS Cascade and Specificity Computation

```mermaid
flowchart TD
    subgraph "Cascade Order (later wins at same specificity)"
        C1["User-agent stylesheet\n(browser defaults)"]
        C2["User stylesheet\n(accessibility overrides)"]
        C3["Author stylesheets\n(your CSS files)"]
        C4["Author !important"]
        C5["User !important"]
        C6["User-agent !important"]
        C1 --> C2 --> C3 --> C4 --> C5 --> C6
    end
    subgraph "Specificity Calculation (a,b,c,d)"
        S1["(1,0,0,0) — inline style"]
        S2["(0,1,0,0) per ID selector\n#header → (0,1,0,0)"]
        S3["(0,0,1,0) per class/attr/pseudo-class\n.active → (0,0,1,0)\n[type='text'] → (0,0,1,0)"]
        S4["(0,0,0,1) per element/pseudo-element\ndiv → (0,0,0,1)\np::first-line → (0,0,0,2)"]
        EXAMPLE["#nav .item:hover span\n= (0,1,0,0)+(0,0,1,0)+(0,0,1,0)+(0,0,0,1)\n= (0,1,2,1)"]
        S1 --> EXAMPLE
        S2 --> EXAMPLE
        S3 --> EXAMPLE
        S4 --> EXAMPLE
    end
```

---

## 7. Web Performance: Critical Resource Loading

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant Server as Server

    Browser->>Server: GET / (HTML)
    Server-->>Browser: HTML (first byte ~50ms)
    Note over Browser: Parse HTML → discover resources
    
    par Parallel resource loading
        Browser->>Server: GET /style.css (render-blocking!)
        Browser->>Server: GET /bundle.js (defer)
        Browser->>Server: GET /hero.jpg (preload)
    end
    
    Server-->>Browser: style.css
    Note over Browser: CSSOM built → unblock render
    Server-->>Browser: First chunk of bundle.js
    Note over Browser: FCP (First Contentful Paint) possible now
    Server-->>Browser: hero.jpg
    Note over Browser: LCP (Largest Contentful Paint)
    Server-->>Browser: bundle.js complete
    Note over Browser: TTI (Time to Interactive)\nJS parsed + executed
```

### Core Web Vitals Internal Triggers

| Metric | Trigger | Measurement |
|---|---|---|
| LCP | Largest image/text block painted | `PerformanceObserver` type `largest-contentful-paint` |
| FID/INP | Input event → browser response delay | `PerformanceEventTiming.processingStart - startTime` |
| CLS | Layout shift: element moves without user interaction | `LayoutShift.value = impact_fraction × distance_fraction` |

---

## 8. Service Workers: Fetch Interception Internals

```mermaid
sequenceDiagram
    participant Page as Web Page
    participant SW as Service Worker\n(separate thread)
    participant Cache as Cache Storage API
    participant Net as Network

    Page->>SW: fetch('/api/data') [intercepted]
    Note over SW: self.addEventListener('fetch', event)
    SW->>Cache: caches.match(request)
    Cache-->>SW: Cache HIT → cached response
    SW-->>Page: Serve from cache (offline works!)

    Note over SW: Cache MISS scenario:
    SW->>Net: fetch(request) [network request]
    Net-->>SW: Network response
    SW->>Cache: cache.put(request, response.clone())
    SW-->>Page: Network response
```

**Service Worker lifecycle** — separate from page, persists across page loads:
```
Install → Activate → Idle → Fetch/Message
(new SW waits for old clients to close before activating)
```

---

## 9. WebAssembly: Execution Model

```mermaid
flowchart TD
    subgraph "WebAssembly Execution Pipeline"
        C["C/C++/Rust source"]
        WASM["WebAssembly binary\n(.wasm)\nstructured binary format:\nmodule, functions, tables, memory"]
        VALIDATE["Browser validates WASM\n(type-check in O(N) single pass)\nSafer than JS eval"]
        JIT["JIT compile to machine code\n(WASM types are explicit\n→ simpler/faster than JS JIT\n~5% of native speed achievable)"]
        EXEC["Execute in sandboxed linear memory\n(no pointers outside WASM.memory\ncannot access browser internals)"]
        C --> WASM --> VALIDATE --> JIT --> EXEC
    end
    subgraph "WASM Linear Memory"
        MEM["Single contiguous ArrayBuffer\n[0..n MB]\nmanually managed by WASM\n(malloc from emscripten/wasi)\nJS can read/write same buffer\n(shared memory via SharedArrayBuffer)"]
    end
```

---

## 10. HTTP/2 Multiplexing and Head-of-Line Blocking

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant H2 as HTTP/2 Server

    Note over Browser,H2: Single TCP connection, multiple streams
    Browser->>H2: HEADERS frame (stream 1): GET /style.css\n  HEADERS frame (stream 3): GET /bundle.js\n  HEADERS frame (5): GET /image.jpg\n  (all sent in parallel, same connection!)

    H2->>Browser: DATA frame (stream 3): 16KB of bundle.js
    H2->>Browser: DATA frame (stream 1): complete style.css\n  DATA frame (stream 3): next 16KB bundle.js
    H2->>Browser: DATA frame (stream 5): image.jpg

    Note over Browser,H2: HTTP/2 Head-of-Line still present at TCP level:\n  single packet loss stalls ALL streams\nHTTP/3 (QUIC) solves this with\nindependent UDP streams
```

---

## 11. WebSocket: Frame Protocol Internals

```mermaid
flowchart LR
    subgraph "WebSocket Frame Header"
        B0["Byte 0:\n  bit 7: FIN (last fragment)\n  bit 4-6: RSV1-3 (extensions)\n  bit 0-3: opcode\n  (0=continuation,1=text,2=binary\n   8=close,9=ping,A=pong)"]
        B1["Byte 1:\n  bit 7: MASK (client→server must mask)\n  bit 0-6: payload_len\n  (0-125: actual\n   126: next 2 bytes = real len\n   127: next 8 bytes = real len)"]
        MASK["Masking key (4 bytes, if MASK=1)\nXOR with payload bytes cyclically:\n  masked[i] = payload[i] XOR key[i%4]\n  (prevents proxy cache poisoning)"]
        B0 --> B1 --> MASK
    end
```

---

## Frontend Architecture Summary

```mermaid
block-beta
    columns 2
    block:Rendering
        RTree["Render Tree\nDOM+CSSOM merged\nno hidden elements"]
        Layout["Layout/Reflow\nbox positions computed\nexpensive on % widths"]
        Composite["GPU Compositing\ntransform/opacity free\nlayer promotion: will-change"]
    end
    block:JavaScript
        EventLoop["Event Loop\nmicrotask drain first\nRAF before paint"]
        V8JIT["V8 TurboFan\nspeculative optimization\ntype guard deopt"]
        React["React Fiber\ninterruptible render\ntime-sliced Concurrent Mode"]
    end
    block:Network
        H2["HTTP/2\nmultiplexed streams\nheader compression HPACK"]
        CRP["Critical Render Path\nCSS render-blocking\nJS parser-blocking"]
        SW["Service Worker\nfetch interception\noffline caching"]
    end
    block:Security
        CSP["Content Security Policy\nscript-src restrict\nprevents XSS"]
        CORS["CORS\npreflight OPTIONS\nAccess-Control headers"]
        SameSite["SameSite Cookie\nLax/Strict/None\nCSRF prevention"]
    end
```
