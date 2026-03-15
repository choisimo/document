#!/bin/bash

# GNOME + 테마 자동 설치 스크립트
# 재부팅 후 사용자 계정에서 실행

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 1. 기본 패키지 업데이트
update_system() {
    log "시스템 업데이트 중..."
    sudo pacman -Syu --noconfirm
}

# 2. Xorg 및 GNOME 설치
install_gnome() {
    log "GNOME 데스크탑 설치 중..."
    
    # Xorg 설치
    sudo pacman -S --noconfirm xorg
    
    # GNOME 설치
    sudo pacman -S --noconfirm gnome gnome-tweaks \
        nautilus-sendto gnome-nettool gnome-usage \
        gnome-multi-writer adwaita-icon-theme \
        xdg-user-dirs-gtk fwupd gdm
    
    # 서비스 활성화
    sudo systemctl enable gdm
    sudo systemctl enable NetworkManager
    
    log "GNOME 설치 완료"
}

# 3. 한국어 및 폰트 설정
setup_korean() {
    log "한국어 폰트 및 입력기 설치 중..."
    
    # 한국어 폰트
    sudo pacman -S --noconfirm noto-fonts-cjk \
        adobe-source-han-sans-kr-fonts \
        adobe-source-han-serif-kr-fonts
    
    # 한국어 입력기
    sudo pacman -S --noconfirm ibus ibus-hangul
    
    log "한국어 설정 완료"
}

# 4. 인기 테마 설치
install_themes() {
    log "테마 및 아이콘 설치 중..."
    
    # 테마 디렉토리 생성
    mkdir -p ~/.themes ~/.icons
    
    # 공식 테마 설치
    sudo pacman -S --noconfirm \
        arc-gtk-theme \
        adapta-gtk-theme \
        materia-gtk-theme \
        papirus-icon-theme
    
    # 추가 테마 다운로드 (GitHub)
    install_additional_themes
    
    log "테마 설치 완료"
}

# 5. 추가 테마 설치
install_additional_themes() {
    log "추가 테마 다운로드 중..."
    
    cd /tmp
    
    # Nordic 테마
    if ! ls ~/.themes/ | grep -q "Nordic"; then
        git clone https://github.com/EliverLara/Nordic.git
        cp -r Nordic ~/.themes/
        log "Nordic 테마 설치 완료"
    fi
    
    # Graphite 테마
    if ! ls ~/.themes/ | grep -q "Graphite"; then
        git clone https://github.com/vinceliuice/Graphite-gtk-theme.git
        cd Graphite-gtk-theme
        ./install.sh
        cd ..
        log "Graphite 테마 설치 완료"
    fi
    
    # Tela 아이콘
    if ! ls ~/.icons/ | grep -q "Tela"; then
        git clone https://github.com/vinceliuice/Tela-icon-theme.git
        cd Tela-icon-theme
        ./install.sh
        cd ..
        log "Tela 아이콘 설치 완료"
    fi
    
    cd ~
}

# 6. 필수 애플리케이션 설치
install_apps() {
    log "필수 애플리케이션 설치 중..."
    
    # 멀티미디어
    sudo pacman -S --noconfirm \
        firefox \
        vlc \
        gimp \
        libreoffice-fresh \
        thunderbird \
        code \
        git \
        curl \
        wget \
        unzip \
        htop \
        neofetch
    
    log "애플리케이션 설치 완료"
}

# 7. 테마 자동 적용
apply_themes() {
    log "테마 자동 적용 중..."
    
    # dconf 설정을 통한 테마 적용
    gsettings set org.gnome.desktop.interface gtk-theme 'Arc-Dark'
    gsettings set org.gnome.desktop.interface icon-theme 'Papirus-Dark'
    gsettings set org.gnome.desktop.interface cursor-theme 'Adwaita'
    gsettings set org.gnome.desktop.wm.preferences theme 'Arc-Dark'
    
    # 폰트 설정
    gsettings set org.gnome.desktop.interface font-name 'Noto Sans CJK KR 11'
    gsettings set org.gnome.desktop.interface document-font-name 'Noto Sans CJK KR 11'
    gsettings set org.gnome.desktop.interface monospace-font-name 'Noto Sans Mono CJK KR 10'
    
    log "테마 적용 완료"
}

# 8. 시스템 최적화
optimize_system() {
    log "시스템 최적화 중..."
    
    # 불필요한 패키지 제거
    sudo pacman -Rns --noconfirm $(pacman -Qtdq) 2>/dev/null || true
    
    # 패키지 캐시 정리
    sudo pacman -Sc --noconfirm
    
    log "시스템 최적화 완료"
}

# 9. 완료 메시지
finish_setup() {
    log "=== 설치 완료 ==="
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        Arch Linux 설치 완료!          ║${NC}"
    echo -e "${BLUE}║                                        ║${NC}"
    echo -e "${BLUE}║  재부팅 후 GNOME 데스크탑으로 로그인  ║${NC}"
    echo -e "${BLUE}║                                        ║${NC}"
    echo -e "${BLUE}║  테마 변경: GNOME Tweaks 사용         ║${NC}"
    echo -e "${BLUE}║  설치된 테마: Arc, Nordic, Graphite   ║${NC}"
    echo -e "${BLUE}║                                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    
    read -p "지금 재부팅 하시겠습니까? (y/N): " REBOOT
    if [[ $REBOOT =~ ^[Yy]$ ]]; then
        sudo reboot
    fi
}

# 메인 함수
main() {
    log "GNOME + 테마 자동 설치 시작"
    
    # 1. 시스템 업데이트
    update_system
    
    # 2. GNOME 설치
    install_gnome
    
    # 3. 한국어 설정
    setup_korean
    
    # 4. 테마 설치
    install_themes
    
    # 5. 필수 앱 설치
    install_apps
    
    # 6. 테마 적용
    apply_themes
    
    # 7. 시스템 최적화
    optimize_system
    
    # 8. 완료
    finish_setup
}

main "$@"
