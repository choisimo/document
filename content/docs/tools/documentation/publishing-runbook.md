---
title: 문서 출판과 복구 런북
description: 빌드·정적 자산·검증·배포의 순서와 검색, 본문, 파일 누락을 진단하는 절차입니다.
intent: troubleshooting
---

# 문서 출판과 복구 런북

이 절차는 저장소의 배포 workflow를 설명한다. 실제 배포 성공 여부는 해당 실행의 로그와 배포된 산출물로 확인한다. 검증된 HTML, 카탈로그, 본문 JSON, 검색 색인, 공개 정적 파일을 하나의 묶음으로 관리한다.

## 출판 순서

`.github/workflows/deploy-pages.yml`은 도구 테스트와 공개 AI 설정 생성 후 엄격한 MkDocs 빌드, extra 동기화, 문서 검사, 브라우저 QA를 수행한다. `build-info.json`에는 실행 ID와 소스 revision 등이 추가된다. 배포 job은 main의 pull request 이외 실행을 조건으로 한다. 이 문서는 배포를 실행하지 않는다.

로컬에서 같은 순서를 검토하려면 다음 단계를 사용한다. 동기화 전에는 반드시 입력 디렉터리를 검토한다.

```bash
python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh dist/site/extra
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --root content/docs --docs-base content/docs --link-root dist/site --check all --list-files
```

`sync-extra-assets.sh`는 현재 archive, rendered, notes, raw prompts도 복사한다. `.gitignore`나 nav 제외는 이 복사를 차단하지 않는다. 기존 입력의 민감정보 여부를 확인하지 않은 실행 결과를 공개하면 안 된다. 이 문서의 분류나 점검표 자체가 공개 허용 목록을 구현하는 것은 아니다.

동기화는 기존 목적지 파일을 자동으로 모두 지우는 방식이 아니다. 또한 이미 있는 `index.html`은 새로 생성하지 않는다. 삭제한 원본이 이전 출력에 남는지, 새 파일이 오래된 색인에서 누락되는지 확인한다. 깨끗한 별도 출력으로 재현하고 기존 정상 산출물은 보존한다.

## 증상별 진단

| 증상 | 확인할 근거 | 복구 방향 |
| --- | --- | --- |
| MkDocs 실행 실패 | 첫 오류, requirements 버전, config 경로 | 같은 의존성으로 재현하고 오류 소스만 수정 |
| `Hub page content is incomplete` | hook의 기대 문서 집합과 전체 빌드 여부 | `--dirty` 없는 전체 빌드 |
| 목록은 있으나 본문 로드 실패 | 카탈로그의 `contentUrl`, 실제 JSON 응답 | 같은 빌드의 카탈로그와 본문 파일을 함께 사용 |
| 본문은 보이나 검색 누락 | `search/search_index.json`, 빌드 시점, Network 오류 | 전체 색인 재생성, 브라우저 재시도 |
| `/extra/` 링크 404 | 동기화 입력의 존재, 출력 경로, 생성 색인 | 검토한 입력으로 동기화 후 `--link-root` 검사 |
| 쓰기 권한 오류 | 생성 파일 소유권, Compose UID/GID | 올바른 실행 사용자로 별도 출력에 재빌드 |
| 경로 접두사 아래에서 링크 실패 | `site_url`의 path, 카탈로그 `basePath` | 실제 서비스 경로에 맞춰 전체 빌드·탐색 검사 |
| 도우미만 실패 | 공개 설정과 AI 요청 상태 | [AI 운영](ai-operations.md)으로 분리 진단 |

“페이지가 열린다”만으로 복구 완료로 표시하지 않는다. 대표 문서의 직접 URL, 카탈로그에서 열기, 본문 검색, 관련 상대 링크, extra 파일을 같은 산출물로 확인한다. 응답 상태와 파일 내용도 확인해 오류 HTML이 200으로 반환되는 경우를 구분한다.

## 되돌리기와 노출 대응

문제 발생 전 정상 산출물과 그 소스 revision을 식별한다. 알려진 정상 입력으로 별도 디렉터리에 재빌드하고 검증한 뒤 호스팅 담당 절차로 묶음 전체를 교체한다. 현재 작업 트리를 과거 파일로 일괄 덮어쓰지 않는다. 이 저장소에는 일반적인 모든 호스팅 환경에 통하는 자동 rollback 명령이 없다.

민감정보가 공개됐으면 먼저 해당 값의 발급·접근 시스템에서 무효화 또는 회전을 수행할 담당자를 지정하고 공개 산출물을 교체한다. 파일 삭제만으로 이미 내려받은 사본을 회수할 수는 없다. 증거 기록에는 값 자체 대신 파일·발견 시각·처리 상태를 남긴다.

workflow가 `_headers` 파일을 생성한다는 사실과 호스팅 서버가 그 헤더를 실제로 적용한다는 사실은 다르다. 캐시·보안 헤더는 배포 응답에서 확인한다.

## 도메인과 서비스 경로

workflow는 산출물에 `CNAME`을 쓰지만 DNS 레코드나 외부 호스팅 계정의 도메인 설정을 변경하지 않는다. 실제 공개 주소를 바꿀 때에는 호스팅 설정, DNS 소유권, TLS 응답, MkDocs의 `site_url`을 함께 확인한다. 과거 도메인 안내의 주소 목록을 현재 DNS 정답으로 복사하지 않는다.

도메인 자체의 변경과 `/docs/` 같은 경로 접두사 변경도 다르다. 접두사를 사용한다면 카탈로그의 `basePath`, 직접 문서 URL, 상대 자산, 검색·본문 JSON을 모두 같은 경로에서 확인한다. DNS 또는 TLS 장애는 Markdown 본문 재작성으로 해결되지 않는다.

근거: `.github/workflows/deploy-pages.yml`의 `build`, `deploy`, CNAME 생성 단계; `src/automation/site/sync-extra-assets.sh`의 `sync_dir`, `generate_index_for_dir`; `apps/docs-site/hooks/hub_data.py`의 `on_post_build`, `base_path`; `MIGRATION_MAP.md`의 URL 호환·복구 정책; `content/archive/legacy/docs-old/development/git/user-page.md`는 과거 도메인 안내의 존재만 확인하는 자료다.
