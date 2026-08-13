---
description: Proxmox VE의 스냅샷, 백업, 템플릿 기능 비교 및 활용 가이드
---

# Proxmox 스냅샷 vs 백업 vs 템플릿

세 기능의 목적과 복구 경계를 비교합니다. 지원 기능과 정합성은 Proxmox VE 버전, VM·컨테이너 종류, 스토리지 백엔드, guest agent, 백업 모드에 따라 달라집니다.

## 한눈에 보는 비교

| 구분 | 스냅샷 (Snapshot) | 백업 (Backup) | 템플릿 (Template) |
|------|-------------------|---------------|-------------------|
| **핵심 비유** | 게임 '세이브 포인트' | 외장하드에 복사 | 공장의 '금형(틀)' |
| **주 목적** | 단기 상태 저장 및 롤백 | 장기 보관 및 재해 복구 | VM 배포 및 복제 |
| **저장 위치** | 원본 디스크와 동일 | **외부 스토리지 권장** | Proxmox 스토리지 내 |
| **의존성** | 대개 원본 스토리지 장애 도메인에 의존 | 별도 장애 도메인·키·카탈로그가 있어야 원본과 독립 | Linked Clone은 템플릿·백엔드에 의존 |
| **속도** | 백엔드와 VM 상태에 따라 다름 | 데이터량·압축·스토리지에 따라 다름 | Clone 방식과 백엔드에 따라 다름 |
| **데이터 포함** | RAM 상태 포함 가능 | 설정 + 디스크 전체 | OS 및 패키지 상태 |

---

## :material-camera: 스냅샷 (Snapshot)

**"실행 취소(Undo) 버튼"** - 특정 시점의 VM 상태를 찍어두는 기능

### 핵심 용도

- 위험한 작업(OS 업데이트, 설정 변경) **직전**에 생성
- 문제 발생 시 즉시 **롤백(Rollback)**

### 작동 방식

```
원본 디스크 [Base] ──┬── 스냅샷 1 (변경분만 저장)
                     └── 스냅샷 2 (변경분만 저장)
```

- 구현은 ZFS, LVM-thin, Ceph, qcow2 등 백엔드마다 다르며 모든 스냅샷이 같은 delta 방식을 쓰지 않습니다.
- 생성 시간과 일시 정지 영향은 디스크 수, RAM 포함 여부와 I/O 부하에 따라 측정합니다.

### GUI에서 스냅샷 생성

1. VM 선택 → **[Snapshots]** 탭
2. **[Take Snapshot]** 클릭
3. 이름 입력 (예: `before-kernel-update`)
4. `Include RAM` 체크 (실행 중인 상태까지 저장하려면)

Snapshot 모드는 실행 중인 게스트의 파일 시스템이나 데이터베이스를 자동으로 애플리케이션 일관 상태로 만든다고 보장하지 않습니다. guest agent와 애플리케이션별 freeze/hook 또는 자체 백업을 확인하세요.

### CLI 명령어

```bash
# 스냅샷 생성
qm snapshot <VMID> <스냅샷이름> --description "설명"

# 스냅샷 목록 확인
qm listsnapshot <VMID>

# 스냅샷으로 롤백
qm rollback <VMID> <스냅샷이름>

# 스냅샷 삭제
qm delsnapshot <VMID> <스냅샷이름>
```

!!! warning "주의사항"
    - **백업이 아닙니다!** 원본 디스크가 깨지면 스냅샷도 함께 소실
    - 오래 유지하거나 많이 만들면 디스크 성능 저하
    - 작업 완료 후에는 **삭제하는 것이 원칙**

---

## :material-backup-restore: 백업 (Backup)

**"보험(Safety Net)"** - VM 전체를 압축하여 별도 파일로 저장

### 핵심 용도

- 하드웨어 고장, 데이터 삭제, 랜섬웨어 감염 등 **재해 복구**
- 장기 보관 및 아카이빙

### 작동 방식

```
VM 전체 → 압축 → vzdump-qemu-100-2026_01_26.vma.zst
                 (NAS, PBS 등 외부 스토리지에 저장)
```

### GUI에서 백업 생성

1. VM 선택 → **[Backup]** 탭
2. **[Backup now]** 클릭
3. 설정:
   - **Storage**: 백업 저장 위치 (NAS, PBS 권장)
   - **Mode**: Stop/Suspend/Snapshot
   - **Compression**: ZSTD (권장)

### CLI 명령어

```bash
# 즉시 백업
vzdump <VMID> --storage <저장소> --compress zstd --mode stop

# 백업 파일에서 복원
qmrestore <백업파일경로> <새VMID> --storage <스토리지>
```

### 자동 백업 스케줄 설정

**Datacenter → Backup → Add**

```yaml
Storage: nfs-backup
Schedule: 02:00 (매일 새벽 2시)
Selection mode: Include/Exclude
Mode: Snapshot
Compression: ZSTD
Retention: keep-last=7, keep-weekly=4
```

!!! tip "백업 전략 (3-2-1 규칙)"
    - **3개**의 데이터 사본
    - **2개**의 다른 저장 매체
    - **1개**는 오프사이트(외부 위치)

---

## :material-shape-plus: 템플릿 (Template)

**"붕어빵 틀(Blueprint)"** - VM 복제를 위한 기본 이미지

### 핵심 용도

- 동일한 환경의 VM을 **빠르게 대량 생산**
- 표준화된 설정의 VM 배포

### 작동 방식

```
Ubuntu VM (설정 완료) 
    ↓ Convert to Template
Template (불변, 부팅 불가)
    ↓ Clone
├── web-server-01
├── web-server-02
└── web-server-03
```

### 템플릿 생성 방법

#### 방법 1: 기존 VM을 템플릿으로 변환

1. VM을 완전히 설정하고 종료
2. VM 우클릭 → **[Convert to Template]**
3. 템플릿은 더 이상 부팅/수정 불가

#### 방법 2: Cloud Image로 템플릿 생성 (권장)

```bash
# 1. 우분투 클라우드 이미지 다운로드
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# 2. 빈 VM 생성
qm create 9000 --name "ubuntu-template" --memory 2048 --net0 virtio,bridge=vmbr0

# 3. 이미지를 VM 디스크로 임포트
qm importdisk 9000 jammy-server-cloudimg-amd64.img local-lvm

# 4. 디스크 연결
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0

# 5. 부팅 순서 설정
qm set 9000 --boot c --bootdisk scsi0

# 6. Cloud-Init 드라이브 추가
qm set 9000 --ide2 local-lvm:cloudinit

# 7. 템플릿으로 변환
qm template 9000
```

### 템플릿에서 VM 복제 (Clone)

1. 템플릿 우클릭 → **[Clone]**
2. 설정:
   - **VM ID / Name**: 새 VM 정보
   - **Mode**: 
     - **Linked Clone**: 빠름, 공간 절약, 템플릿 의존
     - **Full Clone**: 느림, 완전 독립

| Clone 방식 | 생성 속도 | 디스크 사용량 | 템플릿 의존성 |
|-----------|----------|--------------|--------------|
| Linked Clone | 수 초 | 매우 적음 | **있음** |
| Full Clone | 수 분 | 전체 크기 | 없음 |

### Cloud-Init 설정

복제 후 **[Cloud-Init]** 탭에서:

- **User**: 기본 사용자 계정
- **Password / SSH Key**: 접속 인증 정보
- **IP Config**: DHCP 또는 Static IP

!!! info "Regenerate Image"
    설정 변경 후 반드시 **[Regenerate Image]** 클릭!

---

## 템플릿 내보내기/가져오기

### 내보내기 (Export)

Proxmox에는 직접적인 Export 메뉴가 없습니다. **백업 기능**을 사용합니다.

```bash
# 1. 템플릿 백업 생성
vzdump 9000 --storage local --compress zstd

# 2. 백업 파일 다운로드
# GUI: Storage → Backups → Download
# 또는 SCP로 직접 복사
scp /var/lib/vz/dump/vzdump-*.vma.zst user@remote:/backup/
```

### 가져오기 (Import)

```bash
# 1. 백업 파일 업로드
# GUI: Storage → Backups → Upload

# 2. 복원
qmrestore /var/lib/vz/dump/vzdump-qemu-9000-*.vma.zst 9001

# 3. 다시 템플릿으로 변환
qm template 9001
```

---

## 언제 무엇을 써야 할까?

| 상황 | 선택 |
|-----|------|
| "방화벽 설정을 건드리기 전 혹시 몰라서..." | :material-camera: **스냅샷** |
| "서버 디스크가 언제 고장 날지 모르니..." | :material-backup-restore: **백업** |
| "똑같은 리눅스 서버 5대를 빨리 만들어야..." | :material-shape-plus: **템플릿** |

---

## 완료, 실패 및 복구 증거

스냅샷은 테스트 VM 롤백, 백업은 격리된 VM ID로의 실제 복원, 템플릿은 clone 후 machine-id·SSH host key·cloud-init·네트워크 중복 확인까지 통과해야 완료입니다. 목록과 작업 성공 표시는 복구 증거가 아닙니다. 실패한 부분 clone/restore는 원본 VM ID를 덮어쓰지 말고 정리한 뒤 재시도합니다.

## 참고 자료

- [Proxmox VE 공식 문서 - Backup and Restore](https://pve.proxmox.com/wiki/Backup_and_Restore)
- [Proxmox VE 공식 문서 - Templates](https://pve.proxmox.com/wiki/VM_Templates_and_Clones)
