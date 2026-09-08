# Arch Linux 한글 표시와 한영 전환 설정

> **진단 범위:** 한글 표시와 입력은 로캘·글꼴·입력기를 나누어 점검한다. 각 단계의 출력과 앱 동작을 확인하며 한 번에 여러 설정을 바꾸지 않는다. IBus와 Fcitx5는 선택지이므로 두 절의 환경 변수를 함께 적용하지 않는다. 데스크톱과 X11/Wayland 세션 종류도 먼저 기록한다.

Arch Linux에서 한글이 사각형으로 표시되면 로캘과 글꼴을, 한영 전환이 동작하지 않으면 입력기와 앱 통합을 확인한다. 표시 문제와 입력 문제의 원인은 서로 다를 수 있다.

## 1. 로캘 설정

`/etc/locale.gen` 파일에서 한국어와 영어 UTF-8 로캘을 활성화한다.

```bash
sudo nano /etc/locale.gen
```

다음 줄의 주석을 제거한다.

```text
en_US.UTF-8 UTF-8
ko_KR.UTF-8 UTF-8
```

로캘을 생성한다.

```bash
sudo locale-gen
```

시스템 기본 로캘은 `/etc/locale.conf`에 기록한다. 영어 UI를 유지하면서 한글 표시와 입력을 지원하려면 `en_US.UTF-8`을 기본값으로 둘 수 있다.

```bash
sudo nano /etc/locale.conf
```

```text
LANG=en_US.UTF-8
```

변경 후 로그아웃하고 다시 로그인한 세션에서 적용 상태를 확인한다.

```bash
locale
```

## 2. 한글 글꼴 설치

선택한 글꼴에 한글 글리프가 없으면 문자가 사각형으로 표시될 수 있다. `noto-fonts-cjk`는 한중일 글리프를 제공하는 선택지다.

```bash
sudo pacman -S noto-fonts-cjk
```

추가 글꼴이 필요하면 다음 패키지를 함께 설치할 수 있다.

```bash
sudo pacman -S ttf-nanum
```

폰트 캐시는 다음 명령으로 갱신한다.

```bash
fc-cache -fv
```

## 3. IBus 입력기 설정

GNOME 환경에서는 IBus와 `ibus-hangul` 조합이 흔히 사용된다.

```bash
sudo pacman -S ibus ibus-hangul
```

다음은 입력 모듈을 명시해야 하는 X11·앱 환경의 예시다. 선택한 데스크톱의 입력기 통합 방식과 기존 설정을 확인한 뒤 필요한 변수만 적용한다.

```bash
sudo nano /etc/environment
```

```text
GTK_IM_MODULE=ibus
QT_IM_MODULE=ibus
XMODIFIERS=@im=ibus
```

IBus 데몬과 설정 도구는 다음 명령으로 실행한다.

```bash
ibus-daemon -drx
ibus-setup
```

설정 창에서는 `Input Method` 탭에서 `Korean` → `Hangul`을 추가한다. GNOME 기본 전환 키는 보통 `Super + Space`이며 설정에서 변경할 수 있다.

## 4. Fcitx5 입력기 설정

KDE Plasma 환경에서는 Fcitx5와 `fcitx5-hangul` 조합이 많이 쓰인다.

```bash
sudo pacman -S fcitx5 fcitx5-hangul fcitx5-configtool fcitx5-gtk fcitx5-qt
```

다음은 입력 모듈을 명시해야 하는 X11·앱 환경의 예시다. 선택한 데스크톱의 입력기 통합 방식과 기존 설정을 확인한 뒤 필요한 변수만 적용한다.

```bash
sudo nano /etc/environment
```

```text
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

Fcitx5를 테스트 실행한다.

```bash
fcitx5 &
```

설정 도구를 실행한다.

```bash
fcitx5-configtool
```

`Input Method` 탭에서 `Hangul`을 추가하고, `Global Options` 탭에서 한영 전환 키를 확인한다. 기본값은 환경에 따라 `Ctrl + Space`, `Shift + Space`, 오른쪽 `Shift` 등으로 설정될 수 있다.

## 5. 적용 확인

선택한 입력기 설정을 마친 뒤 로그아웃하고 다시 로그인한다. `locale`, 한글 표시, 한글 입력을 각각 확인해 어느 변경이 적용됐는지 구분한다.

점검 순서는 다음과 같다.

1. `locale` 출력에서 `LANG` 값 확인
2. 한글 파일명 또는 웹 페이지 표시 확인
3. 텍스트 편집기에서 한글 입력 확인
4. 특정 프로그램에서만 문제가 있으면 해당 프로그램의 글꼴 설정 확인

문제가 지속되면 현재 데스크톱 환경에서 사용하는 입력기와 환경 변수가 일치하는지 확인한다. IBus와 Fcitx5 설정을 동시에 섞으면 입력기 충돌이 발생할 수 있다.

## Wayland 환경 보충

Fcitx5의 Wayland 통합은 compositor와 GTK·Qt 버전에 따라 다르다. KDE Plasma Wayland에서는 가상 키보드 설정으로 Fcitx5를 시작하고 전역 `GTK_IM_MODULE`·`QT_IM_MODULE`을 지정하지 않는 구성이 안내된다. XWayland와 특정 앱은 별도 설정이 필요할 수 있으므로 위 X11 예시를 그대로 전역 적용하지 않는다. [Fcitx5의 Wayland 안내](https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland)를 기준으로 선택한 세션과 앱에서 확인한다.
