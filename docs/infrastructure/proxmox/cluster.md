# Proxmox QDevice 투표 문제 해결 방법

현재 Proxmox 클러스터의 QDevice가 구성되어 있지만 투표가 0으로 표시되어 제대로 작동하지 않고 있습니다. `pvecm status` 출력에서 "Qdevice (votes 0)"로 표시되는 것이 문제입니다. 이 문제를 해결하기 위한 단계별 가이드를 제공합니다.

## 현재 상황 분석

현재 상태를 보면:
- Proxmox 노드(192.168.1.30)에 "nodove"라는 단일 노드 클러스터가 있음
- QDevice는 구성되었지만 투표권이 없음(0 votes)
- Raspberry Pi(192.168.1.55)와 Proxmox 노드 간 네트워크 연결은 정상

## Raspberry Pi에서 QDevice 서비스 확인

먼저 Raspberry Pi에서 QDevice 서비스가 올바르게 실행 중인지 확인합니다:

```bash
# Raspberry Pi에서 실행
sudo systemctl status corosync-qnetd
```

서비스가 실행 중인 경우에도 투표 문제가 있을 수 있습니다. 일반적으로 이 문제는 설정 파일 불일치 또는 초기 설정 문제로 인해 발생합니다.

## QDevice 재설정 절차

### 1. Proxmox 노드에서 기존 QDevice 제거

```bash
# Proxmox 노드에서 실행
pvecm qdevice remove
```

### 2. Raspberry Pi에서 QDevice 재설정

Raspberry Pi에서 다음을 확인합니다:

```bash
# 필요한 패키지 재설치
sudo apt update
sudo apt reinstall corosync-qnetd

# SSH 루트 로그인 허용 확인
sudo nano /etc/ssh/sshd_config
# PermitRootLogin yes 확인 후 저장

# SSH 서비스 재시작
sudo systemctl restart ssh

# 서비스 재시작
sudo systemctl restart corosync-qnetd
```

### 3. Proxmox 노드에서 QDevice 다시 추가

```bash
# Proxmox 노드에서 실행
apt update
apt install corosync-qdevice  # 이미 설치되어 있을 경우 skip
pvecm qdevice setup 192.168.1.55 -f  # -f 옵션으로 강제 설정
```

## QDevice 투표 문제 해결방법

투표 문제가 지속되는 경우 다음 해결 방법을 시도할 수 있습니다:

### 1. `/etc/pve/corosync.conf` 파일 수정

Proxmox 노드에서 corosync.conf 파일을 편집하여 quorum 섹션에 votes 값을 명시적으로 설정합니다:

```bash
nano /etc/pve/corosync.conf
```

quorum 구성에서 device 섹션을 다음과 같이 설정합니다:

```
quorum {
  device {
    model: net
    net {
      algorithm: ffsplit
      host: 192.168.1.55
      tls: on
    }
    votes: 1  # 이 값이 중요합니다!
  }
  provider: corosync_votequorum
}
```

### 2. 변경 후 서비스 재시작

```bash
# Proxmox 노드에서 실행
systemctl restart corosync
systemctl restart corosync-qdevice
systemctl restart pve-cluster
```

### 3. 상태 확인

```bash
pvecm status
```

이제 QDevice가 "votes 1"로 표시되어야 합니다.

## 참고 사항

1. QDevice 작동 방식: QDevice는 2노드 Proxmox 클러스터에서 타이 브레이커(tie-breaker) 역할을 수행하여 한 노드가 오프라인 상태가 되어도 클러스터가 계속 작동할 수 있게 합니다.

2. 일반적인 문제: "votes 0" 문제는 일반적으로 설정 파일의 불일치 또는 QDevice와 클러스터 간의 통신 문제 때문에 발생합니다.

3. 네트워크 요구 사항: QDevice와 Proxmox 노드는 안정적인 네트워크 연결이 필요하며, 방화벽이 포트 5403(기본 QDevice 포트)를 허용해야 합니다.

이 단계들을 따르면 Raspberry Pi를 Proxmox 클러스터의 투표 QDevice로 성공적으로 구성할 수 있을 것입니다.
