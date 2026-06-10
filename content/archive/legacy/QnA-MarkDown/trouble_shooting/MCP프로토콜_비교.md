# MCP와 REST API 배포 및 연결 안정성 비교

외부 호스팅에서 엔드포인트 불일치 오류가 발생하는 주된 원인은 호출자(Client)와 제공자(Server)의 API 계약이 어긋나는 데 있다. REST API와 MCP(Model Context Protocol)는 이 계약을 다루는 방식이 다르다.

## 1. 배포 및 연결 아키텍처

### REST API + OpenAPI

REST API는 정적 연결 방식이다.

- 서버를 공인 IP 또는 도메인(`api.myserver.com`)으로 노출한다.
- 외부망 클라이언트가 접근하려면 방화벽 개방, SSL 인증서, Nginx 리버스 프록시, Cloudflare Tunnel(`cloudflared`) 같은 네트워크 구성이 필요하다.
- 클라이언트 코드에는 URL(`https://.../chat`)을 하드코딩하거나 환경변수로 주입한다.
- 클라이언트 개발자는 API 명세(`openapi.yaml`)를 기준으로 요청 필드와 응답 구조를 직접 맞춘다.

### MCP

MCP는 동적 탐색과 협상에 가까운 방식이다.

- **Local(Stdio)**: Cursor나 Claude Desktop이 SSH, Docker 명령어 등으로 서버 프로세스를 직접 실행하고 표준 입출력(stdin/stdout)으로 통신한다. 외부 포트, 도메인, 방화벽 개방이 필요하지 않다.
- **Remote(SSE)**: 원격 서버에서는 Server-Sent Events(SSE) 엔드포인트를 노출한다.
- 연결 직후 handshake를 통해 서버가 제공하는 도구와 스키마를 클라이언트에 전달한다.
- 클라이언트는 서버의 tool 목록과 JSON Schema를 받아 기능을 동적으로 구성한다.

## 2. 엔드포인트 불일치 비교

| 상황 | REST API | MCP |
| :--- | :--- | :--- |
| 엔드포인트 변경 | 서버가 `/chat`을 `/v1/chat`으로 바꾸면 클라이언트 수정 전까지 404 오류 발생 | 서버가 변경된 tool 정보를 제공하면 클라이언트가 새 도구 정의를 반영 |
| 파라미터 변경 | required 필드 추가 시 클라이언트가 모르면 400 오류 발생 | tool 스키마가 실시간 공유되어 LLM이 새 파라미터를 인지 |
| 서버 상태 확인 | `/health` 같은 별도 엔드포인트와 체크 로직 필요 | Ping/Pong, 리소스 구독, 알림 등 프로토콜 기능 사용 가능 |

## 3. 배포 시나리오

### 로컬 Docker 컨테이너를 여러 프로젝트에서 사용

REST API는 컨테이너 포트(`7016`)가 `localhost`에서 충돌 없이 떠 있어야 하며, 각 프로젝트의 `.env`에 `http://localhost:7016` 값을 둔다. 포트 관리가 필요하다.

MCP Stdio는 Cursor 설정에 `docker run -i ...` 형태의 실행 명령만 두면 된다. 포트 포워딩이나 터널링 없이 로컬 프로젝트에서 같은 서버를 도구처럼 호출할 수 있다.

### 원격 서버의 에이전트 사용

REST API는 SSL 인증서, 도메인 연결, 인증 로직이 필요하다. 현재 프로젝트가 Cloudflare Access에 의존하는 구조라면 API Key 등 별도 인증 설계를 추가로 검토한다.

MCP Remote/SSE도 원격 연결에서는 인증과 네트워크 설정이 필요하다. 다만 클라이언트 연동 코드를 직접 작성하는 비용은 REST API보다 낮다.

## 4. 구성안

NoAICode가 이미 REST API를 제공한다면 기존 REST API를 유지하고 MCP 어댑터를 추가하는 구성이 가능하다.

1. 웹 및 모바일 앱 연동: 기존 REST API 사용
2. IDE(Cursor)와 개인 워크플로우 연동: MCP(Stdio/Docker) 사용

이 구성은 서비스 트래픽 처리에는 REST API를 사용하고, 로컬 개발 도구 연동에는 MCP의 동적 tool 탐색을 사용하는 방식이다.
