# FUSE의 개념과 옵션 설정 가이드

## FUSE(Filesystem in Userspace)란?

FUSE는 일반 사용자가 커널 코드를 수정하지 않고도 자신만의 파일 시스템을 생성할 수 있게 해주는 소프트웨어 인터페이스입니다[1][7]. 이는 다음 세 가지 주요 구성 요소로 이루어져 있습니다:

- 커널 모듈(fuse.ko) - 리눅스 커널과 통신
- 사용자 공간 라이브러리(libfuse.*) - API 제공
- 마운트 유틸리티(fusermount) - 파일 시스템 마운트 도구

FUSE의 가장 중요한 특징 중 하나는 비특권 사용자(root가 아닌 일반 사용자)도 안전하게 파일 시스템을 마운트할 수 있다는 점입니다[1]. 이는 sshfs와 같은 보안 네트워크 파일 시스템을 일반 사용자도 쉽게 사용할 수 있게 해줍니다.

FUSE는 Linux, FreeBSD, OpenBSD, macOS 등 다양한 유닉스 및 유닉스 계열 운영 체제에서 사용 가능하며, 2006년 리눅스 커널 2.6.14 버전부터 메인스트림 커널에 통합되었습니다[7].

## FUSE 주요 마운트 옵션과 사용 이유

### 기본 마운트 제어 옵션

1. **default_permissions**
   - 기능: 커널이 자체적으로 파일 권한 검사를 수행하도록 지시합니다[3].
   - 사용 이유: 파일 시스템이 자체 권한 검사를 구현하지 않은 경우에 필요하며, 표준 유닉스 권한 시스템(모드 비트 및 소유권 기반)을 적용합니다[3].

2. **allow_other**
   - 기능: 파일 시스템 마운트 소유자 외의 다른 모든 사용자(root 포함)가 파일에 접근할 수 있게 허용합니다[1][3].
   - 사용 이유: 여러 사용자가 동일한 마운트 지점을 공유해야 할 때 필요합니다. 기본적으로 보안상의 이유로 root 사용자만 이 옵션을 사용할 수 있습니다[3].

3. **rootmode=M**
   - 기능: 파일 시스템 루트의 파일 모드를 8진수로 지정합니다[3].
   - 사용 이유: 파일 시스템 루트 디렉토리에 대한 권한을 명시적으로 제어해야 할 때 사용합니다.

4. **user_id=N** / **group_id=N**
   - 기능: 마운트 소유자의 사용자 ID와 그룹 ID를 지정합니다[1].
   - 사용 이유: 마운트된 파일 시스템의 소유권을 특정 사용자나 그룹으로 설정할 때 사용합니다.

### 성능 관련 옵션

1. **max_read=N**
   - 기능: 읽기 작업의 최대 크기를 설정합니다[1].
   - 사용 이유: 큰 파일을 다룰 때 메모리 사용량을 제어하거나 특정 환경에서 성능을 최적화할 때 유용합니다.

2. **blksize=N**
   - 기능: 파일 시스템의 블록 크기를 설정합니다(기본값 512)[1].
   - 사용 이유: 특정 스토리지 시스템에 맞게 I/O 성능을 최적화할 때 사용합니다. 주로 'fuseblk' 타입 마운트에서만 유효합니다.

### SSHFS 관련 추가 옵션

1. **reconnect**
   - 기능: 연결이 끊어졌을 때 자동으로 재연결을 시도합니다.
   - 사용 이유: 네트워크 불안정성에 대비하여 지속적인 연결을 유지하기 위해 사용합니다.

2. **identityfile=/path/to/key**
   - 기능: SSH 연결에 사용할 개인 키 파일의 경로를 지정합니다.
   - 사용 이유: 비밀번호 대신 키 기반 인증을 사용하기 위해 필요합니다.

3. **_netdev**
   - 기능: 네트워크가 활성화된 후에만 마운트를 시도하도록 시스템에 알립니다.
   - 사용 이유: 부팅 시 네트워크 연결이 준비되기 전에 마운트를 시도하여 실패하는 것을 방지합니다.

4. **noauto,x-systemd.automount**
   - 기능: 부팅 시 자동으로 마운트하지 않고, 접근 시에만 자동으로 마운트합니다.
   - 사용 이유: 시스템 부팅 시간을 단축하고, 필요할 때만 리소스를 사용하기 위함입니다.

## SSH Config에서 유저 이름 추출하기

SSH config 파일에서 Host 정보처럼 User 정보를 동적으로 추출하는 몇 가지 방법이 있습니다:

### 1. SSH의 구성 테스트 모드 활용

SSH 명령어의 `-G` 옵션을 사용하여 config 파일을 파싱하고 특정 호스트에 대한 사용자 이름을 추출할 수 있습니다[5]:

```bash
ssh -G hostname | grep "^user " | cut -d' ' -f2
```

이 명령은 SSH가 'hostname'에 대해 사용할 구성 정보를 출력하고, 그 중에서 사용자 이름만 추출합니다.

### 2. 스크립트에서 변수 활용하기

SSH config 파일은 직접적으로 변수를 지원하지 않지만, 다음과 같은 방법으로 변수를 활용할 수 있습니다[8]:

1. **Include 지시문 사용**:
   ```
   # ~/.ssh/config
   Include ~/.ssh/session-setup
   
   # 스크립트에서 동적으로 session-setup 파일 생성
   echo "Host thisbox" > ~/.ssh/session-setup
   echo "  User myusername" >> ~/.ssh/session-setup
   ```

2. **Match Exec 기능 활용**:
   ```
   # ~/.ssh/config
   Match exec "grep -q ^thisbox$ /tmp/special-hosts"
     User specialuser
   ```

### 3. 일관된 별칭과 스크립트 조합

스크립트를 통해 SSH 연결 전에 환경을 설정하는 방법도 있습니다[8]:

```bash
# ~/.bashrc에 다음 함수 추가
ssh_with_user() {
  local host=$1
  local config_user=$(ssh -G $host | grep "^user " | cut -d' ' -f2)
  ssh ${config_user:+"-l $config_user"} $host
}
```

이런 접근 방식은 SSH config 자체에 변수를 넣는 것은 아니지만, 구성 파일에서 사용자 정보를 동적으로 추출하여 사용할 수 있게 해줍니다.

직접적으로 SSH config 파일에서 `$USER`나 `%u`와 같은 환경 변수를 사용하는 것은 지원되지 않지만[8], 위의 방법들을 통해 비슷한 기능을 구현할 수 있습니다.


---

# SSHFS 마운트 문제 해결: automount는 되지만 실제 마운트는 실패하는 경우

로그를 분석해보니 automount 유닛은 정상적으로 활성화되어 있고 디렉토리 접근 요청도 감지하고 있지만, 실제 마운트 작업이 성공적으로 완료되지 않고 있습니다. 이제 실제 문제의 원인을 찾아서 해결해 보겠습니다.

## 1. 마운트 유닛 상태 확인

먼저 관련 마운트 유닛의 상태를 확인해보세요:

```bash
sudo systemctl status 'mnt-external-*.mount'
```

그리고 마운트 관련 로그를 확인합니다:

```bash
journalctl -u 'mnt-external-*.mount'
```

이를 통해 마운트 실패의 구체적인 오류 메시지를 확인할 수 있습니다.

## 2. 수동 마운트 테스트 (상세 로그 활성화)

디버깅 옵션을 추가하여 수동으로 마운트를 시도해 봅시다:

```bash
sudo sshfs -o identityfile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions,debug,sshfs_debug nodove@rasp:/mnt/drive /mnt/external/rasp/ssh -v
```

이 명령은 상세한 디버깅 정보를 출력하여 정확한 문제 원인을 파악하는 데 도움이 됩니다.

## 3. 가능한 문제 원인과 해결책

### SSH 연결 문제

1. **SSH 연결 테스트**:
   ```bash
   ssh -i /home/nodove/.ssh/rasp_rsa -vvv nodove@rasp
   ```
   
   상세 디버깅 출력(-vvv)으로 SSH 연결 문제를 확인할 수 있습니다.

2. **호스트 이름 해석 문제**:
   - `/etc/hosts` 파일에 호스트 이름과 IP 주소를 추가해보세요:
     ```
     192.168.1.x  rasp
     192.168.1.y  nano_pi
     192.168.1.z  jcloud
     ```

3. **SSH 키 권한 확인**:
   ```bash
   chmod 600 ~/.ssh/rasp_rsa
   chmod 600 ~/.ssh/nano_rsa
   chmod 600 ~/.ssh/jcloud_rsa
   ```

### SSHFS 구성 문제

1. **SSHFS 재설치**:
   ```bash
   sudo apt remove --purge sshfs
   sudo apt install sshfs
   ```

2. **기본 FUSE 옵션 단순화**:
   ```
   # fstab의 간소화된 예시
   sshfs#nodove@rasp:/mnt/drive /mnt/external/rasp/ssh fuse.sshfs _netdev,reconnect,identityfile=/home/nodove/.ssh/rasp_rsa,allow_other 0 0
   ```

3. **중첩 디렉토리 문제 해결**:
   - `/mnt/external/rasp/ssh` 대신 `/mnt/external/rasp`와 같은 단순한 경로 사용을 고려하세요
   - 현재 구조를 유지하려면 상위 경로인 `/mnt/external/rasp`가 먼저 생성되어 있는지 확인하세요:
     ```bash
     sudo mkdir -p /mnt/external/rasp
     sudo chown nodove:nodove /mnt/external/rasp
     ```

## 4. systemd 마운트 유닛 직접 생성하기

fstab 대신 직접 systemd 유닛 파일을 생성하여 문제를 해결할 수 있습니다:

```bash
# 기존 마운트 중지
sudo systemctl stop 'mnt-external-*.mount'
sudo systemctl stop 'mnt-external-*.automount'

# rasp용 마운트 유닛 생성
sudo nano /etc/systemd/system/mnt-external-rasp-ssh.mount
```

파일 내용:
```
[Unit]
Description=SSHFS Mount for rasp
After=network-online.target
Wants=network-online.target

[Mount]
What=nodove@rasp:/mnt/drive
Where=/mnt/external/rasp/ssh
Type=fuse.sshfs
Options=_netdev,reconnect,identityfile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions

[Install]
WantedBy=multi-user.target
```

해당 automount 유닛 생성:
```bash
sudo nano /etc/systemd/system/mnt-external-rasp-ssh.automount
```

파일 내용:
```
[Unit]
Description=Automount for SSHFS rasp
After=network-online.target
Wants=network-online.target

[Automount]
Where=/mnt/external/rasp/ssh
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
```

유닛 활성화:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mnt-external-rasp-ssh.automount
sudo systemctl start mnt-external-rasp-ssh.automount
```

## 5. SSH 구성 파일 활용하기

SSH 구성 파일을 사용하여 연결 정보를 중앙화하고 단순화할 수 있습니다:

1. SSH 구성 파일 편집:
```bash
nano ~/.ssh/config
```

2. 호스트 정보 추가:
```
Host rasp
  HostName 192.168.1.x  # 실제 IP 주소
  User nodove
  IdentityFile ~/.ssh/rasp_rsa
  ServerAliveInterval 30
  ServerAliveCountMax 3

Host nano_pi
  HostName 192.168.1.y  # 실제 IP 주소
  User nodove
  IdentityFile ~/.ssh/nano_rsa
  ServerAliveInterval 30
  ServerAliveCountMax 3

Host jcloud
  HostName 192.168.1.z  # 실제 IP 주소
  User nodove
  IdentityFile ~/.ssh/jcloud_rsa
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

3. fstab 단순화:
```
# SSH 구성 파일을 활용한 fstab 예시
sshfs#rasp:/mnt/drive /mnt/external/rasp/ssh fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,allow_other,default_permissions 0 0
```

이렇게 하면 SSH 구성 파일에서 사용자 이름과 키 파일 정보를 자동으로 가져오게 됩니다.

## 결론

위의 단계를 따라 문제의 원인을 파악하고 해결하세요. 가장 효과적인 디버깅 방법은 수동 마운트 테스트를 통해 정확한 오류 메시지를 확인하는 것입니다. 그리고 SSH 연결 자체에 문제가 없는지 확인한 후, systemd 유닛 파일을 직접 생성하는 방식으로 전환하는 것이 도움이 될 수 있습니다.



---

# SSHFS 자동 마운트 문제: autofs는 설정되었지만 실제 마운트는 실패하는 문제

현재 시스템에서 나타나는 상황을 분석해보면, systemd의 automount 기능은 설정되었지만 실제 디렉토리에 접근할 때 SSHFS 마운트가 실패하고 있습니다. "No such device" 오류는 autofs가 트리거되었지만 실제 원격 파일시스템을 마운트하는 데 실패했음을 나타냅니다.

## 문제 원인 분석

출력 결과를 보면:
- 모든 마운트 포인트가 `systemd-1 on ... type autofs`로 표시됨
- 실제 접근 시 "No such device" 오류 발생

이는 다음과 같은 이유로 발생할 수 있습니다:

1. **SSH 연결 실패**: 원격 서버에 연결할 수 없음
2. **호스트명 해석 실패**: 호스트명을, IP 주소로 변환하지 못함
3. **automount 설정과 실제 마운트 사이의 불일치**: systemd가 자동 마운트를 설정했지만 실행 시 문제 발생

## 해결 방법

### 1. systemd 마운트 유닛 상태 확인

먼저 실제 마운트 유닛의 상태를 확인해보세요:

```bash
systemctl status mnt-external-jcloud.mount
journalctl -u mnt-external-jcloud.mount
```

이 로그는 실제 마운트 시도에서 발생한 오류를 보여줄 것입니다.

### 2. SSH 연결 수동 테스트

SSH 연결이 제대로 작동하는지 확인해보세요:

```bash
# jcloud 테스트
ssh -i /home/nodove/.ssh/jcloud_rsa nodove@jcloud "ls -la /workspace"

# 호스트명 해석이 문제라면 IP 주소 직접 사용
ssh -i /home/nodove/.ssh/jcloud_rsa nodove@[JCLOUD_IP] "ls -la /workspace"
```

### 3. 명시적 IP 주소 사용

/etc/hosts 파일에 호스트명과 IP 주소 매핑을 추가하세요:

```bash
sudo nano /etc/hosts

# 다음 라인 추가 (실제 IP 주소 사용)
192.168.x.x  jcloud
192.168.x.x  nano_pi
192.168.x.x  rasp
```

### 4. 수동 마운트 테스트

automount를 무시하고 수동으로 마운트해보세요:

```bash
# 기존 automount 중지 (선택 사항)
sudo systemctl stop mnt-external-jcloud.automount

# 수동 마운트
sudo sshfs -o IdentityFile=/home/nodove/.ssh/jcloud_rsa,allow_other nodove@jcloud:/workspace /mnt/external/jcloud
```

### 5. 네트워크 MTU 및 SSH 설정 조정

일부 네트워크 환경에서는 SSH 연결 매개변수를 조정해야 할 수 있습니다:

```bash
sudo sshfs -o IdentityFile=/home/nodove/.ssh/jcloud_rsa,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3 nodove@jcloud:/workspace /mnt/external/jcloud
```

### 6. IP 주소로 직접 fstab 수정

호스트명 대신 IP 주소를 직접 사용하도록 fstab 파일을 수정하세요:

```
# jcloud
sshfs#nodove@192.168.x.x:/workspace /mnt/external/jcloud fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/jcloud_rsa,allow_other,default_permissions 0 0
```

### 7. StrictHostKeyChecking 옵션 비활성화

SSH 호스트 키 확인에 문제가 있다면:

```bash
sudo sshfs -o IdentityFile=/home/nodove/.ssh/jcloud_rsa,allow_other,StrictHostKeyChecking=no nodove@jcloud:/workspace /mnt/external/jcloud
```

## 가장 효과적인 접근법

모든 문제를 고려한 가장 효과적인 접근법은 다음과 같습니다:

1. `/etc/hosts`에 호스트명 매핑 추가
2. 간단한 SSH 연결 테스트
3. automount 기능 비활성화 및 수동 마운트 테스트
4. 문제가 해결되면 systemd 서비스 다시 구성

이러한 방법으로도 문제가 해결되지 않으면, 원격 서버 쪽에서 SSH 설정이나 방화벽 문제가 있는지 확인해 보세요.


---


# 모든 SSHFS 마운트를 위한 systemd 유닛 파일

## 1. nano_pi 마운트 유닛 파일

### 마운트 유닛 (mnt-external-nano_pi.mount)

```bash
sudo nano /etc/systemd/system/mnt-external-nano_pi.mount
```

내용:
```ini
[Unit]
Description=Mount SSHFS nano_pi
After=network-online.target
Wants=network-online.target

[Mount]
What=nodove@nano_pi:/mnt/share/nodove
Where=/mnt/external/nano_pi
Type=fuse.sshfs
Options=_netdev,IdentityFile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions

[Install]
WantedBy=multi-user.target
```

### 자동 마운트 유닛 (mnt-external-nano_pi.automount)

```bash
sudo nano /etc/systemd/system/mnt-external-nano_pi.automount
```

내용:
```ini
[Unit]
Description=SSHFS automount for nano_pi
After=network-online.target
Wants=network-online.target

[Automount]
Where=/mnt/external/nano_pi
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
```

## 2. rasp/ssh 마운트 유닛 파일

### 마운트 유닛 (mnt-external-rasp-ssh.mount)

```bash
sudo nano /etc/systemd/system/mnt-external-rasp-ssh.mount
```

내용:
```ini
[Unit]
Description=Mount SSHFS rasp
After=network-online.target
Wants=network-online.target

[Mount]
What=nodove@rasp:/mnt/drive
Where=/mnt/external/rasp/ssh
Type=fuse.sshfs
Options=_netdev,IdentityFile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions

[Install]
WantedBy=multi-user.target
```

### 자동 마운트 유닛 (mnt-external-rasp-ssh.automount)

```bash
sudo nano /etc/systemd/system/mnt-external-rasp-ssh.automount
```

내용:
```ini
[Unit]
Description=SSHFS automount for rasp
After=network-online.target
Wants=network-online.target

[Automount]
Where=/mnt/external/rasp/ssh
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
```

## 3. 모든 유닛 활성화

모든 유닛 파일을 작성한 후, 다음 명령으로 활성화합니다:

```bash
# systemd 재로드
sudo systemctl daemon-reload

# automount 유닛 활성화
sudo systemctl enable mnt-external-jcloud.automount
sudo systemctl enable mnt-external-nano_pi.automount
sudo systemctl enable mnt-external-rasp-ssh.automount

# automount 유닛 시작
sudo systemctl start mnt-external-jcloud.automount
sudo systemctl start mnt-external-nano_pi.automount
sudo systemctl start mnt-external-rasp-ssh.automount
```

## 4. fstab에서 기존 항목 주석 처리

systemd 유닛 파일과 충돌을 방지하기 위해 fstab에서 기존 SSHFS 항목을 주석 처리합니다:

```bash
sudo nano /etc/fstab
```

다음과 같이 수정:
```
# SSHFS 항목은 systemd 유닛 파일로 대체됨
# nano_pi
# sshfs#nodove@nano_pi:/mnt/share/nodove /mnt/external/nano_pi fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions 0 0

# rasp
# sshfs#nodove@rasp:/mnt/drive /mnt/external/rasp/ssh fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions 0 0

# jcloud
# sshfs#nodove@jcloud:/workspace /mnt/external/jcloud fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/jcloud_rsa,allow_other,default_permissions 0 0
```

## 5. 호스트 이름 해결 확인

모든 호스트 이름이 제대로 해석되는지 확인하고, 필요하면 `/etc/hosts` 파일에 추가합니다:

```bash
sudo nano /etc/hosts
```

다음과 같이 추가:
```
# SSHFS 호스트
192.168.x.x  nano_pi  # 실제 IP 주소로 변경하세요
192.168.x.x  rasp     # 실제 IP 주소로 변경하세요
192.168.x.x  jcloud   # 실제 IP 주소로 변경하세요
```

## 6. 상태 확인

모든 설정 후 상태를 확인합니다:

```bash
# automount 유닛 상태 확인
systemctl status 'mnt-external-*.automount'

# 디렉토리 접근 시 마운트 트리거 테스트
ls -la /mnt/external/jcloud
ls -la /mnt/external/nano_pi
ls -la /mnt/external/rasp/ssh
```

이 설정을 통해 systemd가 직접 SSHFS 마운트를 관리하므로, fstab의 파싱 오류 문제를 피하고 보다 안정적인 자동 마운트가 가능해집니다.


---


The error you're seeing indicates that your SSHFS mount unit `mnt-external-nano_pi.mount` has failed to mount properly. This is a common issue with SSHFS mounts in systemd, especially during system boot. Let's diagnose and fix this problem.

## Understanding the Error

When a systemd mount unit fails with "result 'exit-code'", it typically means the mount command ran but returned an error[2]. With SSHFS mounts, this can happen for several reasons:

1. Network connectivity issues when trying to establish the SSH connection
2. SSH authentication problems (incorrect key or permissions)
3. Missing dependencies or libraries for SSHFS
4. Timing issues where the mount is attempted before the network is fully available

## Troubleshooting Steps

### 1. Check the detailed error logs

First, check the complete logs to identify the specific error:

```bash
journalctl -u mnt-external-nano_pi.mount
```

Look for specific errors like "Connection reset by peer", "Permission denied", or missing libraries[2][6].

### 2. Verify network connectivity

Make sure you can reach the nano_pi host:

```bash
ping nano_pi
ssh -i /home/nodove/.ssh/nano_rsa nodove@nano_pi
```

### 3. Check your mount unit configuration

Your mount unit might have configuration issues. The most common problems are:

- Incorrect dependencies that don't ensure network is available
- Missing or incorrect SSH identity file path
- Wrong mount options

Here's an improved mount unit configuration:

```ini
[Unit]
Description=Mount SSHFS nano_pi
After=network-online.target
Wants=network-online.target

[Mount]
What=nodove@nano_pi:/mnt/share/nodove
Where=/mnt/external/nano_pi
Type=fuse.sshfs
Options=_netdev,IdentityFile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions,reconnect

[Install]
WantedBy=multi-user.target
```

Note that removing unnecessary dependencies is recommended, as the `_netdev` option already implies network dependency[3].

### 4. Verify SSHFS installation

Make sure SSHFS is properly installed:

```bash
sudo apt install sshfs
```

Sometimes library issues can cause mount failures, as seen in search result #6 where libfuse3.so.3 was missing.

### 5. Check for conflicts with fstab entries

If you've also configured SSHFS mounts in /etc/fstab, there might be conflicts. Consider commenting out any related entries in fstab if you're using systemd mount units[4].

### 6. Manual mount test

Try mounting manually to identify any issues:

```bash
sudo sshfs nodove@nano_pi:/mnt/share/nodove /mnt/external/nano_pi -o IdentityFile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions
```

If this works but the systemd mount doesn't, it's likely a timing or dependency issue with systemd.

## Recommended Solution

Based on the common issues found in the search results, I recommend:

1. Modify your mount unit to ensure proper network dependencies
2. Use the `reconnect` option to handle network disruptions
3. Consider using automount units instead of regular mount units, which can handle timing issues better[3]
4. Check SSH key permissions (should be 600)
5. Add the host entry to /etc/hosts if DNS resolution is causing delays

By implementing these changes, you should be able to resolve the "failed with result 'exit-code'" error with your SSHFS mount.


---


# Troubleshooting "Connection Reset by Peer" Error in SSHFS Mount

Based on the system logs, your SSHFS mount for nano_pi is failing with a "Connection reset by peer" error. This is a common issue with several potential causes.

## Most Likely Causes

1. **SSH Configuration Issues for Root User**
   - When systemd mounts SSHFS, it does so as root, which uses different SSH configuration than your user account[2][5]
   - Root's SSH config might have incorrect permissions or be a symlink (which SSHFS doesn't handle well)[5]

2. **Missing SFTP Subsystem**
   - SSHFS requires the SFTP subsystem to be enabled on the remote server[6]
   - This is separate from regular SSH functionality

3. **User and Permission Issues**
   - The root user doesn't know which SSH key to use for authentication[4]
   - FUSE permissions might be incorrectly configured

## Recommended Solutions

### 1. Verify SSH Configuration for Root

```bash
# Check if root's SSH config has correct permissions
sudo ls -la /root/.ssh/config 2>/dev/null

# If it's a symlink, replace it with a regular file
sudo cp -L /root/.ssh/config /root/.ssh/config.new
sudo mv /root/.ssh/config.new /root/.ssh/config
sudo chmod 600 /root/.ssh/config
```

### 2. Test SFTP Functionality

```bash
# Test if SFTP works (required for SSHFS)
sftp -i /home/nodove/.ssh/nano_rsa nodove@nano_pi
```

If this fails, you need to enable the SFTP subsystem on the nano_pi server[6].

### 3. Add Debugging Options

Add debugging options to get more detailed information about the error:

```bash
sudo systemctl stop mnt-external-nano_pi.mount
sudo systemctl edit mnt-external-nano_pi.mount
```

Add these lines to the mount unit:
```
[Mount]
Options=_netdev,IdentityFile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions,debug,sshfs_debug
```

### 4. Specify UID and GID in Mount Options

Add explicit user ID mapping to help root know which user credentials to use:

```bash
sudo systemctl edit mnt-external-nano_pi.mount
```

Add these options:
```
[Mount]
Options=_netdev,IdentityFile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions,uid=$(id -u nodove),gid=$(id -g nodove)
```

### 5. Check SSH Server Status

If possible, check the SSH server status on nano_pi:

```bash
# On the nano_pi server
sudo systemctl status sshd
# If needed, restart the SSH service
sudo systemctl restart sshd
```

## Additional Considerations

- Ensure your user is in the fuse group if available: `sudo adduser nodove fuse`[2]
- Check if /etc/fuse.conf has "user_allow_other" uncommented[4]
- Consider using direct IP address instead of hostname if there are DNS resolution issues[1]

By systematically applying these solutions, you should be able to resolve the "Connection reset by peer" error and successfully mount your SSHFS share.
