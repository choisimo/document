# Arch Linux 문제 해결

이 문서는 Arch Linux에서 부팅, 네트워크, 패키지, 그래픽, 오디오, 입력 문제를 진단하는 순서를 정리한다. 목표는 임의 명령을 복사해 실행하는 것이 아니라 로그와 상태를 보고 문제 범위를 좁히는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Arch는 rolling release 배포판이라 package update, kernel, driver, bootloader, desktop stack 변화가 빠르다. 문제가 생겼을 때 “어제 되던 설정”만 믿으면 원인을 놓치기 쉽다.

문제 해결 문서는 해결책 목록보다 관측 순서가 중요하다. 어떤 로그를 보고, 어떤 상태를 확인하고, 어떤 변경을 되돌릴지 정해야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 GRUB, network, pacman key, mirror, graphics, audio, Korean input, firewall, auto update를 한 번에 다룬다. 보완해야 할 점은 다음과 같다.

- 일부 명령이 현재 기본 stack과 다를 수 있다.
- PulseAudio 중심 설명이 PipeWire 기반 환경과 섞일 수 있다.
- 자동 업데이트 예제가 rolling release 운영에는 위험할 수 있다.
- 문제 해결 전 로그와 최근 변경 확인 절차가 약하다.
- 복구용 live ISO와 chroot 흐름이 충분히 분리되지 않았다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 수행할 수 있는 상태다.

- 최근 boot journal과 failed unit을 확인한다.
- UEFI, ESP, GRUB, fstab 문제를 분리한다.
- NetworkManager와 DNS 상태를 분리해 확인한다.
- pacman database, mirror, keyring 문제를 구분한다.
- graphics driver와 display manager 문제를 분리한다.
- PipeWire, ALSA, Bluetooth audio 문제를 단계별로 확인한다.
- 문제 변경 전후를 기록하고 rollback한다.

## 4. 시스템 번역 (Data Flow)

문제 해결 흐름은 다음과 같다.

```text
symptom observed
  -> recent change identified
  -> logs collected
  -> failing component isolated
  -> one fix applied
  -> reboot or service restart
  -> verification
```

Arch 문제는 package update, configuration drift, kernel module, firmware, user service 상태가 함께 영향을 줄 수 있다.

## 5. 핵심 구성요소 (Building Blocks)

`journalctl`은 systemd journal을 조회한다. 부팅 실패, service 실패, driver error의 첫 단서다.

`systemctl --failed`는 실패한 system unit을 보여준다.

`pacman.log`는 package install, remove, upgrade 기록을 남긴다.

`lsblk`, `blkid`, `findmnt`, `cat /etc/fstab`은 boot와 mount 문제를 확인한다.

`ip`, `nmcli`, `resolvectl`은 network와 DNS 문제를 확인한다.

`lspci -k`, `lsmod`, `modinfo`는 driver와 kernel module 상태를 확인한다.

`pactl`, `wpctl`, `aplay`는 audio stack 상태를 확인한다.

## 6. 상태 전이 (State Transition)

부팅 문제는 다음 순서로 좁힌다.

```text
firmware loads boot entry
  -> bootloader loads kernel and initramfs
  -> kernel mounts root
  -> systemd starts units
  -> graphical target starts
```

네트워크 문제는 다음 순서로 좁힌다.

```text
link up
  -> IP assigned
  -> default route exists
  -> DNS resolves
  -> remote service reachable
```

패키지 문제는 다음 순서로 좁힌다.

```text
mirror reachable
  -> database synced
  -> keyring valid
  -> package transaction complete
  -> service or reboot if needed
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 원인을 확인하기 전 여러 fix를 한 번에 적용하지 않는다.
- `pacman -Syu` 중단 후에는 임의로 재실행하기 전 lock과 partial upgrade 상태를 확인한다.
- Arch에서는 partial upgrade 상태를 만들지 않는다.
- Bootloader와 fstab 작업 전 live ISO 복구 경로를 준비한다.
- `/etc/pacman.d/mirrorlist`, `/etc/fstab`, bootloader config는 수정 전 백업한다.
- Display manager 문제와 kernel graphics driver 문제를 분리한다.
- 자동 `pacman -Syu --noconfirm`은 운영 기본값으로 두지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

최근 부팅 로그와 실패 unit을 확인한다.

```bash
systemctl --failed
journalctl -p warning -b --no-pager
journalctl -b -1 -p warning --no-pager
tail -n 100 /var/log/pacman.log
```

부팅과 mount 상태를 확인한다.

```bash
bootctl status
efibootmgr -v
lsblk -f
findmnt
cat /etc/fstab
```

GRUB UEFI를 복구해야 하면 live ISO로 부팅한 뒤 root와 ESP를 mount하고 chroot한다.

```bash
mount /dev/nvme0n1p3 /mnt
mount /dev/nvme0n1p1 /mnt/boot/efi
arch-chroot /mnt
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ARCH
grub-mkconfig -o /boot/grub/grub.cfg
```

NetworkManager 상태를 확인한다.

```bash
systemctl status NetworkManager
nmcli device status
nmcli connection show
ip addr show
ip route
resolvectl status
ping -c 3 archlinux.org
```

무선 네트워크를 다시 연결한다.

```bash
nmcli device wifi list
nmcli device wifi connect SSID_NAME password WIFI_PASSWORD
```

Pacman 문제를 확인한다.

```bash
sudo pacman -Syu
sudo pacman -Qkk pacman
sudo pacman-key --init
sudo pacman-key --populate archlinux
```

Mirror를 재정렬하려면 먼저 기존 파일을 백업한다.

```bash
sudo cp /etc/pacman.d/mirrorlist /etc/pacman.d/mirrorlist.bak
sudo pacman -S reflector
sudo reflector --country 'South Korea' --country 'Japan' --age 12 --protocol https --sort rate --save /etc/pacman.d/mirrorlist
sudo pacman -Syyu
```

그래픽 driver 상태를 확인한다.

```bash
lspci -k | rg -A3 -i 'vga|3d|display'
lsmod | rg 'nvidia|amdgpu|i915|nouveau'
journalctl -b | rg -i 'drm|nvidia|amdgpu|i915|kwin|sddm|gdm'
systemctl status sddm
```

Audio 상태를 확인한다.

```bash
systemctl --user status pipewire
systemctl --user status wireplumber
wpctl status
pactl info
aplay -l
```

한글 입력기는 Fcitx5 기준으로 확인한다.

```bash
pacman -Qs fcitx5
echo "$GTK_IM_MODULE"
echo "$QT_IM_MODULE"
echo "$XMODIFIERS"
```

## 9. 실패 사례 (What could go wrong?)

부팅 실패 후 root partition만 mount하고 ESP를 mount하지 않은 채 GRUB을 설치하면 잘못된 위치에 파일이 생길 수 있다.

`pacman -Sy package`만 실행하면 partial upgrade 위험이 있다. Arch에서는 system 전체 upgrade와 package 설치의 관계를 조심해야 한다.

Mirror가 느리다고 무작정 `pacman -Syy`를 반복하면 문제 원인을 놓칠 수 있다. DNS, TLS, mirror status, keyring을 함께 본다.

NVIDIA driver는 kernel version과 module package가 맞아야 한다. 커널 업데이트 후 재부팅하지 않으면 module mismatch가 발생할 수 있다.

Display manager가 실패해도 그래픽 driver 문제가 아닐 수 있다. `startplasma-wayland`, SDDM, KWin, user config 문제를 분리한다.

Audio가 안 나올 때 PulseAudio 명령만 실행하면 PipeWire 기반 환경에서 엉뚱한 결론을 낼 수 있다. `wpctl status`와 user service를 먼저 본다.

## 10. 뇌 확장하기 (Evolution & Variants)

문제가 package update 직후 발생했다면 `/var/log/pacman.log`에서 변경된 package를 먼저 확인한다. 원인 후보를 좁힌 뒤 Arch News와 package bug tracker를 확인한다.

복구가 어려우면 Arch ISO로 부팅해 `arch-chroot`로 들어가는 방식이 가장 강력하다. 이때 root, ESP, encrypted volume, Btrfs subvolume mount 순서를 정확히 맞춰야 한다.

그래픽과 desktop 문제는 Wayland와 X11에서 증상이 다를 수 있다. Plasma, GNOME, SDDM, GDM은 각각 log 위치와 user config가 다르다.

최신 절차는 공식 문서를 기준으로 확인한다.

- Arch installation guide: <https://wiki.archlinux.org/title/Installation_guide>
- GRUB: <https://wiki.archlinux.org/title/GRUB>
- NetworkManager: <https://wiki.archlinux.org/title/NetworkManager>
- KDE: <https://wiki.archlinux.org/title/KDE>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 최근 변경과 pacman log를 확인했다.
- [ ] `systemctl --failed`와 journal warning을 확인했다.
- [ ] 부팅 문제에서 ESP, fstab, bootloader를 분리했다.
- [ ] 네트워크 문제에서 link, IP, route, DNS를 분리했다.
- [ ] pacman 문제에서 mirror, keyring, partial upgrade를 확인했다.
- [ ] graphics 문제에서 driver와 display manager를 분리했다.
- [ ] audio 문제에서 PipeWire, WirePlumber, ALSA 장치를 확인했다.
- [ ] 한 번에 하나의 fix만 적용하고 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Arch 문제 해결은 빠른 명령 복사가 아니라 최근 변경, journal, pacman log, component state를 순서대로 좁히는 작업이다. 하나씩 바꾸고 하나씩 검증해야 원인을 잃지 않는다.
