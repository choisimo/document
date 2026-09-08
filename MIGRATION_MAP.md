# 저장소 마이그레이션 매핑

저장소 레이아웃 재편 과정에서 사용한 구 경로와 신 경로의 대응표다. 경로 이동 여부, 제거 대상, 변경된 실행 명령을 한 곳에서 확인할 수 있다.

## 문서 상태와 완료 판정

이 표는 경로 이동의 대응 관계를 기록한다. 표에 항목이 있다는 사실만으로 구 경로 삭제가 안전하다고 판정하지 않는다. 삭제는 신 경로의 파일 존재, 참조 명령의 신 경로 전환, 문서 빌드·유효성 검사 결과가 모두 확인된 뒤 수행한다. 하나라도 확인되지 않으면 구 경로를 유지하고 미확인 항목을 별도로 기록한다.

## 완료된 경로 이동

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
| `scripts/site/` | `apps/docs-site/scripts/` (호환 wrapper) + `src/automation/site/` (정본) | |
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

## 구 경로와 외부 링크 호환 정책

위 표의 루트 구 디렉터리는 현재 checkout에서 이미 제거되어 있다. 삭제 명령을
다시 실행하는 절차는 제공하지 않는다. 실행 명령·CI·빌드 설정은 신 경로만
사용한다. 이 매핑 표의 구 명령, migration 설명과 보관 문서의 당시 경로는
역사적 기록이며 현재 실행 진입점이 아니다.

- **문서 사이트 URL:** `docs_dir`의 위치 이동은 그 아래 문서의 상대 route를
  바꾸지 않는다. 같은 상대 경로의 페이지는 기존 URL을 유지한다. 페이지 자체를
  옮길 때에는 기존 경로의 안내 페이지를 유지하고 생성된 링크를 검사한다.
  `books/cs-references/`는 `books/cs-reference/`로 가는 안내 페이지이며 HTTP
  redirect는 아니다.
- **추가 정적 자산 URL:** 정본 동기화 스크립트는 기존 `/extra/scripts/`,
  `/extra/docker/`, `/extra/algorithm-code/` 등의 공개 경로를 신 소스에서 만든다.
  파일시스템의 이동과 공개 route 변경을 혼동하지 않는다.
- **GitHub 파일/Raw URL:** `main`의 제거된 구 경로는 지원을 종료했다.
  GitHub 파일 URL에 저장소가 임의의 HTTP redirect를 설정할 수는 없으므로
  위 매핑의 신 경로로 링크를 갱신한다. 역사적 내용이 필요하면 구 경로가 존재하는
  revision의 permalink를 사용한다. 예를 들어
  [이동 전 docs/index.md](https://github.com/choisimo/document/blob/ad1f83af5c3134a9e782431d2a0af75577b8c557/docs/index.md)는
  당시 소스이며 현재 정본을 뜻하지 않는다.
- **스크립트 호환:** `apps/docs-site/scripts/sync-extra-assets.sh`는 정본
  `src/automation/site/sync-extra-assets.sh`로 인자를 그대로 전달한다.
  새 자동화는 정본을 직접 사용한다. 이 wrapper의 제거 일정은 정하지 않았으며
  제거 시에는 호출 참조와 대체 명령을 먼저 확인한다.
- **복구:** `HEAD~1`이 항상 이동 전 상태인 것은 아니다. 필요한 파일이 실제로
  존재하는 revision을 `git log --all -- <구 경로>`와 `git show`로 확인하고
  임시 checkout에서 내용을 검토한다. 현재 정본을 구 파일로 일괄 덮어쓰지 않는다.

완료 증거는 실행 revision·명령·종료 코드, 생성된 파일과 실제 링크 응답으로
남긴다. 정책 기록만으로 빌드·링크·호환 경로 시험의 성공을 주장하지 않는다.

## 변경된 주요 명령

| 구 명령 | 신 명령 |
|---------|---------|
| `mkdocs build` | `cd apps/docs-site && mkdocs build` |
| `docker compose -f docker-compose.docs.yml up docs` | `docker compose -f apps/docs-site/docker-compose.docs.yml up docs` |
| `bash scripts/site/sync-extra-assets.sh` | `bash src/automation/site/sync-extra-assets.sh` |
| `cargo test --manifest-path tools/docs-validator-rs/Cargo.toml` | `cargo test --manifest-path src/tools/docs-validator-rs/Cargo.toml` |
| `pip install -r requirements.txt` | `pip install -r apps/docs-site/requirements.txt` |
