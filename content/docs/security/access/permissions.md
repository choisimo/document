# SSHFS 권한 문제: 동일 유저명에도 불구하고 발생하는 접근 제한 원인

SSHFS로 원격 서버의 nodove 유저 디렉토리(권한 700)에 접근할 수 없는 문제는 여러 가지 원인이 있을 수 있습니다.

## 적용 범위와 권한 검증 기준

- **범위:** SSHFS·libfuse·kernel·SSH client/server 버전, mount 실행 사용자와 namespace, local/remote UID·GID·supplementary groups, remote filesystem ACL과 mount options를 기록합니다.
- **권한 전제:** remote SSH authorization, SSHFS의 attribute mapping, `default_permissions`의 local kernel check, parent directory execute 권한과 application access를 분리해 확인합니다.
- **사실과 추론:** 양쪽 `id`, path component 권한·ACL, mount table, SSHFS debug와 실제 open error는 근거이고, 동일 username이나 한 번의 permission denied만으로 UID mismatch를 원인으로 확정하지 않습니다.
- **실패·완료:** 다른 사용자 노출, 예상 밖 root credential, read/write 차이, stale mount, reconnect와 unmount 실패를 시험합니다. 최소 권한으로 필요한 operation만 성공하고 금지 사용자는 거부되며 reboot/reconnect 뒤에도 mapping이 유지될 때 완료입니다.

---

## 주요 원인

### 1. UID/GID 불일치 문제

UID/GID 또는 group mapping 차이는 가능한 원인 중 하나입니다. 동일 username은 숫자 ID·supplementary group·ACL의 일치를 보장하지 않으므로 양쪽 상태와 mount option을 함께 확인합니다[1].

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

일반적인 per-user mount는 해당 사용자로 실행할 수 있습니다. system-wide mount나 service에는 별도 권한이 필요할 수 있으며, `sudo`로 실행하면 기본 credential·HOME·mount owner가 root context로 바뀔 수 있습니다. 실제 `IdentityFile`, environment와 service 설정을 확인합니다[3].

또한 `sudo`로 마운트된 디렉토리에 접근하려면 `allow_other` 옵션이 필요합니다:
```bash
sudo sshfs -o allow_other nodove@원격서버:/경로 /마운트지점
```

### 4. 부모 디렉토리 권한 문제

마운트하려는 디렉토리의 상위 디렉토리들도 적절한 접근 권한이 있어야 합니다. 호출 사용자가 소유자도 아니고 ACL·capability 등 별도 허용도 없다면, 경로 중간 directory에 execute 권한이 없어 하위 directory mode와 무관하게 traversal이 거부됩니다[2].

## 해결 방법

1. **UID/GID 확인 및 맞추기**:
   ```bash
   # 로컬 시스템의 UID/GID 확인
   id nodove
   
   # 원격 시스템의 UID/GID 확인
   ssh nodove@원격서버 "id"
   ```
   
   UID 변경은 file ownership과 다른 service에 광범위한 영향을 줄 수 있습니다. SSHFS mapping option, local access policy, group·ACL 또는 관리된 identity 정렬 중 영향이 가장 작은 방법을 선택하고 기존 file ownership을 검증합니다[1].

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
