# 백그라운드 프로세스 관리 학습 노트

백그라운드 프로세스 관리는 SSH 세션을 닫아도 작업이 계속 실행되게 하는 방법을 고르는 일이다. `nohup`, `disown`, `tmux`, `screen`, `systemd`는 모두 목적이 다르므로 작업의 성격에 맞게 선택해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

원격 서버에서 긴 작업을 실행하다가 SSH 세션이 끊기면 프로세스가 `SIGHUP`을 받고 종료될 수 있다. 백업, 마이그레이션, 장시간 빌드, 데이터 처리처럼 중단되면 안 되는 작업은 터미널 세션과 분리하거나 재접속 가능한 세션에서 실행해야 한다.

운영 관점에서는 “계속 실행”만이 목표가 아니다. 로그를 어디서 볼지, 실패하면 재시작할지, 부팅 후 자동 시작할지, 누가 종료할 수 있는지도 함께 정해야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 다음 도구를 설명했다.

- `Ctrl+Z`, `bg`, `fg`, `jobs`, `disown`
- `nohup`, `setsid`
- `tmux`, `screen`
- `reptyr`
- `systemd` 서비스

다만 도구별 명령이 길게 나열되어 있어, 어떤 상황에서 어떤 방법을 선택해야 하는지가 덜 명확했다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 일회성 장기 작업은 `nohup` 또는 `tmux`로 실행한다.
- 대화형 작업은 `tmux` 또는 `screen`에서 실행한다.
- 이미 실행 중인 작업은 `jobs`, `bg`, `disown`으로 분리할 수 있다.
- 반복 실행 서비스는 `systemd`로 승격한다.
- 모든 백그라운드 작업은 로그와 종료 방법을 가진다.

## 4. 시스템 번역 (Data Flow)

터미널 세션과 프로세스의 관계는 다음처럼 볼 수 있다.

```text
SSH session
  -> shell
  -> foreground process
  -> SIGHUP when session closes
```

세션과 분리하면 흐름이 바뀐다.

```text
SSH session
  -> shell
  -> nohup or tmux or systemd
  -> process keeps running
  -> log file or journal
```

운영 서비스는 다음 흐름이 더 적합하다.

```text
systemd
  -> service process
  -> journal logs
  -> restart policy
  -> boot-time activation
```

## 5. 핵심 구성요소 (Building Blocks)

| 도구 | 역할 | 적합한 상황 |
| --- | --- | --- |
| `nohup` | `SIGHUP` 무시 후 실행 | 단순 일회성 작업 |
| `disown` | 셸 job table에서 분리 | 이미 실행 중인 작업 분리 |
| `tmux` | 세션 유지와 재접속 | 장시간 대화형 작업 |
| `screen` | 세션 유지와 재접속 | tmux 대안 |
| `setsid` | 새 세션에서 실행 | 터미널 의존성 제거 |
| `systemd` | 서비스 생명주기 관리 | 운영 서비스 |
| `journalctl` | 서비스 로그 확인 | systemd 서비스 관측 |

기본 셸 작업 제어는 다음 의미를 가진다.

| 명령 | 의미 |
| --- | --- |
| `Ctrl+Z` | 포어그라운드 작업 일시 중지 |
| `bg` | 중지된 작업을 백그라운드로 재개 |
| `fg` | 백그라운드 작업을 포어그라운드로 이동 |
| `jobs` | 현재 셸의 작업 목록 |
| `disown -h` | 작업이 `SIGHUP`을 무시하도록 표시 |

## 6. 상태 전이 (State Transition)

작업 실행 상태는 다음처럼 이동한다.

```text
foreground
  -> stopped
  -> background
  -> detached
  -> completed or failed
```

운영 서비스로 승격하면 상태 모델이 달라진다.

```text
manual command
  -> supervised service
  -> enabled on boot
  -> restarted on failure
  -> observed through logs
```

상태별 확인 기준은 다음과 같다.

- background: `jobs` 또는 `ps`로 PID를 확인할 수 있다.
- detached: 세션 종료 후에도 PID가 유지된다.
- supervised: `systemctl status`로 상태와 실패 원인을 볼 수 있다.
- completed: 로그와 exit code를 확인할 수 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 백그라운드 작업은 stdout과 stderr를 파일 또는 journal로 보낸다.
- PID와 로그 경로를 기록하지 않은 장기 작업은 운영 작업으로 보지 않는다.
- 중요한 반복 작업은 `nohup`보다 `systemd` 서비스나 타이머로 관리한다.
- `disown`은 이미 실행 중인 작업을 임시로 살리는 방법이지 운영 관리 도구가 아니다.
- `reptyr`와 ptrace 설정 변경은 보안 영향을 이해한 경우에만 사용한다.
- 세션 분리 후에도 CPU, 메모리, 디스크 사용량을 모니터링한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

단순 장기 작업은 로그 파일을 명시한다.

```bash
nohup /opt/scripts/backup.sh > /var/log/backup.log 2>&1 &
echo $!
```

이미 실행 중인 작업을 분리한다.

```text
Ctrl+Z
```

```bash
jobs
bg %1
disown -h %1
```

재접속 가능한 작업은 `tmux`로 실행한다.

```bash
tmux new -s backup
```

세션 분리는 다음 키를 사용한다.

```text
Ctrl+B, D
```

재접속한다.

```bash
tmux attach -t backup
```

운영 서비스는 systemd unit으로 관리한다.

```ini
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/run.sh
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

서비스를 시작하고 로그를 확인한다.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
systemctl status myapp
journalctl -u myapp -f
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 백그라운드 작업의 출력을 터미널에 그대로 두는 것이다. 세션 종료 후 출력 대상이 사라지거나 작업이 멈춘 것처럼 보일 수 있다.

두 번째 실패는 `nohup` 작업의 PID를 기록하지 않는 것이다. 나중에 어떤 프로세스를 종료해야 하는지 찾기 어렵다.

세 번째 실패는 장기 운영 서비스를 `tmux` 안에서만 돌리는 것이다. 서버 재부팅 후 자동 시작과 실패 재시작이 없다.

네 번째 실패는 `disown`을 백업처럼 생각하는 것이다. 로그, 재시작, 상태 관리가 없으므로 임시 조치일 뿐이다.

다섯 번째 실패는 `reptyr` 사용을 위해 ptrace 제한을 낮춘 뒤 원복하지 않는 것이다. 보안 경계가 약해질 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

반복 작업은 systemd timer나 cron으로 옮길 수 있다. 단, 로그와 실패 알림이 필요하면 systemd timer가 더 관측하기 쉽다.

컨테이너 안에서 장기 프로세스를 실행한다면 Docker restart policy와 로그 드라이버를 함께 고려해야 한다.

Kubernetes 환경에서는 Pod, Job, CronJob이 같은 역할을 담당한다. 이 경우 셸 job control이 아니라 오케스트레이터 상태를 기준으로 본다.

장시간 마이그레이션은 `tmux`와 별도 로그 파일을 함께 쓰는 방식이 실무적으로 안전하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 작업이 일회성인지 운영 서비스인지 구분했다.
- [ ] 로그 출력 경로를 정했다.
- [ ] PID 또는 서비스 이름을 기록했다.
- [ ] 세션 종료 후에도 작업이 유지되는지 확인했다.
- [ ] 실패 시 재시작이 필요한 경우 systemd로 관리한다.
- [ ] 종료 방법을 알고 있다.
- [ ] CPU, 메모리, 디스크 사용량을 확인했다.
- [ ] 중요한 작업은 재부팅 후 동작까지 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

백그라운드 실행의 핵심은 프로세스를 숨기는 것이 아니라 `__________`, 로그, 종료 방법을 관리하는 것이다. 일회성은 `__________`, 대화형 장기 작업은 `__________`, 운영 서비스는 `__________`가 기준이다.
