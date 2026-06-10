# GCC C/C++ 빌드 환경 학습 및 기록 노트

GCC는 C, C++, Objective-C, Fortran 등 여러 언어를 지원하는 GNU Compiler Collection이다. 개발 환경에서 GCC를 다룬다는 것은 단순히 `gcc --version`을 확인하는 일이 아니라, 전처리, 컴파일, 어셈블, 링크 단계가 어디서 실패하는지 구분할 수 있는 상태를 뜻한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

C/C++ 빌드 오류는 원인이 여러 층에 걸쳐 나타난다. 헤더 파일을 못 찾는 문제, 표준 버전 불일치, 오브젝트 파일 누락, 라이브러리 링크 실패, 런타임 공유 라이브러리 경로 문제가 모두 “컴파일이 안 된다”로 보일 수 있다.

GCC 문서의 목적은 설치 명령을 외우는 것이 아니다. 소스 파일이 실행 파일이 되기까지의 단계를 분해하고, 각 단계에서 어떤 옵션과 파일이 필요한지 확인하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 문서는 다음 내용을 짧게 나열한다.

- `gcc --version`, `g++ --version`으로 설치 확인
- Ubuntu/Debian, Arch, RHEL 계열 설치 명령
- C와 C++ 기본 컴파일 예시
- `-Wall`, `-g`, `-O2`, `-std` 같은 주요 플래그
- 간단한 Makefile 예시

이 내용은 빠른 시작에는 충분하지만, 빌드 실패가 전처리 단계인지 링크 단계인지 구분하는 설명이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 GCC 기반 프로젝트에서 다음을 판단할 수 있는 상태다.

- 현재 시스템에 C와 C++ 컴파일러가 설치되어 있는지 확인한다.
- 소스 파일이 실행 파일로 만들어지는 단계를 설명한다.
- 경고, 디버그 심볼, 최적화, 언어 표준 옵션을 상황에 맞게 선택한다.
- 헤더 검색 경로와 라이브러리 링크 경로를 구분한다.
- Makefile에서 컴파일 단계와 링크 단계를 분리한다.

## 4. 시스템 번역 (Data Flow)

GCC 빌드 흐름은 다음과 같다.

```text
source.c
  -> 전처리
  -> 컴파일
  -> 어셈블
  -> 오브젝트 파일
  -> 링크
  -> 실행 파일
```

파일 관점으로 보면 다음처럼 나뉜다.

```text
main.c + headers
  -> main.i
  -> main.s
  -> main.o
  -> program
```

`gcc` 명령 하나가 이 모든 단계를 한 번에 실행할 수 있지만, 문제가 생기면 단계별로 끊어서 확인해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 대표 확인 |
| --- | --- | --- |
| `gcc` | C 컴파일 드라이버 | `gcc --version` |
| `g++` | C++ 컴파일 드라이버 | `g++ --version` |
| 헤더 파일 | 선언과 매크로 제공 | `-I<path>` |
| 오브젝트 파일 | 컴파일된 중간 산출물 | `gcc -c main.c` |
| 정적 라이브러리 | 링크 시 포함되는 아카이브 | `libname.a` |
| 공유 라이브러리 | 실행 시 로드되는 라이브러리 | `libname.so` |
| Makefile | 반복 빌드 규칙 | `make`, `make clean` |

자주 쓰는 옵션은 다음처럼 역할을 나눈다.

| 옵션 | 역할 |
| --- | --- |
| `-o <file>` | 출력 파일 이름 지정 |
| `-Wall` | 주요 경고 활성화 |
| `-Wextra` | 추가 경고 활성화 |
| `-g` | 디버그 심볼 포함 |
| `-O0`, `-O1`, `-O2`, `-O3` | 최적화 수준 선택 |
| `-std=c17`, `-std=c++17` | 언어 표준 지정 |
| `-I<path>` | 헤더 검색 경로 추가 |
| `-L<path>` | 라이브러리 검색 경로 추가 |
| `-l<name>` | `libname` 라이브러리 링크 |

## 6. 상태 전이 (State Transition)

GCC 환경 구축 상태는 다음처럼 이동한다.

```text
미설치
  -> 컴파일러 설치됨
  -> 단일 파일 컴파일 성공
  -> 경고와 디버그 옵션 적용
  -> 다중 파일 컴파일 성공
  -> 라이브러리 링크 성공
  -> Makefile로 반복 빌드 가능
```

각 단계의 통과 기준은 명확해야 한다.

- 설치 확인: `gcc --version`, `g++ --version`이 성공한다.
- 단일 파일: `gcc -o hello hello.c`가 실행 파일을 만든다.
- 다중 파일: 각 파일을 `.o`로 만들고 마지막에 링크한다.
- 라이브러리: `-I`, `-L`, `-l`의 역할을 구분한다.
- 자동화: `make`만 실행해도 필요한 파일만 다시 빌드된다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- C++ 파일은 링크 단계까지 `g++`를 사용하는 것이 기본이다.
- 경고 옵션은 개발 빌드에서 기본으로 켠다.
- 디버깅이 필요한 빌드는 `-g`를 포함한다.
- 헤더 경로 `-I`와 라이브러리 경로 `-L`을 혼동하지 않는다.
- `-lfoo`는 보통 `libfoo.a` 또는 `libfoo.so`를 찾는다는 뜻이다.
- 컴파일 단계와 링크 단계의 오류 메시지를 분리해서 읽는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

설치 확인은 다음 명령으로 시작한다.

```bash
gcc --version
g++ --version
make --version
```

배포판별 설치 예시는 다음과 같다.

```bash
sudo apt-get update
sudo apt-get install build-essential
```

```bash
sudo pacman -S base-devel
```

```bash
sudo dnf groupinstall "Development Tools"
```

단일 C 파일을 컴파일한다.

```bash
gcc -Wall -Wextra -g -o hello hello.c
./hello
```

C++17 파일은 `g++`와 표준 옵션을 사용한다.

```bash
g++ -std=c++17 -Wall -Wextra -g -o app main.cpp
./app
```

단계를 나누어 확인할 수도 있다.

```bash
gcc -E main.c -o main.i
gcc -S main.i -o main.s
gcc -c main.s -o main.o
gcc main.o -o program
```

다중 파일 빌드는 컴파일과 링크를 분리한다.

```bash
gcc -Wall -Wextra -g -c main.c -o main.o
gcc -Wall -Wextra -g -c utils.c -o utils.o
gcc main.o utils.o -o program
```

간단한 Makefile은 다음처럼 쓴다.

```makefile
CC = gcc
CFLAGS = -Wall -Wextra -g
TARGET = program
SRCS = main.c utils.c
OBJS = $(SRCS:.c=.o)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: clean
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 헤더 파일을 못 찾는 경우다. 오류가 `No such file or directory`이고 대상이 `.h` 파일이면 `-I` 경로 또는 개발용 패키지 설치를 확인한다.

두 번째 실패는 링크 오류다. `undefined reference`가 보이면 컴파일은 되었지만 필요한 오브젝트 파일이나 라이브러리가 링크 명령에 빠졌을 가능성이 높다.

세 번째 실패는 C++ 링크에 `gcc`를 쓰는 경우다. C++ 표준 라이브러리 링크가 누락될 수 있으므로 C++ 최종 링크에는 `g++`를 사용한다.

네 번째 실패는 최적화와 디버깅을 동시에 오해하는 것이다. `-O2` 이상에서는 디버거에서 변수 값이나 실행 순서가 소스와 다르게 보일 수 있다. 문제 재현 단계에서는 `-O0 -g` 조합으로 좁히는 편이 낫다.

## 10. 뇌 확장하기 (Evolution & Variants)

작은 프로젝트는 Makefile만으로 충분하다. 파일 수가 늘어나고 플랫폼별 옵션이 많아지면 CMake나 Meson 같은 빌드 시스템을 검토한다.

라이브러리 의존성이 많아지면 `pkg-config`를 사용해 컴파일 옵션과 링크 옵션을 조회할 수 있다.

성능 분석이 필요하면 최적화 수준, 링크 타임 최적화, 프로파일링 빌드, 디버그 심볼 분리 전략을 별도로 다룬다.

컨테이너에서 빌드한다면 호스트 GCC 버전보다 컨테이너 이미지의 컴파일러와 libc 버전을 기준으로 판단해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `gcc`, `g++`, `make` 버전을 확인했다.
- [ ] 단일 C 파일과 C++ 파일을 각각 빌드했다.
- [ ] 전처리, 컴파일, 어셈블, 링크 단계를 설명할 수 있다.
- [ ] `-I`, `-L`, `-l` 옵션의 차이를 이해했다.
- [ ] 개발 빌드에서 `-Wall -Wextra -g`를 사용한다.
- [ ] 다중 파일 빌드를 오브젝트 파일과 링크 단계로 나누었다.
- [ ] Makefile로 반복 빌드를 실행할 수 있다.
- [ ] 링크 오류와 컴파일 오류를 구분해서 읽을 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

GCC 빌드는 소스 파일을 바로 실행 파일로 바꾸는 마법이 아니라 `__________`, 컴파일, 어셈블, `__________` 단계의 파이프라인이다. 헤더 문제는 `__________`, 라이브러리 문제는 `__________` 옵션부터 확인한다.
