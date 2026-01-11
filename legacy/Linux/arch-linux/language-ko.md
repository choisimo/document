## Arch Linux 한글 깨짐 및 한영 전환 문제 해결 가이드

Arch Linux에서 한글이 깨져 보이거나 한영 전환이 되지 않는 문제는 주로 로캘(Locale) 설정, 글꼴(Font) 미설치, 그리고 입력기(Input Method Editor) 설정이 올바르지 않아 발생합니다. 아래의 단계를 차례대로 따라 하시면 문제를 해결할 수 있습니다.

### 1. 한글 로캘(Locale) 설정

시스템 전반에 한글을 올바르게 표시하기 위해 한국어 로캘을 생성하고 설정해야 합니다.

**1.1. 로캘 생성:**

`/etc/locale.gen` 파일을 열어 다음 줄의 주석을 해제합니다.

```bash
sudo nano /etc/locale.gen
```

파일 내용에서 아래 두 줄을 찾아 맨 앞의 `#`을 제거합니다.

```
#ko_KR.UTF-8 UTF-8
#en_US.UTF-8 UTF-8
```

수정 후:

```
ko_KR.UTF-8 UTF-8
en_US.UTF-8 UTF-8
```

**1.2. 로캘 생성 명령어 실행:**

수정한 파일을 저장하고 다음 명령어를 실행하여 로캘을 생성합니다.

```bash
sudo locale-gen
```

**1.3. 시스템 로캘 설정:**

`/etc/locale.conf` 파일을 생성하고 시스템의 기본 로캘을 설정합니다. 터미널 등 대부분의 환경에서 영어를 기본으로 사용하고 싶다면 `en_US.UTF-8`을, 한글을 기본으로 하고 싶다면 `ko_KR.UTF-8`을 설정합니다. 일반적으로 영어로 설정하는 것을 권장합니다.

```bash
sudo nano /etc/locale.conf
```

파일 내용에 다음을 추가합니다.

```
LANG=en_US.UTF-8
```

재부팅 후 `locale` 명령어를 터미널에 입력했을 때 `LANG`이 설정한 값으로 나오면 정상적으로 적용된 것입니다.

### 2. 한글 글꼴(Font) 설치

한글이 깨지는 가장 큰 이유는 한글을 지원하는 글꼴이 설치되지 않았기 때문입니다. `noto-fonts-cjk`는 가장 일반적으로 사용되는 한중일 글꼴입니다.

```bash
sudo pacman -S noto-fonts-cjk
```

설치 후 시스템을 재부팅하거나 데스크톱 환경을 재시작하면 글꼴이 적용되어 한글이 정상적으로 표시됩니다.

### 3. 한글 입력기(Input Method Editor, IME) 설치 및 설정

한영 전환을 위해서는 한글 입력기를 설치하고 설정해야 합니다. 대표적인 입력기로는 **IBus**와 **Fcitx5**가 있습니다. 둘 중 하나를 선택하여 설치합니다.

---

#### 방법 A: IBus (ibus-hangul) 사용

IBus는 GNOME 데스크톱 환경의 기본 입력기입니다.

**3.A.1. IBus 및 한글 엔진 설치:**

```bash
sudo pacman -S ibus ibus-hangul
```

**3.A.2. 환경 변수 설정:**

사용하는 셸의 설정 파일 (`~/.bashrc`, `~/.zshrc` 등) 또는 시스템 전역 설정 파일 (`/etc/environment`)에 다음 내용을 추가합니다.

```bash
sudo nano /etc/environment
```

파일에 아래 내용을 추가합니다.

```
GTK_IM_MODULE=ibus
QT_IM_MODULE=ibus
XMODIFIERS=@im=ibus
```

**3.A.3. IBus 데몬 실행 및 설정:**

시스템을 재부팅하거나 다음 명령어로 IBus 데몬을 실행합니다.

```bash
ibus-daemon -drx
```

그리고 `ibus-setup` 명령어를 실행하여 IBus 설정 창을 엽니다.

```bash
ibus-setup
```

* **Input Method** 탭으로 이동합니다.
* **Add** 버튼을 클릭합니다.
* `Korean`을 찾아 선택하고, `Hangul`을 추가합니다.
* **Super + Space** (윈도우 키 + 스페이스) 키로 한영 전환을 할 수 있습니다. 전환 키는 설정에서 변경할 수 있습니다.

---

#### 방법 B: Fcitx5 (fcitx5-hangul) 사용

Fcitx5는 IBus보다 가볍고 빠르다는 평을 받으며 KDE Plasma 환경과 잘 통합됩니다.

**3.B.1. Fcitx5 및 한글 엔진 설치:**

```bash
sudo pacman -S fcitx5 fcitx5-hangul fcitx5-configtool fcitx5-gtk fcitx5-qt
```

**3.B.2. 환경 변수 설정:**

IBus와 마찬가지로 `/etc/environment` 파일에 다음 내용을 추가합니다.

```bash
sudo nano /etc/environment
```

```
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

**3.B.3. Fcitx5 데몬 자동 시작 설정 및 실행:**

데스크톱 환경의 자동 시작 설정에 `fcitx5`를 추가하거나, 터미널에서 직접 실행하여 테스트할 수 있습니다.

```bash
fcitx5 &
```

**3.B.4. Fcitx5 설정:**

`fcitx5-configtool`을 실행하여 설정 창을 엽니다.

```bash
fcitx5-configtool
```

* **Input Method** 탭에서 `Hangul`이 목록에 있는지 확인합니다. 만약 없다면, 왼쪽 하단의 `+` 버튼을 눌러 `Hangul`을 추가합니다.
* **Global Options** 탭에서 한영 전환 키를 설정할 수 있습니다. 기본적으로 `Ctrl + Space` 또는 `Shift` (오른쪽 Shift) 키로 설정되어 있는 경우가 많습니다.

### 4. 재부팅

위의 모든 설정이 완료되면 시스템을 재부팅하여 변경 사항을 완전히 적용하는 것이 좋습니다. 재부팅 후에는 한글이 깨지지 않고, 설정한 단축키로 한영 전환이 원활하게 이루어져야 합니다.

만약 특정 프로그램(예: 웹 브라우저, 터미널)에서만 문제가 발생한다면 해당 프로그램의 글꼴 설정을 확인해 보시기 바랍니다.
## Arch Linux에서 한글 깨짐 및 한영 전환 문제 해결 가이드

Arch Linux 사용자에게 흔히 발생하는 한글 깨짐(글자가 사각형이나 이상한 문자로 보이는 현상)과 한영 전환 문제를 해결하기 위한 종합적인 가이드를 제공합니다. 이 문제들은 주로 로캘(Locale) 설정, 한글 폰트 부재, 그리고 입력기(Input Method Editor) 설정 미흡으로 인해 발생합니다.

### 1단계: 시스템 로캘(Locale) 설정

시스템의 언어 및 문자 인코딩 설정을 올바르게 구성하는 것은 한글 표시의 가장 기본적인 단계입니다.

먼저, `/etc/locale.gen` 파일을 열어 다음 두 줄의 주석을 제거합니다.

```bash
sudo nano /etc/locale.gen
```

파일 내용에서 아래의 행을 찾아 앞의 `#`을 제거하십시오.

```
en_US.UTF-8 UTF-8
ko_KR.UTF-8 UTF-8
```

파일을 저장한 후, 다음 명령어를 실행하여 로캘을 생성합니다.

```bash
sudo locale-gen
```

이제 시스템의 기본 로캘을 설정합니다. `/etc/locale.conf` 파일을 생성하거나 열어서 다음과 같이 작성합니다.

```bash
sudo nano /etc/locale.conf
```

```
LANG=en_US.UTF-8
```

시스템 전반에 걸쳐 영어 인터페이스를 유지하면서 한글을 문제없이 표시하고 입력하기 위해 `en_US.UTF-8`을 기본으로 설정하는 것을 권장합니다. 재부팅 후 설정이 적용됩니다.

### 2단계: 한글 폰트 설치

시스템에 한글 폰트가 설치되어 있지 않으면 한글이 깨져 보입니다. 가장 일반적으로 사용되는 `noto-fonts-cjk` 패키지를 설치하여 이 문제를 해결할 수 있습니다. 이 패키지에는 한국어, 중국어, 일본어 문자가 포함되어 있습니다.

```bash
sudo pacman -S noto-fonts-cjk
```

폰트 설치 후, 시스템의 폰트 캐시를 업데이트하는 것이 좋습니다.

```bash
fc-cache -fv
```

### 3단계: 입력기(Input Method Editor, IME) 설치 및 설정

한글을 입력하고 한영 키를 통해 영어와 한국어 사이를 전환하려면 입력기 설치가 필수적입니다. Arch Linux에서는 주로 `IBus`와 `Fcitx5`가 사용됩니다. 사용 중인 데스크톱 환경에 따라 권장되는 입력기가 다를 수 있습니다.

* **GNOME, XFCE 등 GTK 기반 데스크톱 환경:** `ibus-hangul`
* **KDE Plasma 등 Qt 기반 데스크톱 환경:** `fcitx5-hangul`

#### ibus-hangul 설치 및 설정 (GNOME, XFCE 등)

1.  **패키지 설치:**

    ```bash
    sudo pacman -S ibus ibus-hangul
    ```

2.  **환경 변수 설정:**
    `~/.xprofile` (X11 환경) 또는 `/etc/environment` (Wayland 및 전역 설정) 파일을 열어 다음 내용을 추가합니다.

    ```bash
    export GTK_IM_MODULE=ibus
    export QT_IM_MODULE=ibus
    export XMODIFIERS=@im=ibus
    ```

3.  **ibus 데몬 자동 시작:**
    데스크톱 환경의 자동 시작 설정에 `ibus-daemon -drx` 명령을 추가하거나, `.xprofile`에 다음 줄을 추가합니다.

    ```bash
    ibus-daemon -drxR
    ```

4.  **입력기 설정:**
    시스템을 재부팅하거나 다시 로그인한 후, `ibus-setup-hangul` 또는 `ibus-setup`을 실행하여 입력 소스에 'Korean (Hangul)'을 추가하고, 한영 전환 키를 설정합니다. 일반적으로 `Shift+Space` 또는 `Hangul` 키 (오른쪽 Alt)로 설정할 수 있습니다.

#### fcitx5-hangul 설치 및 설정 (KDE Plasma 등)

1.  **패키지 설치:**

    ```bash
    sudo pacman -S fcitx5-im fcitx5-hangul fcitx5-configtool
    ```

2.  **환경 변수 설정:**
    `/etc/environment` 파일을 열어 다음 내용을 추가합니다.

    ```bash
    export GTK_IM_MODULE=fcitx
    export QT_IM_MODULE=fcitx
    export XMODIFIERS=@im=fcitx
    ```

3.  **입력기 설정:**
    시스템을 재부팅하거나 다시 로그인한 후, `fcitx5-configtool`을 실행합니다. 'Input Method' 탭에서 'Add Input Method'를 클릭하고, 'Only Show Current Language'의 체크를 해제한 후 'Hangul'을 찾아 추가합니다.

    'Global Options' 탭에서는 'Trigger Input Method' 항목에서 한영 전환 키를 설정할 수 있습니다.

### 4단계: 한영 전환 키 설정 (선택 사항)

키보드에 한영 키가 없는 경우, 오른쪽 `Alt` 키나 다른 키를 한영 전환 키로 사용하도록 설정할 수 있습니다. `xmodmap`을 사용하여 키 매핑을 변경할 수 있습니다.

`~/.Xmodmap` 파일을 생성하고 다음 내용을 추가합니다.

```
keycode 108 = Hangul
```

그리고 `~/.xinitrc` 또는 `~/.xprofile` 파일에 다음 줄을 추가하여 X 세션 시작 시 스크립트가 실행되도록 합니다.

```bash
xmodmap ~/.Xmodmap
```

위의 단계를 순서대로 진행하면 Arch Linux에서 발생하는 대부분의 한글 깨짐 및 입력 문제를 해결할 수 있습니다. 문제가 지속될 경우, ArchWiki의 [Localization/Korean](https://wiki.archlinux.org/title/Localization_(%ED%95%9C%EA%B5%AD%EC%96%B4)/Korean_(%ED%95%9C%EA%B5%AD%EC%96%B4)) 문서를 참조하여 더 상세한 정보를 확인해 보시는 것을 권장합니다.