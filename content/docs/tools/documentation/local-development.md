---
title: 문서 사이트 로컬 개발과 검사
description: 고정된 의존성으로 MkDocs를 빌드하고 문서 검사와 브라우저 QA를 분리해 실행합니다.
---

# 문서 사이트 로컬 개발과 검사

명령은 별도 표기가 없으면 저장소 루트에서 실행한다. Python 의존성은 `apps/docs-site/requirements.txt`, Node 명령과 lockfile은 `src/`가 정본이다. CI는 Python 3.12와 Node 22를 선택하고, `src/package.json`은 Node 20 이상을 요구한다.

## Python 환경과 빌드

```bash
python3 -m venv /tmp/docs-venv
/tmp/docs-venv/bin/python -m pip install -r apps/docs-site/requirements.txt
/tmp/docs-venv/bin/python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml
```

기본 출력은 `dist/site/`다. 다른 작업자가 이 출력을 사용하면 별도 빈 디렉터리를 선택한다.

```bash
/tmp/docs-venv/bin/python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml --site-dir /tmp/docs-preview-site
```

로컬 문서 서버는 다음 명령으로 시작한다. 출력된 localhost 주소를 연다.

```bash
/tmp/docs-venv/bin/python -m mkdocs serve -f apps/docs-site/mkdocs.yml
```

Docker 대안은 `apps/docs-site/docker-compose.docs.yml`의 `docs` 서비스다. 호스트 파일 소유권은 `DOCS_UID`, `DOCS_GID`로 맞춘다. Compose는 포트를 호스트에 게시하므로 공유 환경에서는 접근 범위를 별도로 확인한다.

```bash
DOCS_UID=$(id -u) DOCS_GID=$(id -g) docker compose -f apps/docs-site/docker-compose.docs.yml up docs
```

## 검사 단계의 의미

```bash
cargo test --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml
/tmp/docs-venv/bin/python -m unittest discover -s apps/docs-site/hooks/tests -v
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --root content/docs/tools/documentation --docs-base content/docs --check all --list-files
```

첫 명령은 검사 도구의 테스트, 두 번째는 생성 데이터 hook의 테스트, 세 번째는 선택한 문서군의 실제 검사다. `--root`를 바꿔 변경 범위를 지정한다. CLI는 파일 목록을 `SCAN`으로 출력하고 문제나 잘못된 입력에는 0이 아닌 상태로 끝난다.

전체 문서는 생성된 `/extra/` 링크도 참조한다. 전체 링크 검사는 검토한 extra 자료를 빌드 후 동기화하고 `--link-root`에 같은 출력 경로를 전달해야 한다. [배포 런북](publishing-runbook.md)의 공개 검토를 마치기 전에 extra 자료를 서버에 올리지 않는다.

검사기는 외부 HTTP 주소를 요청하지 않으며, JS 동적 탐색과 모든 렌더링된 HTML 앵커를 검사하지 않는다. Mermaid 검사도 잠금 파일에 고정된 파서 기준이다.

## 브라우저 QA

```bash
npm --prefix src ci
npm --prefix src run qa:install
HUB_SITE_DIR=/tmp/docs-preview-site npm --prefix src run qa:test
```

`HUB_SITE_DIR`는 탐색 테스트들이 읽을 생성 사이트다. 스크린샷 명령은 별도의 HTTP 서버가 필요하며, 결과는 기본적으로 `dist/qa-shots`에 기록된다.

```bash
node src/screenshot-pages.js --base-url http://localhost:8000/ --path / --limit 1
node src/screenshot-retry.js --report dist/qa-shots/report.json --limit 1
```

재시도에서 일부 실패만 선택하면 나머지는 미완료로 남을 수 있다. 종료 코드와 보고서의 실패·보류 목록을 함께 확인한다. 전체 QA 옵션·경로 규칙은 `src/README.md`, 구현은 `src/qa/screenshot-runner.js`에 있다.

근거: `.github/workflows/deploy-pages.yml`, `apps/docs-site/requirements.txt`, `apps/docs-site/docker-compose.docs.yml`, `src/package.json`, `src/qa/hub-navigation.test.js`, `src/qa/screenshot-runner.js`, `src/tools/docs-validator-rs/src/main.rs`.
