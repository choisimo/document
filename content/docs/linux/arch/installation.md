# Arch Linux UEFI 수동 설치

이 문서는 Arch Linux를 UEFI 환경에 수동 설치할 때 필요한 최소 절차와 검증 지점을 정리한다. Arch는 rolling release 배포판이므로 실제 설치 전에는 반드시 최신 Arch Wiki 설치 가이드를 확인한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Arch Linux 설치는 installer가 많은 결정을 대신하지 않는다. 사용자가 network, disk partition, filesystem, mount point, base package, locale, bootloader를 직접 연결해야 한다.

절차를 외워서 진행하면 디스크를 잘못 format하거나 ESP를 잘못 mount해서 설치 후 부팅에 실패하기 쉽다. 각 단계는 “명령 실행”보다 “상태 확인”이 먼저다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 UEFI 설치를 상세히 설명하지만 보완할 점이 있다.

- 오래된 설명과 현재 Arch Wiki 흐름이 섞여 있다.
- destructive disk command의 전제 확인이 부족하다.
- `/boot`, `/boot/efi`, ESP 역할이 명확히 분리되지 않았다.
- 설치 성공 기준이 재부팅 전후 검증으로 나뉘지 않았다.
- GUI 설치와 AUR helper 설치가 기본 OS 설치 흐름과 섞여 있다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태로 부팅 가능한 기본 Arch 시스템을 만드는 것이다.

- UEFI 모드로 Arch ISO를 부팅했다.
- Network 연결과 시간 동기화가 정상이다.
- 대상 디스크와 파티션을 명확히 식별했다.
- Root filesystem과 EFI System Partition이 올바르게 mount되었다.
- `pacstrap`으로 base system을 설치했다.
- `fstab`, locale, timezone, hostname, NetworkManager가 설정되었다.
- GRUB UEFI bootloader가 ESP에 설치되었다.
- 재부팅 후 일반 사용자로 로그인할 수 있다.

## 4. 시스템 번역 (Data Flow)

설치 흐름은 다음과 같다.

```text
Arch ISO live environment
  -> network and time ready
  -> disk partitioned
  -> filesystems created
  -> target root mounted at /mnt
  -> base system installed
  -> chroot configuration
  -> bootloader installed to ESP
  -> reboot into installed system
```

Live ISO에서 실행하는 명령과 `arch-chroot /mnt` 이후 설치된 시스템 안에서 실행하는 명령을 구분해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

Arch ISO는 설치용 live environment다. UEFI로 부팅했는지 먼저 확인한다.

ESP는 UEFI firmware가 읽는 FAT32 partition이다. 이 문서에서는 ESP를 `/mnt/boot/efi`에 mount한다.

Root filesystem은 Arch base system이 설치되는 partition이다. 예제는 ext4를 사용한다.

Swap은 RAM 부족 시 보조 메모리로 사용한다. Hibernate를 쓸 계획이면 별도 설계가 필요하다.

`pacstrap`은 `/mnt` 아래에 base package를 설치한다.

`genfstab -U`는 UUID 기준 mount 설정을 만든다.

`arch-chroot`는 설치 대상 root로 들어가 timezone, locale, network, bootloader를 설정하게 해준다.

GRUB은 UEFI bootloader 역할을 한다. `efibootmgr`는 firmware NVRAM boot entry를 등록하는 데 필요하다.

## 6. 상태 전이 (State Transition)

설치 전 상태는 다음처럼 확인한다.

```text
boot ISO
  -> verify UEFI
  -> verify network
  -> verify disk names
```

디스크 작업은 다음 상태로 진행한다.

```text
empty or selected disk
  -> GPT partition table
  -> ESP, swap, root partitions
  -> filesystems created
  -> mounted target tree
```

설치 후 상태는 다음처럼 검증한다.

```text
base installed
  -> fstab generated
  -> chroot settings complete
  -> bootloader installed
  -> reboot
  -> login
  -> network service active
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 대상 디스크를 `lsblk -f`로 확인하기 전 partition과 format 명령을 실행하지 않는다.
- 기존 OS와 dual boot를 구성한다면 ESP를 새로 format하지 않는다.
- UEFI 설치에서는 `/sys/firmware/efi/efivars`가 보여야 한다.
- ESP는 FAT32이고 bootloader 설치 시 `--efi-directory`가 ESP mount point를 가리켜야 한다.
- `/mnt/etc/fstab` 생성 후 내용을 직접 확인한다.
- `systemctl enable NetworkManager`를 chroot 안에서 실행해 재부팅 후 network를 살린다.
- Secure Boot가 켜져 있으면 별도 서명 또는 지원 부트 체인이 필요하다.
- AUR helper는 base install 검증 후 일반 사용자로 설치한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

UEFI 부팅 여부를 확인한다.

```bash
ls /sys/firmware/efi/efivars
```

Network와 시간을 확인한다.

```bash
ping -c 3 archlinux.org
timedatectl status
timedatectl set-ntp true
```

무선 연결은 `iwctl`로 진행한다.

```bash
iwctl
device list
station wlan0 scan
station wlan0 get-networks
station wlan0 connect SSID_NAME
exit
ping -c 3 archlinux.org
```

대상 디스크를 확인한다.

```bash
lsblk -f
fdisk -l
```

예시는 `/dev/nvme0n1`에 새로 설치하는 단순 구성을 가정한다.

```text
/dev/nvme0n1p1  1G    EFI System  FAT32  /boot/efi
/dev/nvme0n1p2  8G    Linux swap   swap
/dev/nvme0n1p3  rest  Linux root   ext4   /
```

Partition tool을 실행한다.

```bash
cfdisk /dev/nvme0n1
```

Filesystem을 만든다. 이 단계는 대상 partition의 기존 데이터를 지운다.

```bash
mkfs.fat -F 32 /dev/nvme0n1p1
mkswap /dev/nvme0n1p2
mkfs.ext4 /dev/nvme0n1p3
```

Mount한다.

```bash
mount /dev/nvme0n1p3 /mnt
mkdir -p /mnt/boot/efi
mount /dev/nvme0n1p1 /mnt/boot/efi
swapon /dev/nvme0n1p2
lsblk -f
findmnt /mnt
```

Base system을 설치한다.

```bash
pacstrap -K /mnt base linux linux-firmware networkmanager sudo vim
genfstab -U /mnt >> /mnt/etc/fstab
cat /mnt/etc/fstab
```

설치 대상 시스템으로 들어간다.

```bash
arch-chroot /mnt
```

Timezone과 locale을 설정한다.

```bash
ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime
hwclock --systohc
vim /etc/locale.gen
locale-gen
printf 'LANG=en_US.UTF-8\n' > /etc/locale.conf
```

`/etc/locale.gen`에서는 다음 항목을 활성화한다.

```text
en_US.UTF-8 UTF-8
ko_KR.UTF-8 UTF-8
```

Hostname과 hosts 파일을 설정한다.

```bash
printf 'arch-lab\n' > /etc/hostname
cat > /etc/hosts <<'EOF'
127.0.0.1 localhost
::1 localhost
127.0.1.1 arch-lab.localdomain arch-lab
EOF
```

NetworkManager와 root password를 설정한다.

```bash
systemctl enable NetworkManager
passwd
```

CPU에 맞는 microcode를 설치한다.

```bash
pacman -S intel-ucode
```

AMD CPU라면 다음을 사용한다.

```bash
pacman -S amd-ucode
```

GRUB을 설치한다.

```bash
pacman -S grub efibootmgr
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ARCH
grub-mkconfig -o /boot/grub/grub.cfg
```

일반 사용자를 만든다.

```bash
useradd -m -G wheel -s /bin/bash nodove
passwd nodove
EDITOR=vim visudo
```

`visudo`에서 wheel sudo 규칙을 활성화한다.

```text
%wheel ALL=(ALL:ALL) ALL
```

Chroot를 나가고 재부팅한다.

```bash
exit
umount -R /mnt
reboot
```

재부팅 후 확인한다.

```bash
systemctl status NetworkManager
ip addr show
sudo pacman -Syu
```

## 9. 실패 사례 (What could go wrong?)

UEFI가 아니라 legacy mode로 ISO를 부팅하면 UEFI boot entry 설치 흐름이 맞지 않는다. `/sys/firmware/efi/efivars`가 없으면 firmware boot mode부터 다시 확인한다.

Dual boot 환경에서 기존 ESP를 format하면 Windows나 다른 Linux 부트 항목이 사라질 수 있다. 기존 ESP는 mount만 하고 format하지 않는다.

ESP mount point와 `grub-install --efi-directory`가 다르면 firmware가 GRUB EFI file을 찾지 못할 수 있다.

`genfstab` 결과가 틀리면 재부팅 후 root filesystem이나 ESP가 제대로 mount되지 않는다. UUID와 mount point를 확인한다.

NetworkManager를 enable하지 않으면 재부팅 후 network가 끊길 수 있다. 특히 원격 설치나 headless 장비에서는 치명적이다.

NVIDIA, Wi-Fi, Bluetooth, audio 같은 하드웨어는 base install 이후 별도 driver와 firmware 확인이 필요할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

GRUB 대신 systemd-boot를 사용할 수 있다. 단순 UEFI 환경에서는 systemd-boot가 더 작고 단순하지만, LUKS, LVM, multi-boot 요구에 따라 선택이 달라진다.

Btrfs를 root filesystem으로 쓰면 subvolume, snapshot, compression 설계를 먼저 정해야 한다. 설치 명령만 바꾸면 운영 모델이 불명확해진다.

`archinstall`은 빠른 설치에 유용하지만 수동 설치 모델을 이해한 뒤 사용하는 편이 문제 해결에 유리하다.

최신 절차는 공식 문서를 기준으로 확인한다.

- Arch installation guide: <https://wiki.archlinux.org/title/Installation_guide>
- GRUB on Arch: <https://wiki.archlinux.org/title/GRUB>
- NetworkManager on Arch: <https://wiki.archlinux.org/title/NetworkManager>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] UEFI mode로 부팅했다.
- [ ] Network와 시간 동기화가 정상이다.
- [ ] 대상 디스크와 partition을 확인했다.
- [ ] Root와 ESP mount point가 올바르다.
- [ ] `pacstrap -K`와 `genfstab -U`를 완료했다.
- [ ] Locale, timezone, hostname, hosts 파일을 설정했다.
- [ ] NetworkManager를 enable했다.
- [ ] GRUB UEFI bootloader를 설치하고 config를 생성했다.
- [ ] 일반 사용자와 sudo 권한을 설정했다.
- [ ] 재부팅 후 network와 package update를 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Arch 설치는 명령어 암기가 아니라 live 환경에서 target filesystem을 만들고 chroot 안에서 부팅 가능한 시스템 계약을 완성하는 과정이다. 디스크, mount, fstab, bootloader를 확인하지 않으면 설치는 끝나도 부팅은 실패할 수 있다.
