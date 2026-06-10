# Linux GUI에서 CLI로 전환하기

이 문서는 systemd 기반 Linux에서 GUI 환경을 CLI 중심 환경으로 전환하는 방법을 정리한다. 목표는 desktop package를 바로 삭제하는 것이 아니라 `graphical.target`, `multi-user.target`, display manager, TTY의 차이를 이해하고 안전하게 전환하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버나 저사양 장비에서는 GUI가 불필요한 memory, CPU, GPU 자원을 사용할 수 있다. 장애 복구 중에는 그래픽 세션 대신 TTY나 SSH에서 작업해야 할 때도 있다.

하지만 GUI를 끄는 방법을 잘못 선택하면 원격 접속을 잃거나 display manager만 꺼진 상태와 desktop package가 삭제된 상태를 혼동할 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 top-down 구조, systemd target, display manager, TTY, 배포판별 차이를 설명한다. 보완해야 할 점은 다음과 같다.

- 일시 전환, 부팅 기본값 변경, 패키지 삭제가 분리되어야 한다.
- 원격 작업 중 GUI 전환이 SSH와 network에 미치는 영향을 명확히 해야 한다.
- Display manager 이름 확인과 rollback 절차가 더 앞에 와야 한다.
- Desktop package 제거는 기본 절차가 아니라 최후 단계로 둬야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 구분하는 것이다.

- TTY로 일시 전환한다.
- 현재 default target을 확인한다.
- 현재 boot에서만 CLI target으로 전환한다.
- 다음 boot부터 CLI로 시작하게 한다.
- GUI default target으로 되돌린다.
- Display manager service를 확인하고 필요 시 disable한다.
- Desktop package 삭제는 충분한 검증 후 별도로 진행한다.

## 4. 시스템 번역 (Data Flow)

GUI boot 흐름은 다음과 같다.

```text
systemd default target
  -> graphical.target
  -> display manager service
  -> X11 or Wayland session
  -> desktop environment
```

CLI boot 흐름은 다음과 같다.

```text
systemd default target
  -> multi-user.target
  -> getty on virtual consoles
  -> shell login
  -> optional SSH
```

`graphical.target`은 보통 `multi-user.target` 위에 display manager를 더한 상태다.

## 5. 핵심 구성요소 (Building Blocks)

`graphical.target`은 GUI login까지 포함하는 systemd target이다.

`multi-user.target`은 network와 multi-user login은 제공하지만 graphical login은 시작하지 않는 target이다.

Display manager는 GDM, SDDM, LightDM처럼 graphical login을 제공하는 service다.

TTY는 kernel virtual console이다. GUI가 깨져도 TTY에서 로그인해 복구할 수 있다.

SSH는 원격 CLI 접근 경로다. GUI를 끄기 전 SSH가 살아 있는지 확인하면 안전하다.

## 6. 상태 전이 (State Transition)

일시 전환은 다음 상태다.

```text
GUI running
  -> isolate multi-user.target
  -> display manager stops
  -> TTY login remains
  -> reboot returns to default target
```

영구 전환은 다음 상태다.

```text
default graphical.target
  -> set-default multi-user.target
  -> reboot
  -> CLI login by default
```

복구는 다음 상태다.

```text
CLI default
  -> set-default graphical.target
  -> start display manager or reboot
  -> GUI login
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 원격 서버에서는 SSH 접속과 sudo 권한을 확인한 뒤 target을 바꾼다.
- Desktop package 삭제는 target 전환으로 충분한지 확인한 뒤 결정한다.
- `isolate multi-user.target`은 현재 GUI 세션을 종료할 수 있다.
- Display manager service 이름을 확인하지 않고 disable하지 않는다.
- Network service가 `multi-user.target`에서 시작되는지 확인한다.
- GPU driver 문제 해결 중에는 package 삭제보다 TTY 복구를 우선한다.
- 변경 후 rollback 명령을 알고 있어야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 default target을 확인한다.

```bash
systemctl get-default
systemctl list-units --type=service --state=running | rg 'gdm|sddm|lightdm'
```

Display manager를 확인한다.

```bash
systemctl status gdm
systemctl status sddm
systemctl status lightdm
```

TTY로 일시 전환한다.

```text
Ctrl+Alt+F3
```

GUI로 돌아간다. 배포판과 display manager에 따라 F1, F2, F7 중 하나일 수 있다.

```text
Ctrl+Alt+F1
```

현재 boot에서만 CLI target으로 전환한다.

```bash
sudo systemctl isolate multi-user.target
```

다시 GUI를 시작한다.

```bash
sudo systemctl isolate graphical.target
```

다음 boot부터 CLI로 시작하게 한다.

```bash
sudo systemctl set-default multi-user.target
systemctl get-default
```

GUI default로 되돌린다.

```bash
sudo systemctl set-default graphical.target
systemctl get-default
```

특정 display manager 자동 시작을 끈다.

```bash
sudo systemctl disable sddm
```

다시 켠다.

```bash
sudo systemctl enable sddm
```

원격 서버에서 작업 전 SSH 상태를 확인한다.

```bash
systemctl status ssh
ss -tulpen | rg ':22'
```

## 9. 실패 사례 (What could go wrong?)

`isolate multi-user.target`를 실행하면 현재 GUI 세션의 작업이 종료될 수 있다. 저장하지 않은 GUI 작업은 사라질 수 있다.

Desktop package를 purge하면 나중에 GUI 복구가 target 변경만으로 되지 않는다. package 목록과 display manager를 다시 설치해야 한다.

Display manager가 `gdm`인지 `gdm3`인지, `sddm`인지 확인하지 않고 disable하면 효과가 없거나 다른 service를 건드릴 수 있다.

NetworkManager가 GUI session에 의존한다고 오해하면 CLI 전환 후 network가 끊길 수 있다. 실제 service enable 상태를 확인한다.

GPU driver 문제로 GUI가 깨진 경우 desktop package 삭제는 원인 해결이 아닐 수 있다. journal과 display manager log를 먼저 본다.

## 10. 뇌 확장하기 (Evolution & Variants)

Server 운영에서는 GUI package를 제거하지 않아도 `multi-user.target`을 default로 두는 것만으로 충분한 경우가 많다. Disk와 package attack surface까지 줄이고 싶을 때만 제거를 검토한다.

Container나 cloud image는 애초에 graphical target이 없을 수 있다. 이 경우 GUI 전환 문서가 아니라 package installation 문서가 필요하다.

Old SysV runlevel은 systemd target으로 대응된다. 대략 runlevel 3은 `multi-user.target`, runlevel 5는 `graphical.target`에 해당한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 현재 default target을 확인했다.
- [ ] Display manager service 이름을 확인했다.
- [ ] SSH 또는 TTY rollback 경로가 있다.
- [ ] 일시 전환과 영구 전환의 차이를 이해했다.
- [ ] GUI로 되돌리는 명령을 알고 있다.
- [ ] Desktop package 삭제가 필요한지 별도로 판단했다.
- [ ] 변경 후 reboot 동작을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux에서 GUI를 CLI로 바꾸는 핵심은 desktop을 삭제하는 것이 아니라 systemd default target과 display manager를 제어하는 것이다. 먼저 target으로 전환해 보고, package 제거는 마지막에 판단한다.
