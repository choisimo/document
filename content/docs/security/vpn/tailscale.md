---
description: 포트포워딩 없이 외부에서 내부 서버에 안전하게 접속하는 방법
---

# Tailscale VPN 상세 가이드


## 적용 범위와 운영 계약

이 가이드는 Tailscale 클라이언트와 관리 콘솔을 사용하는 tailnet 예시입니다. 운영체제, 클라이언트 버전, 계정 플랜, ACL 또는 grants 정책 형식에 따라 명령과 제한이 달라지므로 공식 문서와 현재 관리 콘솔을 기준으로 확인합니다.

- **증거 상태**: 속도, 기기 수, 업로드 제한과 기능 비교는 보장값이 아닌 정성적 참고입니다. 실제 경로가 direct인지 DERP relay인지, 왕복 지연과 처리량을 대상 기기 사이에서 측정합니다.
- **보안 전제**: SSO와 MFA, 최소 권한 정책, 태그 소유자, 장치 승인과 만료, 퇴사자 및 분실 장치 회수 절차를 먼저 정의합니다.
- **비밀 관리**: 인증 키는 등록용 비밀이며 문서, 셸 기록, 프로세스 목록, 로그에 남기지 않습니다. 가능한 경우 일회성, 사전 승인, 짧은 수명, ephemeral 속성을 사용하고 즉시 폐기할 수 있어야 합니다.
- **라우팅 변경**: Exit Node와 Subnet Router는 IP forwarding, 방화벽, DNS, 승인된 라우트, 역방향 경로와 장애 시 원복 경로를 함께 검토합니다.
- **완료 조건**: tailscale status, netcheck와 ping 결과, 승인 및 거부 정책 테스트, DNS와 대상 서비스 확인, relay 전환 시 동작, 장치 회수 테스트를 기록합니다.

설치 스크립트를 파이프로 바로 실행하기보다 지원 배포판과 저장소 서명을 확인하고 검토된 패키지 경로를 사용합니다. tailscale up의 반복 실행은 기존 비기본 플래그와 충돌할 수 있으므로 현재 버전에서 증분 변경용 tailscale set 지원 여부를 먼저 확인합니다.

포트포워딩 없이 외부에서 내부 서버에 접속하고 실제 연결 경로와 접근 정책을 검증하는 방법을 정리합니다.

## 방법 비교

| 방법 | 속도 | 설정 난이도 | 특징 |
|-----|------|-----------|------|
| **Tailscale** | ⭐⭐⭐⭐⭐ | 쉬움 | P2P 직접 연결, 가장 추천 |
| Cloudflare Tunnel | ⭐⭐⭐⭐ | 보통 | Cloudflare 경유, 무료 |
| WireGuard (직접) | ⭐⭐⭐⭐⭐ | 어려움 | 포트포워딩 필요 |
| IPv6 | ⭐⭐⭐⭐⭐ | 환경 의존 | 별도 설정 불필요 |

---

## Tailscale이란?

![Tailscale 개념도](https://tailscale.com/files/images/tailscale-how-it-works.svg)

- **WireGuard** 기반의 메시 VPN
- **NAT Traversal(홀 펀칭)** 기술로 방화벽 통과
- 가능한 경우 P2P로 직접 연결하며 실제 성능은 NAT, 경로, MTU, 암호화와 호스트 부하에 따라 달라짐

### 핵심 개념

```
┌─────────────────────────────────────────────────────┐
│                 Tailscale Network                    │
│                   (Tailnet)                          │
├──────────┬──────────┬──────────┬───────────────────┤
│ 내 PC    │ 홈 서버   │ 클라우드  │    NAS           │
│ 100.x.x.1│ 100.x.x.2│ 100.x.x.3│    100.x.x.4     │
└──────────┴──────────┴──────────┴───────────────────┘
        ↑              ↑
        └──── P2P 직접 연결 (암호화) ────┘
```

- 모든 기기에 `100.x.x.x` 대역의 고정 IP 부여
- 기기 간 직접 통신 (중계 서버 최소화)

---

## Tailscale 설치

### Linux (Ubuntu/Debian)

```bash
# 공식 스크립트로 설치
curl -fsSL https://tailscale.com/install.sh | sh

# 또는 수동 설치
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list
sudo apt update
sudo apt install tailscale
```

### Linux (Arch Linux)

```bash
sudo pacman -S tailscale
sudo systemctl enable --now tailscaled
```

### Linux (RHEL/CentOS/Rocky)

```bash
sudo dnf config-manager --add-repo https://pkgs.tailscale.com/stable/rhel/9/tailscale.repo
sudo dnf install tailscale
sudo systemctl enable --now tailscaled
```

### macOS

```bash
brew install --cask tailscale
# 또는 App Store에서 Tailscale 설치
```

### Windows

[Tailscale 다운로드 페이지](https://tailscale.com/download)에서 설치 파일 다운로드

---

## Tailscale 설정

### 1단계: 로그인 및 연결

```bash
# 로그인 (브라우저 인증)
sudo tailscale up

# 백그라운드에서 실행 확인
sudo tailscale status
```

**출력 예시:**
```
100.100.100.1   my-laptop        tagged-devices linux   -
100.100.100.2   home-server      tagged-devices linux   idle, 5m ago
                                  direct 192.168.1.100:41641
```

!!! success "Direct 연결 확인"
    direct는 P2P 경로가 성립했다는 뜻이며 포트포워딩과 동일한 성능을 보장하지는 않습니다.

!!! warning "Relay 연결"
    `relay`로 표시되면 중계 서버 경유 중 (속도 저하 가능)

### 2단계: SSH 접속

```bash
# Tailscale IP로 접속
ssh user@100.100.100.2

# 또는 MagicDNS 이름으로 접속
ssh user@home-server
```

### 3단계: 서비스 자동 시작

```bash
# 부팅 시 자동 시작
sudo systemctl enable tailscaled

# 항상 연결 유지
sudo tailscale up --operator=$USER
```

---

## 고급 설정

### Exit Node (전체 트래픽 라우팅)

특정 기기를 통해 모든 인터넷 트래픽을 라우팅합니다.

```bash
# 서버에서 Exit Node 활성화
sudo tailscale up --advertise-exit-node

# 클라이언트에서 Exit Node 사용
sudo tailscale up --exit-node=home-server
```

### Subnet Router (내부 네트워크 전체 접근)

Tailscale이 설치되지 않은 내부 기기에도 접근 가능:

```bash
# 서버에서 서브넷 광고
sudo tailscale up --advertise-routes=192.168.1.0/24

# Tailscale 관리 콘솔에서 해당 라우트 승인 필요
```

### SSH 키 없이 Tailscale SSH 사용

```bash
# 서버에서 Tailscale SSH 활성화
sudo tailscale up --ssh

# 클라이언트에서 접속 (Tailscale 인증 사용)
ssh home-server
```

!!! tip "Tailscale SSH의 장점"
    - SSH 키 관리 불필요
    - Tailscale 계정으로 인증
    - 접속 로그 자동 기록

---

## 연결 문제 해결

### Direct 연결이 안 될 때

```bash
# 상세 연결 정보 확인
tailscale netcheck

# DERP(중계) 서버 연결 확인
tailscale ping home-server
```

**일반적인 원인:**

1. **이중 NAT (Double NAT)**: 공유기가 2개 이상 중첩
2. **엄격한 방화벽**: UDP 홀펀칭 차단
3. **CGNAT**: 통신사 공유 IP 사용

### 속도 최적화

```bash
# 설정을 바꾸기 전에 연결 경로와 UDP 가능 여부를 진단
tailscale netcheck

# 광고 라우트를 사용하지 않는 클라이언트에서만 선택
sudo tailscale set --accept-routes=false
```

### 연결 초기화

```bash
# 로그아웃 후 재연결
sudo tailscale logout
sudo tailscale up
```

---

## Tailscale vs 다른 방법

### Cloudflare Tunnel과 비교

| 항목 | Tailscale | Cloudflare Tunnel |
|-----|-----------|-------------------|
| **연결 방식** | P2P 직접 | Cloudflare 경유 |
| **지연 시간** | 낮음 | 약간 높음 |
| **계정 필요** | Tailscale 계정 | Cloudflare 계정 |
| **사용 한도** | 현재 플랜에서 확인 | 현재 플랜과 제품 정책에서 확인 |
| **웹 노출** | tailnet 전용이 기본이며 Serve/Funnel은 별도 검토 | Tunnel 정책에 따라 가능 |

!!! tip "언제 무엇을 선택?"
    - **SSH/RDP/내부 서비스** → Tailscale
    - **웹사이트 공개** → Cloudflare Tunnel

### IPv6 직접 연결

ISP와 클라이언트 모두 IPv6 지원 시:

```bash
# IPv6 주소 확인
ip -6 addr show

# IPv6로 SSH 접속
ssh user@2001:db8::1
```

**장점:** 양 끝의 IPv6 경로가 안정적이면 직접 연결 가능  
**주의:** 양 끝의 IPv6 지원과 방화벽 정책이 필요하며 서비스가 공인 주소에 직접 노출될 수 있음

---

## 실용적인 사용 사례

### 1. 회사에서 → 집 서버 접속

```bash
# 집 서버에 Tailscale 설치 후
ssh user@home-server  # MagicDNS로 바로 접속
```

### 2. 외부에서 → NAS 파일 접근

```bash
# NAS의 Tailscale IP로 SMB 마운트
mount -t cifs //100.100.100.3/share /mnt/nas -o user=admin
```

### 3. 게임 서버 호스팅

```bash
# 친구들도 Tailscale 설치 후 Tailnet 초대
# 게임 서버 IP를 Tailscale IP로 설정
```

---

## 보안 설정

### ACL (Access Control List)

Tailscale 관리 콘솔에서 접근 제어:

```json
{
  "acls": [
    {"action": "accept", "src": ["group:admins"], "dst": ["*:*"]},
    {"action": "accept", "src": ["group:ssh-users"], "dst": ["tag:servers:22"]}
  ]
}
```

### 서버 등록 키와 장치 만료 관리

```bash
# 짧은 수명의 등록 키를 secret 파일에서 읽는 예시
sudo tailscale up --authkey=file:/run/secrets/tailscale_authkey --operator=$USER
```

---

## 참고 자료

- [Tailscale 공식 문서](https://tailscale.com/kb/)
- [Tailscale 다운로드](https://tailscale.com/download)
- [Tailscale GitHub](https://github.com/tailscale/tailscale)
- [WireGuard 프로토콜](https://www.wireguard.com/)