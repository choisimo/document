# src/

소스코드, 자동화 스크립트, 개발 도구 후보를 모은 디렉터리입니다. 아래 트리와 명령은 현재 revision의 경로·의존성·실행 성공을 보장하지 않으므로 대상 파일과 하위 README를 먼저 확인합니다.

> 자동화·스크린샷·동기화 명령은 파일 생성, 외부 요청 또는 덮어쓰기를 수행할 수 있습니다. 입력·출력 경로와 환경 변수를 검토하고 제한된 대상으로 시작하며, exit code와 예상 산출물을 별도로 확인합니다.

> **규칙**: 이 디렉터리에는 코드와 스크립트만 둡니다.  
> 설명 문서(`.md`)는 각 하위 디렉터리 README에 최소화하거나 `content/docs/`를 참조한다.

## 디렉터리 구조

```
src/
├── examples/       # 알고리즘, 자료구조 구현 코드 (Python, Java, JS, Rust, C)
│   ├── architect-code/      # 알고리즘 100제 (Python)
│   ├── data-structures/     # BST, 힙, 해시테이블 구현
│   ├── simulator/           # 자료구조 인터랙티브 시뮬레이터
│   ├── templates/           # 알고리즘 템플릿 문서
│   └── c-lang/              # C 언어 예제
├── automation/     # 배포, 백업, 유틸리티 셸/파이썬 스크립트
│   ├── backup/             # rsync 백업
│   ├── deployment/         # 배포 자동화
│   ├── maintenance/        # 시스템 유지보수
│   ├── site/               # 문서 사이트 빌드 보조 스크립트
│   └── utilities/          # 범용 유틸리티
├── tools/          # 개발 도구 (Rust CLI 등)
│   └── docs-validator-rs/  # Mermaid/링크/포맷 검증기 (Rust)
├── screenshot-pages.js     # Playwright 페이지 스크린샷
├── screenshot-retry.js     # 스크린샷 재시도 유틸리티
├── qa/                     # 공통 QA 실행기와 실제 브라우저 검사
├── package.json            # Node.js 의존성/QA 명령
└── package-lock.json       # Playwright 버전과 의존성 고정
```

## 주요 명령

```bash
# 알고리즘 코드 실행 (Python)
python src/examples/architect-code/python/p001_two_sum.py

# 문서 빌드 및 extra 자산 동기화
python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh

# 원본 문서와 생성된 자산 링크의 유효성 검사
cargo run --locked --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --link-root dist/site
```

## 로컬 사이트 스크린샷 QA

명령은 저장소 루트 기준이며 Node.js 20 이상이 필요하다. 프로젝트의 `package-lock.json`으로 Playwright를 설치하고, 같은 버전이 요구하는 Chromium을 [Playwright 표준 설치 명령](https://playwright.dev/docs/browsers#install-browsers)으로 준비한다.

```bash
npm --prefix src ci
npm --prefix src run qa:install

# MkDocs Python 의존성을 먼저 설치한 환경에서 사이트 생성
(cd apps/docs-site && mkdocs build --clean)
bash src/automation/site/sync-extra-assets.sh

# 별도 터미널에서 로컬 HTTP 서버 실행
python -m http.server 8000 --bind 127.0.0.1 --directory dist/site
```

서버가 실행 중인 상태에서 필요한 범위로 검사한다. 기본 목록은 `dist/site`의 실제 HTML 파일에서 찾으며 `index.html`을 디렉터리 URL로 변환하고 루트의 `404.html` 템플릿은 제외한다. 사이트를 아직 빌드하지 않았다면 `--path`로 서버의 특정 경로를 직접 지정할 수 있다.

```bash
# 특정 페이지만 검사 (--path 반복 또는 /로 시작하는 위치 인자)
npm --prefix src run qa:screenshots -- --path / --path /algorithms/

# 생성된 페이지 중 일부만 검사
npm --prefix src run qa:screenshots -- --prefix /algorithms/ --limit 5

# 생성된 모든 HTML 페이지 검사
npm --prefix src run qa:screenshots

# 직전 보고서에 기록된 실패만 재시도
npm --prefix src run qa:retry

# 보고서를 명시하여 실패를 한 페이지만 재시도
node src/screenshot-retry.js --report dist/qa-shots/report.json --limit 1
```

특정 실행을 다시 검사하려면 `--report`에 보존된 실행별 JSON 경로를 지정한다. 재시도는 이전 실행의 `failedPaths`를 읽고 기존 BASE_URL·브라우저·시간 제한·문서 진단 옵션을 이어받는다. `--limit`, `--prefix`, `--path`로 일부만 재시도하면 미시도 실패를 `pendingPaths`와 `failedPaths`에 남기며 종료 코드도 계속 `1`이다. 실패가 없는 보고서를 재시도하면 브라우저를 실행하지 않고 `0`으로 종료한다.

| 설정 | 환경 변수 | CLI 옵션 | 기본값 |
| --- | --- | --- | --- |
| 사이트 URL | `BASE_URL` | `--base-url` | `http://localhost:8000/` |
| 생성된 HTML 경로 | `SITE_DIR` | `--site-dir` | 저장소의 `dist/site` |
| 보고서·이미지 출력 | `QA_OUTPUT_DIR` | `--output-dir` | 저장소의 `dist/qa-shots` |
| Chromium 실행 파일 | `CHROMIUM_PATH` | `--chromium-path` | 프로젝트 Playwright가 관리하는 Chromium |
| 탐색·스크린샷 시간 제한 | `QA_TIMEOUT_MS` | `--timeout-ms` | `30000` ms |
| `load` 후 관찰 대기 | `QA_SETTLE_MS` | `--settle-ms` | `500` ms |

CLI 옵션이 환경 변수보다 우선한다. 모든 페이지 경로는 BASE_URL의 경로 아래에 붙는다. 예를 들어 `--base-url http://127.0.0.1:8000/docs/ --path /guide/`는 `/docs/guide/`를 검사한다. 상대 파일 경로는 프로세스의 현재 디렉터리 기준이며, `npm --prefix src run ...`의 현재 디렉터리는 `src/`이므로 상대 경로를 명시할 때는 저장소 루트에서 `node src/screenshot-pages.js ...`를 쓰거나 절대 경로를 사용한다.

기본 산출물은 `dist/qa-shots/report.json`(최신 실행), `report-<run-id>.json`(보존된 실행별 보고서), `<run-id>/*.png`다. 보고서에는 Git HEAD와 추적 파일 변경 여부, 시작·종료 시각, Node/OS/Playwright/Chromium 실행환경, 선택된 경로, 페이지별 HTTP 상태·오류·이미지 경로·실제 실패 목록을 기록한다. HEAD만으로 작업 중인 파일이나 서버가 제공하는 빌드의 동일성을 증명하지는 않으므로 검사 전에 해당 소스에서 사이트를 빌드해야 한다.

페이지와 하위 리소스의 HTTP 오류, 요청 실패, JavaScript `pageerror`, 탐색/실행 실패가 있으면 종료 코드 `1`이다. 404 화면을 저장했더라도 실패로 남는다. `console.error`는 진단 정보로 기록한다. 관찰 범위는 페이지 로드부터 설정된 대기 시간과 스크린샷 저장까지이며, 이후 발생하는 오류나 클릭 같은 추가 상호작용은 이 검사에 포함되지 않는다. 브라우저 시작 실패는 미실행 경로를 재시도 목록에 남기고, 보고서를 쓸 수 없는 출력 경로 오류도 stderr와 종료 코드 `1`로 알린다.

### 문서 진단과 Python 호환 실행

MkDocs 페이지는 `--docs-diagnostics`로 문서 진단을 추가할 수 있다. 진단 결과는 각 페이지의 `docsDiagnostics`에 기록하며 문제가 있으면 `errors`와 `failedPaths`에도 반영하여 종료 코드 `1`을 반환한다.

| 진단 코드 | 관찰 조건 |
| --- | --- |
| `no-content-inner` | Material의 `.md-content__inner`와 Hub의 `main#main` 내용 영역이 모두 없음 |
| `404-page` | HTTP 상태와 별개로 제목의 `404`/`Not Found` 또는 주제목 시작의 `404`/`Not Found`를 발견 |
| `horizontal-overflow` | 문서 가로 폭이 현재 뷰포트보다 20px 넘게 큼 |
| `mermaid-errors` | Mermaid 오류 표시, `data-processed="false"`, 오류 SVG 표시를 발견 |
| `mermaid-unrendered` | Mermaid 소스 블록에 SVG가 없음 |
| `svg-overflow` | SVG가 가로 1400px 또는 세로 3000px을 초과 |

soft 404와 큰 SVG는 기존 Python 도구의 휴리스틱을 유지하므로 의도된 문서 내용도 검토 대상이 될 수 있다. Mermaid가 관찰 시간 안에 렌더링되지 않으면 대기 시간을 조정하고 다시 검사한다. 일반 HTML은 내용 영역 선택자가 다를 수 있으므로 MkDocs 경로로 범위를 좁히거나 `--no-docs-diagnostics`로 문서 진단을 명시적으로 끈다. HTTP·브라우저 실패 검사는 계속 적용된다.

```bash
node src/screenshot-pages.js --docs-diagnostics --prefix /algorithms/ --limit 5

# 기존 Python 실행 형식: 첫 위치 인자는 출력 디렉터리
python3 src/automation/screenshot_all_pages.py dist/qa-shots --path /algorithms/

# 출력 인자를 생략하면 공통 기본 경로 dist/qa-shots 사용
python3 src/automation/screenshot_all_pages.py --prefix /algorithms/ --limit 5

# 실패 경로와 문서 진단 설정을 함께 이어받음
node src/screenshot-retry.js
```

Python 진입점은 표준 라이브러리만 사용해 프로젝트의 Node 실행기로 위임하며 문서 진단을 기본 활성화한다. Node와 프로젝트 Playwright/Chromium은 위 설치 명령으로 준비한다. 두 진입점은 환경 변수·페이지 발견·1440×900 뷰포트·실패 종료 코드·보고서 형식을 공유한다. Python의 첫 위치 인자는 호출한 디렉터리를 기준으로 해석하며 페이지를 지정할 때는 `--path`를 사용한다. 종전 `scan_results.json`을 읽던 후속 도구는 `report.json`의 `pages[].docsDiagnostics`와 `failedPaths`를 사용하도록 전환한다.

QA 회귀 검사는 임시 로컬 HTTP 서버와 실제 Chromium으로 수행한다. 먼저 MkDocs와 정적 자산을 빌드한 다음 홈·자료실·분류 목록의 실제 검색, 필터, 페이지 이동, 좁은 화면을 함께 검사한다. 해당 탐색 테스트는 외부 요청을 차단하며 AI 서비스의 응답까지 검증하지 않는다. 결과와 명령 기록은 출력된 임시 디렉터리에서 확인할 수 있다.

```bash
python -m mkdocs build --strict -f apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh
HOME_SITE_DIR="$PWD/dist/site" \
CATALOG_SITE_DIR="$PWD/dist/site" \
DIRECTORY_SITE_DIR="$PWD/dist/site" \
SHELL_SITE_DIR="$PWD/dist/site" \
npm --prefix src run qa:test
```
