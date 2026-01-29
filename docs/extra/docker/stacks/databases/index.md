<!-- markdownlint-disable MD033 MD030 -->
# Databases Stacks

데이터베이스 관련 Docker Compose 스택 모음입니다. 각 스택은 실행 명령과 환경 파일 링크를 함께 제공합니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/databases/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/databases/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-database-outline: MariaDB

  백업 서비스와 Adminer 관리 UI를 포함한 MariaDB 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 3306, 3090</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/databases/mariadb/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/databases/mariadb/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/databases/mariadb/.env.example){ .md-button }
  </div>

  <div class="stack-note">전용 브리지 네트워크와 자동 백업 컨테이너를 포함합니다.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-database-outline: MongoDB

  Replica Set 기반 MongoDB 스택입니다. 초기 키파일 생성이 필요합니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 27018</li>
    <li><strong>추가 작업</strong> scripts/init-keyfile.sh 실행</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/databases/mongodb/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/databases/mongodb/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/databases/mongodb/.env.example){ .md-button }
  [:material-script: init-keyfile.sh](/extra/docker/stacks/databases/mongodb/scripts/init-keyfile.sh){ .md-button }
  </div>

  <div class="stack-note">외부 네트워크 `nodove-net`을 미리 생성하세요.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-database-outline: Supabase

  PostgreSQL + PostgREST로 구성한 경량 Supabase 대안 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> 5432, 3000</li>
    <li><strong>네트워크</strong> nodove-net</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/databases/supabase/docker-compose.yaml){ .md-button .md-button--primary }
  [:material-file-document: README](/extra/docker/stacks/databases/supabase/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/databases/supabase/.env.example){ .md-button }
  </div>

  <div class="stack-note">JWT Secret은 `openssl rand -base64 32`로 생성하세요.</div>
  </div>

</div>
