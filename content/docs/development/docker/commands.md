이 문서는 Docker daemon 권한과 container restart policy를 설정할 때 확인할 범위와 예제를 설명합니다.

---

## 적용 범위와 안전 기준

- **범위:** Docker Engine/Desktop 버전, Linux 배포판, rootful·rootless daemon, init system과 현재 restart policy를 확인합니다.
- **권한 전제:** `docker` socket 접근은 일반적으로 host root에 준하는 권한을 줄 수 있습니다. group 추가와 광범위한 `sudo` 허용은 편의 설정이 아니라 보안 경계 변경으로 검토합니다.
- **실패 조건:** 잘못된 `sudoers`, 기존 container policy 덮어쓰기, daemon 미기동, session에 반영되지 않은 group과 의도하지 않은 자동 재시작을 실패로 봅니다.
- **완료 기준:** 최소 권한을 확인하고 새 session에서 대상 명령만 실행되며 daemon·host reboot 뒤 기대한 container만 재시작되는지 검증해야 완료입니다.

---

# Docker 설치 후 사용자 권한 및 컨테이너 자동 재시작 설정

## 1. Docker 권한 설정: 사용자에게 Docker 그룹 권한 부여
rootful Docker에서는 일반적으로 root 또는 Docker socket 접근 권한이 있는 사용자만 daemon을 제어합니다. rootless Docker와 Docker Desktop은 권한 모델이 다릅니다. Docker를 비관리자 사용자도 실행할 수 있도록 하려면 해당 사용자를 `docker` 그룹에 추가해야 합니다.

### 명령어:
```bash
sudo usermod -aG docker $USER
```

### 상세 설명:
1. **`usermod`**:
   - 사용자 계정을 수정하는 명령어입니다.
   - `-aG`: 사용자를 특정 그룹에 추가합니다.
   - `docker`: Docker 실행 권한을 가진 그룹입니다.
   - `$USER`: 현재 사용 중인 사용자 계정을 나타냅니다.

2. 명령 실행 후 변경 사항을 적용하려면 **로그아웃 후 다시 로그인**해야 합니다.

### 확인 방법:
```bash
docker ps
```
위 명령어를 실행했을 때 에러 없이 결과가 나오면 정상적으로 설정된 것입니다.

---

## 2. 컨테이너 자동 재시작 설정
Docker 컨테이너가 종료되더라도 서버 재부팅 시 자동으로 컨테이너가 다시 시작되도록 설정하려면 `--restart` 옵션을 사용합니다.

### 명령어:
```bash
docker run -d --restart always <container_name>
```

### 상세 설명:
- **`-d`**: 컨테이너를 백그라운드에서 실행합니다.
- **`--restart always`**: daemon이 관리하는 restart policy입니다. 수동 stop, daemon 상태와 Docker 버전의 policy semantics를 포함해 reboot·failure 시나리오에서 기대 동작을 확인합니다.
  - 예: 서버 재부팅 또는 컨테이너 오류 종료 시 자동으로 다시 시작됩니다.
- `<container_name>`: 실행하려는 컨테이너의 이름입니다.

### 예제:
```bash
docker run -d --restart always nginx
```
위 명령어는 `nginx` 컨테이너를 백그라운드에서 실행하고, 자동 재시작을 활성화합니다.

---

## 3. `sudo` 권한 설정 (`visudo` 명령어 사용)
특정 사용자에게 `sudo` 권한을 부여하거나 수정하려면 `visudo` 명령어를 사용합니다.

### 명령어:
```bash
sudo visudo
```

### 상세 설명:
- **`visudo`**:
  - `/etc/sudoers` 파일을 안전하게 수정하기 위한 명령어입니다.
  - 잘못된 구문으로 인해 `sudo` 권한이 손상되는 것을 방지합니다.
- 이 명령어는 관리자로 실행해야 하며, 기본적으로 텍스트 편집기가 열립니다.

### 설정 방법:
1. 명령어 실행:
   ```bash
   sudo visudo
   ```

2. 텍스트 편집기가 열리면 사용자 권한을 추가합니다. 예를 들어, `newuser`라는 사용자에게 `sudo` 권한을 부여하려면:
   ```plaintext
   newuser ALL=(ALL:ALL) ALL
   ```

3. 파일을 저장하고 종료합니다.

### 예제:
- 사용자 `john`에게 광범위한 `sudo` 권한을 부여하는 예시입니다. 운영 환경에서는 필요한 명령만 allowlist하고 별도 계정·감사 정책을 우선 검토합니다:
  ```plaintext
  john ALL=(ALL:ALL) ALL
  ```

- 특정 명령만 허용하려면:
  ```plaintext
  john ALL=(ALL:ALL) NOPASSWD: /usr/bin/systemctl restart docker
  ```
  위 설정은 사용자 `john`이 비밀번호 입력 없이 Docker를 재시작할 수 있도록 설정합니다.

---

## 주의 사항
- **`sudo visudo`** 명령을 통해 수정할 때는 반드시 신중히 작업해야 합니다. 잘못된 구문이 있으면 사용자 권한이 손상될 수 있습니다.
- Docker 권한을 부여한 후에는 로그아웃/로그인 또는 `su - $USER` 명령을 통해 새로운 세션을 시작해야 권한이 적용됩니다.

--- 

위의 내용을 참고하여 Docker 및 사용자 권한 설정을 효율적으로 관리하세요!