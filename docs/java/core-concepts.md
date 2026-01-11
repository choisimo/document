# Java 핵심 개념

Java 프로그래밍 언어의 핵심 개념을 다룹니다.

---

## 목차

1. [객체지향 프로그래밍](#객체지향-프로그래밍)
2. [자료형과 변수](#자료형과-변수)
3. [제어문](#제어문)
4. [클래스와 객체](#클래스와-객체)
5. [상속과 다형성](#상속과-다형성)

---

## 객체지향 프로그래밍

Java는 객체지향 프로그래밍(OOP) 언어입니다. OOP의 4대 원칙:

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
| `char` | 2 bytes | 유니코드 문자 |
| `boolean` | 1 bit | true/false |

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
