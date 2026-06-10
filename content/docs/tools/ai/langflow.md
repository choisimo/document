# Langflow

Langflow는 LLM 애플리케이션, RAG, 에이전트 흐름을 시각적으로 구성하고 실행할 수 있는 도구다. Docker로 빠르게 실행할 수 있지만, 운영에 가까운 구성에서는 데이터베이스와 secrets, 네트워크 경계를 분리해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

LLM workflow를 코드로만 작성하면 prompt, model, retriever, tool, output 연결을 눈으로 확인하기 어렵다. Langflow는 이 흐름을 노드 기반 UI로 설계하고 테스트할 수 있게 한다.

하지만 기본 실행만으로 운영 준비가 끝나는 것은 아니다. flow 저장소, 데이터베이스, API key, custom model endpoint, reverse proxy, 인증 정책을 별도로 정해야 한다.

## 2. 현재 나의 상태 (Baseline)

흔한 출발점은 다음과 같다.

- `langflowai/langflow:latest` 컨테이너만 띄우고 데이터 영속성을 확인하지 않는다.
- SQLite와 PostgreSQL 사용 차이를 모른다.
- OpenAI 호환 endpoint를 연결하면서 `localhost`가 컨테이너 내부를 가리킨다는 점을 놓친다.
- API key를 flow나 compose 파일에 직접 넣는다.
- Langflow UI를 인증 없이 외부에 노출한다.
- 모델 서버, vector store, Langflow가 같은 Docker network에 있는지 확인하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Langflow를 실험용과 운영형 구성으로 구분하는 것이다.

- 로컬 실험은 단일 컨테이너로 빠르게 실행한다.
- 유지해야 할 flow와 설정은 볼륨 또는 외부 DB에 저장한다.
- 여러 인스턴스나 안정적 운영이 필요하면 PostgreSQL을 사용한다.
- Ollama, LM Studio, LiteLLM, vLLM 같은 OpenAI 호환 endpoint의 base URL을 정확히 설정한다.
- API key와 DB password는 환경 변수 또는 secret으로 분리한다.
- 외부 노출 시 reverse proxy와 인증을 둔다.

## 4. 시스템 번역 (Data Flow)

Langflow 실행 흐름은 다음과 같다.

```text
browser user opens Langflow UI
  -> creates flow graph
  -> flow stores configuration
  -> model node calls LLM provider or OpenAI-compatible endpoint
  -> retriever/tool nodes call external services
  -> output node renders response
```

Docker에서 custom model endpoint 호출은 다음처럼 해석한다.

```text
Langflow container
  -> base URL in model component
  -> Docker network DNS or host gateway
  -> Ollama, LM Studio, LiteLLM, vLLM, or remote API
```

컨테이너 내부의 `localhost`는 Docker host가 아니라 Langflow 컨테이너 자신이다.

## 5. 핵심 구성요소 (Building Blocks)

- Langflow UI: flow를 만들고 실행하는 브라우저 인터페이스.
- Flow: component node와 edge로 구성된 LLM workflow.
- Component: model, prompt, input, output, retriever, tool 같은 실행 단위.
- Database: flow와 설정을 저장하는 저장소. 실험용과 운영형 요구가 다르다.
- `LANGFLOW_DATABASE_URL`: PostgreSQL 같은 외부 DB 연결을 지정하는 환경 변수.
- OpenAI-compatible endpoint: `/v1` API 호환 서버를 통해 로컬/프록시 모델을 호출하는 방식.
- Docker network: Langflow와 model server가 서로 이름으로 통신하게 하는 경계.
- Reverse proxy: HTTPS, 인증, host routing을 담당하는 외부 진입점.

## 6. 상태 전이 (State Transition)

Langflow flow는 다음 상태로 관리한다.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Runnable: required inputs configured
    Runnable --> Tested: sample prompt succeeds
    Tested --> Versioned: exported or stored
    Versioned --> Deployed: API or UI workflow used
    Deployed --> Broken: provider, key, or schema changed
    Broken --> Revised
```

모델 endpoint나 API key가 바뀌면 `Deployed` flow도 다시 테스트해야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- API key와 DB password는 flow export나 Git에 남기지 않는다.
- 컨테이너에서 `localhost`를 쓰기 전 어느 네트워크 namespace를 가리키는지 확인한다.
- Langflow UI를 인터넷에 직접 노출하지 않는다.
- production-like 구성에서는 데이터 영속성과 백업을 먼저 확인한다.
- custom endpoint는 모델명, base URL, authentication 요구사항을 함께 기록한다.
- flow 변경 후 sample input으로 회귀 테스트를 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

로컬 실험용 실행:

```bash
docker run --rm -p 7860:7860 langflowai/langflow:latest
```

PostgreSQL 연결을 사용하는 구성에서는 `LANGFLOW_DATABASE_URL`을 명시한다.

```yaml
services:
  langflow:
    image: langflowai/langflow:latest
    ports:
      - "7860:7860"
    environment:
      LANGFLOW_DATABASE_URL: postgresql://langflow:${LANGFLOW_DB_PASSWORD}@postgres:5432/langflow
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: langflow
      POSTGRES_PASSWORD: ${LANGFLOW_DB_PASSWORD}
      POSTGRES_DB: langflow
    volumes:
      - langflow-db:/var/lib/postgresql/data

volumes:
  langflow-db:
```

OpenAI 호환 endpoint는 보통 `Base URL`, `API Key`, `Model Name`을 함께 맞춘다.

## 9. 실패 사례 (What could go wrong?)

- 컨테이너 안에서 `http://localhost:11434/v1`를 설정해 Ollama host가 아니라 Langflow 자신으로 요청한다.
- DB 볼륨 없이 컨테이너를 지워 flow가 사라진다.
- `latest` 이미지를 무조건 사용해 업그레이드 후 component schema가 바뀐다.
- API key를 flow JSON에 저장해 export 파일로 유출한다.
- Langflow UI를 공개망에 열어 임의 사용자가 LLM 비용을 발생시킨다.
- custom endpoint의 `/v1` 경로, 모델명, 인증 방식이 실제 서버와 맞지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

- flow export를 Git에 넣되 secrets는 환경 변수 참조로 분리한다.
- Langflow API 서버를 reverse proxy 뒤에 두고 SSO 또는 VPN으로 접근을 제한한다.
- Ollama, LiteLLM, vLLM, OpenAI, Gemini endpoint를 provider별 profile로 분리한다.
- vector store와 document loader를 붙일 때 데이터 위치와 개인정보 범위를 점검한다.
- 운영 flow는 input/output contract와 실패 응답을 테스트 케이스로 만든다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 실행 방식이 실험용인지 운영형인지 구분되어 있다.
- [ ] flow와 DB 데이터가 영속화된다.
- [ ] API key와 DB password가 환경 변수/secret으로 분리되어 있다.
- [ ] custom endpoint의 base URL이 컨테이너 네트워크 기준으로 맞다.
- [ ] Langflow UI 접근이 인증 또는 사설망으로 제한되어 있다.
- [ ] sample prompt로 flow 실행을 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Langflow는 LLM workflow를 시각화해 주지만, 안정적으로 쓰려면 데이터 영속성, secrets 분리, 컨테이너 네트워크, 접근 제어를 함께 설계해야 한다.
