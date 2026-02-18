<!-- markdownlint-disable MD033 MD030 -->
# Docker Compose 컬렉션

운영/개발에 사용하는 Docker Compose 스택을 한곳에 정리했습니다. 각 스택 페이지에서 구성 파일, 환경 변수 예시, 실행 명령을 바로 확인할 수 있습니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## Compose 실행 플로우

1. 스택 페이지에서 필요한 파일을 확인합니다.
2. `docker/stacks/<category>/<stack>` 경로로 이동합니다.
3. `.env.example`가 있으면 `.env`로 복사 후 값을 채웁니다.
4. `docker compose up -d`로 실행합니다.

<div class="compose-actions" markdown>
[:octicons-arrow-right-24: 스택 전체 보기](stacks/index.md){ .md-button .md-button--primary }
[:material-folder-open: Raw 디렉토리](/extra/docker/){ .md-button target="_blank" }
</div>
</div>

## 카테고리 바로가기

<div class="grid cards compose-grid" markdown>

-   :material-view-grid:{ .lg .middle } **Stacks Overview**

    ---

    전체 스택과 공통 실행 규칙

    [:octicons-arrow-right-24: 전체 보기](stacks/index.md)

-   :material-database-outline:{ .lg .middle } **Databases**

    ---

    MariaDB · MongoDB · Supabase

    [:octicons-arrow-right-24: 데이터베이스](stacks/databases/index.md)

-   :material-cog-outline:{ .lg .middle } **Automation**

    ---

    n8n · Kimai

    [:octicons-arrow-right-24: 자동화](stacks/automation/index.md)

-   :material-source-branch:{ .lg .middle } **Devtools**

    ---

    Gitea · Sourcebot · Termix

    [:octicons-arrow-right-24: 개발 도구](stacks/devtools/index.md)

-   :material-lock-outline:{ .lg .middle } **Security**

    ---

    Vaultwarden 및 변형 구성

    [:octicons-arrow-right-24: 보안](stacks/security/index.md)

-   :material-playlist-music:{ .lg .middle } **Media**

    ---

    Ghost · qBittorrent 스택

    [:octicons-arrow-right-24: 미디어](stacks/media/index.md)

-   :material-folder-outline:{ .lg .middle } **Storage**

    ---

    Droppy · PicoShare

    [:octicons-arrow-right-24: 스토리지](stacks/storage/index.md)

-   :material-chart-line:{ .lg .middle } **Monitoring**

    ---

    ChangeDetection · Prometheus 구성

    [:octicons-arrow-right-24: 모니터링](stacks/monitoring/index.md)

-   :material-web:{ .lg .middle } **Proxy**

    ---

    Nginx Reverse Proxy

    [:octicons-arrow-right-24: 프록시](stacks/proxy/index.md)

-   :material-shape-outline:{ .lg .middle } **Misc**

    ---

    ChangeDetection · Ghost · Kimai

    [:octicons-arrow-right-24: 기타](stacks/misc/index.md)

</div>

## 사용 팁

- Compose 파일은 `/extra/docker/stacks/...` 경로에서 바로 열람/다운로드할 수 있습니다.
- README가 있는 스택은 실행 전 필수 작업(네트워크 생성, 키파일 생성)을 반드시 확인하세요.
- 포트 충돌이 있을 경우 `.env` 파일에서 매핑 포트를 변경할 수 있습니다.

!!! note "정적 파일 접근"
    `/extra/docker/` 경로는 GitHub Pages에 정적 파일로 배포됩니다. 브라우저에서 바로 열거나 `curl`로 다운로드할 수 있습니다.
