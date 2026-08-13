<!-- markdownlint-disable MD033 MD030 -->
# Docker Compose Stacks

서비스별 Docker Compose 스택을 카테고리로 정리했습니다. 각 페이지의 명령은 검토를 시작하기 위한 예시이며 무조건 바로 실행할 운영 명령이 아닙니다.

## 공통 실행 계약

- `docker compose config`로 변수 치환과 최종 포트·볼륨·네트워크를 먼저 검토합니다.
- 이미지 태그 또는 digest, 비밀 주입, 자원 한도, healthcheck, 로그 보존과 데이터 백업을 명시합니다.
- 시작 성공, 준비 완료, 데이터 복구 가능, 외부 공개 안전을 서로 다른 검증 항목으로 기록합니다.
- 업그레이드는 현재 데이터의 백업·복원 시험과 이전 이미지로의 롤백 조건을 만든 뒤 수행합니다.

<div class="compose-hero" markdown>
<span class="compose-kicker">Quick Start</span>

## 공통 실행 절차

```bash
cd docker/stacks/<category>/<stack>
cp .env.example .env   # 파일이 있을 때만
# 필요한 값 입력 후

docker compose up -d
```

<div class="compose-actions" markdown>
[:material-folder-open: Raw Docker 디렉토리](/extra/docker/){ .md-button target="_blank" }
[:octicons-arrow-right-24: Docker Compose 홈](../index.md){ .md-button .md-button--primary }
</div>
</div>

## 카테고리

<div class="grid cards compose-grid" markdown>

-   :material-database-outline:{ .lg .middle } **Databases**

    ---

    MariaDB · MongoDB · Supabase

    [:octicons-arrow-right-24: Databases](databases/index.md)

-   :material-cog-outline:{ .lg .middle } **Automation**

    ---

    n8n · Kimai

    [:octicons-arrow-right-24: Automation](automation/index.md)

-   :material-source-branch:{ .lg .middle } **Devtools**

    ---

    Gitea · Sourcebot · Termix

    [:octicons-arrow-right-24: Devtools](devtools/index.md)

-   :material-lock-outline:{ .lg .middle } **Security**

    ---

    Vaultwarden

    [:octicons-arrow-right-24: Security](security/index.md)

-   :material-playlist-music:{ .lg .middle } **Media**

    ---

    Ghost · qBittorrent

    [:octicons-arrow-right-24: Media](media/index.md)

-   :material-folder-outline:{ .lg .middle } **Storage**

    ---

    Droppy · PicoShare

    [:octicons-arrow-right-24: Storage](storage/index.md)

-   :material-chart-line:{ .lg .middle } **Monitoring**

    ---

    ChangeDetection · Prometheus

    [:octicons-arrow-right-24: Monitoring](monitoring/index.md)

-   :material-web:{ .lg .middle } **Proxy**

    ---

    Nginx Reverse Proxy

    [:octicons-arrow-right-24: Proxy](proxy/index.md)

-   :material-shape-outline:{ .lg .middle } **Misc**

    ---

    ChangeDetection · Ghost · Kimai

    [:octicons-arrow-right-24: Misc](misc/index.md)

</div>

## 공통 운영 팁

- `.env.example`가 있으면 반드시 복사해서 값을 채운 뒤 실행합니다.
- 외부 네트워크(`nodove-net` 등)를 사용하는 스택은 `docker network create`로 먼저 생성합니다.
- 구성 변경 후에는 `docker compose down` → `docker compose up -d` 순서로 재기동하세요.

!!! tip "포트 충돌"
    이미 사용 중인 포트가 있다면 `.env` 또는 Compose 파일의 포트 매핑을 변경하세요.
