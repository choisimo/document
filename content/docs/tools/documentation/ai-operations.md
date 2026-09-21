---
title: 문서 도우미 AI 설정과 장애 진단
description: 공개 빌드 변수, 채팅·검색 요청 계약, 시간 제한과 운영 확인 항목을 정리합니다.
intent: troubleshooting
---

# 문서 도우미 AI 설정과 장애 진단

사이트 도우미는 브라우저에서 설정된 API로 요청한다. 이 저장소가 해당 서버를 운영하거나 키 발급·사용자 인증·요금 제한을 제공하는 것은 아니다. 실제 요청 대상은 배포된 공개 설정과 브라우저 Network에서 확인한다.

## 공개 설정 계약

| 환경 변수 | 생성 필드 | 입력 조건 |
| --- | --- | --- |
| `PUBLIC_AI_ENABLED` | `enabled` | 기본 `false`. `true`일 때 승인된 HTTPS API 주소 필수 |
| `PUBLIC_AI_API_BASE_URL` | `apiBaseUrl` | HTTPS base URL. 필요한 버전 경로를 포함 |
| `PUBLIC_AI_MODEL_NAME` | `modelName` | 서버가 제공하는 모델 식별자 |
| `PUBLIC_AI_API_TOKEN` | `apiToken` | 기본 빈 값. 공개 허용된 자격증명만 가능 |
| `PUBLIC_OPEN_NOTEBOOK_ENABLED` | `openNotebookEnabled` | `true` 또는 `false`, 기본 비활성 |
| `PUBLIC_OPEN_NOTEBOOK_URL` | `openNotebookUrl` | 검색을 켜면 필수인 HTTPS base URL |
| `PUBLIC_OPEN_NOTEBOOK_TOKEN` | `openNotebookToken` | 기본 빈 값. 비공개 Notebook 자격증명 금지 |

생성기는 URL 안의 사용자 정보, query, fragment, 공백과 잘못된 포트를 거부한다. 역슬래시·제어 문자와 자격증명 필드의 줄바꿈도 거부한다. 검증 후 임시 파일을 원자적으로 교체하므로 검증 실패 시 기존 출력은 유지한다. `.env`를 자동으로 읽지 않고 프로세스에 명시적으로 제공한 환경 변수만 읽는다.

다음은 **실제 서버가 없는 공개 예시**다. 생성 파일을 검토하고 실제로 공개할 endpoint를 별도로 정한다.

```bash
PUBLIC_AI_ENABLED=true PUBLIC_AI_API_BASE_URL=https://ai.example.com/v1 PUBLIC_OPEN_NOTEBOOK_ENABLED=false python3 src/automation/site/render-public-ai-config.py content/docs/javascripts/ai-public-config.js
```

CI는 repository Variables의 공개 변수만 전달한다. `PUBLIC_AI_ENABLED=true`와 API 주소를 명시해야 도우미를 사용할 수 있다. 주소만 있거나 활성화 변수가 없으면 AI와 Notebook 검색 모두 비활성이다. 외부 기본 주소로 우회하지 않는다. 기존 배포에서 전환할 때는 이 변수를 추가해야 하며, 비활성 설정은 재빌드·배포·새로고침 이후 적용된다. 사용자 입력을 전송할 수 있는 서버 정책까지 검증한 뒤 활성화한다.

## 요청과 응답

| 기능 | 경로·내용 | 실패 처리 |
| --- | --- | --- |
| AI 채팅 | base URL + `/chat/completions`, POST, `messages`, `stream: true`, 선택한 `model` | HTTP 오류를 표시. 자동 재시도 루프는 없음 |
| 모델 연결 확인 함수 | base URL + `/models`, GET | 성공 상태 여부 반환. 생성 권한까지 입증하지 않음 |
| Notebook 검색 | base URL + `/api/search`, POST, `query`, `limit` | 5초 후 취소. 오류·빈 결과이면 검색 문맥 없이 계속 |
| 로컬 문서 검색 | `DocSearchEngine`이 존재할 때 호출 | 엔진이 없으면 문맥 없음. 설정 플래그만으로 연결을 보장하지 않음 |

응답은 `text/event-stream`이어야 한다. LF·CR·CRLF, `data:` 뒤 선택적인 공백, 여러 data 줄, 바이트 경계를 넘는 UTF-8을 처리한다. 완결된 `[DONE]` 이벤트와 비어 있지 않은 텍스트가 있어야 완료한다. EOF만 도착하거나 `finish_reason`이 `length`·`content_filter` 등인 경우 `incomplete`이며 성공 콜백을 호출하지 않는다. JSON·스키마 오류와 제공자 오류 이벤트도 실패로 처리한다. 자동 POST 재시도·리다이렉트·다른 제공자로의 fallback은 없다.

기본 제한은 검색을 포함한 요청 전체 120초, 생성 연결·청크 대기 30초, Notebook 5초, 모델 연결 확인 10초다. `AI_CONFIG.transport`의 `requestTimeoutMs`, `idleTimeoutMs`, `retrievalTimeoutMs`, `connectionTimeoutMs`로 조절할 수 있고 최대 600초다. 이벤트는 262,144 문자, 출력은 2,097,152 문자까지다.

기존 네 인자 `sendMessage` 호출은 유지한다. 반환 promise는 `requestId`, `status`, `content`와 오류 시 `code`, `message`를 준다. `status`는 `completed`, `incomplete`, `failed`, `cancelled` 중 하나다. 오류 콜백의 첫 인자는 기존과 같은 문자열이고 두 번째 인자로 상세 결과가 추가된다. 취소는 오류 콜백을 호출하지 않는다. 다섯 번째 인자 `{signal, query}`로 취소 신호와 별도 검색어를 전달할 수 있다. 현재 Hub의 문서 선택·부분 답변 표시와 검색어/문맥 분리는 후속 구현 대상이며 이 전송 수정만으로 해결되지 않는다.

`ai-request-status` 이벤트에는 요청 ID·상태·오류 코드만 포함하며 질문·문서·토큰·원시 제공자 오류를 담지 않는다. HTTP 오류에는 상태 번호와 제한된 Retry-After만 보존한다. 요청이 끝나거나 취소되면 timer·signal listener·stream reader를 정리한다.

Notebook의 기본 요청 결과 수는 5이고 AI에 넣는 검색 문맥은 문자열 길이 3,000으로 제한된다. 결과 수·문자 수 제한은 검색 서버의 권한 필터를 대신하지 않는다. 전송 범위는 [개인정보 안내](privacy.md)를 참조한다.

## 운영 진단

1. 공개 생성 파일의 필드 이름, endpoint와 모델 설정을 확인한다. 자격증명 값이나 전체 헤더를 보고서에 복사하지 않는다.
2. 문서 자체가 열리는지 확인한 뒤 승인된 비민감 질문 하나로 도우미를 시험한다.
3. Network에서 요청 URL, HTTP 상태, Content-Type, 스트리밍 여부를 확인한다. 401·403은 인증·권한, 404는 base 경로, 429는 서버 쿼터의 근거와 대조한다.
4. 브라우저가 요청을 차단하면 CORS·HTTPS·실제 응답 헤더를 확인한다. 정적 JS 수정만으로 서버 정책을 해결했다고 기록하지 않는다.
5. 검색 실패와 채팅 실패를 나눠 기록한다. Notebook 문맥이 없는데 답변이 생성될 수 있다.
6. 문서의 출처·인용이 맞는지 사람이 확인한다. HTTP 성공은 답변의 사실성 증거가 아니다.

실패 후 재전송은 별도 요청이다. 외부 서버의 과금·중복 처리·취소 보장은 이 클라이언트만으로 확인할 수 없다. 중단·요청 교체 시 브라우저의 생성 요청과 Notebook 검색에 취소를 전파한다. 로컬 검색 adapter에도 signal을 전달하지만 기존 엔진이 이를 준수하는지는 별도 계약이다. 서버가 생성 작업·과금까지 중단했는지는 이 클라이언트만으로 보장하지 않는다.

근거: `src/automation/site/render-public-ai-config.py`의 `read_public_config`, `main`; `content/docs/javascripts/ai-config.js`; `content/docs/javascripts/ai-client.js`의 `getHeaders`, `queryKnowledgeBase`, `queryLocalDocs`, `sendMessage`, `checkConnection`; `content/docs/javascripts/hub-app.js`의 `sendAssistant`; `src/qa/public-ai-config.test.js`.
