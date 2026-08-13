<!-- markdownlint-disable MD033 MD030 -->
# Storage Stacks

파일 공유/스토리지용 스택 모음입니다.

## 스토리지 스택 점검 기준

- 호스트 경로, 파일 UID/GID, 대소문자·잠금 의미, 네트워크 파일시스템과 디스크 여유를 먼저 고정합니다.
- 동기화나 RAID를 백업으로 간주하지 않고 별도 매체의 버전 보존과 복원 시험을 정의합니다.
- 완료 기준은 읽기·쓰기 권한, 재시작·업그레이드 후 무결성, 용량 경보와 실제 복원 결과입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/storage/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/storage/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-folder-outline: Droppy

  웹 기반 파일 스토리지 서버입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> PORT (기본 8989)</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/storage/droppy/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/storage/droppy/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/storage/droppy/.env.example){ .md-button }
  </div>

  <div class="stack-note">config, files 디렉토리를 먼저 생성하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-share-variant: PicoShare

  만료 기능을 지원하는 간단한 파일 공유 서비스입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 4001</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/storage/picoshare/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/storage/picoshare/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/storage/picoshare/.env.example){ .md-button }
  </div>

  <div class="stack-note">PS_SHARED_SECRET 설정으로 공유 비밀번호를 지정하세요.</div>
  </div>

</div>
