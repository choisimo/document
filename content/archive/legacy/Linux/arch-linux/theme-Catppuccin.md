# Zsh와 Oh My Zsh 테마 설정

Zsh(Z shell)은 Bash보다 확장된 자동 완성, 플러그인, 테마 설정 기능을 제공한다.

-----

### 1단계: Zsh 설치

Arch Linux의 패키지 매니저인 `pacman`으로 Zsh를 설치한다.

```bash
sudo pacman -S zsh
```

-----

### 2단계: Zsh를 기본 셸(Shell)로 설정

Zsh 설치 후 기본 셸을 Zsh로 변경한다.

```bash
# chsh: Change Shell 명령어
# -s: 변경할 셸을 지정하는 옵션
# $(which zsh): zsh가 설치된 경로를 찾아 자동으로 입력해주는 명령어
chsh -s $(which zsh) 
```

**중요:** 이 설정은 로그아웃 후 다시 로그인해야 적용된다. 터미널 재시작만으로는 부족할 수 있다.

-----

### 3단계: 테마 관리를 위한 "Oh My Zsh" 설치

Oh My Zsh는 Zsh 설정, 테마, 플러그인을 관리하는 프레임워크다.

아래 명령어는 Oh My Zsh 설치 스크립트를 실행한다. `curl`이 없으면 `sudo pacman -S curl`로 설치한다.

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

설치가 완료되면 터미널이 새로운 모습으로 바뀌고, 홈 디렉터리에 `.zshrc`라는 설정 파일이 생성됩니다.

-----

### 4단계: 테마 적용

1.  **`.zshrc` 파일 열기**
    `nano`나 `vim` 같은 텍스트 편집기로 Zsh 설정 파일을 연다.

    ```bash
    nano ~/.zshrc
    ```

2.  **테마 설정(ZSH\_THEME) 수정하기**
    `ZSH_THEME="robbyrussell"` 값을 사용할 테마 이름으로 변경한다.

    ```bash
    # 예시: "agnoster" 테마로 변경
    ZSH_THEME="agnoster"
    ```

3.  **변경 사항 적용하기**
    파일을 저장한 뒤 아래 명령으로 변경된 설정을 적용한다.

    ```bash
    source ~/.zshrc
    ```

#### 테마 예시

  * `robbyrussell`: 깔끔한 기본 테마
  * `agnoster`: Git 상태, 경로 등을 아이콘과 함께 표시하는 테마. (**별도 폰트 설치 필요**)
  * `ys`: 심플하면서 필요한 정보를 잘 보여주는 테마
  * `avit`: 사용자 이름과 호스트를 숨겨 터미널 라인을 짧게 유지해주는 테마

[Oh My Zsh 테마 전체 목록](https://github.com/ohmyzsh/ohmyzsh/wiki/Themes)에서 테마 스크린샷과 이름을 확인할 수 있다.

-----

### 5단계: `agnoster` 등 특수 테마를 위한 폰트 설치

`agnoster`와 같이 화살표나 Git 아이콘 등이 깨져서 네모(□)나 물음표(?)로 보인다면, 이는 해당 기호를 지원하는 특수 폰트(Powerline 또는 Nerd Font)가 설치되지 않았기 때문입니다.

1.  **Powerline 폰트 설치**
    Arch Linux 공식 저장소에서 설치할 수 있다.

    ```bash
    sudo pacman -S powerline-fonts
    ```

2.  **터미널에 폰트 적용**
    폰트 설치 후 터미널 프로그램의 글꼴을 Powerline 또는 Nerd Font 계열(예: `MesloLGS NF`, `Fira Code Nerd Font`)로 변경한다.

      * **GNOME Terminal:** `기본 설정` \> `프로필` \> `텍스트` 탭 \> `사용자 지정 글꼴` 체크 후 폰트 선택
      * **Konsole (KDE):** `설정` \> `프로필 편집` \> `모양` 탭 \> `글꼴 선택`
      * 기타 터미널 프로그램도 설정에서 글꼴을 변경하는 옵션이 있습니다.

-----

### `powerlevel10k` 테마 설치

`powerlevel10k`는 빠른 렌더링과 대화형 설정 마법사를 제공하는 Zsh 테마다.

1.  **powerlevel10k 테마 다운로드**

    ```bash
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
    ```

2.  **`.zshrc` 파일에서 테마 설정**
    `nano ~/.zshrc` 명령어로 파일을 열고 `ZSH_THEME` 값을 아래와 같이 변경합니다.

    ```bash
    ZSH_THEME="powerlevel10k/powerlevel10k"
    ```

3.  **설정 마법사 실행**
    파일을 저장하고 `source ~/.zshrc`를 실행하거나 터미널을 새로 열면 `powerlevel10k` 설정 마법사가 시작된다. 아이콘 표시 여부, 프롬프트 모양, 정보 표시 범위를 선택하면 설정 파일이 생성된다.
