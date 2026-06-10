# Java JDK 설치 및 환경 구성 학습 노트

Java 개발 환경은 JRE만 설치되어 있다고 끝나지 않는다. 소스 코드를 컴파일하려면 `javac`가 포함된 JDK가 필요하고, Gradle, Maven, IDE, 터미널이 같은 JDK를 바라보아야 한다. 이 문서는 JDK 설치와 `JAVA_HOME` 설정을 프로젝트 재현성 관점에서 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Java 프로젝트는 JDK 버전에 민감하다. 소스 호환성, 바이트코드 타깃, Gradle 플러그인, Spring Boot 버전, IDE 언어 서버가 모두 JDK 버전의 영향을 받는다. 터미널에서는 Java 21이 보이는데 IDE는 Java 17을 쓰거나, `java`는 설치되어 있는데 `javac`가 없으면 빌드 실패 원인을 찾기 어렵다.

따라서 Java 설치 문서의 핵심은 “어떤 패키지를 설치하는가”보다 “프로젝트가 요구하는 JDK를 모든 도구가 동일하게 사용하는가”이다.

## 2. 현재 나의 상태 (Baseline)

현재 문서는 다음 내용을 나열한다.

- Ubuntu/Debian에서 `openjdk-17-jdk` 설치
- Java 11, 17, 21 패키지 예시
- `update-alternatives`로 기본 버전 전환
- `JAVA_HOME` 확인과 설정
- Arch Linux, RHEL 계열 설치 예시
- 간단한 컴파일 테스트

빠른 설치에는 충분하지만, JRE와 JDK 차이, 프로젝트 요구 버전 확인, 빌드 도구와 IDE가 다른 JDK를 쓰는 문제를 구분하는 설명이 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 만드는 것이다.

- 프로젝트가 요구하는 JDK 버전을 먼저 확인한다.
- `java`, `javac`, `JAVA_HOME`이 같은 설치 경로를 가리킨다.
- 여러 JDK가 설치되어 있어도 기본값을 명확히 선택한다.
- Gradle, Maven, IDE가 사용할 JDK를 별도로 확인한다.
- 작은 Java 파일을 컴파일하고 실행해 설치를 검증한다.

## 4. 시스템 번역 (Data Flow)

Java 개발 환경은 다음 흐름으로 동작한다.

```text
Java source
  -> javac
  -> .class 또는 .jar
  -> java runtime
  -> application process
```

도구 관점에서는 다음 경로가 일치해야 한다.

```text
터미널의 java
  -> 터미널의 javac
  -> JAVA_HOME
  -> Gradle 또는 Maven toolchain
  -> IDE Project SDK
```

이 중 하나라도 다른 JDK를 바라보면 로컬에서는 성공하지만 IDE에서 실패하거나, CI에서는 다른 바이트코드로 빌드될 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인 명령 |
| --- | --- | --- |
| JDK | 컴파일러와 런타임 포함 | `javac -version` |
| JRE | 실행 환경 | `java -version` |
| `JAVA_HOME` | 도구가 JDK 위치를 찾는 기준 | `echo "$JAVA_HOME"` |
| `update-alternatives` | Debian 계열 기본 Java 선택 | `sudo update-alternatives --config java` |
| `archlinux-java` | Arch Linux Java 선택 | `archlinux-java status` |
| Gradle Toolchain | Gradle 빌드 JDK 선택 | `./gradlew -version` |
| Maven Compiler 설정 | Maven 컴파일 기준 | `mvn -version` |

JDK 경로는 배포판과 설치 방식에 따라 달라진다. 문서에 고정 경로를 복사하기보다 현재 시스템의 실제 경로를 확인해야 한다.

## 6. 상태 전이 (State Transition)

Java 환경 준비 상태는 다음처럼 이동한다.

```text
미설치
  -> JDK 설치됨
  -> java와 javac 확인됨
  -> JAVA_HOME 설정됨
  -> 기본 JDK 선택됨
  -> 빌드 도구 JDK 확인됨
  -> 예제 컴파일과 실행 성공
```

각 단계의 통과 기준은 다음과 같다.

- JDK 설치됨: `javac -version`이 성공한다.
- 런타임 확인됨: `java -version`이 프로젝트 요구 범위와 맞는다.
- 환경 변수 설정됨: `JAVA_HOME/bin/javac`가 존재한다.
- 기본값 선택됨: 여러 JDK 중 의도한 버전이 기본값이다.
- 빌드 도구 확인됨: Gradle 또는 Maven이 같은 JDK를 출력한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 개발 환경에는 JRE가 아니라 JDK를 설치한다.
- `java`와 `javac`의 주 버전은 프로젝트 요구 버전과 맞아야 한다.
- `JAVA_HOME`은 `bin` 디렉터리가 아니라 JDK 루트 디렉터리를 가리킨다.
- 여러 JDK가 설치되어 있으면 기본값 선택 절차를 문서화한다.
- IDE Project SDK와 터미널 JDK가 다른지 반드시 확인한다.
- 프로젝트 저장소에는 개인 시스템의 절대 JDK 경로를 강제하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Ubuntu/Debian 계열에서 JDK를 설치하는 예시는 다음과 같다. 실제 버전은 프로젝트 요구사항과 배포판 저장소를 확인해 선택한다.

```bash
sudo apt-get update
sudo apt-get install openjdk-21-jdk
```

다른 JDK가 필요하면 설치 가능한 패키지를 먼저 확인한다.

```bash
apt-cache search openjdk | grep -- '-jdk'
```

Arch Linux에서는 다음처럼 설치하고 선택한다.

```bash
sudo pacman -S jdk-openjdk
archlinux-java status
sudo archlinux-java set java-21-openjdk
```

RHEL 계열에서는 개발 패키지를 설치한다.

```bash
sudo dnf install java-21-openjdk-devel
sudo alternatives --config java
```

설치 후 버전을 확인한다.

```bash
java -version
javac -version
readlink -f "$(command -v java)"
readlink -f "$(command -v javac)"
```

`JAVA_HOME` 후보는 `javac` 실행 파일의 상위 JDK 루트다.

```bash
dirname "$(dirname "$(readlink -f "$(command -v javac)")")"
```

사용자 셸에 설정할 때는 실제 경로로 바꾼다.

```bash
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

작은 파일로 컴파일과 실행을 확인한다.

```bash
printf '%s\n' 'public class Test { public static void main(String[] args) { System.out.println("Hello Java"); } }' > Test.java
javac Test.java
java Test
rm Test.java Test.class
```

Gradle 프로젝트라면 빌드 도구가 보는 JDK도 확인한다.

```bash
./gradlew -version
```

Maven 프로젝트라면 다음을 확인한다.

```bash
mvn -version
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 JRE만 설치하는 것이다. `java -version`은 성공하지만 `javac -version`이 실패하면 소스 컴파일을 할 수 없다.

두 번째 실패는 `JAVA_HOME`을 `bin`까지 포함해 설정하는 것이다. 많은 도구는 `JAVA_HOME/bin/java`를 조합해서 실행 파일을 찾으므로, `JAVA_HOME`은 JDK 루트여야 한다.

세 번째 실패는 터미널과 IDE의 JDK가 다른 경우다. 터미널 빌드는 성공하지만 IDE 인덱싱이나 테스트 실행이 실패할 수 있다.

네 번째 실패는 프로젝트 요구 버전을 무시하는 것이다. 최신 JDK를 설치해도 프로젝트가 낮은 `sourceCompatibility`나 특정 Gradle 플러그인을 요구하면 빌드가 실패할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인 장비에서 여러 프로젝트를 오가면 SDKMAN!, asdf, jEnv 같은 버전 관리 도구를 검토할 수 있다. 핵심은 도구 이름이 아니라 프로젝트별 JDK 선택이 명시되는 것이다.

Gradle 프로젝트에서는 Java Toolchain을 사용해 빌드에 필요한 언어 버전을 선언할 수 있다. 이렇게 하면 로컬 기본 JDK와 빌드 JDK를 분리해 관리할 수 있다.

컨테이너 기반 개발에서는 호스트의 JDK보다 컨테이너 이미지 안의 JDK가 기준이다. Dockerfile과 CI 이미지의 JDK 버전을 프로젝트 설정과 함께 확인해야 한다.

운영 배포에서는 개발 JDK와 런타임 JRE 또는 JDK 이미지가 다를 수 있다. 빌드 산출물의 대상 바이트코드와 운영 런타임 버전을 함께 검증한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 프로젝트가 요구하는 Java 버전을 확인했다.
- [ ] JDK를 설치했고 `javac -version`이 성공한다.
- [ ] `java -version`과 `javac -version`의 주 버전이 맞다.
- [ ] `JAVA_HOME`이 JDK 루트 디렉터리를 가리킨다.
- [ ] 여러 JDK 중 기본값 선택 절차를 확인했다.
- [ ] IDE Project SDK가 터미널과 같은 JDK를 사용한다.
- [ ] Gradle 또는 Maven이 보는 JDK를 확인했다.
- [ ] 작은 Java 파일을 컴파일하고 실행했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Java 개발 환경의 기준은 `java`만이 아니라 `__________`가 포함된 JDK다. `JAVA_HOME`은 `__________` 디렉터리가 아니라 JDK `__________`를 가리켜야 하며, IDE와 빌드 도구가 같은 `__________`를 보는지 확인해야 한다.
