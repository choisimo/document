# Bash 세션의 프롬프트를 `$ `로 고정하기

이 문서는 Ubuntu에서 **Bash 대화형 셸**의 기본 프롬프트(`PS1`)를 `$ `로 설정하는 방법을 설명합니다. Zsh, Fish, 애플리케이션이 직접 실행하는 비대화형 셸은 대상에 포함하지 않습니다.

## 적용 범위 선택

| 원하는 범위 | 수정할 파일 | 적용 시점 |
| --- | --- | --- |
| 현재 사용자 | `~/.bashrc` | 새 대화형 Bash를 시작할 때 |
| SSH로 연 세션만 | `~/.bashrc`의 조건문 | `SSH_CONNECTION`이 설정된 대화형 Bash를 시작할 때 |
| 시스템의 대화형 Bash 사용자 | `/etc/bash.bashrc` | 각 사용자가 새 대화형 Bash를 시작할 때 |
| 로그인 셸 | `/etc/profile.d/*.sh` 또는 사용자 로그인 프로필 | 새 Bash 로그인 셸을 시작할 때 |

배포판 설정이나 사용자 로그인 프로필이 `.bashrc`를 불러오지 않으면 로그인 셸과 비로그인 셸의 결과가 다를 수 있습니다. 먼저 다음 명령으로 현재 셸을 확인합니다.

```bash
printf 'shell=%s\n' "$SHELL"
printf 'bash=%s\n' "$BASH_VERSION"
```

`BASH_VERSION`이 비어 있으면 현재 셸은 Bash가 아니므로 이 절차를 적용하지 않습니다.

## 현재 사용자에게 적용

1. 기존 설정을 백업합니다.

   ```bash
   cp -- ~/.bashrc ~/.bashrc.backup
   ```

2. `~/.bashrc`의 마지막에 다음 줄을 추가합니다.

   ```bash
   PS1='$ '
   ```

3. 현재 셸에서 새 설정을 불러옵니다.

   ```bash
   source ~/.bashrc
   ```

4. 프롬프트 값이 정확히 `$ `인지 확인합니다.

   ```bash
   printf '<%s>\n' "$PS1"
   ```

   출력이 `<$ >`이면 설정이 적용된 상태입니다. 프롬프트에 사용자명, 호스트명, 현재 디렉터리, 권한 수준 표시는 더 이상 나타나지 않습니다.

## SSH 세션에만 적용

로컬 터미널의 프롬프트는 유지하고 SSH 접속에서만 바꾸려면 `~/.bashrc`에 다음 조건을 추가합니다.

```bash
if [[ -n ${SSH_CONNECTION:-} ]]; then
  PS1='$ '
fi
```

`SSH_CONNECTION`은 SSH 서버가 접속 세션에 제공하는 환경 변수입니다. SSH 외의 원격 실행 도구에는 이 조건이 적용되지 않을 수 있습니다.

## 시스템 범위에 적용

시스템 파일을 바꾸면 여러 사용자에게 영향을 주므로, 먼저 변경 대상과 배포판의 로딩 순서를 확인합니다.

### 대화형 Bash: `/etc/bash.bashrc`

Ubuntu의 대화형 Bash 기본 설정을 바꾸려면 `/etc/bash.bashrc`를 백업한 뒤 편집합니다.

```bash
sudo cp -- /etc/bash.bashrc /etc/bash.bashrc.backup
sudoedit /etc/bash.bashrc
```

파일 끝에 다음 줄을 추가합니다.

```bash
PS1='$ '
```

기존 세션에는 자동으로 반영되지 않습니다. 새 Bash 세션을 열거나 해당 파일을 명시적으로 다시 불러와야 합니다.

### 로그인 셸: `/etc/profile.d/custom-prompt.sh`

로그인 셸에서 공통 값을 제공하려면 다음 파일을 만듭니다.

```bash
sudoedit /etc/profile.d/custom-prompt.sh
```

내용은 다음과 같습니다.

```bash
if [[ -n ${BASH_VERSION:-} && $- == *i* ]]; then
  PS1='$ '
fi
```

`/etc/profile`이 `/etc/profile.d/*.sh`를 불러오는 시스템에서만 이 설정이 적용됩니다. 이 파일은 `source`로 읽히므로 실행 권한은 필수 조건이 아닙니다. 또한 이후에 로드되는 사용자 설정이 `PS1`을 다시 지정하면 최종 값은 달라질 수 있습니다.

## 설정이 덮어써질 때 진단

기대 상태는 새 대화형 Bash에서 `printf '<%s>\n' "$PS1"`의 결과가 `<$ >`인 것입니다. 값이 다르면 설정 파일의 로딩 순서와 후속 재정의를 확인합니다.

```bash
type -a bash
printf 'flags=%s\n' "$-"
declare -p PROMPT_COMMAND 2>/dev/null || true
```

`PROMPT_COMMAND`는 프롬프트를 표시하기 전에 실행되는 명령입니다. 이 명령이 `PS1`을 변경하는 경우에만 원인을 제거하거나 순서를 조정합니다. 값을 확인하지 않은 채 `unset PROMPT_COMMAND`를 실행하면 터미널 제목, 명령 기록, 가상환경 표시 같은 기존 기능이 사라질 수 있습니다.

다른 설정 파일이 `PS1`을 재정의하는지 확인할 때는 Bash 관련 파일로 범위를 제한합니다.

```bash
grep -nH 'PS1=' ~/.bashrc ~/.bash_profile ~/.bash_login ~/.profile 2>/dev/null
```

## 복구

사용자 설정을 원래대로 되돌리려면 백업 파일을 복원하고 새 Bash를 시작합니다.

```bash
cp -- ~/.bashrc.backup ~/.bashrc
exec bash
```

시스템 범위 파일을 바꿨다면 해당 백업을 같은 방식으로 복원합니다. 프롬프트 설정은 셸 초기화 파일의 동작이므로 SSH 데몬을 재시작할 필요가 없습니다.
