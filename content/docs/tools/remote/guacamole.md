# Guacamole Docker Compose 설정 및 Nginx Reverse Proxy 구성


## 적용 범위와 운영 계약

이 문서는 Apache Guacamole을 제3자 Docker Compose 저장소로 배포하는 예시입니다. 저장소의 prepare.sh, 이미지, 데이터베이스 스키마와 환경 변수는 공식 Guacamole 배포 자체와 동일한 지원 경계를 갖지 않으므로 검토한 tag 또는 commit을 고정하고 변경 내용을 확인합니다.

- **공급망**: clone 후 스크립트를 실행하기 전에 내용을 검토하고 이미지 digest와 라이선스, 유지보수 상태를 확인합니다.
- **노출 경계**: 8080은 loopback 또는 전용 Docker 네트워크에만 두고 외부 접근은 TLS가 적용된 Nginx를 통합니다. Guacamole 터널에 필요한 HTTP/1.1 및 WebSocket 헤더를 함께 설정합니다.
- **비밀과 계정**: 데이터베이스 비밀번호는 비밀 저장소로 주입하고 기본 guacadmin 계정은 외부 노출 전에 교체 또는 비활성화합니다. 예시 비밀번호를 운영값으로 사용하지 않습니다.
- **데이터 변경**: 기존 데이터 볼륨에서는 환경 변수만 바꿔도 DB 비밀번호가 자동 변경되지 않을 수 있습니다. 데이터베이스와 모든 소비자 설정을 일관되게 회전하고 먼저 백업합니다.
- **완료 조건**: nginx 구문 검사, HTTPS 로그인, 기본 계정 거부, RDP 또는 SSH 세션과 클립보드 정책, WebSocket, 재시작 후 데이터 보존, 백업 복원을 확인합니다.

실패 시 새 컨테이너를 반복 생성하지 말고 Compose 로그, Nginx 로그와 데이터베이스 migration 상태를 보존한 뒤 고정된 이전 이미지와 백업으로 복구합니다.

이 문서는 Guacamole을 Docker Compose로 설치하고, Nginx Reverse Proxy를 설정하여 8080 포트를 매핑하는 방법을 설명합니다. 또한, 데이터베이스 비밀번호를 변경하는 방법도 포함되어 있습니다.

---

## 1. Guacamole Docker Compose 설치

1. **Git 리포지토리 클론**
   ```bash
   git clone --branch <reviewed-tag> --depth 1 "https://github.com/boschkundendienst/guacamole-docker-compose.git"
   ```

2. **프로젝트 디렉토리로 이동**
   ```bash
   cd guacamole-docker-compose
   ```

3. **설치 준비 스크립트 실행**
   ```bash
   # 먼저 내용을 검토한 뒤 승인된 경우에만 실행
./prepare.sh
   ```

4. **Docker Compose 실행**
   ```bash
   docker compose up -d
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
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
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
   sudo nginx -t && sudo systemctl reload nginx
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
         MYSQL_ROOT_PASSWORD_FILE: /run/secrets/guacamole_mysql_root_password
         MYSQL_PASSWORD_FILE: /run/secrets/guacamole_mysql_password
   ```

3. 변경된 비밀번호를 반영하기 위해 컨테이너를 다시 시작합니다:
   ```bash
   docker compose up -d
   ```

---

## 4. Guacamole 실행 확인

1. 웹 브라우저에서 Guacamole 접속:
   ```
   https://your-domain.com
   ```
2. 초기 접속은 외부 노출 전에 제한된 관리망에서 수행하고 기본 자격 증명을 즉시 교체합니다. 기본 로그인 정보:
   - 사용자 이름: `guacadmin`
   - 비밀번호: `guacadmin`

3. 로그인 후 데이터베이스 설정 변경이 필요할 경우 [Guacamole 관리 가이드](https://guacamole.apache.org/doc/gug/)를 참조하세요.

---

## 참고

- Guacamole 공식 문서: [Apache Guacamole](https://guacamole.apache.org/)
- Nginx 공식 문서: [Nginx Documentation](https://nginx.org/en/docs/)
