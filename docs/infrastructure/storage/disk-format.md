# 리눅스 파일 시스템 관리 명령어 가이드

파일 시스템을 관리하고 디스크를 초기화하는 다양한 명령어들에 대한 상세 가이드입니다. 각 명령어는 디스크 파티션, RAID 배열, LVM 볼륨 등을 효과적으로 관리하는 데 필수적입니다.

## 1. dmsetup remove

### 명령어
`dmsetup remove [옵션] 장치이름`

### 사용 예시와 결과
```bash
# 기본 사용법
dmsetup remove /dev/vg2-volume_2

# 강제 삭제 (사용 중인 장치)
dmsetup remove -f /dev/vg2-volume_2

# 모든 device-mapper 장치 보기 및 삭제
dmsetup ls
dmsetup remove_all
```

실행 결과:
```
# dmsetup ls 실행 결과 예시
vg2-syno_vg_reserved_area (252:9)
vg2-volume_2              (252:10)

# 삭제 후 확인 시 해당 항목이 목록에서 사라짐
```

### 코드 설명
- `dmsetup remove`: 지정된 device-mapper 장치를 비활성화하고 /dev/mapper에서 제거
- `-f` 또는 `--force`: 강제 삭제 옵션, 사용 중인 장치의 경우 모든 I/O를 실패하게 만들어 삭제 가능하게 함
- `장치이름`: 삭제할 논리 장치 이름 (예: vg2-volume_2)

### 적용 가능 파일 시스템
- LVM(Logical Volume Manager) 볼륨
- 암호화된 LUKS 볼륨
- 다중 경로(multipath) 장치
- 씬 프로비저닝(thin-provisioning) 장치

### 기타 사항
- 사용 중인 장치는 일반적으로 제거할 수 없음
- 계층 구조로 연결된 장치는 계층 구조의 최상위부터 제거해야 함
- `dmsetup ls --tree`로 장치 간 의존성 확인 가능

## 2. mdadm --stop --force

### 명령어
`mdadm --stop [--force] /dev/md장치`

### 사용 예시와 결과
```bash
# RAID 배열 중지
mdadm --stop /dev/md0

# 강제 중지 옵션 사용
mdadm --stop --force /dev/md0

# 슈퍼블록 제거
mdadm --zero-superblock /dev/sdb3
```

실행 결과:
```
# 정상 중지 시
mdadm: stopped /dev/md0

# 마운트된 파일시스템이 있는 경우 오류 발생 가능
mdadm: Cannot stop array /dev/md0: Device or resource busy
```

### 코드 설명
- `--stop`: 지정된 RAID 배열을 중지
- `--force`: 강제 중지 (일반적인 상황에서 중지가 불가능할 때 사용)
- `--zero-superblock`: 장치에서 RAID 메타데이터(슈퍼블록)를 제거

### 적용 가능 파일 시스템
- mdadm으로 생성된 모든 RAID 배열 (RAID0, RAID1, RAID5, RAID6, RAID10 등)
- 모든 표준 리눅스 파일 시스템이 RAID 상에 구성 가능 (ext4, xfs, btrfs 등)

### 기타 사항
- RAID 배열이 마운트되어 있거나 LVM으로 사용 중이면 먼저 해당 리소스를 해제해야 함
- 완전한 제거를 위해선 슈퍼블록도 제거해야 함 (`--zero-superblock`)
- 배열 구성 정보는 `/etc/mdadm/mdadm.conf`에서도 제거 필요

## 3. wipefs --all

### 명령어
`wipefs [옵션] 장치`

### 사용 예시와 결과
```bash
# 모든 시그니처 삭제
wipefs --all /dev/sdb

# 특정 파티션의 시그니처 삭제
wipefs --all /dev/sdb1

# 강제 삭제
wipefs --all --force /dev/sdb

# 백업 생성 후 삭제
wipefs --all --backup /dev/sdb
```

실행 결과:
```
# wipefs --all /dev/sdb 실행 시
/dev/sdb: 8 bytes were erased at offset 0x00000200 (gpt): 45 46 49 20 50 41 52 54
/dev/sdb: 8 bytes were erased at offset 0x5d3b06ffff200 (gpt): 45 46 49 20 50 41 52 54
/dev/sdb: 2 bytes were erased at offset 0x1fe (dos): 55 aa
```

### 코드 설명
- `--all`: 모든 파일 시스템 시그니처, 파티션 테이블, RAID 슈퍼블록 등을 삭제
- `--force`: 읽기 전용 장치에서도 강제로 시그니처 제거
- `--backup`: 제거하기 전 시그니처 백업 생성(나중에 복원 가능)

### 적용 가능 파일 시스템
- 모든 파일 시스템 시그니처 제거 가능 (ext2/3/4, xfs, btrfs, ntfs, vfat 등)
- 파티션 테이블 제거 (GPT, MBR/DOS)
- RAID 슈퍼블록 제거
- LVM 메타데이터 제거

### 기타 사항
- 데이터 복구가 불가능하므로 신중하게 사용해야 함
- 디스크의 시작 부분만 지우기 때문에 실제 데이터는 여전히 남아있을 수 있음
- `--noheadings` 옵션으로 출력 헤더를 제거할 수 있음

## 4. fdisk

### 명령어
`fdisk [옵션] 장치`

### 사용 예시와 결과
```bash
# 디스크 정보 보기
fdisk -l /dev/sdb

# 대화형 모드로 파티션 테이블 관리
fdisk /dev/sdb
```

fdisk 대화형 모드 명령어:
```
m - 도움말 보기
p - 파티션 테이블 출력
n - 새 파티션 추가
d - 파티션 삭제
t - 파티션 유형 변경
w - 변경사항 저장 후 종료
q - 저장하지 않고 종료
g - GPT 파티션 테이블 생성
o - MBR 파티션 테이블 생성
```

실행 결과:
```
# fdisk -l /dev/sdb 실행 결과
Disk /dev/sdb: 12.73 TiB, 14000519643136 bytes, 27344764928 sectors
Disk model: WDC  WUH721414AL
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes
Disklabel type: gpt
Disk identifier: A8A4056E-2B83-CF49-9147-B1871235F80
```

### 코드 설명
- `-l`: 디스크의 파티션 테이블 정보 출력
- 대화형 모드: 키보드 명령을 통해 파티션 생성, 삭제, 수정 가능
- 'g' 입력: 새로운 GPT 파티션 테이블 생성
- 'o' 입력: 새로운 MBR/DOS 파티션 테이블 생성

### 적용 가능 파일 시스템
- GPT 파티션 테이블
- MBR/DOS 파티션 테이블
- Sun 파티션 테이블
- SGI 파티션 테이블
- BSD 디스크 레이블

### 기타 사항
- 파티션만 생성하며 파일 시스템 생성은 별도로 필요 (mkfs 명령어)
- 사용 중인 디스크의 경우 파티션 변경 시 주의 필요
- 최신 시스템에서는 fdisk 대신 parted나 gdisk 사용 권장 (2TB 이상의 디스크)
- 디스크 정렬을 자동으로 최적화하여 성능 향상

## 5. 파티션 및 RAID 삭제 전체 워크플로우

### 명령어 시퀀스
아래는 LVM 볼륨, RAID 배열, 파티션을 모두 제거하는 전체 워크플로우입니다.

```bash
# 1. LVM 볼륨 비활성화 및 제거
lvchange -an /dev/vg2/volume_2
lvchange -an /dev/vg2/syno_vg_reserved_area
lvremove /dev/vg2/volume_2
lvremove /dev/vg2/syno_vg_reserved_area
vgremove vg2
pvremove /dev/md0

# 2. RAID 배열 중지 및 제거
mdadm --stop /dev/md0
mdadm --zero-superblock /dev/sdb3

# 3. 디스크 시그니처 제거
wipefs --all /dev/sdb

# 4. 새 파티션 테이블 생성
fdisk /dev/sdb
# 'g' 입력: 새 GPT 파티션 테이블 생성
# 'w' 입력: 저장 후 종료
```

### 코드 설명
- 이 워크플로우는 계층적으로 구성된 스토리지 시스템을 하향식으로 해체
- LVM 논리 볼륨 → 볼륨 그룹 → 물리 볼륨 → RAID 배열 → 파티션 → 디스크 순으로 진행
- 각 단계는 이전 단계가 완료된 후에 진행해야 함

### 적용 가능 파일 시스템
- 모든 표준 리눅스 파일 시스템
- 복잡한 스토리지 스택 (LVM on RAID, 암호화된 볼륨 등)

### 기타 사항
- LVM 메타데이터와 장치 매퍼 간 불일치 발생 시 `dmsetup` 명령어로 직접 처리
- RAID 자동 시작 방지: `/etc/mdadm/mdadm.conf`에 `AUTO -all` 추가
- 디스크 초기화 후 새 용도로 사용 전 항상 `lsblk` 명령으로 상태 확인 필요


<hr/>

# Proxmox VM에서 LVM 볼륨 용량 확장 가이드

Proxmox VM에서 논리 볼륨(LVM)의 용량을 확장하는 방법에 대한 종합적인 가이드를 제공합니다. 특히 sda3 파티션과 관련된 LVM의 저장 공간을 남은 빈 저장소 용량을 사용하여 증가시키는 방법을 설명합니다.

## 현재 디스크 레이아웃 이해하기

이미지에서 볼 수 있듯이, 현재 시스템은 다음과 같은 디스크 레이아웃을 가지고 있습니다:
- sda (50GB 디스크)
  - sda1 (1MB 파티션)
  - sda2 (2GB 파티션, `/boot`에 마운트됨)
  - sda3 (48GB 파티션)
    - ubuntu--vg-ubuntu--lv (24GB LVM 볼륨, `/`에 마운트됨)
- sdb (2.7TB 디스크, `/mnt/docker`에 마운트됨)
- sr0 (3GB ROM)

## 1. Proxmox에서 VM 디스크 크기 확장하기

먼저 Proxmox 호스트에서 VM 디스크 크기를 확장해야 합니다:

### GUI 방식:
1. Proxmox 웹 인터페이스에 로그인합니다.
2. VM을 선택하고 '하드웨어' 탭으로 이동합니다.
3. 확장하려는 디스크를 선택하고 '편집' 버튼을 클릭합니다.
4. 새로운 디스크 크기를 입력하고 'OK'를 클릭합니다.

### CLI 방식:
VM이 201번이고 scsi0 디스크를 168GB 증가시키는 예시입니다:
```
root@proxmox:~# qm resize 201 scsi0 +168G
```

## 2. VM 내부에서 파티션 확장하기

VM을 부팅하고 터미널을 열어 다음 단계를 수행합니다:

### 2.1 현재 디스크 상태 확인
```
sudo fdisk -l
sudo lsblk
```

### 2.2 파티션 확장하기
`growpart` 명령어를 사용하여 sda3 파티션을 확장합니다:
```
sudo growpart /dev/sda 3
```

또는 `parted`를 사용할 수도 있습니다:
```
sudo parted /dev/sda
(parted) print
(parted) resizepart 3 100%
(parted) print
(parted) quit
```

## 3. 물리 볼륨(PV) 확장하기

LVM 물리 볼륨을 새로운 파티션 크기에 맞게 확장합니다:
```
sudo pvresize /dev/sda3
```

현재 물리 볼륨 상태를 확인하려면:
```
sudo pvs
sudo pvdisplay
```

## 4. 논리 볼륨(LV) 확장하기

이제 논리 볼륨을 사용 가능한 모든 공간으로 확장합니다:
```
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
```
또는 `-r` 옵션을 포함하면 파일 시스템도 함께 확장합니다:
```
sudo lvextend -r -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
```

## 5. 파일 시스템 확장하기

`-r` 옵션을 사용하지 않았다면, 파일 시스템을 수동으로 확장해야 합니다:

### ext4 파일 시스템의 경우:
```
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv
```

### XFS 파일 시스템의 경우:
```
sudo xfs_growfs /dev/mapper/ubuntu--vg-ubuntu--lv
```

## 6. 변경 사항 확인하기

파일 시스템 크기가 확장되었는지 확인합니다:
```
df -h
```

## 주의 사항 및 팁

1. VM을 확장하기 전에 백업을 수행하는 것이 좋습니다.
2. 파티션 확장 중 GPT PMBR 크기 불일치 경고가 표시될 수 있으며, 이는 정상입니다.
3. XFS 파일 시스템은 온라인 확장을 지원하므로 VM을 재부팅하지 않고도 실시간으로 확장할 수 있습니다.
4. LVM 구성이 복잡한 경우, 전체 프로세스 순서를 확인하세요: 디스크 확장 → 파티션 확장 → PV 확장 → LV 확장 → 파일 시스템 확장.
