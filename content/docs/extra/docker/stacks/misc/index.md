<!-- markdownlint-disable MD033 MD030 -->
# Misc Stacks

테스트/업무 보조용 스택 모음입니다.

## 기타 스택 점검 기준

- 이 범주의 스택은 공통 운영 성격을 보장하지 않으므로 각 README의 목적, 데이터 민감도와 지원 상태를 개별 확인합니다.
- `latest` 태그, 예시 토큰과 공개 포트를 그대로 사용하지 않고 시험 네트워크에서 먼저 실행합니다.
- 완료 기준은 해당 도구의 대표 작업, 재시작, 데이터 유지와 제거 절차를 각각 확인한 상태입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/misc/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/misc/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-eye-outline: ChangeDetection

  웹사이트 변경 감지 + Playwright 지원 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 5000</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/misc/changedetection/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/misc/changedetection/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/misc/changedetection/.env.example){ .md-button }
  </div>

  <div class="stack-note">datastore 디렉토리를 먼저 생성하고 PLAYWRIGHT_DRIVER_URL을 확인하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-web: Ghost Blog

  Ghost + Caddy + 백업 컨테이너가 포함된 블로그 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 80, 443</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/misc/ghost-blog/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/misc/ghost-blog/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/misc/ghost-blog/.env.example){ .md-button }
  </div>

  <div class="stack-note">Caddyfile 생성과 ghost-mysql 권한 설정을 먼저 진행하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-timer-outline: Kimai (Kamai)

  Kimai + MySQL 구성의 시간 추적 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 8001, 3306</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/misc/kamai/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/misc/kamai/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/misc/kamai/.env.example){ .md-button }
  </div>

  <div class="stack-note">초기 계정 정보는 .env에서 설정하세요.</div>
  </div>

</div>
