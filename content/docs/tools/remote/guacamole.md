# Apache Guacamole

Apache Guacamole은 브라우저만으로 RDP, VNC, SSH 같은 원격 접속을 중계하는 클라이언트리스 원격 데스크톱 게이트웨이다. 사용자는 웹 UI에 로그인하고, Guacamole은 내부의 원격 호스트와 세션을 연결한다.

## 적용 범위와 운영 계약

이 문서는 공식 Guacamole·guacd image와 MariaDB의 Compose 구성 형태를 설명합니다. 검토한 호환 release와 image digest를 고정하며, 제3자 배포 저장소나 prepare script를 추가할 경우 그 출처·변경·지원 경계를 별도로 검토합니다.

- **공급망**: Guacamole와 guacd의 호환 release, database image, schema 초기화·migration script의 출처를 확인하고 image digest와 license·유지보수 상태를 기록합니다.
- **노출 경계**: 8080은 loopback 또는 전용 Docker 네트워크에만 두고 외부 접근은 TLS가 적용된 Nginx를 통합니다. Guacamole 터널에 필요한 HTTP/1.1 및 WebSocket 헤더를 함께 설정합니다.
- **비밀과 계정**: 데이터베이스 비밀번호는 비밀 저장소로 주입하고 기본 guacadmin 계정은 외부 노출 전에 교체 또는 비활성화합니다. 예시 비밀번호를 운영값으로 사용하지 않습니다.
- **데이터 변경**: 기존 데이터 볼륨에서는 환경 변수만 바꿔도 DB 비밀번호가 자동 변경되지 않을 수 있습니다. 데이터베이스와 모든 소비자 설정을 일관되게 회전하고 먼저 백업합니다.
- **완료 조건**: nginx 구문 검사, HTTPS 로그인, 기본 계정 거부, RDP 또는 SSH 세션과 클립보드 정책, WebSocket, 재시작 후 데이터 보존, 백업 복원을 확인합니다.

실패 시 새 컨테이너를 반복 생성하지 말고 Compose 로그, Nginx 로그와 데이터베이스 migration 상태를 보존한 뒤 고정된 이전 이미지와 백업으로 복구합니다.

## 1. 왜 필요한가? (Pain Point & Motivation)

원격 서버마다 RDP, VNC, SSH 포트를 직접 열어 두면 접근 제어와 감사가 흩어진다. 사용자는 각자 클라이언트를 설치해야 하고, 관리자는 방화벽, 계정, 접속 기록을 서버별로 관리해야 한다.

Guacamole의 목적은 원격 접속의 진입점을 하나로 모으는 것이다. 외부에는 HTTPS 웹 포털만 노출하고, 내부에서는 Guacamole이 필요한 프로토콜로 대상 서버에 접속한다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 Guacamole을 검토한다.

- 여러 내부 서버에 RDP, VNC, SSH로 접속해야 한다.
- 외부 사용자에게 로컬 클라이언트 설치 없이 원격 접속을 제공해야 한다.
- 원격 접속 권한을 사용자나 그룹 단위로 관리하고 싶다.
- 직접 포트포워딩한 원격 접속 포트를 줄이고 싶다.
- 접속 대상과 계정 정보를 중앙에서 관리하고 싶다.

단, Guacamole은 인증과 권한을 대체하는 게 아니라 원격 접속 게이트웨이다. 내부 서버 계정 관리, 네트워크 분리, MFA, 로그 보존 정책은 별도로 설계해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

운영 가능한 Guacamole 구성은 다음 상태를 만족해야 한다.

- 외부에는 HTTPS reverse proxy만 노출한다.
- `guacd`, Guacamole 웹 애플리케이션, 인증 데이터베이스의 역할이 분리되어 있다.
- 기본 관리자 계정과 기본 비밀번호는 제한된 관리 경로에서 최초 외부 노출 전에 교체하거나 제거한다.
- 사용자별로 접속 가능한 원격 호스트가 제한되어 있다.
- 데이터베이스와 설정 값이 백업된다.
- 원격 대상 서버는 필요한 포트만 Guacamole에서 접근할 수 있다.
- 관리자 화면은 공개 인터넷에 그대로 방치하지 않는다.

## 4. 시스템 번역 (Data Flow)

Guacamole의 기본 흐름은 다음과 같다.

```text
브라우저
  -> HTTPS reverse proxy
  -> Guacamole web application
  -> guacd
  -> RDP/VNC/SSH 대상 서버
```

사용자는 브라우저에서만 세션을 본다. 실제 원격 프로토콜 연결은 `guacd`가 대상 서버와 맺는다. 따라서 방화벽 관점에서는 "사용자 -> 대상 서버"가 아니라 "Guacamole 서버 -> 대상 서버" 접근을 허용해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

- Guacamole web application: 로그인, 사용자 관리, 연결 선택, 브라우저 세션을 담당한다.
- `guacd`: RDP, VNC, SSH 같은 원격 프로토콜을 중계하는 프록시 데몬이다.
- 인증 저장소: 사용자, 권한, 연결 설정을 저장한다. MySQL, PostgreSQL 같은 데이터베이스 구성을 주로 사용한다.
- Reverse proxy: TLS 종료, 도메인 연결, 보안 헤더, 접근 제한을 담당한다.
- Remote connection: 대상 호스트, 포트, 프로토콜, 사용자 인증 정보를 포함한다.
- Network policy: Guacamole 컨테이너가 어떤 내부 서버에 접근할 수 있는지 제한한다.
- Backup: 인증 데이터베이스와 배포 설정을 함께 보관한다.

## 6. 상태 전이 (State Transition)

원격 접속 세션은 다음 상태를 지난다.

```text
unauthenticated
  -> authenticated
  -> connection_selected
  -> remote_session_open
  -> disconnected
```

- `unauthenticated`: 웹 포털에 로그인하기 전이다.
- `authenticated`: Guacamole 사용자 인증이 끝났다.
- `connection_selected`: 사용자가 허용된 원격 연결을 선택했다.
- `remote_session_open`: `guacd`가 대상 서버와 세션을 열었다.
- `disconnected`: 사용자가 종료했거나 네트워크 문제로 연결이 끊겼다.

권한 검사는 `connection_selected` 전에 끝나야 한다. 사용자가 볼 수 없는 연결은 선택 목록에도 나타나지 않아야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 기본 계정 `guacadmin`과 기본 비밀번호 `guacadmin`이 남아 있으면 안 된다.
- 외부 공개는 HTTP가 아니라 HTTPS 뒤에서만 허용한다.
- Guacamole 웹 포털과 대상 서버 포트를 모두 인터넷에 공개하지 않는다.
- 데이터베이스 비밀번호, 원격 서버 비밀번호, SSH 개인키는 Compose 파일에 평문으로 커밋하지 않는다.
- 사용자 권한은 최소 권한 원칙으로 부여한다.
- Guacamole 서버가 접근할 수 있는 내부 네트워크 범위를 제한한다.
- 데이터베이스 스키마 초기화와 애플리케이션 버전을 맞춘다.
- 백업에는 데이터베이스와 배포 설정이 함께 포함되어야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

공식 이미지를 사용하는 최소 구성의 형태는 다음과 같다. 실제 운영 전에는 선택한 Guacamole 버전의 공식 Docker 문서에서 환경 변수와 초기화 절차를 확인해야 한다.

```yaml
services:
  guacd:
    image: "${GUACD_IMAGE:?set reviewed compatible guacd tag or digest}"
    restart: unless-stopped

  db:
    image: "${GUACAMOLE_DB_IMAGE:?set reviewed compatible MariaDB 11 tag or digest}"
    restart: unless-stopped
    environment:
      MARIADB_DATABASE: guacamole
      MARIADB_USER: guacamole
      MARIADB_PASSWORD_FILE: /run/secrets/guacamole_db_password
      MARIADB_ROOT_PASSWORD_FILE: /run/secrets/guacamole_db_root_password
    volumes:
      - guacamole_db:/var/lib/mysql
    secrets:
      - guacamole_db_password
      - guacamole_db_root_password

  guacamole:
    image: "${GUACAMOLE_IMAGE:?set reviewed Guacamole tag or digest}"
    restart: unless-stopped
    depends_on:
      - guacd
      - db
    environment:
      GUACD_HOSTNAME: guacd
      MYSQL_HOSTNAME: db
      MYSQL_DATABASE: guacamole
      MYSQL_USERNAME: guacamole
      MYSQL_PASSWORD: "${GUACAMOLE_DB_PASSWORD:?provide the same database secret}"
    ports:
      - "127.0.0.1:8080:8080"

volumes:
  guacamole_db:
secrets:
  guacamole_db_password:
    environment: GUACAMOLE_DB_PASSWORD
  guacamole_db_root_password:
    environment: GUACAMOLE_DB_ROOT_PASSWORD
```

DB의 두 비밀은 제한된 실행 환경에서 주입하고 environment-backed secrets 지원을 `docker compose config --quiet`로 확인한다. Guacamole와 guacd의 release를 맞춘다. 이 Compose 형태만으로 schema가 초기화되지 않으므로 첫 기동 전 선택한 release의 공식 SQL을 새 DB에 적용한다. 기존 DB에는 초기화 SQL을 다시 넣지 않고 필요한 migration을 검토한다.

인증과 기본 계정 교체를 제한된 경로에서 확인한 뒤 Nginx를 노출한다. 아래 인증서 파일은 미리 발급·배치한 실제 도메인 경로로 맞추며 내부 포트만 프록시한다.

```nginx
server {
    listen 443 ssl;
    server_name remote.example.com;
    ssl_certificate /etc/letsencrypt/live/remote.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/remote.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080/guacamole/;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

초기화와 환경 변수는 [Guacamole DB 설정](https://guacamole.apache.org/doc/gug/mysql-auth.html), tunnel proxy는 [공식 Nginx 가이드](https://guacamole.apache.org/doc/gug/reverse-proxy.html)를 선택한 release에 맞춰 확인한다. `sudo nginx -t && sudo systemctl reload nginx`로 구문 성공 때에만 reload한다. HTTP tunnel·WebSocket·로그인·연결 저장과 기본 계정 거부를 각각 시험한다. forwarded IP를 감사 근거로 쓰려면 Tomcat RemoteIpValve와 신뢰할 proxy 주소를 별도로 제한해 검증한다.

## 9. 실패 사례 (What could go wrong?)

- 기본 관리자 계정을 남겨 외부에서 계정 탈취가 발생한다.
- `8080` 포트를 `0.0.0.0`에 공개해 reverse proxy 접근 제어를 우회한다.
- 데이터베이스를 초기화하지 않아 Guacamole 웹 앱이 인증 저장소를 찾지 못한다.
- RDP, VNC, SSH 대상 서버의 방화벽이 Guacamole 서버 접근을 허용하지 않는다.
- 프록시 경로와 Guacamole 컨텍스트 경로가 맞지 않아 정적 파일이나 웹소켓 연결이 깨진다.
- 원격 서버 계정 비밀번호를 Compose 파일에 직접 적어 저장소에 노출한다.
- 데이터베이스만 백업하고 Compose 설정과 TLS 인증서 갱신 절차를 빠뜨린다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 내부망에서 한 명의 관리자와 한 개의 SSH 연결로 검증한다. 이후 다음 순서로 확장한다.

- 사용자와 연결 권한을 분리한다.
- RDP, VNC, SSH 연결별 네트워크 접근을 제한한다.
- reverse proxy에 SSO, MFA, IP allowlist 같은 추가 보호 계층을 붙인다.
- 접속 로그 보존 기간과 감사 절차를 정한다.
- 데이터베이스 백업과 복구 리허설을 자동화한다.
- 외부 사용자용 Guacamole과 내부 관리자용 Guacamole을 분리한다.
- VPN 또는 Zero Trust 터널 뒤에 배치해 공개 노출면을 줄인다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `guacd`, 웹 애플리케이션, 데이터베이스 역할을 분리했다.
- [ ] 기본 관리자 계정을 변경하거나 제거했다.
- [ ] 외부 공개는 HTTPS reverse proxy 뒤에서만 허용했다.
- [ ] `8080` 같은 내부 포트는 로컬 또는 내부망에만 바인딩했다.
- [ ] 사용자별 연결 권한을 최소 권한으로 설정했다.
- [ ] 원격 서버 비밀번호와 SSH 키를 저장소에 커밋하지 않았다.
- [ ] 데이터베이스 스키마 초기화 절차를 버전과 함께 기록했다.
- [ ] 데이터베이스와 배포 설정의 복구 절차를 테스트했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Guacamole은 원격 서버 포트를 직접 여는 도구가 아니라, `____`만 외부에 노출하고 내부에서는 `____`가 대상 서버로 접속하게 만드는 `____`다.
