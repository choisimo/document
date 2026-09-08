# Raspberry Pi 또는 NanoPi NEO3를 Proxmox 클러스터 QDevice로 사용하기

> **설계·버전 경계:** 보관된 구성 메모다. Proxmox VE·Corosync·qdevice·qnetd·SBC OS 버전을 기록한다. QDevice는 quorum 판단에 참여하며 워크로드 복제·스토리지 이중화·fencing·완전한 HA를 대신하지 않는다. 단일 노드에 vote만 추가해 HA를 만들 수 없으며 실패 유형별 동작을 따로 시험한다.

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
# 설치 전에 승인한 root 키 인증과 접근 출발지 제한을 확인한다.
# 선택한 버전에서 암호 로그인이 임시로 필요할 때만 범위를 제한하고 설정 후 복구한다.

# 패키지는 모든 Proxmox 노드에 설치
apt install corosync-qdevice

# 모든 노드가 online·quorate인지 확인한 뒤 한 노드에서만 등록
pvecm status
pvecm nodes
pvecm qdevice setup "${QNETD_IP:?set the verified QNetd address}"
```

### NanoPi NEO3

```bash
# NanoPi NEO3에서 실행
sudo apt update
sudo apt install corosync-qnetd
# 설치 전에 승인한 root 키 인증과 접근 출발지 제한을 확인한다.
# 선택한 버전에서 암호 로그인이 임시로 필요할 때만 범위를 제한하고 설정 후 복구한다.

# 패키지는 모든 Proxmox 노드에 설치
apt install corosync-qdevice

# 모든 노드가 online·quorate인지 확인한 뒤 한 노드에서만 등록
pvecm status
pvecm nodes
pvecm qdevice setup "${QNETD_IP:?set the verified QNetd address}"
```

## 5. 네트워크 설정

- QNetd 호스트는 모든 Proxmox 노드에서 도달 가능한 안정된 주소를 사용한다. 반드시 같은 LAN일 필요는 없지만 연결 품질과 실패 격리를 검토한다.
- Proxmox 노드 사이 Corosync UDP 경로와 Proxmox→QNetd TCP 경로를 구분한다. Corosync 포트는 설치 버전과 설정에서 확인하고 QNetd 기본 포트 `5403/TCP`는 모든 노드에서 검사한다.
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
   - 출발지를 제한한 root 키 인증을 우선 준비하고 실제 접속 확인
   - 해당 버전에서 임시 암호 인증이 필요한 경우에만 기간·범위를 제한하고 설정 뒤 기존 정책 복구

2. **Proxmox 클러스터 구성**
   - 최소 2개 노드로 Proxmox 클러스터 생성
   - 모든 Proxmox 노드에 `corosync-qdevice` 패키지 설치
   - 모든 노드의 정상 상태를 확인한 뒤 한 Proxmox 노드에서 `pvecm qdevice setup`으로 QNetd 등록
   - Proxmox 클러스터가 QDevice에 SSH 키를 자동 복사

3. **구성 확인**
   - Proxmox 노드에서 `pvecm status`를 실행하여 QDevice 연결 상태 확인
   - 노드 장애 시나리오를 테스트하여 quorum 유지 여부 확인

4. **보안 검토**
   - 설정 후 root SSH 접근 비활성화와 키 기반 인증 적용 검토
   - QDevice를 격리된 보안 네트워크에 배치
   - Pi 장치의 정기 보안 업데이트 수행

### 장점

- 2개 Proxmox 노드와 외부 장치로 quorum 중재 구성 가능; 서비스 HA는 별도 검증
- 세 번째 Proxmox 전체 노드를 추가하는 방식보다 비용이 낮음
- 낮은 전력 사용량
- 비교적 단순한 설정과 유지보수

## 7. 가능성

이 방식은 Proxmox 클러스터를 확장하는 데 사용되는 지원 가능한 구성이다. QuorumPi 프로젝트는 Raspberry Pi용 배포 이미지를 제공하며, 동일한 방식은 필요한 패키지를 설치한 표준 Debian 기반 NanoPi NEO3에서도 적용할 수 있다.

NanoPi NEO3가 Proxmox 문서에 별도 모델명으로 언급되지 않더라도, Debian 기반 시스템 실행, 안정적인 네트워크 연결, 필요한 패키지 지원 조건을 충족하면 QDevice 역할을 수행할 수 있다. RK3328 쿼드코어 ARM 프로세서와 gigabit Ethernet은 이 용도에 적합한 하드웨어 특성이다.

## 완료·복구 증거

모든 노드의 `pvecm status`에서 expected votes·quorum·QDevice 연결 플래그가 일관적인지 확인한다. QNetd 단독 중단과 노드 단독 중단을 분리해 시험하고, 데이터·fencing·스토리지 결과도 따로 기록한다. 설치의 한 노드 실행과 기본 `5403/TCP`는 [Proxmox 공식 문서 소스](https://raw.githubusercontent.com/proxmox/pve-docs/master/pvecm.adoc)의 QDevice-Net 절차를 기준으로 한다. `-f`나 수동 votes 변경을 기본 복구 방법으로 삼지 않는다.

실패하면 유지보수 조건에서 `pvecm qdevice remove`로 등록을 제거하고 백업한 인증·네트워크 정책을 복구한다. 노드 추가·제거 전에는 해당 버전의 QDevice 제거 절차를 확인한다. 두 SBC 절은 대안이며 같은 QDevice를 두 번 등록하는 연속 절차가 아니다.
