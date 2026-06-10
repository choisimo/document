# Nginx Proxy Manager 운영

이 문서는 Nginx Proxy Manager를 Docker Compose로 실행하고 reverse proxy host, Let's Encrypt certificate, access list, backup을 관리하는 기준을 정리한다. 목표는 UI로 쉽게 설정하되 admin port와 저장 데이터의 위험을 놓치지 않는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Nginx Proxy Manager는 Nginx reverse proxy와 certificate 관리를 웹 UI로 단순화한다. 하지만 편리한 UI는 admin port, default credential, database, certificate private key라는 새로운 운영 자산을 만든다.

관리 UI를 인터넷에 그대로 노출하거나 `/data`, `/etc/letsencrypt`를 백업하지 않으면 proxy 설정과 인증서를 잃거나 공격면을 키우게 된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Docker Compose, SQLite와 MariaDB, 초기 로그인, proxy host, SSL, access list, stream, troubleshooting, backup을 설명한다. 보완해야 할 점은 다음과 같다.

- Admin UI port `81`이 public으로 열리는 예제가 먼저 나온다.
- Image가 `latest`로 고정되어 재현성이 약하다.
- 공식 문서의 최신 setup 흐름과 오래된 DB 예제가 섞일 수 있다.
- Backup 대상과 restore 검증이 더 앞에 와야 한다.
- Default credential 변경이 가장 중요한 초기 작업으로 강조되어야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 만드는 것이다.

- Public port는 HTTP `80`, HTTPS `443`만 연다.
- Admin UI `81/tcp`는 localhost, VPN, 또는 내부망으로 제한한다.
- Image tag를 의도적으로 선택한다.
- `/data`와 `/etc/letsencrypt`가 persistent volume에 저장된다.
- 첫 로그인 직후 default admin credential을 변경한다.
- Proxy Host는 DNS, backend reachability, certificate 발급을 검증한다.
- Backup과 restore 절차가 문서화되어 있다.

## 4. 시스템 번역 (Data Flow)

요청 흐름은 다음과 같다.

```text
client HTTPS request
  -> Nginx Proxy Manager ports 80 or 443
  -> generated Nginx proxy config
  -> internal service host and port
  -> response back to client
```

관리 흐름은 다음과 같다.

```text
admin browser
  -> restricted port 81
  -> NPM UI and API
  -> database state in /data
  -> certificates in /etc/letsencrypt
```

Proxy traffic과 admin traffic을 같은 공개 범위에 두지 않는다.

## 5. 핵심 구성요소 (Building Blocks)

NPM container는 Nginx, API, UI를 포함한다.

Port `80`은 HTTP와 Let's Encrypt HTTP-01 challenge에 필요하다.

Port `443`은 HTTPS traffic을 처리한다.

Port `81`은 admin UI다. 외부 공개 기본값으로 두지 않는다.

`/data`는 database, generated config, JWT key 등 운영 상태를 담는다.

`/etc/letsencrypt`는 certificate와 private key를 담는다.

Proxy Host는 domain과 forward host/port를 연결하는 기본 단위다.

Access List는 basic auth 또는 IP 제한 같은 접근 제어를 적용한다.

## 6. 상태 전이 (State Transition)

초기 설치 상태는 다음과 같다.

```text
compose file written
  -> container running
  -> initial database created
  -> default admin login
  -> admin credential changed
  -> proxy host created
  -> certificate issued
  -> request verified
```

장애 진단 상태는 다음과 같다.

```text
proxy error
  -> DNS points to NPM
  -> public ports reachable
  -> certificate status checked
  -> backend reachable from container
  -> NPM logs checked
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Admin UI port `81`을 public internet에 열지 않는다.
- 첫 로그인 직후 default credential을 변경한다.
- Image tag를 선택하고 upgrade 전 release note를 확인한다.
- `/data`와 `/etc/letsencrypt`를 함께 백업한다.
- Certificate private key는 secret으로 취급한다.
- Proxy Host 생성 전 DNS가 NPM public IP를 가리키는지 확인한다.
- Backend host와 port가 NPM container에서 접근 가능한지 확인한다.
- HTTP-01 certificate를 쓰면 port `80`이 외부에서 접근 가능해야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

작업 디렉터리를 만든다.

```bash
sudo mkdir -p /opt/nginx-proxy-manager
cd /opt/nginx-proxy-manager
```

Admin UI는 localhost에만 bind한다.

```yaml
services:
  app:
    image: jc21/nginx-proxy-manager:2.14.0
    restart: unless-stopped
    ports:
    - "80:80"
    - "443:443"
    - "127.0.0.1:81:81"
    environment:
      TZ: "Asia/Seoul"
    volumes:
    - ./data:/data
    - ./letsencrypt:/etc/letsencrypt
```

실행한다.

```bash
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=100
```

Admin UI에 SSH tunnel로 접속한다.

```bash
ssh -L 8081:127.0.0.1:81 user@proxy.example.com
```

브라우저에서 접속한다.

```text
http://127.0.0.1:8081
```

초기 계정은 공식 setup 문서 기준으로 생성된다. 첫 로그인 직후 관리자 이메일과 비밀번호를 변경한다.

```text
Email: admin@example.com
Password: changeme
```

Proxy Host 생성 전 DNS를 확인한다.

```bash
dig app.example.com
curl -I http://app.example.com
```

Backend가 NPM container에서 보이는지 확인한다.

```bash
sudo docker exec -it nginx-proxy-manager curl -I http://192.168.1.10:3000
```

Proxy Host UI 설정 기준은 다음과 같다.

```text
Domain Names: app.example.com
Scheme: http
Forward Hostname/IP: 192.168.1.10
Forward Port: 3000
Websockets Support: enable only if needed
SSL Certificate: Request a new SSL Certificate
Force SSL: enable after certificate issue succeeds
```

Backup을 만든다.

```bash
sudo tar -czf npm-backup-$(date +%Y%m%d).tar.gz -C /opt nginx-proxy-manager/data nginx-proxy-manager/letsencrypt
```

복원은 container를 내린 뒤 같은 경로에 풀고 다시 올린다.

```bash
sudo docker compose down
sudo tar -xzf npm-backup-YYYYMMDD.tar.gz -C /opt
sudo docker compose up -d
```

## 9. 실패 사례 (What could go wrong?)

Admin UI `81/tcp`를 public으로 열면 credential stuffing과 취약점 공격면이 된다. VPN, SSH tunnel, internal network, reverse proxy access control을 사용한다.

`latest` tag로 upgrade하면 예기치 않은 major change가 들어올 수 있다. Tag를 pin하고 upgrade를 별도 작업으로 처리한다.

DNS가 아직 NPM 서버를 가리키지 않으면 Let's Encrypt HTTP-01 인증서 발급이 실패한다.

Port `80`이 다른 Nginx나 Apache와 충돌하면 HTTP challenge와 redirect가 실패한다.

Backend가 host에서는 보이지만 container network에서는 안 보일 수 있다. NPM container 안에서 curl로 확인한다.

`/data`만 백업하고 `/etc/letsencrypt`를 빼면 certificate와 private key를 잃을 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

Public proxy 역할과 admin 역할을 분리하려면 port `81`을 localhost에 bind하고 SSH tunnel이나 VPN으로만 접근하는 구성이 단순하고 안전하다.

여러 service가 같은 Docker host에 있다면 NPM과 backend를 같은 user-defined network에 붙이고 service name으로 forward할 수 있다.

규모가 커지면 UI 수동 설정보다 Terraform provider, API, GitOps 방식으로 proxy 설정을 관리할지 검토한다. 이 경우에도 NPM database backup은 필요하다.

공식 문서는 image tag와 database option을 갱신하므로 설치 전 확인한다.

- Nginx Proxy Manager setup: <https://nginxproxymanager.com/setup/>
- Nginx Proxy Manager develop setup: <https://develop.nginxproxymanager.com/setup/>
- Nginx Proxy Manager upgrading: <https://nginxproxymanager.com/upgrading/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Image tag를 의도적으로 선택했다.
- [ ] Admin UI port는 localhost, VPN, 또는 내부망으로 제한했다.
- [ ] 첫 로그인 후 default credential을 변경했다.
- [ ] `/data`와 `/etc/letsencrypt`를 persistent storage에 둔다.
- [ ] DNS가 NPM public IP를 가리킨다.
- [ ] Port `80`과 `443`이 외부에서 접근 가능하다.
- [ ] Backend가 NPM container에서 접근 가능하다.
- [ ] Certificate 발급과 Force SSL 적용을 검증했다.
- [ ] Backup과 restore 절차를 테스트했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Nginx Proxy Manager는 Nginx 설정을 쉽게 만드는 대신 admin UI, database, certificate key라는 운영 자산을 만든다. Public traffic은 80/443으로 받고, admin port와 `/data`, `/etc/letsencrypt`는 보호해야 한다.
