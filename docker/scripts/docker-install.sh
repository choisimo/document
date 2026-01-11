#!/bin/bash

# Docker 설치
if [ $(id -u) -ne 0 ]; then
    echo "This script must be run as root."
    exit 1
fi

sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER # 현재 사용자를 docker 그룹에 추가 (재로그인 필요)

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "Docker and Docker Compose have been installed successfully!"
