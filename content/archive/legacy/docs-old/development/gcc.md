# Ubuntu에서 GCC 설치

## 설치 순서와 완료 기준

이 절차는 APT를 사용하는 Debian/Ubuntu 계열을 대상으로 한다. 먼저 `gcc --version`으로 기존 설치를 확인하고, 없을 때 패키지 목록을 갱신한 뒤 `build-essential`을 설치한다. 설치 완료는 명령 종료 상태만이 아니라 GCC 버전 확인과 최소 C 소스의 컴파일·실행 결과로 판정한다.

## install GCC
    gcc --version
    sudo apt-get update
    sudo apt-get install build-essential
    
