# Cloudflare Zero Trust

Cloudflare Zero Trust 구성은 Cloudflare Tunnel로 origin을 직접 노출하지 않고 연결하고, Access policy로 사용자가 애플리케이션에 도달할 수 있는지 평가하는 접근 제어 구조다.

## 1. 왜 필요한가? (Pain Point & Motivation)

홈서버나 내부 애플리케이션을 공개하려고 공유기 포트포워딩과 공인 IP 노출을 사용하면 origin이 직접 공격면이 된다. Reverse proxy만 세워도 인증과 정책을 별도로 붙이지 않으면 우회 경로가 남는다.

Cloudflare Tunnel은 `cloudflared`가 내부에서 Cloudflare로 outbound 연결을 만들게 하며, Access는 애플리케이션 앞에서 사용자, 이메일, 그룹, device posture 같은 조건을 평가한다. 핵심은 터널과 정책, origin 방화벽을 함께 맞추는 것이다.

## 2. 현재 나의 상태 (Baseline)

흔한 출발점은 다음과 같다.

- Cloudflare DNS proxy만 켜면 Zero Trust가 된다고 생각한다.
- Tunnel을 만들었지만 origin의 80/443 포트가 여전히 인터넷에 열려 있다.
- Access application을 만들지 않아 인증 없이 서비스가 노출된다.
- Include/Require/Exclude의 차이를 모른다.
- tunnel token을 compose 파일이나 로그에 그대로 남긴다.
- 내부 reverse proxy의 `X-Forwarded-For`, `CF-Connecting-IP` 처리와 로그를 확인하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 origin 직접 노출 없이 정책 기반으로 내부 서비스를 공개하는 것이다.

- `cloudflared`가 outbound-only tunnel을 만든다는 점을 설명한다.
- public hostname이 tunnel의 내부 service URL로 매핑되는 흐름을 이해한다.
- Access policy의 action, rule type, selector, value를 구분한다.
- Include, Require, Exclude의 논리 차이를 설명한다.
- tunnel token과 service token을 비밀값으로 관리한다.
- origin 방화벽에서 Cloudflare/Tunnel 경로 외 직접 접근을 차단한다.

## 4. 시스템 번역 (Data Flow)

HTTP 애플리케이션 접근 흐름은 다음과 같다.

```text
user opens app.example.com
  -> request reaches Cloudflare edge
  -> Access policy checks identity and context
  -> allowed request is sent through Cloudflare Tunnel
  -> cloudflared receives traffic over outbound tunnel
  -> cloudflared forwards to local service or reverse proxy
  -> origin application responds through the same path
```

터널 구성 흐름은 다음과 같다.

```text
create tunnel
  -> install cloudflared connector
  -> authenticate or install tunnel token
  -> map public hostname to internal service
  -> create Access application
  -> add allow and require policies
  -> verify no direct origin bypass remains
```

## 5. 핵심 구성요소 (Building Blocks)

- Cloudflare Tunnel: origin에서 Cloudflare로 만드는 지속적인 outbound 연결.
- `cloudflared`: 서버나 컨테이너에서 tunnel connector로 실행되는 데몬.
- Tunnel token: remotely-managed tunnel을 실행하는 비밀 토큰.
- Public hostname: `app.example.com`처럼 Cloudflare가 받는 외부 이름.
- Origin service: `http://localhost:8080`, `http://nginx:80` 같은 내부 목적지.
- Access application: Access policy를 적용할 self-hosted application 정의.
- Access policy action: Allow, Block, Bypass, Service Auth.
- Include rule: 접근 후보를 넓히는 OR 조건.
- Require rule: 후보가 반드시 만족해야 하는 AND 조건.
- Exclude rule: 조건에 해당하면 제외하는 NOT 조건.
- Service token: 사람 로그인이 아닌 서비스 간 접근에 쓰는 인증 수단.

## 6. 상태 전이 (State Transition)

요청 상태는 다음처럼 전이된다.

```mermaid
stateDiagram-v2
    [*] --> RequestAtEdge
    RequestAtEdge --> PolicyEvaluated
    PolicyEvaluated --> Blocked: Block or failed policy
    PolicyEvaluated --> Authenticated: identity passes
    Authenticated --> TunnelForwarded
    TunnelForwarded --> OriginReached
    OriginReached --> ResponseReturned
```

터널이 정상이어도 Access policy가 없거나 너무 넓으면 보안 목표를 달성하지 못한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Tunnel token과 service token은 비밀값으로 관리해야 한다.
- origin의 공인 IP와 직접 포트가 열려 있으면 Cloudflare Access를 우회할 수 있다.
- Access policy에는 최소 하나의 Include 조건이 필요하고, Require와 Exclude로 범위를 좁힌다.
- Bypass는 영구 내부 앱 접근 허용 수단으로 남용하지 않는다.
- 내부 reverse proxy는 실제 client IP 헤더를 신뢰할 조건을 명확히 해야 한다.
- Access 로그와 origin 로그를 함께 확인해 정책 적용 여부를 검증한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Docker Compose에서 `cloudflared`를 실행하는 최소 형태는 다음과 같다.

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
```

public hostname 매핑 예:

```text
Hostname: app.example.com
Service: http://localhost:8080
```

Access policy 예:

```text
Action: Allow
Include: email ending in @example.com
Require: MFA or device posture if configured
Exclude: blocked users or countries if needed
```

검증은 브라우저 인증 화면, `cloudflared` 로그, origin access log, 직접 origin 접속 차단 여부를 함께 본다.

## 9. 실패 사례 (What could go wrong?)

- origin 포트가 인터넷에 그대로 열려 있어 사용자가 Cloudflare를 우회한다.
- Access application hostname과 Tunnel public hostname이 다르게 설정되어 정책이 적용되지 않는다.
- Include를 `Everyone`으로 넓게 잡고 Require 조건이 없어 사실상 공개 서비스가 된다.
- tunnel token이 Git에 커밋되어 누구나 connector를 실행할 수 있다.
- reverse proxy가 내부 서비스 전체를 wildcard로 라우팅해 의도치 않은 앱이 노출된다.
- WebSocket, large upload, non-HTTP 프로토콜 요구사항을 확인하지 않고 HTTP 앱처럼 연결한다.

## 10. 뇌 확장하기 (Evolution & Variants)

- 여러 connector를 같은 tunnel에 붙여 고가용성을 높인다.
- Access policy에 IdP group, device posture, WARP/Gateway 조건을 추가한다.
- SSH/RDP 같은 non-HTTP 접근은 Access for Infrastructure 또는 Cloudflare One Client 요구사항을 별도 검토한다.
- Terraform으로 Tunnel, DNS, Access application, policy를 코드화한다.
- Nginx Proxy Manager, Caddy, Traefik 같은 내부 프록시와 Cloudflare Tunnel의 책임을 분리한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `cloudflared` connector가 정상 실행된다.
- [ ] public hostname이 올바른 내부 service URL로 매핑되어 있다.
- [ ] Access application과 hostname이 일치한다.
- [ ] Include, Require, Exclude 정책이 최소 권한으로 작성되어 있다.
- [ ] origin 직접 접속 우회 경로가 차단되어 있다.
- [ ] tunnel token, service token, API token이 비밀로 관리된다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Cloudflare Zero Trust는 Tunnel로 origin을 직접 숨기고 Access policy로 사용자를 검증하는 구조이며, 우회 포트 차단과 정책 로그 확인까지 해야 안전하다.
