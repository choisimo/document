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


## 적용 범위와 운영 계약

이 예시는 Langflow, PostgreSQL과 OpenAI 호환 API를 Docker Compose로 연결하는 출발점입니다. 이미지 태그, 환경 변수, 데이터베이스 스키마, UI 메뉴와 각 공급자의 호환 범위는 버전별로 달라지므로 승인 버전과 release note를 기준으로 조정합니다.

- **배포 전제**: 개발용 단일 호스트 예시이며 인터넷에 직접 노출하는 운영 구성이 아닙니다. 인증, TLS reverse proxy, 네트워크 분리, 자원 제한과 백업을 별도로 설계합니다.
- **비밀 관리**: 데이터베이스와 모델 API 자격 증명은 Compose 본문이나 flow export에 넣지 않고 secret 파일 또는 비밀 저장소에서 주입합니다.
- **공급망과 변경**: latest 대신 검토한 이미지 버전과 digest를 고정하고 업그레이드 전에 데이터베이스와 flow를 백업합니다. migration 실패 시 이전 이미지와 백업으로 복구할 절차를 둡니다.
- **연결 원칙**: 컨테이너의 localhost는 컨테이너 자신입니다. 동일 Docker 네트워크, 명시적 host gateway 또는 제한된 내부 주소 중 플랫폼에 맞는 경로를 사용하며 모델 서버를 0.0.0.0에 무조건 노출하지 않습니다.
- **완료 조건**: health 상태, 재시작 후 데이터 보존, 인증되지 않은 접근 거부, 모델명 조회와 최소 요청 성공, timeout 및 모델 서버 장애 처리, 백업 복원 시험을 기록합니다.

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
    image: langflowai/langflow:<approved-version>@sha256:<approved-digest>
    container_name: langflow
    ports:
      - "127.0.0.1:7860:7860"
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      # 동일한 실행 환경 값을 Langflow와 PostgreSQL secret에 사용
      LANGFLOW_DATABASE_URL: "postgresql://langflow:${LANGFLOW_DB_PASSWORD:?set LANGFLOW_DB_PASSWORD}@postgres:5432/langflow"
      # Langflow 설정 및 데이터가 저장될 내부 경로
      LANGFLOW_CONFIG_DIR: /app/langflow
    volumes:
      - langflow-data:/app/langflow

  postgres:
    image: postgres:16
    container_name: langflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: langflow
      POSTGRES_PASSWORD_FILE: /run/secrets/langflow_db_password
      POSTGRES_DB: langflow
    volumes:
      - langflow-db:/var/lib/postgresql/data
    secrets:
      - langflow_db_password

volumes:
  langflow-data:
  langflow-db:

secrets:
  langflow_db_password:
    environment: LANGFLOW_DB_PASSWORD
```

이 구성은 실행 환경의 `LANGFLOW_DB_PASSWORD` 하나를 Langflow database URL과 PostgreSQL의 `/run/secrets/langflow_db_password`에 함께 사용합니다. environment-backed secret을 지원하는 Docker Compose 버전인지 먼저 확인하고, 값을 저장소·Compose 파일·셸 기록에 남기지 마세요. 파일 기반 secret으로 바꾸는 경우 Compose는 파일 내용을 `LANGFLOW_DATABASE_URL`에 자동 삽입하지 않으므로 Langflow 쪽에도 같은 값을 주입하는 별도 시작 절차가 필요합니다.

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
   * **OpenAI API Key**: 대상 서버가 인증을 요구하면 secret으로 주입한 실제 키를 사용합니다. 인증이 없는 로컬 서버에서 컴포넌트가 값을 요구하는 경우에만 비밀이 아닌 명시적 placeholder를 사용합니다.
   * **Model Name**: 호출하고자 하는 로컬 모델의 정확한 이름을 입력합니다. (예: `llama3`, `mistral:instruct` 등)

### 대표적인 커스텀 API 엔드포인트 예시

| 환경 | Base URL 예시 | 참고 사항 |
|---|---|---|
| **Ollama** | `http://<host-ip>:11434/v1` | 동일 Docker 네트워크 또는 제한된 내부 인터페이스를 우선하고 전 인터페이스 바인딩은 피함 |
| **LM Studio** | `http://<host-ip>:1234/v1` | LM Studio의 로컬 서버 설정 탭에서 CORS (Cross-Origin Resource Sharing) 활성화 권장 |
| **LiteLLM / vLLM** | `http://<host-ip>:4000/v1` | API 포트에 맞춰 `/v1` 접미사를 반드시 포함하여 사용 |

> **🚨 중요 주의사항**: 
> Langflow가 Docker 컨테이너 내부에서 구동 중이므로, Base URL에 `localhost`나 `127.0.0.1`을 입력하면 호스트 PC가 아닌 **컨테이너 내부 통신망**을 가리키게 됩니다. 
> 플랫폼에 맞게 동일 Docker 네트워크, 명시적 host gateway 또는 제한된 내부 주소를 선택합니다. host.docker.internal 지원 여부와 방화벽을 실제 환경에서 확인합니다.

---

## 3. 간단한 테스트 파이프라인 구성

설정한 커스텀 API가 잘 동작하는지 확인하려면 다음 과정을 거쳐 간단한 챗봇 파이프라인을 완성해 보세요.

1. `Inputs` 탭에서 **`Prompt`** (또는 Chat Input) 컴포넌트를 작업 공간에 추가합니다.
2. `Models` 탭에서 설정해둔 **`ChatOpenAI`** 컴포넌트의 입력(Input) 포트와 Prompt의 출력(Output) 포트를 선으로 이어줍니다.
3. `Outputs` 탭에서 **`Text Output`** (또는 Chat Output) 컴포넌트를 추가하고, 모델의 결과물 포트와 연결합니다.
4. 화면 우측 하단의 **실행(Play)** 버튼 또는 인터랙티브 챗 아이콘을 눌러 프롬프트 메시지를 전송합니다.
5. 설정한 커스텀 LLM 서버(Ollama 등) 로그에 요청이 들어오는지 확인하고, Langflow 화면에 성공적으로 응답이 출력되는지 테스트합니다.

---
Langflow와 Docker Compose는 시각적 AI 흐름을 구성하는 한 가지 방법이며 안정성과 보안은 고정 버전, 인증, 자원 제한, 관측성과 복구 시험에 달려 있습니다. 위 가이드를 참고하여 나만의 로컬 LLM 환경을 구성해 보시기 바랍니다!
