# Documentation Hub 학습 및 기록 노트

이 문서는 `content/docs` 아래 문서 전체의 최상위 진입점이다. 특정 기술 하나를 설명하기보다, 어떤 영역의 문서를 어디서 시작해야 하는지 알려 주는 색인 역할을 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

문서가 늘어나면 사용자는 원하는 글을 찾기보다 디렉터리 구조를 추측하게 된다. 인프라, 개발, Linux, Kubernetes, 운영체제, 보안, 도구 문서가 한 저장소 안에 섞이면 상위 인덱스가 실제 구조와 달라지는 순간 탐색 비용이 커진다.

최상위 허브의 목적은 멋진 소개가 아니라 실제 문서 구조와 읽는 순서를 유지하는 것이다.

## 2. 현재 나의 상태 (Baseline)

현재 `content/docs`에는 다음 주요 영역이 있다.

- Algorithms, Compiler, Databases, Development
- Books, Java, JavaScript, Kubernetes, Linux, Nginx, OS
- Infrastructure, Proxmox, Security, Tools
- Extra, Projects, Prompts, ADR, AI

기존 문서는 카드형 랜딩 페이지로 자주 쓰는 영역을 소개했지만, 실제 존재하는 모든 상위 섹션을 균형 있게 보여 주지는 않았다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 최상위 문서에서 주요 섹션의 시작점을 찾을 수 있다.
- 각 섹션의 책임 범위를 한 문장으로 이해할 수 있다.
- Docker Compose 같은 보조 리소스는 Extra 아래로 연결된다.
- 문서 트리가 바뀌면 최상위 허브도 함께 갱신한다.
- 특정 문제를 해결할 때 어느 영역부터 읽을지 판단할 수 있다.

## 4. 시스템 번역 (Data Flow)

문서 탐색 흐름은 다음과 같다.

```text
content/docs/index.md
  -> 주제별 index.md
  -> 세부 카테고리 문서
  -> 실제 절차, 개념, 점검표
```

예를 들어 Docker Compose 스택을 찾는 흐름은 다음과 같다.

```text
Documentation Hub
  -> Extra
  -> Docker Compose 컬렉션
  -> Stack category
  -> infra/docker/stacks 실제 파일
```

인프라 운영 문제는 다음처럼 이동한다.

```text
Documentation Hub
  -> Infrastructure
  -> Hardware, Networking, Monitoring, Proxmox, Storage
  -> 개별 런북
```

## 5. 핵심 구성요소 (Building Blocks)

| 영역 | 진입 문서 | 역할 |
| --- | --- | --- |
| Algorithms | [algorithms/index.md](algorithms/index.md) | 알고리즘 개념과 구현 패턴 |
| Books | [books/index.md](books/index.md) | 책 기반 CS 학습 노트 |
| Compiler | [compiler/index.md](compiler/index.md) | 컴파일러 렉싱과 파싱 |
| Databases | [databases/index.md](databases/index.md) | DB, JPA, Redis |
| Development | [development/index.md](development/index.md) | Docker, Git, IDE, 언어 런타임 |
| Extra | [extra/index.md](extra/index.md) | 보조 리소스와 Docker Compose 컬렉션 |
| Infrastructure | [infrastructure/index.md](infrastructure/index.md) | 하드웨어, 네트워크, 모니터링, Proxmox, 스토리지 |
| Java | [java/index.md](java/index.md) | Java 핵심 개념과 메모리 |
| Linux | [linux/index.md](linux/index.md) | Linux 명령어, 파일시스템, 배포판 |
| Nginx | [nginx/index.md](nginx/index.md) | Nginx 설정과 배포 |
| OS | [os/index.md](os/index.md) | 운영체제 개념 |
| Security | [security/index.md](security/index.md) | SSH, VPN, Zero Trust, 접근 제어 |
| Tools | [tools/index.md](tools/index.md) | 터미널, 원격 접속, 자동화 도구 |

## 6. 상태 전이 (State Transition)

문서 허브 관리 흐름은 다음과 같다.

```text
새 문서 추가
  -> 섹션 index 갱신
  -> 최상위 index 필요 여부 확인
  -> 링크 검증
  -> 포맷 검증
```

문서를 읽는 흐름은 다음과 같다.

```text
문제 정의
  -> 상위 영역 선택
  -> 섹션 index 읽기
  -> 개별 문서 실행 또는 학습
  -> 체크리스트로 완료 확인
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 최상위 허브는 실제 존재하는 진입 문서만 링크한다.
- 각 영역 설명은 하위 문서를 대체하지 않고 탐색 방향만 제공한다.
- Docker Compose 실행 파일은 문서 링크만 보고 실행하지 않고 실제 `infra/docker/stacks` 파일을 확인한다.
- 상위 인덱스의 링크가 깨지면 문서 탐색 전체가 깨진다.
- 새 대분류를 만들면 `index.md`를 함께 둔다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 상위 진입 문서는 다음처럼 확인한다.

```bash
find content/docs -maxdepth 2 -name index.md -type f | sort
```

최상위 디렉터리는 다음처럼 확인한다.

```bash
find content/docs -maxdepth 1 -type d | sort
```

문서를 추가한 뒤에는 Markdown 포맷 검증을 실행한다.

```bash
cargo run --manifest-path src/tools/docs-validator-rs/Cargo.toml -- --root . --docs-base content/docs --check format --summary-only
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 존재하지 않는 섹션을 최상위 허브에 남기는 것이다. 링크가 깨지면 새 사용자는 문서 전체가 낡았다고 판단하게 된다.

두 번째 실패는 상위 허브에 세부 절차를 너무 많이 넣는 것이다. 각 섹션의 책임과 중복되어 유지보수 비용이 커진다.

세 번째 실패는 섹션 이름과 실제 디렉터리 이름을 다르게 쓰는 것이다. 예를 들어 JavaScript 문서는 `javascripts` 디렉터리에 있으므로 링크와 표기가 실제 구조와 맞아야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

문서가 더 커지면 최상위 허브는 “주제별 진입점”만 남기고, 세부 목록은 각 섹션 index로 위임하는 편이 낫다.

운영 문서와 학습 문서가 섞이면 목적별 태그나 별도 색인을 둘 수 있다. 예를 들어 실행 절차는 Runbook, 개념 정리는 Learning Note로 구분한다.

자동 링크 검증이 추가되면 최상위 허브의 품질을 더 안정적으로 유지할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 주요 상위 섹션이 실제 파일 구조와 일치한다.
- [ ] 각 섹션에 `index.md`가 있는지 확인했다.
- [ ] 존재하지 않는 링크를 제거했다.
- [ ] 최상위 허브가 세부 절차를 중복하지 않는다.
- [ ] 새 섹션 추가 시 최상위 또는 섹션 index 갱신 기준을 안다.
- [ ] 포맷 검증을 통과했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Documentation Hub는 문서 내용을 모두 담는 곳이 아니라 `__________`를 찾는 지도다. 상위 링크는 실제 `__________`와 일치해야 하고, 세부 절차는 각 섹션의 `__________`로 위임한다.
