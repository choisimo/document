# Proxmox와 OPNsense VLAN 104 연결 기준

이 문서는 Proxmox VE에서 OPNsense VM에 VLAN 104 네트워크를 추가할 때의 경계를 정리한다. 기본 모델은 Proxmox vNIC에 VLAN tag 104를 붙여 OPNsense에는 untagged 인터페이스로 전달하는 access interface 방식이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

OPNsense를 Proxmox VM으로 운영하면 WAN, LAN, IoT, Guest, Lab 같은 네트워크를 VM의 가상 NIC와 VLAN으로 분리해야 한다. VLAN 경계를 잘못 잡으면 DHCP가 엉뚱한 네트워크에 나가거나, 방화벽 규칙이 적용되지 않거나, tagged/untagged 트래픽이 섞인다.

특히 Proxmox에서 vNIC에 `tag=104`를 넣는 방식과 OPNsense 안에서 VLAN 인터페이스를 만드는 방식은 다르다. 둘을 동시에 적용하면 double tagging이나 미수신 문제가 생길 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 OPNsense VM에 새 Network Device를 추가하고 VLAN Tag `104`를 넣은 뒤, OPNsense에서 새 `vtnet` 인터페이스를 `VLAN104`로 할당하는 절차를 설명한다.

이 구성은 OPNsense 내부 VLAN trunk가 아니라 Proxmox 쪽 VLAN access vNIC 구성이다. OPNsense는 VLAN tag가 제거된 순수 Ethernet interface를 받으므로, OPNsense 안에서 VLAN 104 interface를 또 만들지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 VLAN 104 클라이언트가 OPNsense의 새 인터페이스를 gateway로 사용하고, DHCP와 firewall rule을 통해 의도한 통신만 허용하는 것이다.

- Proxmox bridge는 VLAN 104를 통과시킬 수 있다.
- OPNsense VM에는 VLAN tag 104가 붙은 VirtIO vNIC가 추가되어 있다.
- OPNsense는 새 `vtnetX`를 interface로 assign하고 static IP를 가진다.
- DHCP 범위는 VLAN 104 대역 안에 있다.
- firewall rule은 VLAN104 net에서 필요한 목적지만 허용한다.
- switch port의 tagged/untagged 설정이 Proxmox 구성과 일치한다.

## 4. 시스템 번역 (Data Flow)

access vNIC 방식의 트래픽 흐름은 다음과 같다.

```text
VLAN 104 client
  -> switch VLAN 104
  -> Proxmox physical NIC trunk
  -> vlan-aware bridge vmbr0
  -> OPNsense VM vNIC tag=104
  -> OPNsense vtnetX untagged
  -> OPNsense DHCP, firewall, NAT/routing
```

Proxmox가 vNIC tag를 처리하므로 OPNsense의 해당 인터페이스는 VLAN tag를 직접 보지 않는다. OPNsense에서 VLAN device를 만들 필요가 있는 경우는 trunk vNIC를 VM에 넘기는 다른 모델이다.

## 5. 핵심 구성요소 (Building Blocks)

`vmbr0`는 Proxmox Linux bridge다. VLAN을 통과시키려면 bridge가 VLAN-aware로 구성되어 있고 물리 uplink와 switch trunk가 VLAN 104를 허용해야 한다.

VM Network Device의 `tag=104`는 해당 vNIC에 VLAN tag를 적용한다. Proxmox 공식 설정에는 VM NIC 옵션으로 `tag=<integer>`가 있으며, 이 값은 해당 interface packet에 VLAN tag를 적용한다.

VirtIO NIC는 OPNsense/FreeBSD에서 보통 `vtnetX`로 보인다. 새 NIC를 추가하면 기존 번호 뒤에 새 장치가 붙는다.

OPNsense interface assignment는 새 `vtnetX`를 방화벽 인터페이스로 등록하는 단계다.

OPNsense firewall rule은 interface별 inbound 기준으로 평가된다. VLAN104 클라이언트 트래픽을 허용하려면 VLAN104 interface rule이 필요하다.

## 6. 상태 전이 (State Transition)

작업은 다음 상태로 진행한다.

```text
현재 OPNsense 백업
  -> Proxmox bridge VLAN 확인
  -> VM vNIC 추가
  -> OPNsense 재부팅 또는 NIC 인식 확인
  -> OPNsense interface assignment
  -> static IP와 DHCP 설정
  -> firewall rule 추가
  -> client DHCP와 라우팅 검증
```

OPNsense가 라우터라면 새 인터페이스의 upstream gateway는 설정하지 않는다. 기본 gateway는 WAN에만 있어야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Proxmox vNIC에 `tag=104`를 넣는 access 방식에서는 OPNsense 안에 VLAN 104 subinterface를 또 만들지 않는다.
- trunk 방식으로 OPNsense 안에서 VLAN을 만들려면 Proxmox vNIC tag 모델과 분리해서 설계한다.
- Proxmox bridge, physical switch trunk, VM vNIC tag가 모두 같은 VLAN ID를 허용해야 한다.
- OPNsense interface IP는 해당 VLAN의 gateway 주소여야 한다.
- VLAN interface에는 WAN gateway를 upstream gateway로 지정하지 않는다.
- firewall rule을 만들기 전까지 새 OPNsense interface는 기본 차단된다고 가정한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Proxmox에서 bridge VLAN 상태를 확인한다.

```bash
grep -n "bridge-vlan-aware" /etc/network/interfaces
bridge vlan show
qm config 100
```

OPNsense VM `100`에 VLAN 104 access vNIC를 추가한다.

```bash
qm set 100 --net5 virtio,bridge=vmbr0,tag=104,firewall=0
qm config 100
```

GUI에서는 다음 값을 사용한다.

```text
VM
  -> Hardware
  -> Add
  -> Network Device
  -> Bridge: vmbr0
  -> VLAN Tag: 104
  -> Model: VirtIO
  -> Firewall: disabled
```

OPNsense에서 새 장치를 할당한다.

```text
Interfaces
  -> Assignments
  -> New interface: vtnetX
  -> Description: VLAN104
  -> Add
  -> Save
```

새 interface에 gateway IP를 준다.

```text
Interfaces
  -> VLAN104
  -> Enable Interface
  -> IPv4 Configuration Type: Static IPv4
  -> IPv4 Address: 192.168.104.1/24
  -> IPv4 Upstream Gateway: None
  -> Save
  -> Apply Changes
```

DHCP를 켠다. OPNsense 버전에 따라 DHCP 메뉴 이름은 ISC DHCPv4 또는 DHCPv4/Kea로 보일 수 있다.

```text
Services
  -> DHCPv4 or ISC DHCPv4
  -> VLAN104
  -> Enable
  -> Range: 192.168.104.100 to 192.168.104.200
  -> Save
```

최소 firewall rule을 추가한다.

```text
Firewall
  -> Rules
  -> VLAN104
  -> Add
  -> Action: Pass
  -> Source: VLAN104 net
  -> Destination: any
  -> Save
  -> Apply Changes
```

운영 환경에서는 `Destination: any` 대신 필요한 DNS, gateway, internet, 내부 서비스로 좁힌다.

## 9. 실패 사례 (What could go wrong?)

Proxmox vNIC tag와 OPNsense VLAN interface를 동시에 만들면 같은 VLAN을 두 번 처리할 수 있다. access 방식과 trunk 방식을 하나만 선택한다.

switch uplink가 VLAN 104를 trunk로 허용하지 않으면 Proxmox 설정이 맞아도 클라이언트 DHCP가 오지 않는다. managed switch에서 Proxmox host uplink의 allowed VLAN을 확인한다.

새 interface에 upstream gateway를 지정하면 OPNsense routing이 흔들릴 수 있다. 내부 VLAN interface는 gateway가 아니라 gateway 역할을 하는 interface다.

DHCP가 안 되면 OPNsense firewall rule, DHCP service binding, switch access port VLAN, client NIC VLAN 설정을 순서대로 확인한다.

Proxmox firewall과 OPNsense firewall을 동시에 켜면 디버깅 지점이 둘로 늘어난다. 특별한 이유가 없다면 OPNsense VM의 VLAN vNIC에서는 Proxmox firewall을 끄고 OPNsense에서 정책을 관리한다.

## 10. 뇌 확장하기 (Evolution & Variants)

여러 VLAN을 하나의 OPNsense vNIC로 넘기고 싶다면 trunk 방식이 필요하다. 이 경우 Proxmox vNIC에 단일 `tag=104`를 넣지 않고, OPNsense 안에서 VLAN device를 생성해 각 VLAN을 assign한다.

Proxmox SDN을 쓰는 환경에서는 Linux bridge `tag` 대신 VNet/Zone 정책이 VLAN 태그를 관리할 수 있다. 기존 bridge 방식과 SDN 방식을 섞지 않도록 운영 표준을 정한다.

VLAN별 보안 정책은 “인터넷 허용”보다 “필요한 목적지 허용”으로 발전시킨다. IoT VLAN, Guest VLAN, Management VLAN은 서로 다른 firewall rule과 DNS 정책을 가져야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] OPNsense 설정 백업을 만들었다.
- [ ] Proxmox bridge가 VLAN-aware이며 VLAN 104를 통과시킨다.
- [ ] switch trunk/access VLAN 설정이 VLAN 104와 일치한다.
- [ ] OPNsense VM vNIC에 `tag=104`를 적용했다.
- [ ] OPNsense에서 새 `vtnetX`를 interface로 assign했다.
- [ ] VLAN104 interface IP가 `192.168.104.1/24` 같은 gateway 주소다.
- [ ] DHCP range가 같은 subnet 안에 있다.
- [ ] VLAN104 firewall rule을 추가했다.
- [ ] client가 DHCP 주소를 받고 gateway, DNS, internet을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxmox vNIC에 `tag=104`를 넣으면 OPNsense는 VLAN 104를 untagged 인터페이스로 받는다. 따라서 OPNsense 안에서 VLAN 104를 또 만들지 말고, 새 `vtnetX`에 IP, DHCP, firewall rule을 붙여 검증한다.
