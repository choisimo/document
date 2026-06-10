# Devtools Docker Stacks 학습 및 기록 노트

Devtools 카테고리는 Git 서버, 코드 검색 도구, 웹 터미널처럼 개발과 운영 작업을 직접 다루는 서비스를 모은다. 이 계층은 저장소, 토큰, SSH 접속, 터미널 세션을 다룰 수 있으므로 기본 비밀번호와 공개 포트를 반드시 검토해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

개발 도구형 서비스는 편리하지만 권한이 크다. Gitea는 Git 저장소와 SSH 포트를 열고, Sourcebot은 GitHub 토큰과 AI API 키를 사용하며, Termix는 웹에서 터미널과 SSH 기능을 제공한다. 기본값으로 실행하면 “컨테이너는 정상”이어도 민감 리소스가 넓게 노출될 수 있다.

따라서 Devtools 스택은 실행 전 인증, 포트, 볼륨, 토큰 저장 위치를 먼저 확인해야 한다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/devtools`에는 다음 스택이 있다.

- `gitea/docker-compose.yaml`: SQLite 기반 Gitea, 포트 `3000`, `2222`
- `sourcebot/docker-compose.yaml`: Sourcebot, 포트 `3333`, `env.example`, `config.json`
- `sourcebot/.sourcebot/*`: Sourcebot 런타임 상태 또는 secret 파일로 보이는 숨김 파일
- `termix/docker-compose.yaml`: Termix, 포트 `8080`, named volume 3개

검증 결과는 다음과 같다.

- Gitea Compose는 렌더링되지만 `version` 속성은 최신 Compose에서 obsolete 경고가 난다.
- Sourcebot Compose는 `env.example` 값을 그대로 넣으면 예시 API 키 문자열이 렌더링된다.
- Termix Compose는 기본 `admin/changeme` 계정과 예시 `SESSION_SECRET`이 렌더링된다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 개발 도구별 권한 범위를 실행 전에 이해한다.
- 기본 계정, 예시 API 키, 예시 secret을 실제 값으로 교체한다.
- Sourcebot의 인덱싱 대상 저장소를 `config.json`에서 명시한다.
- Gitea와 Termix 포트 공개 범위를 운영 환경에 맞게 제한한다.
- 런타임 secret이나 상태 파일을 저장소에 커밋하지 않는다.

## 4. 시스템 번역 (Data Flow)

Devtools 스택의 일반 흐름은 다음과 같다.

```text
브라우저 또는 Git 클라이언트
  -> Devtools 서비스
  -> 저장소, SSH 대상, 코드 인덱스, API Provider
  -> 데이터 볼륨 또는 bind mount
```

서비스별 흐름은 다르다.

```text
Git client -> Gitea HTTP/SSH -> /data bind mount
Sourcebot -> GitHub API -> local /data config and index state
Browser -> Termix -> SSH target or terminal session -> termix volumes
```

이 흐름에서 브라우저 UI는 단순한 관리 화면이 아니라 Git, 토큰, 터미널에 접근하는 관문이다.

## 5. 핵심 구성요소 (Building Blocks)

| 스택 | 핵심 파일 | 공개 포트 | 민감 요소 |
| --- | --- | --- | --- |
| Gitea | `docker-compose.yaml` | `3000`, `2222` | Git 저장소, SSH 접속 |
| Sourcebot | `docker-compose.yaml`, `env.example`, `config.json` | `3333` | GitHub token, AI API keys |
| Termix | `docker-compose.yaml` | `8080` | 관리자 계정, 세션 secret, SSH 연결 |

확인해야 할 주요 설정은 다음과 같다.

| 설정 | 이유 |
| --- | --- |
| `GITHUB_TOKEN` | Sourcebot이 저장소를 읽는 권한 |
| `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | 외부 AI Provider 접근 권한 |
| `CONFIG_PATH` | Sourcebot 설정 파일 경로 |
| `TERMIX_ADMIN_PASS` | Termix 관리자 비밀번호 |
| `TERMIX_SESSION_SECRET` | 세션 서명 secret |
| `USER_UID`, `USER_GID` | Gitea 데이터 파일 소유권 |

## 6. 상태 전이 (State Transition)

Devtools 스택 실행 흐름은 다음과 같다.

```text
스택 선택
  -> 권한 범위 확인
  -> 토큰과 secret 작성
  -> 포트 공개 범위 결정
  -> docker compose config
  -> 기동
  -> 로그인과 데이터 쓰기 검증
```

각 단계의 통과 기준은 다음과 같다.

- 권한 범위 확인: 서비스가 Git, SSH, API token 중 무엇을 다루는지 안다.
- secret 작성: 예시값과 기본 비밀번호가 남아 있지 않다.
- 포트 결정: 로컬만 필요한 서비스는 `127.0.0.1` 바인딩이나 프록시 뒤 배치를 검토한다.
- 기동 검증: `docker compose ps`와 로그에서 재시작 루프가 없다.
- 기능 검증: 로그인, 저장소 접근, 터미널 세션 생성을 확인한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Sourcebot의 API 키와 GitHub token은 `env.example`에 실제 값으로 저장하지 않는다.
- Sourcebot의 `.sourcebot` 런타임 secret 파일은 공개 저장소에 커밋하지 않는다.
- Termix의 `admin/changeme` 기본 계정은 운영 전에 반드시 바꾼다.
- Termix의 `SESSION_SECRET`은 충분히 긴 랜덤 값으로 교체한다.
- Gitea의 `/data` bind mount는 백업 대상이다.
- Git SSH 포트 `2222`와 서버 SSH 포트 `22`를 혼동하지 않는다.
- 개발 도구 UI는 공개 인터넷에 직접 열기보다 프록시 인증과 TLS 뒤에 둔다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Gitea 렌더링 확인과 실행은 다음과 같다.

```bash
cd infra/docker/stacks/devtools/gitea
docker compose config
docker compose up -d
docker compose ps
```

Sourcebot은 환경 파일과 인덱싱 대상 저장소를 먼저 준비한다.

```bash
cd infra/docker/stacks/devtools/sourcebot
cp env.example .env
docker compose --env-file .env config
docker compose --env-file .env up -d
```

`config.json`의 저장소 목록은 실제 인덱싱 대상만 남긴다.

```json
{
  "connections": {
    "github-connection": {
      "type": "github",
      "repos": ["owner/repository"]
    }
  }
}
```

Termix는 기본 secret을 바꾼 뒤 렌더링한다.

```bash
cd infra/docker/stacks/devtools/termix
TERMIX_ADMIN_PASS='replace-me' TERMIX_SESSION_SECRET='replace-with-random-secret' docker compose config
docker compose up -d
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 Termix 기본 관리자 계정을 그대로 공개하는 것이다. 현재 기본값은 `admin/changeme`로 렌더링되므로 외부 공개 전 반드시 바꿔야 한다.

두 번째 실패는 Sourcebot 예시 API 키를 실제 실행에 사용하는 것이다. `example_github_personal_access_token_here` 같은 값은 인증 실패를 만들거나, 실제 토큰을 잘못된 파일에 저장하게 만든다.

세 번째 실패는 Sourcebot의 작업 디렉터리 전체를 `/data`로 마운트하는 점을 놓치는 것이다. 설정 파일과 런타임 상태 파일이 같은 디렉터리에 생기므로 커밋 대상과 로컬 상태 파일을 분리해야 한다.

네 번째 실패는 Gitea 데이터를 bind mount로 두고 백업하지 않는 것이다. 컨테이너 재생성은 쉬워도 `gitea_data`가 사라지면 저장소와 설정이 사라진다.

다섯 번째 실패는 개발 도구 포트를 그대로 인터넷에 여는 것이다. 코드 검색, Git 서버, 웹 터미널은 모두 인증 우회나 약한 비밀번호의 피해가 크다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인용 Gitea는 SQLite와 bind mount로 시작할 수 있지만, 팀 사용량이 늘면 별도 DB와 백업 정책을 검토한다.

Sourcebot은 인덱싱 대상 저장소와 토큰 scope를 최소화해야 한다. 조직 전체 인덱싱은 편하지만 권한 범위와 API 사용량이 커진다.

Termix는 웹 터미널 특성상 프록시 인증, IP 제한, 세션 만료, 접속 로그가 중요하다. SSH 키를 마운트할 경우 읽기 전용과 대상 경로를 명확히 한다.

여러 Devtools를 한 호스트에서 운영하면 공통 프록시, SSO, 백업, 로그 수집을 함께 설계한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 사용할 Devtools 스택의 실제 경로를 확인했다.
- [ ] 기본 계정과 예시 secret을 모두 교체했다.
- [ ] API token scope를 최소화했다.
- [ ] 포트 공개 범위와 프록시 경계를 검토했다.
- [ ] `docker compose config`가 성공한다.
- [ ] 런타임 secret 파일이 커밋 대상이 아닌지 확인했다.
- [ ] 데이터 볼륨 또는 bind mount를 백업 대상으로 정했다.
- [ ] 로그인, 저장소 접근, 터미널 접속 같은 핵심 기능을 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Devtools 스택은 개발 편의 도구가 아니라 `__________`, 토큰, SSH 권한을 여는 서비스다. 실행 전 기본 `__________`를 바꾸고, 포트는 `__________` 또는 인증 프록시 뒤에 둔다.
