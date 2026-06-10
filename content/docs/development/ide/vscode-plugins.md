# VS Code 확장 관리 학습 및 기록 노트

VS Code 확장은 편집기를 개발 환경으로 바꾸는 핵심 요소다. 하지만 확장을 많이 설치할수록 자동 포맷, 린팅, 언어 서버, 원격 접속, 터미널 통합이 서로 영향을 줄 수 있다. 이 문서는 확장을 개인 취향 목록이 아니라 프로젝트 재현성과 유지보수 기준으로 관리하기 위한 기록이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

새 장비나 원격 개발 환경을 열 때마다 확장을 수동으로 설치하면 편집기 동작이 달라진다. 어떤 장비에서는 저장 시 포맷이 되고, 다른 장비에서는 같은 파일이 다른 스타일로 바뀐다. 언어 서버가 중복으로 켜지거나, 프로젝트와 맞지 않는 확장이 자동 수정까지 수행하면 변경 이력도 지저분해진다.

VS Code 확장 관리는 이 문제를 세 가지로 나누어 해결한다.

- 개인 전체에 필요한 확장
- 저장소가 권장하는 확장
- 특정 환경에서만 켜야 하는 원격 또는 컨테이너 확장

## 2. 현재 나의 상태 (Baseline)

현재 문서는 확장 이름과 설치 명령을 표로 나열한다.

- `ext install` 명령이 중심이라 CLI 자동화와 Command Palette 실행이 섞여 보인다.
- 어떤 확장이 개인 설정이고 어떤 확장이 저장소 권장사항인지 구분하지 않는다.
- `settings.json` 예시는 있지만 팀 저장소에 넣어도 되는 설정과 개인 설정의 경계가 없다.
- `code-server`나 원격 환경에서 확장이 어디에 설치되는지 설명하지 않는다.

이 상태에서는 확장 목록을 따라 설치할 수는 있지만, 저장소마다 같은 개발 경험을 재현하기 어렵다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 확장을 다음 기준으로 관리하는 것이다.

- 개인 생산성 확장은 사용자 프로필 또는 Settings Sync로 관리한다.
- 프로젝트 필수 확장은 `.vscode/extensions.json`에 권장 목록으로 남긴다.
- 포맷터와 린터는 프로젝트 설정 파일과 충돌하지 않게 하나의 기준을 둔다.
- 원격 환경에서는 원격 호스트 또는 컨테이너에 설치되는 확장을 따로 확인한다.
- 새 환경 구축은 `code --install-extension` 또는 `code-server --install-extension`으로 재현할 수 있다.

## 4. 시스템 번역 (Data Flow)

확장 설치와 적용 흐름은 다음처럼 볼 수 있다.

```text
사용자 프로필
  -> 전역 확장과 개인 설정
  -> 작업 영역 설정
  -> 저장소 권장 확장
  -> 언어 서버, 포맷터, 린터, 디버거 실행
  -> 파일 저장 또는 빌드 결과에 영향
```

원격 개발에서는 위치가 하나 더 생긴다.

```text
로컬 VS Code
  -> 원격 연결 계층
  -> 원격 호스트의 확장 호스트
  -> 원격 파일 시스템과 런타임
```

따라서 확장이 로컬에 설치되었는지, 원격 호스트에 설치되었는지, 두 위치 모두 필요한지 확인해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 관리 기준 |
| --- | --- | --- |
| Extension Marketplace | 확장 검색과 설치 | 게시자, 다운로드, 권한, 유지보수 상태 확인 |
| `code --install-extension` | CLI 설치 또는 업데이트 | 새 장비 재현에 사용 |
| `.vscode/extensions.json` | 저장소 권장 확장 | 팀 공통 권장 목록 기록 |
| `settings.json` | 사용자 또는 워크스페이스 설정 | 개인 취향과 프로젝트 규칙 분리 |
| Settings Sync | 개인 설정 동기화 | 개인 장비 간 동기화에 사용 |
| Profiles | 용도별 확장 묶음 | 업무, 학습, 실험 환경 분리 |

기본 추천 파일은 다음처럼 저장소에 둘 수 있다.

```json
{
  "recommendations": [
    "PKief.material-icon-theme",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-azuretools.vscode-docker"
  ],
  "unwantedRecommendations": []
}
```

## 6. 상태 전이 (State Transition)

확장 관리는 다음 흐름으로 진행한다.

```text
필요 기능 식별
  -> 후보 확장 검토
  -> 개인 확장 또는 프로젝트 권장 확장으로 분류
  -> 설치
  -> 설정 충돌 확인
  -> 저장 시 동작 검증
  -> 새 환경에서 재현성 확인
```

상태 전이마다 확인할 질문은 다르다.

- 필요 기능 식별: 언어 지원, 포맷, 린트, 디버그, 컨테이너, Git 중 무엇이 필요한가?
- 후보 검토: 공식 또는 널리 쓰이는 게시자인가?
- 분류: 이 확장이 저장소를 여는 모든 사람에게 필요한가?
- 설치: 로컬과 원격 중 어느 확장 호스트에 설치되는가?
- 검증: 저장 시 자동 수정이 프로젝트 규칙과 일치하는가?

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 포맷터는 프로젝트당 하나의 기본값을 둔다.
- 린터가 자동 수정하는 범위는 팀 규칙과 충돌하지 않아야 한다.
- 저장소에는 개인 테마, 폰트, UI 취향을 강제하지 않는다.
- 확장 ID는 `publisher.extension` 형식으로 기록한다.
- 원격 환경에서는 확장이 실제로 원격 측에 설치되었는지 확인한다.
- 확장 설치 목록은 민감한 토큰이나 개인 경로를 포함하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

CLI에서 확장을 설치할 때는 다음 형식을 사용한다.

```bash
code --install-extension PKief.material-icon-theme
code --install-extension eamodio.gitlens
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --list-extensions
```

`code-server`에서는 실행 바이너리가 다르다.

```bash
code-server --install-extension ms-python.python
code-server --install-extension ms-azuretools.vscode-docker
code-server --list-extensions
```

프로젝트 권장 확장은 `.vscode/extensions.json`에 기록한다.

```json
{
  "recommendations": [
    "ms-python.python",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

워크스페이스 설정은 프로젝트 동작에 필요한 값만 남긴다.

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript"]
}
```

개인 취향에 가까운 설정은 사용자 설정에 둔다.

```json
{
  "workbench.iconTheme": "material-icon-theme",
  "editor.fontSize": 14,
  "editor.minimap.enabled": false
}
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 포맷터 중복이다. Prettier, 언어별 포맷터, LSP 내장 포맷터가 동시에 켜지면 저장할 때마다 예상하지 못한 변경이 발생한다. 이때는 `editor.defaultFormatter`와 언어별 설정을 명시한다.

두 번째 실패는 저장소에 개인 UI 설정을 강제하는 것이다. 폰트, 아이콘 테마, minimap 같은 값은 팀 생산성 규칙이 아니라 개인 작업 환경이다.

세 번째 실패는 원격 환경에서 확장이 설치되지 않은 경우다. 로컬 VS Code에는 확장이 보이지만, SSH나 컨테이너 안의 언어 서버가 없으면 자동완성이나 디버깅이 동작하지 않는다.

네 번째 실패는 확장 권한을 검토하지 않는 것이다. 확장은 작업 영역 파일과 네트워크 접근 권한을 가질 수 있으므로, 게시자와 유지보수 상태를 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

개인 장비가 여러 대라면 Settings Sync로 사용자 설정과 확장을 동기화한다. 다만 원격 창의 확장은 로컬 동기화와 별개로 확인해야 한다.

팀 저장소에서는 `.vscode/extensions.json`만으로 모든 설정을 강제하지 않는다. 실제 포맷 규칙은 `.editorconfig`, Prettier 설정, ESLint 설정, 언어별 빌드 설정에 두고 VS Code는 그 규칙을 실행하는 도구로 둔다.

대규모 조직에서는 허용 확장 목록, 내부 VSIX 배포, 프로필 템플릿, 원격 개발 이미지에 사전 설치된 확장 목록을 함께 관리한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 프로젝트 필수 확장을 `.vscode/extensions.json`에 기록했다.
- [ ] 개인 테마와 폰트 설정을 저장소 설정에 넣지 않았다.
- [ ] 기본 포맷터가 하나로 결정되어 있다.
- [ ] 린터 자동 수정 범위가 프로젝트 규칙과 일치한다.
- [ ] CLI 설치 명령으로 새 환경을 재현할 수 있다.
- [ ] 원격 개발 환경에서 필요한 확장이 원격 측에 설치되었다.
- [ ] 확장 게시자와 유지보수 상태를 확인했다.
- [ ] Settings Sync와 프로젝트 권장 확장의 역할을 분리했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

VS Code 확장은 많이 설치하는 것이 목표가 아니라, 프로젝트마다 `__________` 가능한 개발 환경을 만드는 것이 목표다. 개인 취향은 `__________`에 두고, 팀 공통 확장은 `__________`에 기록한다. 포맷터와 린터는 저장 시 `__________`을 만들지 않도록 하나의 기준으로 맞춘다.
