<!-- markdownlint-disable MD033 MD030 -->
# Automation Stacks

워크플로우 자동화와 시간 추적을 위한 Docker Compose 스택 모음입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/automation/<stack>
cp .env.example .env   # 파일이 있을 때만
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/automation/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-cog-outline: n8n

  워크플로우 자동화와 데이터 스토리지, 모니터링까지 포함한 종합 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml, docker-compose.simple.yaml</li>
    <li><strong>Ports</strong> 5678, 5050, 3000, 9001, 15672</li>
    <li><strong>환경 파일</strong> .env.example</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: full compose](/extra/docker/stacks/automation/n8n/docker-compose.yaml){ .md-button .md-button--primary }
  [:octicons-file-code-24: simple compose](/extra/docker/stacks/automation/n8n/docker-compose.simple.yaml){ .md-button }
  [:material-file-document: README](/extra/docker/stacks/automation/n8n/README.md){ .md-button }
  [:material-file-cog: .env.example](/extra/docker/stacks/automation/n8n/.env.example){ .md-button }
  </div>

  <div class="stack-note">PostgreSQL/Redis/Qdrant/MinIO까지 포함된 풀스택 구성입니다.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-chart-line: Kimai

  시간 추적 서비스 Kimai + MySQL 구성입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>DB</strong> MySQL 8.3</li>
    <li><strong>환경 변수</strong> compose 파일 하단 주석 참고</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/automation/kimai/docker-compose.yaml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">포트 매핑이 포함되어 있지 않으니 필요 시 노출 포트를 추가하세요.</div>
  </div>

</div>
