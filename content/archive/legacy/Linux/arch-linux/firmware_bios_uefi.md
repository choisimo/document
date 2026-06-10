# UEFI 부팅과 EFI 시스템 파티션

UEFI 환경에서 GRUB 같은 부트 로더의 `.efi` 파일은 EFI 시스템 파티션(ESP)에 있어야 한다. Linux의 일반 `/boot` 디렉터리에 `.efi` 파일을 두면 UEFI 펌웨어가 해당 파일을 찾지 못해 부팅이 실패할 수 있다.

## UEFI 부팅 흐름

UEFI 부팅은 펌웨어와 부트 로더의 역할이 분리되어 있다.

1. 메인보드의 UEFI 펌웨어가 하드웨어를 초기화한다.
2. 펌웨어가 EFI 시스템 파티션(ESP)을 찾는다.
3. ESP 안의 `.efi` 부팅 프로그램을 실행한다.
4. GRUB 또는 Windows Boot Manager가 커널과 초기 램디스크를 로드한다.
5. 운영체제가 시작된다.

UEFI 펌웨어는 보통 FAT32 같은 제한된 파일 시스템만 읽는다. ext4, Btrfs, XFS 같은 Linux 파일 시스템을 직접 읽는다고 가정하면 안 된다.

## ESP 조건

| 항목 | 기준 |
| --- | --- |
| 파일 시스템 | FAT32 |
| 파티션 역할 | UEFI 부팅 파일 저장 |
| 파티션 타입 GUID | `C12A7328-F81F-11D2-BA4B-00A0C93EC93B` |
| 일반 마운트 지점 | `/boot/efi` |
| 예시 경로 | `/boot/efi/EFI/ubuntu/grubx64.efi` |

Linux 설치 과정에서 `/boot/efi`는 ESP를 마운트하는 지점이다. 따라서 `/boot/efi/EFI/...` 아래에 저장된 파일은 실제로 FAT32 형식의 ESP 안에 저장된다.

## `/boot/efi`와 `/boot`의 역할

| 항목 | `/boot/efi` | `/boot` |
| --- | --- | --- |
| 실제 위치 | ESP 파티션의 마운트 지점 | Linux 루트 파일 시스템 내부 또는 별도 Linux 파티션 |
| 주로 읽는 주체 | UEFI 펌웨어 | GRUB 또는 Linux |
| 파일 시스템 | FAT32 | ext4, Btrfs, XFS 등 |
| 주요 파일 | `grubx64.efi`, `bootx64.efi`, Windows Boot Manager | `vmlinuz`, `initrd.img`, `grub.cfg` |
| 부팅 실패 영향 | `.efi` 파일이 없으면 펌웨어 단계에서 실패 | 커널 또는 GRUB 설정을 찾지 못하면 부트 로더 단계에서 실패 |

## `/boot`에 EFI 파일을 설치할 때의 문제

일반적인 Linux 설치에서 `/boot`는 ext4 같은 Linux 파일 시스템에 존재한다. 이 위치에 `grubx64.efi`를 설치하면 다음 문제가 발생한다.

1. UEFI 펌웨어가 ESP를 탐색한다.
2. `/boot`가 ESP가 아니면 펌웨어가 해당 파일 시스템을 읽지 못한다.
3. `grubx64.efi`를 찾지 못한다.
4. `No bootable device found` 또는 UEFI 설정 화면 진입 같은 증상이 발생한다.

부팅 실패 지점은 Linux 커널이 아니라 펌웨어 단계다. 펌웨어가 GRUB를 실행하지 못하면 GRUB가 `/boot`의 커널과 `initrd`를 읽을 기회도 없다.

## 설치 기준

UEFI 모드로 Windows 또는 Linux를 설치할 때는 다음 구조가 필요하다.

- 디스크에 ESP 파티션이 존재한다.
- ESP는 FAT32로 포맷되어 있다.
- Linux에서는 ESP를 `/boot/efi`에 마운트한다.
- GRUB의 EFI 실행 파일은 ESP 내부의 `EFI/<배포판>/` 경로에 저장한다.
- Linux 커널과 `initrd`는 `/boot`에 둔다.

예시는 다음과 같다.

```text
/boot/efi/EFI/ubuntu/grubx64.efi
/boot/vmlinuz-linux
/boot/initramfs-linux.img
/boot/grub/grub.cfg
```

## 점검 명령

ESP 마운트 상태는 다음 명령으로 확인할 수 있다.

```bash
findmnt /boot/efi
lsblk -f
```

UEFI 부팅 항목은 다음 명령으로 확인한다.

```bash
sudo efibootmgr -v
```

`/boot/efi`가 마운트되지 않은 상태에서 GRUB를 설치하면 `.efi` 파일이 ESP가 아닌 일반 디렉터리에 기록될 수 있다. GRUB 설치 전에는 `/boot/efi`가 실제 ESP에 연결되어 있는지 먼저 확인한다.
