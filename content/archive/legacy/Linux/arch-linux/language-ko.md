# Arch Linux 한글 표시와 한영 전환 설정

Arch Linux에서 한글이 사각형으로 표시되거나 한영 전환이 동작하지 않는 문제는 보통 로캘(Locale), 한글 글꼴, 입력기(Input Method Editor) 설정 중 하나가 빠졌을 때 발생한다.

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

적용 상태는 재부팅 후 확인한다.

```bash
locale
```

## 2. 한글 글꼴 설치

한글 글꼴이 없으면 한글이 깨져 보인다. 일반적인 선택지는 `noto-fonts-cjk`다.

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

입력기 환경 변수를 `/etc/environment`에 추가한다.

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

입력기 환경 변수를 `/etc/environment`에 추가한다.

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

설정 후 재부팅하면 로캘, 글꼴, 입력기 환경 변수가 함께 적용된다.

점검 순서는 다음과 같다.

1. `locale` 출력에서 `LANG` 값 확인
2. 한글 파일명 또는 웹 페이지 표시 확인
3. 텍스트 편집기에서 한글 입력 확인
4. 특정 프로그램에서만 문제가 있으면 해당 프로그램의 글꼴 설정 확인

문제가 지속되면 현재 데스크톱 환경에서 사용하는 입력기와 환경 변수가 일치하는지 확인한다. IBus와 Fcitx5 설정을 동시에 섞으면 입력기 충돌이 발생할 수 있다.
