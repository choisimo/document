# SSHFS 원격 디렉터리 마운트 기준

SSHFS는 SSH 연결을 이용해 원격 디렉터리를 로컬 파일시스템처럼 mount하는 FUSE 기반 도구다. 이 문서는 SSHFS를 수동으로 테스트하고, 필요할 때 `/etc/fstab` 또는 systemd automount로 안정적으로 연결하는 기준을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

원격 서버의 작업 디렉터리, 백업 경로, 홈랩 장비의 공유 폴더를 로컬 경로처럼 쓰고 싶을 때가 있다. NFS나 Samba 서버를 새로 구성하지 않고 SSH 계정만으로 접근하려면 SSHFS가 간단하다.

하지만 SSHFS는 네트워크와 SSH 세션에 의존한다. fstab 문법을 잘못 쓰거나, 키 권한이 맞지 않거나, `allow_other`를 잘못 켜면 부팅 지연, mount 실패, 권한 노출 문제가 생긴다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Ubuntu 24.04에서 SSHFS와 NFS를 모두 설명하고, 뒤쪽에 fstab 오류 해결 내용을 따로 붙여 둔다.

문제의 핵심은 다음과 같다.

- fstab은 쉘 스크립트처럼 백슬래시 줄바꿈을 지원하지 않는다.
- SSHFS fstab 항목은 한 줄에 완성되어야 한다.
- `allow_other`는 `/etc/fuse.conf`의 `user_allow_other`와 권한 정책을 함께 봐야 한다.
- NFS와 SSHFS는 운영 성격이 다르므로 같은 절차로 취급하면 안 된다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 SSH 키 기반으로 원격 디렉터리를 안정적으로 mount하고, 네트워크가 없을 때도 부팅을 막지 않는 것이다.

- SSH 키 인증이 먼저 동작한다.
- 수동 `sshfs` mount로 원격 경로와 권한을 확인한다.
- fstab 항목은 한 줄로 작성한다.
- 부팅 시 즉시 mount보다 `noauto,x-systemd.automount,_netdev`를 기본으로 검토한다.
- `allow_other`는 필요한 경우에만 켠다.
- 장애 시 unmount와 로그 확인 방법을 알고 있다.

## 4. 시스템 번역 (Data Flow)

SSHFS mount 흐름은 다음과 같다.

```text
local process
  -> local mount point
  -> FUSE sshfs process
  -> SSH transport
  -> remote user permission
  -> remote directory
```

로컬 root 권한이 있어도 원격 파일 접근 권한은 원격 SSH 사용자 권한으로 결정된다. 따라서 원격 경로 소유권과 로컬 mount 권한을 함께 확인해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

`sshfs` 패키지는 FUSE mount helper와 SSHFS 클라이언트를 제공한다.

SSH key는 비밀번호 없는 자동 mount의 전제 조건이다. 개인키 권한은 보통 `600`, `.ssh` 디렉터리는 `700`이어야 한다.

`/etc/fstab` 항목은 한 줄이어야 한다. source, mount point, type, options, dump, pass 필드를 공백으로 구분한다.

`_netdev`는 네트워크 파일시스템임을 systemd에 알려준다.

`x-systemd.automount`는 첫 접근 시 mount하도록 하여 부팅 시 네트워크 타이밍 문제를 줄인다.

`allow_other`는 mount한 사용자 외의 로컬 사용자도 접근하게 한다. 이 옵션은 보안 영향이 있으므로 `default_permissions`와 함께 쓰고, `/etc/fuse.conf` 설정을 확인한다.

## 6. 상태 전이 (State Transition)

SSHFS 구성은 다음 상태로 진행한다.

```text
SSH login works
  -> mount point exists
  -> manual sshfs mount works
  -> permission model verified
  -> fstab backed up
  -> fstab one-line entry added
  -> systemd daemon reloaded
  -> automount tested
```

수동 mount가 실패하는 상태에서 fstab부터 수정하지 않는다. fstab은 자동화 단계일 뿐 원격 인증 문제를 해결하지 않는다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- SSH로 직접 접속되지 않으면 SSHFS도 안정적으로 동작하지 않는다.
- fstab 항목은 백슬래시로 줄바꿈하지 않는다.
- 개인키는 문서나 Git에 넣지 않는다.
- `allow_other`는 필요한 경우에만 켜고 `/etc/fuse.conf`의 `user_allow_other`를 확인한다.
- 네트워크 mount는 `nofail`, `noauto`, automount, timeout을 검토한다.
- 원격 디렉터리 권한은 원격 사용자 기준으로 검증한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

패키지를 설치한다.

```bash
sudo apt update
sudo apt install -y sshfs
```

SSH 키 접속을 먼저 확인한다.

```bash
ssh -i /home/alice/.ssh/id_ed25519 alice@nas.example.com
```

mount point를 만든다.

```bash
sudo mkdir -p /mnt/nas
sudo chown alice:alice /mnt/nas
```

수동 mount를 테스트한다.

```bash
sshfs -o IdentityFile=/home/alice/.ssh/id_ed25519,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 alice@nas.example.com:/srv/share /mnt/nas
findmnt /mnt/nas
touch /mnt/nas/write-test
rm /mnt/nas/write-test
fusermount3 -u /mnt/nas
```

`allow_other`가 필요하면 먼저 FUSE 설정을 확인한다.

```bash
grep -n "user_allow_other" /etc/fuse.conf
```

필요한 경우 `/etc/fuse.conf`에서 `user_allow_other`를 활성화한다.

`/etc/fstab`에는 한 줄로 작성한다.

```text
sshfs#alice@nas.example.com:/srv/share /mnt/nas fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,IdentityFile=/home/alice/.ssh/id_ed25519,allow_other,default_permissions,ServerAliveInterval=15,ServerAliveCountMax=3 0 0
```

fstab을 검증하고 automount를 테스트한다.

```bash
sudo findmnt --verify
sudo systemctl daemon-reload
ls /mnt/nas
findmnt /mnt/nas
```

## 9. 실패 사례 (What could go wrong?)

`fuse -o \ 알 수 없는 옵션` 같은 오류는 fstab 항목을 여러 줄로 나눴을 때 자주 발생한다. fstab은 한 mount를 한 줄에 작성해야 한다.

`Permission denied`가 나오면 SSH 키 권한, 원격 계정 권한, 원격 디렉터리 권한을 분리해서 확인한다.

`allow_other`를 켰는데 다른 사용자가 접근하지 못하면 `/etc/fuse.conf`의 `user_allow_other`가 비활성화되어 있을 수 있다.

네트워크가 늦게 올라오면 부팅 시 mount가 실패할 수 있다. SSHFS는 local disk가 아니므로 `x-systemd.automount`, `_netdev`, timeout 옵션을 사용한다.

SSHFS를 데이터베이스나 latency 민감한 workload의 primary storage로 쓰면 성능과 일관성 문제가 생길 수 있다. 그런 경우 NFS, SMB, iSCSI, block storage를 검토한다.

## 10. 뇌 확장하기 (Evolution & Variants)

AutoFS는 접근 시점에 mount하고 idle timeout 후 해제하는 방식이 필요할 때 유용하다. 다만 설정 파일이 하나 더 늘어나므로 단순한 개인 서버는 systemd automount가 더 관리하기 쉽다.

NFS는 LAN 내부에서 성능과 다중 클라이언트 운영이 더 적합한 경우가 많다. 대신 서버 export, 방화벽, UID/GID 매핑, 보안 정책을 별도로 설계해야 한다.

운영 서버에서는 SSHFS를 backup source나 임시 관리 경로로 쓰고, 핵심 애플리케이션 데이터 경로에는 더 명시적인 storage backend를 사용하는 편이 안전하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] SSH key 기반 로그인에 성공했다.
- [ ] 원격 디렉터리 경로와 권한을 확인했다.
- [ ] 수동 `sshfs` mount와 쓰기 테스트를 통과했다.
- [ ] `/etc/fstab` 항목을 한 줄로 작성했다.
- [ ] `allow_other` 필요성과 `/etc/fuse.conf` 설정을 확인했다.
- [ ] `findmnt --verify`가 통과했다.
- [ ] systemd daemon reload 후 automount를 테스트했다.
- [ ] 네트워크 장애 시 부팅이 막히지 않는다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

SSHFS는 `SSH 접속 성공 -> 수동 mount 성공 -> fstab 한 줄 등록 -> automount 검증` 순서로 설정한다. fstab은 쉘이 아니므로 줄바꿈과 백슬래시를 쓰지 않는다.
