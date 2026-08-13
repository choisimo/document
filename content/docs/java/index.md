# Java 문서

Java 언어와 HotSpot JVM의 입문 자료 인덱스입니다. 예제는 JDK 17·21 중심이지만 공급업체 지원 기간과 내부 동작은 버전·GC 옵션마다 다릅니다. `java -version`과 `javac -version`을 기록하세요.

---

## :fontawesome-brands-java: 문서 목록

<div class="grid cards" markdown>

-   :material-book-open-variant:{ .lg .middle } **핵심 개념**

    ---

    Java 언어의 기본 문법, 객체지향 프로그래밍, 컬렉션 프레임워크

    [:octicons-arrow-right-24: 핵심 개념](core-concepts.md)

-   :material-memory:{ .lg .middle } **메모리와 GC**

    ---

    JVM 메모리 구조, 가비지 컬렉션 알고리즘, 메모리 튜닝

    [:octicons-arrow-right-24: 메모리와 GC](memory-gc.md)

</div>

---

## :material-language-java: Java 생태계 개요

```mermaid
flowchart TD
    subgraph Core["Core Java"]
        A1[OOP 원칙] --> A2[SOLID]
        A3[Collections] --> A4[Generics]
        A5[Streams] --> A6[Lambda]
    end
    
    subgraph Framework["프레임워크"]
        B1[Spring Boot] --> B2[Spring MVC]
        B1 --> B3[Spring Data]
        B1 --> B4[Spring Security]
    end
    
    subgraph Build["빌드 도구"]
        C1[Maven] 
        C2[Gradle]
    end
    
    subgraph Runtime["실행 환경"]
        D1[JVM] --> D2[GC]
        D1 --> D3[JIT Compiler]
    end
    
    Core --> Framework
    Framework --> Build
    Build --> Runtime
```

---

## :material-chart-timeline: Java 버전 역사

| 버전 | 출시년도 | 주요 기능 |
|------|---------|----------|
| **Java 8** | 2014 | Lambda, Stream API, Optional |
| **Java 11** | 2018 | LTS 배포판, 표준 HTTP Client, 단일 파일 소스 실행. 지역 변수 `var`는 Java 10에서 도입 |
| **Java 17** | 2021 | LTS, Sealed Classes, Pattern Matching |
| **Java 21** | 2023 | LTS, Virtual Threads, Record Patterns |

---

## :material-head-cog: JVM 메모리 구조

아래 그림은 전통적인 세대별 힙의 단순 모델입니다. 모든 collector가 연속된 Eden/Survivor/Old 레이아웃이나 `Minor/Major GC` 용어를 동일하게 쓰지는 않습니다.

```mermaid
flowchart TB
    subgraph JVM["JVM Memory"]
        subgraph Heap["Heap (공유)"]
            Y[Young Generation] --> E[Eden]
            Y --> S1[Survivor 1]
            Y --> S2[Survivor 2]
            O[Old Generation]
        end
        
        subgraph NonHeap["Non-Heap"]
            M[Metaspace]
            CC[Code Cache]
        end
        
        subgraph Stack["Stack (스레드별)"]
            T1[Thread 1 Stack]
            T2[Thread 2 Stack]
        end
    end
    
    E -->|Minor GC| S1
    S1 -->|Promotion| O
    O -->|Major GC| O
```

---

## :material-checkbox-marked-circle: OOP 4대 원칙

| 원칙 | 영문 | 설명 | 키워드 |
|------|------|------|--------|
| **캡슐화** | Encapsulation | 데이터와 메서드를 하나로 묶고 외부 접근 제한 | `private`, getter/setter |
| **상속** | Inheritance | 기존 클래스의 특성을 새 클래스가 물려받음 | `extends`, `super` |
| **다형성** | Polymorphism | 같은 인터페이스로 다른 동작 구현 | `@Override`, 인터페이스 |
| **추상화** | Abstraction | 복잡한 구현을 숨기고 필요한 기능만 노출 | `abstract`, `interface` |

---

## :material-package-variant: 필수 패키지

### java.util

```java
// 컬렉션 프레임워크
List<String> list = new ArrayList<>();
Map<String, Integer> map = new HashMap<>();
Set<String> set = new HashSet<>();

// Optional
Optional<String> opt = Optional.ofNullable(value);
opt.orElse("default");
```

### java.util.stream

```java
// Stream API
List<Integer> result = numbers.stream()
    .filter(n -> n > 0)
    .map(n -> n * 2)
    .sorted()
    .collect(Collectors.toList());
```

### java.util.concurrent

```java
// 동시성
ExecutorService executor = Executors.newFixedThreadPool(4);
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> "result", executor)
    .thenApply(s -> s.toUpperCase());
```

---

## 학습 완료 기준

코드가 대상 JDK에서 컴파일되고 예상 출력과 실패 예외를 설명할 수 있어야 합니다. GC·성능 설명은 JFR, GC 로그, JMH 같은 측정 없이 특정 지연이나 처리량을 보장하지 않습니다. 링크 존재와 예제 빌드는 문서 파이프라인에서 별도로 검사합니다.

## :material-link-variant: 관련 문서

- [JPA 개요](../databases/jpa/overview.md) - Java 영속성 API
- [Spring Boot Redis](../databases/redis/springboot-integration.md) - Redis 연동
- [Java 설치 가이드](../development/languages/java-install.md) - JDK 설치

---

## :material-book-open-page-variant: 참고 자료

- [Oracle Java Documentation](https://docs.oracle.com/en/java/)
- [Baeldung](https://www.baeldung.com/) - Java 튜토리얼
- [Java Design Patterns](https://java-design-patterns.com/)
