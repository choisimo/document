# Algorithms & Data Structures

> Learning resources for algorithms, data structures, and OOP patterns

---

## Audience and learning contract

This index is a suggested route for readers comparing pointer mechanics, callbacks, and object-oriented patterns. The arrows are not strict prerequisites: design patterns do not require mastering raw pointers, and Java references do not expose C++-style pointer arithmetic. Treat each linked page as a separate language-specific guide. A topic is complete when the reader can state its input or ownership contract, explain one failure mode, and run or reason through the supplied example in the stated language version.

## Topics

<div class="grid cards" markdown>

-   :material-cursor-pointer:{ .lg .middle } **Pointers**

    ---

    In-depth guide to C/C++ pointers, memory management, and common patterns.

    [:octicons-arrow-right-24: View Guide](pointers.md)

-   :material-function:{ .lg .middle } **Function Pointers**

    ---

    Comparison of function pointers across languages and callback patterns.

    [:octicons-arrow-right-24: View Guide](function-pointers.md)

-   :material-shape:{ .lg .middle } **OOP Patterns**

    ---

    Object-oriented programming patterns with Python examples.

    [:octicons-arrow-right-24: View Guide](oop-patterns.md)

</div>

---

## Learning Path

```mermaid
flowchart TD
    subgraph Fundamentals
        A[Variables & Memory] --> B[Pointers]
        B --> C[Dynamic Allocation]
    end
    
    subgraph Advanced
        C --> D[Function Pointers]
        D --> E[Callbacks]
        E --> F[Design Patterns]
    end
    
    subgraph OOP
        F --> G[SOLID Principles]
        G --> H[Creational Patterns]
        H --> I[Structural Patterns]
        I --> J[Behavioral Patterns]
    end
```

---

## Concept Overview

### Memory & Pointers

| Concept | Language | Description |
|---------|----------|-------------|
| Raw Pointers | C/C++ | Direct memory address manipulation |
| Smart Pointers | C++ | Automatic memory management |
| References | C++/Java | Alias to existing objects |

### Design Patterns

| Category | Patterns | Use Case |
|----------|----------|----------|
| **Creational** | Singleton, Factory, Builder | Object creation |
| **Structural** | Adapter, Decorator, Proxy | Object composition |
| **Behavioral** | Observer, Strategy, Command | Object interaction |

---

## Quick Reference

### Pointer Operations (C/C++)

```c
int x = 10;
int *ptr = &x;      // Pointer to x
int val = *ptr;     // Dereference: val = 10
int **pptr = &ptr;  // Pointer to pointer
```

### Function Pointer (C)

```c
int (*func_ptr)(int, int);  // Declaration
func_ptr = &add;            // Assignment
int result = func_ptr(3, 4); // Call
```

---

## Related Documentation

- [Compiler Theory](../compiler/index.md)
- [Java Core Concepts](../java/core-concepts.md)
- [Operating Systems](../os/index.md)
