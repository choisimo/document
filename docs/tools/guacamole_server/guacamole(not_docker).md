Guacamole을 Docker 없이 서버에 직접 설치하려면 아래 단계를 따르면 됩니다. 이는 Guacamole 서버와 클라이언트를 직접 설치하고 Nginx Reverse Proxy를 구성하는 방법입니다.

---

## 1. **필요 패키지 설치**
Guacamole을 설치하기 위해 필요한 Java, Tomcat, MySQL 등 필수 패키지를 설치합니다.

### 1.1 업데이트 및 필수 패키지 설치
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y build-essential libcairo2-dev libjpeg-turbo8-dev libpng-dev \
libtool-bin libossp-uuid-dev libavcodec-dev libavformat-dev libavutil-dev \
libswscale-dev freerdp2-dev libpango1.0-dev libssh2-1-dev libtelnet-dev \
libvncserver-dev libpulse-dev libssl-dev libvorbis-dev libwebp-dev \
mysql-server mysql-client
```

---

## 2. **Guacamole 서버 및 클라이언트 설치**

### 2.1 Guacamole 소스코드 다운로드
Apache Guacamole의 최신 릴리스를 다운로드합니다:
```bash
wget https://downloads.apache.org/guacamole/1.5.5/source/guacamole-server-1.5.5.tar.gz
tar -xvzf guacamole-server-1.5.0.tar.gz
cd guacamole-server-1.5.0
```

### 2.2 빌드 및 설치
Guacamole 서버를 컴파일하고 설치합니다:
```bash
./configure --with-init-dir=/etc/init.d
make
sudo make install
sudo ldconfig
```

### 2.3 Guacamole 서버 실행
```bash
sudo systemctl enable guacd
sudo systemctl start guacd
```

---

## 3. **Tomcat 및 Guacamole 클라이언트 설치**

### 3.1 Tomcat 설치
```bash
sudo apt install -y tomcat10
```

### 3.2 Guacamole 클라이언트 다운로드 및 설정
1. 클라이언트 `.war` 파일을 다운로드합니다:
   ```bash
   wget https://downloads.apache.org/guacamole/1.5.0/binary/guacamole-1.5.0.war
   ```
2. 다운로드한 파일을 Tomcat 디렉토리로 이동합니다:
   ```bash
   sudo mv guacamole-1.5.0.war /var/lib/tomcat9/webapps/guacamole.war
   ```
3. Tomcat을 재시작합니다:
   ```bash
   sudo systemctl restart tomcat9
   ```

---

## 4. **MySQL 데이터베이스 설정**

### 4.1 MySQL 데이터베이스 생성
```bash
sudo mysql -u root -p
```

MySQL 쉘에서 아래 명령을 실행:
```sql
CREATE DATABASE guacamole_db;
CREATE USER 'guacamole_user'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT,INSERT,UPDATE,DELETE ON guacamole_db.* TO 'guacamole_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.2 Guacamole SQL 스크립트 적용
다운로드한 Guacamole 서버 소스에서 SQL 스크립트를 가져옵니다:
```bash
wget https://downloads.apache.org/guacamole/1.5.0/binary/guacamole-auth-jdbc-1.5.0.tar.gz
tar -xvzf guacamole-auth-jdbc-1.5.0.tar.gz
cd guacamole-auth-jdbc-1.5.0/mysql/
cat schema/*.sql | sudo mysql -u root -p guacamole_db
```

---

## 5. **Guacamole 설정 파일 구성**

### 5.1 `guacamole.properties` 파일 생성
Guacamole 설정 파일을 생성합니다:
```bash
sudo mkdir /etc/guacamole
sudo vim /etc/guacamole/guacamole.properties
```

아래 내용을 추가합니다:
```plaintext
guacd-hostname: localhost
guacd-port: 4822
auth-provider: jdbc
jdbc-driver: mysql
jdbc-hostname: localhost
jdbc-port: 3306
jdbc-database: guacamole_db
jdbc-username: guacamole_user
jdbc-password: password
```

### 5.2 설정 파일을 Tomcat에 연결
```bash
sudo ln -s /etc/guacamole /usr/share/tomcat9/.guacamole
```

---

## 6. **Nginx Reverse Proxy 설정**

1. Nginx를 설치합니다:
   ```bash
   sudo apt install nginx
   ```

2. `/etc/nginx/sites-available/guacamole` 파일을 생성합니다:
   ```bash
   sudo vim /etc/nginx/sites-available/guacamole
   ```

3. 아래 내용을 추가합니다:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8080/guacamole/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. 설정을 활성화하고 Nginx를 재시작합니다:
   ```bash
   sudo ln -s /etc/nginx/sites-available/guacamole /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

---

## 7. **Guacamole 실행 확인**

1. 브라우저에서 Guacamole에 접속:
   ```
   http://your-domain.com
   ```
2. 기본 로그인 정보:
   - 사용자 이름: `guacadmin`
   - 비밀번호: `guacadmin`

---

## 8. **성능 최적화**

1. **guacd 및 Tomcat 튜닝**:
   - `guacd`의 스레드 수를 조정해 성능을 개선.
   - Tomcat 메모리 설정을 늘리기 위해 `/etc/default/tomcat9` 파일에서 `JAVA_OPTS` 값을 조정.

2. **Nginx 압축 설정**:
   `/etc/nginx/nginx.conf`에서 `gzip`을 활성화해 트래픽 압축.

---

이 단계들을 완료하면 Docker 없이 Guacamole이 서버에 직접 설치됩니다. 추가적인 문제가 있으면 말씀해주세요!