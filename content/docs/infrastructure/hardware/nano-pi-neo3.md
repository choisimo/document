# NanoPi NEO3 초기 접속 및 네트워크 설정 학습 노트

NanoPi NEO3는 FriendlyELEC의 RK3328 기반 SBC다. 초기 부팅 문제는 대부분 OS 이미지 종류, 첫 부팅 초기화 시간, 네트워크 주소 확인, 기본 계정 정책, SSH 키 사용 방식이 섞여 발생한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

SBC는 화면 없이 SSH로 접속하는 경우가 많다. 이때 기본 계정이 맞지 않거나 DHCP 주소를 못 찾거나 첫 부팅 초기화가 끝나지 않으면 “로그인이 안 된다”로 보인다. 게다가 이미지마다 FriendlyWrt, FriendlyCore, Ubuntu, Armbian의 기본 로그인 정책이 다르다.

NanoPi NEO3 문서의 목표는 무작정 기본 비밀번호를 대입하는 것이 아니라, 어떤 이미지로 부팅했는지 확인하고 안전하게 초기 접속과 네트워크 고정까지 마무리하는 것이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 다음 주제를 한 파일에 섞어 설명했다.

- OS 이미지별 기본 로그인 후보
- 첫 부팅 대기와 SSH 접속
- NetworkManager와 `nmcli` 기반 고정 IP 설정
- SSH 공개 키와 `libcrypto` 오류

또한 FriendlyELEC 공식 이미지, Armbian, DietPi, 일반 Ubuntu의 기본 계정이 표로 나열되어 있었지만, 실제 기본 계정은 이미지 버전과 배포 방식에 따라 달라질 수 있다. 공식 문서 기준으로 확인해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 사용한 OS 이미지가 FriendlyELEC 계열인지 Armbian 계열인지 확인한다.
- 첫 부팅 초기화가 끝날 때까지 기다린 뒤 접속을 시도한다.
- DHCP에서 받은 IP 또는 시리얼 콘솔로 접속 경로를 확보한다.
- 기본 비밀번호를 즉시 바꾸고 일반 사용자 계정을 만든다.
- `nmcli`로 고정 IP를 설정할 때 원격 접속이 끊기는 위험을 줄인다.
- SSH 인증은 개인 키와 공개 키 역할을 구분해 점검한다.

## 4. 시스템 번역 (Data Flow)

초기 접속 흐름은 다음과 같다.

```text
OS image flash
  -> first boot initialization
  -> DHCP address or serial console
  -> first login
  -> password change and user setup
  -> network profile configuration
  -> SSH key authentication
```

고정 IP 설정 흐름은 다음과 같다.

```text
NetworkManager connection profile
  -> IPv4 address, gateway, DNS
  -> connection reload
  -> route and DNS validation
  -> SSH reconnect
```

SSH 키 인증 흐름은 다음과 같다.

```text
client private key
  -> SSH authentication
  -> server authorized_keys public key
  -> sshd log
```

`.pub` 파일은 서버에 등록되는 공개 키이고, 클라이언트가 `-i`로 지정해야 하는 파일은 개인 키다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인 방법 |
| --- | --- | --- |
| OS image | 로그인 정책과 네트워크 관리 방식 결정 | 이미지 이름과 공식 문서 |
| microSD card | 부팅 저장장치 | 재플래시와 파일시스템 확장 |
| DHCP lease | 초기 SSH 주소 제공 | 라우터 DHCP 목록, `arp-scan` |
| Serial console | 네트워크 없이 접속하는 복구 경로 | 1500000 bps, 8N1 |
| NetworkManager | 고정 IP 설정 관리 | `nmcli device status` |
| SSH key pair | 안전한 원격 로그인 | 개인 키와 공개 키 권한 |

공식 문서에서 확인한 안정적인 기준은 다음과 같다.

- NanoPi NEO3 시리얼 디버그 포트는 1500000 bps를 사용한다.
- Armbian 첫 SSH 로그인은 `root`와 `1234`를 사용한 뒤 비밀번호 변경과 일반 사용자 생성을 요구한다.
- FriendlyELEC 계열 이미지는 이미지별 계정 정책이 다르므로 해당 이미지 문서를 우선한다.

## 6. 상태 전이 (State Transition)

NanoPi NEO3 초기 설정 상태는 다음처럼 이동한다.

```text
이미지 플래시됨
  -> 첫 부팅 완료
  -> 접속 경로 확보
  -> 기본 계정 변경
  -> 고정 IP 적용
  -> SSH 키 인증 검증
  -> 운영 준비
```

각 단계의 통과 기준은 다음과 같다.

- 첫 부팅 완료: LED와 네트워크 링크가 안정되고 DHCP lease가 보인다.
- 접속 경로 확보: SSH 또는 serial console 중 하나로 로그인 가능하다.
- 기본 계정 변경: 기본 비밀번호가 남아 있지 않다.
- 고정 IP 적용: 새 IP로 SSH 재접속 가능하다.
- SSH 키 검증: 비밀번호 없이 개인 키로 로그인 가능하다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 기본 계정 정보는 이미지 이름과 공식 문서를 확인한 뒤 사용한다.
- 기본 비밀번호는 첫 로그인 직후 변경한다.
- 원격 SSH만 있는 상태에서 네트워크 설정을 바꿀 때는 시리얼 콘솔 또는 현장 접근을 준비한다.
- 고정 IP는 DHCP pool과 충돌하지 않는 주소를 사용한다.
- SSH 클라이언트는 `.pub` 공개 키가 아니라 개인 키를 사용한다.
- `~/.ssh`는 `700`, `authorized_keys`는 `600` 권한을 유지한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

초기 네트워크 주소를 찾는다.

```bash
ip neigh
arp -a
```

Armbian 이미지라면 첫 SSH 로그인은 다음 흐름으로 시작한다.

```bash
ssh root@192.168.0.50
```

첫 로그인 후 비밀번호 변경과 일반 사용자 생성 절차를 완료한다.

NetworkManager 상태를 확인한다.

```bash
nmcli device status
nmcli connection show
```

고정 IP를 설정한다. 연결 이름은 실제 출력에 맞춰 바꾼다.

```bash
sudo nmcli con mod "Wired connection 1" \
  ipv4.addresses 192.168.0.100/24 \
  ipv4.gateway 192.168.0.1 \
  ipv4.dns "1.1.1.1 8.8.8.8" \
  ipv4.method manual
```

변경을 적용한다.

```bash
sudo nmcli con down "Wired connection 1"
sudo nmcli con up "Wired connection 1"
ip -4 addr show eth0
ip route
```

SSH 공개 키와 권한을 확인한다.

```bash
ssh-keygen -l -f ~/.ssh/id_ed25519.pub
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
ssh -i ~/.ssh/id_ed25519 user@192.168.0.100
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 이미지 종류를 확인하지 않고 기본 계정을 대입하는 것이다. Armbian, FriendlyWrt, Ubuntu 계열 이미지는 첫 로그인 정책이 다를 수 있다.

두 번째 실패는 첫 부팅 초기화 중에 로그인 실패로 판단하는 것이다. 파일시스템 확장, SSH 키 생성, 초기 스크립트가 끝날 때까지 시간이 걸릴 수 있다.

세 번째 실패는 SSH 접속 중 고정 IP를 바꾸고 새 주소를 모르는 상태가 되는 것이다. 이 경우 시리얼 콘솔이나 라우터 DHCP 목록이 복구 경로가 된다.

네 번째 실패는 `.pub` 파일을 `ssh -i`에 지정하는 것이다. 공개 키는 서버의 `authorized_keys`에 들어가고, 클라이언트는 개인 키를 사용해야 한다.

다섯 번째 실패는 `error in libcrypto`를 공개 키 문제로만 보는 것이다. 개인 키 파일 손상, 잘못된 형식, OpenSSH/OpenSSL 호환성, 파일 권한 문제도 함께 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

운영용 SBC라면 DHCP보다 라우터 DHCP reservation을 우선 검토한다. 장치 안에서 고정 IP를 설정하는 것보다 네트워크 중앙에서 충돌을 관리하기 쉽다.

여러 SBC를 Proxmox quorum device, 모니터링 노드, 백업 노드로 쓴다면 호스트명, SSH key, inventory, 전원 복구 정책을 표준화한다.

NetworkManager 대신 Netplan 또는 systemd-networkd를 쓰는 이미지도 있다. 실제 renderer는 `/etc/netplan`과 `systemctl status NetworkManager`로 확인한 뒤 문서를 적용해야 한다.

공식 정보를 확인할 때는 FriendlyELEC NanoPi NEO3 wiki와 Armbian Getting Started 문서를 우선한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용한 OS 이미지 이름과 출처를 확인했다.
- [ ] 첫 부팅 초기화가 끝날 때까지 기다렸다.
- [ ] SSH 또는 serial console 접속 경로를 확보했다.
- [ ] 기본 비밀번호를 변경하고 일반 사용자를 만들었다.
- [ ] 고정 IP가 DHCP pool과 충돌하지 않는다.
- [ ] NetworkManager 연결 이름을 실제 출력으로 확인했다.
- [ ] 새 IP로 SSH 재접속이 가능하다.
- [ ] SSH 개인 키와 공개 키의 역할과 권한을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

NanoPi NEO3 초기 접속 문제는 비밀번호 하나의 문제가 아니라 `__________`, 첫 부팅 초기화, 네트워크 주소, SSH 키 역할의 문제다. 고정 IP를 바꾸기 전에는 반드시 `__________` 경로를 확보하고, SSH 클라이언트에는 `.pub`가 아니라 `__________` 키를 지정한다.
