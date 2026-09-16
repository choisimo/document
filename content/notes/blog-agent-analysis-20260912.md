# Blog agent 구현 분석과 Docs Agent Lab 20개 페이지 대응

작성일: 2026-09-12. 대상: `blog` 저장소의 소스와 `document` 저장소의 현재 docs-site 소스. 산출물: 이 문서 한 파일.

## 1. 문서 작성 내용

### 1.1 결론과 판정 기준

blog에서 재사용할 근거가 가장 분명한 부분은 **문서 검색과 출처 전달, 문서 문맥을 넣는 채팅, 학습 task와 퀴즈, 편집 제안 검토, 사용자 선호, 자료 관계 그래프**다. docs-site에는 이미 **문서 카탈로그, 검색, 리더, 비교 창, 탭 단위 작업 세션**이 있다. 두 저장소를 연결한 운영 서비스의 존재나 정상 동작은 이번 조사에서 확인하지 않았다.

부모 작업의 `apps/docs-agent-lab/catalog.js`에 정의된 **01–20 ID, slug, 독립 HTML 경로를 그대로 사용한다**. 아래의 페이지 설명은 그 고정 카탈로그를 구현하기 위한 소스 대응과 확장 제안이다. 20개 기능이 blog에 모두 완성되어 있다는 뜻이 아니며, 부모가 작성 중인 예제의 실행 검증 결과도 아니다. [L01]

| 표기 | 이 보고서에서의 의미 |
| --- | --- |
| 구현 확인 | 소스에서 함수·호출·라우트 또는 UI 상태 전이를 확인했다. 운영 환경에서 실행했다는 뜻은 아니다. |
| 부분 구현 | 구성 요소는 있으나 후보 페이지의 전체 흐름, 연결 또는 보장이 부족하다. |
| 확장 제안 | 조사 범위에서 해당 제품 흐름을 확인하지 못했다. 기존 코드로부터 제안한 새 기능이다. |
| 실행 미확인 | 인증, 데이터, 외부 AI, 검색 색인, 저장소 등의 실제 작동을 호출로 확인하지 않았다. 모든 외부 연동에 적용한다. |

조사는 읽기 전용으로 수행했다. blog의 agent·서비스·테스트·빌드·배포를 실행하지 않았으며 Git 명령도 사용하지 않았다. 자격 증명, 환경 파일 값, 실제 사용자 기록, 운영 주소와 사설 배치 정보는 보고서에 수록하지 않는다. 소스의 저장소 구분은 `blog` / `document`, 경로는 각각의 저장소 루트 기준이다. `[Bxx]`, `[Dxx]`, `[L01]`은 2절의 실제 소스 근거를 가리킨다.

### 1.2 현재 docs-site 기준선

현재 기준선은 **`content/docs/javascripts/hub-app.js`**다. MkDocs의 `docs_dir`는 `content/docs`이며, 실제 override가 `ai-public-config.js`, `ai-config.js`, `ai-client.js`, `hub-app.js`를 로드한다. `apps/docs-site/assets/javascripts/`에도 유사한 파일이 있지만, 그 사본을 현재 사용자 화면의 구현으로 간주하면 안 된다. 이전 `ai-chatbot.js`, `split-view.js`, `hybrid-search.js`의 파일 존재와 현재 로드 여부도 구분해야 한다. [D01, D02, D08]

| 영역 | 확인한 동작 | 이번 이식에서 지킬 기준 |
| --- | --- | --- |
| 카탈로그·빌드 | `hub_data.py`가 문서 ID, 원본 경로, URL, 제목, 분류, 태그, 목차, 본문 JSON을 만든다. 누락된 문서 수집과 ID 충돌을 검사한다. | 기존 문서 ID·canonical URL·앵커를 공통 자산으로 삼는다. 예제에서는 합성 자료로 같은 형태를 재현한다. [D03] |
| 탐색 | 홈, 검색, 문서 목록, 리더, 비교, 보관함, 설정 등 별도 화면을 hash/문서 URL 흐름으로 연결한다. 목록·그리드·카테고리·의도 필터가 있다. | 20개 화면이 같은 카드 배치의 색상 변형이 되지 않도록 각 화면의 탐색 단위를 달리한다. [D04] |
| 검색 | 게시된 검색 색인을 지연 로드한다. 모든 검색어가 포함되는 문서를 추린 뒤 제목·태그 가중치를 더한다. | 현재 검색을 임베딩 기반 의미 검색이나 BM25라고 부르지 않는다. 검색 점수는 신뢰 확률이 아니다. [D05] |
| 리더 | 문서 본문·목차·원본 위치를 사용하며 비교 창에서도 문서 이동·앵커·기록을 유지한다. | 답변에서 원문으로 돌아가는 경로를 모든 AI 후보에 제공한다. [D04, D06] |
| 비교·작업 세션 | 1×1, 1×2, 2×1, 2×2 배치, 창별 기록·스크롤, 세션 전환이 있다. 복원 시 세션 수·문서 ID·기록 크기 등을 검증한다. | 비교 UI와 서버 작업 실행기는 다른 개념이다. `20`의 체크리스트는 기존 비교 세션에 더하는 기능이다. [D06] |
| 브라우저 저장 | 책갈피·설정·배치는 localStorage, 최근 문서·세션·활성 세션·뷰 기록은 sessionStorage로 구분한다. | 예제는 별도 저장 키를 쓰고 기존 키를 읽거나 삭제하지 않는다. 탭 저장과 장기 저장의 차이를 표시한다. [D06] |
| 문서 도우미 | 현재 문서의 텍스트 앞부분 최대 12,000자를 질문·제목·출처와 함께 `AIClient.sendMessage`에 전달한다. 화면은 응답을 `textContent`로 표시하며 모달 종료 시 요청 취소를 시도한다. | 현재는 문서 단위 질문 흐름이다. 선택 구절 전용 문맥, 인용 검증 UI, 여러 문서 합성은 별도 작업이다. [D07] |
| 검색 문맥 주입 | `ai-client.js`에는 로컬 검색·선택적 지식 검색의 병렬 호출과 retrieval 상태 이벤트가 있다. 로컬 검색은 `window.DocSearchEngine`이 없으면 `null`을 반환한다. 현재 로드 목록과 `hub-app.js`에서 그 엔진을 연결하는 경로를 찾지 못했다. | **부분 연결**로 판정한다. 검색창이 작동한다는 사실을 도우미의 자동 검색 근거로 확대하지 않는다. [D01, D08] |
| AI 연결 설정 | 공개 설정을 직렬화하는 스크립트가 있다. 연결 화면의 `enabled`는 함수 존재/설정 여부에서 계산된다. | “사용 가능” 표시는 성공한 연결 검사 결과가 아니다. 실제 AI 접속 상태를 예제에서 가장하지 않는다. [D09] |
| 기존 URL 유지 | `preserve_readme.py`가 카탈로그 README를 인접 `index.md`와 충돌하지 않는 별도 목적지에 포함한다. | 기존 문서 URL을 보존한다. 부모가 추가하는 docs 탐색 링크와 lab의 독립 실행·빌드 경계를 구분한다. [D10] |

### 1.3 Blog 기능 지도

| 기능 | 소스로 확인한 구현 | 한계·후보와의 관계 |
| --- | --- | --- |
| 관리자 agent | 등록된 `/api/v1/agent` 라우트, `run`/`stream`, 모드·도구·세션 API, 관리자 제한이 있다. frontend 편집기는 `runBlogAgent`를 호출한다. | 공개 문서 도우미가 바로 호출할 API로 볼 수 없다. docs의 completions API와 계약도 다르다. [B01, B02] |
| 실행 루프 | 대화 기록·시스템 프롬프트·검색 메모리를 준비하고 LLM 응답 → 도구 실행 → 결과 주입을 반복한다. `lib/agent/coordinator.js`는 실제 service로 재노출하는 호환 파일이다. | 실행 계획 DAG, 독립 worker agent 위임, 체크포인트 재개는 확인되지 않았다. 주석의 “planning”만으로 구현을 인정하지 않는다. [B03] |
| 도구 호출 | 도구 정의를 프롬프트에 넣고 응답의 `tool_call` 코드 블록을 파싱한다. 같은 반복에서 여러 도구를 `Promise.all`로 실행한다. | 네이티브 function-calling 요청을 전송하는 루프가 아니다. 범용 스키마 검증·권한별 도구 선택·승인 대기 상태가 실행기에서 확인되지 않는다. [B04] |
| 도구 종류 | `rag_search`, `blog_operations`, `web_search`, `code_execution`, `image_generation`, 선택적 `mcp_tools` 등록 코드가 있다. | 등록·어댑터 존재는 외부 도구 가용성의 증거가 아니다. MCP·코드·이미지 호출은 이번에 실행하지 않았다. [B05] |
| 검색·출처 | 채팅 RAG는 문서 필터, canonical 경로, 제목·점수·스니펫을 만들고 `sources` 이벤트로 전달한다. agent RAG 도구는 쿼리 확장·여러 검색 결과의 RRF 결합을 구현한다. | 출처 목록 제공과 답변 문장별 근거 검증은 다르다. `1-distance`와 RRF 점수도 서로 비교 가능한 확률이 아니다. [B06, B07] |
| 채팅 스트리밍 | provider stream을 읽는 경로와 첫 출력 전 실패 시 비스트림 응답으로 전환하는 경로가 있다. frontend는 SSE·NDJSON·JSON·텍스트 파서, 버퍼 제한, 출처 정규화를 갖춘다. | 서로 다른 전송 형식을 하나의 성공 표시로 단순화하지 않는다. 중간 실패·취소를 별도로 보여야 한다. [B08, B09] |
| agent 스트리밍 | `agent.stream()`은 `aiService.chat()` 완료 후 본문을 잘라 `text` 이벤트로 보낸다. 라우트가 이를 `token`, 도구 시작/종료/오류, 출처 이벤트로 변환한다. | **SSE 구현은 있지만 provider의 실시간 토큰 스트림은 아니다.** coordinator의 `done`을 해당 라우트 switch가 별도 이벤트로 전달하지 않는 점도 통합 전에 확인해야 한다. [B10] |
| 여러 역할의 대화 | live 채팅은 역할별 기억·호출 대상·턴 수 제한·예약된 다음 발언을 구현한다. debate는 역할별 응답을 순차 생성한다. | 대화 역할 조정은 구현 확인. 독립 연구 agent의 병렬 실행·의존성 관리·종합 결과 채택은 `12`의 확장이다. 도구 병렬 실행과 혼동하지 않는다. [B11, B12] |
| 승인·검토 | 편집기의 agent 결과를 즉시 반영하지 않고 전후 비교·수동 적용으로 전환한다. 생성 당시 문서 signature와 현재 문서가 다르면 적용을 막는다. | **에디터 변경 적용 승인**은 구현되어 있다. 이미 실행한 서버 도구의 사전 승인을 의미하지 않는다. `14`에는 별도 서버 승인 모델이 필요하다. [B13] |
| Workspace | Insight가 글·채팅·메모·thought·태그·검색의 관계를 규칙으로 구성하고 자료 모음·고정 항목을 브라우저에 저장한다. | 문서 관계 UI다. 임베딩으로 발견한 개념 그래프, 공유 프로젝트, 작업 의존성 저장소라고 단정하지 않는다. [B14] |
| 비동기 task | AI task queue에 enqueue, 소비, 결과 대기, 미처리 작업 회수, 재시도, 실패 큐 및 재처리 구현이 있다. | agent coordinator가 이 큐를 이용하는 영속 workflow라는 연결은 확인되지 않았다. 일반 사용자용 Kanban API도 아니다. [B15] |
| agent memory | 세션 기록 Map, 영속 메모리 저장소와 fallback, 벡터 메모리 검색·fallback이 분리되어 있다. 비스트림 run은 대화 일부를 벡터 메모리에 저장한다. | 프로세스 내 저장으로 대체될 수 있다. stream 경로에는 같은 자동 벡터 저장 호출이 없고 `memoryUpdated: true`는 저장 확인 결과와 연결되어 있지 않다. [B16] |
| 사용자 memory | 사용자별 메모리·대화 기록 CRUD와 인증 주체 일치 검사가 있다. 선호 설정은 버전 기반 저장 충돌을 처리한다. | agent 세션 기억과 사용자 memory를 같은 저장 범위로 보지 않는다. “학습”은 여기서 문맥·선호 축적이며 모델 재학습이 아니다. [B17, B18] |
| 학습·읽기 보조 | sketch/prism/chain/summary/quiz/custom 등 task, 관점·생각 카드, 재시도 상태, 퀴즈와 오답 재활용 코드가 있다. | 간격 반복 일정·학습 목표 선수 관계·검증된 장기 숙련도 모델은 확인되지 않았다. 퀴즈 채점 일부는 문자열 토큰 비율 규칙이다. [B19, B20] |
| 프롬프트 | 모드 registry, 응답 역할·톤·길이·언어·근거 선호, 별도의 관리자 prompt-template CRUD가 있다. | agent `/prompts`의 override Map은 관리 라우트 밖 참조를 찾지 못했다. 템플릿 저장이 실행 프롬프트 적용을 보장하지 않는다. [B18, B21] |
| 실행 관찰 | 관리자 TraceViewer에 목록·통계·상세 요청과 시간 span 표시가 있다. | 모든 agent 이벤트의 영속 로그, 순서 보장, 재생·재실행 기능은 확인되지 않았다. `13`은 일부 기반을 확장한다. [B22] |

#### 도구의 실제 범위

- `blog_operations`의 열거된 동작은 글 목록·조회·검색, 카테고리·태그, 메모 생성·조회, 통계다. 임의의 글 게시나 Git 작업 기능으로 확대하지 않는다. 편집기 `post_actions` 제안은 별도 결과 처리다. [B05, B13]
- `code_execution`은 JavaScript·Python·Bash 코드를 실행 API에 위임한다. 단계 디버거·변수 스냅샷 API는 확인되지 않았다. 공개 경로의 `/execute` 우회 차단도 존재한다. `09`는 처음부터 로컬에 정의한 실행 단계 재생으로 구현할 수 있다. [B05, B01]
- `mcp_tools`에는 파일 읽기·목록·검색·일반 tool 호출 어댑터가 있다. 활성화 여부와 외부 서버 동작은 실행 미확인이다. 폴더 접근·실제 명령 실행을 정적 예제에 가져오지 않는다. [B05]
- `tools` 필드는 agent 요청 schema에 있지만 `run`/`stream`에서 coordinator로 전달하는 options에 포함되지 않는다. 이를 UI의 도구 허용 목록이나 권한 집행 수단으로 표시하면 안 된다. [B02, B10]

### 1.4 확인된 API 계약과 이식 경계

아래는 소스에서 확인한 **경로 형태**다. 운영 주소·인증 값·접속 예시는 포함하지 않는다. 실제 AI 호출을 붙일 때는 인증 주체와 문서 접근 범위를 서버에서 정해야 한다.

| 영역 | 경로·입력/출력 | 접근·이식 시 주의 |
| --- | --- | --- |
| Docs completion | `POST {apiBase}/chat/completions`, `messages`, 선택적 `model`, `stream:true`; `choices[0].delta.content`를 읽음 | blog의 agent/chat 이벤트와 직접 호환되지 않는다. 공개 설정을 사용하는 browser client가 있다는 것만 확인했다. [D08, D09] |
| Docs 선택적 지식 검색 | `POST {knowledgeBase}/api/search`, `query`, `limit`; 결과 텍스트를 길이 제한 후 문맥에 추가 | 검색 제한시간 5초, 실패 시 빈 문맥으로 진행한다. 출처가 없는 상태를 숨기지 않는 UI가 필요하다. [D08] |
| Blog agent 실행 | `POST /api/v1/agent/run`, `/stream`; `message`, `sessionId?`, `mode`, `articleSlug?`, `tools?`, `temperature?`, `maxIterations?`, `userId?` | 관리자용. schema는 메시지 32,000자, 반복 1–10. frontend 서비스의 별도 반복 상한은 12여서 입력 상한을 통일해야 한다. 비스트림 결과는 `response`, `actions`, `sessionId`, `toolsUsed`, `memoryUpdated`, 모델·사용량. [B01, B02] |
| Blog agent 관리 | `GET /agent/tools`, `/modes`, `/sessions`, `/session/:sessionId`; 세션 삭제, memory extract/search, prompt 조회·수정·초기화 | 위 경로에는 `/api/v1` 접두사가 붙는다. 세션 삭제·기억 삭제의 범위를 동일시하지 않는다. [B02, B16, B21] |
| Blog 채팅 | `POST /api/v1/chat/session`, `/session/:sessionId/message` | 인증·요청 제한 코드가 있다. frontend 입력에 문서 문맥, 선택 블록, RAG·memory 문맥, AbortSignal 등이 있다. `text`, `session`, `sources`, `followups`, `context`, `error`, `done` 이벤트 타입. [B08, B09] |
| Blog 학습 task | `POST /api/v1/chat/session/:sessionId/task`; `{mode,payload,context,prompt}` | 성공 응답에도 `source:'fallback'`, `_fallback:true`가 나올 수 있다. 일반 task client는 이를 오류로 거절하지만 quiz wrapper는 다시 정적 문항으로 대체할 수 있다. [B19, B20] |
| 관점·생각 feed | `POST /api/v1/chat/session/:sessionId/lens-feed`, `/thought-feed` | 인증·제한과 warming/feed 상태가 있다. `warming`을 완료된 생성물처럼 표시하거나 저장하면 안 된다. [B19] |
| 검색·색인 | `POST /api/v1/rag/search`; `/embed`, `/index`, `/collections`, `/status`; 사용자 memory 검색·upsert 경로 | 검색과 관리자 색인 변경의 권한이 다르다. 일반 검색 공개 경로, 색인 변경 관리자 제한, memory 경로 인증이 각각 구현되어 있다. [B07, B17] |
| 사용자 memory·선호 | `/api/v1/memories/:userId/...`; `GET/PUT /api/v1/user/agent-preferences` | memory는 인증 주체와 userId 일치 검사. 선호는 `{version,preferences}`와 충돌 시 409. 역할·톤 설정은 도구 권한이 아니다. [B17, B18] |
| 프롬프트 템플릿 | 관리자 `/api/v1/admin/ai/prompt-templates`의 목록·생성·수정·삭제 | 변수·시스템/사용자 프롬프트 등 저장 코드. agent override와 별개 기능이다. 일반 방문자에게 관리자 API를 재사용하지 않는다. [B21] |
| 역할 대화 | `/api/v1/chat/live/...`; `/api/v1/debate/sessions/:sessionId/round/stream` 등 | 방의 자동 응답·토론 역할 생성 흐름이다. workflow job API로 바꾸려면 실행 계약을 새로 정의해야 한다. [B11, B12] |

### 1.5 20개 독립 예제의 공통 실행 규칙

예제 경로는 모두 `apps/docs-agent-lab/` 아래다. **각 `concepts/NN-slug.html`을 직접 열고 새로고침해도 해당 실험을 독립적으로 시작할 수 있어야 한다.** 가족별 공통 모듈은 공유할 수 있으나 다른 후보의 실행 결과를 선행 조건으로 삼지 않는다. 갤러리는 목록과 이동을 제공하며, 실제 실험은 개별 페이지에서 작동한다. 경로 목록은 현재 catalog의 계약이지 이번 조사에서 HTML 존재·동작을 검증했다는 선언은 아니다. [L01]

각 페이지에는 다음 세 상태를 구분하는 표시가 필요하다.

1. **로컬 예제**: 합성 문서·사전에 정의한 이벤트·규칙 기반 채점/단계 재생. 네트워크 AI 호출 없이 실제 UI 상태가 바뀐다.
2. **로컬 저장**: 해당 예제에서 입력한 내용만 별도 키로 보관. 저장 위치·초기화·내보내기를 명시한다. 기존 docs/blog 사용자 저장소를 가져오지 않는다.
3. **실제 AI 호출**: 별도 구현·검증 후에만 표시한다. 보낸 문서 범위, 진행·오류·취소·출처를 알려야 한다. 이번 lab에 자동으로 실서비스가 연결되어 있다고 표시하지 않는다.

기본값은 로컬 예제다. 실제 AI를 붙이지 않아도 검색어 입력, 선택·정렬, 카드 평가, 단계 재생, 작업 이동, 제안 수락, 내보내기 등 **각 페이지 고유의 조작은 끝까지 작동**해야 한다. 단순 안내문·빈 버튼만 있는 화면은 실행 가능한 예제로 세지 않는다.

격리 조건: lab의 실행·빌드·저장·네트워크 호출은 기존 제품과 분리한다. 부모 작업에서 허용된 docs 전용 탐색 링크 추가는 별도 범위이며, 이 보고서는 전체 작업에서 생산 설정이 변경되지 않았다고 주장하지 않는다. lab이 기존 출력·저장 데이터를 덮어쓰거나 blog 기능을 자동 실행해서는 안 된다. 현재 `hub-app.js`나 AI client를 그대로 import하여 부팅 시 요청·기존 저장소 정리가 발생하게 하지 않는다. 공통 코드가 필요하면 독립 lab 안에서 순수 데이터/함수 경계를 둔다. 공개 링크 입력 예제는 우선 URL 문자열을 저장하며 원격 페이지를 자동으로 가져오지 않는다. UI 비교용 데이터는 문서 A/B, 가상 ID, 상대 경로 등 합성 자료만 사용한다.

공통 검증 기준은 직접 URL 진입, 새로고침, 각 페이지의 핵심 조작, 초기화, 빈 상태·오류 상태, 키보드 조작, 좁은 화면, 저장 불가 상황이다. 애니메이션은 모션 감소 설정을 반영한다. 이는 부모 구현의 인수 기준 제안이며, 이번 조사에서 실행한 테스트가 아니다.

### 1.6 고정 후보별 소스 대응·설계·백엔드 요구

우선순위는 실제 제품 이식 순서다. **20개 로컬 예제 제작은 모두 P0**로 먼저 비교할 수 있다. 아래 P1–P4는 1.7절을 따른다. `R1`–`R11`은 1.8절의 제안 백엔드 요구다.

#### 01 · evidence-search — 근거를 찾는 검색

- 독립 경로: `apps/docs-agent-lab/concepts/01-evidence-search.html`
- 정보 구조·탐색: 질문 중심. 검색 결과를 방향키/클릭으로 고르고 원문으로 이동한다. 레이아웃은 결과 목록과 근거 패널이다.
- 핵심 로컬 조작: 합성 문서에 대한 검색·필터·결과 선택·일치 구절 강조·0건 처리. 스니펫이 사전 자료임을 표시하고 실제 웹 검색 성공을 연출하지 않는다.
- 소스 대응: docs의 색인·어휘 검색, blog의 RAG 결과와 출처 데이터가 있다. **부분 구현**: 통합 검색 화면과 실제 의미 검색 연결은 추가 작업이다. [D05, B06, B07]
- 실제 연동: R1·R2·R3. 검색 방식과 점수 종류, 문서 버전, 공개 범위를 응답에 포함해야 한다. 우선순위 **P1**.

#### 02 · citation-reader — 문맥을 잃지 않는 읽기

- 독립 경로: `apps/docs-agent-lab/concepts/02-citation-reader.html`
- 정보 구조·탐색: 문서 중심, 목차·앵커 이동. 본문과 여백 주석을 병치한다.
- 핵심 로컬 조작: 구절 선택 → 사전 설명/근거 열기 → 원문 구절로 복귀. 선택이 없을 때의 안내와 주석 닫기를 제공한다.
- 소스 대응: blog에 선택 블록 첨부 타입과 출처 목록 UI가 있고 docs에 현재 문서 Q&A가 있다. **부분 구현**: 답변의 개별 주장과 정확한 구절을 연결하는 인용 검증은 확인되지 않았다. [B08, B09, D07]
- 실제 연동: R1·R2·R3·R4. 전체 본문 대신 선택 범위를 명시하고, 출처 앵커·버전을 보존한다. 우선순위 **P1**.

#### 03 · document-compare — 두 문서, 하나의 판단

- 독립 경로: `apps/docs-agent-lab/concepts/03-document-compare.html`
- 정보 구조·탐색: 대조 중심, 두 문서 선택기와 비교 기준 탭. 대칭 2단 본문과 기준 표를 사용한다.
- 핵심 로컬 조작: 좌우 문서 교체·기준 전환·공통/차이 필터·비교 노트. 좁은 화면은 양쪽 탭으로 전환한다.
- 소스 대응: docs 비교 창·문서별 탐색은 **구현 확인**. 자동 의미 차이 분석·여러 문서 근거 합성은 **확장 제안**이다. [D06]
- 실제 연동: 로컬 비교에는 R1만으로 충분하다. AI 비교를 추가하면 R2·R3와 양쪽 문서 버전이 필요하다. 우선순위 **P1**.

#### 04 · knowledge-graph — 연결로 이해하는 지식

- 독립 경로: `apps/docs-agent-lab/concepts/04-knowledge-graph.html`
- 정보 구조·탐색: 관계 중심, 노드 선택·연관 노드 이동. 공간 캔버스와 우측 상세 패널, 동일 정보를 담은 목록을 제공한다.
- 핵심 로컬 조작: 노드 선택·관계 강조·종류 필터·연결된 원문 열기. 간선의 의미를 태그/참조 등 명시한다.
- 소스 대응: Insight의 `buildInsightGraph`는 글과 사용자 활동을 규칙으로 연결한다. **부분 구현**: 모든 간선을 AI가 발견한 의미 관계로 표시하면 과장이다. docs의 개념 그래프는 추가 모델링이 필요하다. [B14]
- 실제 연동: R1·R2·R8. 관계 출처·생성 방식·삭제 전파가 필요하며 개인 활동 그래프를 공개 데이터로 바꾸면 안 된다. 우선순위 **P2**.

#### 05 · topic-atlas — 주제별 지식 아틀라스

- 독립 경로: `apps/docs-agent-lab/concepts/05-topic-atlas.html`
- 정보 구조·탐색: 분야 중심, 카테고리 탭 → 컬렉션 → 읽기 목록. 편집형 매거진 배치로 검색 결과형 `01`과 구별한다.
- 핵심 로컬 조작: 분야 선택·읽기 목록 담기·목록 순서 변경·빈 컬렉션 안내.
- 소스 대응: docs 카탈로그의 category/topic/tags와 문서 목록이 기반이다. **부분 구현**: 주제별 큐레이션·권장 순서·개인 컬렉션은 추가 구성이다. [D03, D04]
- 실제 연동: R1·R5. 자동 추천 없이도 편집 메타데이터로 제공 가능하다. 추천을 붙일 때만 R2·R8을 추가한다. 우선순위 **P1**.

#### 06 · learning-path — 나에게 맞는 학습 경로

- 독립 경로: `apps/docs-agent-lab/concepts/06-learning-path.html`
- 정보 구조·탐색: 목표 중심, 수직 단계와 현재 단계 상세. 문서 분류와 학습 선수 관계를 시각적으로 구별한다.
- 핵심 로컬 조작: 목표 선택·단계 열기·완료 체크·진도 초기화. 고정된 예제 경로이며 학습 능력을 측정했다고 표시하지 않는다.
- 소스 대응: docs 목차·분류와 blog 학습 task를 활용할 수 있다. **확장 제안**: 목표별 과정·선수 관계·완료 기록을 조정하는 교육과정 엔진은 확인되지 않았다. [D03, B19, B20, N01]
- 실제 연동: R1·R5·R9. 과정 버전과 수동 완료/평가 완료를 분리한다. 우선순위 **P2**.

#### 07 · concept-tutor — 생각을 확인하는 튜터

- 독립 경로: `apps/docs-agent-lab/concepts/07-concept-tutor.html`
- 정보 구조·탐색: 질문 중심, 한 번에 한 문항을 보여주는 중앙 집중 대화와 다음 문항 이동.
- 핵심 로컬 조작: 선택 → 제출 → 정답·해설·근거 → 다음. 답하기 전 해설 표시 여부와 재시도를 제어한다.
- 소스 대응: QuizPanel·quiz task·coach 선호가 있다. **부분 구현**: 로컬 채점은 규칙 기반이며, 장기 진단·개인화된 튜터의 교육 효과까지 확인한 것은 아니다. [B18, B19, B20]
- 실제 연동: R2·R3·R9. 실제 생성 문항과 대체 문항을 구분하고 문항/답/근거 계약을 검증한다. 우선순위 **P2**.

#### 08 · recall-studio — 기억을 되살리는 복습

- 독립 경로: `apps/docs-agent-lab/concepts/08-recall-studio.html`
- 정보 구조·탐색: 기억 중심, 단일 카드와 복습 큐. `07`의 객관식 문항 흐름 대신 앞뒷면·기억 자기평가를 사용한다.
- 핵심 로컬 조작: 뒤집기·다시/어려움/쉬움 평가·큐 순서 갱신·통계 초기화. 예제 규칙을 화면에서 확인할 수 있게 한다.
- 소스 대응: blog에 퀴즈·오답 전달은 있으나 **간격 반복 일정은 확장 제안**이다. 일반 memory API는 복습 스케줄러가 아니다. [B16, B20, N01]
- 실제 연동: R5·R9. 평가 이벤트·예정 시각·알고리즘 버전을 저장한다. 모델 호출 없이 구현 가능한 기능이다. 우선순위 **P2**.

#### 09 · code-walkthrough — 한 줄씩 따라가는 코드

- 독립 경로: `apps/docs-agent-lab/concepts/09-code-walkthrough.html`
- 정보 구조·탐색: 실행 순서 중심. 코드 본문, 변수 표, 실행 로그를 나누고 단계 컨트롤로 이동한다.
- 핵심 로컬 조작: 정의된 안전한 예시 선택·한 단계 이동·자동 재생·정지·리셋. 임의 코드 실행이나 서버 접속 없이 미리 정의한 상태 변화를 재생한다.
- 소스 대응: blog의 code execution 도구·학습 CodeIDE는 관련 기반이다. **부분 구현**: 서버 실행 API가 소스 수준 단계 디버깅을 제공한다는 근거는 없다. [B05, B20]
- 실제 연동: 실제 코드를 실행할 때에만 R3·R6·R11이 필요하다. “출력 재생”과 “실제 실행” 표시를 구분한다. 우선순위 **P2**.

#### 10 · study-notebook — 문서와 연결된 학습 노트

- 독립 경로: `apps/docs-agent-lab/concepts/10-study-notebook.html`
- 정보 구조·탐색: 기록 중심, 노트 목록 + 선택 문서 + 편집기. 목록에서 문서의 해당 구절로 돌아간다.
- 핵심 로컬 조작: 합성 문서에 메모 작성·별도 키로 저장·불러오기·Markdown 내보내기·삭제. 저장 실패와 미저장 변경을 표시한다.
- 소스 대응: blog 메모 동작·memory CRUD·Insight 자료 모음, docs 문서 리더가 기반이다. **부분 구현**: 학습 노트 편집·출처 결합·내보내기의 전체 제품 흐름은 추가 설계다. [B05, B14, B17, D06]
- 실제 연동: R1·R5·R8. 사용자 노트와 AI의 장기 기억 저장을 분리하고 동기화 충돌을 처리한다. 우선순위 **P1**.

#### 11 · agent-workflow — 눈에 보이는 에이전트 흐름

- 독립 경로: `apps/docs-agent-lab/concepts/11-agent-workflow.html`
- 정보 구조·탐색: 파이프라인 중심, 수평 단계 노드와 선택 단계의 결과.
- 핵심 로컬 조작: 계획 확인 → 로컬 시작 → 일시정지 → 재개 → 완료/초기화. 단계별 상태가 실제로 바뀌되 “로컬 흐름 시뮬레이션”으로 표시한다.
- 소스 대응: 반복 실행 coordinator·도구 이벤트·별도 task queue가 있다. **부분 구현**: 저장된 체크포인트에서 재개하거나 실행 도중 계획을 수정하는 API는 확인되지 않았다. [B03, B10, B15]
- 실제 연동: R4·R6·R7. 재개를 새 실행으로 처리할지 같은 run으로 처리할지, 외부 작업 중복을 어떻게 막을지 먼저 정해야 한다. 우선순위 **P4**.

#### 12 · parallel-research — 관점이 다른 병렬 리서치

- 독립 경로: `apps/docs-agent-lab/concepts/12-parallel-research.html`
- 정보 구조·탐색: 역할 중심, 3개 작업 칼럼과 결과 비교·종합 노트. 역할별 출처·실패를 독립적으로 보여준다.
- 핵심 로컬 조작: 주제 선택·역할별 준비된 결과 실행·성공/실패 비교·결과 선택 후 종합. 대기 시간이 있는 예제도 실제 agent가 돌아가는 것으로 표시하지 않는다.
- 소스 대응: 도구 병렬 실행, live 다중 페르소나, 순차 debate가 있다. **부분 구현**: 독립 연구자 3명이 병렬 조사하고 coordinator가 종합하는 서비스는 확인되지 않았다. [B04, B11, B12]
- 실제 연동: R2·R3·R4·R7. 역할별 run·예산·상태·출처와 종합 규칙, 일부 실패 처리, 취소 전파가 필요하다. 우선순위 **P4**.

#### 13 · run-timeline — 다시 살펴보는 실행 기록

- 독립 경로: `apps/docs-agent-lab/concepts/13-run-timeline.html`
- 정보 구조·탐색: 이벤트 중심, 수직 타임라인 + 상세 패널. 검색 결과·일반 채팅 로그와 다르게 호출 단위를 탐색한다.
- 핵심 로컬 조작: 합성 run 선택·이벤트 종류 필터·재생/정지·오류 위치 이동. 입력·출력은 합성된 공개 가능한 자료만 사용한다.
- 소스 대응: agent 도구 이벤트와 관리자 TraceViewer가 있다. **부분 구현**: 모든 이벤트의 저장·순서·재생·작업 재실행을 보장하는 통합 이력은 확인하지 못했다. [B10, B22]
- 실제 연동: R4·R7. `runId`, 단조 증가 `sequence`, 이벤트 종류·상태·시각과 노출 가능한 요약이 필요하다. 이벤트 재생과 작업 재실행을 분리한다. 우선순위 **P3**.

#### 14 · permission-desk — 도구 실행 전 검토

- 독립 경로: `apps/docs-agent-lab/concepts/14-permission-desk.html`
- 정보 구조·탐색: 권한 중심, 도구·범위 표와 요청 검토 카드. 역할 선호와 권한을 다른 항목으로 표시한다.
- 핵심 로컬 조작: 읽기/쓰기 요청 선택·허용/거절·만료 예시·승인 이력 표시. 승인은 오직 로컬 상태를 바꾼다.
- 소스 대응: 관리자 접근 제한과 에디터 제안 승인은 구현되어 있다. **도구 실행 전 승인 서비스는 확장 제안**이다. 입력의 `tools` 배열은 권한 집행이 아니다. [B01, B02, B04, B13]
- 실제 연동: R3·R6·R7. 서버가 도구 실행 직전에 승인 범위·인자·만료·재사용 여부를 검사해야 한다. 단순 확인 버튼으로 대체하지 않는다. 우선순위 **P3**, 실제 변경 도구보다 먼저.

#### 15 · prompt-studio — 재사용할 수 있는 프롬프트

- 독립 경로: `apps/docs-agent-lab/concepts/15-prompt-studio.html`
- 정보 구조·탐색: 템플릿 중심, 템플릿 탭·변수 폼·결과 프롬프트 편집기.
- 핵심 로컬 조작: 템플릿 선택·변수 채우기·미입력 표시·렌더링·복사·로컬 저장. 결과는 “조합된 프롬프트”이며 AI 답변이 아니다.
- 소스 대응: 관리자 prompt-template CRUD, 모드 registry, 응답 선호가 기반이다. **부분 구현**: agent override Map의 실행 반영은 확인되지 않았다. [B18, B21]
- 실제 연동: R3·R5. 템플릿 버전·변수 schema·미리보기와 실제 실행 프롬프트의 동일성을 검증한다. 시스템 지시·사용자 자료를 별도 필드로 유지한다. 우선순위 **P2**.

#### 16 · freshness-review — 오래된 지식을 점검하는 책상

- 독립 경로: `apps/docs-agent-lab/concepts/16-freshness-review.html`
- 정보 구조·탐색: 유효성 중심, 상태 필터·검토 기한 정렬·밀도 높은 표와 요약 지표.
- 핵심 로컬 조작: 예제 문서 선택·검토 대기/완료 분류·일괄 상태 변경·초기화. 날짜와 위험 표시는 예제 기준임을 밝힌다.
- 소스 대응: docs에 날짜·원본·빌드 시각 메타데이터는 있다. **확장 제안**: 문서 사실의 유효성을 검사하고 재검토를 예약하는 서비스는 확인되지 않았다. [D03, N01]
- 실제 연동: R1·R5·R10. 문서 작성일·빌드일·마지막 검토일을 구분한다. 오래됐다는 이유만으로 틀린 문서라고 판정하지 않는다. 우선순위 **P3**.

#### 17 · gap-planner — 빈 곳을 채우는 문서 계획

- 독립 경로: `apps/docs-agent-lab/concepts/17-gap-planner.html`
- 정보 구조·탐색: 공백 중심, 계획/작성/검토 단계의 가로 Kanban 보드.
- 핵심 로컬 조작: 공백 등록·우선순위 선택·카드 이동·상세 메모·삭제. 드래그 외에 키보드/버튼 이동도 제공한다.
- 소스 대응: 검색 0건·분류 정보·AI task queue는 관련 기반이다. **확장 제안**: 문서 공백을 자동 발견하거나 편집 작업으로 관리하는 보드는 확인되지 않았다. [D03, D05, B15, N01]
- 실제 연동: R1·R5·R10. 공백 판단 근거, 중복 등록, 소유 범위, 작업 상태 전이·버전이 필요하다. 검색 실패는 곧 문서 부재라는 보장이 아니다. 우선순위 **P3**.

#### 18 · revision-review — 변경을 읽는 문서 리뷰

- 독립 경로: `apps/docs-agent-lab/concepts/18-revision-review.html`
- 정보 구조·탐색: 변경 중심, 변경 목록·전후 diff·리뷰 메모. 본문 리더와 다른 판단 작업 화면이다.
- 핵심 로컬 조작: 합성 변경 선택·수락/보류·현재 문서 변경 후 충돌 예시·초기화. 파일 저장·게시·Git 작업을 수행하지 않는다.
- 소스 대응: BotChatPanel의 제안 전후 비교·수동 적용·문서 signature 검사는 **구현 확인**. 줄 단위 diff 엔진, 문서 revision 저장소와 영속 리뷰 이력은 **확장 제안**이다. [B13]
- 실제 연동: R1·R5·R6. 대상 revision·patch·검토 결정·적용 결과를 분리하고 충돌 시 현재 문서를 보존한다. 승인했다고 즉시 게시되는 흐름으로 만들지 않는다. 우선순위 **P3**.

#### 19 · source-collection — 출처가 정리된 자료함

- 독립 경로: `apps/docs-agent-lab/concepts/19-source-collection.html`
- 정보 구조·탐색: 출처 중심, 수집 폼·분류 필터·색인 목록.
- 핵심 로컬 조작: 예시 공개 링크 문자열 등록·태그·중복 확인·검색·JSON/Markdown 내보내기. 링크를 저장한 것과 본문 수집·색인 완료를 다른 상태로 표시한다.
- 소스 대응: blog 검색 도구·RAG 색인 API·출처 목록이 있다. **부분 구현**: 일반 사용자의 컬렉션 CRUD·가져오기·내보내기 흐름은 별도 구성이다. [B05, B07, B09]
- 실제 연동: R1·R2·R5. 본문 수집을 붙일 때 URL·redirect·자료 범위 검사와 상태별 오류·삭제 전파를 서버에서 처리한다. 우선순위 **P1**.

#### 20 · local-workspace — 다음에 이어갈 작업 공간

- 독립 경로: `apps/docs-agent-lab/concepts/20-local-workspace.html`
- 정보 구조·탐색: 작업 세션 중심, 공간 전환 목록과 문서·할 일·작업 메모를 담는 작업대.
- 핵심 로컬 조작: 새 공간·공간 전환·자료 담기·체크리스트·저장/복원·선택 공간 초기화. 다른 19개 페이지를 실행한 기록이 없어도 시작 가능해야 한다.
- 소스 대응: docs의 비교 세션·저장 구분, blog Insight 자료 모음이 있다. **부분 구현**: 문서·할 일·노트를 묶는 workspace schema와 장치 간 동기화는 추가 설계다. [D06, B14]
- 실제 연동: 로컬 기능은 R1·R5의 browser 모델만으로 가능하다. 공유/동기화 시 R5·R8을 서버에 구현한다. agent 대화 sessionId를 workspace ID로 재사용하지 않는다. 우선순위 **P1**.

### 1.7 마이그레이션 우선순위

| 단계 | 대상 | 완료 기준 |
| --- | --- | --- |
| P0 · 독립 디자인 실험 | 01–20 전체 | catalog의 고정 HTML 경로마다 직접 진입·핵심 조작·초기화가 작동한다. 합성 자료·로컬 실행 표시, 별도 저장 키, 기존 제품에 대한 요청 없음. |
| P1 · 문서 읽기와 개인 작업 | 01·02·03·05·10·19·20 | 기존 source ID·경로·목차·검색 색인을 순수 데이터 계약으로 연결한다. AI 없이도 의미 있는 흐름이 완성된다. 출처와 저장 범위를 명확히 한다. |
| P2 · 학습·문맥·템플릿 | 04·06·07·08·09·15, 01·02의 실제 AI 확장 | 모델 연동은 명시적 요청에만 수행하고 결과 schema·출처·fallback을 검증한다. quiz 대체 문항과 실제 생성물을 구분한다. 코드 단계 재생은 로컬 상태로 유지 가능하다. |
| P3 · 변경과 검토 | 13·14·16·17·18 | 버전·승인·작업 이력 계약을 만든다. freshness와 공백은 사람이 판단 근거를 확인할 수 있다. 승인 검사를 실제 변경 실행보다 먼저 적용한다. |
| P4 · 서버 실행 조정 | 11·12 | 영속 run/task·중복 억제·취소 전파·승인 재검증·부분 실패·예산 제한을 갖춘 후 실제 실행을 연결한다. |

첫 제품 이식 전에 해결할 계약 차이는 다음과 같다.

1. docs의 completion delta와 blog의 chat/agent 이벤트를 별도 adapter에서 정규화한다. provider 실시간 출력, 완성 응답 분할 출력, 로컬 재생을 구별한다.
2. 로컬 문서 검색 엔진의 로드/호출 연결을 확인하고 근거가 없는 상태를 표시한다. 현재 검색창 동작만으로 도우미 retrieval을 보증하지 않는다.
3. frontend/backend 반복 제한을 통일하고 `tools` 입력이 실행 권한을 제한하지 않는 점을 먼저 해소한다.
4. prompt template 저장·agent override·실행 프롬프트를 구분하고 실제 반영 여부를 검증한다.
5. run/stream의 메모리 저장 차이, 저장 실패에도 성공으로 보이는 플래그, 세션 기록과 장기 기억의 삭제 범위를 정리한다.
6. quiz의 정적 fallback이 AI 생성 성공처럼 보이지 않게 한다. 자동 문항 준비 동작은 lab으로 그대로 가져오지 않는다.

### 1.8 실제 연결에 필요한 백엔드 계약 제안

아래는 **새 요구사항**이며 현재 API가 모두 제공한다는 의미가 아니다. 실행 가능한 로컬 lab에는 서버를 만들 필요가 없다.

| ID | 요구 | 관련 페이지·기존 기반 |
| --- | --- | --- |
| R1 | 문서 ID, 원본 상대 경로, canonical 경로, anchor, revision/content hash, 공개 범위를 담는 `DocumentRef`/`SourceRef`. 자료·문서·개념 ID의 의미를 구분한다. | 대부분의 페이지. 현재 docs 카탈로그와 blog URL 정규화를 활용. [D03, B06] |
| R2 | 검색 요청 범위·정렬·결과 수, 검색 방식·점수 종류, 부분 실패, 근거 스니펫, 주장별 출처 연결. 근거가 없을 때 답변 제한 또는 명시적 미확인. | 01·02·03·04·07·19. 현재 `sources` 목록은 시작점. [B06, B07] |
| R3 | 사용자/관리자 capability 분리, 서버에서 선택한 모델·사용량 한도, 최소 문맥 전송, 오류 분류. 비공개 provider 자격 증명을 정적 페이지에 넣지 않는다. | 실제 AI 기능 전체. 기존 admin/auth 경계를 존중. [B01, B08] |
| R4 | `runId`, `sequence`, `type`, `timestamp`, 출력 형태, `sourceRefs`, 오류, 완료/취소를 가진 이벤트 계약. SSE framing, 재접속, 완료 누락, 중복·순서 검증. | 02·11·12·13. 현재 agent/chat 이벤트의 차이를 흡수. [B09, B10] |
| R5 | 노트·컬렉션·workspace·리뷰의 소유 범위, schema/version, 충돌 검사, 저장 실패, 내보내기·삭제. browser 키에는 앱과 후보 ID를 포함한다. | 05·06·08·10·15–20. 선호 API의 버전 충돌 처리를 참고. [B18] |
| R6 | 서버 도구 실행 전 `ApprovalRequest`와 결정 상태. 대상·도구·인자 digest·문서 revision·만료·소유자·일회성 소비를 결합. 읽기와 변경 도구를 분리하고 인자 변경 시 재검토한다. | 09·11·14·18. UI signature 검사를 서버 권한의 대용으로 쓰지 않는다. [B13] |
| R7 | 영속 run/task 저장, 허용 전이, 의존성, 제한된 병렬 수, 작업별 멱등성, lease/heartbeat, 취소 전파, 부분 실패·재시도·실패 큐, 예산. 재생은 조회, 재실행은 새 변경으로 정의한다. | 11·12·13. 기존 task queue는 일부 기반이며 coordinator 연결은 추가 작업. [B15] |
| R8 | 사용자·workspace·agent session의 memory scope, provenance, 보존·삭제·동의/설정, embedding 재시도와 삭제 전파, fallback 상태 노출. 선호 변경과 모델 학습을 구분한다. | 04·10·20 및 개인화 AI. 기존 저장 계층은 서로 다른 범위를 사용. [B16, B17, B18] |
| R9 | 문항 ID·버전·정답·근거, 채점 방식, 학습 목표/선수 관계, 오답·자기평가 이벤트, 다음 복습 시각·알고리즘 버전. 정적 문항과 AI 문항에 provenance를 둔다. | 06·07·08. 단순 토큰 일치 채점을 교육적 정확성으로 표현하지 않는다. [B20] |
| R10 | 검토 기준·마지막 검증 시점·검토 근거, 내용 변경과 유효성 변경 구분, 문서 공백의 출처/중복 판단. 외부 확인은 별도 명시적 작업으로 관리한다. | 16·17. 현재 빌드 시각/문서 날짜만으로는 부족. [D03, N01] |
| R11 | 실제 코드 실행은 허용 언어·실행 제한·파일/네트워크 경계·출력 한도·취소를 가진 별도 sandbox 계약. 단계 관찰이 필요하면 명시적인 trace/debug 모델을 추가한다. | 09. 기존 최종 실행 결과 API만으로 변수 단계 추적을 보장하지 않는다. [B05] |

## 2. 검증된 출처와 조사 방법

### 2.1 읽은 지침과 조사 범위

- 사용 스킬: `explore`, `document-writer`. 실제 소스를 먼저 조사하고 구현·추론·불확실성을 분리했다.
- 읽은 저장소 지침: 상위 workspace의 `AGENTS.md`, blog의 `frontend/AGENTS.md`, `frontend/src/components/AGENTS.md`, `backend/AGENTS.md`, `workers/AGENTS.md`. 루트 `blog/AGENTS.md`와 `document/AGENTS.md`는 없었다. 지침의 위치 안내는 실제 파일·등록 코드로 다시 확인했다.
- 사용한 명령 계열: 제한된 소스 디렉터리에 대한 `rg --files`, `rg -n`, Python `Path.read_text().splitlines()`로 줄 번호를 붙인 읽기. 출력 전에 주소·토큰처럼 보이는 문자열을 마스킹했다. 애플리케이션 모듈을 import하거나 초기화하지 않았다.
- `.env`, 사용자 데이터·세션 저장소, 실행 로그·운영 설정 값·개인 자료는 근거 데이터로 사용하지 않았다. 인용한 session/user 관련 코드는 저장 모델과 인증 로직이며 실제 레코드가 아니다.
- 아래 줄 번호는 조사 시점의 스냅샷이다. 부모가 작업 중인 lab에서는 카탈로그만 읽었고 가족 모듈·완성 HTML의 동작은 판정하지 않았다.

### 2.2 Docs 및 lab 근거

| ID | 저장소 상대 경로·줄·심볼 | 실제 확인 방법·근거 |
| --- | --- | --- |
| L01 | document `apps/docs-agent-lab/catalog.js:1–422` | 줄 단위 읽기. `concepts`의 20개 ID·slug·family·axes·module·route를 확인. |
| D01 | document `apps/docs-site/mkdocs.yml:11–20,153–160`; `apps/docs-site/overrides/main.html:105–108` | 줄 단위 읽기 및 `rg -n 'DocSearchEngine\|hybrid-search'` 대조. 현재 docs root·hooks·실제 JS 로드 목록. |
| D02 | document `apps/docs-site/overrides/main.html:45–60,110–140` | 줄 단위 읽기. 부팅 설정, 좌측 탐색·상단·본문·모바일 탐색·기본 문서 fallback. |
| D03 | document `apps/docs-site/hooks/hub_data.py:226–269,351–377` | `rg -n 'on_page\|on_post\|contentUrl\|schemaVersion'` 후 본문 읽기. 메타데이터·본문·카탈로그 생성과 수집 완전성 검사. |
| D04 | document `content/docs/javascripts/hub-app.js:186–260,310–315` | `rg -n 'function route\|function library\|renders'`와 줄 단위 읽기. 화면·URL·탐색 전환. |
| D05 | document `content/docs/javascripts/hub-app.js:276–282,849–873` | 줄 단위 읽기. 어휘 포함 조건·제목/태그 점수·본문 색인 로드. |
| D06 | document `content/docs/javascripts/hub-app.js:64–99,184,361–387,586–597` | `rg -n 'sessionStorage\|localStorage\|saveWorkspace\|splitDoc\|session-switch'`와 줄 단위 읽기. 세션·배치·기록·복원. |
| D07 | document `content/docs/javascripts/hub-app.js:421–450` | 줄 단위 읽기. `openAssistant`, `sendAssistant`, 현재 문서 12,000자·출처·응답·모달 취소. |
| D08 | document `content/docs/javascripts/ai-client.js:38–128,137–204,205–299`; `content/docs/javascripts/ai-config.js:24–32`; `content/docs/javascripts/hybrid-search.js:354–448` | `rg -n 'fetch\|DocSearchEngine\|sources\|context\|abort\|RRF\|rrf'`와 관련 본문 읽기. 검색 어댑터·선택적 엔진·completion client. 엔진 로드 여부는 D01과 대조. |
| D09 | document `src/automation/site/render-public-ai-config.py:11–54,65–72`; `content/docs/javascripts/hub-app.js:389–408`; `content/docs/javascripts/ai-config.js:1–22` | 줄 단위 읽기. 공개 설정 생성·검증, 함수/설정 기반 연결 표시. 환경 변수 값은 읽지 않음. |
| D10 | document `apps/docs-site/hooks/preserve_readme.py:9–27` | 줄 단위 읽기. 별도 README 목적지·충돌 검사. |
| D11 | document `apps/docs-site/hooks/tests/test_hub_data.py:123,171,224,270,278`; `src/qa/public-ai-config.test.js:30,44,66`; `src/qa/hub-navigation.test.js:13,119,156` | `rg -n 'test\(\|def test_'`로 테스트가 주장하는 경계를 확인. 테스트 미실행. |

`apps/docs-site/assets/javascripts/ai-client.js`와 `ai-config.js`도 비교를 위해 읽었지만 현재 baseline 근거로 사용하지 않았다. 과거 `split-view-privacy.test.js`는 별도 split-view 자산의 검증 코드이므로 현재 hub-app 전체의 통과 근거로 사용하지 않는다.

### 2.3 Blog 근거

| ID | 저장소 상대 경로·줄·심볼 | 실제 확인 방법·근거 |
| --- | --- | --- |
| B01 | blog `backend/src/routes/registry.js:34–58`; `backend/src/index.js:326–336`; `workers/api-gateway/src/routes/registry.ts:38–74,118`; `workers/api-gateway/src/routes/agent.ts:26–57`; `workers/api-gateway/src/index.ts:44` | `rg -n 'agent\|basePath\|route\(\|requireBackend'`와 등록 본문 읽기. agent/chat/RAG 등록·관리자 경계·알려지지 않은 privileged 경로의 공개 우회 차단. |
| B02 | blog `backend/src/routes/agent.js:48–60,171–242`; `backend/src/middleware/schemas/agent.schema.js:11–47`; `frontend/src/services/session/agent.ts:24–29,232–280` | `rg -n 'run\|session\|tools\|maxIterations'`와 본문 읽기. 입력 한도, Idempotency-Key, coordinator options, 응답 정규화. |
| B03 | blog `backend/src/lib/agent/coordinator.js:1–3`; `backend/src/services/agent/coordinator.service.js:106–285` | 줄 단위 읽기. 실제 구현 owner·대화/메모리 준비·반복·AI 호출. |
| B04 | blog `backend/src/services/agent/coordinator.service.js:298–350,379–466` | 줄 단위 읽기. 프롬프트 도구 설명·코드 블록 파싱·`Promise.all`·직접 실행·timeout. |
| B05 | blog `backend/src/services/agent/tools/index.js:29–56,105–123`; `backend/src/services/agent/tools/blog-ops.tool.js:123–357`, `backend/src/services/agent/tools/code-execution.tool.js:26–86,99–138`, `backend/src/services/agent/tools/mcp-client.tool.js:233–329`, `backend/src/services/agent/tools/web-search.tool.js:261–356`, `backend/src/services/agent/tools/image-generation.tool.js:235–303` | `rg -n 'name:\|enum:\|execute\|case \|enabled'`와 필요한 구현 읽기. 등록과 허용 동작·외부 위임의 존재. |
| B06 | blog `backend/src/services/chat-rag.service.js:161–214`; `backend/src/routes/chat.js:643–654`; `frontend/src/services/chat/types.ts:220–235` | 줄 단위 읽기와 `rg -n 'sources\|ragContext'`. 검색 필터·출처 스니펫·점수·이벤트. |
| B07 | blog `backend/src/services/agent/tools/rag-search.tool.js:75–186,189`; `workers/api-gateway/src/routes/rag.ts:84–146` | 줄 단위 읽기, `rg -n 'post\(\|get\(\|delete\(\|require'`. embedding·쿼리 확장·RRF·검색/관리/사용자 권한 구분. |
| B08 | blog `workers/api-gateway/src/routes/chat.ts:55–102,225,348–412`; `frontend/src/services/chat/types.ts:237–299`; `frontend/src/services/chat/api.ts:304–337,391–408` | 호출·타입·인증/제한 관련 검색과 본문 읽기. 채팅 입력·선택 블록·학습 요청·별도 session 입력. |
| B09 | blog `frontend/src/services/chat/stream.ts:88–163,169–193,242–399`; `backend/src/lib/chat-streaming.js:199–242`; `frontend/src/components/features/chat/widget/components/ChatMessages.tsx:860–925` | `rg -n 'export \|source\|event\|buffer\|Abort'`와 본문 읽기. parser, provider stream/fallback, 정규화된 출처 링크. |
| B10 | blog `backend/src/services/agent/coordinator.service.js:550–694`; `backend/src/routes/agent.js:268–305,329–429` | 줄 단위 읽기. 완료된 응답 분할, 도구·출처 이벤트 변환, 종료·timeout 처리. |
| B11 | blog `backend/src/services/live-chat.service.js:264–324,457–486,970–986,1112–1288` | `rg -n 'Agent\|Round\|Promise.all\|schedule'`와 실행 단계 읽기. 역할 기억·공유 조사 문맥·순차 예약·턴 한도. |
| B12 | blog `backend/src/routes/debate.js:72–164,186–303` | 역할·stream 관련 검색과 `243–284` 본문 읽기. 순차 역할 응답·provider stream·대체 경로. |
| B13 | blog `frontend/src/components/features/admin/BotChatPanel.tsx:201–269,312–329` | 줄 단위 읽기. proposal 저장·signature 비교·전후 표시·수동 적용·서버 게시와 분리. |
| B14 | blog `frontend/src/components/features/insight-workspace/types.ts:6–39,69–87`; `frontend/src/components/features/insight-workspace/domain.ts:172–267` 이후 `buildInsightGraph`; `frontend/src/components/features/insight-workspace/InsightWorkspacePage.tsx:211–257,471–499`; `frontend/src/components/features/insight-workspace/storageGuards.ts:43–78` | `rg -n 'buildInsightGraph\|localStorage\|createStackItem'`, 타입·데이터 로드·저장 검증 읽기. 관계 UI와 브라우저 자료 모음. |
| B15 | blog `backend/src/services/ai/task-queue.service.js:62–132,165–272,276–337`; `backend/src/routes/ai.js:432–478` | `rg -n 'enqueue\|pending\|retry\|DLQ\|reprocess'`. 비동기 queue·미처리 회수·재시도·관리 API. 실제 worker 미실행. |
| B16 | blog `backend/src/repositories/memory/session.repository.js:20–61,136–152`; `backend/src/repositories/memory/persistent.repository.js:50–73,178–253`; `backend/src/repositories/memory/vector.repository.js:42–173,177–244`; `backend/src/services/agent/coordinator.service.js:503–547,684–704`; `backend/src/routes/agent.js:235` | `rg -n 'Map\(\|fallback\|sessionId\|collection\|clear\|memoryUpdated'`와 관련 본문 읽기. 기억 계층·fallback·run/stream 저장 차이. |
| B17 | blog `workers/api-gateway/src/routes/memories.ts:15–25,89–158,307–435,461–602`; `workers/api-gateway/src/routes/rag.ts:138–146`; `frontend/src/services/personal/memory.ts:170–203,253` 이후 | `rg -n 'require\|userId\|memories\.(get\|post\|patch\|delete)\|export async'`. 사용자 소유 검사·CRUD·검색 어댑터. 실제 사용자 기록 미열람. |
| B18 | blog `workers/api-gateway/src/routes/user.ts:13`; `workers/api-gateway/src/routes/agent-preferences.ts:9–39`; `shared/src/contracts/agent-preferences.js:1–34` | 줄 단위 읽기. 응답 역할/스타일·버전 충돌·권한과 선호 분리. |
| B19 | blog `frontend/src/services/chat/types.ts:107–130`; `frontend/src/services/chat/api.ts:304–337`; `backend/src/routes/chat.js:1125–1186`; `frontend/src/components/features/sentio/hooks/useAsyncArtifact.ts:1–102`; `frontend/src/components/features/sentio/hooks/useLensDeck.ts:228–235,332–334,436`; `frontend/src/components/features/sentio/hooks/useThoughtFeed.ts` | `rg -n 'invoke\|source\|fallback\|warming\|abort\|retry'`와 task/status 본문 읽기. 모드·fallback 거절·warming 재시도. |
| B20 | blog `frontend/src/components/features/sentio/QuizPanel.tsx:1–24,164–186,258–285,354–440`; `frontend/src/services/discovery/ai.ts:783–837`; `backend/src/services/quiz.service.js:63–82` 및 task prompt/normalizer | `rg -n 'quiz\|correct\|studyMode\|wrongQuestions\|fallback'`와 wrapper 본문 읽기. 생성 요청·정적 대체·오답·규칙 기반 채점. |
| B21 | blog `backend/src/lib/agent/mode-registry.js:26–69`; `backend/src/routes/agent.js:690–777`; `backend/src/services/agent/coordinator.service.js:468–489`; `workers/api-gateway/src/routes/admin-ai.ts:24`; `workers/api-gateway/src/routes/admin-ai/templates.ts:11–105` 이후 CRUD | 모드·template 검색, `rg -n 'promptOverrides' backend/src` 및 관리 본문 읽기. override 참조는 관리 라우트에만 존재. |
| B22 | blog `frontend/src/components/features/admin/ai/TraceViewer.tsx:198–235,337–428`; `workers/api-gateway/src/routes/admin-ai.ts:22` | `rg -n 'fetchTrace\|trace\|filter\|useQuery'`와 등록 확인. trace 목록·통계·상세 UI. |
| B23 | blog `frontend/src/test/chat.stream.test.ts:9–108`; `frontend/src/test/agent.test.ts:16–154`; `frontend/src/components/features/admin/BotChatPanel.test.tsx:43–56` | `rg -n 'describe\(\|it\(\|test\('`. 경계·파서·응답 정규화 관련 테스트 존재만 확인. 테스트 미실행. |
| N01 | blog `backend/src`, `frontend/src/components/features`, `frontend/src/services`, `workers/api-gateway/src`, `shared/src` | `rg -n 'freshness\|gap.?planner\|spaced.?repetition\|SM-2\|FSRS\|curriculum\|prerequisite\|reviewedAt\|nextReview\|review_due'` 결과 없음. 특정 이름 검색과 관련 실행 경로 조사를 합친 제한된 부재 근거이며 저장소 밖 서비스의 부재까지 증명하지 않는다. |

## 3. 아키텍처 선택과 가정

### 3.1 UI 공통화와 실행 격리

카탈로그·접근성·내보내기 같은 공통 요소는 lab에서 공유하되, 정보 구조와 핵심 조작은 후보마다 유지한다. `01`은 질문/결과, `02`는 구절/주석, `03`은 비교 기준, `04`는 관계, `05`는 분야, `06`은 목표 단계, `08`은 복습 큐, `11`은 실행 상태, `17`은 작업 단계가 각각 탐색의 중심이다. 같은 목록을 다른 제목으로 재사용하면 20개 독립 후보의 비교 가치가 줄어든다.

로컬 예제의 응답·이벤트는 재현성이 높고 외부 연결 없이 디자인을 검토할 수 있다. 실제 AI를 연결하면 품질·지연·비용·부분 실패가 추가된다. 따라서 view가 직접 provider를 호출하는 구조보다 `local`/`live` 실행 adapter를 구분하고 공통 결과에 provenance를 포함하는 구조가 적합하다. 이는 제안이며 이번에 adapter를 구현한 것은 아니다.

### 3.2 Source·run·session·workspace 분리

현재 코드에서 동일한 “session”이라는 말이 서로 다른 수명을 갖는다. docs의 비교 세션은 브라우저 탭의 문서 배치, blog chat session은 대화, agent session은 기억 조회 단위다. `20`의 workspace는 자료·할 일·노트 묶음으로 새로 정의해야 한다. 문자열이 비슷하다고 ID나 권한을 공유해서는 안 된다.

인용은 `URL이 존재함`, `검색된 자료임`, `특정 주장을 뒷받침함`을 나눠야 한다. 현재 blog의 `sources`는 주로 두 번째 단계의 기반이다. 정확한 문장·앵커·문서 버전과 주장 연결을 추가해야 “검증된 인용” UI가 된다. 현재 점수를 신뢰도 백분율로 변환하는 것은 근거가 없다.

### 3.3 승인·역할·기억의 의미

역할 프롬프트는 응답 태도를 바꾸며, 도구 권한을 부여하지 않는다. 관리자 인증은 접근 자격이며, 개별 변경의 사전 승인을 대신하지 않는다. 에디터 제안 적용과 서버 tool 실행의 시점을 구분해야 `14`와 `18`의 상태를 정확히 설명할 수 있다.

기억·오답·선호 저장은 다음 요청에 참고할 문맥이다. 이번 범위에서 모델 파라미터 업데이트나 자동 fine-tuning 경로는 확인하지 않았다. `08`의 “기억” 역시 모델 memory가 아니라 사용자의 복습 자기평가다. 용어를 분리하면 학습 기능과 저장 동작에 대한 과장을 줄일 수 있다.

## 4. 미확인 사항과 남은 검증

| 항목 | 현재 판단 | 실제 연결 전 필요한 확인 |
| --- | --- | --- |
| 운영 연결 | 실행 미확인 | 별도 허가된 환경에서 인증·문서 범위·provider 호출·저장·오류를 검증해야 한다. 이번 보고서의 구현 판정으로 대체하지 않는다. |
| Agent 도구 제한 | 입력 `tools`와 실행 registry가 연결되지 않은 경로 확인 | 허용 도구 집행·인자 검증·선택적 MCP 가용성·변경 작업 승인 검증. |
| Timeout·취소 | 여러 helper가 `Promise.race`/연결 종료를 사용 | 대기 종료가 외부 실행 취소까지 보장하는지 별도 확인. 중단 UI를 rollback 보장으로 표시하지 않는다. |
| SSE 완료 | chat과 agent 이벤트 형식·출력 생성 시점이 다름 | 완료·오류·재접속·끝 구분자 없는 마지막 프레임·취소를 계약 테스트로 검증. |
| Prompt override | 관리 Map 참조만 확인 | 수정한 prompt가 실제 생성에 사용되는지 검증하고, 아니라면 관리 UI에서 반영 완료로 표시하지 않는다. |
| Vector memory | RAG 도구는 v2 경로, agent vector 저장소는 v1 경로를 사용하는 코드 확인 | 선택한 검색 저장소와 API 버전 호환·fallback 노출·저장 성공 여부·삭제 범위를 확인. 주소와 배치 정보는 별도 취급. |
| Memory 저장 표시 | 비스트림 응답 `memoryUpdated:true`, 저장 실패는 별도 catch | 실제 저장 결과를 응답에 반영할지, best effort 상태를 노출할지 정한다. stream 경로와 일관성도 검증. |
| 퀴즈 대체 응답 | server/client 양쪽에 fallback 경로 | 생성 실패가 준비된 문항으로 바뀐 사실을 화면에 표시하고, 근거 없는 문항을 문서 기반 생성물로 제시하지 않는다. |
| 그래프·개인 자료 | 글과 로컬 활동을 조합하는 Insight 코드 | 공개 예제에는 합성 그래프만 사용. 실제 개인 활동·기억·노트를 읽지 않는다는 경계를 구현 단계에서도 유지. |
| 20개 예제 실행 | catalog의 경로·의도만 확인 | 부모가 각 HTML의 직접 진입·핵심 동작·초기화·네트워크 격리를 검증해야 한다. |
| 테스트 | 기존 테스트 소스 일부 확인, 미실행 | 파서·저장·출처·승인·버전 충돌을 실제 변경 범위에 맞게 검증. 기존 테스트의 존재를 이번 실행 통과로 인용하지 않는다. |

이 조사 에이전트가 작성한 정확한 경로는 **`content/notes/blog-agent-analysis-20260912.md`** 한 개다. `apps/docs-agent-lab/catalog.js`는 부모가 작성한 파일을 읽기만 했다. 이 에이전트는 blog 및 다른 document 파일을 변경하지 않았으며, 이 진술은 부모·다른 에이전트의 docs 탐색 추가 등 전체 워크스페이스 변경 목록에 대한 주장이 아니다.
