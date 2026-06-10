# Tmux

tmux는 하나의 터미널 안에서 여러 셸을 세션, 윈도우, 패널로 관리하는 터미널 멀티플렉서다. SSH 연결이 끊겨도 tmux 서버와 그 안의 프로세스가 살아 있으면 작업을 다시 붙잡을 수 있다.

## 1. 왜 필요한가? (Pain Point & Motivation)

원격 서버에서 긴 작업을 실행할 때 로컬 터미널이나 SSH 연결이 끊기면 작업 상태를 잃기 쉽다. 여러 로그, 편집기, 서버 프로세스를 동시에 보려면 터미널 창도 계속 늘어난다.

tmux의 목적은 터미널 작업을 "현재 연결"에서 분리하는 것이다. 사용자는 세션에 붙었다가 떨어질 수 있고, 세션 안의 프로세스는 tmux 서버가 유지되는 동안 계속 실행된다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 tmux를 사용하는 것이 좋다.

- SSH 접속이 끊길까 봐 긴 작업을 실행하기 어렵다.
- 서버에서 로그, 편집기, 테스트 실행 창을 동시에 보고 싶다.
- 터미널 탭을 많이 열어 어느 작업이 어디 있는지 헷갈린다.
- 장기 실행 명령을 `nohup`이나 `&`만으로 관리하고 있다.
- 원격 서버 작업 내역을 세션 이름으로 구분하고 싶다.

## 3. 도달하고 싶은 목표 (Target State)

tmux를 제대로 쓰면 다음 상태가 된다.

- 프로젝트나 서버 작업마다 이름 있는 세션을 만든다.
- 터미널을 닫을 때 세션을 종료하지 않고 detach한다.
- 세션, 윈도우, 패널의 차이를 이해한다.
- 마지막 셸을 `exit`하면 세션이 종료될 수 있음을 안다.
- 서버 재부팅이나 tmux 서버 종료는 세션 유지 범위 밖임을 안다.
- 복구가 필요한 작업은 tmux뿐 아니라 서비스 매니저, 로그, 체크포인트를 함께 사용한다.

## 4. 시스템 번역 (Data Flow)

tmux의 구조는 다음과 같다.

```text
tmux server
  -> session
  -> window
  -> pane
  -> shell or process
```

클라이언트는 사용자가 보는 터미널 화면이다. 클라이언트가 detach되어도 tmux 서버가 살아 있고 세션 안에 실행 중인 셸이나 프로세스가 있으면 다시 attach할 수 있다.

```text
사용자 터미널
  -> tmux client
  -> tmux server
  -> session
```

## 5. 핵심 구성요소 (Building Blocks)

- Server: tmux가 백그라운드에서 유지하는 프로세스다.
- Client: 현재 사용자가 붙어 있는 터미널 화면이다.
- Session: 작업 단위다. 보통 프로젝트나 서버 단위로 만든다.
- Window: 세션 안의 탭 같은 단위다.
- Pane: 하나의 윈도우를 나눈 영역이다.
- Prefix: tmux 명령을 시작하는 키다. 기본값은 `Ctrl+b`다.
- Detach: 클라이언트를 세션에서 분리한다.
- Attach: 기존 세션에 다시 연결한다.
- Config: `~/.tmux.conf`에 키 바인딩, 마우스, 상태바 설정을 둔다.

## 6. 상태 전이 (State Transition)

세션은 다음 상태로 움직인다.

```text
not_created
  -> attached
  -> detached
  -> attached
  -> ended
```

- `not_created`: 아직 세션이 없다.
- `attached`: 클라이언트가 세션을 보고 있다.
- `detached`: 세션은 살아 있지만 현재 붙은 클라이언트가 없다.
- `ended`: 세션 안의 윈도우와 프로세스가 종료되어 세션이 사라졌다.

세션이 사라지는 대표 원인은 tmux를 detach하지 않은 것이 아니라, 세션 안의 셸이나 마지막 윈도우가 종료된 것이다. 서버 재부팅, `tmux kill-server`, `tmux kill-session`도 세션을 없앤다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 터미널을 닫기 전에는 `Ctrl+b` 다음 `d`로 detach한다.
- 작업 단위마다 이름 있는 세션을 만든다.
- 마지막 패널에서 `exit`를 실행하면 윈도우나 세션이 종료될 수 있음을 인지한다.
- `kill-server`는 모든 tmux 세션을 종료하므로 신중하게 사용한다.
- 서버 재부팅 후에도 살아야 하는 작업은 systemd service, supervisor, job queue 같은 별도 실행 관리가 필요하다.
- tmux 플러그인은 세션 레이아웃 복원 도구이지 모든 프로세스 상태를 그대로 보존하는 백업이 아니다.
- 원격 서버에서는 로컬 tmux와 서버 tmux를 중첩할 때 prefix 충돌을 피한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

이름 있는 세션을 만든다.

```bash
tmux new -s work
```

세션에서 떨어진다.

```text
Ctrl+b
d
```

세션 목록을 본다.

```bash
tmux ls
```

기존 세션에 다시 붙는다.

```bash
tmux attach -t work
```

세션을 명시적으로 종료한다.

```bash
tmux kill-session -t work
```

기본 단축키는 다음과 같다.

| 단축키 | 동작 |
| --- | --- |
| `Ctrl+b d` | detach |
| `Ctrl+b c` | 새 window |
| `Ctrl+b n` | 다음 window |
| `Ctrl+b p` | 이전 window |
| `Ctrl+b %` | 좌우 pane 분할 |
| `Ctrl+b "` | 상하 pane 분할 |
| `Ctrl+b arrow` | pane 이동 |
| `Ctrl+b x` | pane 종료 |
| `Ctrl+b ?` | 키 목록 |

## 9. 실패 사례 (What could go wrong?)

- 장기 실행 작업을 tmux 안에서 시작했지만 서버가 재부팅되어 작업이 사라진다.
- `exit`를 반복해서 마지막 셸까지 종료해 세션이 사라진다.
- 세션 이름을 정하지 않아 여러 세션 중 어디에 작업이 있는지 찾기 어렵다.
- `tmux kill-server`로 다른 사용 중인 세션까지 모두 종료한다.
- 로컬 tmux 안에서 원격 tmux를 열어 prefix 입력이 어디로 가는지 헷갈린다.
- 복구 플러그인을 설치했지만 실제 프로세스 재시작 절차는 검증하지 않았다.
- pane을 많이 나눠 가독성이 떨어지고 로그를 놓친다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 세션 생성, detach, attach만 익힌다. 이후 다음 순서로 확장한다.

- 프로젝트별 세션 이름 규칙을 만든다.
- window를 `editor`, `server`, `logs`, `test`처럼 역할별로 나눈다.
- 마우스 지원, pane 이동 키, 상태바를 `~/.tmux.conf`에 추가한다.
- tmux-resurrect 같은 플러그인으로 레이아웃 복원을 검토한다.
- 서버 재부팅 후 자동 재시작이 필요한 작업은 systemd service로 분리한다.
- 팀 서버에서는 세션 이름에 사용자명이나 프로젝트명을 포함한다.

tmux는 세션 유지 도구이지 프로세스 생명주기 관리자 전체를 대체하지 않는다. 정말 중요한 서비스는 tmux가 아니라 서비스 매니저가 관리해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 이름 있는 세션을 만들었다.
- [ ] `tmux ls`로 세션 목록을 확인할 수 있다.
- [ ] `Ctrl+b d`로 detach할 수 있다.
- [ ] `tmux attach -t <name>`으로 재접속할 수 있다.
- [ ] `exit`와 detach의 차이를 이해했다.
- [ ] 장기 실행 작업의 로그 저장 위치를 정했다.
- [ ] 서버 재부팅 시 필요한 복구 절차를 별도로 마련했다.
- [ ] `kill-server`의 영향 범위를 이해했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

tmux의 핵심은 터미널 창을 많이 여는 것이 아니라, 작업을 `____`에 담고 연결을 끊을 때는 종료가 아니라 `____`하며 다시 `____`할 수 있게 만드는 것이다.
