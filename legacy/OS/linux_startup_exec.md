우분투에서 새 세션 접속 시 자동으로 PS1="$ "로 설정하는 방법에 대해 알려드리겠습니다.

## 사용자별 설정 방법

우분투에서 개인 사용자 세션의 프롬프트를 변경하려면 `.bashrc` 파일을 수정하는 것이 가장 효과적입니다:

1. 터미널을 열고 다음 명령어로 `.bashrc` 파일을 엽니다:
   ```
   nano ~/.bashrc
   ```

2. 파일 끝부분에 다음 라인을 추가합니다:
   ```
   PS1="$ "
   ```

3. `Ctrl+O`를 눌러 저장하고 `Ctrl+X`로 나갑니다.

4. 변경사항을 적용하려면 다음 명령어를 실행하거나 터미널을 다시 시작합니다:
   ```
   source ~/.bashrc
   ```

## SSH 접속 시에만 적용하기

SSH로 접속할 때만 프롬프트를 변경하려면 `.bashrc` 파일에 다음과 같이 조건문을 추가합니다:

```bash
if [[ -n $SSH_CONNECTION ]] ; then
  PS1="$ "
fi
```

## 시스템 전체 적용 방법

모든 사용자에게 동일한 프롬프트를 적용하려면 다음 방법을 사용할 수 있습니다:

### 1. /etc/bash.bashrc 수정

시스템의 모든 사용자에게 적용하려면 `/etc/bash.bashrc` 파일을 수정합니다:

```
sudo nano /etc/bash.bashrc
```

파일 끝부분에 `PS1="$ "` 라인을 추가하고 저장합니다.

### 2. /etc/profile.d에 스크립트 생성

`/etc/profile.d/` 디렉토리에 쉘 스크립트를 추가하는 방법도 있습니다:

```
sudo nano /etc/profile.d/custom-prompt.sh
```

파일에 다음 내용을 추가합니다:
```bash
#!/bin/bash
PS1="$ "
```

스크립트에 실행 권한을 부여합니다:
```
sudo chmod +x /etc/profile.d/custom-prompt.sh
```

## PROMPT_COMMAND 확인하기

만약 위 방법이 작동하지 않는다면, PROMPT_COMMAND 변수가 설정되어 있어 PS1을 재정의하고 있을 수 있습니다. 이 경우 다음 명령어로 확인합니다:

```
echo $PROMPT_COMMAND
```

PROMPT_COMMAND가 설정되어 있다면 `.bashrc` 파일에 다음 내용을 추가합니다:

```bash
unset PROMPT_COMMAND
PS1="$ "
```

## 참고 사항

1. PS1의 변경은 각 쉘 세션에 적용됩니다. 로그아웃 후 다시 로그인하면 변경된 설정이 적용됩니다.

2. 필요한 경우 변경 전 설정을 백업해두는 것이 좋습니다:
   ```
   cp ~/.bashrc ~/.bashrc.backup
   ```

3. 서버 환경에서는 변경 후 SSH 서비스를 재시작할 필요가 있을 수 있습니다:
   ```
   sudo systemctl restart sshd.service
   ```

이렇게 설정하면 새 세션이 시작될 때마다 프롬프트가 단순한 "$ "로 표시됩니다.
