# PR01 후속 — 요청 설정·취소·검색 응답 경계 보강

Historical execution record. Current remote reconciliation and PR00b export work are recorded in [20260922-reviewed-export.md](20260922-reviewed-export.md); the connection failures below describe that earlier execution.


## 기준과 실제 적용 범위

2026-09-22 KST에 기존 `docs-nodove-ai-implementation-20260921.zip`을 읽고, 포함된 소스 11개 파일의 Git blob SHA를 이전 change-manifest의 resultBlob과 대조했다. 11개 모두 일치한다. 마지막으로 기록된 원격 기준은 `admin_nodove/document@005402c909bbf16e3d9380cfdf001bbe7d7654c5`, 브랜치는 `feat/docs-ai-transport-20260921`, PR은 #1이다.

이번 Forgejo 읽기는 main, 브랜치, MCP 정보, PR #1 조회 모두 `32600 / Session terminated`로 실패했다. 따라서 위 커밋은 현재 원격 HEAD를 뜻하지 않으며, PR의 현재 상태도 확인하지 못했다. 원격 업로드·PR 수정·병합·배포·운영 변수 변경을 수행하지 않았다. 이 기록과 소스는 기존 산출물을 기준으로 한 로컬 구현이다.

전체 저장소와 공개 corpus가 없는 상태에서 PR00b의 허용 목록을 추정하거나 원본 Hub를 재작성하지 않는다. PR00b와 PR02를 완료 처리하지 않고, 보유 소스에서 재현한 PR01의 결함을 먼저 수정했다. 기존 API의 네 인자 facade, 명시적 opt-in, 검색·정적 문서·분할 읽기 진입점은 변경하지 않는다.

## 새로 재현하고 수정한 조건

추가 경계 시험 13개를 수정 전 실행해 13개 실패를 확인했고, 별도 개인정보 전달 시험에서 2개 실패를 확인했다. 기존 51개 전송 시험은 이 수정 전에도 통과했다. 이는 이전에 고친 10개 문제를 다시 고친 것이 아니라, 기존 검사에 없던 경계 조건이다.

| 경계 | 수정 |
| --- | --- |
| 검색 대기 중 설정 변경 | endpoint·토큰·모델·prompt·검색/시간 예산을 요청 단위 snapshot으로 고정 |
| 로컬 검색이 끝나지 않음 | 생성 전체 제한과 별도로 검색 제한 적용; 선택적 검색 없이 진행 |
| 취소 뒤 생성 응답 도착 | 포기한 fetch의 늦은 Response 본문 폐기 |
| 취소 뒤 Notebook 응답 도착 | 늦은 Response 본문 폐기 |
| 연결 검사 제한 뒤 응답 도착 | 늦은 Response 본문 폐기 |
| abort listener가 새 요청 시작 | 새 요청의 controller·소유권을 이전 요청이 지우지 못하도록 수정 |
| 완료 이벤트 뒤 큰 잔여 데이터 | 파서가 완료 지점에서 중단하여 완료를 크기 오류로 뒤집지 않음 |
| 출력 제한을 넘는 delta | 결과에 추가하기 전에 검사, 부분 응답도 제한 이내로 유지 |
| Notebook의 잘못된 MIME | JSON MIME만 허용, 비정상 응답을 prompt에 포함하지 않음 |
| Notebook 큰/정지된 본문 | 1 MiB 실제 바이트 제한, timeout 시 reader 해제 |
| 잘못된 검색 설정 수치 | 결과 수·문맥 길이에 양의 정수 기본값/상한 적용 |
| 큰 입력 메시지 | 검색/생성 전에 요청 한도 검사 |
| 어댑터의 과도한 문맥 반환 | AIClient에서 문맥 한도를 재강제 |
| 임의 Retry-After 헤더 텍스트 | 숫자 지연/HTTP-date 형식만 전달 |
| 외부 예외 객체의 HTTP 필드 | 내부 HTTP 오류에서만 status/retry metadata 전달 |

## 계약 변화

`sendMessage(messages, onChunk, onComplete, onError, {signal,query})`는 유지한다. 네 인자 호출도 그대로 사용할 수 있다. `completed / incomplete / failed / cancelled` 상태도 유지한다. 자동 POST 재시도·리다이렉트·다른 제공자로의 우회는 추가하지 않았다.

로컬 검색과 Notebook 기본 제한은 각각 5초다. 선택적 검색 실패 시 문맥 없이 진행하므로 엄격한 RAG의 근거 필수 정책이 완성됐다는 의미는 아니다. 실제 로컬 검색 엔진 연결, 인용 검증, 질문과 본문 문맥을 분리하는 Hub 호출부는 후속 과제다.

Notebook은 JSON 응답 최대 1,048,576 bytes, 결과 수 기본 5/최대 20이다. 문맥 기본값은 로컬 2,600, Notebook 3,000이며 각각 최대 32,000 UTF-16 코드 단위다. 입력 메시지는 최대 128개, system prompt·문맥을 합한 내용은 최대 262,144 코드 단위, 질의는 최대 32,768 코드 단위다. 기존 Hub의 4,000자 질문+12,000자 발췌는 이 제한 내에 있다. 이 예산은 모델별 토큰 한도나 서버 권한 검증을 대신하지 않는다.

기존 진행 중 요청은 시작 때의 설정을 계속 사용한다. 새 설정은 다음 요청에 적용한다. 실행 중 요청의 취소는 명시적 abort가 담당한다.

## 실제 검증 결과

- 기존 소스 회귀 기준: 전송 51 + 설정 6 = 57 pass.
- 새 경계 조건 수정 전: 기존 전송 51 pass / 새 조건 13 fail.
- 개인정보 전달 추가 시험 수정 전: 2 fail / 대기 정리 보조 검사 1 pass.
- 최종 통합: **100 pass / 0 fail / 0 skipped**.
- 구성: 전송 80개 + 공개 설정 6개 + Chromium 하위 검사 13개 + 브라우저 상위 검사 1개.
- 기존 64개 검사를 보존하고 36개를 추가했다. 수정 전 재현 로그는 최종 검사와 겹치므로 독립 검사 수로 합산하지 않는다.
- 브라우저에서 토큰/모델 설정 변경, 실제 fetch, 검색 timeout, 재진입 취소, 입력 크기, 완료 후 잔여 데이터, 상태 이벤트 정보 범위, 부분 응답 상태를 확인했다.
- Node v22.16.0, Chromium 144.0.7559.96, 로컬 Playwright Core 1.57.0-beta-1764944708000 사용. QA 런타임은 저장소 밖 경로에서 연결했다. 저장소의 package/lockfile은 변경하지 않았다.
- 모든 외부 요청은 차단 또는 테스트 응답으로 대체했다. 실제 제공자 호출과 과금은 없다.

실행:

```bash
node --test src/qa/ai-client.test.js src/qa/public-ai-config.test.js src/qa/ai-browser-contracts.test.js
```

현재 실행 환경의 Playwright 버전은 저장소의 고정 버전 검증을 대신하지 않는다. 전체 Hub navigation, strict MkDocs, Rust, 실제 backend 인증/쿼터/CORS, 서버 작업 취소, 배포 동일성은 미검증이다.

## 다음 실행 순서

1. Forgejo 세션 복구 후 main과 PR #1의 실제 상태를 다시 읽는다. 변경된 파일의 blob이 이 패치의 기준과 일치할 때만 적용한다. 다른 변경이 있으면 diff를 검토하여 합치고 파일을 일괄 덮어쓰지 않는다.
2. 이 변경을 포함한 고정 버전 CI 및 전체 checkout의 빌드/문서/브라우저 검사를 수행한다.
3. PR00b 공개 허용 corpus·extra 자산·가상 키 관리 화면 출판 경계를 전체 트리와 현재 링크에 근거해 구현한다.
4. PR02의 검색 정본·문맥 분리·문서 revision/chunk ID, 이후 인용/원문 복귀/부분 응답 UI·요약·번역을 이어간다.

이번 패치에는 원격 반영이나 운영 기능 신규 출시를 완료했다는 표시를 넣지 않는다.
