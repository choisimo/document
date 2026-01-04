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

이러한 방법으로도 문제가 해결되지 않는다면, 원격 서버에서의 디렉토리 소유권과 권한을 다시 확인하는 것이 좋습니다.
