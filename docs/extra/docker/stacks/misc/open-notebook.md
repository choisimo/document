# Open Notebook & Jupyter Notebook Docker Compose Setup

이 문서는 AI 기반 지식 관리 도구인 **Open Notebook**과 데이터 과학/분석을 위한 **Jupyter Notebook**을 Docker Compose로 설치하고 운영하는 방법을 설명합니다.

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
      - "8090:8090"  # 호스트 포트:컨테이너 포트
    volumes:
      - ./data:/app/data  # 데이터 지속성 보장
    environment:
      - OPENAI_API_KEY=your_openai_api_key_here  # (선택) 외부 API 사용 시
      - OLLAMA_BASE_URL=http://host.docker.internal:11434 # (선택) 로컬 Ollama 사용 시
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
      - "8888:8888"
    volumes:
      - ./notebooks:/home/jovyan/work  # 작업 파일 저장 경로
    environment:
      - JUPYTER_ENABLE_LAB=yes  # JupyterLab 활성화
      - NB_UID=1000             # 사용자 ID 권한 설정 (필요 시 변경)
      - NB_GID=100              # 그룹 ID 설정
      # - CHOWN_HOME=yes        # 권한 문제 발생 시 주석 해제
      # - CHOWN_HOME_OPTS='-R'
    command: start-notebook.sh --NotebookApp.token='my-secret-token' # 접속 토큰 설정
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
3.  접속: `http://localhost:8888?token=my-secret-token` (또는 로그에 출력된 URL 확인)

### 주요 이미지 태그
*   `jupyter/base-notebook`: 최소한의 기능만 포함
*   `jupyter/minimal-notebook`: 기본 유틸리티 포함
*   `jupyter/scipy-notebook`: Pandas, Matplotlib 등 과학 계산용
*   `jupyter/datascience-notebook`: Scipy + R, Julia 등 포함
