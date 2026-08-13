# Ubuntu에서 Docker 설치

## 지원 환경과 설치 판정

이 절차는 Ubuntu의 APT 저장소를 사용하는 보관 예제다. 저장소 행의 `arch=amd64`, `lsb_release -cs`, 키링 경로가 대상 CPU와 Ubuntu 릴리스에 맞는지 확인하고, 현재 Docker 공식 설치 문서의 저장소·서명 키 절차와 비교한 뒤 실행한다. `${your_linux_username}`은 실제 사용자명으로 치환한다. 설치 완료는 패키지 설치, 서비스 활성 상태, 클라이언트·데몬 통신을 각각 확인해 판정한다.

## Ubuntu용 보관 절차
  
    sudo apt update
    
    sudo apt install apt-transport-https ca-certificates curl software-properties-common
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
      
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      
    sudo apt update
    
    sudo apt install docker-ce docker-ce-cli containerd.io
    
    sudo systemctl start docker
    sudo systemctl enable docker
  
  ##### ${your linux username} docker permisson add
    sudo usermod -aG docker ${your_linux_username}
