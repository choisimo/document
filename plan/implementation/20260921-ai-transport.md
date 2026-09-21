# PR00a / PR01 — AI opt-in and transport correctness

기준: `admin_nodove/document@e1cfa987838167d55b20d8a45c103c97e8b4c64d`.
범위: 기존 소스의 실제 수정. 정적 Hub·문서 주소·검색·분할 읽기·Lab 소스는 교체하지 않는다.

## 완료한 코드

- `PUBLIC_AI_ENABLED`가 명시적으로 true이고 HTTPS endpoint가 있어야 AI를 사용한다. endpoint 단독·빈 설정·이전 형식 설정은 비활성이다. 외부 endpoint/localhost fallback을 제거했다. 비활성 시 기존 Hub의 availability 검사에 맞춰 `window.aiClient=null`이 된다.
- 공개 설정 생성기에 master switch, URI 검증, 원자적 파일 교체를 추가했다. CI Variables 전달, `.env.example`, 운영 문서를 함께 변경했다. 비공개 키를 읽거나 공개 설정에 복사하지 않았다.
- 요청별 AbortController를 고정하고 검색·Notebook·생성에 취소를 전달한다. 이전 요청이 늦게 완료되어도 새로운 생성 요청을 시작하지 못한다. signal을 무시하는 검색 adapter도 대기를 취소할 수 있다. 그 adapter의 실제 내부 작업 종료까지 보장하는 것은 아니다.
- 기존 네 인자 sendMessage facade를 유지하며 `{requestId,status,content,code}` terminal 결과와 선택적인 다섯 번째 `{signal,query}` 인자를 추가했다. 완료·미완료·실패·취소를 구분하고 완료 콜백은 한 번만 호출한다.
- SSE는 UTF-8 분할, BOM, LF/CR/CRLF, 선택적 공백, multiline data, comments, usage frame을 처리한다. 완결된 `[DONE]` 없이 EOF가 오면 incomplete다. length/content_filter/tool 종료, 잘못된 JSON·스키마·Content-Type, 오류 이벤트, 빈 응답을 성공으로 처리하지 않는다.
- 요청 전체 120초·생성 대기 30초·Notebook 5초·연결 확인 10초의 기본 제한과 이벤트/응답 크기 제한을 추가했다. 모든 종료 경로에서 timer/listener/reader를 정리한다. 자동 POST 재시도·redirect·provider fallback은 없다.
- 검색 자료를 system 메시지로 승격하지 않는다. 상태 이벤트에 질문/문서/토큰을 넣지 않고 제공자 원시 오류를 그대로 노출하지 않는다. 이것만으로 서버 권한 집행이나 prompt injection 방어가 완성되는 것은 아니다.
- 기존 Hub 브라우저 오류 시험은 테스트에서만 명시적으로 AI를 활성화한다. 기존 검사를 삭제하지 않았고, 비활성 UI 검사를 추가했다.

## 실제 검증

`node --test src/qa/ai-client.test.js src/qa/public-ai-config.test.js src/qa/ai-browser-contracts.test.js`

Node v22.16.0의 node:test 기준 64 pass, 0 fail, 0 skipped (브라우저 상위 시험 1개 포함).
51개 transport 시험 + 6개 설정 시험 + 6개 브라우저 하위 시험 + 1개 상위 시험이다.
원래 감사의 12개 시나리오도 원격 blob과 동일한 원본에서 먼저 재현한 뒤 수정본으로 재실행했다: 기존 2 pass/10 failure에서 12 pass/0 failure로 바뀌었다. 이 재실행은 위 시험과 일부 중복되므로 독립 검사 76개로 합산하지 않는다.

로컬 브라우저 시험은 시스템 Chromium 144.0.7559.96과 환경에 설치된 playwright-core 1.57.0-beta를 사용했다. 저장소의 Playwright 1.63.0 lockfile은 변경하지 않았다. 정식 CI의 고정 버전 시험을 대체하지 않는다. 외부 API 요청은 모두 fixture로 차단·응답했고 제공자 호출·과금은 없다.

변경한 원본 8개는 원격 Git blob SHA와 일치하는 파일을 기준으로 작성했다. JavaScript syntax와 Python compile을 확인했다.
전체 checkout/게시 corpus가 이 실행 환경에 없으므로 strict MkDocs·Rust·전체 Hub navigation suite는 실행하지 않았다. Hub navigation 시험은 구문 검사만 했으며 새 component browser 시험과 구분한다. 실제 provider, 인증, quota, CORS 배포, 서버 측 취소, 운영 build 동일성도 미검증이다.

## 배포 주의

이 변경이 배포되면 기존 설정에 PUBLIC_AI_ENABLED가 없을 경우 도우미가 의도적으로 꺼진다. 승인된 API·사용자 입력 전송 정책을 확인하고 repository Variables에 true와 HTTPS URL을 설정해야 한다. 이 작업에서 운영 Variables를 바꾸거나 AI를 켜지 않는다. 재빌드·배포·새로고침 전 기존 탭을 원격으로 중단하는 live kill switch는 아니다.

병합·배포 전에 고정된 Playwright 버전의 전체 QA 및 실제 빌드 검증이 필요하다. 이전의 자동 외부 fallback으로 되돌리지 말고 AI 비활성 상태에서 문서 읽기를 유지한다.

## 다음 미완료 항목 — 건너뛰지 않음

PR00 전체를 완료 처리하지 않는다. 이번에는 PR00a의 opt-in 경계와 PR01 transport를 구현했다.

1. PR00b: 공개 문서/extra 자산 허용 manifest와 가상 API 키 관리 화면의 출판 분리. 현재 공개 링크·허용 corpus를 전체 checkout에서 확인하고 전후 링크 검사를 해야 한다. 이 PR에서 무검증 일괄 삭제/비공개 원본 색인을 하지 않았다.
2. PR01 release gate: 고정 버전 전체 Hub QA, strict MkDocs, Rust 검증, 운영 provider 및 배포 동일성 확인.
3. PR02: Hub 검색 정본 추출, 질문/전송 문맥 분리, 긴 문서 tail·source revision·chunk ID. 현재 DocSearchEngine 미연결은 그대로 남아 있다.
4. PR03 이후: 제한된 Docs 서버 adapter, 인용·원문 복귀, 부분 응답을 보존하는 UI, 요약·번역·후속 대화. 현재 Hub는 오류 시 표시 영역을 오류 문구로 바꾸므로 transport 결과에 남은 partial content를 사용자에게 보여 주는 개선도 필요하다.

후속 실행은 원격 HEAD/이 PR 상태를 먼저 확인하고 완료한 전송 계층을 다시 만들지 않는다.
