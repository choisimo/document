# Vaultwarden Docker Compose 설정 가이드

Vaultwarden을 다양한 환경에서 안전하게 배포하기 위한 Docker Compose 설정 가이드입니다.

---

## 적용 범위와 보안 검증 기준

- **범위:** Vaultwarden·database·proxy·tunnel·backup image의 version 또는 digest, Docker/Compose, domain, TLS 종료 지점과 외부 노출 경계를 기록합니다.
- **보안 전제:** secret은 repository와 image에서 분리하고 registration·admin endpoint·2FA·rate limit·proxy header·ACL을 위협 모델에 맞게 설정합니다. 예제 구성이 production readiness를 보장하지 않습니다.
- **근거와 불확실성:** image health, HTTPS 접속과 backup 생성은 일부 근거일 뿐입니다. proxy chain, mail, WebSocket, update 호환성, third-party backup image와 restore 가능성은 별도 검증합니다.
- **실패·완료:** 인증 우회, 잘못된 header 신뢰, secret 노출, database 손상, backup 유실과 update rollback을 시험합니다. 암호화된 backup의 독립 restore와 계정 복구까지 성공해야 배포 완료입니다.

---

## 목차

1. [배포 시나리오 선택](#배포-시나리오-선택)
2. [기본 구성 (Vaultwarden Only)](#1-기본-구성-vaultwarden-only)
3. [Nginx 리버스 프록시 구성](#2-nginx-리버스-프록시-구성)
4. [Cloudflare Tunnel 구성](#3-cloudflare-tunnel-구성)
5. [전체 통합 구성](#4-전체-통합-구성-nginx--cloudflare-tunnel)
6. [환경 변수 설정](#환경-변수-설정)
7. [백업 및 복원](#백업-및-복원)
8. [보안 권장 사항](#보안-권장-사항)
9. [문제 해결](#문제-해결)

---

## 배포 시나리오 선택

| 시나리오 | 파일 | 사용 사례 | 복잡도 |
|---------|------|----------|--------|
| **기본** | `docker-compose.yaml` | 로컬 테스트, 내부망 전용 | ⭐ |
| **Nginx** | `docker-compose.nginx.yaml` | 자체 SSL, 다중 서비스 운영 | ⭐⭐ |
| **Cloudflare Tunnel** | `docker-compose.cloudflared.yaml` | IP 비공개, Zero Trust 보안 | ⭐⭐ |
| **전체 통합** | `docker-compose.full.yaml` | 프로덕션 환경, 최대 보안 | ⭐⭐⭐ |

---

## 1. 기본 구성 (Vaultwarden Only)

구성이 단순한 예시이지만 실제 접근 범위는 published port, host firewall, bind address와 주변 network 정책으로 결정됩니다.

### 빠른 시작

```bash
# 디렉토리 이동
cd docker/stacks/security/vaultwarden

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 실행
docker compose up -d
```

### docker-compose.yaml

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    environment:
      DOMAIN: ${DOMAIN}
      SIGNUPS_ALLOWED: "false"
      DISABLE_ADMIN_TOKEN: "true"
      ROCKET_LIMITS: "{json=10485760}"
    volumes:
      - ./data:/data/
    ports:
      - "127.0.0.1:8080:80"
    networks:
      - vaultwarden_network

networks:
  vaultwarden_network:
    driver: bridge
```

---

## 2. Nginx 리버스 프록시 구성

SSL/TLS 종료, 보안 헤더 추가, WebSocket 지원을 제공합니다.

### 사전 요구 사항

- SSL 인증서 (`fullchain.pem`, `privkey.pem`)
- 포트 80, 443 사용 가능

### 설치 및 실행

```bash
# 환경 변수 설정
cp .env.example .env
vim .env

# SSL 인증서 배치
mkdir -p ssl
cp /path/to/fullchain.pem ssl/
cp /path/to/privkey.pem ssl/

# 실행
docker compose -f docker-compose.nginx.yaml up -d

# 로그 확인
docker compose -f docker-compose.nginx.yaml logs -f
```

### 아키텍처

```
인터넷 → [80/443] Nginx (SSL 종료) → [80] Vaultwarden
                     ↓
              ./nginx/vaultwarden.conf
```

### 주요 특징

- **SSL/TLS 지원**: Let's Encrypt 또는 자체 서명 인증서
- **보안 헤더**: HSTS, X-Frame-Options, CSP 등
- **WebSocket**: 실시간 동기화 지원
- **자동 백업**: 매일 새벽 4시 백업

---

## 3. Cloudflare Tunnel 구성

서버 IP를 외부에 노출하지 않고 안전하게 접근할 수 있습니다.

### 사전 요구 사항

- Cloudflare 계정 및 도메인
- Cloudflare Zero Trust 터널 토큰

### Cloudflare 터널 생성

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) 대시보드 접속
2. **Access** > **Tunnels** > **Create a tunnel**
3. 터널 이름 입력 후 **Save tunnel**
4. **Docker** 탭에서 토큰 복사
5. **Public Hostname** 설정:
   - **Subdomain**: `vault` (또는 원하는 이름)
   - **Domain**: 자신의 도메인 선택
   - **Service Type**: `HTTP`
   - **URL**: `http://vaultwarden:80`

### 설치 및 실행

```bash
# 환경 변수 설정
cp .env.example .env
vim .env  # CLOUDFLARE_TUNNEL_TOKEN 설정

# 실행
docker compose -f docker-compose.cloudflared.yaml up -d

# 터널 상태 확인
docker logs vaultwarden-tunnel
```

### 아키텍처

```
인터넷 → Cloudflare Edge (DDoS 보호, SSL) → Tunnel → Vaultwarden
                                              ↓
                                    cloudflared 컨테이너
```

### 장점

| 항목 | 설명 |
|------|------|
| **IP 비공개** | 서버 IP가 외부에 노출되지 않음 |
| **포트 포워딩 불필요** | 방화벽 인바운드 규칙 불필요 |
| **무료 SSL** | Cloudflare에서 자동 관리 |
| **DDoS 보호** | Cloudflare 기본 제공 |
| **Zero Trust** | 접근 정책 설정 가능 |

---

## 4. 전체 통합 구성 (Nginx + Cloudflare Tunnel)

Nginx와 tunnel을 결합한 예시이며 production readiness는 version 고정, 위협 모델, secret, monitoring, backup·restore와 update 정책을 추가로 검증해야 합니다.

### 설치 및 실행

```bash
# 환경 변수 설정
cp .env.example .env
vim .env  # 모든 변수 설정

# 실행
docker compose -f docker-compose.full.yaml up -d
```

### 아키텍처

```
인터넷 → Cloudflare Edge → Tunnel → Nginx → Vaultwarden
                            ↓
                     cloudflared
```

### Cloudflare 터널 설정

Public Hostname 설정 시:
- **Service Type**: `HTTP`
- **URL**: `http://nginx:80` (Nginx 컨테이너로 라우팅)

---

## 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하여 설정합니다.

### 주요 환경 변수

| 변수 | 설명 | 예시 |
|-----|------|------|
| `DOMAIN` | Vaultwarden 접속 URL | `https://vault.example.com` |
| `TZ` | 타임존 | `Asia/Seoul` |
| `SIGNUPS_ALLOWED` | 회원가입 허용 | `false` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare 터널 토큰 | `eyJhIjoiMj...` |
| `BACKUP_SCHEDULE` | 백업 스케줄 (cron) | `0 4 * * *` |

### 관리자 토큰 생성 (선택사항)

```bash
# argon2 해시 생성 (권장)
echo -n "your-password" | argon2 "$(openssl rand -base64 32)" -e -id -k 65540 -t 3 -p 4
```

---

## 백업 및 복원

### 자동 백업

이 문서의 일부 예시는 third-party `bruceforce/vaultwarden-backup` container를 사용합니다. 공급망, version/digest, 권한과 독립 restore를 검토합니다.

- **기본 스케줄**: 매일 새벽 4시
- **보존 기간**: 본문의 30일은 예시입니다. 복구 시점 목표, 변경 빈도, 저장 비용과 규정에 따라 설정합니다.
- **백업 위치**: `./backups/`

### 수동 백업

```bash
# 컨테이너 중지
docker compose down

# 데이터 디렉토리 백업
tar -czvf vaultwarden-backup-$(date +%Y%m%d).tar.gz ./data

# 컨테이너 재시작
docker compose up -d
```

### 복원 절차

```bash
# 1. 컨테이너 중지
docker compose down

# 2. 기존 데이터베이스 삭제
rm ./data/db.sqlite3*

# 3. 백업 파일 복원
tar -xzvf vaultwarden-backup-YYYYMMDD.tar.gz -C ./

# 4. 컨테이너 재시작
docker compose up -d
```

---

## 보안 권장 사항

### 필수 설정

- [x] `SIGNUPS_ALLOWED=false` - 임의 가입 비활성화
- [x] `DISABLE_ADMIN_TOKEN=true` - 관리자 페이지 비활성화
- [x] HTTPS 사용 (Nginx SSL 또는 Cloudflare)
- [x] 정기 백업 활성화

### 추가 권장 사항

- **2FA 정책**: 지원 version과 계정 복구 절차를 확인하고, 위험 수준에 따라 사용자별 또는 조직 차원의 2단계 인증 적용을 검증
- **IP 제한**: 관리자 페이지 접근 시 IP 화이트리스트
- **로그 모니터링**: 의심스러운 활동 감시
- **정기 업데이트**: Vaultwarden 이미지 정기 업데이트

```bash
# 이미지 업데이트
docker compose pull
docker compose up -d
```

---

## 문제 해결

### 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker compose logs -f vaultwarden

# 헬스체크 상태 확인
docker inspect vaultwarden | grep -A 10 Health
```

### WebSocket 연결 실패

Nginx 설정에서 `/notifications/hub` 경로가 올바르게 프록시되는지 확인:

```nginx
location /notifications/hub {
    proxy_pass http://vaultwarden:80;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Cloudflare 521 오류

1. Vaultwarden 컨테이너 상태 확인
2. 터널 토큰 유효성 확인
3. Public Hostname의 Service URL 확인 (`http://vaultwarden:80`)

```bash
# 터널 로그 확인
docker logs vaultwarden-tunnel

# 내부 연결 테스트
docker exec vaultwarden-tunnel curl -v http://vaultwarden:80/alive
```

---

## 파일 구조

```
docker/stacks/security/vaultwarden/
├── docker-compose.yaml           # 기본 구성
├── docker-compose.nginx.yaml     # Nginx 리버스 프록시
├── docker-compose.cloudflared.yaml # Cloudflare Tunnel
├── docker-compose.full.yaml      # 전체 통합
├── .env.example                  # 환경 변수 템플릿
├── nginx/
│   ├── vaultwarden.conf          # Nginx SSL 설정
│   └── vaultwarden-internal.conf # Nginx 내부 설정 (Tunnel용)
├── data/                         # Vaultwarden 데이터
├── backups/                      # 백업 파일
└── ssl/                          # SSL 인증서
```

---

## 참고 자료

- [Vaultwarden 공식 Wiki](https://github.com/dani-garcia/vaultwarden/wiki)
- [Cloudflare Zero Trust 문서](https://developers.cloudflare.com/cloudflare-one/)
- [Nginx 리버스 프록시 가이드](https://github.com/dani-garcia/vaultwarden/wiki/Proxy-examples)
