Zsh(Z shell)은 기존의 Bash 셸보다 강력한 자동 완성, 플러그인, 테마 설정 등 다양한 기능을 제공하여 터미널 사용 경험을 크게 향상시켜 줍니다.

-----

### 1단계: Zsh 설치하기

가장 먼저 Arch Linux의 패키지 매니저인 `pacman`을 사용하여 Zsh를 설치합니다.

```bash
sudo pacman -S zsh
```

-----

### 2단계: Zsh를 기본 셸(Shell)로 설정하기

Zsh를 설치한 후, 터미널을 열 때마다 Zsh가 실행되도록 기본 셸로 변경해야 합니다.

```bash
# chsh: Change Shell 명령어
# -s: 변경할 셸을 지정하는 옵션
# $(which zsh): zsh가 설치된 경로를 찾아 자동으로 입력해주는 명령어
chsh -s $(which zsh) 
```

**중요:** 이 설정은 시스템에서 로그아웃 후 다시 **로그인**해야 완전히 적용됩니다. 터미널을 껐다 켜는 것만으로는 부족합니다.

-----

### 3단계: 테마 관리를 위한 "Oh My Zsh" 설치하기

Oh My Zsh는 Zsh의 설정을 관리해주는 가장 인기 있는 프레임워크입니다. 수많은 테마와 플러그인을 아주 쉽게 사용할 수 있게 해줍니다.

아래 명령어를 터미널에 붙여넣어 실행하면 자동으로 설치됩니다. (`curl`이 없다면 `sudo pacman -S curl`로 먼저 설치해주세요.)

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

설치가 완료되면 터미널이 새로운 모습으로 바뀌고, 홈 디렉터리에 `.zshrc`라는 설정 파일이 생성됩니다.

-----

### 4단계: 원하는 테마 적용하기

이제 가장 재미있는 부분인 테마를 적용해 보겠습니다.

1.  **`.zshrc` 파일 열기**
    `nano`나 `vim` 같은 텍스트 편집기로 Zsh 설정 파일을 엽니다. (`nano`가 초보자에게 더 쉽습니다.)

    ```bash
    nano ~/.zshrc
    ```

2.  **테마 설정(ZSH\_THEME) 수정하기**
    파일을 열면 `ZSH_THEME="robbyrussell"` 이라는 부분을 찾을 수 있습니다. `robbyrussell`이 기본 테마 이름입니다. 이 부분을 원하는 테마 이름으로 변경하면 됩니다.

    ```bash
    # 예시: "agnoster" 테마로 변경
    ZSH_THEME="agnoster"
    ```

3.  **변경 사항 적용하기**
    파일을 저장하고 나온 뒤 (`nano`에서는 `Ctrl+X` -\> `Y` -\> `Enter`), 아래 명령어를 실행하여 변경된 설정을 바로 적용합니다.

    ```bash
    source ~/.zshrc
    ```

#### 추천 테마

  * `robbyrussell`: 깔끔하고 군더더기 없는 기본 테마
  * `agnoster`: 가장 인기 있는 테마 중 하나. Git 상태, 경로 등을 아이콘과 함께 보여줍니다. (**별도 폰트 설치 필요**)
  * `ys`: 심플하면서 필요한 정보를 잘 보여주는 테마
  * `avit`: 사용자 이름과 호스트를 숨겨 터미널 라인을 짧게 유지해주는 테마

[Oh My Zsh 테마 전체 목록](https://github.com/ohmyzsh/ohmyzsh/wiki/Themes)에서 스크린샷을 보고 마음에 드는 테마를 고를 수 있습니다.

-----

### 5단계 (중요): `agnoster` 등 특수 테마를 위한 폰트 설치

`agnoster`와 같이 화살표나 Git 아이콘 등이 깨져서 네모(□)나 물음표(?)로 보인다면, 이는 해당 기호를 지원하는 특수 폰트(Powerline 또는 Nerd Font)가 설치되지 않았기 때문입니다.

1.  **Powerline 폰트 설치**
    Arch Linux에서는 공식 저장소에서 바로 설치할 수 있습니다.

    ```bash
    sudo pacman -S powerline-fonts
    ```

2.  **터미널에 폰트 적용**
    폰트 설치 후, **사용하시는 터미널 프로그램의 설정에서** 글꼴을 방금 설치한 Powerline 폰트 (예: `MesloLGS NF`, `Fira Code Nerd Font` 등)로 변경해야 합니다.

      * **GNOME Terminal:** `기본 설정` \> `프로필` \> `텍스트` 탭 \> `사용자 지정 글꼴` 체크 후 폰트 선택
      * **Konsole (KDE):** `설정` \> `프로필 편집` \> `모양` 탭 \> `글꼴 선택`
      * 기타 터미널 프로그램도 설정에서 글꼴을 변경하는 옵션이 있습니다.

-----

### 특별 추천: `powerlevel10k` 테마 설치하기

`powerlevel10k`는 `agnoster`보다 훨씬 빠르고, 사용자 설정이 매우 편리하며, 화려한 기능을 제공하는 현존 최고의 Zsh 테마입니다.

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
    파일을 저장하고 `source ~/.zshrc`를 실행하거나 터미널을 새로 열면, `powerlevel10k` 설정 마법사가 자동으로 시작됩니다. 마법사가 묻는 질문(아이콘이 잘 보이는지, 어떤 모양의 프롬프트를 원하는지 등)에 따라 몇 가지 선택만 하면 자신에게 최적화된 멋진 터미널이 완성됩니다.

