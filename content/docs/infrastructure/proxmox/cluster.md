# Proxmox QDevice 투표 문제 해결

이 문서는 Proxmox VE에서 QDevice가 설정되어 있는데 `pvecm status`의 vote가 기대와 다르거나 QDevice가 `NA`, `NV`, `votes 0`처럼 보일 때 확인할 순서를 정리한다. 핵심 원칙은 `corosync.conf`를 직접 고치기 전에 공식 `pvecm` 명령과 네트워크 상태를 먼저 검증하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

QDevice는 2노드 Proxmox 클러스터에서 quorum을 안정화하기 위한 장치다. QDevice가 살아 있지 않거나 vote를 주지 못하면 한 노드 장애나 네트워크 분리 상황에서 클러스터가 quorum을 잃고 `/etc/pve`가 읽기 전용처럼 동작할 수 있다.

문제는 `pvecm status` 출력만 보고 바로 설정 파일을 수정하면 더 큰 장애를 만들 수 있다는 점이다. QDevice 문제는 노드 수, qnetd 서비스, 5403/TCP 도달성, 인증서/SSH 설정, 기존 등록 상태를 순서대로 좁혀야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 다음 상황을 가정했다.

- Proxmox 클러스터에 QDevice가 구성되어 있다.
- QDevice host는 Raspberry Pi `192.168.1.55`이다.
- QDevice vote가 0으로 보인다.
- Raspberry Pi와 Proxmox 노드 간 기본 네트워크 연결은 된다고 가정한다.

하지만 단일 Proxmox 노드 클러스터인지, 2노드 클러스터인지가 명확하지 않다. QDevice는 2노드 같은 짝수 노드 클러스터에 의미가 있으며, 단일 노드에 붙인다고 HA가 생기지는 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 QDevice가 클러스터에 정상 등록되고, vote 판단에 참여하는 상태다.

- 2노드 Proxmox 클러스터가 먼저 정상이다.
- QDevice host에서 `corosync-qnetd`가 실행 중이다.
- Proxmox 모든 노드에서 `corosync-qdevice`가 설치되어 있다.
- 모든 Proxmox 노드가 QDevice host의 5403/TCP에 접근할 수 있다.
- `pvecm status`에 `Flags: Quorate Qdevice`가 나타나고 QDevice row가 alive 상태로 보인다.

## 4. 시스템 번역 (Data Flow)

QDevice vote 문제는 다음 경로 중 어디가 끊겼는지 찾는 작업이다.

```text
Proxmox node
  -> corosync-qdevice package
  -> cluster certificate and SSH setup
  -> QDevice host 5403/TCP
  -> corosync-qnetd service
  -> votequorum decision
  -> pvecm status output
```

`ping`이 된다는 사실은 IP 도달성만 의미한다. QDevice 정상 여부는 5403/TCP, qnetd 서비스, 등록 상태, vote flag로 판단해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

`pvecm status`는 quorum 상태, expected votes, total votes, QDevice row를 보여준다.

`pvecm qdevice status`는 QDevice daemon 쪽 세부 상태를 확인하는 명령이다.

`corosync-qnetd`는 Raspberry Pi 같은 외부 QDevice host에서 실행된다.

`corosync-qdevice`는 Proxmox VE 각 노드에서 실행된다.

`pvecm qdevice setup <QDEVICE-IP>`와 `pvecm qdevice remove`는 QDevice 등록과 제거를 위한 공식 경로다. Proxmox 문서는 QDevice 설정을 한 Proxmox 노드에서 `pvecm qdevice setup <QDEVICE-IP>`로 수행하라고 설명한다.

## 6. 상태 전이 (State Transition)

문제 해결은 다음 순서로 진행한다.

```text
클러스터 노드 수 확인
  -> QDevice host 서비스 확인
  -> 5403/TCP 도달성 확인
  -> Proxmox 패키지와 daemon 확인
  -> qdevice 상태 확인
  -> 공식 remove/setup 재등록
  -> pvecm status 검증
```

이 순서로 해결되지 않을 때만 `/etc/pve/corosync.conf`를 읽어서 현재 설정을 확인한다. 직접 수정은 백업과 콘솔 접근이 있을 때만 수행한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 단일 Proxmox 노드에 QDevice를 붙여도 HA가 되지 않는다.
- QDevice 문제를 해결하기 위해 처음부터 `corosync.conf`를 수동 편집하지 않는다.
- QDevice host의 5403/TCP가 모든 Proxmox 노드에서 열려 있어야 한다.
- QDevice host에는 `corosync-qnetd`, Proxmox 노드에는 `corosync-qdevice`를 둔다.
- `pvecm expected 1`은 no quorum 복구용 임시 조치로만 사용한다.
- QDevice 설정 전후에는 `pvecm status` 출력을 저장해 비교한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

먼저 Proxmox 노드 수와 quorum 상태를 확인한다.

```bash
pvecm status
pvecm nodes
corosync-quorumtool -s
```

QDevice host에서 qnetd 상태를 확인한다.

```bash
sudo systemctl status corosync-qnetd
sudo ss -lntp | grep 5403
```

Proxmox 각 노드에서 QDevice host 접근성을 확인한다.

```bash
nc -vz 192.168.1.55 5403
ssh root@192.168.1.55
```

Proxmox 각 노드에서 패키지와 서비스 상태를 확인한다.

```bash
dpkg -l corosync-qdevice
systemctl status corosync-qdevice
```

기존 QDevice 등록을 공식 명령으로 제거한다.

```bash
pvecm qdevice remove
```

필요 패키지를 설치하고 다시 등록한다.

```bash
apt update
apt install -y corosync-qdevice
pvecm qdevice setup 192.168.1.55
```

상태를 다시 확인한다.

```bash
pvecm status
pvecm qdevice status
corosync-quorumtool -s
```

## 9. 실패 사례 (What could go wrong?)

단일 노드 클러스터에 QDevice만 붙인 상태라면 설계 자체가 잘못된 것이다. 먼저 두 번째 Proxmox 노드를 구성하거나 QDevice를 제거한다.

QDevice가 `NA`로 보이면 qnetd 서버가 살아 있지 않거나 5403/TCP가 막힌 것이다. Proxmox 공식 문서도 `NA` 상태에서는 qnetd 기본 포트 5403/TCP 도달성을 확인하라고 한다.

QDevice가 `NV`로 보이면 alive이더라도 해당 노드에 vote를 주지 않는 상태일 수 있다. split-brain 상황에서는 QDevice가 한쪽 partition에만 vote를 줄 수 있다.

`Host key verification failed`가 나오면 Proxmox 노드의 SSH known hosts나 인증서 상태가 꼬였을 수 있다. 공식 문서는 이 단계에서 `pvecm updatecerts`가 도움이 될 수 있다고 안내한다.

`corosync.conf`를 직접 수정한 뒤 corosync를 재시작하면 클러스터 전체 quorum이 흔들릴 수 있다. 수동 수정은 마지막 선택지이며, `/etc/pve/corosync.conf` 백업과 콘솔 접근이 있어야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

2노드 클러스터에 QDevice를 붙이면 quorum 문제는 줄어들지만, HA 스토리지 문제는 별개다. VM failover를 기대한다면 shared storage, ZFS replication, backup/restore, watchdog/fencing까지 함께 검증해야 한다.

QDevice host를 SBC로 운영한다면 전원, SD 카드 내구성, OS 업데이트, NTP 시간 동기화, 방화벽 정책을 별도 운영 대상으로 둔다.

노드를 추가하거나 제거할 계획이 있으면 먼저 `pvecm qdevice remove`로 QDevice를 제거하고 멤버십 작업을 끝낸 뒤 다시 설정한다. Proxmox 문서도 QDevice가 있는 클러스터의 노드 추가/삭제 전 제거를 요구한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 클러스터가 단일 노드인지 2노드 이상인지 확인했다.
- [ ] QDevice host에서 `corosync-qnetd`가 실행 중이다.
- [ ] 모든 Proxmox 노드에서 QDevice host 5403/TCP가 열린다.
- [ ] 모든 Proxmox 노드에 `corosync-qdevice`가 설치되어 있다.
- [ ] `pvecm qdevice remove`와 `setup`을 공식 명령으로 수행했다.
- [ ] `pvecm status`에서 QDevice 상태가 alive로 보인다.
- [ ] 수동 `corosync.conf` 수정 없이 해결했다.
- [ ] 변경 전후 상태 출력을 기록했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

QDevice vote 문제는 `corosync.conf`부터 고치는 문제가 아니라 `노드 수 -> qnetd 서비스 -> 5403/TCP -> qdevice daemon -> pvecm 재등록` 순서로 좁히는 문제다. 단일 노드에 QDevice를 붙여도 HA가 생기지 않는다.
