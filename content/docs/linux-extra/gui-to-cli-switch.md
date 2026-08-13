# 리눅스 GUI에서 CLI로 전환하기: Top-Down 접근 및 배포판별 가이드

이 문서는 리눅스 운영체제에서 **GUI(Graphical User Interface)** 환경을 **CLI(Command Line Interface)**로 전환하는 과정을 설명합니다. 추상적인 사용자 레벨에서 하드웨어 레벨로 내려가는 **Top-Down** 방식으로 작동 원리를 이해하고, 주요 배포판(Distro)별 구체적인 적용 방법을 다룹니다.

## 전환 종류와 복구 경계

- `Ctrl+Alt+Fn` 가상 콘솔 전환, display manager 일시 중지, 기본 systemd target 변경, GUI package 제거는 영향과 복구가 다른 작업입니다.
- 이 문서의 지속 설정은 systemd 기반 배포판을 대상으로 합니다. init system, display manager, 원격 세션과 Wayland/X11 구성을 먼저 확인합니다.
- 원격 SSH 또는 물리 콘솔과 원래 target 복구 명령을 확보한 뒤 실행하며, 그래픽 세션의 저장되지 않은 작업이 종료될 수 있음을 알립니다.
- 완료 기준은 재부팅 후 의도한 target, TTY/SSH 로그인, 필수 서비스와 원래 GUI target으로의 복귀가 모두 동작하는 것입니다.

---

## 1. Top-Down 개요: 리눅스의 계층 구조

사용자가 화면에서 보는 그래픽 환경이 사라지고 검은 터미널 화면만 남는 과정은 단순한 '화면 전환'이 아니라, OS 내부의 **실행 레벨(Target)**이 변경되는 과정입니다.

GUI에서 CLI로 전환될 때 일어나는 일을 위에서 아래로 내려가며 살펴보겠습니다.

1.  **사용자 레벨:** 데스크탑 환경(GNOME, KDE 등)이 종료됩니다.
2.  **서비스 레벨 (Systemd):** 그래픽 서비스를 관리하는 'Target'이 비활성화됩니다.
3.  **디스플레이 레벨:** 디스플레이 매니저(GDM, LightDM 등)와 X Server(또는 Wayland)가 프로세스에서 제거됩니다.
4.  **커널·장치 레벨:** 가상 콘솔, framebuffer/DRM과 display server의 관계는 드라이버·세션 구성에 따라 달라지며 단순한 하드웨어 "텍스트 모드" 전환으로 일반화하지 않습니다.

---

## 2. 상세 작동 원리 (Architecture Deep Dive)

이 전환의 핵심은 리눅스의 초기화 시스템인 **Systemd**와 **Target**의 개념을 이해하는 것입니다.

### A. Systemd와 Target (서비스 관리 계층)

과거 리눅스(SysVinit)는 'Runlevel(런레벨)'이라는 숫자로 상태를 정의했습니다(예: Runlevel 3은 CLI, 5는 GUI). 현대 리눅스는 **Systemd Target**이라는 유닛을 사용합니다.

*   **GUI 모드 (`graphical.target`):** 시스템이 부팅될 때 네트워킹, 파일 시스템, 그리고 **디스플레이 매니저**까지 모두 실행하도록 지시합니다.
*   **CLI 모드 (`multi-user.target`):** 다중 사용자 로그인과 네트워킹은 지원하지만, **그래픽 관련 서비스는 제외**된 상태입니다.

> **작동 원리:** `graphical.target`은 `multi-user.target`의 상위 집합입니다. 즉, GUI에서 CLI로 간다는 것은 가장 상위의 그래픽 레이어만 "걷어내는" 작업입니다.

### B. 디스플레이 매니저와 세션 (애플리케이션 계층)

GUI가 실행 중일 때는 백그라운드에서 **Display Manager**(예: `gdm3`, `sddm`, `lightdm`)라는 서비스가 돌고 있습니다. 이 서비스가 그래픽 서버(X11 또는 Wayland)를 구동시켜 화면에 그림을 그립니다.

**전환 시 발생 동작:**
1.  OS가 `multi-user.target`으로 전환 명령을 받습니다.
2.  `graphical.target`에 의존성이 있는 디스플레이 매니저 서비스에 종료 시그널(`SIGTERM`/`SIGKILL`)을 보냅니다.
3.  디스플레이 매니저가 종료되면서 자식 프로세스인 데스크탑 환경(창 관리자, 패널 등)이 연쇄적으로 종료됩니다.

### C. TTY (Virtual Console) (커널/하드웨어 계층)

리눅스 커널은 **TTY(Teletypewriter)**라는 가상 콘솔을 제공합니다.

*   **GUI 상태:** 보통 TTY1이나 TTY7번 채널이 그래픽 모드로 점유되어 비디오 카드를 제어합니다.
*   **CLI 전환:** 그래픽 프로세스가 종료되면 커널은 비디오 카드의 모드를 그래픽 모드에서 텍스트 모드로 리셋하고, `getty` 프로세스를 통해 텍스트 로그인 프롬프트를 띄웁니다.

---

## 3. 배포판(Distro)별 상세 가이드

많은 현재 배포판이 **systemd**를 사용하지만 다른 init system도 있습니다. systemd 환경에서도 display manager unit, 세션과 package 관리 방식이 다르므로 실제 unit을 확인합니다.

### 공통 명령어 (Systemd 기반)

다음은 일반적인 systemd 명령 형태이며 배포판의 unit 관계와 현재 세션에서 결과를 확인해야 합니다.

*   **즉시 전환 (현재 세션만):**
    ```bash
    sudo systemctl isolate multi-user.target
    ```
*   **영구 전환 (부팅 시 CLI 고정):**
    ```bash
    sudo systemctl set-default multi-user.target
    ```
*   **복구 (GUI로 되돌리기):**
    ```bash
    sudo systemctl set-default graphical.target
    ```

---

### A. Ubuntu / Debian 계열 (Mint, Kali, Pop!_OS)

이 계열은 주로 **GDM3** (GNOME) 또는 **LightDM** (XFCE/MATE)을 사용합니다.

*   **디스플레이 매니저 확인:**
    ```bash
    cat /etc/X11/default-display-manager
    # 결과 예: /usr/sbin/gdm3 또는 /usr/sbin/lightdm
    ```

*   **특이 사항:**
    *   Ubuntu Desktop은 기본적으로 `gdm3`를 사용합니다.
    *   GUI가 아예 필요 없어 삭제하고 싶다면(서버화):
        ```bash
        sudo apt purge ubuntu-desktop gdm3 && sudo apt autoremove
        ```
    *   다시 설치하려면:
        ```bash
        sudo apt install ubuntu-desktop
        ```

### B. RHEL / CentOS / Rocky / Fedora 계열

레드햇 계열은 엔터프라이즈 환경이 많아 GUI/CLI 전환이 빈번합니다. 주로 **GDM**을 사용합니다.

*   **현재 Target 확인:**
    ```bash
    systemctl get-default
    ```

*   **패키지 그룹 관리:**
    이 계열은 `dnf` 또는 `yum`의 그룹 기능을 이용해 GUI 환경 전체를 쉽게 관리할 수 있습니다.
    *   GUI 패키지 그룹 설치 (Server with GUI):
        ```bash
        sudo dnf groupinstall "Server with GUI"
        ```
    *   GUI 패키지 삭제 (최소 설치로 변경):
        *   *주의: 의존성 문제로 시스템 중요 파일이 삭제될 수 있으니 `isolate` 방식을 권장합니다.*

### C. Arch Linux / Manjaro

사용자가 직접 설치한 데스크탑 환경(DE)에 따라 디스플레이 매니저가 제각각입니다.

*   **주요 디스플레이 매니저:**
    *   **GDM:** GNOME 사용자
    *   **SDDM:** KDE Plasma 사용자
    *   **LightDM:** XFCE, I3 등 경량 환경

*   **서비스 제어:**
    Arch는 타겟 변경 외에도 디스플레이 매니저 서비스를 직접 끄는 방식을 선호하기도 합니다.
    ```bash
    # 부팅 시 GUI 자동 실행 끄기
    sudo systemctl disable gdm  # 사용 중인 DM 이름(sddm, lightdm 등) 입력
    
    # 켜기
    sudo systemctl enable gdm
    ```

### 4. 요약 비교표

| 구분 | GUI (`graphical.target`) | CLI (`multi-user.target`) |
| :--- | :--- | :--- |
| **주요 프로세스** | Xorg/Wayland, Gnome-shell, DM | Bash/Sh, SSHD, Getty |
| **메모리 점유** | 높음 (수백 MB ~ 수 GB) | 매우 낮음 (수십 MB) |
| **비디오 모드** | 그래픽 모드 (픽셀 제어) | 텍스트 모드 (TTY) |
| **용도** | 일반 데스크탑 작업, 웹 브라우징 | 서버 운영, 시스템 복구, 고성능 연산 |

---

### [참고] 방법 1: TTY 스위칭 (일시적 전환)

명령어 없이 키보드만으로 화면을 전환하는 방법입니다. GUI 프로세스는 백그라운드에서 계속 실행됩니다.

*   **CLI로 이동:** `Ctrl` + `Alt` + `F3` (또는 F4 ~ F6)
*   **GUI로 복귀:** `Ctrl` + `Alt` + `F1` (또는 F2, F7 - 배포판마다 다름)
    *   *Ubuntu:* 주로 F1 또는 F2가 GUI 세션입니다.
    *   *RHEL/CentOS:* 주로 F1이 GUI입니다.
