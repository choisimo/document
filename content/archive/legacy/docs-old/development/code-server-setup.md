# how to install code-server(vscode server) on Ubuntu 

## 외부 노출 경계와 실행 전 확인

`curl ... | sh`는 내려받은 스크립트를 즉시 실행하므로, 실행 전에 공식 배포 출처와 스크립트 내용을 확인하거나 검증 가능한 고정 버전 설치 방식을 선택한다. 기본 예시는 로컬 인터페이스에만 바인딩한다. 외부 접속이 필요하면 TLS를 종료하는 리버스 프록시 또는 VPN, 방화벽 허용 범위, 강한 인증을 먼저 구성한 뒤 노출한다. 서비스 완료는 프로세스 실행뿐 아니라 실제 바인딩 주소와 인증된 접속 결과로 판정한다.

## download
    curl -fsSL https://code-server.dev/install.sh | sh

## execute code-server
    code-server

## edit settings

    vim ~/.config/code-server/config.yaml

    bind-addr: 127.0.0.1:${port}
    auth: password
    password: ${password}
    cert: false

# service

    sudo systemctl enable --now code-server@${username}
## check is working 
    sudo systemctl list-units code-server*
## stop service
    sudo systemctl stop code-server@${username}.service
## disable
    sudo systemctl disable code-server@${username}