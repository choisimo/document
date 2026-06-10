# Linux 제거 후 SSD Windows 설치 오류 분석

Linux 파티션을 삭제하고 Windows 설치 미디어에서 SSD의 파티션을 제거해도 설치 오류가 계속 발생할 수 있다. 대표 증상은 `Critical Process Died` BSOD, `No Bootable Device`, 설치 단계 중 중지 오류, `0x8007025D` 같은 설치 미디어 또는 메모리 관련 오류다.

이 문제는 기존 운영체제 파일이 남아 있어서만 발생하지 않는다. 부팅 정보, 디스크 파티션 스타일, UEFI NVRAM 항목, BIOS/UEFI 설정, 설치 미디어, RAM 또는 SSD 상태가 함께 영향을 준다.

## 파티션 삭제만으로 부족한 이유

파티션 삭제는 운영체제에 보이는 파일 시스템 구조를 제거한다. 그러나 부팅 과정에는 파티션 외의 상태도 포함된다.

| 영역 | 남을 수 있는 상태 | 설치 오류와의 관계 |
| --- | --- | --- |
| MBR / 부트 섹터 | GRUB 코드 또는 이전 부트 섹터 정보 | 레거시 BIOS 또는 MBR 기반 디스크에서 Windows 부트로더와 충돌 |
| EFI System Partition(ESP) | 이전 Linux 부트로더 파일, 손상된 Windows 부팅 파일 | UEFI 부팅 파일 생성 또는 탐색 실패 |
| NVRAM | 이전 Linux/GRUB 부팅 항목 | 펌웨어가 삭제된 부트로더를 계속 참조 |
| 디스크 파티션 스타일 | MBR 또는 GPT 상태 | UEFI Windows 설치는 일반적으로 GPT 디스크를 요구 |
| BIOS/UEFI 설정 | SATA 모드, CSM, Secure Boot, Fast Boot | 설치 미디어 인식, 저장장치 접근, 부팅 경로에 영향 |

핵심은 디스크의 파일 상태와 펌웨어가 기억하는 부팅 상태가 서로 다를 수 있다는 점이다. UEFI 시스템에서는 디스크를 초기화해도 NVRAM 항목이 별도로 남을 수 있다.

## 주요 원인

### GRUB와 EFI 잔재

Linux 파티션 삭제 후에도 GRUB 또는 관련 EFI 항목이 남을 수 있다. 이 경우 펌웨어가 삭제된 부트로더 경로를 계속 사용하거나, Windows 설치 프로그램이 부팅 경로를 올바르게 구성하지 못할 수 있다.

확인 지점은 다음과 같다.

- Linux 삭제 후 GRUB rescue 또는 GNU minimal terminal이 나타나는지
- BIOS/UEFI 부팅 메뉴에 Linux, Ubuntu, GRUB 항목이 남아 있는지
- Windows 설치 중 `bootrec /fixboot`가 `Access is denied`를 반환하는지
- `bootrec /rebuildbcd`가 Windows 설치를 찾지 못하는지

### MBR/GPT 불일치

UEFI 모드에서 Windows를 설치할 때 대상 디스크가 MBR이면 설치가 차단될 수 있다. 흔한 메시지는 다음 유형이다.

```text
Windows cannot be installed to this disk.
The selected disk has an MBR partition table.
On EFI systems, Windows can only be installed to GPT disks.
```

Linux는 CSM 또는 레거시 모드와 함께 MBR 디스크에도 설치될 수 있다. 이후 UEFI 방식의 Windows 설치를 시도하면 펌웨어 모드와 디스크 파티션 스타일이 어긋난다.

### 하드웨어 또는 설치 미디어 문제

소프트웨어 정리 후에도 오류가 반복되면 RAM, SSD, 설치 USB, SATA 케이블, SSD 펌웨어 문제가 원인일 수 있다. Windows 설치 과정은 압축 해제, 대량 파일 쓰기, 부트 파일 생성, 드라이버 로딩을 한 번에 수행하므로 하드웨어 불안정성이 쉽게 드러난다.

### BIOS/UEFI 설정 충돌

다음 설정은 Windows 설치 결과에 직접 영향을 준다.

| 설정 | 설치 기준 | 문제 양상 |
| --- | --- | --- |
| Secure Boot | 초기 문제 해결 중에는 비활성화, 설치 후 필요 시 활성화 | 서명되지 않은 미디어 또는 사용자 지정 키와 충돌 가능 |
| CSM / Legacy Boot | UEFI 설치에서는 비활성화 | GPT/UEFI 설치 경로와 충돌 가능 |
| SATA Controller Mode | AHCI | IDE/RAID/RST 설정이 SSD 설치 또는 부팅 오류를 만들 수 있음 |
| Boot Order | 설치 USB 우선, 설치 후 Windows Boot Manager 우선 | 잘못된 디스크 또는 이전 부트로더로 부팅 |
| Fast Boot | 설치 중 비활성화 | USB 설치 미디어 인식 실패 가능 |
| TPM | Windows 11에서 활성화 필요 | Windows 11 설치 조건에 영향 |

## 복구 절차

### 1. 설치 전 하드웨어 점검

RAM은 MemTest86 또는 Memtest86+로 여러 회차 테스트한다. 오류가 나오면 Windows 설치 이전에 RAM 문제를 먼저 분리한다.

SSD는 Linux Live USB 또는 다른 운영체제에서 SMART 상태를 확인한다.

```bash
sudo smartctl -a /dev/sdX
sudo nvme smart-log /dev/nvme0
```

추가 점검 항목은 다음과 같다.

- SSD 제조사 펌웨어 업데이트 확인
- SATA 데이터 케이블과 전원 케이블 재장착
- 설치 중 다른 내부 디스크 분리
- 키보드, 마우스, 모니터를 제외한 외부 장치 제거
- 공식 Microsoft Media Creation Tool로 Windows 설치 USB 재생성

### 2. BIOS/UEFI 기준 상태 설정

설치 전 BIOS/UEFI에서 기준 상태를 맞춘다.

- Optimized Defaults 또는 Load Setup Defaults 적용
- Secure Boot 일시 비활성화
- CSM 또는 Legacy Boot 비활성화
- SATA Controller Mode를 AHCI로 설정
- Windows 설치 USB를 첫 번째 부팅 장치로 설정
- Fast Boot 비활성화
- Windows 11 설치 시 TPM 활성화

설치 완료 후에는 부팅 순서를 `Windows Boot Manager` 우선으로 변경한다.

### 3. `diskpart clean`으로 디스크 초기화

Windows 설치 미디어에서 부팅한 뒤 첫 화면에서 `Shift + F10`으로 명령 프롬프트를 연다.

```text
diskpart
list disk
select disk X
clean
convert gpt
exit
exit
```

`clean`은 GUI에서 파티션을 삭제하는 것보다 더 강하게 디스크 메타데이터를 초기화한다. 파티션 테이블, 기존 포맷 정보, 부팅 관련 흔적을 제거하여 Windows 설치 프로그램이 새 GPT 레이아웃을 만들 수 있게 한다.

이후 Windows 설치 화면에서 대상 SSD의 할당되지 않은 공간을 선택한다. EFI, MSR, Windows, Recovery 파티션은 설치 프로그램이 생성한다.

### 4. Windows 부팅 파일 재구성

Windows 설치는 되었지만 부팅 파일이 손상되었거나 누락된 경우 EFI 파티션을 마운트하고 `bcdboot`로 부팅 파일을 다시 만든다.

```text
diskpart
list volume
select volume <EFI_VOLUME_NUMBER>
assign letter=S:
exit

bcdboot C:\Windows /s S: /f UEFI
```

레거시 복구 명령은 다음과 같다.

```text
bootrec /fixmbr
bootrec /fixboot
bootrec /rebuildbcd
```

GPT/UEFI 환경에서 `bootrec /fixboot`가 실패할 수 있으므로, EFI 파티션을 대상으로 한 `bcdboot`가 더 직접적인 복구 수단이 된다.

### 5. NVRAM의 이전 Linux 부팅 항목 제거

디스크 초기화 후에도 BIOS/UEFI 부팅 메뉴에 Linux 또는 GRUB 항목이 남으면 NVRAM 항목 정리가 필요할 수 있다.

Linux Live USB에서 `efibootmgr`를 사용한다.

```bash
sudo efibootmgr -v
sudo efibootmgr -b 0004 -B
sudo efibootmgr -v
```

Windows RE 또는 설치 미디어에서는 `bcdedit`로 펌웨어 항목을 확인할 수 있다.

```text
bcdedit /enum firmware
bcdedit /delete {identifier}
```

일부 펌웨어는 삭제한 항목을 다시 만들거나 BIOS 설정 화면에서 항목 삭제를 지원하지 않는다. 이런 경우 CMOS 초기화가 마지막 선택지가 될 수 있다. CMOS 초기화는 시간, 부팅 순서, SATA 모드 등 모든 BIOS 설정을 초기화하므로 이후 설정을 다시 맞춘다.

## 설치 후 확인

Windows 설치가 완료되면 다음 항목을 점검한다.

- BIOS/UEFI 부팅 순서가 `Windows Boot Manager` 우선인지
- 장치 관리자에 저장소 컨트롤러 또는 칩셋 드라이버 오류가 없는지
- Windows Update 적용 후 BSOD가 반복되지 않는지
- 이벤트 뷰어에 저장소, 디스크, NTFS, WHEA 관련 오류가 남는지
- SSD SMART 상태가 설치 후에도 정상인지

## 재발 방지 기준

듀얼 부팅을 다시 구성하거나 OS를 제거할 때는 부팅 항목과 디스크 파티션을 분리해서 관리한다.

- Windows를 먼저 설치하고 Linux를 나중에 설치하는 구성이 일반적으로 관리하기 쉽다.
- 주요 OS 설치 전 EFI 파티션 내용과 NVRAM 부팅 항목을 기록한다.
- Linux 제거 시 파티션 삭제 전에 `efibootmgr`로 Linux 부팅 항목을 먼저 제거한다.
- 공유 ESP를 사용한 경우 `/EFI/ubuntu/` 같은 Linux 부트로더 디렉터리를 별도로 정리한다.
- Windows 단독 설치로 되돌릴 때는 대상 디스크만 연결한 상태에서 `diskpart clean`과 `convert gpt`를 사용한다.

## 문제 해결 체크리스트

| 단계 | 확인 항목 | 기준 |
| --- | --- | --- |
| 하드웨어 | RAM 테스트, SSD SMART, 케이블, 설치 USB | 오류가 없어야 함 |
| 펌웨어 | UEFI 모드, CSM 비활성화, AHCI, Fast Boot 비활성화 | Windows 설치 기준과 일치 |
| 디스크 | `clean`, `convert gpt` | UEFI/GPT 기준으로 초기화 |
| 부팅 파일 | `bcdboot C:\Windows /s S: /f UEFI` | EFI 부팅 파일 재생성 |
| NVRAM | `efibootmgr` 또는 `bcdedit /enum firmware` | 이전 Linux/GRUB 항목 제거 |
| 설치 후 | Windows Boot Manager, 드라이버, 이벤트 로그 | 반복 BSOD 없음 |

지속적인 `Critical Process Died`는 부팅 정보 잔재보다 RAM, SSD, 펌웨어 호환성, 저장소 컨트롤러 설정 문제일 가능성이 커진다. 이 경우 디스크 초기화만 반복하기보다 하드웨어 진단과 BIOS/UEFI 설정 검증을 우선한다.
