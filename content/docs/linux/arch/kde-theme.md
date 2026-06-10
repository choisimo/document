# KDE Plasma 테마와 설정 관리

이 문서는 KDE Plasma에서 global theme, Plasma style, color scheme, icon, cursor, font, window decoration을 안전하게 바꾸는 기준을 정리한다. 목표는 예쁜 테마 목록을 외우는 것이 아니라 어떤 설정이 어떤 파일과 UI 영역에 영향을 주는지 이해하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

KDE Plasma는 설정 범위가 넓다. Global theme 하나를 적용하면 색상, 패널, 창 장식, 아이콘, 커서, 폰트, 로그인 화면까지 여러 요소가 한 번에 바뀔 수 있다.

무작정 테마 스크립트를 실행하면 사용자 설정이 덮이거나 SDDM 같은 system 영역까지 바뀐다. 복구하려면 어떤 설정이 user scope인지 system scope인지 알아야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 KDE 테마 종류, AUR 패키지, 수동 설치, 스크립트 설치, 위젯, 패널, 폰트 설정을 폭넓게 다룬다. 보완해야 할 점은 다음과 같다.

- Plasma 5 명령과 Plasma 6 환경이 섞일 수 있다.
- 외부 설치 스크립트 실행 위험이 충분히 강조되지 않았다.
- user 설정과 system 설정 경계가 약하다.
- 테마 추천 목록이 시간이 지나면 빠르게 낡는다.
- 복구 절차가 적용 절차보다 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안전하게 수행하는 것이다.

- KDE Plasma 버전과 session type을 확인한다.
- 설정 변경 전 주요 사용자 설정 파일을 백업한다.
- Global theme와 개별 구성요소의 차이를 이해한다.
- GUI에서 테마를 적용하고 문제가 생기면 되돌린다.
- AUR 또는 외부 script 설치 전 신뢰성과 파일 범위를 확인한다.
- SDDM 같은 system-wide 설정은 별도로 백업하고 변경한다.

## 4. 시스템 번역 (Data Flow)

테마 적용 흐름은 다음과 같다.

```text
user selects theme
  -> System Settings writes user config
  -> Plasma shell and KWin reload visual state
  -> Qt and KDE apps read config
  -> user verifies panel, window, font, icon, input
```

SDDM login theme는 사용자 세션 밖에서 동작한다. Plasma desktop theme와 같은 것으로 취급하면 안 된다.

## 5. 핵심 구성요소 (Building Blocks)

Global theme는 여러 시각 요소를 묶어서 적용하는 bundle이다. 편하지만 한 번에 많은 설정을 바꾼다.

Plasma style은 panel, widget, desktop shell의 모양에 영향을 준다.

Application style은 Qt application의 버튼, 메뉴, scroll bar 같은 control rendering에 영향을 준다.

Window decoration은 KWin이 그리는 title bar와 window button 영역이다.

Color scheme은 foreground, background, selection, link, disabled color 같은 palette를 정한다.

Icon theme와 cursor theme는 각각 icon lookup과 pointer shape에 영향을 준다.

Font 설정은 UI text rendering과 fallback에 영향을 준다. 한글 환경에서는 Noto CJK 계열 fallback을 확인한다.

SDDM theme는 login manager 설정이며 system-wide file과 package에 영향을 줄 수 있다.

## 6. 상태 전이 (State Transition)

안전한 테마 변경은 다음 순서로 진행한다.

```text
current session verified
  -> config backup
  -> one component changed
  -> Plasma/KWin reload or logout
  -> visual and input verified
  -> next component changed
```

문제가 생기면 다음 상태로 되돌린다.

```text
broken visual state
  -> switch to default Breeze
  -> remove last installed theme
  -> restore config backup
  -> logout and login
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 외부 테마 설치 스크립트를 읽지 않고 실행하지 않는다.
- SDDM 설정은 desktop session 설정과 분리해서 다룬다.
- Global theme를 적용하기 전 현재 설정을 백업한다.
- 한 번에 여러 테마 요소를 바꾸지 않는다.
- AUR 패키지는 PKGBUILD를 확인하고 설치한다.
- 로그인 불능 상황을 대비해 TTY 로그인 방법을 알고 있어야 한다.
- Wayland와 X11 session에서 동작이 다를 수 있음을 고려한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 Plasma 환경을 확인한다.

```bash
plasmashell --version
echo "$XDG_SESSION_TYPE"
echo "$XDG_CURRENT_DESKTOP"
```

주요 사용자 설정을 백업한다.

```bash
mkdir -p ~/kde-config-backup
cp ~/.config/kdeglobals ~/kde-config-backup/ 2>/dev/null || true
cp ~/.config/kwinrc ~/kde-config-backup/ 2>/dev/null || true
cp ~/.config/plasmarc ~/kde-config-backup/ 2>/dev/null || true
cp ~/.config/plasma-org.kde.plasma.desktop-appletsrc ~/kde-config-backup/ 2>/dev/null || true
```

System Settings를 연다.

```bash
systemsettings
```

GUI에서는 다음 순서로 한 항목씩 적용한다.

```text
System Settings
  -> Appearance
  -> Global Theme or Colors or Icons
  -> Apply
  -> logout and login if needed
```

사용자 scope 테마 경로를 확인한다.

```bash
find ~/.local/share/plasma -maxdepth 3 -type d 2>/dev/null
find ~/.local/share/icons -maxdepth 2 -type d 2>/dev/null
find ~/.local/share/color-schemes -maxdepth 1 -type f 2>/dev/null
```

기본 Breeze 계열로 되돌리는 가장 안전한 방법은 GUI에서 기본 테마를 다시 적용하는 것이다.

```text
System Settings
  -> Appearance
  -> Global Theme
  -> Breeze
  -> Apply
```

폰트 cache를 갱신한다.

```bash
fc-match sans
fc-cache -f
```

Arch에서 기본 Plasma와 한글 폰트 구성을 설치하는 예시는 다음과 같다.

```bash
sudo pacman -S plasma kde-applications noto-fonts noto-fonts-cjk noto-fonts-emoji
```

## 9. 실패 사례 (What could go wrong?)

Global theme 적용 후 panel이 사라지면 `plasma-org.kde.plasma.desktop-appletsrc`가 영향을 받았을 수 있다. 백업에서 되돌리거나 새 panel을 만든다.

외부 script가 `~/.config`, `~/.local/share`, `/usr/share`를 동시에 수정하면 원복 범위가 커진다. 설치 전 script가 쓰는 경로를 확인한다.

SDDM theme가 깨지면 graphical login이 실패할 수 있다. TTY로 로그인해 SDDM 설정을 기본값으로 되돌린다.

Icon theme가 일부 앱에서 비어 보이면 fallback icon theme가 부족할 수 있다. Breeze icon을 함께 유지한다.

Wayland session에서 window rule, screen capture, global shortcut 동작이 X11과 다를 수 있다.

한글 글꼴 fallback이 없으면 UI 일부가 tofu glyph로 표시된다. Noto CJK 계열을 설치하고 `fc-match`로 확인한다.

## 10. 뇌 확장하기 (Evolution & Variants)

Plasma 6 이후 환경에서는 Wayland session이 기본이 되는 배포판이 늘고 있다. X11 전용 튜닝이나 오래된 Plasma 5 applet은 동작하지 않을 수 있다.

테마는 생산성 설정과 분리해서 관리하는 편이 좋다. 단축키, window rule, panel layout은 작업 흐름에 직접 영향을 주므로 별도 백업 대상이다.

선호 테마를 dotfiles로 관리하려면 binary asset보다 config file과 설치 package 목록을 분리한다. 외부 테마 asset은 재다운로드 가능하게 출처를 기록한다.

최신 KDE와 Arch 환경은 공식 문서를 확인한다.

- Arch KDE 문서: <https://wiki.archlinux.org/title/KDE>
- KDE System Settings handbook: <https://docs.kde.org/trunk_kf6/en/systemsettings/systemsettings/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Plasma version과 session type을 확인했다.
- [ ] 주요 KDE 사용자 설정 파일을 백업했다.
- [ ] Global theme와 개별 요소의 차이를 설명할 수 있다.
- [ ] 한 번에 하나의 테마 요소만 변경했다.
- [ ] Breeze 기본 테마로 되돌리는 방법을 알고 있다.
- [ ] SDDM 변경은 별도 백업 후 진행한다.
- [ ] AUR 또는 외부 script의 설치 범위를 확인했다.
- [ ] 한글 폰트 fallback을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

KDE Plasma 테마 변경은 시각 설정을 한꺼번에 바꾸는 작업이 아니라 user config, Plasma shell, KWin, Qt app, SDDM의 경계를 관리하는 작업이다.
