# Proxmox VE OS SSD 마이그레이션 절차

Proxmox VE(PVE)의 OS 디스크를 새 SSD로 이전하는 방식은 두 가지로 나뉜다.

1. **디스크 전체 복제**: 기존 디스크의 모든 내용을 새 SSD로 복사한다.
2. **신규 설치 후 설정 복원**: 새 SSD에 Proxmox VE를 설치한 뒤 기존 설정과 VM/CT 백업을 복원한다.

## 사전 준비

- VM과 CT 백업을 외장 스토리지, NAS, 다른 서버 등 Proxmox OS 디스크와 분리된 위치에 보관한다.
- `/etc/pve` 디렉토리를 별도로 백업한다. 이 디렉토리에는 VM/CT 구성, 스토리지 설정, 클러스터 정보가 포함된다.
- 네트워크 설정(`/etc/network/interfaces`), 호스트 정보(`/etc/hosts`, `/etc/hostname`)도 참고용으로 백업한다.
- 새 SSD를 Proxmox 서버에 연결한다.
- 복구용으로 Proxmox VE 설치 USB 또는 Linux Live USB를 준비한다.

```bash
# PVE 노드 셸에서 실행
tar -czf pve-etc-backup-$(date +%Y-%m-%d).tar.gz /etc/pve
```

생성된 `pve-etc-backup-....tar.gz` 파일은 USB나 네트워크 드라이브 등 외부 저장소로 복사한다.

## 방법 1: 디스크 전체 복제

디스크 전체 복제는 기존 드라이브의 OS, 부트로더, VM/CT 구성, 파티션 구조를 새 SSD로 그대로 복사한다. 기존 디스크와 새 SSD의 물리적 섹터 크기가 같고, 새 SSD 용량이 기존 디스크 이상일 때 안정적이다.

### 장점

- 성공 시 OS와 설정을 거의 그대로 사용할 수 있다.
- 작업 시간이 비교적 짧다.
- 단일 노드 환경에서 단순한 이전에 적합하다.

### 제한

- 복제 중에는 Proxmox 서버를 중지한다.
- 원본 디스크보다 작은 디스크로 복제할 수 없다.
- 대상 디스크를 잘못 선택하면 대상 디스크의 데이터가 삭제된다.
- 새 SSD가 더 큰 경우 복제 후 파티션, LVM, ZFS 확장 작업이 남는다.

### Clonezilla 사용 절차

1. [Clonezilla Live 다운로드 페이지](https://clonezilla.org/downloads.php)에서 stable 버전의 amd64 ISO 파일을 받는다.
2. [Rufus](https://rufus.ie/ko/) 또는 [Ventoy](https://www.ventoy.net/en/index.html)로 부팅 가능한 USB 드라이브를 만든다.
3. Proxmox 서버를 종료하고 기존 OS 드라이브와 새 SSD를 모두 연결한다.
4. BIOS/UEFI에서 Clonezilla Live USB로 부팅한다.
5. Clonezilla 부팅 메뉴에서 기본 옵션을 선택한다.
6. 언어와 키보드 레이아웃을 선택한 뒤 `Start Clonezilla`를 실행한다.
7. `device-device` 모드와 `disk_to_local_disk` 옵션을 선택한다.
8. 원본(Source) 디스크로 현재 Proxmox OS 드라이브를 선택한다.
9. 대상(Target) 디스크로 새 SSD를 선택한다. 대상 디스크의 기존 데이터는 삭제된다.
10. `-sfsck` 옵션은 원본 파일 시스템 검사 건너뛰기 옵션이며, 필요에 따라 유지하거나 변경한다.
11. Clonezilla가 표시하는 경고와 선택한 디스크 정보를 확인한 뒤 복제를 시작한다.
12. 복제가 끝나면 시스템을 종료하고 기존 OS 드라이브를 제거한다.
13. 새 SSD로 부팅하여 Proxmox 웹 UI, VM/CT 목록, 스토리지 구성을 확인한다.

### `dd` 사용 절차

`dd`는 장치명을 잘못 지정할 경우 데이터가 영구 삭제될 수 있다. 원본 디스크(`if`)와 대상 디스크(`of`)를 `lsblk` 또는 `fdisk -l`로 확인한 뒤 사용한다.

```bash
dd if=/dev/sdX of=/dev/sdY bs=64K conv=noerror,sync status=progress
```

- `/dev/sdX`: 원본 디스크 예시
- `/dev/sdY`: 대상 SSD 예시
- `bs=64K`: 블록 크기
- `conv=noerror,sync`: 읽기 오류가 발생해도 복제를 계속 진행
- `status=progress`: 진행 상태 표시

복제가 완료되면 시스템을 종료하고 원본 OS 드라이브를 제거한 뒤 새 SSD로 부팅한다.

## 복제 후 공간 확장

새 SSD가 기존 디스크보다 큰 경우, 남는 공간을 사용하도록 파티션과 스토리지 계층을 확장한다. Proxmox 기본 설치 방식에 따라 LVM-thin 또는 ZFS 절차를 적용한다.

### LVM-thin 설치

`gparted` 등 파티션 도구로 LVM 파티션을 확장한 뒤 PVE 노드 셸에서 PV, VG, LV를 확장한다.

```bash
# 1. Physical Volume 리사이즈
pvresize /dev/sdX3  # sdX3는 LVM 파티션명, lsblk로 확인

# 2. Free PE/Size 확인
vgdisplay pve

# 3. root 볼륨 확장
lvresize -l +100%FREE /dev/pve/root
resize2fs /dev/mapper/pve-root

# 4. data 볼륨 확장
# lvresize -l +100%FREE /dev/pve/data
```

`pve/data`를 확장하는 구성에서는 파일 시스템 종류와 LV 유형을 먼저 확인한다.

### ZFS 설치

ZFS 구성에서는 GPT 파티션 정보를 디스크 끝까지 재배치한 뒤 ZFS 풀이 새 공간을 인식하도록 설정한다.

```bash
gdisk /dev/sdX  # 새 SSD 장치명 예시
```

`gdisk`에서는 `x`(전문가 모드), `e`(GPT 재배치), `w`(쓰기), `Y`(확인) 순서로 진행한다.

```bash
zpool set autoexpand=on rpool
zpool online -e rpool /dev/sdXN # ZFS 파티션 예시
```

## 방법 2: 신규 설치 후 설정 복원

신규 설치 후 설정 복원은 새 SSD에 Proxmox VE를 설치하고 기존 `/etc/pve`와 VM/CT 백업을 복원하는 방식이다. 디스크 섹터 크기나 파티션 구조 차이가 크거나, 부트로더와 파티션 테이블을 새로 구성하려는 경우에 적합하다.

### 장점

- 부트로더와 파티션 테이블을 새 상태로 구성할 수 있다.
- 디스크 크기와 섹터 크기가 달라도 적용하기 쉽다.
- 디스크 파티션 구조를 다시 설계할 수 있다.

### 제한

- Proxmox VE 재설치 시간이 필요하다.
- 설정 복원 중 누락 항목이 생길 수 있다.
- 클러스터 환경에서는 노드 식별자, 클러스터 상태, quorum 영향을 별도로 검토한다.

### 복원 절차

1. 모든 VM/CT 백업과 `/etc/pve` 백업이 외부 저장소에 있는지 확인한다.
2. 기존 OS 드라이브를 제거하고 새 SSD를 장착한다.
3. 기존과 같은 호스트 이름과 IP 주소가 필요한 환경이면 설치 단계에서 동일하게 지정한다.
4. Proxmox VE 설치 ISO로 부팅하여 새 SSD에 설치한다.
5. 설치 완료 후 새 PVE 노드 셸에 접속한다.
6. `pve-etc-backup-....tar.gz` 파일을 `/tmp` 등 임시 위치로 복사한다.
7. Proxmox 관련 서비스를 중지하고 설정을 복원한다.

```bash
# PVE 클러스터 파일 시스템과 프록시 서비스 중지
systemctl stop pve-cluster
systemctl stop pveproxy

# 기존 설정 디렉토리 보관
mv /etc/pve /etc/pve-new

# 백업한 설정 파일 압축 해제
tar -xzf /tmp/pve-etc-backup-....tar.gz -C /

# 재부팅
reboot
```

재부팅 후 웹 UI에서 VM/CT 목록, 스토리지 설정, 네트워크 설정을 확인한다. VM/CT 디스크가 별도 스토리지에 있었던 구성에서는 스토리지를 다시 연결한 뒤 백업을 복원한다.

## 방법 비교

| 항목 | 디스크 전체 복제 | 신규 설치 후 설정 복원 |
| :--- | :--- | :--- |
| 적용 조건 | 새 SSD 용량이 원본 이상이고 디스크 구조를 유지하려는 경우 | 디스크 구조를 새로 구성하거나 섹터 크기 차이를 피하려는 경우 |
| 장점 | 시스템 전체가 동일하게 이전됨, 작업 시간이 짧음 | 새 파티션 구조 설계 가능, 부트 구성 재정비 가능 |
| 제한 | 복제 후 공간 확장 필요, 대상 디스크 선택 실수 위험 | 재설치와 설정 복원 절차 필요, 클러스터 환경 검토 필요 |
| 적합한 환경 | 단일 노드, 동일하거나 더 큰 SSD로 이전 | 단일 노드 클린 설치, 복제 실패 후 복구 |

## 확인 항목

- 새 SSD로 부팅되는지 확인한다.
- Proxmox 웹 UI에 접속되는지 확인한다.
- VM과 CT 목록이 보이는지 확인한다.
- 스토리지 경로와 디스크가 정상 연결되었는지 확인한다.
- 네트워크 브리지와 IP 설정이 기존 환경과 맞는지 확인한다.
- VM/CT 백업 복원 또는 기존 데이터 디스크 연결 상태를 확인한다.
