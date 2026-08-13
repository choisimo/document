# Debian/Ubuntu에서 OpenJDK 17 설치 메모

> 아래 패키지명과 경로는 Debian/Ubuntu의 amd64 패키지 배치를 가정합니다. 설치 전 배포판과 아키텍처를 확인하고, 설치 후 `readlink -f "$(command -v java)"`로 실제 Java 경로를 판정합니다.

## install
    sudo apt-get update
    sudo apt-get install openjdk-17-jdk
    java -version
## check
    java -version
## route
    /usr/lib/jvm/java-17-openjdk-amd64/bin/java
## JAVA_HOME
> 아래 레거시 `JAVA_HOME` 값은 앞 절의 `/usr/lib/jvm` 경로와 일치하지 않습니다. 실제 설치 경로를 확인한 뒤 값을 지정하십시오.

    sudo vim /etc/environment
    JAVA_HOME="/usr/lib/java-17-openjdk-amd64"
## source
    source /etc/environment

`/etc/environment`는 로그인 시 읽힙니다. 새 로그인 세션에서 `printenv JAVA_HOME`과 `java -version`이 같은 JDK를 가리킬 때 설정이 완료된 것입니다.
