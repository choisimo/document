<!-- markdownlint-disable MD033 MD030 -->
# Security Stacks

보안/암호화 관련 Docker Compose 스택 모음입니다.

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
