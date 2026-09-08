# 리눅스 셸 설정 파일 실행 순서

> **범위:** Bash와 Zsh의 시작 파일을 비교한다. 현재 셸은 `ps -p $$ -o args=`로 확인하고, 로그인 셸 여부는 Bash의 `shopt -q login_shell` 또는 Zsh의 `[[ -o login ]]`로 구분한다. 디스플레이 매니저·배포판·사용자 설정이 다른 파일을 추가로 불러올 수 있다.

리눅스 시스템은 사용자의 셸 환경을 구성하기 위해 여러 설정 파일을 실행한다. 파일별 실행 여부는 셸 종류와 세션 유형에 따라 달라진다.

- Login Shell: 로그인 모드로 시작된 셸. TTY·SSH의 대화형 로그인에서 흔하지만 원격 명령 실행 등 모든 SSH 세션이 로그인 셸인 것은 아니다.
- Non-Login Shell: 이미 로그인된 세션에서 새 터미널이나 셸 스크립트로 시작되는 셸
- Interactive Shell: 사용자가 명령을 직접 입력하는 상호작용 셸
- Non-Interactive Shell: 스크립트 실행처럼 사용자 입력 없이 동작하는 셸

## Bash와 sh 계열의 로그인 설정 파일

### `/etc/profile`

- 적용 범위: 시스템 전역, 모든 사용자
- 실행 시점: Bash·sh 계열이 로그인 모드로 시작할 때 읽음
- 주요 용도: 시스템 전체 `PATH`, 기본 `umask`, 공통 환경 변수 설정

### `~/.profile`

- 적용 범위: 사용자 개인
- 실행 시점: Bash·sh 계열의 사용자 로그인 파일로 선택된 경우 `/etc/profile` 이후 읽음
- 주요 용도: 사용자별 환경 변수, 개인 `bin` 디렉토리, `JAVA_HOME` 등 세션 전체에 유지되는 값
- Bash에서는 `~/.bash_profile` 또는 `~/.bash_login`이 존재하면 `~/.profile`이 실행되지 않을 수 있다.
- `~/.profile`은 이를 읽는 셸·세션에서만 공통 환경 파일 역할을 한다. Zsh는 기본 시작 절차에서 `~/.profile`을 자동으로 읽지 않는다.

## Bash 설정 파일

### `~/.bash_profile`

- 적용 범위: Bash 사용자 개인
- 실행 시점: Bash Login Shell 시작 시 실행
- 탐색 순서: `~/.bash_profile`, `~/.bash_login`, `~/.profile` 중 존재하고 읽을 수 있는 첫 파일 하나
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

Zsh는 시작 시 `.zshenv`, 로그인 모드에서 `.zprofile`, 대화형일 때 `.zshrc`, 마지막으로 로그인 모드에서 `.zlogin`을 읽는 체계를 갖는다. 사용자 파일 위치는 `ZDOTDIR` 설정에 따라 달라질 수 있고 시스템 파일의 경로도 빌드·배포판에 의존한다. [Zsh 시작 파일 문서](https://raw.githubusercontent.com/zsh-users/zsh/master/Doc/Zsh/files.yo)를 기준으로 확인한다.

## 그래픽 세션 설정 파일

### `~/.xprofile`

- 적용 범위: X Window System 기반 GUI 세션의 사용자 개인 설정
- 실행 시점: 해당 X11 디스플레이 매니저·세션이 `.xprofile`을 불러오도록 구성된 경우
- 주요 용도: GUI 애플리케이션 환경 변수, 입력기 설정, 그래픽 로그인 시 자동 실행 프로그램

GUI 프로그램은 로그인 셸을 거치지 않을 수 있다. 세션 전체에 필요한 변수는 실제 디스플레이 매니저와 세션의 환경 로딩 경로에 둔다. `.xprofile`을 읽지 않는 세션이나 Wayland 환경에서는 이 파일만 수정해 적용됐다고 판단하지 않는다.

## 실행 순서 요약

| 상황 | 시스템 전역 파일 | 사용자 개인 파일 |
| :--- | :--- | :--- |
| Bash 로그인 셸 | `/etc/profile` | 읽을 수 있는 `~/.bash_profile`, `~/.bash_login`, `~/.profile` 중 첫 파일 |
| GUI 환경 로그인 | 디스플레이 매니저 설정에 따라 다름 | `~/.xprofile`, 배포판에 따라 `~/.profile` 또는 `~/.bash_profile` |
| Bash 비로그인 대화형 셸 | 배포판에 따라 `/etc/bash.bashrc` 등 | `~/.bashrc` |
| Zsh 대화형 셸 | 설치된 Zsh의 시스템 시작 파일 | `.zshenv`, 로그인 여부에 따른 `.zprofile`·`.zlogin`, `.zshrc` |

## 파일 선택 기준

| 설정 목적 | 파일 |
| :--- | :--- |
| 여러 셸·GUI가 공유해야 할 환경 변수 | 실제 세션 환경 로딩 경로를 확인해 설정; 단일 파일의 보편적 적용을 가정하지 않음 |
| Bash 터미널 alias | `~/.bashrc` |
| Zsh 터미널 alias | `~/.zshrc` |
| Bash 프롬프트 설정 | `~/.bashrc` |
| Zsh 프롬프트 설정 | `~/.zshrc` |
| GUI 프로그램이 인식해야 하는 환경 변수 | 해당 세션이 읽는 환경 설정; X11 일부 구성에서는 `~/.xprofile` |
| 콘솔 또는 SSH 로그인 시 한 번 실행되는 스크립트 | `~/.bash_profile` 또는 `~/.profile` |
| GUI 로그인 시 한 번 실행되는 스크립트 | 해당 디스플레이 매니저·데스크톱의 세션 시작 설정 |

## 적용 판정

변경 전 파일을 백업하고 로컬 터미널·SSH 로그인·스크립트·GUI 앱 중 실제 대상에서 변수와 프롬프트를 확인한다. 셸 이름이나 파일 존재만으로 적용을 판정하지 않는다. Bash의 기본 파일 선택은 [GNU Bash 시작 파일 문서](https://www.gnu.org/s/bash/manual/html_node/Bash-Startup-Files.html)를 참고한다.
