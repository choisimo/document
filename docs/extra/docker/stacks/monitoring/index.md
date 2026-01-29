<!-- markdownlint-disable MD033 MD030 -->
# Monitoring Stacks

모니터링/상태 확인을 위한 스택 모음입니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/monitoring/<stack>
# 필요한 환경 값을 설정한 뒤
docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw 디렉토리](/extra/docker/stacks/monitoring/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Stacks Overview](../index.md){ .md-button .md-button--primary }
[:material-docker: Docker Compose 홈](../../index.md){ .md-button }
</div>
</div>

## 스택 목록

<div class="grid cards compose-grid" markdown>

- <div class="stack-card" markdown>
  ### :material-eye-outline: ChangeDetection

  Playwright 기반 웹사이트 변경 감지 스택입니다.

  <ul class="stack-meta">
    <li><strong>Compose</strong> docker-compose.yaml</li>
    <li><strong>Ports</strong> PORT (기본 5000)</li>
    <li><strong>환경 변수</strong> DATASTORE_DIR, PORT</li>
  </ul>

  <div class="stack-links" markdown>
  [:octicons-file-code-24: docker-compose.yaml](/extra/docker/stacks/monitoring/changedetection/docker-compose.yaml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">Playwright 컨테이너가 함께 실행됩니다.</div>
  </div>

- <div class="stack-card" markdown>
  ### :material-chart-line: Prometheus + Grafana Config

  Prometheus 스크레이프 타깃 설정 파일입니다.

  <ul class="stack-meta">
    <li><strong>Config</strong> prometheus.yml</li>
    <li><strong>Scrape</strong> 15s interval</li>
    <li><strong>Targets</strong> prometheus, n8n</li>
  </ul>

  <div class="stack-links" markdown>
  [:material-file-cog: prometheus.yml](/extra/docker/stacks/monitoring/prometheus-grafana/prometheus.yml){ .md-button .md-button--primary }
  </div>

  <div class="stack-note">Compose 구성은 별도로 준비해야 합니다.</div>
  </div>

</div>
