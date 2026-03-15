# GNU Stow를 사용한 Dotfiles 관리 방법

GNU Stow는 심볼릭 링크를 생성하여 dotfiles를 효율적으로 관리할 수 있는 도구입니다. 홈 디렉토리를 깔끔하게 유지하면서 Git으로 설정 파일들을 버전 관리할 수 있습니다.

## Stow의 동작 원리

Stow는 "package" 디렉토리 내의 구조를 타겟 디렉토리(기본값: 부모 디렉토리)에 심볼릭 링크로 복제합니다.

```
~/dotfiles/
├── vim/
│   └── .vimrc
├── bash/
│   └── .bashrc
└── git/
    └── .gitconfig
```

`stow vim`을 실행하면 `~/.vimrc` → `~/dotfiles/vim/.vimrc` 심볼릭 링크가 생성됩니다.

## 설치

```bash
# Arch Linux
sudo pacman -S stow

# Ubuntu/Debian
sudo apt install stow

# Fedora
sudo dnf install stow

# macOS
brew install stow
```

## 기본 사용법

### 1. Dotfiles 디렉토리 구조 생성

```bash
mkdir ~/dotfiles
cd ~/dotfiles

# 애플리케이션별로 디렉토리 생성
mkdir vim bash git tmux nvim
```

### 2. 기존 설정 파일 이동

```bash
# 기존 설정 파일을 stow 구조로 이동
mv ~/.vimrc ~/dotfiles/vim/
mv ~/.bashrc ~/dotfiles/bash/
mv ~/.gitconfig ~/dotfiles/git/
mv ~/.config/nvim ~/dotfiles/nvim/.config/
```

### 3. Stow로 심볼릭 링크 생성

```bash
cd ~/dotfiles

# 개별 패키지 적용
stow vim
stow bash
stow git

# 여러 패키지 한 번에 적용
stow vim bash git tmux

# 모든 패키지 적용
stow */
```

### 4. 심볼릭 링크 제거

```bash
# 특정 패키지 언스토우
stow -D vim

# 여러 패키지 제거
stow -D vim bash git
```

### 5. 재적용 (업데이트)

```bash
# 기존 링크 제거 후 다시 생성
stow -R vim
```

## 실전 디렉토리 구조 예제

```
~/dotfiles/
├── bash/
│   ├── .bashrc
│   └── .bash_profile
├── vim/
│   └── .vimrc
├── nvim/
│   └── .config/
│       └── nvim/
│           ├── init.vim
│           └── lua/
│               └── plugins.lua
├── tmux/
│   └── .tmux.conf
├── git/
│   ├── .gitconfig
│   └── .gitignore_global
├── zsh/
│   ├── .zshrc
│   └── .zsh_aliases
└── ssh/
    └── .ssh/
        └── config
```

## Git으로 버전 관리

```bash
cd ~/dotfiles
git init
git add .
git commit -m "Initial dotfiles commit"

# 원격 저장소에 푸시
git remote add origin git@github.com:username/dotfiles.git
git push -u origin main
```

## 새 시스템에 dotfiles 배포

```bash
# 1. 저장소 클론
cd ~
git clone git@github.com:username/dotfiles.git

# 2. 기존 설정 파일 백업 (필요시)
mkdir ~/dotfiles-backup
mv ~/.bashrc ~/dotfiles-backup/
mv ~/.vimrc ~/dotfiles-backup/

# 3. Stow 적용
cd ~/dotfiles
stow */

# 또는 선택적으로
stow bash vim git tmux
```

## 고급 사용법

### 타겟 디렉토리 지정

```bash
# 기본적으로 부모 디렉토리가 타겟
# 다른 디렉토리를 타겟으로 지정
stow -t /etc systemd
```

### 시뮬레이션 모드

```bash
# 실제 실행 없이 어떤 작업이 수행될지 확인
stow -n -v vim
```

### 충돌 처리

```bash
# 기존 파일이 있을 때 무시하고 진행
stow --adopt vim

# 이후 git diff로 차이점 확인 후 결정
```

### .stow-local-ignore 파일

특정 파일을 스토우에서 제외:

```bash
# ~/dotfiles/.stow-local-ignore
README.md
LICENSE
\.git
\.gitignore
```

## 실용적인 팁

### 1. 호스트별 설정 분리

```
~/dotfiles/
├── bash-common/
│   └── .bashrc
├── bash-work/
│   └── .bashrc_work
└── bash-personal/
    └── .bashrc_personal
```

### 2. Makefile로 자동화

```makefile
# ~/dotfiles/Makefile
.PHONY: install uninstall

install:
	stow bash vim git tmux nvim

uninstall:
	stow -D bash vim git tmux nvim

restow:
	stow -R bash vim git tmux nvim
```

사용: `make install`

### 3. 설치 스크립트

```bash
#!/bin/bash
# ~/dotfiles/install.sh

packages=(bash vim git tmux nvim zsh)

for package in "${packages[@]}"; do
    echo "Stowing $package..."
    stow -R "$package"
done

echo "Dotfiles installation complete!"
```

## 주의사항

1. **기존 파일 백업**: Stow 실행 전 기존 설정 파일을 백업하세요
2. **디렉토리 구조**: Stow 디렉토리 내 구조가 홈 디렉토리 구조와 정확히 일치해야 합니다
3. **심볼릭 링크 확인**: `ls -la ~` 명령으로 링크가 올바르게 생성되었는지 확인하세요
4. **충돌 해결**: 기존 파일과 충돌 시 `--adopt` 옵션 사용 또는 수동 제거 필요

## 검증

```bash
# 심볼릭 링크 확인
ls -la ~/.bashrc
# 출력: ~/.bashrc -> dotfiles/bash/.bashrc

# 모든 stow 링크 확인
find ~ -maxdepth 1 -type l -ls
```
