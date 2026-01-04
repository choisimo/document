# n8n 기반 MCP 통합 서버 관리 보고서

## n8n 개요

n8n은 오픈소스 워크플로우 자동화 플랫폼으로, 2019년 베를린에서 Jan Oberhauser에 의해 개발되었습니다[14]. 이 도구는 기술팀에게 코드의 유연성과 노코드의 속도를 동시에 제공합니다[2]. 

**주요 특징**:
- 400개 이상의 사전 구축된 통합 지원[2]
- JavaScript/Python 코드 작성 또는 드래그-앤-드롭 인터페이스 선택 가능[1]
- 셀프 호스팅 또는 클라우드 배포 옵션[1][14]
- 노드 기반의 워크플로우 시스템으로 다양한 애플리케이션 연결[14]
- AI 네이티브 기능 지원[2]

n8n은 200개 이상의 사전 정의된 노드를 통해 복잡한 워크플로우를 구축하고, 600개 이상의 사전 정의된 워크플로우 템플릿을 제공합니다[14]. 주요 사용 사례로는 CRM 자동화, 이메일 관리, 데이터 동기화 등이 있습니다[19].

```
기본 n8n 워크플로우 구조:
+-------------+       +---------------+       +---------------+
| 트리거 노드 | ----> | 처리 노드(들) | ----> | 출력 노드(들) |
+-------------+       +---------------+       +---------------+
```

## MCP(Model Context Protocol) 소개

MCP는 AI 모델이 외부 도구, API 및 데이터 소스와 표준화된 방식으로 상호작용할 수 있게 해주는 프로토콜입니다[5][18]. n8n에 MCP를 통합하면 Claude, Cursor 등의 AI 애플리케이션과 직접 연결되는 커스텀 AI 도구를 구축할 수 있습니다[8].

## n8n MCP 서버 구성 방법

### 1. 기본 설치 및 세팅

#### Docker를 이용한 설치
```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

#### npm을 이용한 설치
```bash
npm install n8n -g && n8n start
```

### 2. MCP 서버 트리거 노드 구성

1. n8n 인스턴스에서 새 워크플로우 생성
2. "MCP 서버 트리거" 노드 추가[4][11]
3. MCP URL 경로 설정 (기본값: 자동 생성된 경로)[11]
4. 인증 설정 (옵션: Bearer 인증, 헤더 인증 또는 없음)[4]
5. 워크플로우 저장 및 활성화

```
MCP 서버 트리거 기본 흐름:
+---------------+     +------------------+     +---------------+
| AI 모델 요청  | --> | MCP 서버 트리거  | --> | 도구 노드(들) |
+---------------+     +------------------+     +---------------+
                             |                        |
                             v                        v
                     +---------------+        +---------------+
                     | 요청 처리     |        | 응답 반환     |
                     +---------------+        +---------------+
```

### 3. Claude Desktop 연결 설정

Claude Desktop은 MCP 서버에 연결할 수 있는 AI 어시스턴트입니다[10]. 연결 방법:

1. claude_desktop_config.json 파일 편집:
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "YOUR-N8N-WEBHOOK-URL"
      ]
    }
  }
}
```
2. YOUR-N8N-WEBHOOK-URL을 n8n MCP 서버 트리거의 Production URL로 교체[10]

### 4. 다중 서버 MCP 설정 (고급)

여러 MCP 서버를 한 환경에서 운영하려면:

1. docker-compose.yml 파일 설정:
```yaml
version: '3'
services:
  n8n:
    image: n8nio/n8n
    environment:
      # MCP 서버 환경 변수
      - MCP_BRAVE_API_KEY=your-brave-api-key
      - MCP_OPENAI_API_KEY=your-openai-key
      - MCP_SERPER_API_KEY=your-serper-key
      - MCP_WEATHER_API_KEY=your-weather-api-key
      # 커뮤니티 노드 활성화
      - N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
    ports:
      - "5678:5678"
    volumes:
      - ~/.n8n:/home/node/.n8n
```

2. 여러 MCP 클라이언트 자격 증명 생성[5]:
   - Brave Search: `npx -y @modelcontextprotocol/server-brave-search`
   - OpenAI Tools: `npx -y @modelcontextprotocol/server-openai`
   - Web Search: `npx -y @modelcontextprotocol/server-serper`
   - Weather API: `npx -y @modelcontextprotocol/server-weather`

```
다중 서버 MCP 아키텍처:
+-------------+     +------------------+     +------------------+
| AI Agent    | --> | MCP 클라이언트 1 | --> | Brave Search     |
+-------------+     +------------------+     +------------------+
       |
       v
+------------------+     +------------------+
| MCP 클라이언트 2 | --> | OpenAI Tools     |
+------------------+     +------------------+
       |
       v
+------------------+     +------------------+
| MCP 클라이언트 3 | --> | Weather API      |
+------------------+     +------------------+
```

## 상황별 MCP 구현 사례

### 1. 이메일 보내기 자동화

**난이도: 초급**

1. MCP 서버 트리거 노드 설정
2. 이메일 노드(SMTP 또는 Gmail) 추가[11]
3. 트리거 입력(`to`, `subject`, `text`)을 이메일 노드에 매핑
4. 워크플로우 활성화

**테스트 명령**:
```bash
curl -X POST http://localhost:5678/mcp/abc123 -H "Content-Type: application/json" -d '{"to": "user@example.com", "subject": "테스트", "text": "n8n에서 인사드립니다!"}'
```

### 2. API 데이터 가져오기

**난이도: 중급**

1. MCP 서버 트리거 노드 설정
2. HTTP 요청 노드 추가 및 API URL 구성 (예: `https://api.example.com/data`)[16]
3. 트리거 입력(예: 쿼리 매개변수)을 HTTP 노드에 매핑
4. "Set" 노드로 응답 포맷 설정
5. 워크플로우 활성화

**테스트 명령**:
```bash
curl -X POST http://localhost:5678/mcp/abc123 -d '{"query": "test"}'
```

### 3. 계산기 도구 생성

**난이도: 중급**

1. MCP 서버 트리거 노드 추가
2. JavaScript 함수 노드 추가 및 계산 로직 구현[10]
3. 노드 연결 및 매개변수 매핑
4. 워크플로우 활성화

AI 에이전트에서 이 계산기 도구를 호출하려면 MCP 클라이언트 자격 증명을 설정해야 합니다[10].

### 4. 웹 검색 통합

**난이도: 고급**

1. Brave Search MCP 서버 설정
2. n8n에서 MCP 클라이언트 노드 추가 및 Brave Search 자격 증명 연결[12]
3. AI 에이전트 노드 설정 및 MCP 클라이언트와 연결
4. 프롬프트 구성: "popular destinations in {destination_country}" 같은 검색 쿼리를 포함

이 설정을 통해 AI 에이전트는 최신 웹 정보를 검색하고 워크플로우에 통합할 수 있습니다[5].

## 구현 난이도 및 요구사항

| 시나리오 | 난이도 | 필요한 지식 | 예상 소요 시간 |
|---------|--------|------------|--------------|
| 기본 MCP 서버 설정 | 초급 | n8n 기본 지식 | 30분 |
| 이메일 보내기 자동화 | 초급 | 이메일 노드 이해 | 1시간 |
| API 데이터 가져오기 | 중급 | HTTP 요청, API 이해 | 2시간 |
| 계산기 도구 생성 | 중급 | JavaScript, 함수 노드 | 2시간 |
| 웹 검색 통합 | 고급 | MCP 클라이언트, API 키 관리 | 3-4시간 |
| 다중 서버 MCP 설정 | 고급 | Docker, 환경 변수, 다중 API | 5시간+ |

## 보안 강화 방법

MCP 서버 트리거의 보안을 강화하려면:

1. Bearer 또는 Header 인증 설정[4]
2. 환경 변수를 통한 API 키 관리[5][15]
3. Docker Secrets 활용 (셀프 호스팅 시)[11]
4. HMAC 서명 검증 구현[16]

## 관련 자료 및 참고 문헌

1. n8n 공식 웹사이트: https://n8n.io[1]
2. n8n GitHub 저장소: https://github.com/n8n-io/n8n[2]
3. n8n MCP 서버 트리거 노드 문서: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/[4]
4. "Build Your First MCP Server with n8n": https://community.n8n.io/t/build-your-first-mcp-server-with-n8n/99899[6]
5. n8n MCP 클라이언트 노드: https://github.com/nerding-io/n8n-nodes-mcp[5]
6. "n8n Just Released Native MCP Trigger" (영상): https://www.youtube.com/watch?v=45WPU7P-1QQ[10]
7. "n8n을 MCP 서버와 함께 사용하는 방법": https://apidog.com/kr/blog/n9n-mcp-server-kr-2/[11]

## 결론

n8n과 MCP의 통합은 AI 모델과 워크플로우 자동화 간의 강력한 시너지를 제공합니다. 다양한 시나리오에 맞춰 MCP 서버를 구성하고 AI 어시스턴트와 연결함으로써, 자연어를 통한 복잡한 작업의 자동화가 가능해집니다.

초기 도입은 쉽지만, 다중 서버 구성이나 고급 통합에는 상당한 기술적 지식이 필요합니다. 그러나 한번 설정이 완료되면, AI 모델이 n8n의 모든 기능을 자연어 명령으로 활용할 수 있어 업무 자동화의 새로운 차원을 열어줍니다.

n8n의 MCP 지원은 비교적 최근에 추가된 기능으로, 2025년 3-4월 기준으로 활발히 개발 중이며[6][10][12], 커뮤니티의 지속적인 기여로 계속 확장되고 있습니다.



---



# N8N을 사용한 MCP 서버 통합 관리 설정 방법

N8N(엔에이트엔)은 강력한 워크플로우 자동화 플랫폼으로, MCP(Model Context Protocol)와 통합하면 AI 모델이 N8N 워크플로우와 상호작용할 수 있습니다. 다음은 N8N에서 MCP를 설정하는 단계별 방법입니다.

## 1. N8N 설치하기

먼저 N8N을 설치해야 합니다. 두 가지 주요 설치 방법이 있습니다:

**npm 사용:**
```bash
npm install n8n -g
n8n start
```

**Docker 사용:**
```bash
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

설치 후 웹 브라우저에서 `http://localhost:5678`에 접속하여 N8N에 접근할 수 있습니다[1][6].

## 2. MCP 서버 설정하기

다음으로 MCP 서버를 설정해야 합니다:

1. GitHub에서 사용 가능한 MCP 서버 목록을 확인합니다
2. 선택한 MCP 서버를 로컬 또는 클라우드 인스턴스에 설치합니다
3. 서버의 설정 지침을 따라 설치를 완료합니다 (일반적으로 저장소 클론, 의존성 설치, 서버 시작 과정 포함)[1]

MCP 서버는 N8N 워크플로우와 AI 어시스턴트 간의 통신을 관리합니다[2].

## 3. N8N에서 MCP 서버 트리거 노드 구성하기

N8N에는 워크플로우를 MCP 호환 서버로 전환하는 MCP 서버 트리거 노드가 포함되어 있습니다:

1. N8N 인스턴스에서 새 워크플로우를 생성합니다
2. 노드 패널에서 "MCP Server Trigger"를 검색하여 추가합니다
3. 설정을 구성합니다:
   - **MCP URL 경로**: N8N이 자동으로 생성한 경로(예: `/mcp/abc123`) 사용 또는 커스터마이즈
   - **인증**: 테스트용으로 "None" 선택 또는 API 키와 같은 인증 추가
4. 트리거를 도구나 액션을 나타내는 노드에 연결합니다
5. 워크플로우를 저장하고 활성화합니다[1][4]

이제 N8N은 MCP URL을 노출시켜 외부 MCP 클라이언트가 호출할 수 있게 합니다[4].

## 4. MCP 클라이언트 노드 설치 및 구성하기

또한 N8N 워크플로우 내에서 MCP 서버와 직접 연결할 수 있는 `n8n-nodes-mcp` 커뮤니티 노드를 설치할 수 있습니다:

1. N8N에서 `n8n-nodes-mcp` 커뮤니티 노드를 설치합니다
2. 워크플로우에 MCP 클라이언트 노드를 추가합니다
3. 다음과 같은 작업을 지원합니다:
   - 도구 실행
   - 프롬프트 가져오기
   - 프롬프트 목록 조회
   - 리소스 목록 조회
   - 도구 목록 조회
   - 리소스 읽기[3][6]

## 5. 설정 테스트하기

cURL과 같은 도구를 사용하여 MCP URL에 테스트 요청을 보냅니다:

```bash
curl -X POST http://localhost:5678/mcp/abc123 -d '{"tool": "example"}'
```

올바르게 구성된 경우 워크플로우가 실행되며, N8N과 MCP 서버가 효과적으로 통신하는 것을 확인할 수 있습니다[1].

## 6. AI 어시스턴트와 통합하기

Claude Desktop과 같은 AI 어시스턴트를 N8N MCP 서버와 통합하려면:

1. 구성 파일(예: `claude_desktop_config.json`)을 편집합니다:
```json
{
  "mcpServers": {
    "n8n-local": {
      "command": "node",
      "args": [
        "/path/to/your/cloned/n8n-mcp-server/build/index.js"
      ],
      "env": {
        "N8N_API_URL": "http://your-n8n-instance:5678/api/v1",
        "N8N_API_KEY": "YOUR_N8N_API_KEY"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```
2. 환경 변수를 설정하여 N8N에서 커뮤니티 노드를 도구로 사용할 수 있게 합니다:
```bash
export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```
3. Docker를 사용하는 경우 `docker-compose.yml` 파일에 환경 변수를 추가합니다[3][5].

## 활용 예시

### 이메일 전송 자동화
1. MCP 서버 트리거 노드 설정
2. 이메일 노드(SMTP 또는 Gmail) 추가
3. 트리거 입력(`to`, `subject`, `text`)을 이메일 노드에 매핑
4. 테스트:
```bash
curl -X POST http://localhost:5678/mcp/abc123 -H "Content-Type: application/json" -d '{"to": "user@example.com", "subject": "테스트", "text": "N8N에서 인사드립니다!"}'
```

### API 데이터 가져오기
1. MCP 서버 트리거 노드 설정
2. HTTP 요청 노드 추가 및 API URL 구성
3. 트리거 입력을 HTTP 노드에 매핑
4. "Set" 노드로 응답 포맷 설정[1]

N8N과 MCP의 통합은 AI 모델이 복잡한 워크플로우 자동화 작업을 수행할 수 있게 해주는 강력한 도구로, 다양한 응용 프로그램과 서비스를 쉽게 통합할 수 있습니다.
