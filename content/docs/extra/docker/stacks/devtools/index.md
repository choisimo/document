<!-- markdownlint-disable MD033 MD030 -->
# Devtools Stacks

개발 및 운영에 사용하는 도구형 스택 모음입니다.

## 도구 스택 점검 기준

- Docker socket, 소스 디렉터리, SSH 키와 클라우드 토큰을 마운트하면 도구 컨테이너가 갖는 권한을 명시합니다.
- UI·API 공개 범위와 인증을 먼저 설정하고, 이미지와 플러그인 버전을 함께 고정합니다.
- 완료 기준은 health 상태, 최소 권한 계정의 실제 작업 1건, 재시작과 설정 복원 결과입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/devtools/<stack>
# 필요한 env 파일을 준비한 뒤
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/devtools/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-source-branch: Gitea

  SQLite 기반으로 바로 실행 가능한 Git 서버입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 3000, 2222</li>
    <li><strong>DB</strong> SQLite (기본)</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/devtools/gitea/docker-compose.yaml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">MySQL/MariaDB 사용 시 compose 파일의 주석 섹션을 참고하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-robot: Sourcebot

  코드 검색과 AI 에이전트를 위한 Sourcebot 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 3333</li>
    <li><strong>필수 파일</strong> env.example, config.json</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/devtools/sourcebot/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/devtools/sourcebot/README.md){ .md-button }
  [:material-file-cog: env.example](/extra/docker/stacks/devtools/sourcebot/env.example){ .md-button }
  [:material-file-settings: config.json](/extra/docker/stacks/devtools/sourcebot/config.json){ .md-button }
  </div>

  <div class="stack-note">GitHub/OpenRouter/Gemini API 키를 env에 입력해야 합니다.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-console: Termix

  웹 기반 터미널/SSH 클라이언트 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 8080 (TERMIX_PORT)</li>
    <li><strong>기본 계정</strong> admin / changeme</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/devtools/termix/docker-compose.yaml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">필요 시 ENABLE_AUTH, SESSION_SECRET 값을 변경하세요.</div>
  </div>

</div>
