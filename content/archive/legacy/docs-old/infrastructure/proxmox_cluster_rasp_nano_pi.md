# Raspberry Pi 또는 NanoPi NEO3를 Proxmox 클러스터 QDevice로 사용하기

## 1. 제목

Raspberry Pi 또는 NanoPi NEO3를 Proxmox 클러스터 Quorum Device(QDevice)로 사용하는 구성이다.

## 2. 장치

- Raspberry Pi: Ethernet 연결이 가능한 모델
- NanoPi NEO3: 1Gbps Ethernet 포트 보유 모델

## 3. 방법 요약

Raspberry Pi 또는 NanoPi NEO3에 Proxmox를 설치하지 않고도 Proxmox 클러스터의 quorum device(QDevice)로 연결할 수 있다. 이 구성은 일반적으로 3개 노드가 필요한 고가용성(HA) 판단을 2개 Proxmox 노드와 1개 Pi 계열 장치로 구성할 때 사용된다. Pi 장치는 Debian 기반 최소 시스템에서 `corosync-qnetd` 패키지를 실행하며, 노드 장애 시 클러스터 판단에 필요한 추가 vote를 제공한다.

## 4. 명령

### Raspberry Pi

```bash
# Raspberry Pi에서 실행
sudo apt update
sudo apt install corosync-qnetd
sudo nano /etc/ssh/sshd_config
# PermitRootLogin yes 설정
sudo systemctl restart ssh
sudo passwd root

# 각 Proxmox 노드에서 실행
apt install corosync-qdevice
pvecm qdevice setup <QDEVICE_IP> -f
```

### NanoPi NEO3

```bash
# NanoPi NEO3에서 실행
sudo apt update
sudo apt install corosync-qnetd
sudo nano /etc/ssh/sshd_config
# PermitRootLogin yes 설정
sudo systemctl restart ssh
sudo passwd root

# 각 Proxmox 노드에서 실행
apt install corosync-qdevice
pvecm qdevice setup <QDEVICE_IP> -f
```

## 5. 네트워크 설정

- Raspberry Pi 또는 NanoPi NEO3는 Proxmox 클러스터 노드와 같은 네트워크에 고정 IP 주소를 가져야 한다.
- 모든 노드는 corosync용 UDP 포트 `5405-5412`로 서로 연결 가능해야 한다.
- Proxmox 노드에서 Pi 장치로 SSH 접근(TCP 22)이 가능해야 한다.
- QDevice는 클러스터 판단에 관여하므로 안정적인 네트워크 구간에 배치한다.
- 보안상 클러스터 통신 전용 VLAN 구성을 검토할 수 있다.

## 6. 상세 설명

### QDevice 목적

Proxmox 클러스터는 quorum 유지와 split-brain 방지를 위해 홀수 vote 구성을 사용한다. QDevice는 전체 Proxmox 노드를 추가하지 않고도 vote를 하나 더 제공한다.

### 설정 절차

1. **Pi 장치 준비**
   - Raspberry Pi 또는 NanoPi NEO3에 Debian 기반 기본 배포판 설치
   - 라우터 또는 장치 네트워크 설정에서 고정 IP 구성
   - QDevice 기능을 제공하는 `corosync-qnetd` 패키지 설치
   - Proxmox가 장치를 설정할 수 있도록 root SSH 접근 임시 활성화
   - root 비밀번호 설정

2. **Proxmox 클러스터 구성**
   - 최소 2개 노드로 Proxmox 클러스터 생성
   - 모든 Proxmox 노드에 `corosync-qdevice` 패키지 설치
   - `pvecm qdevice setup` 명령으로 Pi 장치를 quorum server로 통합
   - Proxmox 클러스터가 QDevice에 SSH 키를 자동 복사

3. **구성 확인**
   - Proxmox 노드에서 `pvecm status`를 실행하여 QDevice 연결 상태 확인
   - 노드 장애 시나리오를 테스트하여 quorum 유지 여부 확인

4. **보안 검토**
   - 설정 후 root SSH 접근 비활성화와 키 기반 인증 적용 검토
   - QDevice를 격리된 보안 네트워크에 배치
   - Pi 장치의 정기 보안 업데이트 수행

### 장점

- 2개 Proxmox 노드와 저비용 Pi 장치로 HA 판단 구성 가능
- 세 번째 Proxmox 전체 노드를 추가하는 방식보다 비용이 낮음
- 낮은 전력 사용량
- 비교적 단순한 설정과 유지보수

## 7. 가능성

이 방식은 Proxmox 클러스터를 확장하는 데 사용되는 지원 가능한 구성이다. QuorumPi 프로젝트는 Raspberry Pi용 배포 이미지를 제공하며, 동일한 방식은 필요한 패키지를 설치한 표준 Debian 기반 NanoPi NEO3에서도 적용할 수 있다.

NanoPi NEO3가 Proxmox 문서에 별도 모델명으로 언급되지 않더라도, Debian 기반 시스템 실행, 안정적인 네트워크 연결, 필요한 패키지 지원 조건을 충족하면 QDevice 역할을 수행할 수 있다. RK3328 쿼드코어 ARM 프로세서와 gigabit Ethernet은 이 용도에 적합한 하드웨어 특성이다.
