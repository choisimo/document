---
title: "프록시 Compose 스택"
---

# 프록시 Compose 스택 {#proxy-docker-stacks}

<nav class="hub-directory" aria-label="프록시 Compose 스택 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">컬렉션 탐색</h2>

- [Compose 스택](../index.md)
- [Docker Compose 컬렉션](../../index.md)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">nginx</h2>

- [docker-compose.yaml](/extra/docker/stacks/proxy/nginx/docker-compose.yaml)
- [nginx.conf](/extra/docker/stacks/proxy/nginx/config/nginx.conf)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

<!-- markdownlint-disable MD033 MD030 -->
# Proxy Stacks

리버스 프록시/정적 웹 서비스용 스택 모음입니다.

## 프록시 스택 점검 기준

- DNS, 인증서 발급·갱신, 80/443 포트 소유권과 upstream 네트워크를 시작 전에 확인합니다.
- 신뢰할 proxy hop, 전달 헤더, 요청 크기, timeout과 WebSocket/HTTP 버전 요구를 서비스별로 명시합니다.
- 완료 기준은 외부 TLS 검증, 의도한 라우팅, 인증 우회 차단, 갱신 시험과 upstream 장애 응답 확인입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/proxy/<stack>
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/proxy/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-web: Nginx

  기본 Nginx 리버스 프록시 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 80, 443</li>
    <li><strong>Config</strong> config/nginx.conf</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/proxy/nginx/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-cog: nginx.conf](/extra/docker/stacks/proxy/nginx/config/nginx.conf){ .md-button }
  </div>

  <div class="stack-note">conf.d, html, ssl 디렉토리는 필요에 맞게 채워주세요.</div>
  </div>

</div>

</details>
