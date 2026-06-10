# Linux 문서

이 섹션은 Linux 기본 명령, 파일시스템, Arch Linux, Proxmox 관련 운영 작업, FFmpeg 사용법을 한 흐름으로 묶는다. 목표는 배포판별 명령어를 외우는 것이 아니라 시스템 상태를 읽고 안전하게 변경하는 습관을 만드는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Linux 문서는 주제가 넓어지기 쉽다. 명령어, 파일 권한, 부팅, 디스크, 네트워크, 멀티미디어, Proxmox가 한 디렉터리에 섞이면 사용자는 원하는 문서가 어디에 있는지 추측해야 한다.

상위 인덱스는 실제 파일 구조와 학습 경로를 맞추는 역할을 한다. 존재하지 않는 링크나 오래된 분류가 남으면 문서 탐색 자체가 실패한다.

## 2. 현재 나의 상태 (Baseline)

현재 `content/docs/linux`에는 다음 문서가 있다.

- [Linux 명령어 참조](commands.md)
- [Linux 파일시스템과 파일 I/O](filesystem.md)
- [Arch Linux UEFI 설치](arch/installation.md)
- [KDE Plasma 설정](arch/kde-theme.md)
- [Arch Linux 문제 해결](arch/troubleshooting.md)
- [FFmpeg 동영상 분할](multimedia/ffmpeg.md)
- [Proxmox 물리 디스크 연결](proxmox/drive-mount.md)
- [Proxmox OS 디스크 마이그레이션](proxmox/migration.md)
- [Proxmox WireGuard VPN](proxmox/wireguard-vpn.md)

기존 인덱스는 카드형 목록과 배포판 비교를 제공하지만, 각 문서가 어떤 운영 상황에서 필요한지 충분히 설명하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 순서로 Linux 문서를 사용할 수 있게 하는 것이다.

- 기본 명령으로 파일, 프로세스, 네트워크, 로그를 확인한다.
- 파일시스템의 inode, fd, permission, link 개념을 이해한다.
- Arch 설치는 UEFI, partition, mount, bootloader 상태를 검증하면서 진행한다.
- 데스크톱 설정은 KDE Plasma의 사용자 설정과 system 설정 경계를 구분한다.
- Proxmox 작업은 VM/CT 백업과 디스크 식별을 먼저 수행한다.
- FFmpeg 작업은 재인코딩과 stream copy의 차이를 알고 실행한다.

## 4. 시스템 번역 (Data Flow)

Linux 운영 문서의 흐름은 다음과 같다.

```text
shell command
  -> kernel or service state
  -> file, process, network, block device observation
  -> configuration change
  -> verification command
  -> rollback or cleanup
```

Linux 작업은 대부분 “상태 조회 → 변경 → 검증” 순서로 진행해야 한다. 조회 없이 바로 변경하면 복구할 단서가 줄어든다.

## 5. 핵심 구성요소 (Building Blocks)

명령어 문서는 `ls`, `find`, `ps`, `systemctl`, `journalctl`, `ip`, `ss`, `curl` 같은 운영 기본 도구를 다룬다.

파일시스템 문서는 inode, file descriptor, open file table, permission, directory entry, hard link, symbolic link를 설명한다.

Arch 문서는 rolling release 배포판의 수동 설치와 문제 해결 흐름을 다룬다.

Proxmox 하위 문서는 Linux storage와 network 개념이 가상화 플랫폼에서 어떻게 드러나는지 보여준다.

FFmpeg 문서는 media file을 자를 때 copy와 encode가 어떤 trade-off를 갖는지 다룬다.

## 6. 상태 전이 (State Transition)

학습 순서는 다음처럼 잡는다.

```text
basic shell navigation
  -> file and permission model
  -> process and service inspection
  -> disk and mount operations
  -> distribution-specific installation
  -> virtualization host operations
  -> media processing operations
```

운영 작업은 다음 루프를 반복한다.

```text
observe
  -> decide
  -> change
  -> verify
  -> document result
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 삭제, format, partition, `dd`, passthrough 작업은 대상 장치를 두 번 확인한다.
- root 권한 명령은 변경 범위와 rollback 방법을 먼저 정한다.
- `/etc` 설정 파일을 바꾸기 전 원본을 백업한다.
- Proxmox 작업 전 VM/CT 백업 상태를 확인한다.
- Arch 설치 문서는 항상 최신 Arch Wiki와 ISO 기준을 확인한다.
- Network 변경은 현재 접속 세션을 끊을 수 있으므로 out-of-band 접근 방법을 준비한다.
- Media 변환은 원본 파일을 덮어쓰지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 시스템 상태를 확인한다.

```bash
uname -a
hostnamectl
lsblk -f
df -h
ip addr show
ip route
systemctl --failed
journalctl -p warning -b
```

파일과 권한을 확인한다.

```bash
pwd
ls -la
stat .
namei -l /etc/passwd
find /var/log -type f -name '*.log' -maxdepth 2
```

문서 탐색은 다음 순서로 시작한다.

```text
commands.md
  -> filesystem.md
  -> arch or proxmox document for target task
```

## 9. 실패 사례 (What could go wrong?)

`rm -rf`, `mkfs`, `dd`는 실수하면 즉시 데이터 손실로 이어진다. 대상 device와 mount 상태를 먼저 본다.

`chmod -R`을 넓은 경로에 실행하면 실행 권한, secret 파일 권한, service 계정 접근권한이 망가질 수 있다.

Arch 설치에서 ESP mount 경로와 bootloader 설정이 틀리면 설치는 끝난 것처럼 보여도 재부팅에 실패한다.

Proxmox에서 `/dev/sdX` 이름으로 디스크를 연결하면 재부팅 후 다른 디스크를 가리킬 수 있다. persistent by-id 경로를 우선한다.

FFmpeg stream copy는 빠르고 무손실이지만 keyframe 기준으로 잘릴 수 있다. 정확한 frame 단위가 필요하면 재인코딩이 필요하다.

## 10. 뇌 확장하기 (Evolution & Variants)

Linux 운영 능력은 단일 배포판 지식보다 상태를 읽는 능력에 가깝다. Debian, Arch, Fedora, Proxmox는 패키지 관리자와 release model은 달라도 kernel, process, filesystem, network 기본 모델을 공유한다.

문서가 늘어나면 상위 인덱스는 “기능 목록”보다 “작업 흐름”을 우선해야 한다. 사용자는 보통 명령어 이름보다 해결해야 할 상태를 먼저 알고 있기 때문이다.

운영 문서는 최신 외부 문서와 맞춰야 하는 영역이 있다. Arch Linux, KDE Plasma, FFmpeg, WireGuard, Proxmox는 버전 변화가 빠르므로 작업 전 공식 문서를 확인한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 실제 존재하는 하위 문서만 링크했다.
- [ ] 기본 명령, 파일시스템, Arch, Proxmox, FFmpeg의 책임을 구분했다.
- [ ] 위험 작업은 대상 확인과 백업을 먼저 요구한다.
- [ ] 상태 조회 명령과 변경 명령을 분리했다.
- [ ] 다음에 읽을 문서를 사용자가 쉽게 고를 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux 문서의 핵심은 명령어 나열이 아니라 상태를 읽고 안전하게 바꾸는 순서다. 먼저 관찰하고, 변경 범위를 정한 뒤, 검증하고 기록한다.
