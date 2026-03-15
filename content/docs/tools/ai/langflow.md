---
title: "Langflow Docker Compose 설치 및 커스텀 AI API 사용 가이드"
description: "Langflow를 Docker Compose로 설치하는 방법과 Ollama, LM Studio 등의 커스텀 AI API 주소를 연결하여 사용하는 가이드입니다."
tags:
  - Langflow
  - Docker
  - AI
  - LLM
  - Ollama
---

# Langflow Docker Compose 설치 및 커스텀 AI API 사용 가이드

## 개요
[Langflow](https://github.com/langflow-ai/langflow)는 강력한 LLM 애플리케이션(RAG 시스템, 에이전트 파이프라인 등)을 시각적으로 설계하고 배포할 수 있도록 돕는 UI 기반 플랫폼입니다. 본 문서는 Docker Compose를 사용하여 안전하고 효율적으로 Langflow를 구축하는 방법과, OpenAI 뿐만 아니라 Ollama, LM Studio, vLLM 등의 **커스텀 AI API(OpenAI 호환 엔드포인트)**를 연결하는 방법을 구체적으로 설명합니다.

---

## 1. Docker Compose 기반 설치

기본적으로 Langflow의 설정 파일과 데이터가 영구 보존되도록 볼륨 마운트와 PostgreSQL 데이터베이스 연동 설정을 권장합니다. 

### `docker-compose.yaml` 파일 작성

원하는 서버의 디렉터리에 `docker-compose.yaml` 파일을 생성하고 아래 내용을 입력합니다.

```yaml
version: '3.8'

services:
  langflow:
    image: langflowai/langflow:latest
    container_name: langflow
    ports:
      - "7860:7860"
    restart: always
    depends_on:
      - postgres
    environment:
      # PostgreSQL DB 연결 설정
      - LANGFLOW_DATABASE_URL=postgresql://langflow:langflow@postgres:5432/langflow
      # Langflow 설정 및 데이터가 저장될 내부 경로
      - LANGFLOW_CONFIG_DIR=/app/langflow
    volumes:
      - langflow-data:/app/langflow

  postgres:
    image: postgres:16
    container_name: langflow-postgres
    restart: always
    environment:
      POSTGRES_USER: langflow
      POSTGRES_PASSWORD: langflow
      POSTGRES_DB: langflow
    ports:
      - "5432:5432"
    volumes:
      - langflow-db:/var/lib/postgresql/data

volumes:
  langflow-data:
  langflow-db:
```

### 실행 및 접속

1. 터미널(또는 SSH)에서 `docker-compose.yaml` 파일이 있는 경로로 이동합니다.
2. 아래 명령어를 실행하여 컨테이너를 백그라운드 모드로 구동합니다.
   ```bash
   docker compose up -d
   ```
3. 설치가 완료되면 브라우저를 열고 `http://<서버-IP>:7860` 으로 접속합니다. (로컬 환경의 경우 `http://localhost:7860`)

---

## 2. 커스텀 AI API (LLM) 연동 가이드

기본적으로 Langflow는 OpenAI의 API를 사용하도록 되어 있으나, **로컬 LLM (Ollama, LM Studio 등)** 또는 **커스텀 프록시 API (LiteLLM, vLLM 등)**를 사용할 때도 OpenAI 호환 컴포넌트를 활용하여 매우 쉽게 연결할 수 있습니다.

### 연동 방법 (OpenAI 컴포넌트 활용)

1. **새로운 프로젝트 생성**: Langflow 대시보드에서 `New Project` > `Blank Flow`를 선택해 빈 작업 공간을 엽니다.
2. **컴포넌트 추가**: 좌측 사이드바의 `Models` 메뉴에서 **`OpenAI`** 또는 **`ChatOpenAI`** 컴포넌트를 작업 공간으로 드래그 앤 드롭합니다.
3. **고급 설정 (Advanced Settings) 열기**: 추가한 컴포넌트 블록의 고급 설정 아이콘(또는 하단 옵션 창)을 열어 파라미터를 수정합니다.
4. **Base URL 및 옵션 수정**:
   다음과 같이 커스텀 API 정보를 입력합니다.
   
   * **OpenAI API Base (또는 Base URL)**: 커스텀 API 서버의 주소를 입력합니다. (예: `http://192.168.0.100:11434/v1` - Ollama 기준)
   * **OpenAI API Key**: 실제 OpenAI 키가 아니더라도 빈 칸을 허용하지 않는 경우가 있으므로 `sk-dummy-key` 와 같은 임의의 문자열을 입력합니다. (서버에서 별도 인증을 요구한다면 해당 키를 입력)
   * **Model Name**: 호출하고자 하는 로컬 모델의 정확한 이름을 입력합니다. (예: `llama3`, `mistral:instruct` 등)

### 대표적인 커스텀 API 엔드포인트 예시

| 환경 | Base URL 예시 | 참고 사항 |
|---|---|---|
| **Ollama** | `http://<host-ip>:11434/v1` | Ollama 호스트 실행 시 외부 접속을 위한 `OLLAMA_HOST=0.0.0.0` 환경변수 설정 필수 |
| **LM Studio** | `http://<host-ip>:1234/v1` | LM Studio의 로컬 서버 설정 탭에서 CORS (Cross-Origin Resource Sharing) 활성화 권장 |
| **LiteLLM / vLLM** | `http://<host-ip>:4000/v1` | API 포트에 맞춰 `/v1` 접미사를 반드시 포함하여 사용 |

> **🚨 중요 주의사항**: 
> Langflow가 Docker 컨테이너 내부에서 구동 중이므로, Base URL에 `localhost`나 `127.0.0.1`을 입력하면 호스트 PC가 아닌 **컨테이너 내부 통신망**을 가리키게 됩니다. 
> 반드시 도커를 구동하는 호스트의 외부 내부망 IP(예: `192.168.0.x`)를 입력하거나, Docker 호스트 전용 DNS인 `http://host.docker.internal:포트번호/v1` 을 사용해야 정상적으로 통신이 가능합니다.

---

## 3. 간단한 테스트 파이프라인 구성

설정한 커스텀 API가 잘 동작하는지 확인하려면 다음 과정을 거쳐 간단한 챗봇 파이프라인을 완성해 보세요.

1. `Inputs` 탭에서 **`Prompt`** (또는 Chat Input) 컴포넌트를 작업 공간에 추가합니다.
2. `Models` 탭에서 설정해둔 **`ChatOpenAI`** 컴포넌트의 입력(Input) 포트와 Prompt의 출력(Output) 포트를 선으로 이어줍니다.
3. `Outputs` 탭에서 **`Text Output`** (또는 Chat Output) 컴포넌트를 추가하고, 모델의 결과물 포트와 연결합니다.
4. 화면 우측 하단의 **실행(Play)** 버튼 또는 인터랙티브 챗 아이콘을 눌러 프롬프트 메시지를 전송합니다.
5. 설정한 커스텀 LLM 서버(Ollama 등) 로그에 요청이 들어오는지 확인하고, Langflow 화면에 성공적으로 응답이 출력되는지 테스트합니다.

---
Langflow와 Docker Compose를 조합하면 빠르고 안정적으로 강력한 AI 에이전트를 시각적으로 구축할 수 있습니다. 위 가이드를 참고하여 나만의 로컬 LLM 환경을 구성해 보시기 바랍니다!
