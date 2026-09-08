---
title: "보안 Compose 스택"
---

# 보안 Compose 스택 {#security-docker-stacks}

<nav class="hub-directory" aria-label="보안 Compose 스택 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">컬렉션 탐색</h2>

- [Compose 스택](../index.md)
- [Docker Compose 컬렉션](../../index.md)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">vaultwarden</h2>

- [docker-compose.yaml](/extra/docker/stacks/security/vaultwarden/docker-compose.yaml)
- [docker-compose.nginx.yaml](/extra/docker/stacks/security/vaultwarden/docker-compose.nginx.yaml)
- [docker-compose.cloudflared.yaml](/extra/docker/stacks/security/vaultwarden/docker-compose.cloudflared.yaml)
- [docker-compose.full.yaml](/extra/docker/stacks/security/vaultwarden/docker-compose.full.yaml)
- [.env.example](/extra/docker/stacks/security/vaultwarden/.env.example)
- [vaultwarden.conf](/extra/docker/stacks/security/vaultwarden/nginx/vaultwarden.conf)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

<!-- markdownlint-disable MD033 MD030 -->
# Security Stacks

보안/암호화 관련 Docker Compose 스택 모음입니다.

## 보안 스택 점검 기준

- 초기 관리자 자격 증명, 암호화 키와 복구 코드는 생성·배포·회전·폐기 소유자를 정한 뒤 주입합니다.
- `up -d` 성공을 보안 완료로 간주하지 않습니다. TLS 체인, 접근 정책, 감사 로그, 백업 암호화와 복구 권한을 시험합니다.
- 잠금 또는 키 유실 시 복구 절차와 break-glass 접근을 별도 보관하고 정기적으로 검증합니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/security/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/security/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-lock-outline: Vaultwarden

  Vaultwarden + 백업 컨테이너 기본 구성과 Nginx/Cloudflare 변형을 제공합니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml (+ nginx/cloudflared/full)</li>
    <li><strong>Ports</strong> VAULTWARDEN__PORT (기본 80)</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: 기본 compose](/extra/docker/stacks/security/vaultwarden/docker-compose.yaml){ .md-button .md-button--primary }
  [:octicons-file-code-24: nginx compose](/extra/docker/stacks/security/vaultwarden/docker-compose.nginx.yaml){ .md-button }
  [:octicons-file-code-24: cloudflared compose](/extra/docker/stacks/security/vaultwarden/docker-compose.cloudflared.yaml){ .md-button }
  [:octicons-file-code-24: full compose](/extra/docker/stacks/security/vaultwarden/docker-compose.full.yaml){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/security/vaultwarden/.env.example){ .md-button }
  [:material-file-document: nginx.conf](/extra/docker/stacks/security/vaultwarden/nginx/vaultwarden.conf){ .md-button }
  </div>

  <div class="stack-note">Cloudflare Tunnel 토큰과 SSL 인증서 경로는 .env.example을 참고하세요.</div>
  </div>

</div>

</details>
