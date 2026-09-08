# 소스 스냅샷과 현재 작업 트리 비교

기준 파일: `document--snapshot--source-repro--main--3f3b95d77124--20260908T033757+0900.tar.gz`.
압축을 작업 트리에 풀거나 파일을 덮어쓰지 않고, 압축본의 일반 파일을 SHA256으로 비교했다.

압축본의 파일 **462개 중 440개는 동일하고 22개는 변경되어 있으며, 누락은 0개**다.
변경된 파일은 아래와 같다. 이 비교는 현재 작업 트리와 압축본의 차이를 뜻하며,
모든 변경이 이번 디자인 작업에서 생겼다는 의미는 아니다.

- `.env.example`
- `.github/workflows/deploy-pages.yml`
- `.gitignore`
- `apps/docs-site/docker-compose.docs.yml`
- `apps/docs-site/mkdocs.yml`
- `apps/docs-site/requirements.txt`
- `apps/docs-site/scripts/sync-extra-assets.sh`
- `content/docs/javascripts/ai-config.js`
- `content/docs/javascripts/cs-reference-filter.js`
- `content/docs/javascripts/split-view.js`
- `content/docs/javascripts/ux-enhancements.js`
- `content/docs/stylesheets/split-view.css`
- `infra/docker/configs/nginx/nginx.conf`
- `src/automation/screenshot_all_pages.py`
- `src/examples/competitive-programming/basics/bst-deletion/java/Solution.java`
- `src/examples/competitive-programming/basics/bst-insertion/java/Solution.java`
- `src/examples/competitive-programming/basics/hash-table/java/Solution.java`
- `src/package.json`
- `src/screenshot-pages.js`
- `src/screenshot-retry.js`
- `src/tools/docs-validator-rs/src/lib.rs`
- `src/tools/docs-validator-rs/src/main.rs`

압축본에 포함되지 않은 Markdown 문서·기존 소스·설정도 작업 트리에 다수 존재한다.
따라서 압축본에 없다는 사실만으로 새로 작성된 코드로 분류하지 않는다.
이번 디자인 작업에서 추가한 핵심 소스는 다음과 같다.

- `apps/docs-site/overrides/main.html`, `404.html`
- `apps/docs-site/hooks/hub_data.py`, `tests/test_hub_data.py`
- `content/docs/stylesheets/hub-app.css`
- `content/docs/javascripts/hub-app.js`
- `src/qa/hub-navigation.test.js`

구현 범위와 검증은 [프리뷰 적용 기록](frontend-preview-rebuild-20260908.md)을 참조한다.
기존 병합 해결 결과를 되돌리거나 병합 커밋을 만들지 않았다.
