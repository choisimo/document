# Python Internals: Under the Hood

> Synthesized from: Beazley *Python Essential Reference*, Ramalho *Fluent Python* 2nd ed, Martelli *Python in a Nutshell*, CPython source internals, and comp(19/20/32/44/46-47/55/61/64-65/75/77/192/202) Python references.

---

## 1. CPython Object Model — Everything is a PyObject

Every Python value, from integers to functions to classes, is a heap-allocated `PyObject`. This is the foundation of Python's runtime.

### PyObject Structure

```c
// Base type — every Python object starts with this
typedef struct _object {
    Py_ssize_t ob_refcnt;      // reference count (for garbage collection)
    PyTypeObject *ob_type;     // pointer to type object (= type(obj))
} PyObject;

// Variable-length objects (lists, tuples, bytes) extend with:
typedef struct {
    PyObject ob_base;
    Py_ssize_t ob_size;        // number of items
} PyVarObject;

// Integer example:
typedef struct {
    PyObject ob_base;
    Py_ssize_t ob_digit_count; // number of 30-bit digits
    digit ob_digit[1];         // digits array (arbitrary precision!)
} PyLongObject;
```

```mermaid
flowchart TD
    subgraph Heap["Python Heap (PyMalloc arenas)"]
        I1["PyObject at 0x7f...\nob_refcnt = 3\nob_type → &PyLong_Type\nob_digit[0] = 42"]
        I2["PyObject\nob_refcnt = 1\nob_type → &PyUnicode_Type\nob_hash = -1\nob_data → 'hello'"]
        L1["PyListObject\nob_refcnt = 2\nob_type → &PyList_Type\nob_size = 3\nob_item → [ptr1, ptr2, ptr3]"]
    end
    
    L1 -->|"ob_item[0]"| I1
    L1 -->|"ob_item[1]"| I2
```

### Small Integer Cache

CPython pre-allocates integer objects for values **-5 to 256**. All references to `x = 5` point to the **same** PyLongObject:

```python
a = 256
b = 256
a is b   # True — same object
a = 257
b = 257
a is b   # False — separate objects (outside cache range)
```

```mermaid
flowchart LR
    subgraph static_ints["CPython static array: small_ints[-5..256]"]
        INT_5["PyLongObject(-5)\nob_refcnt = ∞ (immortal)"]
        INT0["PyLongObject(0)"]
        INT1["PyLongObject(1)"]
        INT256["PyLongObject(256)"]
    end
    
    A["a = 1"] --> INT1
    B["b = 1"] --> INT1
    C["c = 0"] --> INT0
```

String interning: short identifier-like strings (alphanumeric, ≤20 chars typically) are interned in a global dict `interned`. `'hello' is 'hello'` → True. Arbitrary strings: no guarantee.

---

## 2. Reference Counting and Garbage Collection

### Py_INCREF / Py_DECREF — The Atomic Operations

```c
#define Py_INCREF(op) ((op)->ob_refcnt++)
#define Py_DECREF(op)                        \
    do {                                      \
        if (--((op)->ob_refcnt) == 0)         \
            _Py_Dealloc(op);                  \
    } while(0)
```

Every Python operation that creates a reference increments; every operation that releases decrements. When `ob_refcnt == 0` → `_Py_Dealloc()` called → object's `tp_dealloc` slot invoked → memory returned to `PyMalloc`.

### Cyclic Garbage Collector

Reference counting cannot collect cycles:

```python
a = []
b = [a]
a.append(b)   # a.ob_refcnt = 2, b.ob_refcnt = 2
del a, del b  # both drop to 1 — NOT 0 — leak!
```

```mermaid
flowchart TD
    subgraph Generations["GC Generations (gc.collect)"]
        G0["Generation 0\n~100 objects threshold\nmost recently created\ncollected frequently (~700µs)"]
        G1["Generation 1\nsurvived 1 gen-0 collection\ncollected less often"]
        G2["Generation 2\nlong-lived objects\ncollected rarely (~500ms)"]
    end

    G0 -->|"survived"| G1
    G1 -->|"survived"| G2
    
    subgraph Algorithm["Cycle Detection (tricolor mark)"]
        SCAN["1. For each object in generation:\ncopy ob_refcnt → gc_refs\n2. For each object, traverse refs:\ndecrement gc_refs of referents"]
        SCAN --> MARK["3. Objects with gc_refs > 0:\nreachable from outside — MARK LIVE"]
        MARK --> SWEEP["4. Unreachable (gc_refs == 0):\npart of cycle → tp_dealloc"]
    end
```

**GIL interaction**: Cyclic GC runs with GIL held (world stop). Large gen-2 collections on CPython can pause for 10-50ms — visible in latency-sensitive apps. Mitigation: `gc.disable()` + manual `gc.collect()` scheduling, or avoid reference cycles.

---

## 3. CPython Bytecode and Eval Loop

### Compilation Pipeline

```mermaid
flowchart TD
    SRC["source.py"] --> PARSE["Python Parser\nTokenizer → CST\nCST → AST (ast module)"]
    PARSE --> COMPILE["Compiler (compile.c)\nSymbol table analysis\nScope resolution (local/global/free)\nBytecode generation"]
    COMPILE --> CO["code object (PyCodeObject)\n.co_code: bytes of opcodes\n.co_consts: [None, 42, 'hello', ...]\n.co_varnames: ['x', 'y', ...]\n.co_freevars: closure variables\n.co_stacksize: max eval stack depth"]
    CO --> EXEC["exec()\nFrame object (PyFrameObject) created\nEval loop begins"]
```

### PyCodeObject and PyFrameObject

```c
typedef struct {
    PyObject_HEAD
    int co_argcount;        // number of positional args
    int co_nlocals;         // number of local variables
    int co_stacksize;       // max eval stack depth needed
    PyObject *co_code;      // bytes: [opcode, arg, opcode, arg, ...]
    PyObject *co_consts;    // tuple: constants referenced by LOAD_CONST
    PyObject *co_varnames;  // tuple: local variable names
    PyObject *co_freevars;  // tuple: names from enclosing scope (closures)
    PyObject *co_filename;
    int co_firstlineno;
    PyObject *co_lnotab;    // line number table: offset → lineno mapping
} PyCodeObject;

typedef struct _frame {
    PyObject_VAR_HEAD
    struct _frame *f_back;      // caller frame (linked list)
    PyCodeObject *f_code;       // code object being executed
    PyObject **f_locals;        // local variable array
    PyObject **f_valuestack;    // base of eval stack
    PyObject **f_stacktop;      // top of eval stack (current)
    int f_lasti;                // index of last attempted instruction
    int f_lineno;               // current line number
} PyFrameObject;
```

### Bytecode — Example Disassembly

```python
def add(a, b):
    return a + b

import dis
dis.dis(add)
```

```
  2           0 LOAD_FAST                0 (a)    ← push locals[0] onto eval stack
              2 LOAD_FAST                1 (b)    ← push locals[1]
              4 BINARY_ADD                        ← pop 2, push result
              6 RETURN_VALUE                      ← pop and return
```

### CPython Eval Loop (ceval.c) — Simplified

```c
for (;;) {
    opcode = *next_instr++;
    oparg  = *next_instr++;
    
    switch(opcode) {
    case LOAD_FAST:
        PyObject *val = fastlocals[oparg];
        Py_INCREF(val);
        PUSH(val);
        break;
    case BINARY_ADD:
        PyObject *right = POP();
        PyObject *left  = TOP();
        PyObject *res   = PyNumber_Add(left, right);  // dispatch through nb_add slot
        Py_DECREF(right); Py_DECREF(left);
        SET_TOP(res);
        break;
    case RETURN_VALUE:
        return POP();
    // ... ~150 more opcodes
    }
    
    // Check for GIL release every sys.getswitchinterval() (5ms default)
    if (--eval_breaker) { check_signals(); maybe_release_GIL(); }
}
```

---

## 4. The GIL — Global Interpreter Lock

### What the GIL Protects

```mermaid
flowchart TD
    subgraph GIL_Protected["GIL-protected shared state"]
        RC["ob_refcnt on every object\n(non-atomic increment/decrement\nwould race without GIL)"]
        MALLOC["PyMalloc arena state\n(free list pointers)"]
        DICT["Global dict operations\n(import sys, builtins)"]
        GC["Cyclic GC state\n(generation lists)"]
    end
    
    T1["Thread 1\nrunning Python bytecode"] -->|"holds GIL"| GIL_Protected
    T2["Thread 2\nblocked on GIL"] -.->|"waiting"| GIL_Protected
```

### GIL Release Mechanism

```mermaid
sequenceDiagram
    participant T1 as Thread 1
    participant T2 as Thread 2
    participant GIL

    T1->>GIL: holds GIL, running bytecode
    Note over T1: eval_breaker counter → 0 (every 5ms)
    T1->>GIL: _PyEval_DropGIL()\ndrop GIL, signal waiting threads
    T2->>GIL: _PyEval_TakeGIL()\nwait on mutex+condvar → acquire
    T2->>T2: run bytecode (5ms slice)
    T1->>GIL: request GIL back
    Note over T2: sees eval_breaker → drops GIL
    T1->>GIL: reacquire → continue
```

**GIL-free operations**: I/O (read/write/socket), numpy C extensions, ctypes calls — all release GIL while in C code. CPU-bound C extensions (hashlib, zlib, etc.) also release GIL. Only pure Python bytecode execution holds GIL continuously.

**True parallelism**: `multiprocessing` module — separate processes, separate GILs, communicate via pipes/shared memory. PEP 703 (CPython 3.13 experimental): no-GIL build using per-object fine-grained locks and biased reference counting.

---

## 5. Python Memory Manager — PyMalloc

### Three-Level Allocator

```mermaid
flowchart TD
    subgraph PyMalloc
        ARENAS["Arenas: 256KB each\nallocated with mmap/VirtualAlloc\naligned to 256KB boundary"]
        POOLS["Pools: 4KB each within arena\neach pool holds one size class\n(8, 16, 24, ... 512 bytes)"]
        BLOCKS["Blocks: fixed-size within pool\nfreeblock linked list"]
    end
    
    REQ["malloc(size ≤ 512B)"] --> POOLS
    REQ2["malloc(size > 512B)"] -->|"bypass PyMalloc"| GLIBC["glibc malloc / OS"]
    POOLS --> BLOCKS
```

```
Arena (256KB):
+--[pool 0: 4KB]--+--[pool 1: 4KB]--+-- ... --+--[pool 63: 4KB]--+

Pool for 32-byte size class:
+--[header: 8B]--+--[block0: 32B]--+--[block1: 32B]-- ... --+--[block126: 32B]--+
                   ↑ freeblock linked list chains free blocks
```

**usedpools[64]**: Array of pool pointers, one per size class. `malloc(size)` → round up to 8-byte boundary → `size_class = (size-1) / 8` → `pool = usedpools[size_class]` → pop block from pool's freelist.

---

## 6. Descriptors and the Attribute Lookup Protocol

### Attribute Lookup Algorithm (`__getattribute__`)

```mermaid
flowchart TD
    A["obj.attr"] --> B["type(obj).__mro__\n= [type(obj), Base1, Base2, object]"]
    B --> C{"attr in type(obj).__dict__\nor any MRO class?"}
    C -->|"Yes, and is data descriptor\n(has __get__ AND __set__)"| D["descriptor.__get__(obj, type(obj))\ndata descriptor wins over instance dict"]
    C -->|"No data descriptor"| E{"attr in obj.__dict__?"}
    E -->|"Yes"| F["Return obj.__dict__['attr']\ninstance variable wins"]
    E -->|"No"| G{"non-data descriptor\n(has __get__ only)?"}
    G -->|"Yes"| H["descriptor.__get__(obj, type(obj))"]
    G -->|"No"| I["Return class attribute\nAttributeError if not found"]
```

**Property** is a data descriptor:
```python
class Property:
    def __init__(self, fget): self.fget = fget
    def __get__(self, obj, cls):
        if obj is None: return self          # class access → return descriptor itself
        return self.fget(obj)                # instance access → call getter
    def __set__(self, obj, val): raise AttributeError  # data descriptor (blocks instance __dict__)
```

**Function → bound method**: `function.__get__(instance, cls)` returns a `PyMethodObject` wrapping `(self, func)`. Every `obj.method` call dynamically creates a method object (unless cached by `functools.cached_property`).

---

## 7. Generator and Coroutine Internals

### Generator Frame Suspension

```mermaid
stateDiagram-v2
    [*] --> CREATED: gen = gen_func()
    CREATED --> RUNNING: next(gen) / send(val)
    RUNNING --> SUSPENDED: yield expr\n(frame saved, control returned)
    SUSPENDED --> RUNNING: next(gen) / send(val)\n(frame restored, eval continues)
    SUSPENDED --> CLOSED: gen.close() / gen.throw()\nGeneratorExit raised at yield point
    RUNNING --> CLOSED: return / StopIteration raised
    CLOSED --> [*]
```

When `yield` executes:
1. Current `f_stacktop` saved in frame
2. `f_lasti` updated to current instruction index
3. Frame's `f_executing` flag cleared
4. Frame **not** freed — kept alive by generator object
5. Yielded value returned to `next()` caller

When `next()` resumes:
1. Same `PyFrameObject` passed back to `_PyEval_EvalFrameDefault()`
2. `f_lasti` resumes from saved instruction
3. Eval stack restored from `f_valuestack`

### async/await — Event Loop Integration

```mermaid
sequenceDiagram
    participant EL as asyncio Event Loop
    participant CO as coroutine: async def fetch()
    participant IO as I/O (epoll/kqueue)

    EL->>CO: send(None) [initial start]
    CO->>IO: await asyncio.sleep(1)\n→ coroutine yields Future object
    CO-->>EL: yield Future (suspended)
    EL->>IO: register future callback with epoll
    Note over EL: select() / epoll_wait() — no busy wait
    IO-->>EL: timeout fires → callback invoked
    EL->>CO: send(None) [resume]
    CO-->>EL: return result / StopIteration
```

`await expr` compiles to `GET_AWAITABLE` + `YIELD_FROM` bytecodes. The coroutine object is itself an iterator whose `__next__` drives the inner awaitable until it completes.

---

## 8. Python's Data Model — Special Methods and Slots

### Type Object Slots

```c
typedef struct _typeobject {
    PyObject_VAR_HEAD
    const char *tp_name;           // "int", "str", "list", ...
    Py_ssize_t tp_basicsize;       // sizeof(PyXxxObject)
    
    // Number protocol
    PyNumberMethods *tp_as_number; // nb_add, nb_sub, nb_mul, nb_truediv, ...
    
    // Sequence protocol  
    PySequenceMethods *tp_as_sequence; // sq_length, sq_item, sq_contains, ...
    
    // Mapping protocol
    PyMappingMethods *tp_as_mapping;   // mp_length, mp_subscript, ...
    
    // Core slots
    hashfunc tp_hash;       // __hash__
    reprfunc tp_repr;       // __repr__
    ternaryfunc tp_call;    // __call__
    destructor tp_dealloc;  // called when ob_refcnt → 0
    
    // Attribute access
    getattrofunc tp_getattro;  // __getattr__/__getattribute__
    setattrofunc tp_setattro;  // __setattr__/__delattr__
    
    PyObject *tp_dict;      // class __dict__
    PyObject *tp_bases;     // tuple of base classes
    PyObject *tp_mro;       // tuple: Method Resolution Order
} PyTypeObject;
```

`a + b` → `PyNumber_Add(a, b)` → check `type(a)->tp_as_number->nb_add` → if NotImplemented, check `type(b)->tp_as_number->nb_add`. Special methods bypassed for built-in types (direct slot call, faster than dict lookup).

---

## 9. Dictionary Internals — Compact Hash Table

### CPython dict (Python 3.6+ compact layout)

```
indices array (sparse):
[0]: slot=2   [1]: empty   [2]: slot=0   [3]: slot=1   ...
  ↑ 1 byte per entry (small dicts), 2 or 4 for larger

entries array (dense):
slot 0: {hash=0x..., key="name",   value="Alice"}
slot 1: {hash=0x..., key="age",    value=30}
slot 2: {hash=0x..., key="region", value="US"}
```

Lookup `d["age"]`:
1. `h = hash("age")` → e.g. `0x7f3a...`
2. `i = h % len(indices)` → index into indices array
3. `slot = indices[i]` → 1 (if hit, or LINEAR_PROBE on collision)
4. `entries[1].hash == h` and `entries[1].key == "age"` → return `entries[1].value`

```mermaid
flowchart LR
    A["d['age'] lookup"] --> B["hash('age') = H"]
    B --> C["i = H % 8 = 3\nindices[3] = slot 1"]
    C --> D["entries[1].hash == H?\nentries[1].key == 'age'?\n→ YES → return entries[1].value = 30"]
    
    E["Collision: indices[3] already occupied"] --> F["linear probe: i = (i*5+1+H>>5) % 8\ntry next slot until empty or match"]
```

**Dict resize**: When `size / capacity > 2/3`, resize to `capacity * 2`. Entire indices array rebuilt. All entries rehashed. Dict keeps insertion order (guaranteed since Python 3.7) via dense entries array maintaining insertion sequence.

---

## 10. Import System Internals

```mermaid
flowchart TD
    A["import numpy"] --> B["sys.modules cache check\n'numpy' in sys.modules?"]
    B -->|"Yes (cached)"| C["Return cached module object\nO(1) dict lookup"]
    B -->|"No"| D["sys.meta_path finders\n[BuiltinImporter, FrozenImporter, PathFinder]"]
    D --> E["PathFinder searches sys.path\n['/usr/lib/python3.11', 'site-packages', ...]"]
    E --> F["numpy/__init__.py found\nSourceFileLoader.load_module()"]
    F --> G["Compile: py_compile → .pyc\n(.pyc = magic + mtime + marshal(code_obj))"]
    G --> H["exec(code_obj, module.__dict__)\nTop-level numpy code executed\nAll numpy.* names added to module dict"]
    H --> I["sys.modules['numpy'] = module\nReturn module to caller"]
```

**.pyc cache**: `__pycache__/numpy.cpython-311.pyc`. Magic number = interpreter version. If source mtime unchanged and magic matches → load bytecode directly, skip recompile. `marshal.loads()` deserializes code object from .pyc bytes.

---

## 11. Python Performance Internals

### Profiling at Bytecode Level

```mermaid
flowchart LR
    A["Python code"] -->|"cProfile\n(C-level hook: c_call/c_return/call/return events)"| B["Per-function stats:\ntottime, cumtime, ncalls"]
    A -->|"line_profiler\n(settrace on each line)"| C["Per-line timing\n~10x overhead vs cProfile"]
    A -->|"memory_profiler\n(tracemalloc)"| D["Per-line allocation delta\nmemory snapshots"]
```

### Common Performance Patterns

| Pattern | Why Slow | Fix |
|---------|----------|-----|
| `str += str` in loop | O(n²) — new allocation each concat | `''.join(list)` |
| `[x for x in gen] * N` | Eagerly materializes | lazy iteration |
| `dict[key]` in loop without `.get()` | KeyError exception path | `dict.get(key, default)` |
| Global variable access | `LOAD_GLOBAL` → dict lookup | bind to local: `g = global_var` |
| `append` vs `extend` | Repeated single-item inserts | batch with `extend` |
| Pure Python loops | ~100 bytecodes/µs | numpy vectorization |

### NumPy — How it Bypasses CPython Slowness

```mermaid
flowchart TD
    A["np.sum(arr) where arr is ndarray of 1M floats"] 
    A --> B["Python call: np.sum → C function"]
    B --> C["GIL released\nC loop: sum += arr[i] for i in 0..999999\nAVX-256 SIMD: 8 doubles per instruction\n~10M flops/cycle on modern CPU"]
    C --> D["GIL reacquired\nReturn Python float"]
    
    E["Pure Python: sum([...]) with 1M floats"] 
    E --> F["1M × BINARY_ADD opcodes\n1M × ob_refcnt++/--\n1M × PyFloat heap objects\n~50-100x slower than numpy"]
```

---

## Python Runtime Numbers Reference

| Operation | Time | Notes |
|-----------|------|-------|
| Python bytecode execution | ~100 ns/opcode | per eval loop iteration |
| Function call overhead | ~100-200 ns | frame create + locals setup |
| Attribute lookup (dict) | ~50-100 ns | LOAD_ATTR + tp_getattro |
| Method call (bound method) | ~200-300 ns | __get__ + call overhead |
| List append | ~50 ns | amortized (capacity doubling) |
| Dict lookup | ~50-100 ns | hash + index + compare |
| GC cycle collection (gen-0) | ~100 µs | ~100 objects |
| GC cycle collection (gen-2) | ~10-100 ms | thousands of objects |
| Import cached module | ~100 ns | sys.modules dict lookup |
| Import cold (compile+exec) | 10-500 ms | compile + exec top-level code |
| Thread GIL switch interval | 5 ms | sys.getswitchinterval() |
