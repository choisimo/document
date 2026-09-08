---
title: "알고리즘"
---

# 알고리즘 {#algorithms-data-structures}

<nav class="hub-directory" aria-label="알고리즘 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">주요 문서</h2>

- [C/C++ 포인터](pointers.md)
- [함수 포인터와 콜백](function-pointers.md)
- [Python OOP 패턴](oop-patterns.md)
- [실전 알고리즘](algorithm-architect/index.md)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">함께 읽기</h2>

- [컴파일러](../compiler/index.md)
- [Java 핵심 개념](../java/core-concepts.md)
- [운영체제](../os/index.md)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

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

</details>
