# Filesystem Commands & Management

## 변경 안전 계약

- `lsblk`, `findmnt`, `blkid` 같은 관찰 명령으로 serial/WWN, mount, filesystem과 LVM 계층을 먼저 기록합니다.
- `fdisk`, `parted`, `pvcreate`, filesystem resize는 데이터 손실 가능 작업입니다. 백업 복원 시험, 대상 장치 이중 확인과 유지보수 창 없이 실행하지 않습니다.
- block device 크기, partition, PV/LV와 filesystem 크기는 서로 다른 계층이므로 올바른 순서와 각 도구의 지원 방향을 확인합니다.
- 완료 증거는 재부팅 후 mount, 용량, 읽기/쓰기, `/etc/fstab`과 모니터링이 의도와 일치하고 롤백 자료가 남은 상태입니다.

## 1. 필수 관리 명령어
파일 시스템 상태 파악 및 관리를 위한 핵심 도구들입니다.

### `lsblk` (List Block Devices)
*   **용도:** 블록 장치들의 트리 구조(관계)와 마운트 포인트 확인. `blkid`보다 직관적입니다.
*   **추천 옵션:**
    ```bash
    lsblk -f                # 파일 시스템 유형 및 UUID 표시
    lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,UUID  # 필요한 정보만 선택 표시
    ```

### `fdisk` / `parted` (Partitioning)
*   **용도:** 디스크 파티션 테이블을 조회하거나 승인된 변경을 수행합니다. 장치 인식은 `lsblk`, kernel log, transport 정보와 함께 확인합니다.
*   **명령어:**
    *   `sudo fdisk -l`: 연결된 모든 디스크의 파티션 정보를 나열.
    *   `sudo fdisk /dev/sda`: 대화형 파티션 관리 모드 진입.

### `mount` / `umount`
*   **용도:** 파일 시스템을 디렉터리 트리(마운트 포인트)에 연결하거나 해제합니다.
*   **사용법:**
    ```bash
    sudo mount /dev/sdb1 /mnt/usb  # 연결
    sudo umount /mnt/usb           # 해제
    ```
*   **`/etc/fstab`:** 부팅 시 자동으로 마운트할 정보를 저장하는 설정 파일입니다. 실수로 잘못 수정하면 부팅 실패(Emergency Mode)로 이어질 수 있으니 주의해야 합니다.

---

## 2. LVM (Logical Volume Manager)
물리적 디스크를 유연하게 관리하기 위한 추상화 계층입니다. 파티션 크기 조절의 유연성을 제공합니다.

### LVM 계층 구조
1.  **PV (Physical Volume):** 실제 물리적 파티션 (예: `/dev/sda1`). LVM의 가장 기본 단위.
2.  **VG (Volume Group):** 여러 PV를 묶어 만든 하나의 거대한 스토리지 풀. (예: `sda1` 100GB + `sdb1` 100GB = 200GB VG)
3.  **LV (Logical Volume):** 사용자가 실제로 포맷해서 사용하는 가상 논리 파티션. VG에서 필요한 만큼 공간을 할당받아 생성합니다.

### 왜 LVM을 사용하는가?
*   **유연성:** LV와 파일시스템이 지원하고 여유 공간·I/O 조건이 맞으면 온라인 확장이 가능할 수 있습니다. 축소는 파일시스템별 지원 여부와 오프라인 절차가 다릅니다.
*   **확장성:** 여러 개의 물리 디스크를 하나의 거대한 파일 시스템처럼 쓸 수 있습니다.
*   **스냅샷:** 짧은 일관성 지점이나 변경 전 보조 수단으로 쓸 수 있지만 원본 VG 장애와 공간 고갈을 공유하므로 독립 백업은 아닙니다.

### 주요 명령어
*   `pvcreate /dev/sdb1`
*   `vgcreate my_vol_group /dev/sdb1`
*   `lvcreate -n my_logical_vol -L 10G my_vol_group`
*   `lvextend`: 볼륨 확장 (이후 `resize2fs` 등으로 파일시스템 확장 필요)
