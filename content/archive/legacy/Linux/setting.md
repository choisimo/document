# 서버 기본 설정 메모

## Node.js 서버 도구
```shell
sudo apt-get install wget
sudo apt-get remove --purge nodejs npm
sudo wget https://nodejs.org/dist/v21.6.1/node-v21.6.1-linux-x64.tar.xz
tar -xvf node-v21.6.1-linux-x64.tar.xz
sudo mv node-v21.6.1-linux-x64 /usr/local/node-v21.6.1
sudo ln -s /usr/local/node-v21.6.1/bin/node /usr/bin/node
sudo ln -s /usr/local/node-v21.6.1/bin/npm /usr/bin/npm
sudo npm install -g serve
export PATH=$PATH:/usr/local/node-v21.6.1/bin
echo 'export PATH=$PATH:/usr/local/node-v21.6.1/bin' >> ~/.bashrc
source ~/.bashrc
```

## 프론트엔드 정적 서버
```
cd /path/to/deploy/build
serve -s . -l 3000
```

## 백엔드 Java 런타임
```
sudo apt-get update
sudo apt-get install openjdk-17-jdk
java -version

/user/lib/jvm/java-17-openjdk-amd64/bin/java
sudo vim /etc/environment
JAVA_HOME="/usr/lib/java-17-openjdk-amd64"

source /etc/environment
```


## Docker 설치
```shell
### for ubuntu
  
    sudo apt update
    
    sudo apt install apt-transport-https ca-certificates curl software-properties-common
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
      
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
      
    sudo apt update
    
    sudo apt install docker-ce docker-ce-cli containerd.io
    
    sudo systemctl start docker
    sudo systemctl enable docker
  
  ##### Linux 사용자 Docker 권한 추가
    sudo usermod -aG docker username
```

## Docker Redis 컨테이너
```shell
mkdir -p /server/redis
vim /server/redis/redis.conf
mkdir -p /server/redis/redis_data

    docker run \
    -d \
    --restart=always \
    --name=redis \
    -p 6379:6379 \
    -e TZ=Asia/Seoul \
    -v /server/redis/redis.conf:/etc/redis/redis.conf \
    -v /server/redis/redis_data:/data \
    redis:7.0.2 redis-server /etc/redis/redis.conf
```

## Docker MariaDB 컨테이너
```shell
    docker run --name mariadb1 -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mariadb

  
    vim /etc/mysql/mariadb.cnf
    default-time-zone = '+9:00'
```
```shell
docker update --restart always <container>
docker update --restart unless-stop <container>
```
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;

CREATE USER 'user'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON <table>.* TO 'user'@'%';
FLUSH PRIVILEGES;
```

## Docker MongoDB 컨테이너
```shell
sudo systemctl status docker
sudo docker pull mongo
sudo docker run -d -p 27017:27017 --name mongodb1 mongo
sudo docker ps
sudo docker exec -it mongodb1 mongo
# AVX 지원 문제가 발생하면 다음 구성을 사용한다.
sudo docker stop mongodb1
sudo docker rm mongodb1
sudo docker pull mongo:4.4
sudo docker run -d -p 27017:27017 --name mongodb1 \
  -e MONGO_INITDB_ROOT_USERNAME=$(username) \
  -e MONGO_INITDB_ROOT_PASSWORD=$(password) \
mongo:4.4 
sudo docker ps
sudo docker exec -it mongodb1 mongo

vim /etc/mongod.conf
security:
    authorization: "enabled"
```


## Alias 예시
```shell
alias backstart='cd /workspace/shellscript && ./8080Kill.sh && ./8080start.sh'
alias frontstart='cd /workspace/shellscript && ./3000Kill.sh && ./3000start.sh'
alias backlog='cd /workspace/shellscript && ./8080log.sh'
alias frontlog='cd /workspace/shellscript && ./3000log.sh'
alias backkill='cd /workspace/shellscript && ./8080Kill.sh'
alias frontkill='cd /workspace/shellscript && ./3000Kill.sh'
```

## 드라이브 추가와 바인드 마운트
```shell
lsblk |awk 'NR==1{print $0" DEVICE-ID(S)"}NR>1{dev=$1;printf $0" ";system("find /dev/disk/by-id -lname \"*"dev"\" -printf \" %p\"");print "";}'|grep -v -E 'part|lvm'
sudo lsblk
sudo fdisk /dev/sdb3
sudo mkdir -p /mnt/sdb3
sudo mkfs.ext4 /dev/sdb3
sudo mount /dev/sdb3 /mnt/sdb3
sudo cp -r /server/project/web/* /mnt/sdb3/
sudo mv /server/project/web /server/project/web_backup
sudo mkdir -p /server/project/web
sudo mount --bind /mnt/sdb3 /server/project/web
sudo vim /etc/fstab
df -h 
/dev/sdb3    /mnt/sdb3    ext4    defaults    0    2
/mnt/sdb3    /server/project/web  none    bind    0    0
```

## SQL 백업

데이터베이스 백업 절차는 별도 덤프 명령이나 백업 스크립트로 관리한다.

## Ubuntu Server 기본 CLI 모드
```shell
sudo systemctl set-default multi-user.target
sudo systemctl isolate multi-user.target
sudo systemctl disable gdm
sudo systemctl disable lightdm
sudo reboot

-- return back to gui --
sudo systemctl set-default graphical.target
sudo reboot
```

## Proxmox VM 백업과 복원
```shell
vzdump 101 --storage local --mode snapshot --compress lzo --remove 0
vzdump VMID --storage local --mode snapshot --compress lzo --remove 0
ls /var/lib/vz/dump
qmrestore BACKUP_FILE NEW_VMID
qmrestore /var/lib/vz/dump/vzdump-qemu-101-2024_01_01-12_00_00.vma.lzo 102
```

## Rasa 학습 서버
```shell
sudo apt-get update

sudo apt install -y make build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
    libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev \
    liblzma-dev python3-openssl git

curl https://pyenv.run | bash

echo 'export PATH="$HOME/.pyenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init --path)"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc
source ~/.bashrc

pyenv install 3.8.12
pyenv global 3.8.12

python -m venv rasaenv
source rasaenv/bin/activate

python -m pip install --upgrade pip rasa
python -m rasa --help
python -m rasa init

rasa init --no-prompt
```

## Proxmox Nginx LXC
```
https://tteck.github.io/Proxmox/
```

## sudo
```shell
sudo usermod -aG sudo ${username}
```

## WebDAV 서버 연동
```shell
sudo apt-get update
sudo apt-get install davfs2
sudo mkdir -p ${mount_dir}
sudo mount -t davfs https://${webdav_server}:${port}/${destincation_dir} ${mount_dir}
```

## 네트워크 설정 파일 위치
```shell
[ubuntu] : /etc/netplan/00-installer-config.yaml
[debian] : /etc/network/interfaces 
```

## LXC 드라이브 마운트
```shell
lsblk

fdisk -l
fdisk /dev/${value}
mkfs.ext4 /dev/${value}


mkfs.ext4 /dev/${drive}
mkdir -p /mnt/${value}
mount /dev/${drive} /mnt/${value}

vim /etc/pve/lxc/<container_id>.conf
mp0: /mnt/${value},mp=/mnt/${value}

pct stop <container_id>
pct start <container_id>

pct enter <container_id>
df -h
```
