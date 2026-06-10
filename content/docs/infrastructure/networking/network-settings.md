# 리눅스 고정 IP 설정 기준

리눅스 서버의 고정 IP 설정은 “IP 주소를 넣는 작업”이 아니라 어떤 네트워크 관리자가 커널 주소, 라우팅 테이블, DNS 설정을 소유하는지 확인하는 작업이다. 이 문서는 NetworkManager와 Netplan 환경에서 고정 IP를 안전하게 적용하는 기준을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버, 홈랩 장비, NAS, Proxmox 보조 노드, 모니터링 장비는 재부팅 후에도 같은 주소로 접근되어야 한다. DHCP 주소가 바뀌면 SSH, 백업 대상, DNS 레코드, 방화벽 규칙, 리버스 프록시 설정이 모두 깨질 수 있다.

반대로 원격 SSH 세션에서 고정 IP를 잘못 적용하면 즉시 접속이 끊긴다. 그래서 고정 IP 설정은 적용 명령보다 사전 확인, 롤백 경로, 검증 순서가 더 중요하다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 NetworkManager, `nmcli`, `nmtui`, Netplan, 배포판별 차이를 한 번에 나열한다. 하지만 다음 경계가 명확하지 않았다.

- NetworkManager 프로필을 수정해야 하는지, Netplan YAML을 수정해야 하는지 먼저 판단하지 않는다.
- `gateway4` 기반 Netplan 예제를 사용한다.
- 원격 작업 중 연결이 끊겼을 때 되돌리는 절차가 없다.
- DNS 설정이 `/etc/resolv.conf`에 직접 남는지, systemd-resolved나 NetworkManager를 통해 생성되는지 구분하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 재부팅 후에도 같은 IP, 같은 기본 게이트웨이, 같은 DNS가 유지되는 것이다.

- 현재 시스템의 네트워크 renderer를 먼저 확인한다.
- NetworkManager 환경에서는 `nmcli` 프로필을 수정한다.
- Netplan 환경에서는 YAML에 주소, 기본 route, nameserver를 명시하고 `netplan try` 또는 현장 콘솔을 확보한 뒤 적용한다.
- 원격 서버에서는 적용 전에 롤백 방법을 준비한다.
- 적용 후에는 IP, route, DNS, 외부 통신을 모두 확인한다.

## 4. 시스템 번역 (Data Flow)

고정 IP 설정은 다음 흐름으로 커널에 반영된다.

```text
설정 소스
  -> NetworkManager 프로필 또는 Netplan YAML
  -> 네트워크 데몬
  -> 커널 주소와 라우팅 테이블
  -> DNS resolver 설정
  -> SSH, HTTP, 백업, 모니터링 트래픽
```

문제를 해결할 때도 이 순서대로 본다. 파일만 맞고 커널 route가 틀릴 수 있고, IP는 맞지만 DNS resolver가 틀릴 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

NetworkManager는 연결 프로필을 관리하고 `nmcli`, `nmtui`, GUI 도구를 통해 설정을 바꾼다. `ipv4.method manual`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`가 핵심 속성이다.

Netplan은 YAML로 네트워크 설정을 선언하고 renderer로 NetworkManager 또는 systemd-networkd를 호출한다. 현재 기본 gateway는 `gateway4`보다 `routes`의 `to: default`, `via: ...` 형태로 쓰는 편이 명확하다.

커널 라우팅 테이블은 실제 패킷 경로를 결정한다. `ip route` 출력이 설정 의도와 다르면 외부 통신이 실패한다.

DNS resolver는 이름 해석을 담당한다. `resolvectl status`, `/etc/resolv.conf`, `nmcli device show`를 함께 봐야 실제 nameserver를 알 수 있다.

## 6. 상태 전이 (State Transition)

고정 IP 작업은 다음 상태로 진행한다.

```text
DHCP 사용
  -> 현재 renderer 확인
  -> 현재 IP, gateway, DNS 기록
  -> 고정 IP 후보 충돌 확인
  -> 설정 작성
  -> 제한 시간 롤백 준비
  -> 적용
  -> 접속과 라우팅 검증
```

원격 작업이라면 `적용` 전에 별도 콘솔, IPMI, 클라우드 콘솔, 현장 접근, 또는 자동 롤백 작업 중 하나가 있어야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 같은 L2 네트워크 안에서 이미 사용 중인 IP를 고정 IP로 지정하지 않는다.
- 기본 gateway는 같은 서브넷에서 접근 가능한 주소여야 한다.
- SSH로 접속 중인 서버의 IP를 바꿀 때는 롤백 경로를 먼저 만든다.
- NetworkManager가 관리하는 연결은 `/etc/network/interfaces`나 임의 파일로 우회하지 않는다.
- Netplan YAML은 들여쓰기 오류가 있으면 적용하지 않는다.
- 적용 후 `ip addr`, `ip route`, DNS 조회, 외부 ping 또는 HTTP 요청을 모두 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

NetworkManager가 활성화된 서버에서 현재 연결을 확인한다.

```bash
nmcli device status
nmcli connection show
ip -4 addr show
ip route
```

유선 연결을 고정 IP로 바꾼다.

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "1.1.1.1 8.8.8.8" \
  connection.autoconnect yes

sudo nmcli connection up "Wired connection 1"
```

적용 결과를 확인한다.

```bash
ip -4 addr show
ip route get 1.1.1.1
resolvectl status
ping -c 3 192.168.1.1
curl -I https://example.com
```

Netplan을 쓰는 Ubuntu 계열 서버라면 `/etc/netplan/01-static.yaml` 같은 파일에 다음처럼 작성한다.

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens18:
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
```

적용 전 검사를 수행한다.

```bash
sudo netplan generate
sudo netplan try
```

원격 서버에서 `netplan try`를 사용할 수 없거나 타이머 확인이 어렵다면 콘솔 접근을 확보한 뒤 `sudo netplan apply`를 사용한다.

## 9. 실패 사례 (What could go wrong?)

IP 충돌이 있으면 SSH가 간헐적으로 끊기거나 ARP가 엉뚱한 MAC으로 흔들린다. 이때는 라우터 DHCP lease, 스위치 MAC 테이블, `arp -n` 또는 `ip neigh`를 확인한다.

gateway가 다른 서브넷이면 같은 LAN 내부 통신은 되지만 외부 인터넷이 되지 않는다. `ip route get 1.1.1.1`로 실제 next hop을 확인한다.

DNS만 실패하면 IP ping은 되는데 도메인 접속이 되지 않는다. `/etc/resolv.conf`를 직접 덮어쓰기 전에 NetworkManager, Netplan, systemd-resolved 중 누가 resolver를 생성하는지 확인한다.

Netplan YAML 들여쓰기가 틀리면 설정이 생성되지 않는다. `netplan generate`가 실패하면 적용하지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

서버가 Proxmox 호스트라면 일반 NetworkManager 문서가 아니라 Proxmox의 `/etc/network/interfaces`, bridge, bond, VLAN 문서를 우선한다.

컨테이너 호스트라면 Docker bridge, macvlan, Kubernetes CNI 네트워크와 호스트 고정 IP를 분리해서 생각한다. 호스트 IP 변경은 컨테이너 포트 매핑, 리버스 프록시, 방화벽 규칙에도 영향을 준다.

고정 IP를 서버 안에 직접 쓰는 대신 라우터 DHCP reservation으로 관리할 수도 있다. 장비가 많고 중앙에서 주소를 관리하고 싶다면 DHCP reservation이 운영 부담을 줄인다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 현재 renderer가 NetworkManager인지 Netplan/networkd인지 확인했다.
- [ ] 현재 IP, gateway, DNS, 연결 이름을 기록했다.
- [ ] 고정 IP가 DHCP 범위와 충돌하지 않는다.
- [ ] 원격 작업의 롤백 경로를 준비했다.
- [ ] 설정 파일 또는 `nmcli` 프로필을 한 곳에서만 수정했다.
- [ ] 적용 후 `ip addr`와 `ip route`가 의도와 일치한다.
- [ ] DNS 조회와 외부 접속을 확인했다.
- [ ] 재부팅 후에도 같은 주소가 유지되는지 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

고정 IP 설정은 주소 하나를 입력하는 일이 아니라 `설정 소스 -> 네트워크 데몬 -> 커널 route -> DNS resolver`가 같은 의도를 공유하게 만드는 작업이다. 원격 서버에서는 적용보다 롤백 경로가 먼저다.
