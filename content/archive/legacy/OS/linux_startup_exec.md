# Ubuntu 새 세션 프롬프트 설정

> **적용 범위:** Ubuntu의 대화형 Bash 프롬프트 설정이다. Zsh·Fish·비대화형 작업에는 그대로 적용하지 않는다. `BASH_VERSION`과 `$-`로 현재 셸·대화형 여부를 확인하고 사용자 설정과 시스템 설정 중 필요한 범위만 변경한다.

Ubuntu에서 새 Bash 세션의 프롬프트를 `PS1="$ "`로 고정하려면 사용자별 설정 파일이나 시스템 전역 설정 파일에 `PS1` 값을 둔다.

## 사용자별 설정

개인 사용자 세션의 프롬프트는 `~/.bashrc`에서 설정한다.

```bash
cp -- ~/.bashrc ~/.bashrc.backup
nano ~/.bashrc
```

파일 끝에 다음 줄을 추가한다.

```bash
PS1="$ "
```

현재 터미널에 즉시 적용한다.

```bash
source ~/.bashrc
```

## SSH 접속 시에만 적용

SSH 접속 세션에만 적용하려면 `~/.bashrc`에 조건문을 둔다.

```bash
if [[ -n ${SSH_CONNECTION:-} ]]; then
  PS1="$ "
fi
```

## 시스템 전체 적용

Ubuntu의 대화형 Bash 기본값은 `/etc/bash.bashrc`에서, 이를 읽는 로그인 세션의 공통값은 `/etc/profile.d/`에서 설정할 수 있다. 사용자 파일이나 프롬프트 도구가 뒤에서 값을 덮어쓸 수 있다.

### `/etc/bash.bashrc`

```bash
sudo cp -- /etc/bash.bashrc /etc/bash.bashrc.backup
sudoedit /etc/bash.bashrc
```

파일 끝에 다음 줄을 추가한다.

```bash
PS1="$ "
```

### `/etc/profile.d` 스크립트

```bash
sudoedit /etc/profile.d/custom-prompt.sh
```

```bash
case $- in
  *i*)
    if [ -n "${BASH_VERSION:-}" ]; then
      PS1='$ '
    fi
    ;;
esac
```

이 조각은 `/etc/profile`이 읽도록 구성된 시스템에서 적용된다. source로 읽는 파일이므로 실행 권한은 필수가 아니며, 기존 파일이 있었다면 편집 전에 별도 백업한다.

## `PROMPT_COMMAND` 확인

`PROMPT_COMMAND`가 설정되어 있으면 `PS1`이 다시 바뀔 수 있다.

```bash
declare -p PROMPT_COMMAND 2>/dev/null || true
```

`PROMPT_COMMAND`가 실제로 `PS1`을 변경하는 경우에만 해당 설정의 순서를 조정한다. 무조건 unset하면 터미널 제목·기록·가상환경 표시 같은 기존 기능이 사라질 수 있다. 관련 재정의를 먼저 찾는다.

```bash
grep -nH 'PS1=' ~/.bashrc ~/.bash_profile ~/.bash_login ~/.profile 2>/dev/null
```

## 확인 항목

- `PS1` 변경은 새 셸 세션부터 적용된다.
- 기존 설정을 보존하려면 변경 전에 백업 파일을 만든다.

```bash
cp ~/.bashrc ~/.bashrc.backup
```

- 새 Bash에서 `printf '<%s>\n' "$PS1"`이 `<$ >`인지 확인한다. 사용자명·호스트·현재 디렉터리·권한 표시가 사라진다는 점도 확인한다.
- 프롬프트 설정을 위해 SSH 데몬을 재시작할 필요는 없다.
- 잘못 적용되면 백업을 복원하고 새 Bash를 연다. 시스템 파일도 변경한 경우 해당 백업을 함께 복원한다.

```bash
cp -- ~/.bashrc.backup ~/.bashrc
exec bash
```
