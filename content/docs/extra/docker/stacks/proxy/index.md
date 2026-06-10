# Proxy Docker Stacks 학습 및 기록 노트

Proxy 카테고리는 리버스 프록시와 정적 파일 제공 계층을 담당한다. 현재는 Nginx 스택 하나가 있으며, Compose는 80과 443 포트를 열지만 기본 `nginx.conf`는 80번 HTTP 정적 파일 서버만 정의한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

프록시는 여러 내부 서비스를 외부에 노출하는 관문이다. 설정이 단순해 보여도 TLS, Host 헤더, WebSocket, 업스트림 연결, 로그, 인증, 정적 파일 경로가 함께 맞아야 한다. 특히 443 포트를 열었다고 TLS가 자동으로 설정되는 것은 아니다.

Proxy 문서의 목적은 포트 공개와 실제 Nginx 설정의 차이를 분명히 하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/proxy/nginx`에는 다음 파일이 있다.

- `docker-compose.yaml`: `nginx:alpine`, 포트 `80:80`, `443:443`, 설정/정적 파일/로그/ssl 디렉터리 마운트
- `config/nginx.conf`: `listen 80` 서버 블록과 `/usr/share/nginx/html` 정적 파일 root
- `.gitignore`: `conf.d/`, `test-git.sh` 제외

검증 결과 `docker compose config`는 성공한다. 다만 현재 기본 Nginx 설정에는 `listen 443 ssl` 서버 블록이 없다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Compose에서 공개한 포트와 Nginx 설정이 일치한다.
- 정적 파일 서버인지 리버스 프록시인지 목적을 먼저 정한다.
- TLS를 사용할 경우 인증서 경로와 `listen 443 ssl` 설정을 추가한다.
- 업스트림 서비스와 같은 Docker 네트워크에 있는지 확인한다.
- 로그 디렉터리와 설정 디렉터리를 운영자가 확인할 수 있게 마운트한다.

## 4. 시스템 번역 (Data Flow)

현재 기본 흐름은 다음과 같다.

```text
client
  -> host:80
  -> nginx container
  -> /usr/share/nginx/html
```

리버스 프록시로 확장하면 흐름은 다음처럼 바뀐다.

```text
client
  -> host:80 or host:443
  -> nginx server block
  -> upstream service
  -> application container
```

이때 upstream service 이름은 Nginx 컨테이너가 속한 Docker 네트워크에서 해석 가능해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 현재 상태 |
| --- | --- | --- |
| `docker-compose.yaml` | Nginx 컨테이너와 포트/볼륨 정의 | `80`, `443` 공개 |
| `config/nginx.conf` | 최상위 Nginx 설정 | HTTP 정적 서버 |
| `config/conf.d` | 추가 server block 위치 | `.gitignore` 대상 |
| `html` | 정적 파일 root | `/usr/share/nginx/html` 마운트 |
| `logs` | 접근/오류 로그 | `/var/log/nginx` 마운트 |
| `ssl` | 인증서 파일 위치 | `/etc/nginx/ssl` 읽기 전용 마운트 |

현재 기본 설정은 정적 파일 제공에 가깝다. 리버스 프록시로 쓰려면 `proxy_pass`와 관련 헤더를 추가해야 한다.

## 6. 상태 전이 (State Transition)

Proxy 스택 구성 흐름은 다음과 같다.

```text
목적 결정
  -> 설정 파일 작성
  -> 인증서와 정적 파일 준비
  -> docker compose config
  -> nginx 설정 테스트
  -> 기동
  -> HTTP/TLS/업스트림 검증
```

상태별 통과 기준은 다음과 같다.

- 목적 결정: 정적 파일 서버인지 리버스 프록시인지 명확하다.
- 설정 작성: 공개 포트와 `listen` 지시자가 일치한다.
- 인증서 준비: 443을 쓸 경우 인증서와 키 경로가 존재한다.
- 설정 테스트: 컨테이너 안에서 `nginx -t`가 성공한다.
- 검증: `curl`로 Host 헤더와 업스트림 응답을 확인한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 443 포트를 열었다고 TLS가 자동 설정된 것으로 간주하지 않는다.
- 인증서와 private key는 저장소에 커밋하지 않는다.
- 리버스 프록시 대상 서비스는 Nginx와 같은 네트워크에서 이름 해석이 가능해야 한다.
- WebSocket이 필요한 서비스는 `Upgrade`와 `Connection` 헤더를 전달한다.
- 로그는 컨테이너 삭제 후에도 확인할 수 있는 경로에 둔다.
- 설정 변경 후 `nginx -t`를 통과하기 전에는 재기동하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 스택의 렌더링 확인은 다음과 같다.

```bash
cd infra/docker/stacks/proxy/nginx
mkdir -p config/conf.d html logs ssl
docker compose config
docker compose up -d
docker compose ps
```

Nginx 설정 테스트는 컨테이너 안에서 실행한다.

```bash
docker compose exec nginx nginx -t
```

현재 기본 HTTP 정적 응답은 다음처럼 확인한다.

```bash
curl -I http://127.0.0.1/
```

리버스 프록시 server block을 추가할 때는 `config/conf.d` 아래에 별도 파일로 둔다.

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 443 포트 공개와 TLS 설정을 혼동하는 것이다. 현재 Compose는 443을 열지만 기본 `nginx.conf`에는 SSL server block이 없다.

두 번째 실패는 `conf.d` 디렉터리가 비어 있는데 리버스 프록시가 설정됐다고 생각하는 것이다. 실제 server block 파일을 마운트해야 한다.

세 번째 실패는 upstream 이름이 Docker 네트워크에서 해석되지 않는 경우다. Nginx 컨테이너와 앱 컨테이너가 다른 네트워크에 있으면 `proxy_pass http://app:3000`은 실패한다.

네 번째 실패는 인증서 private key를 저장소에 넣는 것이다. `ssl` 디렉터리는 운영 환경의 비밀 파일로 취급해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

정적 파일 서버로만 쓴다면 현재 구조에 `html` 디렉터리를 채우는 것으로 충분할 수 있다.

리버스 프록시로 쓴다면 서비스별 `conf.d/*.conf`, 업스트림 네트워크, Host 기반 라우팅, WebSocket, timeout을 함께 관리한다.

TLS 자동 발급까지 필요하면 Caddy, Traefik, Nginx Proxy Manager 같은 대안을 검토할 수 있다. Nginx를 유지한다면 certbot 또는 외부 인증서 배포 절차가 필요하다.

운영 환경에서는 access log와 error log를 수집 대상에 포함하고, 프록시 레벨 rate limit 또는 basic auth 같은 보조 통제를 추가할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 정적 파일 서버인지 리버스 프록시인지 목적을 정했다.
- [ ] 공개 포트와 Nginx `listen` 설정이 일치한다.
- [ ] `docker compose config`가 성공한다.
- [ ] `nginx -t`가 성공한다.
- [ ] TLS 사용 시 인증서와 키 경로를 확인했다.
- [ ] upstream 서비스가 같은 Docker 네트워크에서 해석된다.
- [ ] 로그 디렉터리를 확인했다.
- [ ] private key를 저장소에 커밋하지 않았다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxy 스택에서 중요한 것은 포트를 여는 것이 아니라 Nginx `__________`가 실제 공개 포트와 맞는지 확인하는 것이다. 443을 쓰려면 `__________`와 인증서 경로가 필요하고, upstream은 같은 Docker `__________`에서 해석되어야 한다.
