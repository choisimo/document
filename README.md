# Documentation Hub

인프라, 개발, 보안, 알고리즘 등 종합 기술 문서 저장소입니다.

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

## 빠른 시작

### 로컬 문서 서버 실행

```bash
docker compose -f apps/docs-site/docker-compose.docs.yml up docs
# http://localhost:8000
```

### 사이트 빌드

```bash
cd apps/docs-site
mkdocs build --clean
```

### extra 자산 동기화

```bash
bash src/automation/site/sync-extra-assets.sh dist/site/extra
```

### 문서 유효성 검사

```bash
cargo test --manifest-path src/tools/docs-validator-rs/Cargo.toml
cargo run --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --check all
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

## 기여 가이드

| 작업 | 위치 |
|------|------|
| 새 문서 추가 | `content/docs/<카테고리>/` |
| 인프라 설정 추가 | `infra/<docker\|configs\|ansible>/` |
| 스크립트 추가 | `src/automation/<카테고리>/` |
| AI 프롬프트 추가 | `content/prompts/` |
| 리서치 문서 | `content/research/` |

문서 추가 후 `apps/docs-site/mkdocs.yml`의 `nav:` 섹션을 업데이트하세요.

## 마이그레이션 정보

구 경로 → 신 경로 매핑은 [MIGRATION_MAP.md](MIGRATION_MAP.md)를 참조하세요.  
구조 변경 ADR: [ADR-001](content/docs/adr/ADR-001-repo-layout.md)

## 기술 스택

- **문서**: [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
- **컨테이너**: Docker + Docker Compose
- **웹서버**: Nginx (production)
- **검증기**: Rust CLI (`src/tools/docs-validator-rs/`)
- **배포**: GitHub Actions → GitHub Pages (`docs.nodove.com`)
