# Open Notebook & Jupyter Notebook Docker Compose Setup

이 문서는 AI 기반 지식 관리 도구인 **Open Notebook**과 데이터 과학/분석을 위한 **Jupyter Notebook**을 Docker Compose로 설치하고 운영하는 방법을 설명합니다.

## 적용 범위와 보안 전제

- 아래 Compose는 단일 호스트의 로컬 평가용 예시입니다. 이미지 버전과 실제 환경 변수 이름은 선택한 릴리스 문서에서 확인합니다.
- API 키와 Jupyter 토큰은 Compose 본문에 쓰지 말고 권한이 제한된 `.env` 또는 비밀 저장소에서 주입합니다.
- 기본 예시는 `127.0.0.1`에만 바인딩합니다. 원격 공개에는 인증, TLS, 리버스 프록시, 방화벽과 업로드 데이터 정책이 추가로 필요합니다.
- 완료 기준은 health/log 확인, 인증 접속, 승인된 샘플 처리, 재시작 후 데이터 유지와 백업·복원입니다.

---

## 1. Open Notebook

Open Notebook은 사용자가 문서, 웹 페이지, 이미지 등 다양한 데이터를 업로드하고 AI 모델(OpenAI, Anthropic, Ollama 등)을 활용하여 인사이트를 도출할 수 있는 지식 관리 시스템입니다.

### 사전 준비 사항
*   Docker 및 Docker Compose 설치 완료
*   (선택) 외부 AI API Key (OpenAI, Anthropic 등) 또는 내부 Ollama 서버

### `docker-compose.yml`
다음은 Open Notebook을 설치하기 위한 예제 구성입니다.

```yaml
services:
  open-notebook:
    image: opennotebook/opennotebook:latest
    container_name: open-notebook
    restart: always
    ports:
      - "127.0.0.1:8090:8090"  # 로컬 평가용 바인딩
    volumes:
      - ./data:/app/data  # bind mount; 별도 백업·복원 필요
    environment:
      # --- 필수/권장 설정 ---
      - PORT=8090
      
      # --- AI Provider Settings (하나 이상 설정 권장) ---
      
      # 1. OpenAI
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      
      # 2. Anthropic (Claude)
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      
      # 3. Google Gemini
      - GOOGLE_API_KEY=${GOOGLE_API_KEY:-}

      # 4. Ollama (Local LLM)
      # 호스트 머신의 Ollama에 접속하려면 host.docker.internal 사용 (Linux는 추가 설정 필요할 수 있음)
      - OLLAMA_API_BASE_URL=http://host.docker.internal:11434
      
      # 5. OpenAI Compatible (LocalAI, vLLM, DeepSeek 등)
      # OpenAI 호환 API를 제공하는 다른 서비스 연결 시 사용
      - OPENAI_COMPATIBLE_API_KEY=your-api-key # 인증이 필요 없다면 'sk-dummy' 등 임의 값
      - OPENAI_COMPATIBLE_BASE_URL=http://your-local-ai-host:8080/v1
      # 모델명 지정이 필요한 경우 (서비스에 따라 다름, UI에서 설정하기도 함)
      - OPENAI_COMPATIBLE_MODEL_NAME=llama-3-70b

    # networks:        # 필요한 경우 네트워크 설정 추가
    #   - my-network
```

### 설치 및 실행
1.  프로젝트 디렉토리 생성 및 이동:
    ```bash
    mkdir open-notebook
    cd open-notebook
    ```
2.  위의 내용을 `docker-compose.yml` 파일로 저장합니다.
3.  컨테이너 실행:
    ```bash
    docker compose up -d
    ```
4.  웹 브라우저에서 `http://localhost:8090`으로 접속합니다.

---

## 2. Jupyter Notebook

Jupyter Notebook은 파이썬 코드를 실행하고 데이터를 시각화할 수 있는 가장 대중적인 오픈소스 웹 애플리케이션입니다.

### `docker-compose.yml`
데이터 과학용 라이브러리가 포함된 `datascience-notebook` 이미지를 사용하는 예제입니다.

```yaml
services:
  jupyter:
    image: jupyter/datascience-notebook:latest
    container_name: jupyter-notebook
    restart: unless-stopped
    ports:
      - "127.0.0.1:8888:8888"
    volumes:
      - ./notebooks:/home/jovyan/work  # 작업 파일 저장 경로
    environment:
      - JUPYTER_ENABLE_LAB=yes  # JupyterLab 활성화
      - NB_UID=1000             # 사용자 ID 권한 설정 (필요 시 변경)
      - NB_GID=100              # 그룹 ID 설정
      # - CHOWN_HOME=yes        # 권한 문제 발생 시 주석 해제
      # - CHOWN_HOME_OPTS='-R'
    command: start-notebook.sh --NotebookApp.token='${JUPYTER_TOKEN:?set JUPYTER_TOKEN}'
```

### 설치 및 실행
1.  디렉토리 생성:
    ```bash
    mkdir jupyter
    cd jupyter
    mkdir notebooks
    # 권한 설정 (리눅스 환경에서 필요할 수 있음)
    chown 1000:100 notebooks
    ```
2.  `docker-compose.yml` 작성 후 실행:
    ```bash
    docker compose up -d
    ```
3.  접속: `http://localhost:8888`에서 `.env`에 설정한 토큰으로 인증하고, 실제 토큰이 포함된 URL을 문서나 셸 기록에 남기지 않습니다.

### 주요 이미지 태그
*   `jupyter/base-notebook`: 최소한의 기능만 포함
*   `jupyter/minimal-notebook`: 기본 유틸리티 포함
*   `jupyter/scipy-notebook`: Pandas, Matplotlib 등 과학 계산용
*   `jupyter/datascience-notebook`: Scipy + R, Julia 등 포함
