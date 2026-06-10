# Ubuntu 새 세션 프롬프트 설정

Ubuntu에서 새 Bash 세션의 프롬프트를 `PS1="$ "`로 고정하려면 사용자별 설정 파일이나 시스템 전역 설정 파일에 `PS1` 값을 둔다.

## 사용자별 설정

개인 사용자 세션의 프롬프트는 `~/.bashrc`에서 설정한다.

```bash
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
if [[ -n $SSH_CONNECTION ]] ; then
  PS1="$ "
fi
```

## 시스템 전체 적용

모든 사용자에게 같은 프롬프트를 적용하려면 `/etc/bash.bashrc` 또는 `/etc/profile.d/` 스크립트를 사용한다.

### `/etc/bash.bashrc`

```bash
sudo nano /etc/bash.bashrc
```

파일 끝에 다음 줄을 추가한다.

```bash
PS1="$ "
```

### `/etc/profile.d` 스크립트

```bash
sudo nano /etc/profile.d/custom-prompt.sh
```

```bash
#!/bin/bash
PS1="$ "
```

```bash
sudo chmod +x /etc/profile.d/custom-prompt.sh
```

## `PROMPT_COMMAND` 확인

`PROMPT_COMMAND`가 설정되어 있으면 `PS1`이 다시 바뀔 수 있다.

```bash
echo $PROMPT_COMMAND
```

필요한 경우 `~/.bashrc`에 다음 내용을 둔다.

```bash
unset PROMPT_COMMAND
PS1="$ "
```

## 확인 항목

- `PS1` 변경은 새 셸 세션부터 적용된다.
- 기존 설정을 보존하려면 변경 전에 백업 파일을 만든다.

```bash
cp ~/.bashrc ~/.bashrc.backup
```

- 서버 환경에서는 설정 방식에 따라 SSH 서비스 재시작이 필요할 수 있다.

```bash
sudo systemctl restart sshd.service
```
