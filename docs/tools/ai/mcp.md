# MCP (Model Context Protocol)

n8n 기반 MCP 통합 서버 관리 가이드입니다.

---

## 📋 개요

### n8n이란?

**n8n**은 오픈소스 워크플로우 자동화 플랫폼으로, 2019년 베를린에서 개발되었습니다. 기술팀에게 코드의 유연성과 노코드의 속도를 동시에 제공합니다.

| 특징 | 설명 |
|------|------|
| **통합** | 400개 이상의 사전 구축된 통합 지원 |
| **유연성** | JavaScript/Python 코드 또는 드래그-앤-드롭 |
| **배포** | 셀프 호스팅 또는 클라우드 |
| **템플릿** | 600개 이상의 워크플로우 템플릿 |

### MCP란?

**MCP (Model Context Protocol)**는 AI 모델이 외부 도구, API 및 데이터 소스와 표준화된 방식으로 상호작용할 수 있게 해주는 프로토콜입니다.

```mermaid
flowchart LR
    subgraph AI["AI 클라이언트"]
        A[Claude Desktop]
        B[Cursor]
    end
    
    subgraph MCP["MCP 서버"]
        C[n8n MCP Trigger]
    end
    
    subgraph Tools["도구/서비스"]
        D[이메일]
        E[API]
        F[데이터베이스]
    end
    
    AI --> MCP
    MCP --> Tools
```

---

## 🚀 n8n 설치

### Docker 설치 (권장)

```bash
# 볼륨 생성
docker volume create n8n_data

# 컨테이너 실행
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

### npm 설치

```bash
npm install n8n -g && n8n start
```

설치 후 `http://localhost:5678`에서 접속 가능합니다.

---

## ⚙️ MCP 서버 트리거 설정

### 기본 설정 단계

```mermaid
flowchart TD
    A[새 워크플로우 생성] --> B[MCP 서버 트리거 추가]
    B --> C[URL 경로 설정]
    C --> D[인증 설정]
    D --> E[도구 노드 연결]
    E --> F[워크플로우 활성화]
```

### 설정 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| **MCP URL 경로** | 트리거 엔드포인트 | `/mcp/abc123` (자동 생성) |
| **인증** | 접근 제어 | Bearer, Header, None |

### 워크플로우 구조

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ AI 모델 요청    │ --> │ MCP 서버 트리거  │ --> │ 도구 노드(들)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               v                        v
                        ┌──────────────┐         ┌──────────────┐
                        │ 요청 처리    │         │ 응답 반환    │
                        └──────────────┘         └──────────────┘
```

---

## 🔗 Claude Desktop 연결

### 설정 파일 구성

`claude_desktop_config.json` 파일 편집:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": [
        "-y",
        "supergateway",
        "--sse",
        "https://your-n8n-instance.com/mcp/abc123"
      ]
    }
  }
}
```

### 환경 변수 설정

```bash
# 커뮤니티 노드를 도구로 사용 허용
export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

---

## 🔧 다중 서버 구성

### Docker Compose 설정

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    environment:
      # MCP 서버 API 키
      - MCP_BRAVE_API_KEY=${BRAVE_API_KEY}
      - MCP_OPENAI_API_KEY=${OPENAI_API_KEY}
      - MCP_SERPER_API_KEY=${SERPER_API_KEY}
      - MCP_WEATHER_API_KEY=${WEATHER_API_KEY}
      # 커뮤니티 노드 활성화
      - N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
    ports:
      - "5678:5678"
    volumes:
      - ~/.n8n:/home/node/.n8n
```

### MCP 클라이언트 자격 증명

| 서비스 | 설치 명령 |
|--------|----------|
| Brave Search | `npx -y @modelcontextprotocol/server-brave-search` |
| OpenAI Tools | `npx -y @modelcontextprotocol/server-openai` |
| Web Search | `npx -y @modelcontextprotocol/server-serper` |
| Weather API | `npx -y @modelcontextprotocol/server-weather` |

---

## 📝 구현 사례

### 1. 이메일 자동화 (초급)

```mermaid
flowchart LR
    A[MCP 트리거] --> B[이메일 노드]
    B --> C[응답 반환]
```

**테스트:**
```bash
curl -X POST http://localhost:5678/mcp/abc123 \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "subject": "테스트", "text": "n8n에서 인사드립니다!"}'
```

### 2. API 데이터 가져오기 (중급)

```mermaid
flowchart LR
    A[MCP 트리거] --> B[HTTP 요청]
    B --> C[Set 노드]
    C --> D[응답 반환]
```

**테스트:**
```bash
curl -X POST http://localhost:5678/mcp/abc123 \
  -d '{"query": "test"}'
```

### 3. 계산기 도구 (중급)

```mermaid
flowchart LR
    A[MCP 트리거] --> B[JavaScript 함수]
    B --> C[응답 반환]
```

### 4. 웹 검색 통합 (고급)

```mermaid
flowchart LR
    A[AI Agent] --> B[MCP 클라이언트]
    B --> C[Brave Search]
    C --> D[결과 처리]
```

---

## ⏱️ 난이도 및 소요 시간

| 시나리오 | 난이도 | 필요 지식 | 소요 시간 |
|---------|--------|----------|----------|
| 기본 MCP 서버 설정 | 초급 | n8n 기본 | 30분 |
| 이메일 자동화 | 초급 | 이메일 노드 | 1시간 |
| API 데이터 가져오기 | 중급 | HTTP, API | 2시간 |
| 계산기 도구 | 중급 | JavaScript | 2시간 |
| 웹 검색 통합 | 고급 | MCP, API 키 | 3-4시간 |
| 다중 서버 구성 | 고급 | Docker, 환경변수 | 5시간+ |

---

## 🔒 보안

### 권장 보안 설정

1. **인증 설정**: Bearer 또는 Header 인증 활성화
2. **환경 변수**: API 키는 환경 변수로 관리
3. **Docker Secrets**: 셀프 호스팅 시 시크릿 활용
4. **HMAC 서명**: 요청 검증 구현

```yaml
# docker-compose.yml 보안 설정 예시
services:
  n8n:
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    secrets:
      - n8n_api_key
```

---

## 🔗 관련 문서

- [Gemini Shell](gemini-shell.md)
- [자동화 도구](../automation/selenium.md)

---

## 📚 참고 자료

- [n8n 공식 웹사이트](https://n8n.io)
- [n8n GitHub](https://github.com/n8n-io/n8n)
- [n8n MCP 문서](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/)
- [MCP 프로토콜 명세](https://modelcontextprotocol.io/)
