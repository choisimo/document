# Java 핵심 개념

Java의 핵심은 클래스 기반 객체 모델, 정적 타입, JVM 실행 환경, 표준 라이브러리 계약을 함께 이해하는 것이다. 이 문서는 문법 나열보다 “값이 어디에 있고, 어떤 타입 계약으로 이동하며, 런타임이 무엇을 보장하는가”를 기준으로 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Java 코드는 겉으로는 단순한 클래스와 메서드 호출처럼 보이지만 실제로는 타입, 객체 identity, 참조, 예외, generic, runtime dispatch가 계속 얽힌다. 이 경계를 모르면 getter/setter만 있는 클래스를 객체지향이라고 착각하거나, `List<Object>`와 `List<String>`의 관계를 잘못 이해하거나, `equals`와 `==`를 혼동한다.

핵심 개념을 먼저 잡으면 Spring, JPA, JVM GC, concurrency 같은 상위 주제를 배울 때 흔들리지 않는다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 OOP 4대 원칙, primitive type, class/object, inheritance/polymorphism 예제를 짧게 소개한다.

보완해야 할 점은 다음과 같다.

- primitive와 reference의 저장/비교 의미가 부족하다.
- `boolean` 크기처럼 JVM 구현에 따라 달라질 수 있는 내용을 단정한다.
- 예외, generic, interface contract, collection 같은 실무 핵심이 빠져 있다.
- 상속을 객체지향의 중심처럼 보이게 하지만 실제 설계에서는 composition과 interface가 더 자주 중요하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Java 코드를 읽을 때 다음 질문에 답할 수 있는 상태다.

- 이 값은 primitive인가 reference인가?
- `==` 비교가 값 비교인지 참조 비교인지 구분할 수 있는가?
- class, interface, abstract class의 역할을 구분할 수 있는가?
- exception이 호출자에게 어떤 계약을 강제하는가?
- generic이 compile-time type safety를 어떻게 제공하는가?
- collection을 선택할 때 순서, 중복, key lookup 요구사항을 고려하는가?

## 4. 시스템 번역 (Data Flow)

Java 코드의 기본 흐름은 다음처럼 볼 수 있다.

```text
source code
  -> javac compile
  -> bytecode
  -> JVM class loading
  -> object allocation
  -> method dispatch
  -> result or exception
```

개발자가 작성한 class와 method는 compile-time type check를 거쳐 bytecode가 되고, JVM은 runtime에 객체를 만들고 method를 호출한다. compile-time에 잡히는 오류와 runtime에 터지는 오류를 구분하는 것이 중요하다.

## 5. 핵심 구성요소 (Building Blocks)

Primitive type은 값 자체를 다룬다. `int`, `long`, `double`, `char`, `boolean` 등이 여기에 속한다. `boolean`의 메모리 크기는 Java 언어 차원에서 “1 bit”로 프로그래머가 제어하는 값이 아니다.

Reference type은 객체를 가리키는 참조를 다룬다. `String`, array, class instance, interface reference가 여기에 속한다.

Class는 상태와 행위를 묶는 type definition이다. Object는 class로부터 생성된 runtime instance다.

Interface는 “무엇을 할 수 있는가”라는 계약이다. 구현 class는 그 계약을 만족해야 한다.

Exception은 실패를 호출자에게 전달하는 계약이다. checked exception은 method signature에 드러나고, unchecked exception은 runtime 실패로 전파된다.

Generic은 compile-time type safety를 제공한다. type erasure 때문에 runtime에는 일부 type 정보가 사라진다는 제약도 함께 이해해야 한다.

## 6. 상태 전이 (State Transition)

객체는 다음 상태를 거친다.

```text
class loaded
  -> constructor called
  -> object reachable
  -> method calls mutate or read state
  -> object unreachable
  -> eligible for GC
```

설계 관점에서는 객체의 상태 전이가 더 중요하다. setter를 무제한으로 열면 객체가 어떤 상태든 될 수 있고, 생성자와 method guard를 두면 유효한 상태만 유지할 수 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `==`는 primitive에서는 값 비교지만 reference에서는 참조 비교다.
- 객체 동등성은 보통 `equals`와 `hashCode` 계약을 함께 맞춘다.
- `HashMap` key로 쓰는 객체는 변경 가능한 필드를 key identity에 포함하지 않는다.
- public method는 입력 검증과 실패 방식을 계약으로 가져야 한다.
- 상속은 “is-a” 관계가 명확할 때만 사용한다.
- mutable shared state는 concurrency bug의 출발점이므로 소유권을 명확히 한다.
- `null` 가능성은 API 계약에 드러나야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

값 비교와 참조 비교를 구분한다.

```java
String a = new String("java");
String b = new String("java");

System.out.println(a == b);
System.out.println(a.equals(b));
```

interface로 구현을 분리한다.

```java
public interface Notifier {
    void send(String target, String message);
}

public final class EmailNotifier implements Notifier {
    @Override
    public void send(String target, String message) {
        if (target == null || target.isBlank()) {
            throw new IllegalArgumentException("target is required");
        }
        System.out.println("send email to " + target + ": " + message);
    }
}
```

상태 불변식을 생성자에서 지킨다.

```java
public final class User {
    private final String email;

    public User(String email) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("valid email is required");
        }
        this.email = email;
    }

    public String email() {
        return email;
    }
}
```

generic collection은 element type을 compile-time에 제한한다.

```java
List<User> users = new ArrayList<>();
users.add(new User("admin@example.com"));

for (User user : users) {
    System.out.println(user.email());
}
```

## 9. 실패 사례 (What could go wrong?)

`String`을 `==`로 비교하면 값이 같아도 false가 나올 수 있다. 문자열 내용 비교는 `equals`를 사용한다.

`HashSet`에 넣은 객체의 `equals` 기준 필드를 나중에 바꾸면 set 내부 bucket과 객체 상태가 어긋난다.

상속으로 코드를 재사용하려고 하면 parent class의 protected state와 override 순서에 강하게 결합될 수 있다. composition과 interface를 먼저 검토한다.

`Optional`을 field나 parameter에 무분별하게 쓰면 API가 더 복잡해진다. return value에서 “없을 수 있음”을 표현할 때 주로 사용한다.

checked exception을 모두 `catch (Exception e)`로 삼켜 버리면 실패가 호출자와 운영 로그에 드러나지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

Java 8 이후 lambda와 stream은 collection 처리 방식을 바꿨지만, 내부적으로는 type과 object contract 위에서 동작한다. stream은 무조건 빠른 반복문이 아니라 선언적 pipeline이다.

Record는 불변 data carrier를 간결하게 만들 수 있다. 하지만 domain invariant가 복잡하면 compact constructor와 method를 통해 계약을 명시해야 한다.

Sealed class/interface는 상속 가능한 subtype을 제한한다. 상태 전이가 제한된 domain model이나 pattern matching과 함께 쓰면 의도를 더 명확히 표현할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] primitive와 reference type 차이를 설명할 수 있다.
- [ ] `==`, `equals`, `hashCode` 계약을 구분한다.
- [ ] class와 object의 차이를 설명할 수 있다.
- [ ] interface를 구현 계약으로 사용한다.
- [ ] exception을 API 실패 계약으로 다룬다.
- [ ] generic collection을 raw type 없이 사용한다.
- [ ] 상속보다 composition이 나은 상황을 구분한다.
- [ ] 객체 상태 불변식을 생성자나 method guard로 보호한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Java의 기본기는 문법 암기가 아니라 type contract, object identity, method dispatch, exception flow를 읽는 능력이다. 객체는 상태를 숨기고, method는 유효한 상태 전이만 허용해야 한다.
