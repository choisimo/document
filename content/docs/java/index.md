# Java 문서

Java 문서는 언어 문법, JVM 실행 모델, 메모리 관리, 객체지향 설계를 연결해서 학습하기 위한 진입점이다. 이 섹션은 “코드를 어떻게 작성하는가”와 “JVM이 그 코드를 어떻게 실행하는가”를 함께 다룬다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Java를 Spring Boot나 JPA부터 배우면 framework annotation은 익숙해져도 type, object, heap, GC, exception, thread 같은 기반 개념이 비어 있기 쉽다. 반대로 JVM 내부만 공부하면 실제 API 설계와 코드 유지보수 감각이 약해진다.

이 인덱스는 Java 학습을 언어 기본기와 런타임 이해로 나누고, 문서 간 이동 경로를 제공한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Java 문서 목록, Java 버전 역사, JVM 메모리 그림, OOP 표, 표준 패키지 예제를 한 페이지에 모아 둔다.

보완해야 할 점은 다음과 같다.

- 인덱스가 학습 순서보다 요약 슬라이드처럼 구성되어 있다.
- Java 버전 정보는 시간이 지나면 틀릴 수 있는데 정적 표로 고정되어 있다.
- core concept와 memory/GC 문서의 역할 분리가 약하다.
- Spring/JPA 같은 상위 기술로 가기 전 확인할 기본 불변식이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Java 학습자가 다음 순서로 기반을 다지는 것이다.

- [핵심 개념](core-concepts.md)에서 type, object, interface, exception, generic을 이해한다.
- [메모리와 GC](memory-gc.md)에서 heap, stack, reference, GC, leak을 이해한다.
- JDK 버전은 프로젝트 요구와 vendor support roadmap을 기준으로 선택한다.
- Spring, JPA, concurrency로 넘어가기 전에 Java API contract를 먼저 확인한다.

## 4. 시스템 번역 (Data Flow)

Java 애플리케이션의 실행 흐름은 다음과 같다.

```text
source code
  -> javac
  -> bytecode
  -> JVM class loader
  -> JIT/interpreter
  -> heap, stack, metaspace
  -> GC and runtime services
```

언어 문법은 source level의 계약이고, JVM은 bytecode와 runtime memory를 관리한다. 두 층을 분리해서 보면 compile error, runtime exception, memory pressure를 더 정확히 구분할 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

JDK는 compiler, runtime, standard library, tooling을 포함한다. 개발자는 JRE만이 아니라 JDK를 기준으로 작업한다.

JVM은 bytecode 실행, class loading, memory management, GC, JIT 최적화를 담당한다.

Java language는 class, interface, generic, exception, annotation, lambda, record 같은 source-level 기능을 제공한다.

Standard library는 `java.lang`, `java.util`, `java.time`, `java.util.concurrent`, `java.nio` 같은 안정적인 building block을 제공한다.

Build tool은 Maven 또는 Gradle이 일반적이다. dependency resolution, test, packaging, plugin 실행을 담당한다.

Framework는 Spring Boot, Jakarta EE, Micronaut, Quarkus 같은 상위 런타임이다. framework 이전에 Java 기본 계약을 이해해야 한다.

## 6. 상태 전이 (State Transition)

Java 학습은 다음 상태로 진행한다.

```text
syntax familiar
  -> type and object model understood
  -> collections and generics safe
  -> exception contract clear
  -> JVM memory model understood
  -> framework code readable
```

운영 관점의 Java 서비스는 다음 상태를 가진다.

```text
compiled
  -> packaged
  -> started
  -> warmed up
  -> serving
  -> memory pressure
  -> GC pause or recovery
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Java 버전 선택은 “최신”보다 프로젝트, library, 운영 지원 기간을 기준으로 한다.
- `equals`와 `hashCode` 계약은 collection 사용 전에 맞춘다.
- exception은 숨기지 말고 API 실패 계약으로 다룬다.
- heap 문제는 코드 reference graph와 운영 GC 로그를 함께 봐야 한다.
- framework annotation은 Java type system과 reflection 위에서 동작한다.
- build tool lockfile, wrapper, JDK version을 팀 기준으로 고정한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 JDK를 확인한다.

```bash
java --version
javac --version
```

가장 작은 Java program을 만든다.

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("hello java");
    }
}
```

컴파일하고 실행한다.

```bash
javac Main.java
java Main
```

Maven/Gradle 프로젝트에서는 source compatibility와 toolchain을 명시한다. JDK 선택 시 Oracle Java SE Support Roadmap, OpenJDK vendor support, framework 지원 matrix를 함께 확인한다.

## 9. 실패 사례 (What could go wrong?)

JDK 버전만 올리고 build plugin, framework, CI image를 맞추지 않으면 local에서는 되지만 CI나 production에서 깨진다.

`List`와 `Map`을 raw type으로 쓰면 compile-time type safety를 잃고 runtime `ClassCastException`으로 늦게 터진다.

GC 문제를 heap size만 키워 해결하려고 하면 leak reference가 계속 남아 장애 시간이 뒤로 밀릴 뿐이다.

Spring bean lifecycle 문제를 Java object lifecycle과 분리해서 생각하면 singleton shared state, thread safety, proxy 호출 경계를 놓친다.

## 10. 뇌 확장하기 (Evolution & Variants)

Java release cadence는 계속 움직인다. 2026년 기준 Oracle 문서와 Java SE specification은 Java SE 25/JDK 25 계열을 제공하며, Java 21에서 Java 25로 넘어가는 LTS 전환도 vendor별 정책을 확인해야 한다.

Virtual threads는 thread-per-request 스타일을 다시 가능하게 만들지만, blocking I/O, synchronized block, connection pool 크기 같은 기존 병목이 사라지는 것은 아니다.

GraalVM native image, Quarkus, Micronaut 같은 stack은 startup과 memory footprint를 줄일 수 있지만 reflection, dynamic proxy, resource loading 제약을 함께 고려해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `java --version`과 build tool JDK가 일치한다.
- [ ] 핵심 개념 문서를 통해 type/object/interface/exception을 설명할 수 있다.
- [ ] 메모리와 GC 문서를 통해 heap/stack/reference/GC를 설명할 수 있다.
- [ ] 프로젝트 JDK 버전을 vendor support roadmap 기준으로 선택했다.
- [ ] Maven 또는 Gradle wrapper를 사용한다.
- [ ] framework 문서를 보기 전 Java 기본 계약을 먼저 확인한다.
- [ ] 운영 이슈는 GC log, heap dump, thread dump로 관측할 수 있게 한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Java 학습은 문법에서 끝나지 않는다. source code는 bytecode가 되고, JVM 위에서 object, memory, GC, exception, thread 계약으로 실행된다.
