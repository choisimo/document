# GCC Installation Guide

> Version-aware GNU Compiler Collection setup examples for C/C++ development

---

## Scope and Verification Contract

- **Scope:** Pin the GCC release, target triple, host OS and distribution, C/C++ language standard, linker, libc, build type, and package source. Installation commands and available flags vary across those inputs.
- **Assumptions:** Warnings, optimization, debug information, ABI, sanitizer behavior, and generated code depend on flags and source language. A successful compile does not establish program correctness or portability.
- **Facts and inference:** Compiler diagnostics and generated artifacts are evidence; a performance or undefined-behavior explanation remains a hypothesis until tests, sanitizers, profiles, and assembly support it.
- **Failure and completion:** Treat warnings selected by policy, link errors, sanitizer findings, test failures, ABI mismatch, and target runtime failure explicitly. Completion requires the pinned compiler, clean policy checks, passing tests, and a reproducible build command.

---

## Quick Start

### Check Existing Installation

```bash
gcc --version
g++ --version
```

---

## Installation

### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install build essentials (includes gcc, g++, make)
sudo apt-get install build-essential

# Verify installation
gcc --version
```

### Arch Linux

```bash
sudo pacman -S base-devel
```

### CentOS/RHEL

```bash
sudo yum groupinstall "Development Tools"
# or for newer versions
sudo dnf groupinstall "Development Tools"
```

---

## Usage Examples

### Compile C Program

```bash
# Basic compilation
gcc -o program program.c

# With warnings enabled
gcc -Wall -o program program.c

# With debugging symbols
gcc -g -o program program.c

# Optimized build
gcc -O2 -o program program.c
```

### Compile C++ Program

```bash
# Basic compilation
g++ -o program program.cpp

# C++17 standard
g++ -std=c++17 -o program program.cpp

# With all warnings
g++ -Wall -Wextra -o program program.cpp
```

---

## Common Flags

| Flag | Description |
|------|-------------|
| `-o <file>` | Output filename |
| `-Wall` | Enable a broad, documented warning set; it does not enable every GCC warning |
| `-Wextra` | Extra warnings |
| `-g` | Include debug info |
| `-O0/O1/O2/O3` | Optimization levels |
| `-std=c17` | C17 standard |
| `-std=c++17` | C++17 standard |
| `-I<path>` | Include directory |
| `-L<path>` | Library directory |
| `-l<lib>` | Link library |

---

## Makefile Example

```makefile
CC = gcc
CFLAGS = -Wall -Wextra -g
TARGET = program
SRCS = main.c utils.c
OBJS = $(SRCS:.c=.o)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c
	$(CC) $(CFLAGS) -c $<

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: clean
```

---

## Troubleshooting

### Common Issues

**"command not found"**
```bash
# Reinstall build-essential
sudo apt-get install --reinstall build-essential
```

**Missing headers**
```bash
# Install development libraries
sudo apt-get install libc6-dev
```

---

## Related Documentation

- [Java Installation](java-install.md)
