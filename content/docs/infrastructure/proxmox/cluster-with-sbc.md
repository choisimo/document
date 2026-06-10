# SBC를 Proxmox QDevice로 쓰는 기준

Raspberry Pi, NanoPi NEO3 같은 SBC는 Proxmox VE를 설치하는 세 번째 노드가 아니라 외부 QDevice 서버로 사용할 수 있다. 이 문서는 2노드 Proxmox 클러스터에 외부 `corosync-qnetd` 투표 장치를 추가할 때의 조건과 검증 순서를 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Proxmox 클러스터는 quorum이 있어야 클러스터 설정 파일시스템과 HA 판단을 안전하게 유지한다. 2노드 클러스터는 한 노드가 사라지면 남은 한 노드가 과반을 확보하지 못해 quorum을 잃기 쉽다.

QDevice는 별도 장비가 투표 판단에 참여하도록 만들어 2노드 클러스터에 세 번째 투표 경로를 제공한다. 하지만 QDevice는 컴퓨트 노드도, 스토리지 복제도 아니다. quorum 문제를 줄이는 장치일 뿐이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Raspberry Pi 또는 NanoPi NEO3에 `corosync-qnetd`를 설치하고 Proxmox 노드에서 `pvecm qdevice setup`을 실행하는 흐름을 설명한다.

보완해야 할 점은 다음과 같다.

- `pvecm qdevice setup`에 실제 QDevice IP가 필요하다는 점이 명령에서 빠져 있다.
- QDevice host에는 `corosync-qnetd`, Proxmox 노드에는 `corosync-qdevice`가 필요하다는 역할 분리가 약하다.
- QDevice 기본 통신 포트가 5403/TCP라는 검증 기준이 빠져 있다.
- QDevice는 HA 스토리지나 VM 데이터 복제를 제공하지 않는다는 한계가 명확하지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 2노드 Proxmox 클러스터가 외부 SBC QDevice와 안정적으로 통신하고, `pvecm status`에서 QDevice가 살아 있는 투표 장치로 표시되는 것이다.

- SBC에는 Debian 계열 OS와 고정 IP를 둔다.
- SBC에는 `corosync-qnetd`만 설치한다.
- 모든 Proxmox 노드에는 `corosync-qdevice`를 설치한다.
- Proxmox 노드에서 SBC의 5403/TCP에 접근할 수 있다.
- QDevice 설정 후 `pvecm status`와 `pvecm qdevice status`로 상태를 확인한다.

## 4. 시스템 번역 (Data Flow)

QDevice 구성은 다음 흐름으로 동작한다.

```text
Proxmox node A
  -> corosync-qdevice
  -> QDevice host corosync-qnetd
  -> vote decision
  -> cluster quorum

Proxmox node B
  -> corosync-qdevice
  -> QDevice host corosync-qnetd
  -> vote decision
  -> cluster quorum
```

Corosync ring 트래픽과 QDevice 트래픽은 같은 개념이 아니다. Proxmox 공식 문서는 QDevice Net이 TCP/IP로 클러스터와 통신하며, QDevice가 `NA`로 보이면 qnetd 서버의 기본 5403/TCP 도달성을 확인하라고 설명한다.

## 5. 핵심 구성요소 (Building Blocks)

SBC QDevice host는 Raspberry Pi, NanoPi NEO3, 소형 x86 장비처럼 항상 켜져 있고 네트워크가 안정적인 외부 장비다. Proxmox VE를 설치하지 않는다.

`corosync-qnetd`는 QDevice host에서 실행되는 외부 arbitrator daemon이다.

`corosync-qdevice`는 각 Proxmox VE 노드에서 실행되는 daemon이다. 클러스터 노드가 QDevice host와 통신해 vote 판단을 받는다.

`pvecm qdevice setup <QDEVICE-IP>`는 Proxmox가 제공하는 설정 명령이다. 공식 문서는 이 명령을 한 Proxmox 노드에서 실행해 QDevice를 설정하라고 안내한다.

`pvecm status`는 quorum과 QDevice vote 상태를 확인하는 기본 명령이다.

## 6. 상태 전이 (State Transition)

SBC QDevice 작업은 다음 상태로 진행한다.

```text
2노드 클러스터 존재
  -> SBC OS 설치
  -> SBC 고정 IP 설정
  -> qnetd 설치
  -> Proxmox 노드 qdevice 패키지 설치
  -> pvecm qdevice setup 실행
  -> quorum 상태 검증
  -> root SSH와 방화벽 정책 정리
```

노드를 추가하거나 제거할 때는 QDevice를 먼저 제거하고 멤버십 작업을 끝낸 뒤, 다시 짝수 노드 구성이 되면 QDevice를 재설정한다. Proxmox 공식 문서도 QDevice 구성 클러스터에서 노드 추가/삭제 전 QDevice 제거를 안내한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- QDevice host는 Proxmox 클러스터 노드가 아니다.
- QDevice host는 클러스터 노드와 독립적으로 전원과 네트워크가 유지되어야 한다.
- Proxmox 노드에서 QDevice host의 5403/TCP에 접근 가능해야 한다.
- QDevice는 quorum vote만 보강하며 shared storage나 VM 데이터 일관성을 제공하지 않는다.
- root SSH 허용은 설정에 필요한 경우만 임시로 사용하고, 설정 후 정책을 되돌린다.
- `pvecm expected 1` 같은 강제 quorum 명령은 복구 목적의 임시 조치로만 사용한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

SBC에서 고정 IP와 SSH 접근을 준비한 뒤 `corosync-qnetd`를 설치한다.

```bash
sudo apt update
sudo apt install -y corosync-qnetd
sudo systemctl enable --now corosync-qnetd
systemctl status corosync-qnetd
```

Proxmox 각 노드에서 QDevice 패키지를 설치한다.

```bash
apt update
apt install -y corosync-qdevice
```

Proxmox 노드에서 SBC 접근성을 확인한다.

```bash
ssh root@192.168.1.55
nc -vz 192.168.1.55 5403
```

클러스터의 한 Proxmox 노드에서 QDevice를 설정한다.

```bash
pvecm qdevice setup 192.168.1.55
```

상태를 확인한다.

```bash
pvecm status
pvecm qdevice status
corosync-quorumtool -s
```

제거가 필요하면 Proxmox 노드에서 공식 제거 명령을 사용한다.

```bash
pvecm qdevice remove
```

## 9. 실패 사례 (What could go wrong?)

`pvecm qdevice setup`에 IP를 넣지 않으면 설정 대상이 없다. 항상 QDevice host의 고정 IP를 명시한다.

QDevice가 `NA` 또는 `Not Alive`로 보이면 5403/TCP 방화벽, `corosync-qnetd` 서비스 상태, Proxmox 노드에서 QDevice host로 가는 라우팅을 확인한다.

SBC가 같은 멀티탭, 같은 스위치, 같은 장애 도메인에 있으면 노드 장애와 함께 QDevice도 사라질 수 있다. quorum 보강 효과가 줄어든다.

QDevice를 추가했다고 로컬 디스크 기반 VM이 자동으로 안전하게 failover되는 것은 아니다. HA를 쓰려면 shared storage, replication, fencing/watchdog 정책을 별도로 검증해야 한다.

root SSH를 켜 둔 채 방치하면 QDevice host가 새로운 공격면이 된다. 설정 후 키 기반 접근과 방화벽 제한을 적용한다.

## 10. 뇌 확장하기 (Evolution & Variants)

3대 이상의 Proxmox 노드를 안정적으로 운영할 수 있다면 QDevice보다 정상적인 홀수 노드 구성이 단순하다. QDevice는 작은 2노드 클러스터의 현실적 절충안이다.

QDevice host는 Raspberry Pi가 아니어도 된다. 항상 켜져 있고 Debian 계열 패키지를 설치할 수 있으며 TCP/IP 연결이 안정적인 장비면 후보가 될 수 있다.

클러스터 네트워크, 마이그레이션 네트워크, 스토리지 네트워크를 분리하는 환경에서는 QDevice 트래픽이 어느 네트워크를 사용할지 명확히 정한다. `pvecm qdevice setup` 옵션으로 사용할 네트워크를 지정할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Proxmox 클러스터는 이미 정상 생성되어 있다.
- [ ] QDevice host에 고정 IP가 있다.
- [ ] QDevice host에서 `corosync-qnetd`가 실행 중이다.
- [ ] 모든 Proxmox 노드에 `corosync-qdevice`가 설치되어 있다.
- [ ] Proxmox 노드에서 QDevice host의 5403/TCP에 접근할 수 있다.
- [ ] `pvecm qdevice setup <QDEVICE-IP>`가 성공했다.
- [ ] `pvecm status`에서 QDevice가 alive 상태로 보인다.
- [ ] root SSH와 방화벽 정책을 설정 후 정리했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

SBC QDevice는 2노드 Proxmox 클러스터에 세 번째 판단표를 주는 외부 qnetd 서버다. `corosync-qnetd`는 SBC에, `corosync-qdevice`는 Proxmox 노드에 설치하고, 5403/TCP와 `pvecm status`로 실제 vote 상태를 검증해야 한다.
