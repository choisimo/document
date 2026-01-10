아래는 요청하신 내용을 기반으로 작성된 Markdown 파일입니다.

```markdown
# Guacamole Docker Compose 설정 및 Nginx Reverse Proxy 구성

이 문서는 Guacamole을 Docker Compose로 설치하고, Nginx Reverse Proxy를 설정하여 8080 포트를 매핑하는 방법을 설명합니다. 또한, 데이터베이스 비밀번호를 변경하는 방법도 포함되어 있습니다.

---

## 1. Guacamole Docker Compose 설치

1. **Git 리포지토리 클론**
   ```bash
   git clone "https://github.com/boschkundendienst/guacamole-docker-compose.git"
   ```

2. **프로젝트 디렉토리로 이동**
   ```bash
   cd guacamole-docker-compose
   ```

3. **설치 준비 스크립트 실행**
   ```bash
   ./prepare.sh
   ```

4. **Docker Compose 실행**
   ```bash
   docker-compose up -d
   ```

---

## 2. Nginx Reverse Proxy 설정

### Nginx 설치
Nginx가 설치되어 있지 않다면 먼저 설치합니다.
```bash
sudo apt update
sudo apt install nginx
```

### Nginx 설정 파일 작성
1. `/etc/nginx/sites-available/guacamole` 파일을 생성합니다.
   ```bash
   sudo vim /etc/nginx/sites-available/guacamole
   ```

2. 아래 내용을 추가합니다:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. 심볼릭 링크 생성:
   ```bash
   sudo ln -s /etc/nginx/sites-available/guacamole /etc/nginx/sites-enabled/
   ```

4. Nginx 재시작:
   ```bash
   sudo systemctl restart nginx
   ```

---

## 3. 데이터베이스 비밀번호 변경

1. **`docker-compose.yml` 파일 수정**
   ```bash
   vim docker-compose.yml
   ```

2. `mysql` 서비스의 환경 변수에서 `MYSQL_PASSWORD`를 원하는 비밀번호로 변경합니다:
   ```yaml
   services:
     mysql:
       environment:
         MYSQL_ROOT_PASSWORD: new_password
         MYSQL_PASSWORD: new_password
   ```

3. 변경된 비밀번호를 반영하기 위해 컨테이너를 다시 시작합니다:
   ```bash
   docker-compose up -d
   ```

---

## 4. Guacamole 실행 확인

1. 웹 브라우저에서 Guacamole 접속:
   ```
   http://your-domain.com
   ```
2. 기본 로그인 정보:
   - 사용자 이름: `guacadmin`
   - 비밀번호: `guacadmin`

3. 로그인 후 데이터베이스 설정 변경이 필요할 경우 [Guacamole 관리 가이드](https://guacamole.apache.org/doc/gug/)를 참조하세요.

---

## 참고

- Guacamole 공식 문서: [Apache Guacamole](https://guacamole.apache.org/)
- Nginx 공식 문서: [Nginx Documentation](https://nginx.org/en/docs/)
