# Unix/Linux `fork()` 시스템 호출과 메모리 관리

Unix/Linux 프로세스가 `fork()` 시스템 호출로 새 프로세스를 만들면 부모 프로세스와 자식 프로세스가 같은 프로그램의 같은 지점부터 실행을 이어 간다. 현대 운영체제는 이 과정에서 전체 메모리를 즉시 복사하지 않고, copy-on-write(COW) 방식으로 물리 메모리 복사를 지연한다.

## `fork()` 반환값

`fork()`는 호출한 프로세스를 복제하여 자식 프로세스를 만든다. 호출 이후 부모와 자식은 같은 코드 위치, 즉 `fork()` 호출 직후부터 실행된다.

- 부모 프로세스: 새로 생성된 자식 프로세스의 PID 반환
- 자식 프로세스: `0` 반환
- 실패: `-1` 반환

자식 프로세스는 프로그램의 처음부터 다시 시작하지 않는다. 부모와 자식은 `fork()` 이후의 분기 조건과 반환값을 기준으로 서로 다른 경로를 실행한다.

## `fork()` 전 메모리 구조

```text
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
|    PC -> at fork() call   |
+---------------------------+
```

## `fork()` 호출 시점

운영체제는 프로세스 테이블에 자식 프로세스 항목을 만들고, 부모 프로세스의 주소 공간 정보를 자식 프로세스에 복제한다.

```text
                fork()
                   |
                   v
+------------------+-------------------+
|                  |                   |
| Parent Process   |   Child Process   |
|                  |                   |
+------------------+-------------------+
```

## 논리적 주소 공간

`fork()`가 끝나면 부모와 자식은 서로 독립된 가상 주소 공간을 가진 것처럼 보인다. 두 프로세스의 변수 값과 주소는 처음에는 동일하게 관찰될 수 있다.

```text
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
| PC -> after fork() call   |    | PC -> after fork() call   |
| fork() returns child PID  |    | fork() returns 0          |
+---------------------------+    +---------------------------+
```

## 실제 구현: Copy-on-Write

현대 운영체제는 `fork()` 시점에 부모 메모리 전체를 물리적으로 복사하지 않는다. 부모와 자식의 페이지 테이블이 같은 물리 페이지를 가리키도록 설정하고, 해당 페이지를 쓰기 보호 상태로 둔다.

```text
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
                           ^   ^
                           |   |
                       +---+   +---+
                       |           |
    Parent Process     |           |     Child Process
    Page Table         |           |     Page Table
+------------------+   |           |   +------------------+
| Virtual -> Physical|  |           |   | Virtual -> Physical|
+------------------+   |           |   +------------------+
| Page 1 -> Page 1   |--+           +--| Page 1 -> Page 1   |
+------------------+                  +------------------+
| Page 2 -> Page 2   |----------------| Page 2 -> Page 2   |
+------------------+                  +------------------+
| Page 3 -> Page 3   |----------------| Page 3 -> Page 3   |
+------------------+                  +------------------+
| Page 4 -> Page 4   |----------------| Page 4 -> Page 4   |
+------------------+                  +------------------+
```

부모 또는 자식 중 하나가 페이지를 수정하려고 하면 페이지 폴트가 발생하고, 운영체제가 해당 페이지의 물리 복사본을 만든다. 수정한 프로세스의 페이지 테이블만 새 물리 페이지를 가리킨다.

```text
                    Physical Memory Pages
                    +------------------+
                    |    Page 1        |
                    +------------------+
                    |    Page 2        |        +------------------+
                    +------------------+        |    Page 2'       |
                    |    Page 3        |        +------------------+
                    +------------------+
                    |    Page 4        |
                    +------------------+
                           ^   ^             ^
                           |   |             |
                       +---+   +---+         |
                       |           |         |
    Parent Process     |           |     Child Process
    Page Table         |           |     Page Table
+------------------+   |           |   +------------------+
| Virtual -> Physical|  |           |   | Virtual -> Physical|
+------------------+   |           |   +------------------+
| Page 1 -> Page 1   |--+           +--| Page 1 -> Page 1   |
+------------------+                  +------------------+
| Page 2 -> Page 2   |----------------| Page 2 -> Page 2'  |--+
+------------------+                  +------------------+
| Page 3 -> Page 3   |----------------| Page 3 -> Page 3   |
+------------------+                  +------------------+
| Page 4 -> Page 4   |----------------| Page 4 -> Page 4   |
+------------------+                  +------------------+
```

## 예제 코드

```c
#include <stdio.h>
#include <unistd.h>

int main() {
    int x = 5;

    printf("Before fork: x = %d (address: %p)\n", x, &x);

    pid_t pid = fork();

    if (pid < 0) {
        fprintf(stderr, "Fork failed\n");
        return 1;
    } else if (pid == 0) {
        printf("Child: x = %d (address: %p)\n", x, &x);
        x = 10;
        printf("Child after change: x = %d (address: %p)\n", x, &x);
    } else {
        printf("Parent: x = %d (address: %p)\n", x, &x);
        x = 20;
        printf("Parent after change: x = %d (address: %p)\n", x, &x);
    }

    return 0;
}
```

이 예제에서 부모와 자식은 처음에 `x = 5`를 관찰한다. 출력되는 가상 주소는 같아 보일 수 있지만, 프로세스별 가상 주소 공간이 독립되어 있으므로 같은 물리 주소를 의미하지 않는다. 자식이 `x = 10`으로 변경하고 부모가 `x = 20`으로 변경하면 COW 메커니즘이 수정된 페이지의 물리 복사본을 만든다.

## 핵심 정리

1. `fork()`는 부모 프로세스와 거의 같은 자식 프로세스를 만든다.
2. 부모와 자식은 `fork()` 호출 직후 지점부터 실행을 이어 간다.
3. 반환값 차이로 부모와 자식의 실행 경로를 구분한다.
4. 현대 운영체제는 copy-on-write로 물리 메모리 복사를 지연한다.
5. 페이지 수정이 발생한 시점에만 해당 페이지의 물리 복사본이 만들어진다.
6. COW는 프로세스 생성 비용을 줄이면서 부모와 자식의 메모리 격리를 유지한다.

## 참고 링크

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
