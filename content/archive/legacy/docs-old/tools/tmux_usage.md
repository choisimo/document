# tmux 세션 관리와 사라지는 세션 문제 해결하기

tmux는 터미널 세션을 유지하고 관리할 수 있게 해주는 강력한 터미널 멀티플렉서입니다. 하지만 제대로 사용하지 않으면 세션이 예기치 않게 사라질 수 있습니다.

## 세션·서버·프로세스 상태 구분

터미널 창 종료는 보통 tmux client 연결을 끊을 뿐, tmux server와 내부 shell이 살아 있으면 session은 유지된다. session이 사라지는 원인은 마지막 shell 종료, `tmux kill-*`, 서버 프로세스 종료, 재부팅, 사용자 runtime 정리 등으로 나눠 확인한다. `pkill -USR1 tmux`는 일반적인 재시작 명령으로 사용하지 않는다. resurrect·continuum은 창 배치와 실행 명령 복원을 돕지만 임의 프로세스의 메모리 상태까지 복원하지 않는다. 완료는 session 목록, server PID, 재접속, 로그아웃·재부팅 후 기대 지속 범위를 각각 확인해 판정한다.

## tmux 기본 사용법

**세션 생성 및 관리:**
```bash
# 새 세션 생성
tmux

# 이름 지정하여 세션 생성
tmux new-session -s 세션이름
tmux new -s 세션이름
```

**세션 분리 및 재연결:**
```bash
# 세션 분리 (세션은 백그라운드에서 계속 실행)
Ctrl+b 누른 후 d 키 입력

# 세션 목록 확인
tmux ls
tmux list-sessions

# 세션에 재연결
tmux attach
tmux a
tmux attach -t 세션이름
```

## 세션이 사라지는 문제 원인

세션이 사라지는 주요 원인은 다음과 같습니다[1][2]:

1. **tmux server 또는 내부 shell 종료**: 터미널 창을 닫는 것만으로는 보통 client만 끊기지만, 마지막 shell이나 tmux server가 함께 종료되면 session도 사라집니다[1]

2. **세션 내에서 exit 명령 사용**: 세션을 분리(detach)하지 않고 세션 내에서 exit 명령을 실행하면 해당 세션이 완전히 종료됩니다[3]

3. **터미널 에뮬레이터 설정**: 일부 터미널 에뮬레이터(예: kitty)는 기본적으로 tmux 세션을 종료시키도록 설정되어 있을 수 있습니다[1]

## 세션 사라짐 문제 해결 방법

### 1. 올바른 세션 분리 사용하기
터미널을 종료하기 전에 반드시 `Ctrl+b d`를 사용하여 세션을 분리하세요[2][3]. 이렇게 하면 세션이 백그라운드에서 계속 실행됩니다.

### 2. tmux 세션 자동 저장 설정
tmux 설정 파일(~/.tmux.conf)에 다음을 추가하여 세션을 자동으로 저장하고 복구할 수 있습니다[7]:

```
# 자동 세션 저장 관련 플러그인 설치 (tmux plugin manager 필요)
set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'

# 자동 저장 활성화
set -g @continuum-restore 'on'
```

### 3. 세션 종료 방지 설정
tmux 설정 파일에 다음 설정을 추가하여 창이 닫힐 때 세션이 종료되는 것을 방지할 수 있습니다[1]:

```
set -g detach-on-destroy on
```

### 4. 세션 사라짐 문제 해결 팁

1. **다른 사용자로 실행된 세션 확인**: 세션이 보이지 않는다면 다른 사용자 계정으로 실행되었을 수 있습니다[10]. 다른 사용자로 로그인하여 세션을 확인해보세요.

2. **삭제된 socket 복구 신호**: server가 살아 있지만 socket 파일만 사라진 특정 상황에서 다음 신호가 사용될 수 있습니다. 일반적인 server 재시작 명령은 아닙니다:
   ```
   pkill -USR1 tmux
   ```

3. **세션 자동 종료 방지**: 모든 클라이언트가 분리되었을 때 서버가 자동으로 종료되지 않도록 설정[6]:
   ```
   tmux set-option -g exit-empty off
   ```

4. **마지막 창이 닫힐 때 세션 유지**: 마지막 창이 닫혀도 세션이 유지되도록 설정[6]:
   ```
   tmux set-option -g exit-unattached off
   ```

## 요약

tmux 세션 관리의 핵심은 세션을 올바르게 분리(detach)하는 것입니다. 명시적으로 분리하려면 `Ctrl+b d`를 사용하고, server와 session이 유지된 경우 `tmux attach`로 다시 연결합니다. 추가적인 보호를 위해 tmux 설정 파일에 적절한 설정을 추가하고, 필요한 경우 세션 자동 저장 플러그인을 사용하세요.
