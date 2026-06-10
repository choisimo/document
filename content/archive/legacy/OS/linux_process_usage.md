# 터미널 세션 종료 후 프로세스 유지

터미널 또는 SSH 세션이 종료되어도 프로세스를 계속 실행하려면 프로세스를 터미널 제어와 분리한다. 대표적인 방식은 `nohup`, `disown`, `screen`, `tmux`, `setsid`이다.

## `nohup`과 백그라운드 실행

```bash
nohup COMMAND &
```

- `nohup`: HUP(Hangup) 시그널 무시
- `&`: 백그라운드 실행
- 기본 출력 파일: `nohup.out`

출력 파일을 명시하는 형태는 다음과 같다.

```bash
nohup ./backup_proc.sh > backup.log 2>&1 &
```

로그를 저장하지 않는 형태는 다음과 같다.

```bash
nohup ./backup_proc.sh > /dev/null 2>&1 &
```

## 실행 중인 작업을 `disown`으로 분리

현재 셸에서 시작한 작업은 일시 정지 후 백그라운드로 전환하고 `disown`으로 셸 작업 테이블에서 제거할 수 있다.

```bash
COMMAND
Ctrl+Z       # 프로세스 일시 정지
bg           # 백그라운드 실행 재개
disown -h %1 # 현재 셸에서 분리
```

작업 번호는 `jobs -l`로 확인한다.

```bash
jobs -l
disown -h %작업번호
```

`disown`은 PID가 아니라 작업 ID를 기준으로 동작한다. 작업 ID는 일반적으로 `%1`, `%2`와 같이 `%` 기호로 시작한다.

## `screen` 또는 `tmux`

장시간 작업은 터미널 멀티플렉서 세션 안에서 실행할 수 있다.

```bash
screen -S session_name
COMMAND
Ctrl+A -> D   # 세션 분리
```

분리한 세션에 다시 접속한다.

```bash
screen -r session_name
```

이 방식은 다중 세션 관리와 실행 상태 확인에 적합하다.

## `setsid`

`setsid`는 새 세션 ID에서 프로세스를 실행한다.

```bash
setsid COMMAND
```

출력이 터미널로 남지 않도록 리디렉션을 함께 둔다.

```bash
setsid rsync [옵션들] > rsync.log 2>&1 &
```

## 방법 비교

| 방법 | 장점 | 제한 | 사용 사례 |
| :--- | :--- | :--- | :--- |
| `nohup` | 간단한 실행 | 출력 파일 관리 필요 | 단일 명령 실행 |
| `disown` | 이미 시작한 셸 작업 처리 | 현재 셸의 작업 테이블에 있는 작업만 가능 | 작업 중인 프로세스 유지 |
| `screen`/`tmux` | 세션 재접속 가능 | 도구 설치 필요 | 장기 작업, 여러 작업 관리 |
| `setsid` | 새 세션에서 즉시 실행 | 출력 리디렉션 필요 | 터미널과 분리된 즉시 실행 |

## 프로세스 확인

```bash
ps aux | grep COMMAND  # 프로세스 확인
pgrep -f COMMAND       # PID 확인
lsof -p PID            # 열린 파일 확인
```

SSH 연결이 끊어진 뒤에도 프로세스를 유지하려면 터미널 제어와의 분리가 필요하다. 클라우드 환경의 반복 작업은 systemd 서비스 유닛으로 관리할 수 있다.

## 다른 세션에서 실행 중인 프로세스 처리

다른 터미널 세션에서 실행 중인 백업 프로세스 예시는 PID `19282`를 기준으로 한다.

### 시그널 전송

```bash
kill -SIGTSTP 19282   # TSTP 신호 보내기
kill -SIGCONT 19282   # 프로세스 다시 시작
```

`disown`은 현재 셸의 작업 테이블에 등록된 작업에 적용된다. 다른 셸에서 시작된 PID만으로는 일반적으로 `disown`을 적용할 수 없다.

### 종료 후 `nohup`으로 재시작

기존 프로세스를 `nohup` 상태로 직접 바꾸는 방식은 일반적으로 제공되지 않는다. 명령을 확인한 뒤 종료하고 다시 실행한다.

```bash
cat /bin/bash ./backup_proc.sh
```

```bash
kill 19282
cd /mnt/nas/files/backup
nohup ./backup_proc.sh > backup.log 2>&1 &
```

### 작업 제어를 통한 분리

프로세스가 원래 세션의 작업으로 관리되고 있다면 다음 흐름을 사용할 수 있다.

```bash
# 다른 세션(pts/1)에서
kill -STOP 19282
kill -CONT 19282 &
```

이후 원래 세션(pts/0)에서 `disown %1`을 실행한다.

## `disown` 오류 원인

다음 오류는 `disown`의 적용 범위 때문에 발생한다.

```text
-bash: disown: 19446: no such job
sudo: disown: command not found
```

원인은 다음과 같다.

- `disown 19446`: `19446`은 PID이며, `disown`은 현재 셸 작업 ID를 사용한다.
- `sudo disown 19446`: `disown`은 독립 실행 파일이 아니라 셸 내장 명령이므로 `sudo`로 실행되지 않는다.
- 대상 프로세스가 현재 셸에서 시작되지 않았거나 작업 테이블에 없으면 `disown` 대상이 아니다.

현재 셸 작업 목록에 대상이 있으면 작업 번호로 분리한다.

```bash
jobs -l
disown %작업번호
```

현재 셸 작업이 아니면 프로세스를 종료한 뒤 `nohup`, `screen`, `tmux`, `setsid`, systemd 서비스 등으로 다시 실행한다.

```bash
kill 19446
nohup rsync [원래 옵션들] > rsync.log 2>&1 &
```
