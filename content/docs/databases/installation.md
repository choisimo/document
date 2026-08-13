# 데이터베이스 및 애플리케이션 컨테이너화 및 호스트 설치 가이드

> 이 명령들은 로컬 학습용 구성 예시이며 현재 배포판과 이미지에서 검증된 운영 절차가 아닙니다. 그대로 인터넷에 노출하지 마세요.

## 실행 전 계약

- 대상 OS, CPU 아키텍처, DB·컨테이너 이미지 버전과 신뢰할 저장소를 고정합니다. `latest` 또는 배포판 기본 버전은 재현 가능한 사양이 아닙니다.
- 예시 암호, 자체 서명 인증서, `0.0.0.0/0`, 호스트 포트 공개는 운영 금지 항목입니다. 비밀 저장소, 조직 CA, 신뢰 CIDR과 방화벽 정책으로 교체합니다.
- 설치 완료는 프로세스 기동이 아니라 인증된 TLS 연결, 최소 권한 계정, 영속 볼륨, 재시작, 백업·복원과 로그 확인까지 포함합니다.
- 변경 전 기존 데이터 백업과 롤백 절차를 만들고, 실패한 단계에서 부분 생성된 컨테이너·사용자·인증서를 어떻게 정리할지 기록합니다.

## MySQL/MariaDB
### Docker 설치 (SSL 포함)
```bash
# 인증서 생성
mkdir -p ~/mysql-certs && cd ~/mysql-certs
openssl req -x509 -newkey rsa:4096 -nodes -days 365 \
  -keyout server-key.pem -out server-cert.pem \
  -subj "/CN=mysql.docker.local"

# 컨테이너 실행
docker run -d --name mysql \
  -v mysql_data:/var/lib/mysql \
  -v $(pwd):/etc/mysql/certs \
  -e MYSQL_ROOT_PASSWORD=securepass \
  -e MYSQL_SSL_CERT=/etc/mysql/certs/server-cert.pem \
  -e MYSQL_SSL_KEY=/etc/mysql/certs/server-key.pem \
  -p 3306:3306 \
  mysql:8.0 \
  --ssl-ca=/etc/mysql/certs/server-cert.pem \
  --ssl-cert=/etc/mysql/certs/server-cert.pem \
  --ssl-key=/etc/mysql/certs/server-key.pem
```

### 호스트 설치 (Ubuntu)
```bash
sudo apt-get update && sudo apt-get install mysql-server
sudo mysql_secure_installation

# SSL 설정
sudo mysql_ssl_rsa_setup --uid=mysql
sudo systemctl restart mysql

# 외부 접속 허용
sudo sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo ufw allow 3306/tcp
```

## PostgreSQL
### Docker 설치 (SSL 포함)
```bash
docker run -d --name postgres \
  -v pg_data:/var/lib/postgresql/data \
  -v $(pwd)/certs:/certs \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  postgres:15 \
  -c ssl=on \
  -c ssl_cert_file=/certs/server.crt \
  -c ssl_key_file=/certs/server.key
```

### 호스트 설치 (Let's Encrypt 활용)
```bash
sudo apt-get install postgresql-15 certbot
sudo certbot certonly --standalone -d postgres.example.com

# 인증서 연결
sudo cp /etc/letsencrypt/live/postgres.example.com/* /etc/postgresql/15/main/
sudo chown postgres:postgres /etc/postgresql/15/main/*.pem
sudo systemctl restart postgresql

# pg_hba.conf 수정
# <trusted-client-cidr>를 실제 사설 CIDR로 바꾸고 현재 PostgreSQL의 SCRAM 정책을 확인
hostssl all all <trusted-client-cidr> scram-sha-256 clientcert=verify-ca
```

## Redis
### Docker TLS 설정
```bash
# TLS 설정 파일 생성
openssl genrsa -out redis.key 2048
openssl req -new -x509 -key redis.key -out redis.crt -days 365

docker run -d --name redis \
  -v $(pwd)/tls:/tls \
  -p 6379:6379 \
  redis:7.2 \
  --tls-port 6379 \
  --port 0 \
  --tls-cert-file /tls/redis.crt \
  --tls-key-file /tls/redis.key \
  --requirepass "securepassword"
```

### 호스트 설치 (Ubuntu)
```bash
sudo add-apt-repository ppa:redislabs/redis
sudo apt-get install redis-server

# TLS 설정
sudo mkdir /etc/redis/tls
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/redis/tls/redis.key \
  -out /etc/redis/tls/redis.crt

sudo systemctl restart redis-server
```

## RabbitMQ
### Docker TLS 구성
```bash
docker run -d --name rabbitmq \
  -v rabbitmq_certs:/etc/rabbitmq/certs \
  -p 5671:5671 -p 15672:15672 \
  rabbitmq:3.12-management \
  rabbitmq-plugins enable rabbitmq_auth_mechanism_ssl
```

### 호스트 설치 및 인증서 설정
```bash
# Erlang 설치
curl -s https://packagecloud.io/install/repositories/rabbitmq/erlang/script.deb.sh | sudo bash
sudo apt-get install erlang

# RabbitMQ 설치
curl -s https://packagecloud.io/install/repositories/rabbitmq/rabbitmq-server/script.deb.sh | sudo bash
sudo apt-get install rabbitmq-server

# 인증서 생성
sudo rabbitmqctl create_user admin securepass
sudo rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
sudo rabbitmq-plugins enable rabbitmq_management rabbitmq_auth_mechanism_ssl
```

## Kavita (전자책 관리 시스템)
### Docker 설치
```bash
docker run -d --name kavita \
  -v /path/to/books:/books \
  -v /path/to/config:/kavita/config \
  -p 5000:5000 \
  --restart unless-stopped \
  kizaing/kavita:latest
```

### 리버스 프록시 설정 (Nginx)
```nginx
server {
    listen 443 ssl;
    server_name kavita.example.com;

    ssl_certificate /etc/letsencrypt/live/kavita.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kavita.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 공통 보안 설정 가이드
1. **방화벽 규칙**: `sudo ufw allow [포트번호]/tcp`
2. **인증서 갱신**: Certbot 자동 갱신 설정
```bash
sudo certbot renew --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"
```
3. **접근 제어**: IP 화이트리스트 설정
```nginx
allow 192.168.1.0/24;
deny all;
```

## 문제 해결 체크리스트
1. 컨테이너 로그 확인: `docker logs [컨테이너명]`
2. 포트 개방 상태 확인: `sudo ss -tulwn | grep [포트번호]`
3. 인증서 권한 확인: `ls -l [인증서경로]`
4. SELinux/AppArmor 정책 점검
