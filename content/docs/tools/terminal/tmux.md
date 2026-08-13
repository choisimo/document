# tmux 세션 관리와 사라지는 세션 문제 해결하기

tmux는 터미널 세션을 유지하고 관리할 수 있게 해주는 강력한 터미널 멀티플렉서입니다. 하지만 제대로 사용하지 않으면 세션이 예기치 않게 사라질 수 있습니다.

## 적용 범위와 세션 생명주기

- **범위:** tmux version, server socket·사용자, client terminal, shell, session/window/pane 수, `exit-empty`·`remain-on-exit`와 plugin 설정을 기록합니다.
- **생명주기 전제:** terminal client 종료, detach, pane shell exit, 마지막 window 종료, tmux server 종료와 host reboot는 서로 다른 사건입니다. detach는 process를 tmux server 아래 유지하지만 reboot나 server crash를 견디는 persistence는 아닙니다.
- **사실과 추론:** `list-sessions/windows/panes`, server process, socket와 log는 근거이고, session이 사라진 원인은 해당 시점의 process·config 증거가 맞기 전까지 가설입니다.
- **실패·완료:** client 강제 종료, 마지막 pane exit, server kill, socket 변경과 reboot를 구분해 재현합니다. 기대한 process가 detach 후 유지되고 종료 정책·복원 한계가 문서화될 때 완료입니다.

---

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

1. **tmux server 또는 마지막 window 종료**: terminal client 창을 닫는 것만으로 정상적인 tmux server의 session이 보통 종료되지는 않습니다. server crash/kill, socket·user 변경, 마지막 window의 process 종료와 host reboot를 구분합니다[1]

2. **pane shell에서 `exit` 실행**: 해당 pane process가 종료되며 window의 마지막 pane이면 window도 사라질 수 있습니다. session은 마지막 window가 종료되거나 설정·명령이 session을 종료할 때 끝납니다[3]

3. **터미널 에뮬레이터 설정**: 일부 터미널 에뮬레이터(예: kitty)는 기본적으로 tmux 세션을 종료시키도록 설정되어 있을 수 있습니다[1]

## 세션 사라짐 문제 해결 방법

### 1. 올바른 세션 분리 사용하기
`Ctrl+b d`는 의도를 명확히 하는 detach 방법이지만 terminal client의 정상 종료와 session persistence를 혼동하지 않습니다. detach 후 tmux server와 대상 process가 남았는지 확인합니다[2][3].

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

2. **tmux 서버 재시작**: 간혹 tmux 서버에 문제가 생겨 세션이 보이지 않을 수 있습니다. 다음 명령을 실행해보세요:
   ```
   pkill -USR1 tmux
   ```

3. **window process 종료 정책 확인**: client 분리 자체보다 마지막 session/window의 종료와 `exit-empty`, `remain-on-exit` 등 현재 version의 option을 확인[6]:
   ```
   tmux set-option -g exit-empty off
   ```

4. **마지막 창이 닫힐 때 세션 유지**: 마지막 창이 닫혀도 세션이 유지되도록 설정[6]:
   ```
   tmux set-option -g exit-unattached off
   ```

## 요약

tmux session 유지 여부는 detach 방식 하나가 아니라 server, socket, session/window process와 host 생명주기로 판정합니다. 명시적으로 detach한 뒤 `tmux attach`로 재연결하는 흐름은 유용하지만 reboot·server crash 복구는 별도 plugin·service와 실제 restore test가 필요합니다. 추가적인 보호를 위해 tmux 설정 파일에 적절한 설정을 추가하고, 필요한 경우 세션 자동 저장 플러그인을 사용하세요.
