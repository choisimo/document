# preview.html 기준 프론트엔드 재구현

사용자가 제공한 `/home/nodove/다운로드/preview.html`의 디자인과 레이아웃을
실제 문서 사이트에 적용한다. 앞선 Material 스타일 변경안은 이 구현으로 대체한다.
원본 프리뷰 파일은 수정하지 않는다.

## 화면과 데이터

홈 검색, 주제별 문서 목록, 검색 결과, 문서 읽기, Docker 목록과 상세,
보관함, 문서 비교, 설정 화면을 같은 디자인 체계로 제공한다.
프리뷰에 포함된 예시 문서, 구성 파일, API 키와 사용 기록은 실제 데이터로
취급하지 않는다. MkDocs 빌드 훅이 실제 문서의 제목·목차·본문과 Compose
설정 파일의 메타데이터를 생성하며, 화면에서 필요한 문서 본문을 불러온다.
읽기 시간은 본문 분량에 따른 추정치이고, 없는 갱신 날짜는 만들지 않는다.

기존 문서 주소와 제목 앵커, 알고리즘 카탈로그의 별도 `README/` 주소는
유지한다. JavaScript를 사용하지 않을 때도 정적 문서 본문을 읽을 수 있다.
검색 결과는 실제 빌드 문서를 사용하며 외부 AI 호출 없이 문서를 찾을 수 있다.

표시 설정과 사용자가 명시적으로 저장한 책갈피는 브라우저에 저장한다.
읽기 기록과 비교 창의 문서·방문 기록은 현재 탭의 세션 저장소에 둔다.
공개 AI 구성은 기존 공개 설정 경계를 사용하고, 실제 백엔드가 제공하지 않는
API 키 발급·사용량 조회를 가상으로 성공 처리하지 않는다.

## 구현 경계

- `apps/docs-site/overrides/main.html`: 모든 문서의 공통 HTML 셸과 정적 대체 본문.
- `content/docs/stylesheets/hub-app.css`: 원본 프리뷰 스타일 및 실제 Markdown 표현.
- `content/docs/javascripts/hub-app.js`: 화면 전환, 검색, 읽기, 비교와 사용자 설정.
- `apps/docs-site/hooks/hub_data.py`: `hub/catalog.json`과 개별 본문 JSON 생성.
- `src/qa/hub-navigation.test.js`: 실제 빌드 결과에 대한 Chromium 검증.

이전 Material 전용 스타일·스크립트는 새 셸에서 불러오지 않는다.
과거 편집에서 보존한 Markdown 본문과 관리 메모는 유지한다.

## 로컬 검증

```sh
mkdocs build --strict --clean -f apps/docs-site/mkdocs.yml
bash src/automation/site/sync-extra-assets.sh dist/site/extra
HUB_SITE_DIR="$PWD/dist/site" npm --prefix src run qa:test
```

이 작업은 로컬 구현 및 검증이다. 배포나 병합 커밋은 포함하지 않는다.

## 최종 검증 결과

| 검사 | 결과 |
| --- | --- |
| strict MkDocs 빌드 및 정적 파일 동기화 | 통과: 실제 문서 265개, 주제 6개, Docker 스택 21개 |
| Node / Chromium 전체 테스트 | 42/42 통과, 실패·건너뛰기 0 |
| 데이터 생성 hook 테스트 | 6/6 통과 |
| 생성 본문 링크·목차 | 내부 주소 18,468개와 목차 ID 5,006개 확인, 누락 0 |
| Docker 공개 파일 | 40개 모두 존재 |
| 원본 문서 검사 | 265개 문서, 링크 686개, Mermaid 파서 블록 1,463개 통과 |
| 원본 홈과 시각 비교 | 1440px·390px × 밝은·어두운 테마: 주요 영역 위치 차이 0, 문서 수 표시 위 픽셀 차이 0 |
| 실제 화면 검수 | 읽기·비교·설정·연결 등 24개 화면과 CS 필터 3개 너비에서 가로 넘침·미처리 JS 오류 0 |
| 실제 도표 렌더링 | LL Parser 문서의 Mermaid 도표 2개 SVG 렌더링 통과 |

브라우저 검사는 전체 본문 검색, 검색 색인 실패 후 검색어를 보존한 재시도,
기존 주소·앵커와 URL 하위 경로, 문서 전환 중 늦게 도착하는 응답,
책갈피 35개 저장 후 새로고침, 비교 창 복원과 저장소 경계,
JavaScript 미사용·앱 파일 실패 시 정적 읽기까지 확인했다.
동일한 실제 CS 문서를 두 비교 창에 열어도 ID 충돌이 없고 필터는 독립적으로 동작한다.
AI 요청은 실제 클라이언트의 전송을 브라우저에서 차단하여 오류 후 입력과 포커스
복구를 확인했다. 외부 서비스의 인증 및 실제 응답 성공은 검증하지 않았다.

원래 Compose 파일 중 `media/qbittorrent-advanced`와 `storage/droppy`는
YAML 문법 또는 services 구조에 문제가 있다. 목록과 원본 파일은 제공하되
서비스 수를 임의로 만들지 않고 미확인으로 표시한다.
Rust 파서 검사는 모든 문서의 브라우저 Mermaid 렌더링 성공을 뜻하지 않는다.
이전 전체 감사에서 남아 있던 책 문서 도표 렌더링 문제는 이 디자인 작업에서
일괄 수정하지 않았으며, 렌더링 실패 시 원문을 읽을 수 있도록 처리했다.

검증 로그·이미지는 `dist/qa-shots/preview-rebuild/`에 보관한다.
원본 프리뷰 SHA256은 `0d3b91c9f9c4a58a736c6784d1e2b768bd500374a01d00f17c1a488ec6399ccc`이며 변경하지 않았다.
[압축본 소스 비교](source-snapshot-comparison-20260908.md)도 별도로 기록했다.
