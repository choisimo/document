# nmcli 네트워크 설정 가이드

`nmcli`는 NetworkManager의 명령줄 도구다. 이 문서는 리눅스 서버에서 NetworkManager 연결 프로필을 확인하고, 고정 IP를 적용하고, 장애 시 DHCP로 되돌리는 최소 런북을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버 네트워크 설정은 GUI 없이 SSH에서 처리하는 경우가 많다. 이때 연결 이름, 장치 이름, IP 주소, gateway, DNS를 잘못 구분하면 접속이 끊기거나 재부팅 후 설정이 사라진다.

`nmcli`를 제대로 쓰면 NetworkManager가 실제로 관리하는 프로필을 수정할 수 있다. 반대로 NetworkManager가 관리하지 않는 인터페이스에 `nmcli` 명령을 넣으면 아무 효과가 없거나 다른 프로필을 건드릴 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `nmcli` 명령 예제를 많이 제공하지만 운영 순서가 명확하지 않았다.

- 연결 이름과 디바이스 이름을 같은 것으로 취급하기 쉽다.
- SSH 접속 중 `connection down`을 먼저 실행하는 위험이 있다.
- 고정 IP 적용 후 route와 DNS 검증이 부족하다.
- Wi-Fi 비밀번호와 MAC 스푸핑 같은 민감한 명령이 일반 서버 런북과 섞여 있다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 NetworkManager가 관리하는 프로필을 안전하게 수정하고, 적용 결과를 커널 상태로 확인하는 것이다.

- `nmcli device status`로 장치와 관리 상태를 확인한다.
- `nmcli connection show`로 수정할 연결 프로필 이름을 확인한다.
- 고정 IP, gateway, DNS를 한 프로필에 명시한다.
- 원격 서버에서는 새 설정 적용 전에 복구 경로를 준비한다.
- 장애 시 DHCP 프로필로 되돌릴 수 있다.

## 4. 시스템 번역 (Data Flow)

`nmcli` 설정은 다음 흐름으로 적용된다.

```text
nmcli 명령
  -> NetworkManager connection profile
  -> NetworkManager daemon
  -> interface address, route, DNS 설정
  -> 실제 네트워크 트래픽
```

`connection profile`은 설정 객체이고 `device`는 물리 또는 가상 인터페이스다. `Wired connection 1` 같은 이름은 프로필 이름이고, `ens18` 같은 이름은 디바이스 이름이다.

## 5. 핵심 구성요소 (Building Blocks)

`nmcli device status`는 NetworkManager가 각 장치를 관리하는지 보여준다.

`nmcli connection show`는 저장된 연결 프로필 목록을 보여준다. 같은 디바이스에 여러 프로필이 있을 수 있다.

`ipv4.method manual`은 DHCP 대신 수동 주소를 쓰겠다는 선언이다. 이 값을 쓰려면 `ipv4.addresses`가 비어 있으면 안 된다.

`ipv4.gateway`는 기본 route의 next hop이다. NetworkManager 공식 설정 문서는 gateway 설정이 표준 default route를 구성한다고 설명한다.

`ipv4.dns`와 `ipv4.ignore-auto-dns`는 DNS 서버 선택에 영향을 준다. DHCP에서 받은 DNS를 무시하려면 `ignore-auto-dns`를 함께 설정한다.

## 6. 상태 전이 (State Transition)

`nmcli` 작업은 다음 순서로 진행한다.

```text
상태 확인
  -> 프로필 선택
  -> 변경 전 값 기록
  -> 프로필 수정
  -> 연결 재적용
  -> route와 DNS 검증
  -> 장애 시 DHCP 복구
```

원격 SSH 작업에서는 `connection down`보다 `connection up` 또는 `device reapply`를 먼저 고려한다. IP 변경이 포함되면 기존 세션은 끊길 수 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 연결 이름과 디바이스 이름을 출력으로 확인하지 않고 추측하지 않는다.
- `manual` 방식에는 IP 주소와 prefix를 반드시 함께 둔다.
- gateway는 같은 서브넷에서 도달 가능한 주소여야 한다.
- DNS만 바꿀 때 IP와 gateway를 불필요하게 건드리지 않는다.
- Wi-Fi 비밀번호나 회사 네트워크 인증 정보는 문서와 히스토리에 남기지 않는다.
- 원격 서버의 활성 연결을 내리기 전에 새 접속 경로를 준비한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 상태를 확인한다.

```bash
nmcli device status
nmcli connection show
nmcli connection show --active
```

활성 연결의 상세 IPv4 값을 확인한다.

```bash
nmcli -f GENERAL.CONNECTION,IP4.ADDRESS,IP4.GATEWAY,IP4.DNS device show ens18
nmcli connection show "Wired connection 1"
```

고정 IP를 적용한다.

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1 8.8.8.8" \
  ipv4.ignore-auto-dns yes \
  connection.autoconnect yes

sudo nmcli connection up "Wired connection 1"
```

적용 결과를 확인한다.

```bash
ip -4 addr show ens18
ip route get 1.1.1.1
resolvectl status
curl -I https://example.com
```

DHCP로 되돌린다.

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method auto \
  ipv4.addresses "" \
  ipv4.gateway "" \
  ipv4.dns "" \
  ipv4.ignore-auto-dns no

sudo nmcli connection up "Wired connection 1"
```

새 프로필을 별도로 만들고 싶을 때는 기존 프로필을 바로 덮지 않는다.

```bash
sudo nmcli connection add \
  type ethernet \
  con-name "Static-LAN" \
  ifname ens18 \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1 8.8.8.8" \
  connection.autoconnect yes

sudo nmcli connection up "Static-LAN"
```

## 9. 실패 사례 (What could go wrong?)

`ipv4.method manual`만 설정하고 주소를 넣지 않으면 프로필 활성화가 실패한다. `nmcli connection show "..."`로 `ipv4.addresses`가 비어 있는지 확인한다.

명령은 성공했는데 IP가 바뀌지 않으면 다른 프로필이 활성화되어 있을 수 있다. `nmcli connection show --active`와 `nmcli device status`를 함께 확인한다.

DNS가 동작하지 않으면 `ipv4.ignore-auto-dns`가 의도와 다를 수 있다. DHCP DNS를 무시할지, 수동 DNS를 추가할지 먼저 결정한다.

`sudo systemctl restart NetworkManager`는 모든 연결을 흔들 수 있다. 단일 프로필 문제라면 먼저 `nmcli connection up "프로필명"` 또는 `nmcli device reapply 장치명`을 사용한다.

## 10. 뇌 확장하기 (Evolution & Variants)

Wi-Fi 연결도 `nmcli`로 만들 수 있지만 서버 문서에서는 비밀번호 노출 위험이 크다. 장기 운영 서버라면 WPA 설정 파일 권한과 히스토리 노출을 별도로 관리한다.

MTU, VLAN, bond, bridge, MAC clone 설정은 단일 IP 변경보다 장애 범위가 크다. Proxmox나 Docker 호스트라면 해당 플랫폼의 bridge/VLAN 문서를 먼저 확인한다.

NetworkManager 공식 문서는 `nmcli` 속성 이름과 alias를 모두 제공한다. 자동화 스크립트에서는 `ipv4.addr` 같은 짧은 alias보다 `ipv4.addresses`처럼 긴 이름을 쓰는 편이 읽기 쉽다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `nmcli device status`로 장치가 NetworkManager 관리 대상인지 확인했다.
- [ ] 수정할 연결 프로필 이름을 출력으로 확인했다.
- [ ] 변경 전 IP, gateway, DNS 값을 기록했다.
- [ ] 고정 IP와 gateway가 같은 네트워크에 있다.
- [ ] 원격 작업의 복구 경로를 준비했다.
- [ ] 적용 후 `ip addr`, `ip route`, DNS, 외부 접속을 확인했다.
- [ ] DHCP 복구 명령을 알고 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

`nmcli`는 디바이스를 직접 고치는 도구가 아니라 NetworkManager 연결 프로필을 고치는 도구다. 프로필 이름을 확인하고, 한 번에 필요한 IPv4 값을 넣고, 커널 route와 DNS 상태로 결과를 검증해야 한다.
