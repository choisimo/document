---
title: "도구와 보조 리소스"
---

# 도구와 보조 리소스 {#extra}

<nav class="hub-directory" aria-label="도구와 보조 리소스 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group hub-directory__group--wide" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">원본 파일과 도구</h2>

- [알고리즘 시뮬레이터](/extra/algorithm-simulator/index.html)
- [알고리즘 소스 모음](/extra/algorithm-code/)
- [자동화 스크립트](/extra/scripts/)
- [서버 설정 파일](/extra/configs/)
- [프로젝트 자료](/extra/project-docs/)
- [보관 문서](/extra/legacy/)
- [프롬프트 원본](/extra/prompts-raw/)
- [MCP 설정](/extra/mcp/)
- [작업 메모](/extra/memo/)
- [시뮬레이터 소스](/extra/algorithm-code/simulator/)
- [알고리즘 구현 코드](/extra/algorithm-code/code/)
- [이진 탐색 트리 구현](/extra/algorithm-code/data-structures/tree/binary-search-tree/)
- [배포 스크립트](/extra/scripts/deployment/deploy.sh)
- [컨테이너 이미지 소스](/extra/docker/images/)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">주요 문서</h2>

- [API 키 대시보드](api-key-dashboard.html)
- [Docker Compose 컬렉션](docker/index.md)
- [Compose 스택](docker/stacks/index.md)
- [자동화 Compose 스택](docker/stacks/automation/index.md)
- [데이터베이스 Compose 스택](docker/stacks/databases/index.md)
- [개발 도구 Compose 스택](docker/stacks/devtools/index.md)
- [미디어 Compose 스택](docker/stacks/media/index.md)
- [기타 서비스 Compose 스택](docker/stacks/misc/index.md)
- [모니터링 Compose 스택](docker/stacks/monitoring/index.md)
- [프록시 Compose 스택](docker/stacks/proxy/index.md)
- [보안 Compose 스택](docker/stacks/security/index.md)
- [스토리지 Compose 스택](docker/stacks/storage/index.md)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

# Extra Resources

이 섹션에서는 문서 외의 추가 리소스들을 확인할 수 있습니다.

## 인덱스 범위

- 이 페이지는 인터랙티브 도구, 코드·스크립트와 부가 문서의 탐색 경로입니다. 링크 노출이 실행 안전성이나 현재 동작을 보증하지 않습니다.
- 도구는 지원 브라우저와 입력 범위를, 스크립트는 대상 OS·권한·부작용과 롤백을 대상 문서에서 확인합니다.
- 항목 추가·이동 시 링크와 설명을 함께 갱신하고, 대표 입력으로 실제 산출물이 생성되는 상태를 완료 기준으로 삼습니다.

---

## Interactive Tools

### [:material-play-circle: Algorithm Simulator](/extra/algorithm-simulator/index.html){ .md-button .md-button--primary target="_blank" }

실시간으로 알고리즘과 자료구조를 시각화하고 학습할 수 있는 인터랙티브 시뮬레이터입니다.

- **Binary Search Tree (BST)** - 삽입, 삭제, 탐색 시각화
- **Hash Table** - Linear Probing 충돌 해결
- **Sorting Algorithms** - Quick Sort, Merge Sort, Heap Sort
- **Heap** - Max/Min Heap 연산

---

## Code & Scripts

<div class="grid cards" markdown>

-   :material-code-braces:{ .lg .middle } **Algorithm Code**

    ---

    알고리즘 구현 코드 (Python, JavaScript, Java, Rust)

    [:octicons-arrow-right-24: Browse](/extra/algorithm-code/){ target="_blank" }

-   :material-script-text:{ .lg .middle } **Utility Scripts**

    ---

    배포, 백업, 유틸리티 셸 스크립트

    [:octicons-arrow-right-24: Browse](/extra/scripts/){ target="_blank" }

-   :material-docker:{ .lg .middle } **Docker Configs**

    ---

    Docker 이미지, Compose 파일, 문서

    [:octicons-arrow-right-24: Browse](/extra/docker/){ target="_blank" }

-   :material-cog:{ .lg .middle } **Service Configs**

    ---

    Nginx, HAProxy, 모니터링 설정 파일

    [:octicons-arrow-right-24: Browse](/extra/configs/){ target="_blank" }

</div>

---

## Documents

<div class="grid cards" markdown>

-   :material-file-document-multiple:{ .lg .middle } **Project Docs**

    ---

    프로젝트 기획서, 요구사항 문서, 설계 문서

    [:octicons-arrow-right-24: Browse](/extra/project-docs/){ target="_blank" }

-   :material-archive:{ .lg .middle } **Legacy Docs**

    ---

    이전 버전 문서, 아카이브

    [:octicons-arrow-right-24: Browse](/extra/legacy/){ target="_blank" }

-   :material-robot:{ .lg .middle } **AI Prompts**

    ---

    AI 프롬프트 템플릿, 가이드

    [:octicons-arrow-right-24: Browse](/extra/prompts-raw/){ target="_blank" }

-   :material-connection:{ .lg .middle } **MCP Configs**

    ---

    Model Context Protocol 설정

    [:octicons-arrow-right-24: Browse](/extra/mcp/){ target="_blank" }

-   :material-note-text:{ .lg .middle } **Memo**

    ---

    메모, 임시 문서

    [:octicons-arrow-right-24: Browse](/extra/memo/){ target="_blank" }

</div>

---

## Quick Links

| Resource | Description | Type |
|----------|-------------|------|
| [Algorithm Simulator](/extra/algorithm-simulator/index.html){ target="_blank" } | 인터랙티브 알고리즘 시각화 | :material-web: Web App |
| [Simulator Sources](/extra/algorithm-code/simulator/){ target="_blank" } | Python/JavaScript/Java 시뮬레이터 소스 | :material-source-repository: Source |
| [Architect Code](/extra/algorithm-code/code/){ target="_blank" } | 알고리즘 풀이 아카이브 | :material-code-braces: Code |
| [BST Implementation](/extra/algorithm-code/data-structures/tree/binary-search-tree/){ target="_blank" } | 4개 언어 BST 구현 | :material-code-braces: Multi-lang |
| [Deploy Script](/extra/scripts/deployment/deploy.sh){ target="_blank" } | 배포 스크립트 | :material-bash: Shell |
| [Docker Images](/extra/docker/images/){ target="_blank" } | 개발 환경 Docker 이미지 | :material-docker: Docker |

</details>
