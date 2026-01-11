<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Understanding fork() System Call and Memory Management in Unix/Linux

When a Unix/Linux process creates a new process using the fork() system call, a complex but elegant memory management mechanism takes place. This explanation will demonstrate how parent and child processes interact with memory during and after a fork() operation.

## The fork() System Call Explained

The fork() system call creates a new process (called the child) by duplicating the calling process (the parent). After fork() completes, two processes continue to run the same program, but with different return values from fork():

- In the parent process: fork() returns the PID of the newly created child
- In the child process: fork() returns 0
- On failure: fork() returns -1

A key characteristic of fork() is that the child process does not start execution from the beginning of the program. Instead, both processes continue execution from the point immediately after the fork() call[^1].

## Memory Mechanism During fork()

The memory handling during fork() is what makes this system call particularly interesting. Let's visualize this process:

### Before fork()

```
Parent Process Memory Space
+---------------------------+
|      Program Code         |
+---------------------------+
|      Global Variables     |
+---------------------------+
|         Heap              |
|                           |
+---------------------------+
|           |               |
|   Stack   | (grows down)  |
|           v               |
+---------------------------+
|    PC → at fork() call    |
+---------------------------+
```


### The fork() Call

When fork() is called, the operating system creates a new process entry in its process table and duplicates the parent's memory space:

```
                fork()
                   │
                   ▼
+------------------+-------------------+
|                  |                   |
| Parent Process   |   Child Process   |
|                  |                   |
+------------------+-------------------+
```


### After fork() - Logical View

After fork() completes, both processes have their own memory spaces with identical content:

```
Parent Process Memory Space      Child Process Memory Space
+---------------------------+    +---------------------------+
|      Program Code         |    |      Program Code         |
+---------------------------+    +---------------------------+
|      Global Variables     |    |      Global Variables     |
+---------------------------+    +---------------------------+
|         Heap              |    |         Heap              |
|                           |    |                           |
+---------------------------+    +---------------------------+
|           |               |    |           |               |
|   Stack   | (grows down)  |    |   Stack   | (grows down)  |
|           v               |    |           v               |
+---------------------------+    +---------------------------+
| PC → after fork() call    |    | PC → after fork() call    |
| fork() returns child PID  |    | fork() returns 0          |
+---------------------------+    +---------------------------+
```


### Actual Memory Implementation (Copy-on-Write)

Modern operating systems don't actually create a complete copy of the parent's memory when fork() is called. Instead, they use a technique called "copy-on-write" (COW) to optimize memory usage:

```
                    Physical Memory Pages
                    +------------------+
                    |    Page 1        |
                    +------------------+
                    |    Page 2        |
                    +------------------+
                    |    Page 3        |
                    +------------------+
                    |    Page 4        |
                    +------------------+
                           ▲   ▲
                           │   │
                           │   │
                           │   │
                       ┌───┘   └───┐
                       │           │
                       │           │
    Parent Process     │           │     Child Process
    Page Table         │           │     Page Table
+------------------+   │           │   +------------------+
| Virtual → Physical|  │           │   | Virtual → Physical|
+------------------+   │           │   +------------------+
| Page 1 → Page 1   |──┘           └──| Page 1 → Page 1   |
+------------------+                  +------------------+
| Page 2 → Page 2   |─────────────────| Page 2 → Page 2   |
+------------------+                  +------------------+
| Page 3 → Page 3   |─────────────────| Page 3 → Page 3   |
+------------------+                  +------------------+
| Page 4 → Page 4   |─────────────────| Page 4 → Page 4   |
+------------------+                  +------------------+
```

When either process modifies a memory page, only then is a copy made:

```
                    Physical Memory Pages
                    +------------------+
                    |    Page 1        |
                    +------------------+
                    |    Page 2        |        +------------------+
                    +------------------+        |    Page 2'       | (Copy created)
                    |    Page 3        |        +------------------+
                    +------------------+
                    |    Page 4        |
                    +------------------+
                           ▲   ▲             ▲
                           │   │             │
                           │   │             │
                           │   │             │
                       ┌───┘   └───┐         │
                       │           │         │
                       │           │         │
    Parent Process     │           │     Child Process
    Page Table         │           │     Page Table
+------------------+   │           │   +------------------+
| Virtual → Physical|  │           │   | Virtual → Physical|
+------------------+   │           │   +------------------+
| Page 1 → Page 1   |──┘           └──| Page 1 → Page 1   |
+------------------+                  +------------------+
| Page 2 → Page 2   |─────────────────| Page 2 → Page 2'  |──┘
+------------------+                  +------------------+
| Page 3 → Page 3   |─────────────────| Page 3 → Page 3   |
+------------------+                  +------------------+
| Page 4 → Page 4   |─────────────────| Page 4 → Page 4   |
+------------------+                  +------------------+
```


## Practical Example

To illustrate this further, consider this simple code example:

```c
#include &lt;stdio.h&gt;
#include &lt;unistd.h&gt;

int main() {
    int x = 5;  // Variable in memory
    
    printf("Before fork: x = %d (address: %p)\n", x, &amp;x);
    
    pid_t pid = fork();
    
    if (pid &lt; 0) {
        // Fork failed
        fprintf(stderr, "Fork failed\n");
        return 1;
    } else if (pid == 0) {
        // Child process
        printf("Child: x = %d (address: %p)\n", x, &amp;x);
        x = 10;  // Child modifies x
        printf("Child after change: x = %d (address: %p)\n", x, &amp;x);
    } else {
        // Parent process
        printf("Parent: x = %d (address: %p)\n", x, &amp;x);
        x = 20;  // Parent modifies x
        printf("Parent after change: x = %d (address: %p)\n", x, &amp;x);
    }
    
    return 0;
}
```

In this example, both parent and child initially see the same value of x (5), and the memory addresses reported will appear the same (though they refer to different physical memory after fork()). When either process modifies x, the copy-on-write mechanism creates a separate physical copy of that memory page, allowing each process to maintain its own independent value (10 for the child, 20 for the parent).

## Key Insights About fork() and Memory

1. fork() creates an almost exact duplicate of the parent process
2. Both processes continue execution from the point after fork()
3. Modern systems use copy-on-write to optimize memory usage, only creating copies of memory pages when they are modified
4. This mechanism allows for efficient process creation while maintaining memory isolation between processes

This memory management strategy makes fork() both powerful and efficient, enabling the creation of new processes without excessive memory overhead.

<div style="text-align: center">⁂</div>

[^1]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_157cbbc5-2d04-471a-bf77-0872dd2b6e1a/0c3c218f-c920-40e8-bdc5-fef1f312f4ea/Jeffrey-Richter-Christophe-Nasarre-Windows-via-C_C-2011-Microsoft-Press.pdf

[^2]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_157cbbc5-2d04-471a-bf77-0872dd2b6e1a/d4e81d99-1a79-49d6-99d0-38f18da44e5b/Herbert-Bos_Modern-OS-system.pdf

[^3]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_157cbbc5-2d04-471a-bf77-0872dd2b6e1a/f7e30152-3084-441c-ad82-f435c4ce193d/Noam-Nisan-Shimon-Schocken-The-Elements-of-Computing-Systems-_-Building-a-Modern-Computer-from-First-Principles-2021-MIT-Press-Ltd.pdf

[^4]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_157cbbc5-2d04-471a-bf77-0872dd2b6e1a/805742a8-a55b-49dc-bb94-939f2fc1304f/book-riscv-rev1.pdf

[^5]: https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_157cbbc5-2d04-471a-bf77-0872dd2b6e1a/5b262f1f-d189-416f-adc6-13f998771a74/handy-Kerrisk-Michael-The-Linux-programming-interface-a-Linux-und-UNIX-system-programming-handbook-2018-No-Starch-Press.pdf

[^6]: https://stackoverflow.com/questions/27486873/fork-system-call-and-memory-space-of-the-process

[^7]: https://unix.stackexchange.com/questions/31407/how-does-forking-affect-a-processs-memory-layout

[^8]: https://www.semanticscholar.org/paper/e53e6515d829017b7c9ea2e01b18289486259cb5

[^9]: https://www.semanticscholar.org/paper/eea38e48bfcf10bdf16e623fc337ed1acffb9595

[^10]: https://asciidiagrams.github.io

[^11]: https://github.com/dylanaraps/neofetch/issues/1303

[^12]: https://arthursonzogni.com/Diagon/

[^13]: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/

[^14]: https://gofo-coding.tistory.com/entry/Process-Creation-and-Termination

[^15]: https://gist.github.com/chrishorton/8510732aa9a80a03c829b09f12e20d9c

[^16]: https://askubuntu.com/questions/1424845/what-is-that-linux-command-that-gives-you-a-tight-little-system-summary-that-inc

[^17]: https://github.com/Wren6991/asciiwave

[^18]: https://stackoverflow.com/questions/17024043

[^19]: https://velog.io/@bbamjoong/03-04.-프로세스의-이해-생성-Chapter-3.-Processes-Part-1-Part-2

[^20]: https://openprocessing.org/sketch/1044806/

[^21]: https://unix.stackexchange.com/questions/58145/how-does-copy-on-write-in-fork-handle-multiple-fork

[^22]: https://download.disguise.one/kr/

[^23]: https://www.semanticscholar.org/paper/9c126eb5f376a1033cc688abc73ff905b9a530b7

[^24]: https://www.semanticscholar.org/paper/b9d25c16577646bb502a17b65131e788ef58330b

[^25]: https://arxiv.org/abs/2408.15089

[^26]: https://www.semanticscholar.org/paper/c72b5467f78855b6ece8b4e4638bb5debbd649ab

[^27]: https://arxiv.org/abs/2311.17473

[^28]: https://www.semanticscholar.org/paper/f4bfaf48cf0d7bf9ccf032804aa6bca2edb59c7c

[^29]: https://www.semanticscholar.org/paper/73b9f1a6e7e94e0a7c96d815455f2ba4bc79df0d

[^30]: https://www.semanticscholar.org/paper/5bf8f15cb43bec7a026fac72593fb4c67bc5bfcd

[^31]: https://stackoverflow.com/questions/28650786/the-behavior-of-the-fork-system-call-on-linux-in-this-code/28650871

[^32]: https://blog.naver.com/and_lamyland/221287762947

[^33]: https://stackoverflow.com/questions/32345110/how-can-i-demonstrate-copy-on-write-in-fork-linux

[^34]: https://velog.io/@junttang/OS-2.2-MV-2-Memory-System-Calls

[^35]: https://www.cis.upenn.edu/~jms/cw-fork.pdf

