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


# SSHFS 권한 문제: 동일 유저명에도 불구하고 발생하는 접근 제한 원인

SSHFS로 원격 서버의 nodove 유저 디렉토리(권한 700)에 접근할 수 없는 문제는 여러 가지 원인이 있을 수 있습니다.

## 주요 원인

### 1. UID/GID 불일치 문제

가장 흔한 원인은 로컬과 원격 시스템에서 동일한 사용자 이름(nodove)을 사용하더라도 실제 내부 사용자 ID(UID)와 그룹 ID(GID)가 다를 수 있기 때문입니다[1].

```bash
# 로컬과 원격 시스템에서 각각 실행하여 ID 확인
id nodove
```

예를 들어 로컬에서 nodove의 UID가 1000이고, 원격에서는 1001이면 권한 문제가 발생합니다[1].

### 2. SSHFS 마운트 옵션 문제

`default_permissions` 옵션을 사용할 경우, 권한 제어가 FUSE가 아닌 커널에 의해 처리됩니다. 이 경우 원격 사용자의 UID/GID가 로컬 사용자와 매핑되지 않습니다[1].

권한 문제는 다음 마운트 옵션을 사용하여 해결할 수 있습니다:
```bash
sshfs -o idmap=user nodove@원격서버:/경로 /마운트지점
```

### 3. sudo 사용 관련 문제

SSHFS는 사용자 공간 프로세스이므로 `sudo`로 실행할 필요가 없습니다. `sudo`로 실행하면 SSH 키 인증 시 `/home/nodove/.ssh`가 아닌 `/root/.ssh`에서 키를 찾게 됩니다[3].

또한 `sudo`로 마운트된 디렉토리에 접근하려면 `allow_other` 옵션이 필요합니다:
```bash
sudo sshfs -o allow_other nodove@원격서버:/경로 /마운트지점
```

### 4. 부모 디렉토리 권한 문제

마운트하려는 디렉토리의 상위 디렉토리들도 적절한 접근 권한이 있어야 합니다. 경로 중간에 권한이 700인 디렉토리가 있으면, 그 안의 디렉토리에 권한이 777이더라도 접근할 수 없습니다[2].

## 해결 방법

1. **UID/GID 확인 및 맞추기**:
   ```bash
   # 로컬 시스템의 UID/GID 확인
   id nodove
   
   # 원격 시스템의 UID/GID 확인
   ssh nodove@원격서버 "id"
   ```
   
   불일치하는 경우, 원격 서버의 UID를 로컬과 일치시키는 것이 가장 확실한 해결책입니다[1].

2. **적절한 마운트 옵션 사용**:
   ```bash
   sshfs nodove@원격서버:/경로 /마운트지점 -o idmap=user,uid=$(id -u),gid=$(id -g),allow_other
   ```

3. **fuse.conf 설정 확인**:
   ```bash
   # /etc/fuse.conf 파일에서 user_allow_other 옵션이 활성화되어 있는지 확인
   sudo nano /etc/fuse.conf
   # user_allow_other 주석 해제
   ```


### 사용자 권한 설정 방식
---


# systemd Mount 유닛: 원격 서버 접근 권한 최적화

다음은 원격 서버의 파일들이 로컬 로그인 사용자 권한으로 실행될 수 있도록 최적화된 systemd 마운트 유닛 파일입니다:

```ini
[Unit]
Description=Mount SSHFS rasp
After=network-online.target
Wants=network-online.target
# 네트워크 의존성 확실히 설정

[Mount]
What=nodove@rasp:/mnt/drive
Where=/mnt/external/rasp/ssh
Type=fuse.sshfs
Options=_netdev,IdentityFile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions,idmap=user,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3,uid=1000,gid=1000,follow_symlinks

[Install]
WantedBy=multi-user.target
```

## 추가된 주요 옵션 설명

1. **idmap=user**
   - 원격 사용자의 ID를 로컬 사용자의 ID에 매핑합니다
   - 이는 원격과 로컬의 사용자 이름이 같아도 UID가 다를 경우 발생하는 권한 문제를 해결합니다[2][3]

2. **uid=1000,gid=1000**
   - 로컬 nodove 사용자의 실제 UID/GID 값으로 변경해야 합니다
   - 특정 로컬 사용자 권한으로 파일 액세스를 강제합니다
   - `id nodove` 명령으로 확인한 실제 값을 사용하세요[2]

3. **ServerAliveInterval=15,ServerAliveCountMax=3**
   - 15초마다 keepalive 패킷을 보내 연결이 끊어지지 않도록 유지합니다
   - 서버가 응답하지 않으면 3번까지 재시도합니다[4]

4. **reconnect**
   - 연결이 끊어지면 자동으로 재연결을 시도합니다
   - 네트워크 불안정성에 대비한 필수 옵션입니다[4]

5. **follow_symlinks**
   - 원격 서버의 심볼릭 링크를 따라갑니다[4]
   - 심볼릭 링크가 많은 환경에서 유용합니다

## 알아두면 좋은 사항

- `allow_other` 옵션을 사용하려면 `/etc/fuse.conf`에서 `user_allow_other`가 활성화되어 있어야 합니다[5]
- UID/GID 불일치 문제가 발생하면 원격 서버와 로컬 서버의 사용자 ID를 동일하게 맞추는 것이 가장 확실한 해결책입니다[2][3]
- systemd 마운트는 루트 권한으로 실행되므로, 사용자 전환 시 추가 설정이 필요할 수 있습니다
