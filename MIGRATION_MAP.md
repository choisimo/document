# MIGRATION_MAP.md

저장소 레이아웃 재편 매핑 테이블 (구 경로 → 신 경로)

## 완료된 이동

| 구 경로 | 신 경로 | 비고 |
|---------|---------|------|
| `docker/` | `infra/docker/` | Docker 이미지/스택/설정 |
| `configs/` | `infra/configs/` | Nginx, HAProxy, 모니터링 설정 |
| `ansible/` | `infra/ansible/` | Ansible 플레이북 |
| `code/` | `src/examples/` | 알고리즘/자료구조 코드 |
| `scripts/` | `src/automation/` | 자동화 스크립트 |
| `tools/` | `src/tools/` | 개발 도구 (Rust CLI 등) |
| `screenshot-pages.js` | `src/screenshot-pages.js` | |
| `screenshot-retry.js` | `src/screenshot-retry.js` | |
| `package.json` | `src/package.json` | |
| `mkdocs.yml` | `apps/docs-site/mkdocs.yml` | |
| `docker-compose.docs.yml` | `apps/docs-site/docker-compose.docs.yml` | |
| `requirements.txt` | `apps/docs-site/requirements.txt` | |
| `docs/stylesheets/` | `apps/docs-site/assets/stylesheets/` (참조용 사본) + `content/docs/stylesheets/` (빌드 입력) | |
| `docs/javascripts/` | `apps/docs-site/assets/javascripts/` (참조용 사본) + `content/docs/javascripts/` (빌드 입력) | |
| `scripts/site/` | `apps/docs-site/scripts/` (사본) + `src/automation/site/` (정본) | |
| `docs/` | `content/docs/` | MkDocs 출판 소스 |
| `legacy/` | `content/archive/legacy/` | 보관용 구버전 문서 |
| `project-docs/` | `content/rendered/` | 프로젝트 산출물 문서 |
| `prompt/` | `content/prompts/` | AI 프롬프트 템플릿 |
| `memo/` | `content/notes/` | 개인 메모 |
| `research/` | `content/research/` | 기술 리서치 |
| `idea/` | `content/notes/ideas/` | 아이디어 초안 |
| `mcp/` | `src/mcp/` | MCP 설정/스크립트 |
| `proxmox/` | `content/docs/proxmox/` | Proxmox 학습 가이드 |
| `linux/` | `content/docs/linux-extra/` | 심화 Linux 문서 |
| `K8S-Study/guide/` | `content/docs/k8s/` | K8S/Ansible/Kafka 가이드 |
| `site/` | `dist/site/` | 빌드 산출물 |
| `qa-shots/` | `dist/qa-shots/` | QA 스크린샷 |

## 구 경로 제거 예정

구 경로 폴더들은 다음 릴리스에서 제거됩니다.  
**롤백 필요 시**: `git checkout HEAD~1 -- <구_경로>` 로 복원 가능합니다.

### 제거 명령 (검증 완료 후 실행)

```bash
# infra로 이동된 항목
rm -rf docker/ configs/ ansible/

# src로 이동된 항목  
rm -rf code/ scripts/ tools/
rm -f screenshot-pages.js screenshot-retry.js package.json

# apps/docs-site로 이동된 항목
rm -f mkdocs.yml docker-compose.docs.yml requirements.txt

# content로 이동된 항목
rm -rf docs/ legacy/ project-docs/ prompt/ memo/ research/ idea/ mcp/
rm -rf proxmox/ linux/ K8S-Study/

# dist로 이동된 항목
rm -rf site/
```

## 변경된 주요 명령

| 구 명령 | 신 명령 |
|---------|---------|
| `mkdocs build` | `cd apps/docs-site && mkdocs build` |
| `docker compose -f docker-compose.docs.yml up docs` | `docker compose -f apps/docs-site/docker-compose.docs.yml up docs` |
| `bash scripts/site/sync-extra-assets.sh` | `bash src/automation/site/sync-extra-assets.sh` |
| `cargo test --manifest-path tools/docs-validator-rs/Cargo.toml` | `cargo test --manifest-path src/tools/docs-validator-rs/Cargo.toml` |
| `pip install -r requirements.txt` | `pip install -r apps/docs-site/requirements.txt` |
