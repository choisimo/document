---
title: "미디어 Compose 스택"
---

# 미디어 Compose 스택 {#media-docker-stacks}

<nav class="hub-directory" aria-label="미디어 Compose 스택 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">컬렉션 탐색</h2>

- [Compose 스택](../index.md)
- [Docker Compose 컬렉션](../../index.md)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">ghost</h2>

- [docker-compose.yaml](/extra/docker/stacks/media/ghost/docker-compose.yaml)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-3" markdown="1">

<h2 id="directory-group-3">gluetun-qbittorrent</h2>

- [docker-compose.yaml](/extra/docker/stacks/media/gluetun-qbittorrent/docker-compose.yaml)
- [README.md](/extra/docker/stacks/media/gluetun-qbittorrent/README.md)
- [.env.example](/extra/docker/stacks/media/gluetun-qbittorrent/.env.example)
- [wireguard.yaml](/extra/docker/stacks/media/gluetun-qbittorrent/wireguard.yaml)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-4" markdown="1">

<h2 id="directory-group-4">qbittorrent-advanced</h2>

- [docker-compose.yml](/extra/docker/stacks/media/qbittorrent-advanced/docker-compose.yml)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-5" markdown="1">

<h2 id="directory-group-5">qbittorrent-mediamanager</h2>

- [docker-compose.yml](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.yml)
- [docker-compose.arr.yml](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.arr.yml)
- [docker-compose.mediamanager.yml](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.mediamanager.yml)
- [docker-compose.rclone.yml](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.rclone.yml)
- [.env.example](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example)
- [.env.example.arr](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example.arr)
- [.env.example.rclone](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example.rclone)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

<!-- markdownlint-disable MD033 MD030 -->
# Media Stacks

다운로드/스트리밍에 필요한 미디어 스택 모음입니다.

## 미디어 스택 점검 기준

- 콘텐츠 이용 권한, 다운로드 경로와 라이브러리 경로의 소유권·읽기/쓰기 범위를 먼저 확인합니다.
- GPU·트랜스코딩 장치, UID/GID, 자막·시간대와 외부 공개 프록시 설정은 호스트별 값으로 검증합니다.
- 완료 기준은 승인된 샘플 파일의 수집, 인덱싱, 재생·트랜스코딩과 재시작 후 라이브러리 유지입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/media/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/media/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-web: Ghost (Caddy)

  Caddy 리버스 프록시 + Ghost + MySQL + 백업 컨테이너 구성입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 80, 443 (Caddy)</li>
    <li><strong>필수</strong> Caddyfile, .env</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/media/ghost/docker-compose.yaml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">Caddyfile 작성과 ghost-mysql 디렉토리 권한 설정을 먼저 진행하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-lock-outline: Gluetun + qBittorrent

  VPN 터널을 통해 다운로드하는 멀티 서비스 미디어 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 8090, 6881, 9696, 7878, 8989</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/media/gluetun-qbittorrent/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/media/gluetun-qbittorrent/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/media/gluetun-qbittorrent/.env.example){ .md-button }
  [:material-file-cog: wireguard.yaml](/extra/docker/stacks/media/gluetun-qbittorrent/wireguard.yaml){ .md-button }
  </div>

  <div class="stack-note">Plex/Jellyfin/Flaresolverr는 profile 기반으로 선택 실행합니다.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-cloud-download: qBittorrent Advanced

  Gluetun VPN + Cloudflared + Rclone 동기화 구성입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yml</li>
    <li><strong>Ports</strong> QBIT_WEBUI_PORT</li>
    <li><strong>서비스</strong> VPN, qBittorrent, Cloudflared, Rclone</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yml](/extra/docker/stacks/media/qbittorrent-advanced/docker-compose.yml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">로컬 .env 파일에 VPN 및 포트 값을 입력하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-television-play: qBittorrent Media Manager

  Gluetun + Sonarr/Radarr/Prowlarr까지 포함한 미디어 관리 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yml (+ arr/mediamanager/rclone)</li>
    <li><strong>Ports</strong> 8080, 6881, 9696, 7878, 8989</li>
    <li><strong>환경 파일</strong> .env.example (+ arr/rclone)</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yml](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.yml){ .md-button .md-button--primary }
  [:octicons-file-code-24: arr compose](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.arr.yml){ .md-button }
  [:octicons-file-code-24: mediamanager compose](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.mediamanager.yml){ .md-button }
  [:octicons-file-code-24: rclone compose](/extra/docker/stacks/media/qbittorrent-mediamanager/docker-compose.rclone.yml){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example){ .md-button }
  [:material-file-cog: .env.example.arr](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example.arr){ .md-button }
  [:material-file-cog: .env.example.rclone](/extra/docker/stacks/media/qbittorrent-mediamanager/.env.example.rclone){ .md-button }
  </div>

  <div class="stack-note">기본 compose에 VPN 게이트웨이가 포함되어 있으니 포트 개방을 확인하세요.</div>
  </div>

</div>

</details>
