# Documentation Hub

인프라, 개발, 보안, 알고리즘 문서를 관리하는 기술 문서 저장소다. 출판 문서, 보관 문서, 자동화 코드, 인프라 설정을 분리해 다룬다.

## 사용 범위와 완료 기준

- 출판할 문서의 정본은 `content/docs/`이며, `content/rendered/`와 `dist/`는 파생 산출물이다.
- 보관 자료는 `content/archive/legacy/`에 있으며, 현재 환경의 동작을 설명하는 근거로 사용할 때는 대상 버전과 실행 결과를 별도로 확인한다.
- 문서 변경은 본문 수정, `apps/docs-site/mkdocs.yml`의 탐색 경로 반영, 아래 유효성 검사 결과 확인까지 마쳐야 완료로 판정한다.

## 저장소 구조

```
.
├── apps/
│   └── docs-site/          # MkDocs 사이트 빌더
│       ├── mkdocs.yml       # MkDocs 설정
│       ├── docker-compose.docs.yml
│       ├── requirements.txt
│       ├── assets/          # 테마 자산 (CSS, JS) 참조 사본
│       └── scripts/         # 빌드 보조 스크립트
│
├── content/
│   ├── docs/               # 정식 문서 (MkDocs 출판 소스)
│   ├── rendered/           # 파생 산출물 문서 (직접 편집 금지)
│   ├── archive/legacy/     # 구버전 문서 보관소
│   ├── prompts/            # AI 프롬프트 템플릿
│   ├── notes/              # 개인 메모 및 아이디어
│   └── research/           # 기술 리서치
│
├── infra/
│   ├── ansible/            # Ansible 플레이북
│   ├── configs/            # Nginx, HAProxy, 모니터링 설정
│   └── docker/             # Docker 이미지, Compose 스택
│
├── src/
│   ├── examples/           # 알고리즘/자료구조 구현 코드
│   ├── automation/         # 자동화 스크립트
│   ├── tools/              # 개발 도구 (docs-validator 등)
│   └── mcp/                # MCP 설정/스크립트
│
└── dist/                   # 빌드 산출물 (gitignore)
    └── site/               # MkDocs 빌드 결과
```

## 운영 명령

### 로컬 문서 서버 실행

```bash
DOCS_UID=$(id -u) DOCS_GID=$(id -g) docker compose -f apps/docs-site/docker-compose.docs.yml up docs
# http://localhost:8000
```

### 사이트 빌드

```bash
python -m pip install -r apps/docs-site/requirements.txt
(cd apps/docs-site && mkdocs build --clean)
```

MkDocs와 직접 사용하는 확장은 검증된 버전으로 고정한다. 알고리즘 묶음의 `index.md`와 `README.md`는 각각 랜딩 페이지와 상세 색인이므로 둘 다 출판한다. `apps/docs-site/hooks/preserve_readme.py`는 README의 자동 `index.html` 매핑을 대신해 `/algorithms/algorithm-architect/README/`로 연결한다. 소스 파일과 편집 링크는 그대로 유지한다.

### extra 자산 동기화

```bash
bash src/automation/site/sync-extra-assets.sh dist/site/extra
```

명령은 저장소 루트 기준이다. `apps/docs-site/scripts/sync-extra-assets.sh`는 위 정본으로 인자를 전달하는 호환 진입점이며 기본 출력은 `dist/site/extra`다. Docker에서도 `/repo/apps/docs-site`에서 같은 MkDocs 설정을 읽는다. `docs`와 `docs-build`는 기본 UID/GID 1000으로 실행하며, 다른 호스트 계정에서는 `DOCS_UID=$(id -u) DOCS_GID=$(id -g)`를 Compose 명령 앞에 지정해 생성 파일을 로컬 빌드·동기화에서도 수정할 수 있게 한다.

### AI 공개 설정

GitHub Pages의 JavaScript와 요청 헤더는 방문자가 읽을 수 있다. CI는 GitHub repository **Variables**의 `PUBLIC_*` 값만 `ai-public-config.js`에 직렬화하며, 기존 `AI_API_TOKEN`·`OPEN_NOTEBOOK_TOKEN` Secrets를 읽지 않는다. `.env.example`은 변수 이름을 설명하는 예시이며 빌더가 `.env`를 자동으로 읽지는 않는다.

- `PUBLIC_AI_API_BASE_URL`, `PUBLIC_AI_MODEL_NAME`: 공개 가능한 HTTPS API base URL(예: `/v1` 포함)과 모델 이름.
- `PUBLIC_OPEN_NOTEBOOK_ENABLED`, `PUBLIC_OPEN_NOTEBOOK_URL`: 공개 지식 검색을 활성화할지와 HTTPS 프록시 URL. 활성화할 때 URL을 반드시 지정한다.
- `PUBLIC_AI_API_TOKEN`, `PUBLIC_OPEN_NOTEBOOK_TOKEN`: 기본 빈 값. 값을 지정하면 **모든 방문자에게 그 토큰을 공개하는 데 동의한 것**이다. 발급자가 공개를 허용한 최소 권한 브라우저 토큰만 사용한다. 허용 endpoint·model·공개 KB corpus·quota·expiry를 서버에서 제한해야 하며, 이름 변경만으로 비밀 키가 공개용이 되지는 않는다. Notebook 검색 결과는 AI 요청의 컨텍스트로도 전달된다.

비밀 provider key와 비공개 Notebook 자격증명은 서버 프록시에 보관한다. 브라우저 토큰은 사이트 접근 제어나 사용자별 인증을 대체하지 않는다. 기존 Secrets 배포에서 전환할 때 URL·모델 등 공개 가능한 값만 해당 Variables로 옮기고, private token은 복사하지 않는다. 과거에 비밀 키를 공개 산출물에 넣었는지는 실제 배포 이력과 발급 정책으로 확인해야 한다.

로컬에서는 명시적으로 export한 공개 변수만 사용해 다음 명령으로 설정을 생성한다. 생성 파일에 공개를 승인하지 않은 값을 넣지 않는다.

```bash
python3 src/automation/site/render-public-ai-config.py content/docs/javascripts/ai-public-config.js
```

### 문서 유효성 검사

```bash
cargo test --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml
python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --check all --link-root dist/site
```

`--link-root`는 Compose 파일처럼 빌드 후 복사하는 공개 자산의 실제 생성 경로를 확인한다. 원본 문서 경로와 앵커 검사는 계속 우선 적용한다.

### 문서 화면 검증

사이트는 제공된 HTML 디자인을 적용한 공통 셸에서 실제 MkDocs 문서를 읽는다.
화면 구성과 데이터 생성 방식은 [프리뷰 적용 기록](content/notes/frontend-preview-rebuild-20260908.md)에 정리되어 있다.
위 빌드와 자산 동기화 이후 다음 검사를 실행한다.

```bash
python -m unittest discover -s apps/docs-site/hooks/tests -v
HUB_SITE_DIR="$PWD/dist/site" npm --prefix src run qa:test
```

## 주요 문서

### Infrastructure
- [Proxmox Cluster Setup](content/docs/infrastructure/proxmox/cluster.md)
- [Network Configuration](content/docs/infrastructure/networking/network-settings.md)
- [Monitoring Stack](content/docs/infrastructure/monitoring/prometheus-grafana-loki.md)

### Security
- [SSH Configuration](content/docs/security/ssh/configuration.md)
- [Tailscale VPN](content/docs/security/vpn/tailscale.md)
- [Cloudflare Zero Trust](content/docs/security/zerotrust/cloudflare.md)

### Development
- [Docker Installation](content/docs/development/docker/installation.md)
- [Git Branch Management](content/docs/development/git/branch-management.md)

### Tools
- [Linux Commands](content/docs/tools/terminal/linux-commands.md)
- [Tmux Guide](content/docs/tools/terminal/tmux.md)

## 문서 배치 기준

| 작업 | 위치 |
|------|------|
| 새 문서 추가 | `content/docs/<카테고리>/` |
| 인프라 설정 추가 | `infra/<docker\|configs\|ansible>/` |
| 스크립트 추가 | `src/automation/<카테고리>/` |
| AI 프롬프트 추가 | `content/prompts/` |
| 리서치 문서 | `content/research/` |

새 문서를 추가하면 `apps/docs-site/mkdocs.yml`의 `nav:` 섹션에도 같은 항목을 반영한다.

## 마이그레이션 정보

구 경로와 신 경로의 대응 관계는 [MIGRATION_MAP.md](MIGRATION_MAP.md)에 정리되어 있다.
구조 변경 ADR: [ADR-001](content/docs/adr/ADR-001-repo-layout.md)

## 기술 스택

- **문서**: [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
- **컨테이너**: Docker + Docker Compose
- **웹서버**: Nginx (production)
- **검증기**: Rust CLI (`src/tools/docs-validator-rs/`)
- **배포**: GitHub Actions → GitHub Pages (`docs.nodove.com`)
