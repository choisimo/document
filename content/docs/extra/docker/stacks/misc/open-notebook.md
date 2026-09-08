# Open Notebook 및 Jupyter Docker 구성 학습 노트

이 문서는 AI 기반 지식 관리 도구인 Open Notebook과 데이터 분석용 JupyterLab을 Docker Compose로 실행할 때 확인해야 할 기준을 정리한다. 두 도구 모두 웹 UI를 열고 파일과 API key를 다루므로, 이미지 이름보다 데이터 보존, 접속 토큰, AI provider secret, 포트 공개 범위를 먼저 확인해야 한다.

## 적용 범위와 보안 전제

- 아래 Compose는 단일 호스트의 로컬 평가용 예시입니다. 이미지 버전과 실제 환경 변수 이름은 선택한 릴리스 문서에서 확인합니다.
- API 키와 Jupyter 토큰은 Compose 본문에 쓰지 말고 권한이 제한된 `.env` 또는 비밀 저장소에서 주입합니다.
- 기본 예시는 `127.0.0.1`에만 바인딩합니다. 원격 공개에는 인증, TLS, 리버스 프록시, 방화벽과 업로드 데이터 정책이 추가로 필요합니다.
- 완료 기준은 health/log 확인, 인증 접속, 승인된 샘플 처리, 재시작 후 데이터 유지와 백업·복원입니다.

## 1. 왜 필요한가? (Pain Point & Motivation)

노트북형 도구는 빠르게 실행할 수 있지만, 잘못 열면 로컬 파일, 업로드 문서, API key, 실행 가능한 코드 셀이 함께 노출된다. Open Notebook은 AI provider key와 업로드 문서를 다루고, Jupyter는 Python 코드 실행 권한과 작업 디렉터리를 다룬다.

따라서 Compose 예시는 “실행 방법”이 아니라 “어떤 데이터와 권한이 컨테이너에 들어가는지”를 설명해야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 두 도구를 한 문서에 섞어 다음 방식으로 설명했다.

- Open Notebook 이미지로 `opennotebook/opennotebook:latest`를 사용한다.
- AI provider key를 Compose 환경 변수에 직접 예시로 넣는다.
- Jupyter 이미지는 `jupyter/datascience-notebook:latest`를 사용한다.
- Jupyter token을 command에 직접 고정한다.
- 데이터 볼륨과 API key 보존 정책은 짧게만 언급한다.

Open Notebook의 이미지명과 Compose 경로는 선택한 release의 공식 저장소에서 확인한다. 이 문서의 기존 이미지명이 현재 유효하다는 확인으로 해석하지 않는다. Jupyter 예시는 검토한 Jupyter Docker Stacks image와 Jupyter Server 설정을 전제로 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- Open Notebook Compose는 공식 저장소의 검토한 tag 또는 commit을 고정해 가져온다.
- AI provider key는 `.env` 또는 secret 관리 계층에 두고 문서에 실제 값을 남기지 않는다.
- Jupyter는 로컬 바인딩과 명시 토큰을 사용해 시작한다.
- 작업 파일과 업로드 문서는 컨테이너 삭제 후에도 남는 볼륨에 둔다.
- 외부 공개 전 프록시, 인증, TLS, 파일 접근 범위를 검토한다.

## 4. 시스템 번역 (Data Flow)

Open Notebook 흐름은 다음처럼 볼 수 있다.

```text
browser
  -> Open Notebook web UI
  -> uploaded documents and notebook data
  -> AI provider API or local model endpoint
  -> generated notes, chat, search results
```

Jupyter 흐름은 다음과 같다.

```text
browser
  -> JupyterLab token auth
  -> notebook kernel
  -> mounted work directory
  -> Python packages, files, external APIs
```

두 흐름 모두 브라우저에서 보이는 UI가 파일과 외부 API 권한을 사용할 수 있다는 점이 핵심이다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 확인할 내용 |
| --- | --- | --- |
| Open Notebook Compose | Open Notebook 서비스 구성 | 검토한 tag/commit의 Compose 경로와 digest |
| AI provider key | OpenAI, Anthropic, Gemini, OpenRouter 등 호출 | `.env` 저장, 커밋 금지 |
| Local model endpoint | Ollama 또는 OpenAI 호환 API | 컨테이너에서 접근 가능한 URL |
| Jupyter image | JupyterLab 실행 환경 | 필요한 패키지와 이미지 태그 |
| Jupyter token | 브라우저 접근 인증 | 긴 랜덤 값, 공유 금지 |
| Work volume | 노트북과 업로드 파일 보존 | bind mount 또는 named volume |

공식 문서를 다시 확인해야 하는 항목은 다음과 같다.

- Open Notebook: 공식 Get Started 문서와 GitHub Compose 예시
- Jupyter: Docker의 JupyterLab 가이드와 Jupyter Docker Stacks 문서

## 6. 상태 전이 (State Transition)

노트북 도구 실행 상태는 다음 순서로 이동한다.

```text
도구 선택
  -> 공식 Compose 또는 이미지 확인
  -> .env와 token 작성
  -> 볼륨 경로 결정
  -> docker compose config
  -> 기동
  -> 로그인, 파일 저장, 모델 호출 검증
```

각 단계의 통과 기준은 다음과 같다.

- 공식 확인: 이미지 이름과 태그가 현재 문서와 맞는다.
- secret 작성: 실제 API key가 Compose 파일 본문에 직접 남지 않는다.
- 볼륨 결정: 컨테이너 삭제 후에도 필요한 파일이 남는다.
- config 검증: 환경 변수 치환 결과가 빈 값으로 남지 않는다.
- 기능 검증: 파일 업로드, 노트북 저장, 모델 호출 또는 셀 실행이 성공한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Open Notebook AI provider key를 문서나 Compose 파일에 평문으로 고정하지 않는다.
- Jupyter token은 `my-secret-token` 같은 예시값으로 운영하지 않는다.
- Jupyter는 코드 실행 권한을 제공하므로 공개 인터넷에 직접 열지 않는다.
- 업로드 문서와 노트북 파일은 명시적인 볼륨에 저장한다.
- Ollama 같은 로컬 모델 endpoint는 컨테이너에서 접근 가능한 주소인지 검증한다.
- 운영 이미지는 검토한 tag/digest를 고정하고 upgrade와 rollback을 별도로 검증한다.
- 실행 전 `docker compose config`로 최종 설정을 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Open Notebook은 별도 평가 디렉터리에서 공식 저장소의 검토한 revision에 해당하는 Compose를 가져온다. 아래 경로가 해당 revision에 있는지 확인하며 기존 파일을 덮어쓰지 않는다.

```bash
(
  set -eu
  : "${OPEN_NOTEBOOK_REF:?set reviewed repository tag or commit}"
  mkdir open-notebook-evaluation
  cd open-notebook-evaluation
  curl --fail --silent --show-error --location --connect-timeout 10 --max-time 60 \
    "https://raw.githubusercontent.com/lfnovo/open-notebook/$OPEN_NOTEBOOK_REF/docker-compose.yml" \
    --output docker-compose.yml
  less docker-compose.yml
)
```

선택한 release가 요구하는 환경 파일·비밀·volume·loopback port를 설정하고 Compose를 검증한 후 기동한다. download 성공만으로 원본 예시의 외부 노출을 승인하지 않는다.

Jupyter는 Open Notebook과 독립된 디렉터리 및 `compose.jupyter.yaml`을 사용한다. 검토한 image의 Jupyter Server가 `IdentityProvider.token` 설정을 지원하는지 확인한다.

```yaml
services:
  jupyter:
    image: "${JUPYTER_IMAGE:?set reviewed Jupyter Docker Stacks tag or digest}"
    ports:
      - "127.0.0.1:8889:8888"
    environment:
      JUPYTER_TOKEN: "${JUPYTER_TOKEN:?provide a strong nonempty token}"
    volumes:
      - ./notebooks:/home/jovyan/work
      - ./jupyter_server_config.py:/etc/jupyter/jupyter_server_config.py:ro
    command: ["start-notebook.py", "--config=/etc/jupyter/jupyter_server_config.py"]
```

같은 디렉터리의 `jupyter_server_config.py`는 비밀 값 대신 환경 변수를 읽고 빈 값이면 시작을 거부한다.

```python
import os

token = os.environ["JUPYTER_TOKEN"]
if not token:
    raise ValueError("JUPYTER_TOKEN must not be empty")
c.IdentityProvider.token = token
```

작업 디렉터리의 소유권을 선택한 image의 notebook 사용자와 맞추고, `JUPYTER_IMAGE`는 검토한 reference로 설정한다. 최초 평가용 토큰 생성 예시는 다음과 같다. 재시작과 회전 정책이 필요한 운영 환경에서는 제한된 secret 저장소에 보존한다.

```bash
mkdir -p notebooks
JUPYTER_TOKEN=$(openssl rand -hex 32) || exit 1
export JUPYTER_TOKEN
docker compose -f compose.jupyter.yaml config --quiet && \
  docker compose -f compose.jupyter.yaml up -d
docker compose -f compose.jupyter.yaml ps
```

`http://127.0.0.1:8889/lab`을 열고 로그인 폼에 토큰을 입력한다. 토큰을 URL·문서·명령 인자에 넣지 않는다. startup 로그에도 토큰이 들어갈 수 있으므로 접근을 제한하고 공유 전에 redaction한다. 인증 없는 접근 거부, 셀 실행, 저장과 재시작 후 파일 보존을 확인한다.

설정 옵션은 [Jupyter Server 설정](https://jupyter-server.readthedocs.io/en/latest/other/full-config.html)과 [Docker Stacks 시작 방식](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/common.html)을 기준으로 선택한 image에서 검증한다.

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 오래된 Open Notebook 이미지명이나 moving branch 예시를 검토 없이 실행하는 것이다. 선택한 release의 공식 Compose와 이미지 reference를 대조한다.

두 번째 실패는 API key를 Compose 파일에 직접 박는 것이다. 파일이 공유되거나 커밋되면 외부 AI provider 계정 권한이 노출된다.

세 번째 실패는 Jupyter token을 약한 값으로 두거나 외부에 직접 공개하는 것이다. Jupyter는 코드 실행 환경이므로 파일 읽기와 네트워크 호출 권한이 크다.

네 번째 실패는 bind mount 경로를 잘못 잡는 것이다. 노트북을 저장했다고 생각했지만 컨테이너 내부 임시 경로에만 남으면 컨테이너 제거 시 사라진다.

다섯 번째 실패는 로컬 모델 주소를 호스트 기준으로만 생각하는 것이다. 컨테이너 내부에서 `localhost`는 호스트가 아니라 컨테이너 자신을 가리킨다.

## 10. 뇌 확장하기 (Evolution & Variants)

Open Notebook을 클라우드 AI와 함께 쓰면 API key 관리와 비용 모니터링이 중요하다. 로컬 모델과 함께 쓰면 GPU, 모델 서버 주소, 컨테이너 네트워크가 중요해진다.

Jupyter를 데이터 분석용으로 쓰면 `base-notebook`보다 `scipy-notebook`이나 `datascience-notebook` 계열 이미지가 편할 수 있다. 다만 이미지가 커지고 패키지 버전 고정이 더 중요해진다.

여러 사용자가 접속해야 한다면 단일 Jupyter token 방식보다 JupyterHub, 별도 인증 프록시, 사용자별 볼륨 분리가 더 적합하다.

외부 공개가 필요하면 TLS 리버스 프록시, SSO, IP 제한, 업로드 용량 제한, 로그 보존을 함께 설계한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Open Notebook은 공식 Compose 예시와 이미지명을 다시 확인했다.
- [ ] AI provider key를 문서나 Compose 파일에 직접 남기지 않았다.
- [ ] Jupyter token을 긴 랜덤 값으로 설정했다.
- [ ] 포트는 우선 `127.0.0.1`에만 바인딩했다.
- [ ] 업로드 문서와 노트북 파일이 명시적인 볼륨에 저장된다.
- [ ] `docker compose config`가 성공한다.
- [ ] Open Notebook 모델 호출 또는 Jupyter 셀 실행을 검증했다.
- [ ] 외부 공개 전 인증, TLS, 로그, 백업을 검토했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

노트북형 Docker 서비스는 UI가 아니라 `__________`와 파일 권한을 여는 실행 환경이다. Open Notebook은 공식 `__________`를 기준으로 확인하고, Jupyter는 강한 `__________`과 보존 볼륨을 먼저 정한다.
