# Java 핵심 개념

Java 입문자를 위한 타입·제어 흐름·객체 모델 개요입니다. 언어 규칙은 Java Language Specification을 기준으로 하며 객체 배치와 실제 메모리 크기는 JVM 구현·버전·옵션에 따라 달라집니다. 예제는 JDK 17 이상에서 각 `public` 클래스를 같은 이름의 별도 파일로 컴파일한다고 가정합니다.

---

## 목차

1. [객체지향 프로그래밍](#객체지향-프로그래밍)
2. [자료형과 변수](#자료형과-변수)
3. [제어문](#제어문)
4. [클래스와 객체](#클래스와-객체)
5. [상속과 다형성](#상속과-다형성)

---

## 객체지향 프로그래밍

Java는 객체지향 기능을 제공합니다. 다음 네 항목은 교육용 분류이며 Java 명세가 규정한 유일한 원칙 목록은 아닙니다.

- **캡슐화 (Encapsulation)**: 데이터와 메소드를 하나의 단위로 묶음
- **상속 (Inheritance)**: 기존 클래스를 확장하여 새 클래스 생성
- **다형성 (Polymorphism)**: 하나의 인터페이스로 다양한 구현
- **추상화 (Abstraction)**: 복잡한 시스템을 단순화

## 자료형과 변수

### 기본 자료형 (Primitive Types)

| 타입 | 크기 | 범위 |
|------|------|------|
| `byte` | 1 byte | -128 ~ 127 |
| `short` | 2 bytes | -32,768 ~ 32,767 |
| `int` | 4 bytes | -2³¹ ~ 2³¹-1 |
| `long` | 8 bytes | -2⁶³ ~ 2⁶³-1 |
| `float` | 4 bytes | 부동소수점 |
| `double` | 8 bytes | 부동소수점 |
| `char` | 16-bit 값 | UTF-16 코드 단위. 보조 문자는 두 `char` 사용 |
| `boolean` | 언어 차원의 저장 크기 미규정 | `true`/`false` |

### 참조 자료형 (Reference Types)

- **String**: 문자열
- **Array**: 배열
- **Class**: 사용자 정의 클래스
- **Interface**: 인터페이스

## 클래스와 객체

```java
public class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
}
```

## 상속과 다형성

```java
public class Animal {
    public void speak() {
        System.out.println("동물이 소리를 냅니다.");
    }
}

public class Dog extends Animal {
    @Override
    public void speak() {
        System.out.println("멍멍!");
    }
}

public class Cat extends Animal {
    @Override
    public void speak() {
        System.out.println("야옹!");
    }
}
```

## 학습 완료 증거

`java -version`과 `javac -version`을 기록하고 각 예제를 파일별로 컴파일해 예상 출력을 확인합니다. 객체 크기나 성능은 JOL, JFR 또는 재현 가능한 벤치마크로 대상 JVM에서 별도 측정합니다.
