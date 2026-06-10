# 인프라 문서 학습 및 기록 노트

이 문서는 `content/docs/infrastructure` 아래의 운영 인프라 문서를 묶는 상위 색인이다. 하드웨어, 네트워크, 모니터링, Proxmox, 스토리지 문서를 실제 운영 흐름에 맞춰 탐색할 수 있게 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

인프라 문제는 한 계층에서 끝나지 않는다. 디스크 마운트 실패가 Proxmox VM 장애로 보일 수 있고, 네트워크 인터페이스 설정 오류가 모니터링 타깃 장애로 나타날 수 있다. 상위 인덱스가 없다면 사용자는 증상만 보고 임의의 문서를 열게 된다.

인프라 문서의 목표는 증상을 하드웨어, 네트워크, 스토리지, 가상화, 모니터링 계층으로 나누어 원인을 좁히게 하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 인프라 섹션은 다음 파일로 구성되어 있다.

- Hardware: `nano-pi-neo3.md`, `ssd-guide.md`
- Monitoring: `process-management.md`, `prometheus-grafana-loki.md`
- Networking: `email-config.md`, `network-settings.md`, `nmcli-guide.md`, `rsync.md`
- Proxmox: `cluster.md`, `cluster-with-sbc.md`, `email-alerts.md`, `opnsense_vlan_setup.md`, `snapshot-backup-template.md`
- Storage: `disk-format.md`, `mounting.md`, `sshfs.md`

기존 문서는 카드형 소개와 빠른 명령을 함께 제공했지만, 하위 문서의 실제 목록과 계층별 책임을 더 명확히 할 필요가 있었다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 인프라 문제를 계층별로 분리해 문서를 찾을 수 있다.
- 하드웨어, 네트워크, 스토리지, Proxmox, 모니터링의 책임이 구분된다.
- 명령 실행 전 어떤 상태를 확인해야 하는지 안다.
- 상위 문서는 하위 런북을 중복하지 않고 탐색 경로를 제공한다.
- 새 인프라 문서를 추가할 때 카테고리와 색인을 함께 갱신한다.

## 4. 시스템 번역 (Data Flow)

인프라 운영 계층은 다음처럼 해석할 수 있다.

```text
hardware
  -> disk and network interfaces
  -> operating system
  -> virtualization or services
  -> monitoring and alerting
  -> backup and recovery
```

문서 탐색 흐름은 다음과 같다.

```text
infrastructure/index.md
  -> category document
  -> command or configuration
  -> validation
  -> rollback or recovery
```

운영 사고에서는 증상보다 계층을 먼저 좁히는 것이 중요하다.

## 5. 핵심 구성요소 (Building Blocks)

| 영역 | 문서 | 책임 |
| --- | --- | --- |
| Hardware | [NanoPi Neo3](hardware/nano-pi-neo3.md), [SSD Guide](hardware/ssd-guide.md) | 장비 특성, 저장장치 선택 |
| Monitoring | [Process Management](monitoring/process-management.md), [Prometheus Grafana Loki](monitoring/prometheus-grafana-loki.md) | 상태 확인, 메트릭, 로그 |
| Networking | [Email Config](networking/email-config.md), [Network Settings](networking/network-settings.md), [nmcli](networking/nmcli-guide.md), [rsync](networking/rsync.md) | 네트워크, 메일, 동기화 |
| Proxmox | [Cluster](proxmox/cluster.md), [SBC Cluster](proxmox/cluster-with-sbc.md), [Email Alerts](proxmox/email-alerts.md), [OPNsense VLAN](proxmox/opnsense_vlan_setup.md), [Snapshot Backup](proxmox/snapshot-backup-template.md) | 가상화, 클러스터, 백업 |
| Storage | [Disk Format](storage/disk-format.md), [Mounting](storage/mounting.md), [SSHFS](storage/sshfs.md) | 파일시스템, 마운트, 원격 스토리지 |

## 6. 상태 전이 (State Transition)

인프라 변경은 다음 순서로 진행한다.

```text
현재 상태 확인
  -> 변경 대상 계층 식별
  -> 설정 백업
  -> 변경 적용
  -> 서비스 영향 확인
  -> 모니터링과 로그 확인
  -> 롤백 가능성 검증
```

각 단계에서 물어야 할 질문은 다음과 같다.

- 현재 상태: 지금 어떤 인터페이스, 디스크, 서비스가 사용 중인가?
- 대상 계층: 문제는 하드웨어, 네트워크, 스토리지, 가상화, 앱 중 어디인가?
- 설정 백업: 변경 전 파일이나 상태를 복구할 수 있는가?
- 영향 확인: 어떤 VM, 컨테이너, 서비스가 영향을 받는가?
- 롤백: 실패하면 원래 상태로 돌아갈 수 있는가?

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 운영 인프라 변경 전 현재 상태와 설정을 기록한다.
- 디스크 포맷, 마운트, 클러스터 조작은 데이터 손실 가능성을 먼저 확인한다.
- 네트워크 변경은 원격 접속 경로를 끊을 수 있으므로 대체 접속 방법을 준비한다.
- Proxmox 클러스터 작업은 quorum과 노드 상태를 확인한 뒤 수행한다.
- 모니터링 문서는 알림보다 데이터 수집과 저장 경로를 먼저 확인한다.
- 상위 인덱스는 하위 문서를 중복하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

인프라 상태를 넓게 확인하는 최소 명령은 다음과 같다.

```bash
hostnamectl
ip addr show
ip route
lsblk
df -h
free -h
systemctl --failed
```

Proxmox 환경에서는 다음 상태를 추가로 확인한다.

```bash
pvecm status
pvecm nodes
qm list
pct list
```

문서 구조는 다음처럼 확인한다.

```bash
find content/docs/infrastructure -maxdepth 3 -type f | sort
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 원격 서버 네트워크를 수정하면서 대체 접속 경로를 준비하지 않는 것이다. SSH 연결이 끊기면 복구가 어려워진다.

두 번째 실패는 스토리지 작업을 단순 명령으로 취급하는 것이다. 디스크 포맷이나 마운트 변경은 데이터 손실과 부팅 실패로 이어질 수 있다.

세 번째 실패는 Proxmox 클러스터에서 quorum 상태를 보지 않고 노드를 조작하는 것이다. 클러스터 상태가 불안정해질 수 있다.

네 번째 실패는 모니터링 스택만 올리고 알림이나 로그 보존을 확인하지 않는 것이다. 장애가 나도 사후 분석 근거가 남지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

인프라 문서가 커지면 런북, 설계 문서, 점검표를 분리할 수 있다. 실행 명령은 런북에, 구조 설명은 설계 문서에, 반복 점검은 체크리스트에 둔다.

홈랩과 운영 환경은 위험 기준이 다르다. 홈랩 문서라도 데이터 손실과 접근 제어는 운영 환경 수준으로 다루는 편이 안전하다.

자동화가 늘어나면 Ansible, Terraform, GitOps 문서와 연결될 수 있다. 이때 실제 수동 절차와 자동화 절차의 책임을 분리해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 인프라 문서를 계층별로 찾을 수 있다.
- [ ] 변경 전 현재 상태를 기록했다.
- [ ] 네트워크 변경 전 대체 접속 경로를 준비했다.
- [ ] 스토리지 작업 전 백업과 대상 디스크를 확인했다.
- [ ] Proxmox 작업 전 quorum과 노드 상태를 확인했다.
- [ ] 모니터링과 로그로 변경 후 상태를 확인했다.
- [ ] 실패 시 롤백 방법을 설명할 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

인프라 문서는 명령 모음이 아니라 계층별 `__________` 지도다. 변경 전에는 현재 `__________`를 기록하고, 실패하면 어느 `__________`에서 문제가 생겼는지 좁힌다.
