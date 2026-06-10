# 리눅스 셸 설정 파일 실행 순서

리눅스 시스템은 사용자의 셸 환경을 구성하기 위해 여러 설정 파일을 실행한다. 파일별 실행 여부는 셸 종류와 세션 유형에 따라 달라진다.

- Login Shell: TTY 콘솔 로그인이나 SSH 접속처럼 로그인 과정에서 생성되는 셸
- Non-Login Shell: 이미 로그인된 세션에서 새 터미널이나 셸 스크립트로 시작되는 셸
- Interactive Shell: 사용자가 명령을 직접 입력하는 상호작용 셸
- Non-Interactive Shell: 스크립트 실행처럼 사용자 입력 없이 동작하는 셸

## 공통 설정 파일

### `/etc/profile`

- 적용 범위: 시스템 전역, 모든 사용자
- 실행 시점: Login Shell 시작 시 먼저 실행
- 주요 용도: 시스템 전체 `PATH`, 기본 `umask`, 공통 환경 변수 설정

### `~/.profile`

- 적용 범위: 사용자 개인
- 실행 시점: Login Shell 시작 시 `/etc/profile` 이후 실행
- 주요 용도: 사용자별 환경 변수, 개인 `bin` 디렉토리, `JAVA_HOME` 등 세션 전체에 유지되는 값
- Bash에서는 `~/.bash_profile` 또는 `~/.bash_login`이 존재하면 `~/.profile`이 실행되지 않을 수 있다.
- 여러 셸과의 호환성을 고려할 때 `~/.profile`이 공통 사용자 환경 파일 역할을 한다.

## Bash 설정 파일

### `~/.bash_profile`

- 적용 범위: Bash 사용자 개인
- 실행 시점: Bash Login Shell 시작 시 실행
- 탐색 순서: `~/.bash_profile`, `~/.bash_login`, `~/.profile` 중 먼저 발견된 파일 하나
- 주요 용도: 로그인 시 한 번만 필요한 환경 변수와 초기화 스크립트

많은 배포판은 로그인 시 `~/.bashrc` 설정도 함께 읽도록 `~/.bash_profile`에 다음 구성을 둔다.

```bash
# ~/.bash_profile

if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

### `~/.bashrc`

- 적용 범위: Bash 사용자 개인
- 실행 시점: Non-Login Interactive Shell 시작 시마다 실행
- 주요 용도: alias, 셸 함수, 프롬프트(`PS1`), 자동 완성, 터미널 상호작용 설정

```bash
alias ll='ls -alF'
```

## Zsh 설정 파일

### `~/.zshrc`

- 적용 범위: Zsh 사용자 개인
- 실행 시점: Interactive Shell 시작 시마다 실행
- 주요 용도: alias, 함수, 프롬프트, 플러그인, oh-my-zsh 설정

Zsh에는 `~/.zshenv`, `~/.zprofile`, `~/.zshrc`, `~/.zlogin` 등 더 세분화된 설정 파일 체계가 있다. 일반적인 사용자 상호작용 설정은 `~/.zshrc`에 둔다.

## 그래픽 세션 설정 파일

### `~/.xprofile`

- 적용 범위: X Window System 기반 GUI 세션의 사용자 개인 설정
- 실행 시점: GDM, LightDM 등 디스플레이 매니저를 통한 그래픽 로그인 시
- 주요 용도: GUI 애플리케이션 환경 변수, 입력기 설정, 그래픽 로그인 시 자동 실행 프로그램

GUI 환경에서 터미널을 열지 않고 실행되는 VS Code, Chrome 같은 프로그램은 Login Shell을 거치지 않을 수 있다. 이 경우 `~/.profile`에 설정된 환경 변수가 상속되지 않을 수 있으므로, GUI 세션 전체에 필요한 값은 `~/.xprofile`에 둔다.

## 실행 순서 요약

| 상황 | 시스템 전역 파일 | 사용자 개인 파일 |
| :--- | :--- | :--- |
| SSH 접속 또는 TTY 콘솔 로그인 | `/etc/profile` | `~/.bash_profile`, `~/.bash_login`, `~/.profile` 중 하나 |
| GUI 환경 로그인 | 디스플레이 매니저 설정에 따라 다름 | `~/.xprofile`, 배포판에 따라 `~/.profile` 또는 `~/.bash_profile` |
| 터미널 실행 | `/etc/bash.bashrc` | Bash는 `~/.bashrc`, Zsh는 `~/.zshrc` |

## 파일 선택 기준

| 설정 목적 | 파일 |
| :--- | :--- |
| 모든 셸과 GUI 애플리케이션에서 사용할 환경 변수 | `~/.profile` 또는 `~/.xprofile` |
| Bash 터미널 alias | `~/.bashrc` |
| Zsh 터미널 alias | `~/.zshrc` |
| Bash 프롬프트 설정 | `~/.bashrc` |
| Zsh 프롬프트 설정 | `~/.zshrc` |
| GUI 프로그램이 인식해야 하는 환경 변수 | `~/.xprofile` |
| 콘솔 또는 SSH 로그인 시 한 번 실행되는 스크립트 | `~/.bash_profile` 또는 `~/.profile` |
| GUI 로그인 시 한 번 실행되는 스크립트 | `~/.xprofile` |
