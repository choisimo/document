---
title: 셸 시작 파일과 환경 변수
description: Bash·Zsh·GUI 세션의 설정 로딩을 구분하고 신뢰한 환경 파일만 제한적으로 적용합니다.
---

# 셸 시작 파일과 환경 변수

터미널에서는 보이는 설정이 SSH, 자동화, GUI 앱에서는 보이지 않을 수 있다. 셸 종류뿐 아니라 로그인 여부, 대화형 여부, 부모 프로세스가 전달한 환경을 확인해야 한다.

## 설정 파일 선택

| 상황 | 사용자 파일의 기본적인 역할 |
| --- | --- |
| Bash 로그인 셸 | `.bash_profile`, `.bash_login`, `.profile` 중 읽을 수 있는 첫 파일 |
| Bash 비로그인 대화형 셸 | `.bashrc`의 alias·함수·프롬프트 |
| Zsh | `.zshenv`, 로그인 때 `.zprofile`·`.zlogin`, 대화형일 때 `.zshrc` |
| GUI 세션 | 실제 display manager·desktop의 환경 로딩 경로 |

Zsh 사용자 설정 위치에는 `ZDOTDIR`가 영향을 주며 시스템 파일 경로는 배포판·빌드에 따라 달라질 수 있다. GUI 세션이 항상 `.xprofile`이나 로그인 셸 설정을 읽는다고 가정하지 않는다.

`SHELL` 환경 변수만으로 현재 실행 중인 셸의 모드까지 알 수 없다. 실제 진입 명령과 셸의 상태를 확인한다. 인터랙티브 장식·프롬프트를 모든 스크립트 실행 경로에 넣으면 원치 않는 출력이나 외부 실행이 생길 수 있다.

## 환경 파일을 읽는다는 의미

셸의 `source` 또는 `.`는 데이터 parser가 아니라 **코드 실행**이다. 내려받은 `.env`를 검토 없이 실행하지 않는다. 다른 도구의 dotenv·Compose·systemd 문법이 셸 문법과 완전히 같은 것도 아니다.

다음은 **검토한 셸 문법 파일을 자식 명령 하나에 적용하는 예시**다. `<REVIEWED_ENV_FILE>`과 `<COMMAND>`는 실제로 승인한 값으로 바꾼다.

```bash
(
  set -a
  . '<REVIEWED_ENV_FILE>'
  set +a
  '<COMMAND>'
)
```

subshell은 부모 터미널의 환경 변경을 남기지 않지만 실행한 코드의 파일 변경·네트워크 부작용을 격리하지 않는다. 민감한 값은 `env`, `set`, 셸 추적으로 전체 출력하지 않는다. 상태를 확인할 때에는 필요한 변수의 존재 여부만 검사한다.

## 프롬프트·테마와 적용 검증

프롬프트·alias·테마는 해당 대화형 셸 설정에 작은 변경으로 적용한다. 기존 파일을 보존하고 설정을 읽지 않는 별도 세션을 복구 수단으로 남긴다. 테마 설치 스크립트나 원격 코드를 로그인마다 자동 실행하지 않는다.

로컬 터미널, SSH 로그인, 실제 스케줄 명령, GUI 앱 중 필요한 경로에서 각각 확인한다. 한 터미널의 성공을 전체 시스템 설정 성공으로 기록하지 않는다. 이 문서는 보관본에 있던 계정·키·환경 변수 출력 예시를 복구하지 않는다.

근거: `content/archive/legacy/Linux/start-cfg.md`, `OS/linux_startup_exec.md`, `Linux/arch-linux/theme-Catppuccin.md`, `docs-old/infrastructure/env_file_export.md`. 사이트 빌더는 별도로 [공개 AI 변수](../tools/documentation/ai-operations.md)를 읽는다.
