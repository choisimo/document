# Documentation Agent Lab

`docs.nodove.com`에 추가할 경험을 평가하는 **20개 독립 예시 페이지**입니다. 현재 사이트의 파란색 강조색과 문서 중심 표현을 바탕으로 탐색, 학습, 에이전트, 관리 네 분야를 비교합니다.

## 실행

Node.js 20 이상이면 앱 실행과 빌드에 별도 패키지 설치가 필요하지 않습니다.

```bash
cd apps/docs-agent-lab
npm run dev
# http://127.0.0.1:4173
```

포트가 사용 중이면 `LAB_PORT=4174 npm run dev`로 바꿉니다. 서버는 loopback에만 바인딩합니다. 종료는 해당 터미널에서 `Ctrl+C`입니다. HTML을 더블클릭하는 `file://` 실행 대신 로컬 서버를 사용하세요.

```bash
npm run build  # 이 디렉터리의 dist/에만 정적 산출물 생성
npm run check # Node 내장 테스트
npm run qa    # 저장소 src에 이미 선언된 Playwright로 브라우저 검증
```

브라우저 검증은 이 저장소의 기존 `src/node_modules/playwright`를 사용합니다. 준비되지 않은 새 체크아웃에서는 저장소 루트에서 `npm --prefix src ci`와 `npm --prefix src run qa:install`을 먼저 실행합니다. 이는 QA 도구 설치이며 앱 실행에는 필요 없습니다. 브라우저 증거는 `artifacts/`에 생성됩니다.

## 평가 방법

1. 갤러리에서 분야를 고르거나 이름·기능으로 검색합니다.
2. 각 예시에서 직접 조작하고, 화면 위나 아래의 **평가하기**를 누릅니다.
3. 디자인·사용성·정보 구조·도입 가치를 각각 1–5점으로 평가하고 의견을 남깁니다.
4. 갤러리의 **비교에 담기**로 최대 3개를 같은 기준으로 비교합니다.
5. **평가 내보내기**로 점수·메모·선택 목록을 JSON 파일로 보관합니다.

평가는 `nodove-docs-agent-lab:v1:` 접두사의 브라우저 저장소에 남습니다. 같은 주소·포트·브라우저에서 다시 열면 이어서 평가할 수 있습니다. 저장 공간이 막히거나 부족하면 화면에 알리고 현재 화면에서의 입력을 유지합니다. 브라우저 데이터 삭제, 다른 포트·브라우저 사용 시 기존 평가가 보이지 않을 수 있으므로 JSON을 보관하세요. 메모에도 민감 정보를 적지 마세요.

## 20개 예시

| 번호 | 페이지 | 검토할 동작 |
| --- | --- | --- |
| 01 | [근거를 찾는 검색](concepts/01-evidence-search.html) | 검색·분야 필터·근거 확인 |
| 02 | [문맥을 잃지 않는 읽기](concepts/02-citation-reader.html) | 구절 선택·주석·읽기 설정 |
| 03 | [두 문서, 하나의 판단](concepts/03-document-compare.html) | 문서 선택·기준별 비교 |
| 04 | [연결로 이해하는 지식](concepts/04-knowledge-graph.html) | 노드 선택·관계 탐색 |
| 05 | [주제별 지식 아틀라스](concepts/05-topic-atlas.html) | 분야 탐색·읽기 컬렉션 |
| 06 | [나에게 맞는 학습 경로](concepts/06-learning-path.html) | 목표·단계 완료·진도 복원 |
| 07 | [생각을 확인하는 튜터](concepts/07-concept-tutor.html) | 응답·채점·해설·다음 문항 |
| 08 | [기억을 되살리는 복습](concepts/08-recall-studio.html) | 카드 뒤집기·복습 큐 |
| 09 | [한 줄씩 따라가는 코드](concepts/09-code-walkthrough.html) | 단계 진행·변수 관찰 |
| 10 | [문서와 연결된 학습 노트](concepts/10-study-notebook.html) | 메모·저장·내보내기 |
| 11 | [눈에 보이는 에이전트 흐름](concepts/11-agent-workflow.html) | 시작·중단·재개·취소 |
| 12 | [관점이 다른 병렬 리서치](concepts/12-parallel-research.html) | 역할별 결과·실패·재시도·종합 |
| 13 | [다시 살펴보는 실행 기록](concepts/13-run-timeline.html) | 이벤트 필터·기록 상세 |
| 14 | [도구 실행 전 검토](concepts/14-permission-desk.html) | 권한 설정·요청 검토·판단 기록 |
| 15 | [재사용할 수 있는 프롬프트](concepts/15-prompt-studio.html) | 변수·미리보기·저장 |
| 16 | [오래된 지식을 점검하는 책상](concepts/16-freshness-review.html) | 상태 필터·검토 분류 |
| 17 | [빈 곳을 채우는 문서 계획](concepts/17-gap-planner.html) | 공백 등록·단계 이동 |
| 18 | [변경을 읽는 문서 리뷰](concepts/18-revision-review.html) | 변경 비교·수락·보류 |
| 19 | [출처가 정리된 자료함](concepts/19-source-collection.html) | 공개 링크 정리·검색·내보내기 |
| 20 | [다음에 이어갈 작업 공간](concepts/20-local-workspace.html) | 세션·자료·할 일·메모 |

## 범위와 격리

- 각 예시는 별도 HTML 주소를 갖고 공통 스타일·갤러리·공개 학습 자료만 공유합니다. 여섯 비교 축은 [catalog.js](catalog.js)에 정의합니다.
- 현재 MkDocs 설정, 기존 JavaScript/CSS, 기존 CI는 이 앱을 가져오거나 배포하지 않습니다. 산출물은 기존 `dist/site/`와 분리되어 있습니다.
- 12개 공개 문서에서 사람이 정리한 예시 발췌만 [shared.js](shared.js)에 넣습니다. 보관 자료, `.env`, 사용자 세션, 자격증명, 비공개 인프라 정보는 읽어오지 않습니다.
- 검색·필터·메모·점수·상태 변경은 실제로 브라우저에서 동작합니다. AI 응답·실행 로그·병렬 작업은 **로컬 시뮬레이션**입니다. 모델 호출, 토큰 과금, 서버 도구 실행, 원본 문서 변경은 구현 범위에 포함하지 않습니다.
- 출처 열기는 사용자가 명시적으로 누르는 공개 문서 링크입니다. 자료함에 URL을 추가해도 원격 페이지를 가져오지 않습니다.
- [server.mjs](server.mjs)는 공개 파일 허용 목록만 제공합니다. 프로젝트 루트나 외부 경로를 정적 서버로 노출하지 않습니다.
- 실행이나 빌드는 커밋·스테이징·푸시·배포를 하지 않습니다. 실제 기능 채택은 별도 검토 후 진행합니다.

## 근거와 후속 적용

blog 기능의 현재 구현 여부와 후보별 대응은 [blog 에이전트 분석](../../content/notes/blog-agent-analysis-20260912.md), 문서 보완 범위는 [문서 커버리지 기록](../../content/notes/documentation-coverage-20260912.md)을 참고하세요. 운영에 AI를 붙일 때 필요한 인증·권한·서버 저장·취소·재시도 계약은 예시 화면의 동작과 별도로 구현·검증해야 합니다.

검증 명령과 실행 결과, 알려진 범위는 [검증 기록](VERIFICATION.md)에 정리합니다.
