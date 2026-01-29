# Docker 설치 가이드 (Docker Installation Guide)

이 가이드는 **Linux (다양한 배포판)**, **Windows**, **macOS** 환경에서 Docker를 설치하고 설정하는 상세한 방법을 다룹니다.

---

## 1. Linux 설치 가이드

Linux 환경에서는 배포판별 패키지 관리자를 사용하는 것이 가장 권장됩니다. 설치 전 기존의 충돌 가능한 오래된 버전(`docker`, `docker.io`, `docker-engine`)을 제거하는 것이 좋습니다.

### 사전 준비: 오래된 버전 제거 (공통)
```bash
# Ubuntu/Debian
sudo apt-get remove docker docker-engine docker.io containerd runc

# CentOS/RHEL/Rocky
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```

### A. 자동 설치 스크립트 (가장 간편한 방법)
대부분의 리눅스 배포판(Ubuntu, Debian, CentOS, Fedora, Raspbian 등)에서 작동하며, 테스팅이나 개발 환경 구성 시 가장 빠릅니다.

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

### B. 배포판별 수동 설치

#### 1. Ubuntu / Debian 계열 (`apt`)

1.  **필수 패키지 설치 및 GPG 키 추가**
    ```bash
    sudo apt-get update
    sudo apt-get install ca-certificates curl gnupg

    # GPG 키 저장 디렉토리 생성
    sudo install -m 0755 -d /etc/apt/keyrings
    # Docker 공식 GPG 키 다운로드
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    ```

2.  **리포지토리 설정**
    ```bash
    # Ubuntu의 경우
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Debian의 경우 위 URL의 ubuntu를 debian으로 변경
    ```

3.  **Docker 엔진 설치**
    ```bash
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```

#### 2. CentOS / RHEL / Rocky Linux / Fedora (`yum`/`dnf`)

1.  **리포지토리 설정**
    ```bash
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    ```

2.  **Docker 엔진 설치**
    ```bash
    sudo yum install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```

3.  **서비스 시작**
    ```bash
    sudo systemctl start docker
    sudo systemctl enable docker
    ```

#### 3. Arch Linux / Manjaro (`pacman`)
Arch Linux는 공식 리포지토리에서 Docker를 지원합니다.

```bash
sudo pacman -Syu
sudo pacman -S docker docker-compose
```

---

### C. Linux 설치 후 필수 설정 (Root 권한 없이 실행하기)
기본적으로 Docker 명령어는 `sudo`가 필요합니다. 매번 입력하지 않으려면 사용자를 `docker` 그룹에 추가해야 합니다.

```bash
# 1. docker 그룹 생성 (이미 존재할 수 있음)
sudo groupadd docker

# 2. 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 3. 변경 사항 적용 (로그아웃 후 재로그인하거나 아래 명령어 실행)
newgrp docker
```

---

## 2. Windows 설치 가이드 (Docker Desktop)

Windows에서는 **WSL 2 (Windows Subsystem for Linux 2)** 백엔드를 사용하는 것이 성능상 가장 유리합니다.

### 시스템 요구사항
*   **Windows 10** 버전 2004 이상 (Build 19041 이상) 또는 **Windows 11**.
*   BIOS에서 **가상화(Virtualization)** 기능 활성화 필요.

### 설치 단계
1.  **WSL 2 활성화**: PowerShell(관리자 권한)에서 아래 명령어를 실행하여 WSL을 설치 및 업데이트합니다.
    ```powershell
    wsl --install
    ```
    *안내: 이미 설치되어 있다면 `wsl --update`로 최신 커널로 업데이트하세요.*

2.  **Docker Desktop 다운로드**: [Docker Hub Windows 다운로드](https://docs.docker.com/desktop/install/windows-install/) 페이지에서 설치 파일을 다운로드합니다.

3.  **설치 및 실행**:
    *   설치 마법사에서 "Use WSL 2 instead of Hyper-V" 옵션이 체크되어 있는지 확인합니다(권장).
    *   설치 완료 후 재부팅이 필요할 수 있습니다.
    *   Docker Desktop을 실행하고 라이선스 동의를 진행합니다.

4.  **설정 (Optional)**:
    *   Docker Desktop 설정 > Resources > WSL Integration 에서 Docker를 사용할 WSL 배포판(예: Ubuntu)을 스위치를 켜서 연동합니다. 이렇게 하면 WSL 터미널 내부에서도 `docker` 명령어를 바로 사용할 수 있습니다.

---

## 3. macOS 설치 가이드 (Docker Desktop)

### 시스템 요구사항
*   macOS 버전 12 (Monterey) 이상 권장.
*   최소 4GB RAM.

### 설치 단계
1.  **Docker Desktop 다운로드**: [Docker Hub Mac 다운로드](https://docs.docker.com/desktop/install/mac-install/) 페이지로 이동합니다.
    *   **Mac with Apple silicon**: M1, M2, M3 등 Apple 칩셋 사용자.
    *   **Mac with Intel chip**: 구형 Intel 맥 사용자.
    *   *본인의 칩셋에 맞는 버전을 선택하여 다운로드하세요.*

2.  **설치**:
    *   다운로드한 `.dmg` 파일을 엽니다.
    *   Docker 아이콘을 Applications 폴더로 드래그합니다.

3.  **실행**:
    *   Applications 폴더에서 Docker를 실행합니다.
    *   초기 설정 시 권한 부여(네트워킹 등)가 필요할 수 있습니다.

4.  **터미널 확인**:
    *   터미널 앱을 열고 `docker --version`을 입력하여 설치를 확인합니다.

---

## 4. 설치 검증 (Hello World)

설치가 완료되었다면 터미널(또는 CMD/PowerShell)을 열고 다음 명령어를 실행하여 정상 작동을 확인합니다.

```bash
docker run --rm hello-world
```

**성공 시 출력 예시:**
```text
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

## 5. Docker Compose 사용 참조
최신 Docker를 설치했다면 `docker-compose` (하이픈 있음) 대신 `docker compose` (공백, V2 플러그인) 명령어를 사용하는 것이 표준입니다.

```bash
docker compose version
```

문서 작성일: 2026-01-29
