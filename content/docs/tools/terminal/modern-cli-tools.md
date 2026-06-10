# Modern CLI Tools

모던 CLI 도구는 전통적인 유닉스 명령을 모두 대체하는 것이 아니라, 자주 하는 작업을 더 빠르고 읽기 쉽게 만드는 보완 도구다. 기준 없이 설치하면 도구만 늘어나므로, 먼저 어떤 병목을 줄일지 정해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

기본 명령어만으로도 대부분의 작업은 가능하다. 하지만 큰 코드베이스 검색, Git diff 검토, JSON 처리, 디스크 사용량 파악, 반복적인 디렉터리 이동처럼 매일 반복되는 작업은 더 전문화된 도구를 쓰면 시간이 크게 줄어든다.

모던 CLI 도구의 목적은 "멋진 터미널 꾸미기"가 아니라 탐색, 검색, 비교, 측정 작업의 피드백 루프를 짧게 만드는 것이다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 모던 CLI 도구를 단계적으로 도입할 가치가 있다.

- `grep -R` 검색이 느리거나 결과가 너무 많다.
- `find` 옵션을 매번 검색해서 복사한다.
- JSON 응답을 눈으로 접어서 읽는다.
- Git diff가 길어 변경 의도를 빠르게 파악하기 어렵다.
- 디스크 사용량을 `du` 결과만으로 해석하기 어렵다.
- 자주 가는 프로젝트 경로를 매번 긴 `cd`로 입력한다.
- 터미널 에뮬레이터, tmux, shell, editor의 역할이 섞여 있다.

## 3. 도달하고 싶은 목표 (Target State)

좋은 CLI 환경은 다음 상태를 만족한다.

- 기본 POSIX 도구를 이해한 뒤 보완 도구를 선택한다.
- alias는 편의용으로만 쓰고, 스크립트는 표준 명령에 가깝게 유지한다.
- 검색, 미리보기, 선택, 실행의 흐름이 짧다.
- JSON, CSV, 로그, Git diff를 구조에 맞게 읽는다.
- 성능 측정은 감이 아니라 `hyperfine` 같은 도구로 비교한다.
- 서버와 로컬 환경의 도구 차이를 예상하고 fallback 명령을 알고 있다.

## 4. 시스템 번역 (Data Flow)

CLI 작업은 보통 다음 파이프라인으로 표현된다.

```text
입력 후보 수집
  -> 필터링
  -> 미리보기
  -> 선택
  -> 실행
  -> 결과 검증
```

예를 들어 코드에서 문자열을 찾고 파일을 선택해 편집하는 흐름은 다음과 같다.

```bash
rg "DATABASE_URL" .
rg --files | fzf
```

Git 변경을 읽는 흐름은 다음처럼 나눌 수 있다.

```bash
git status --short
git diff
git diff --stat
```

모던 도구는 이 흐름의 각 단계를 더 빠르게 하거나 더 읽기 쉽게 만든다.

## 5. 핵심 구성요소 (Building Blocks)

도구는 역할별로 고른다.

| 역할 | 도구 예시 | 대체하거나 보완하는 작업 |
| --- | --- | --- |
| 내용 검색 | `rg` | `grep -R`보다 빠른 코드 검색 |
| 파일 찾기 | `fd` | 단순 파일명 검색과 제외 규칙 처리 |
| 파일 보기 | `bat` | 구문 강조와 줄 번호가 있는 `cat` |
| 목록 표시 | `eza` | Git 상태와 아이콘이 있는 `ls` |
| 퍼지 선택 | `fzf` | 긴 목록에서 빠른 인터랙티브 선택 |
| JSON 처리 | `jq` | API 응답 필터링과 변환 |
| diff 보기 | `delta` | Git diff 가독성 개선 |
| 디렉터리 이동 | `zoxide` | 자주 가는 경로 점수 기반 이동 |
| 디스크 사용량 | `dust`, `duf` | 용량 사용량을 더 읽기 쉽게 표시 |
| 성능 비교 | `hyperfine` | 명령 실행 시간 벤치마크 |
| 프롬프트 | `starship` | shell별 프롬프트 설정 통일 |
| 세션 유지 | `tmux`, `zellij` | 장기 실행 세션과 패널 관리 |

터미널 에뮬레이터는 별도 계층이다. Ghostty, Alacritty, Kitty, WezTerm, Foot 같은 도구는 셸 명령을 바꾸지 않는다. 렌더링, 폰트, 탭, 분할, 이미지 표시, GPU 가속 같은 화면 계층을 담당한다.

## 6. 상태 전이 (State Transition)

도구 도입은 다음 상태로 진행한다.

```text
default_tools
  -> one_tool_added
  -> aliases_added
  -> workflow_integrated
  -> portable_fallback_documented
```

- `default_tools`: 기본 명령만 사용한다.
- `one_tool_added`: 문제 하나에 도구 하나를 추가했다.
- `aliases_added`: 손에 익은 명령으로 별칭을 만들었다.
- `workflow_integrated`: 검색, 선택, 편집, diff 확인에 연결했다.
- `portable_fallback_documented`: 서버나 CI에서 도구가 없을 때의 대체 명령을 안다.

한 번에 많은 도구를 설치하면 실패 원인을 분리하기 어렵다. 검색 도구 하나, 선택 도구 하나, diff 도구 하나처럼 작은 단위로 도입한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 스크립트와 운영 런북은 개인 alias에 의존하지 않는다.
- 서버에서 실행할 명령은 해당 서버에 설치된 도구인지 먼저 확인한다.
- `bat`, `eza`, `delta` 같은 출력 개선 도구는 파이프라인의 데이터 형식을 깨뜨리지 않아야 한다.
- `fzf`로 선택한 결과를 삭제나 배포 명령에 넘길 때는 실행 전 목록을 다시 확인한다.
- 벤치마크는 한 번의 실행 결과가 아니라 여러 번 반복한 결과로 판단한다.
- 터미널 에뮬레이터 기능과 tmux 기능을 중복 설정할 때 단축키 충돌을 확인한다.
- 설치 명령은 배포판과 버전에 따라 달라질 수 있으므로 공식 패키지 문서를 확인한다.
- 외부 스크립트 설치 명령을 바로 실행하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

가장 작은 도입 세트는 검색, 선택, JSON 처리다.

```bash
rg "TODO" .
rg --files | fzf
curl -s https://api.github.com/repos/sharkdp/fd | jq '.name, .description'
```

Git diff 가독성을 높인다.

```bash
git status --short
git diff --stat
git diff
```

`delta`를 Git pager로 쓰는 설정은 다음처럼 적용할 수 있다.

```bash
git config --global core.pager delta
git config --global interactive.diffFilter "delta --color-only"
```

자주 가는 디렉터리를 빠르게 이동한다.

```bash
zoxide add ~/workspace/document
z document
zi
```

명령 성능을 비교한다.

```bash
hyperfine 'grep -R "pattern" .' 'rg "pattern" .'
```

`fzf`로 선택한 파일을 편집기로 연다.

```bash
vim "$(rg --files | fzf)"
```

## 9. 실패 사례 (What could go wrong?)

- 로컬 alias에 의존한 명령을 서버 런북에 적어 다른 사람이 실행하지 못한다.
- `ls`를 `eza`로 alias한 뒤 스크립트가 색상 코드나 다른 출력 형식 때문에 깨진다.
- `fzf` 선택 결과를 바로 `rm`에 넘겨 잘못 선택한 파일을 삭제한다.
- `jq` 필터가 빈 결과를 반환하는데 성공으로 착각한다.
- 터미널 에뮬레이터의 분할 기능과 tmux 단축키가 겹쳐 입력이 예상과 다르게 동작한다.
- Git diff pager 설정이 CI나 비대화형 환경에서 멈춘다.
- 벤치마크를 캐시가 따뜻한 상태와 차가운 상태를 섞어 비교한다.
- 외부 설치 스크립트를 검토 없이 실행해 셸 설정이 오염된다.

## 10. 뇌 확장하기 (Evolution & Variants)

도입 순서는 다음처럼 잡는 것이 안전하다.

1. 검색: `rg`, `fd`
2. 보기: `bat`, `eza`, `delta`
3. 선택: `fzf`
4. 구조화 데이터: `jq`
5. 이동: `zoxide`
6. 용량과 성능: `dust`, `duf`, `hyperfine`
7. 세션: `tmux` 또는 `zellij`
8. 화면 계층: 터미널 에뮬레이터 선택

터미널 에뮬레이터는 기능보다 운영 환경에 맞춰 선택한다. Wayland 전용 환경인지, 원격 서버에서 tmux를 주로 쓰는지, 탭과 분할을 터미널에 맡길지 tmux에 맡길지, 폰트 렌더링과 이미지 프로토콜이 필요한지부터 정한다.

도구가 늘어날수록 dotfiles 관리가 중요해진다. 설정 파일은 `stow` 같은 도구로 추적하고, 서버에 배포할 설정과 로컬 전용 설정을 분리한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 기존 기본 명령으로도 같은 작업을 수행하는 방법을 알고 있다.
- [ ] 새 도구는 한 번에 하나씩 도입했다.
- [ ] alias가 스크립트나 런북에 새어 나가지 않았다.
- [ ] 설치 방법은 현재 배포판의 공식 패키지 문서를 확인했다.
- [ ] `fzf` 선택 결과로 파괴적 명령을 실행하기 전 확인 단계를 둔다.
- [ ] `jq` 필터의 빈 결과와 실패를 구분한다.
- [ ] Git pager 설정이 비대화형 환경을 방해하지 않는지 확인했다.
- [ ] 서버에서 도구가 없을 때의 fallback 명령을 알고 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

모던 CLI 도구는 기본 명령어를 모르는 상태에서 붙이는 장식이 아니라, 반복 작업의 `____`를 줄이기 위해 `____` 단위로 도입하고 `____` 명령을 함께 남기는 보완재다.
