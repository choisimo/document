# 문서 coverage 감사 — 2026-09-12

## 판정 범위와 “전체”의 의미

이 감사는 지정한 작업 트리 안의 명시적 소스 집합을 빠짐없이 열거하고, 공개에 유용한 **독립 주제의 공백**을 복구하는 작업이다. 보관 문장·코드 조각·외부 글을 모두 재출판한다는 뜻이 아니다. 본문 작성에는 실제 파일의 내용과 현재 설정을 읽은 근거만 사용했다. 명령·예시·설계 후보와 실행된 동작을 구분한다.

시작 기준은 공개 Markdown **265개**다. 새 공개 문서 **35개**를 추가해 **300개**가 됐고, 탐색 단절이 있던 기존 문서 **7개**도 nav에 연결했다. 이 기록 자체는 공개 본문 개수에 포함하지 않는다. 변경은 새 Markdown 35개, 이 감사 기록, `apps/docs-site/mkdocs.yml`에 한정된다. 루트 README·JS·CSS·hook·독립 앱·Git index/이력·원격은 이 작업에서 변경하지 않았다.

“분류 완료”는 각 파일 또는 명확한 경로 집합에 처분을 부여했다는 뜻이다. 모든 코드의 동작, 기존 자료의 비밀 부재, 외부 서비스의 호환성·배포 성공을 입증했다는 뜻은 아니다. 파일 목록·제목·연결 구조를 전수 조사하고, 복구 문서는 관련 본문·실행문·설정 키까지 읽어 작성했다. 바이너리와 비밀 저장 후보는 내용 재게시 없이 경로·종류로 제외했다.

## 1. 재현 가능한 소스 집합

파일 수는 `.gitignore`를 적용하지 않는 순회 기준이다. `.git`, `node_modules`, `target`, `__pycache__`, `.venv`, `.terraform` 디렉터리는 제외하고 symlink를 따라가지 않는다. 디렉터리 이름이 `site`라는 이유로 소스 `src/automation/site`를 제외하지 않는다.

| 집합 | 시작 파일 수 | 최종 관측 수 | 분류 기준 |
| --- | --- | --- | --- |
| `content/docs/` | 287 | 322 | 공개 문서·빌드 입력. 기존 265 Markdown + 비 Markdown 22 |
| `content/archive/` | 206 | 206 | 보관본 206개를 아래 개별 표로 분류 |
| `content/rendered/` | 13 | 13 | 파생·프로젝트 산출물. 아래 13개 개별 분류 |
| `content/prompts/` | 9 | 9 | 9개 템플릿을 기존·신규 공개 안내로 연결 |
| `content/notes/` | 11 | 13 | 기존 11개 학습·디자인·개인 기록 + 이 감사 기록 + 동시 작업자의 분석 기록 1개 |
| `content/research/` | 41 | 41 | 하나의 연구 템플릿. 계약만 복구, 운영 값·전체 배치 제외 |
| `infra/` | 137 | 137 | README 27개 포함. 실제 설정은 동작·공개 경계의 근거 |
| `src/` | 351 | 351 | Markdown 57개 포함. 코드 목록과 실제 문서·실행 진입점 대조 |
| `apps/docs-site/` | 21 | 21 | 빌더·템플릿·자산 사본·hook·검사. 읽기만 수행 |
| `.github/` | 1 | 1 | 현행 Pages workflow. 배포 순서·조건의 근거 |
| 선택한 루트/안내 파일 | 7 | 7 | `README.md`, `MIGRATION_MAP.md`, `.gitignore`, `.env.example`, `CNAME`, `split-snapshot.md`, `content/README.md` |
| 합계 | 1084 | 1121 | 루트·하위 집합은 중복 없이 계산. 새 문서 35 + 감사 기록 1 + 동시 작업 기록 1 |

이 작업 자체의 추가 파일은 **36개**이므로 시작 집합에 이 변경만 더하면 **1120개**다. 최종 반복 명령에서는 동시 작업자가 추가한 `content/notes/blog-agent-analysis-20260912.md`도 관측되어 **1121개**다. 이 파일은 별도 앱 분석 작업의 기록으로 분류하며, 본 작업의 새 문서·내용 검토·수정 범위에 포함하지 않는다. 기존 1084개에 대한 분류와 동시 작업 산출물을 구분한다.

`content/source/`는 현재 존재하지 않아 0개다. `MIGRATION_MAP.md`의 과거 `docs/`, `legacy/`, `research/`, `prompt/`, `code/`, `scripts/`는 현재 대응 경로로 확인했다. 과거 경로를 별도 원본으로 중복 집계하지 않았다.

`dist/`, 루트 `qa-shots/`, `split-snapshot.md`의 UI snapshot, `.sisyphus/`, 의존성·compiler cache·이미지 산출물은 새 주제 원본으로 승격하지 않았다. `split-snapshot.md`는 선택 파일 7개 중 A(산출물)로만 집계한다. `apps/docs-agent-lab/`은 별도 담당 범위로 제외하며 내용을 조사·수정하지 않았다. `src/mcp/code`와 템플릿의 `node_modules` symlink는 따라가지 않았다. 저장소 외부 디렉터리·백업·Git의 모든 역사 revision은 이번 소스 집합에 포함하지 않는다.

기본 `rg --files`는 ignored archive·rendered 및 일부 비밀 이름 파일을 누락한다. 실제 차이는 archive 206, rendered 13, research 2, infra 2개다. 이 네 집합은 `--no-ignore`/파일시스템 순회로 보완했다. 제외 규칙은 공개 검토 규칙과 다르다.

### 반복 명령

저장소 루트에서 아래 Python을 실행한다. 내용·환경 변수·비밀 파일명은 출력하지 않고 집합별 수와 **상대 경로 목록의 SHA256**만 출력한다. 이는 내용 동일성 해시가 아니다. 이후 다른 작업이 파일을 추가·삭제하면 count/digest가 달라지므로 이 날짜의 분류를 자동으로 새 파일에 적용하지 않는다.

```bash
python3 - <<'PY'
from pathlib import Path
import os
import hashlib

roots = [
    'content/docs', 'content/archive', 'content/rendered',
    'content/prompts', 'content/notes', 'content/research',
    'infra', 'src', 'apps/docs-site', '.github',
]
excluded = {'.git', 'node_modules', 'target', '__pycache__', '.venv', '.terraform'}
total = 0
for root in roots:
    paths = []
    for directory, children, files in os.walk(root, followlinks=False):
        children[:] = sorted(name for name in children
                             if name not in excluded
                             and not (Path(directory) / name).is_symlink())
        for name in files:
            path = Path(directory) / name
            if path.is_file() and not path.is_symlink():
                paths.append(path.as_posix())
    paths.sort()
    digest = hashlib.sha256(('\n'.join(paths) + '\n').encode()).hexdigest()
    markdown = sum(path.endswith('.md') for path in paths)
    print(root, len(paths), markdown, digest)
    total += len(paths)
extra = ['README.md', 'MIGRATION_MAP.md', '.gitignore', '.env.example',
         'CNAME', 'split-snapshot.md', 'content/README.md']
assert all(Path(path).is_file() for path in extra)
print('selected_root_files', len(extra))
print('total', total + len(extra))
print('content/source', Path('content/source').exists())
PY
```

| 최종 관측 집합 | 상대 경로 목록 SHA256 |
| --- | --- |
| `content/docs` | `d783587c77a6bba8590daf0b457e07b28e2edda830c4807f6108d5c9fbf05acd` |
| `content/archive` | `de1fb9c17bd3694e8d2c5c49c66c61cbd23b4d7bc56b48abda94af122c5d08ac` |
| `content/rendered` | `d9578a671e10930df7fc1d4e22b026d2722c78d2d946704d63b0bc4f98680a44` |
| `content/prompts` | `57ecaa4046651cdbb1edabb9022e885403e7ea026658c1463cc500f89a2b2d53` |
| `content/notes` | `a75f979922c40f2a5259b4a4b67ae307f064f5d4a3915523f4edb2b5a58607fe` |
| `content/research` | `31888f12c67e5dda9d81d39e23c045439efe833256403fc88f7de5a2d1662bcd` |
| `infra` | `267f082dbbf495f66eb96526e45068775f93b363174b71990a41985ca296a4b1` |
| `src` | `0773474e8eef8b482153d2d2dd4405e3d5f35ac8751548c017dce01001e6acff` |
| `apps/docs-site` | `e20807f433950983cc8e362a81aef85aa8f68c556f34d4d33405123842c0736f` |
| `.github` | `aca8abe80f4d5ecdde58c38fec97a02dcb9c862d48e989ae836afdd72ab7d8ae` |

## 2. nav 미등록 문서 판정

시작 시 265개 중 nav 직접 등록은 **173개**, 미등록은 **92개**였다. 원본 Markdown의 inline 링크·HTML href를 수집해 nav 출발점에서 도달 가능한 경로를 확인했다. JavaScript 검색에만 의존한 판정이 아니다.

| 기존 미등록 집합 | 수 | 실제 판정·조치 |
| --- | --- | --- |
| `books/` | 85 | `books/index.md`, `books/cs-reference/index.md` 등의 문서 링크를 따라 모두 도달. nav의 개별 행을 중복 생성하지 않음 |
| `linux-extra/` | 6 | 기존 nav 출발점에서 도달하지 못함. Linux → 심화 Linux에 6개 추가 |
| `adr/ADR-001-repo-layout.md` | 1 | 기존 nav 출발점에서 도달하지 못함. 문서 사이트 유지보수 아래 연결 |
| 새 문서 | 35 | 모두 해당 주제의 nav에 직접 등록 |
| 최종 | 300 | 직접 nav 215 + 색인 경유 도서 85. 누락된 nav 파일 0 |

### 기존 미등록 92개 전체 목록

아래는 새로 만든 페이지 목록이 아니다. books 항목의 경유 문서는 시작 시 실제 inbound 링크의 예다.

| `content/docs/` 상대 경로 | 경유 근거·조치 |
| --- | --- |
| `adr/ADR-001-repo-layout.md` | nav에 신규 연결 |
| `books/algorithms/advanced-algorithms-internals.md` | `books/index.md` |
| `books/algorithms/algorithm-design-analysis.md` | `books/index.md` |
| `books/algorithms/algorithmic-thinking-zingaro.md` | `books/index.md` |
| `books/algorithms/algorithms-internals.md` | `books/index.md`; `books/index.md` |
| `books/algorithms/cmu-advanced-algorithms.md` | `books/index.md` |
| `books/algorithms/competitive-programming-internals.md` | `books/index.md` |
| `books/algorithms/cracking-coding-interview-internals.md` | `books/index.md` |
| `books/algorithms/erickson-algorithms-deep.md` | `books/index.md` |
| `books/algorithms/sedgewick-algorithms-internals.md` | `books/index.md` |
| `books/cs-reference/algorithms-cs-reference.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/c-cpp-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/cloud-aws-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/compiler-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/computer-architecture-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/data-mining-bigdata-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/data-structures-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/database-systems-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/devops-linux-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/distributed-systems-cs.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/docker-kubernetes-cs.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/functional-programming-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/java-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/ko/algorithms-cs-reference.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/c-cpp-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/cloud-aws-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/compiler-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/computer-architecture-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/data-mining-bigdata-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/data-structures-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/database-systems-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/devops-linux-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/distributed-systems-cs.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/docker-kubernetes-cs.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/functional-programming-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/java-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/math-computing-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/microservices-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/miscellaneous-cs.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/ml-ai-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/mobile-android-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/networking-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/operating-systems-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/programming-languages-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/python-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/security-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/software-engineering-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/systems-programming-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/ko/web-frontend-internals.md` | `books/cs-reference/index.md` |
| `books/cs-reference/math-computing-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/microservices-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/miscellaneous-cs.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/ml-ai-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/mobile-android-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/networking-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/operating-systems-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/programming-languages-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/python-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/security-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/software-engineering-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/systems-programming-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/cs-reference/web-frontend-internals.md` | `books/cs-reference/index.md`; `books/index.md` |
| `books/devops/consul-service-mesh-internals.md` | `books/index.md` |
| `books/devops/docker-kubernetes-internals.md` | `books/index.md`; `books/index.md` |
| `books/devops/docker-kubernetes-java-internals.md` | `books/index.md` |
| `books/devops/edge-computing-container-architectures.md` | `books/index.md` |
| `books/devops/jenkins-cicd-internals.md` | `books/index.md` |
| `books/devops/kubernetes-orchestration-internals.md` | `books/index.md` |
| `books/distributed/distributed-computing-principles.md` | `books/index.md` |
| `books/distributed/distributed-systems-internals.md` | `books/index.md`; `books/index.md` |
| `books/kafka/designing-event-driven-systems.md` | `books/index.md` |
| `books/kafka/effective-kafka-internals.md` | `books/index.md` |
| `books/kafka/kafka-in-action-deep.md` | `books/index.md` |
| `books/kafka/kafka-internals-definitive.md` | `books/index.md` |
| `books/kafka/kafka-internals.md` | `books/index.md`; `books/index.md` |
| `books/kafka/kafka-producer-consumer-deep.md` | `books/index.md` |
| `books/kafka/kafka-streams-in-action-deep.md` | `books/index.md` |
| `books/kafka/kafka-streams-internals.md` | `books/index.md` |
| `books/kafka/kafka-streams-ksqldb.md` | `books/index.md` |
| `books/kafka/learning-apache-kafka.md` | `books/index.md` |
| `books/kafka/rabbitmq-internals.md` | `books/index.md` |
| `books/systems/cpp-internals.md` | `books/index.md` |
| `books/systems/linux-kernel-development.md` | `books/index.md`; `books/index.md` |
| `books/systems/mamba-ssm-internals.md` | `books/index.md` |
| `books/systems/operating-systems-internals.md` | `books/index.md` |
| `books/systems/systems-performance.md` | `books/index.md` |
| `linux-extra/filesystem/01_overview.md` | nav에 신규 연결 |
| `linux-extra/filesystem/02_troubleshooting.md` | nav에 신규 연결 |
| `linux-extra/filesystem/03_commands_and_management.md` | nav에 신규 연결 |
| `linux-extra/filesystem/04_scalability_transactions.md` | nav에 신규 연결 |
| `linux-extra/gui-to-cli-switch.md` | nav에 신규 연결 |
| `linux-extra/linux_kernel_deep_learning.md` | nav에 신규 연결 |

## 3. 새 공개 문서 35개와 출처

아래 링크는 공개 정본이다. 출처는 저장소 상대 경로이며 원문 다운로드 링크를 새로 공개하지 않았다. `N`은 원본의 공개 가능한 핵심만 새로 정리한 것으로, 원문의 모든 문장·수치·코드를 복사했다는 뜻이 아니다.

| 추가 문서 | 읽은 소스·설정 |
| --- | --- |
| [ai/embedding-similarity.md](../docs/ai/embedding-similarity.md) | `content/archive/legacy/docs-old/ai-ml/multimodal-recommendation-system.md`; `content/archive/legacy/docs-old/ai-ml/nlp-embedding-similarity.html` |
| [ai/multimodal-recommendation.md](../docs/ai/multimodal-recommendation.md) | `content/archive/legacy/docs-old/ai-ml/multimodal-recommendation-system.md` |
| [algorithms/bitset-dp.md](../docs/algorithms/bitset-dp.md) | `src/examples/theory/bitset_dp.md` |
| [algorithms/code-examples.md](../docs/algorithms/code-examples.md) | `content/archive/legacy/Algorithm/C-lang/linux/Mutsumi/Mutsumi.h`; `content/archive/legacy/Algorithm/C-lang/linux/Mutsumi/saki.c`; `src/examples/README.md`; `src/examples/architect-code/README.md`; `src/examples/architect-code/python/p001_two_sum.py`; `src/examples/simulator/README.md`; `src/examples/simulator/javascript/index.html` |
| [algorithms/edit-distance.md](../docs/algorithms/edit-distance.md) | `src/examples/theory/edit_distance.md` |
| [databases/query-io.md](../docs/databases/query-io.md) | `content/archive/legacy/DATABASE/DB-normalization_to_FD.md`; `content/archive/legacy/DATABASE/DB-total.md`; `content/archive/legacy/DATABASE/DB_IO_operations.md` |
| [databases/relational-design.md](../docs/databases/relational-design.md) | `content/archive/legacy/DATABASE/DB-normalization_to_FD.md`; `content/archive/legacy/DATABASE/DB-total.md`; `content/archive/legacy/DATABASE/개념/JOIN.md` |
| [databases/sql-basics.md](../docs/databases/sql-basics.md) | `content/archive/legacy/DATABASE/grant.md`; `content/archive/legacy/DATABASE/sql/DCL/DCL.sql`; `content/archive/legacy/DATABASE/sql/DDL/DDL.sql`; `content/archive/legacy/DATABASE/sql/DML/DML.sql`; `content/archive/legacy/DATABASE/sql/TCL/TCL.sql`; `content/archive/legacy/DATABASE/개념/JOIN.md` |
| [databases/transactions.md](../docs/databases/transactions.md) | `content/archive/legacy/DATABASE/DB-total.md`; `content/archive/legacy/DATABASE/DB-transaction.md` |
| [development/api-contracts.md](../docs/development/api-contracts.md) | `content/archive/legacy/QnA-MarkDown/trouble_shooting/프로젝트_일관성-1.md` |
| [development/docker/stack-operations.md](../docs/development/docker/stack-operations.md) | `content/archive/legacy/docs-old/development/docker/docker-install.sh`; `content/archive/legacy/docs-old/development/docker/docker-mariadb.sh`; `content/archive/legacy/docs-old/development/docker/docker-nginx.sh`; `content/archive/legacy/docs-old/development/docker/docker-redis.sh`; `content/archive/legacy/docs-old/development/docker/docker-wireguard.sh`; `content/archive/legacy/docs-old/development/docker/extends-dir-size.sh`; `content/archive/legacy/docs-old/development/docker/movie-server.sh`; `content/archive/legacy/docs-old/development/docker/mydrive/mydrive-docker.yml`; `content/archive/legacy/docs-old/development/docker/psitransfer.yml`; `content/archive/legacy/docs-old/development/docker/syology_user_key.sh`; `content/archive/legacy/docs-old/tools/MCP/n8n_usage.md`; `infra/docker/README.md`; `infra/docker/stacks/automation/langflow/README.md`; `infra/docker/stacks/automation/n8n/README.md`; `infra/docker/stacks/databases/mariadb/README.md`; `infra/docker/stacks/databases/mongodb/README.md`; `infra/docker/stacks/databases/supabase/README.md` |
| [development/frontend/react-state-and-build.md](../docs/development/frontend/react-state-and-build.md) | `content/archive/legacy/Dev/Java-concepts.html`; `content/archive/legacy/Dev/React-concepts.html`; `content/archive/legacy/Dev/spring-boot-annotations.html`; `content/archive/legacy/react/react build and export.md`; `content/archive/legacy/react/state_manage.md` |
| [development/git/integration-strategies.md](../docs/development/git/integration-strategies.md) | `content/archive/legacy/docs-old/development/git/git_pull_types.md` |
| [development/ide/project-workspaces.md](../docs/development/ide/project-workspaces.md) | `content/archive/legacy/docs-old/development/vscode/project_manager_guide.md` |
| [development/realtime.md](../docs/development/realtime.md) | `content/archive/legacy/Dev/RTC_concepts.md` |
| [development/spring-architecture.md](../docs/development/spring-architecture.md) | `content/archive/legacy/DATABASE/mariadb_time_zone.md`; `content/archive/legacy/Dev/Java-concepts.html`; `content/archive/legacy/Dev/React-concepts.html`; `content/archive/legacy/Dev/spring-boot-annotations.html`; `content/archive/legacy/docs-old/databases/springboot-jpa/IoC_and_DI.md`; `content/archive/legacy/docs-old/databases/springboot-jpa/directory_structure.md`; `content/archive/legacy/docs-old/databases/springboot-jpa/springboot_caching_strategy.txt`; `content/archive/legacy/docs-old/databases/springboot-jpa/timestamp.md`; `content/archive/legacy/docs-old/databases/springboot-jpa/timezone.md` |
| [infrastructure/automation/ansible-and-research.md](../docs/infrastructure/automation/ansible-and-research.md) | `content/research/proxmox-rocky10-platform/ansible/roles/project_deploy/tasks/main.yml`; `content/research/proxmox-rocky10-platform/scripts/full_pipeline.sh`; `content/research/proxmox-rocky10-platform/scripts/generate_inventory.sh`; `content/research/proxmox-rocky10-platform/scripts/run_terraform.sh`; `infra/ansible/ansible.cfg`; `infra/ansible/playbooks/site.yml` |
| [infrastructure/hardware/gpio.md](../docs/infrastructure/hardware/gpio.md) | `content/archive/legacy/module-study/raspberry-GPIO_usage.md` |
| [infrastructure/monitoring/systemd-services.md](../docs/infrastructure/monitoring/systemd-services.md) | `content/archive/legacy/docs-old/infrastructure/server_service.md`; `content/archive/legacy/docs-old/infrastructure/service_codes.md` |
| [infrastructure/monitoring/time-diagnostics.md](../docs/infrastructure/monitoring/time-diagnostics.md) | `content/archive/legacy/docs-old/infrastructure/timezone.md` |
| [infrastructure/networking/windows-remote.md](../docs/infrastructure/networking/windows-remote.md) | `content/archive/legacy/docs-old/infrastructure/network-windows.md`; `content/archive/legacy/docs-old/infrastructure/windows/WOL.md` |
| [linux/arch/desktop-input.md](../docs/linux/arch/desktop-input.md) | `content/archive/legacy/Linux/arch-linux/arch-gnome-install.sh`; `content/archive/legacy/Linux/arch-linux/gnome-theme.md`; `content/archive/legacy/Linux/arch-linux/language-ko.md` |
| [linux/shell-startup.md](../docs/linux/shell-startup.md) | `content/archive/legacy/Linux/arch-linux/theme-Catppuccin.md`; `content/archive/legacy/Linux/start-cfg.md`; `content/archive/legacy/OS/linux_startup_exec.md`; `content/archive/legacy/docs-old/infrastructure/env_file_export.md` |
| [nginx/error-pages.md](../docs/nginx/error-pages.md) | `content/archive/legacy/nginx/custom_page.md` |
| [prompts/learning-and-refinement.md](../docs/prompts/learning-and-refinement.md) | `content/archive/legacy/docs-old/databases/database_prompt_recommend.md`; `content/prompts/PROMPT_DESIGN_PROMPT.txt`; `content/prompts/make_questions_consideration.txt` |
| [prompts/project-documentation.md](../docs/prompts/project-documentation.md) | `content/prompts/[spec]project_.md`; `content/prompts/docs-editor-enhanced.md`; `content/prompts/proj-to-doc.md` |
| [prompts/spring-development.md](../docs/prompts/spring-development.md) | `content/prompts/SPRINGBOOT_PROMPT.txt`; `content/prompts/SPRINGBOOT_PROMPT2.txt` |
| [tools/automation/repository-scripts.md](../docs/tools/automation/repository-scripts.md) | `content/archive/legacy/docs-old/development/concat_codes.md`; `content/archive/legacy/docs-old/development/git/gitflow/concat_project.md`; `src/automation/README.md`; `src/automation/backup/rsync_nas_fetch.sh`; `src/automation/deployment/loadbalancing-server-sync.sh`; `src/automation/maintenance/clean-docker.sh`; `src/automation/utilities/project-summary.sh`; `src/automation/utilities/schedule_db.py` |
| [tools/documentation/ai-operations.md](../docs/tools/documentation/ai-operations.md) | `content/docs/javascripts/ai-client.js`; `content/docs/javascripts/ai-config.js`; `content/docs/javascripts/hub-app.js`; `src/automation/site/render-public-ai-config.py`; `src/qa/public-ai-config.test.js` |
| [tools/documentation/architecture.md](../docs/tools/documentation/architecture.md) | `apps/docs-site/hooks/hub_data.py`; `apps/docs-site/hooks/preserve_readme.py`; `apps/docs-site/mkdocs.yml`; `src/automation/site/sync-extra-assets.sh` |
| [tools/documentation/contributing.md](../docs/tools/documentation/contributing.md) | `MIGRATION_MAP.md`; `apps/docs-site/hooks/hub_data.py`; `content/README.md`; `content/prompts/docs-editor-enhanced.md` |
| [tools/documentation/index.md](../docs/tools/documentation/index.md) | `MIGRATION_MAP.md`; `README.md`; `content/README.md` |
| [tools/documentation/local-development.md](../docs/tools/documentation/local-development.md) | `apps/docs-site/docker-compose.docs.yml`; `apps/docs-site/requirements.txt`; `src/package.json`; `src/qa/hub-navigation.test.js`; `src/tools/docs-validator-rs/README.md` |
| [tools/documentation/privacy.md](../docs/tools/documentation/privacy.md) | `content/docs/javascripts/ai-client.js`; `content/docs/javascripts/hub-app.js`; `src/automation/site/sync-extra-assets.sh`; `src/qa/split-view-privacy.test.js` |
| [tools/documentation/publishing-runbook.md](../docs/tools/documentation/publishing-runbook.md) | `.github/workflows/deploy-pages.yml`; `MIGRATION_MAP.md`; `apps/docs-site/hooks/hub_data.py`; `content/archive/legacy/docs-old/development/git/user-page.md`; `src/automation/site/sync-extra-assets.sh` |

### 현행 구현의 구체적인 증거 위치

파일과 함수·설정 키는 직접 `cat`, `sed -n`, `rg -n`으로 읽었다. 다음 줄 번호는 이 작업 시점 기준이며 수정 후에는 symbol로 다시 찾는다. 비공개 값은 기록하지 않는다.

| 파일:줄 | 확인한 symbol·표식 | 문서화한 사실 |
| --- | --- | --- |
| `apps/docs-site/mkdocs.yml:11` | `docs_dir:` | 입력 루트 |
| `apps/docs-site/mkdocs.yml:156` | `extra_javascript:` | 실제로 로드하는 자산 목록 |
| `apps/docs-site/hooks/hub_data.py:72` | `def document_id` | 경로 기반 문서 ID |
| `apps/docs-site/hooks/hub_data.py:212` | `def on_nav` | 기대 집합·nav 주제 |
| `apps/docs-site/hooks/hub_data.py:226` | `def on_page_content` | 본문·description·intent·date 수집 |
| `apps/docs-site/hooks/hub_data.py:285` | `def collect_stacks` | Compose 선언 메타데이터 |
| `apps/docs-site/hooks/hub_data.py:358` | `def on_post_build` | 집합 일치·카탈로그·본문 출력 |
| `apps/docs-site/hooks/preserve_readme.py:9` | `def on_files` | README 별도 출판 예외 |
| `src/automation/site/sync-extra-assets.sh:26` | `rsync -a` | 고정 제외 패턴. 내용 비밀 검사 아님 |
| `src/automation/site/sync-extra-assets.sh:139` | `sync_dir "content/rendered"` | rendered·archive·prompts·notes 공개 복사 경로 |
| `src/automation/site/render-public-ai-config.py:11` | `def read_public_config` | 공개 변수만 읽고 URL·입력 검증 |
| `content/docs/javascripts/hub-app.js:64` | `const SESSION_KEYS` | 현재 셸 저장소 분리 |
| `content/docs/javascripts/hub-app.js:437` | `async function sendAssistant` | 질문·문서 발췌·URL 전송 |
| `content/docs/javascripts/hub-app.js:924` | `'reset-data-confirm':` | 초기화 범위 |
| `content/docs/javascripts/ai-client.js:44` | `async queryKnowledgeBase` | 검색 질의와 timeout·fallback |
| `content/docs/javascripts/ai-client.js:137` | `async sendMessage` | 채팅 요청·stream 파싱 |
| `.github/workflows/deploy-pages.yml:75` | `Generate public AI configuration` | CI 변수 주입 |
| `.github/workflows/deploy-pages.yml:111` | `Copy extra static content` | 별도 정적 자산 단계 |
| `.github/workflows/deploy-pages.yml:185` | `deploy:` | 배포 조건과 job |
| `src/tools/docs-validator-rs/src/main.rs:18` | `struct Cli` | 검사 범위와 옵션 |
| `src/tools/docs-validator-rs/src/lib.rs:746` | `fn collect_markdown_files` | 실제 정렬된 파일 순회 |
| `content/research/proxmox-rocky10-platform/scripts/run_terraform.sh:19` | `terraform apply` | plan 전용이 아닌 apply wrapper |
| `src/automation/maintenance/clean-docker.sh:40` | `docker system prune` | 전체 정리 부작용 |
| `src/automation/utilities/schedule_db.py:6` | `port=` | 실행 불가능한 미완성 연결 표현식 |

## 4. archive 206개 전수 처분

코드: **N** 새 공개 문서로 복구, **P** 기존 공개 주제에 포함, **F** 실행 코드·설정 참고(원본 복제 제외), **A** 산출물·메타데이터·외부 사본, **X** 민감·개인·내부 프로젝트 자료, **T** 기술 문서 범위 밖, **H** 근거 부족·불일치로 공개 절차 승격 보류.

`P`는 byte 단위 중복이나 모든 세부 예제의 복구를 주장하지 않는다. 같은 독자 작업을 이미 설명하는 정본이 있다는 의미다. `X`, `H`에 안내 경로가 있어도 원본 자체의 공개 승인을 뜻하지 않는다.

| N | P | F | A | X | T | H | 합계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 110 | 16 | 14 | 14 | 6 | 8 | 206 |

모든 경로는 `content/archive/legacy/` 기준이다. 이 표에 해당 집합의 일반 파일 206개가 각각 한 번 나타난다.

| 원본 경로 | 분류 | 공개 주제·후속 안내 | 판정 이유 |
| --- | --- | --- | --- |
| `Algorithm/.gitignore` | A | — | 저장소 메타데이터·라이선스 |
| `Algorithm/C-lang/linux/Mutsumi/Mutsumi.h` | F | `algorithms/code-examples.md` | 실행 코드; 새 prose 문서로 복사하지 않음 |
| `Algorithm/C-lang/linux/Mutsumi/saki.c` | F | `algorithms/code-examples.md` | 실행 코드; 새 prose 문서로 복사하지 않음 |
| `Algorithm/LICENSE` | A | — | 저장소 메타데이터·라이선스 |
| `Algorithm/README.md` | P | `algorithms/index.md` | 기존 포인터·OOP·알고리즘 문서의 같은 학습 주제 |
| `Algorithm/function-ptr-comparison.md` | P | `algorithms/function-pointers.md` | 기존 공개 주제로 통합; 문장 단위 동일성을 주장하지 않음 |
| `Algorithm/pointer_delete.md` | P | `algorithms/pointers.md` | 기존 공개 주제로 통합; 문장 단위 동일성을 주장하지 않음 |
| `Algorithm/pointer_usage_with_wrong_examples.md` | P | `algorithms/pointers.md` | 기존 공개 주제로 통합; 문장 단위 동일성을 주장하지 않음 |
| `Algorithm/파이썬 OOP 심층 분석_ 자바_C++ 비교, 타입 체크 및 고급 기법.md` | P | `algorithms/oop-patterns.md` | 기존 공개 주제로 통합; 문장 단위 동일성을 주장하지 않음 |
| `DATABASE/DB-normalization_to_FD.md` | N | `databases/relational-design.md`; `databases/query-io.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/DB-total.md` | N | `databases/relational-design.md`; `databases/transactions.md`; `databases/query-io.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/DB-transaction.md` | N | `databases/transactions.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/DB_IO_operations.md` | N | `databases/query-io.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/grant.md` | N | `databases/sql-basics.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/mariadb.md` | P | `databases/installation.md` | DB 설치 주제 존재; 오래된 단일 실행 예시를 추가하지 않음 |
| `DATABASE/mariadb_time_zone.md` | N | `development/spring-architecture.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `DATABASE/mysql.md` | P | `databases/installation.md` | DB 설치 주제 존재; 오래된 단일 실행 예시를 추가하지 않음 |
| `DATABASE/sql/DCL/DCL.sql` | N | `databases/sql-basics.md` | SQL 분류·조인만 독립 예시로 복구; 원본 개인정보 제외 |
| `DATABASE/sql/DDL/DDL.sql` | N | `databases/sql-basics.md` | SQL 분류·조인만 독립 예시로 복구; 원본 개인정보 제외 |
| `DATABASE/sql/DML/DML.sql` | N | `databases/sql-basics.md` | SQL 분류·조인만 독립 예시로 복구; 원본 개인정보 제외 |
| `DATABASE/sql/TCL/TCL.sql` | N | `databases/sql-basics.md` | SQL 분류·조인만 독립 예시로 복구; 원본 개인정보 제외 |
| `DATABASE/sql/ip_ban_list/banlist.txt` | X | — | 접근 제한 주소 목록; 본문 복구 제외 |
| `DATABASE/개념/JOIN.md` | N | `databases/relational-design.md`; `databases/sql-basics.md` | 공통 개념 복구; 원본 데이터·미확인 수치·제품별 단정 제외 |
| `Dev/Java-concepts.html` | A | `java/core-concepts.md`; `development/spring-architecture.md`; `development/frontend/react-state-and-build.md` | HTML 학습 산출물; 같은 주제의 정본 안내로 연결 |
| `Dev/RTC_concepts.md` | N | `development/realtime.md` | 연결·실패·수명 계약 복구; 미검증 완성 서비스 코드 제외 |
| `Dev/React-concepts.html` | A | `java/core-concepts.md`; `development/spring-architecture.md`; `development/frontend/react-state-and-build.md` | HTML 학습 산출물; 같은 주제의 정본 안내로 연결 |
| `Dev/spring-boot-annotations.html` | A | `java/core-concepts.md`; `development/spring-architecture.md`; `development/frontend/react-state-and-build.md` | HTML 학습 산출물; 같은 주제의 정본 안내로 연결 |
| `Encryption/3. symmetric encryption/1.md` | H | — | 외부 이미지 중심의 짧은 개념 stub; 검증 가능한 독립 운용 절차 없음 |
| `History/EU_REPowerEU.html` | T | — | 기술 문서 범위 밖의 역사·정책 HTML 자료 |
| `Linux/Video-FFmpeg.md` | P | `linux/multimedia/ffmpeg.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/arch-linux/arch-gnome-install.sh` | F | `linux/arch/desktop-input.md` | 설치 코드; 자동 실행하지 않고 개념·진단만 문서화 |
| `Linux/arch-linux/critical-process-died.md` | H | — | 장치별 장애 원인·복구 가설. 해당 장치 증거 없이 일반 복구법으로 승격하지 않음 |
| `Linux/arch-linux/firmware_bios_uefi.md` | P | `linux/arch/installation.md`; `linux/arch/troubleshooting.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/arch-linux/gnome-theme.md` | N | `linux/arch/desktop-input.md` | 설정 책임·진단 절차 복구; 버전 미고정 설치 명령 제외 |
| `Linux/arch-linux/installation.md` | P | `linux/arch/installation.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/arch-linux/kde-theme-old.md` | P | `linux/arch/kde-theme.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/arch-linux/kde-theme.md` | P | `linux/arch/kde-theme.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/arch-linux/language-ko.md` | N | `linux/arch/desktop-input.md` | 설정 책임·진단 절차 복구; 버전 미고정 설치 명령 제외 |
| `Linux/arch-linux/theme-Catppuccin.md` | N | `linux/shell-startup.md` | 설정 책임·진단 절차 복구; 버전 미고정 설치 명령 제외 |
| `Linux/arch-linux/trouble-shooting.md` | P | `linux/arch/troubleshooting.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/ch5_linux_filesystem.md` | P | `linux/filesystem.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/ch6_linux_std.md` | P | `linux/filesystem.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/linux-command.md` | P | `linux/commands.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/proxmox/drivemount.md` | P | `linux/proxmox/drive-mount.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/proxmox/migration.md` | P | `linux/proxmox/migration.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/proxmox/wireguard-vpn.md` | P | `linux/proxmox/wireguard-vpn.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/setting.md` | P | `development/docker/installation.md`; `development/languages/java-install.md` | 현재 공개 주제와 대조; 과거 환경별 세부 명령은 승격하지 않음 |
| `Linux/start-cfg.md` | N | `linux/shell-startup.md` | 설정 책임·진단 절차 복구; 버전 미고정 설치 명령 제외 |
| `OS/OS-정리-fin.odt` | A | — | 오피스·다이어그램 산출물; prose 내용 추출·출판하지 않음 |
| `OS/Understanding fork() System Call and Memory Manage.md` | P | `os/process.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/chapter05-cpu-scheduling.md` | P | `os/cpu-scheduling.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/chapter06-synchronization-tools.md` | P | `os/synchronization.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/chapter08-deadlocks.md` | P | `os/deadlocks.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/chapter09-main-memory.md` | P | `os/memory.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/linux_process_usage.md` | P | `infrastructure/monitoring/process-management.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/linux_startup_exec.md` | N | `linux/shell-startup.md` | 세션 시작 설정과 적용 검증 복구 |
| `OS/os-aq.md` | P | `linux/filesystem.md`; `os/process.md`; `os/synchronization.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/os_pro_purpose.md` | P | `os/index.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/scheduling.md` | P | `os/synchronization.md`; `os/deadlocks.md`; `os/memory.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/video/deadlock1.md` | P | `os/deadlocks.md` | 공개 개념 문서 존재; 보관 문제집 전체 전사 제외 |
| `OS/운영체제-final-정리.odg` | A | — | 오피스·다이어그램 산출물; prose 내용 추출·출판하지 않음 |
| `ObjectDetectionApp/structure-sw.html` | X | — | 별도 프로젝트의 상세 구조·생성 HTML; 구현 증거·공개 범위 미확정 |
| `ObjectDetectionApp/structure-sw.md` | X | — | 별도 프로젝트의 상세 구조·생성 HTML; 구현 증거·공개 범위 미확정 |
| `QnA-MarkDown/emotion_diary/database0420.txt` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/sql_init.sql` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m1_introduce.md` | P | `projects/emotion-diary.md` | 기존 프로젝트 요약으로 연결; 계획을 구현 완료로 쓰지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m2_system_structure.md` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m3_skill_stack.md` | P | `projects/emotion-diary.md` | 기존 프로젝트 요약으로 연결; 계획을 구현 완료로 쓰지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m4_function_summary.md` | P | `projects/emotion-diary.md` | 기존 프로젝트 요약으로 연결; 계획을 구현 완료로 쓰지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m5_team_attribute.md` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m6_schedule_time_line.md` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m7_troubleshooting.md` | P | `projects/emotion-diary.md` | 기존 프로젝트 요약으로 연결; 계획을 구현 완료로 쓰지 않음 |
| `QnA-MarkDown/emotion_diary/ver_1/m8_conclusion.md` | P | `projects/emotion-diary.md` | 기존 프로젝트 요약으로 연결; 계획을 구현 완료로 쓰지 않음 |
| `QnA-MarkDown/emotion_diary/ver_2/add.md` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/emotion_diary/데이터베이스/db001.sql` | X | `projects/emotion-diary.md` | 프로젝트 내부 schema·구조·팀·일정 자료; 공개 요약을 넘어 복제하지 않음 |
| `QnA-MarkDown/trouble_shooting/MCP프로토콜_비교.md` | P | `tools/ai/mcp.md` | MCP·REST 경계의 기존 공개 주제 |
| `QnA-MarkDown/trouble_shooting/프로젝트_일관성-1.md` | N | `development/api-contracts.md` | 명세·타입·provider 검증 계약 복구 |
| `README.md` | A | — | 보관 경로 안내; 현재 탐색 정본 아님 |
| `compiler/CFG/chomsky_form.md` | P | `compiler/parsing/cfg.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/DFA/minimal-DFA.md` | P | `compiler/lexical/dfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/LL_parser/parsing_table_gen.md` | P | `compiler/parsing/ll-parser.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/LR-parsing/LR0.md` | P | `compiler/parsing/lr-parser.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/NFA/NFA.md` | P | `compiler/lexical/nfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/NFA/Regex_to_NFA.md` | P | `compiler/lexical/nfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/NFA_to_DFA/NFA_and_DFA.md` | P | `compiler/lexical/nfa-to-dfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/NFA_to_DFA/NFA_to_DFA.md` | P | `compiler/lexical/nfa-to-dfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/NFA_to_DFA/convert_NFA_DFA.md` | P | `compiler/lexical/nfa-to-dfa.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `compiler/bottom-up-parsing/conceptual.md` | P | `compiler/parsing/bottom-up.md` | 기존 lexer/parser 정본에 해당 개념 존재; 세부 예제 전사 제외 |
| `default/index.html` | A | — | 과거 HTML 페이지·보고서 산출물; 현재 출판 소스 아님 |
| `default/linux.html` | A | — | 과거 HTML 페이지·보고서 산출물; 현재 출판 소스 아님 |
| `default/report-app-rev_2.0.html` | A | — | 과거 HTML 페이지·보고서 산출물; 현재 출판 소스 아님 |
| `default/report-app.html` | A | — | 과거 HTML 페이지·보고서 산출물; 현재 출판 소스 아님 |
| `docs-old/README.md` | A | — | 과거 레이아웃 색인 |
| `docs-old/ai-ml/multimodal-recommendation-system.md` | N | `ai/multimodal-recommendation.md`; `ai/embedding-similarity.md` | 설계 가설과 표현·평가 개념 복구; 원문 수치 제외 |
| `docs-old/ai-ml/nlp-embedding-similarity.html` | A | `ai/embedding-similarity.md` | 외부 글 저장 사본. 원문·코퍼스 재출판 없이 주제를 독립 설명 |
| `docs-old/databases/database_install.md` | P | `databases/installation.md` | 설치 주제 존재 |
| `docs-old/databases/database_prompt_recommend.md` | N | `prompts/learning-and-refinement.md` | 자료 범위·질문·정답 근거의 일반 계약 복구 |
| `docs-old/databases/redis/README.md` | P | `databases/redis/overview.md`; `databases/redis/springboot-integration.md` | 기존 Redis 공개 주제; Dockerfile은 실행 참고 자료 |
| `docs-old/databases/redis/redis.dockerfile` | P | `databases/redis/overview.md`; `databases/redis/springboot-integration.md` | 기존 Redis 공개 주제; Dockerfile은 실행 참고 자료 |
| `docs-old/databases/redis/redis.md` | P | `databases/redis/overview.md`; `databases/redis/springboot-integration.md` | 기존 Redis 공개 주제; Dockerfile은 실행 참고 자료 |
| `docs-old/databases/redis/springboot.md` | P | `databases/redis/overview.md`; `databases/redis/springboot-integration.md` | 기존 Redis 공개 주제; Dockerfile은 실행 참고 자료 |
| `docs-old/databases/springboot-jpa/Bean_life-cycle.md` | P | `databases/jpa/lifecycle.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/IoC_and_DI.md` | N | `development/spring-architecture.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/JPA.md` | P | `databases/jpa/overview.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/MapsId_vs_IdClass.md` | P | `databases/jpa/overview.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/QueryDsl_usage.md` | P | `databases/jpa/querydsl.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/directory_structure.md` | N | `development/spring-architecture.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/join.md` | P | `databases/jpa/relationships.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/springboot_caching_strategy.txt` | N | `development/spring-architecture.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/timestamp.md` | N | `development/spring-architecture.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/databases/springboot-jpa/timezone.md` | N | `development/spring-architecture.md` | 주제·책임·검증 기준으로 통합; 실제 서비스 구현 주장 제외 |
| `docs-old/development/code-server-setup.md` | P | `development/ide/code-server.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/concat_codes.md` | H | `tools/automation/repository-scripts.md` | 과거 소스 병합 자동화·결함 메모. 현재 검증된 명령으로 승격하지 않음 |
| `docs-old/development/docker/docker-install.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/docker-mariadb.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/docker-network.md` | P | `development/docker/networking.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/docker/docker-nginx.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/docker-redis.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/docker-wireguard.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/docker_mount.md` | P | `development/docker/volumes.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/docker/docker명령어.md` | P | `development/docker/commands.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/docker/extends-dir-size.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/how to download docker.md` | P | `development/docker/installation.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/docker/movie-server.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/mydrive/mydrive-docker.yml` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/psitransfer.yml` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/syology_user_key.sh` | F | `development/docker/stack-operations.md` | 보관 실행 코드·Compose. 개인 값·삭제 절차를 새 문서로 복제하지 않음 |
| `docs-old/development/docker/vaultwarden-setting.md` | P | `development/docker/vaultwarden.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/gcc.md` | P | `development/languages/gcc.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/git/branch_manage.md` | P | `development/git/branch-management.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/git/git_clone` | H | — | 짧고 혼합된 구 명령 메모. 지원 버전·완료 근거 없는 독립 런북으로 승격하지 않음 |
| `docs-old/development/git/git_deploy_ssh_key_적용방법.md` | P | `development/git/deployment.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/git/git_nginx_mange.md` | X | `development/git/deployment.md` | 서버별 저장소 운영·상세 배포 구성. 공개 topology 재구성 제외 |
| `docs-old/development/git/git_pull_types.md` | N | `development/git/integration-strategies.md` | 일반 계약 복구; 미확인 확장 API·과거 DNS 주소·운영 식별자 제외 |
| `docs-old/development/git/git_repo.md` | X | `development/git/deployment.md` | 서버별 저장소 운영·상세 배포 구성. 공개 topology 재구성 제외 |
| `docs-old/development/git/git_restore_deletion.md` | P | `development/git/restore-deletion.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/git/gitflow/concat_project.md` | H | `tools/automation/repository-scripts.md` | 과거 소스 병합 자동화·결함 메모. 현재 검증된 명령으로 승격하지 않음 |
| `docs-old/development/git/user-page.md` | N | `tools/documentation/publishing-runbook.md` | 일반 계약 복구; 미확인 확장 API·과거 DNS 주소·운영 식별자 제외 |
| `docs-old/development/java_install.md` | P | `development/languages/java-install.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/tomcat/tomcat, nginx 설치 외.txt` | H | — | 짧고 혼합된 구 명령 메모. 지원 버전·완료 근거 없는 독립 런북으로 승격하지 않음 |
| `docs-old/development/vscode/C++ 세팅.txt` | P | `development/languages/gcc.md`; `development/ide/vscode-plugins.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/vscode/code_server_guide.md` | P | `development/ide/code-server.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/vscode/plugins.md` | P | `development/ide/vscode-plugins.md` | 기존 공개 정본 주제와 대조 |
| `docs-old/development/vscode/project_manager_guide.md` | N | `development/ide/project-workspaces.md` | 일반 계약 복구; 미확인 확장 API·과거 DNS 주소·운영 식별자 제외 |
| `docs-old/infrastructure/Fuse-config.md` | P | `infrastructure/storage/sshfs.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/Prometheus_Loki_Grafana.md` | P | `infrastructure/monitoring/prometheus-grafana-loki.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/disk_format.md` | P | `infrastructure/storage/disk-format.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/env_file_export.md` | N | `linux/shell-startup.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/infrastructure/fdisk_usage.md` | P | `infrastructure/storage/disk-format.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/kafka_haproxy.md` | H | `k8s/kafka/01-concepts-architecture.md`; `infrastructure/proxmox/snapshot-backup-template.md` | 트래픽 failover·복제·독립 백업을 혼동하고 미검증 내구성 수치 포함. 기존 개념으로 안내 |
| `docs-old/infrastructure/linux_email_config.md` | P | `infrastructure/networking/email-config.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/linux_network_setting.md` | P | `infrastructure/networking/network-settings.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/mount.md` | P | `infrastructure/storage/mounting.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/mount_sshfs.md` | P | `infrastructure/storage/sshfs.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/nano_pi_neo3_usage.md` | P | `infrastructure/hardware/nano-pi-neo3.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/network-windows.md` | N | `infrastructure/networking/windows-remote.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/infrastructure/process_bg.md` | P | `infrastructure/monitoring/process-management.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/proxmox_cluster.md` | P | `infrastructure/proxmox/cluster.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/proxmox_cluster_rasp_nano_pi.md` | P | `infrastructure/proxmox/cluster-with-sbc.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/proxmox_email.md` | P | `infrastructure/proxmox/email-alerts.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/rsync_port_usage.md` | P | `infrastructure/networking/rsync.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/rsync_usage.md` | P | `infrastructure/networking/rsync.md` | 기존 공개 운영 주제. 실제 계정·주소·예전 설정은 재게시하지 않음 |
| `docs-old/infrastructure/server_service.md` | N | `infrastructure/monitoring/systemd-services.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/infrastructure/service_codes.md` | N | `infrastructure/monitoring/systemd-services.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/infrastructure/sshfs_configuration/dev_server.md` | X | `infrastructure/storage/sshfs.md` | 개인 호스트 연결·mount topology; 원본 복제 제외 |
| `docs-old/infrastructure/timezone.md` | N | `infrastructure/monitoring/time-diagnostics.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/infrastructure/windows/WOL.md` | N | `infrastructure/networking/windows-remote.md` | 공개 예시·관찰·복구 조건으로 복구 |
| `docs-old/security/ACL.txt` | P | `security/access/user-acl.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/cloudflare/zero_trust.md` | P | `security/zerotrust/cloudflare.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/cloudflare/zero_trust_security.md` | P | `security/zerotrust/cloudflare.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/grant.txt` | P | `security/access/user-acl.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/permission_of_remote_user.md` | P | `security/access/permissions.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/private_key.md` | P | `security/ssh/key-management.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/sshd_config_config.md` | P | `security/ssh/configuration.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/sshd_config_usage_Match.md` | P | `security/ssh/match-rules.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/tailscale-concepts/concept.md` | P | `security/vpn/tailscale.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/tailscale/server-funneling.md` | X | `security/vpn/tailscale.md` | 개인 네트워크와 프록시 연결도; 공개 복구 제외 |
| `docs-old/security/tailscale_usage.md` | P | `security/vpn/tailscale.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/user_ACL_management.md` | P | `security/access/user-acl.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/security/wireguard.md` | P | `security/vpn/wireguard.md` | 같은 공개 보안 주제 존재; 보관본의 환경 식별자 제외 |
| `docs-old/tools/MCP/n8n_usage.md` | P | `tools/ai/mcp.md`; `development/docker/stack-operations.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/changedetectionio_usage.md` | P | `tools/automation/change-detection.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/gemini_shell_call.md` | P | `tools/ai/gemini-shell.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/guacamole_server/guacamole(not_docker).md` | H | `tools/remote/guacamole.md` | 원본이 버전·서비스 경로 불일치를 명시. 직접 설치 절차 승격 제외 |
| `docs-old/tools/guacamole_server/guacamole.md` | P | `tools/remote/guacamole.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/schedule_manager.md` | P | `tools/automation/schedule-manager.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/selenium.md` | P | `tools/automation/selenium.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/tmux_usage.md` | P | `tools/terminal/tmux.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `docs-old/tools/vim_usage.md` | P | `tools/terminal/vim.md` | 기존 공개 주제 존재; 원문별 지원 버전은 재검증 필요 |
| `hardware/ssd/EAGET/index.md` | P | `infrastructure/hardware/ssd-guide.md` | 진단 주제 존재. 과거 제품 구매·NAND 추정치는 복구하지 않음 |
| `hardware/ssd/EAGET/versus_models.md` | P | `infrastructure/hardware/ssd-guide.md` | 진단 주제 존재. 과거 제품 구매·NAND 추정치는 복구하지 않음 |
| `java/자바 메모리 관리, 람다, GC 및 OOP 개념 심층 분석.md` | P | `java/core-concepts.md`; `java/memory-gc.md` | 기존 Java 개념 문서로 연결 |
| `middle-east/integration-docs.md` | T | — | 기술 문서 범위 밖의 강의 전사·정치사 학습 자료 |
| `middle-east/integration-files-en.md` | T | — | 기술 문서 범위 밖의 강의 전사·정치사 학습 자료 |
| `middle-east/integration-files.md` | T | — | 기술 문서 범위 밖의 강의 전사·정치사 학습 자료 |
| `module-study/raspberry-GPIO_usage.md` | N | `infrastructure/hardware/gpio.md` | 보드별 pinout을 재게시하지 않고 안전·검증 경계 복구 |
| `nginx/README.md` | P | `nginx/configuration.md`; `nginx/proxy-manager.md` | 기존 Nginx·프록시 주제 |
| `nginx/concept.md` | P | `nginx/configuration.md`; `nginx/proxy-manager.md` | 기존 Nginx·프록시 주제 |
| `nginx/custom_page.md` | N | `nginx/error-pages.md` | 오류 응답·파일·interception 검증 복구 |
| `nginx/docker-compose.yml` | F | `nginx/proxy-manager.md`; `nginx/configuration.md` | raw 설정 조각; 별도 문서로 복제하지 않음 |
| `nginx/nginx-proxy-manager.txt` | F | `nginx/proxy-manager.md`; `nginx/configuration.md` | raw 설정 조각; 별도 문서로 복제하지 않음 |
| `nginx/server proxypass.txt` | F | `nginx/proxy-manager.md`; `nginx/configuration.md` | raw 설정 조각; 별도 문서로 복제하지 않음 |
| `nobels/LICENSE` | T | — | 창작 초안 작업장과 라이선스; 기술 문서 범위 밖 |
| `nobels/README.md` | T | — | 창작 초안 작업장과 라이선스; 기술 문서 범위 밖 |
| `react/react build and export.md` | N | `development/frontend/react-state-and-build.md` | 상태 소유권·lockfile·산출물 검증 복구 |
| `react/state_manage.md` | N | `development/frontend/react-state-and-build.md` | 상태 소유권·lockfile·산출물 검증 복구 |

## 5. prompts·rendered·notes 전수 분류

### 프롬프트 9개

| `content/prompts/` 파일 | 분류 | 대응 문서 | 이유 |
| --- | --- | --- | --- |
| `DATABASE.txt` | P | `prompts/database.md` | 이미 공개된 DB 교육 템플릿 |
| `PROMPT_DESIGN_PROMPT.txt` | N | `prompts/learning-and-refinement.md` | 반복 개선 계약 |
| `SPRINGBOOT_PROMPT.txt` | N | `prompts/spring-development.md` | 범위·버전·검증을 명시하는 템플릿 |
| `SPRINGBOOT_PROMPT2.txt` | N | `prompts/spring-development.md` | 같은 목적의 변형을 한 공개 정본으로 통합 |
| `[spec]project_.md` | N | `prompts/project-documentation.md` | 근거·범위·검증 계약 |
| `docs-editor-enhanced.md` | P | `prompts/docs-editor.md; tools/documentation/contributing.md` | 같은 편집 주제. 장르 보존 원칙은 기여 안내의 근거 |
| `docs-editor.md` | P | `prompts/docs-editor.md` | 기존 공개 편집 지침 |
| `make_questions_consideration.txt` | N | `prompts/learning-and-refinement.md` | 불완전한 원본을 전사하지 않고 학습 질문 계약 복구 |
| `proj-to-doc.md` | N | `prompts/project-documentation.md` | 원본 context·계층별 검증 요구 |

### 파생 문서 13개

전부 편집·전사 대상에서 제외했다. 프로젝트 요약과 설계 제안은 구현 증거가 아니다.

| `content/rendered/` 파일 | 분류 | 이유 |
| --- | --- | --- |
| `CBT-Req_0621-01.html` | A | CBT Markdown의 HTML 산출물. 공개 요약은 `projects/cbt-system.md` |
| `CBT-Req_0621-01.md` | A | 프로젝트 설계 산출물. DB 혼합·내부 구조를 현재 구현으로 재게시하지 않음 |
| `CBT-flow.html` | A | 흐름도 HTML 산출물 |
| `CBT-flow.md` | A | 별도 프로젝트의 파생 흐름도. 공개 CBT 요약과 중복 |
| `JB-schedule.md` | X | 개별 프로젝트 일정·업무 분해 |
| `aduino-1.md` | X | 별도 하드웨어 프로젝트 상세 설계·미검증 제어 흐름 |
| `algorithmic_thinking_ko.md` | A | 도서 소개·파생 요약. 공개 `books/algorithms/algorithmic-thinking-zingaro.md` 존재 |
| `exam_processor.md` | X | 시험지 처리 제품 제안. 현재 코드 구현 근거 없음 |
| `how_to_solve_it_ko.md` | A | 도서 요약 산출물. 독립적인 현행 기술 런북 원본 아님 |
| `log_ai_project.md` | X | AI 제품 제안 묶음. 현재 서비스 기능으로 승격하지 않음 |
| `markdown-format-analysis-2026-03-11.md` | A | 과거 검사 보고서. 현재 검사 결과로 재사용하지 않음 |
| `mind-diary.html` | A | 별도 API 문서 HTML. 현재 `projects/emotion-diary.md`의 범위를 넘겨 구현 주장하지 않음 |
| `기업조사보고서.md` | X | 개별 기업 조사 메모. 기술 출판 범위 밖 |

### 기존 notes 11개

새 감사 기록은 이 표의 기존 파일 수에 포함하지 않는다.

| `content/notes/` 파일 | 분류 | 이유 |
| --- | --- | --- |
| `cs-reference-learning-paths-before-design.txt` | P | 이전 색인 사본. 현행 `books/cs-reference/index.md`로 연결 |
| `cs-reference-learning-paths.md` | P | 학습 경로 주제는 현행 도서 색인에 존재 |
| `design-release-20260908.md` | A | 과거 변경·릴리스 기록. 새 주제 원본 아님 |
| `documentation-hub-maintenance-before-design.txt` | A | 이전 홈 사본. 현재 정본·새 유지보수 안내와 중복 |
| `documentation-hub-maintenance.md` | N | 기여·정본·학습 경계의 근거; `tools/documentation/`으로 현재 소스에 맞게 복구 |
| `frontend-design-refactor-20260908.md` | A | 과거 프런트엔드 작업 기록 |
| `frontend-preview-rebuild-20260908.md` | A | 과거 프리뷰·검증 기록. 이번 결과와 분리 |
| `ideas/codescapes_plan.md` | X | 미구현 제품 아이디어. 현재 기능 문서로 승격하지 않음 |
| `smartctl-report.md` | X | 실제 장치 상태·식별자·개인 진단 보고서 |
| `smartctl-report.pdf` | X | 같은 장치 진단의 바이너리 산출물 |
| `source-snapshot-comparison-20260908.md` | A | 462개 압축본 비교의 당시 기록. 아래 해석 경계 참조 |

## 6. 연구·infra·src·빌더의 완전한 묶음 분류

다음 묶음은 각 집합 안에서 겹치지 않으며 파일 수의 합이 상위 수와 일치한다. 실제 설정 값·계정이 담긴 파일명과 서비스 배치 전체를 재구성하지 않도록 일부는 glob 단위로 기록한다. glob의 수는 위 재현 순회의 실제 집합으로 확인했다. **F는 현재 운영 성공이 아니라 읽은 코드·설정 근거**다.

### 연구 41개

기준 경로: `content/research/proxmox-rocky10-platform/`. 공개 결과는 `infrastructure/automation/ansible-and-research.md`.

| 상호 배타적 묶음 | 수 | 분류 | 처리 |
| --- | --- | --- | --- |
| 루트 `README.md`, `RESEARCH_SOURCES.md` | 2 | F | 연구 상태·근거 시점 확인. 원문의 전체 서비스 배치는 재게시하지 않음 |
| `terraform/` | 7 | F | 선언·변수·provider·출력·template의 계약. 입력 값과 실제 topology 제외 |
| `scripts/` | 6 | F | apply·inventory 덮어쓰기·배포·비밀 초기화의 부작용 확인. 실행하지 않음 |
| `ansible/ansible.cfg`, `ansible/requirements.yml` | 2 | F | 실행 설정과 의존성 |
| `ansible/group_vars/`, `ansible/inventory/` | 3 | X | 환경별 값과 호스트 목록·예시. 원문 복제 제외 |
| `ansible/playbooks/` | 5 | F | 진입·초기화·배포 단계. 전체 배치 재게시 제외 |
| `ansible/roles/` | 16 | F | task·template 근거. 계정명이 들어간 template 파일명과 값은 기록하지 않음 |

### infra 137개

| 상호 배타적 묶음 | 수 | 분류 | 처리 |
| --- | --- | --- | --- |
| `infra/README.md` | 1 | F | 설정·문서 경계 |
| `infra/ansible/README.md`, `ansible.cfg`, `docs/` | 3 | P/F | 기존 Ansible 안내와 새 자동화 계약으로 통합 |
| `infra/ansible/inventory/` | 3 | X | 실제 환경 목록. 값 재게시 제외 |
| `infra/ansible/playbooks/` | 4 | F | site import 진입점 확인 |
| `infra/ansible/roles/` | 18 | F | 설정·task·handler·template. 현재 적용 상태 아님 |
| `infra/configs/README.md` | 1 | F | 역할 설명 |
| `infra/configs/haproxy/`, `infra/configs/monitoring/` | 2 | X | 환경 설정. 값을 공개 문서에 복사하지 않음 |
| `infra/configs/nginx/*.md` | 2 | X | 과거 Git·서버 운영 기록. 기존 Git 주제 존재, 상세 구성 복제 제외 |
| `infra/docker/README.md`, `LICENSE` | 2 | F/A | 스택 범위·라이선스 |
| `infra/docker/configs/` | 1 | F | 문서 사이트 Compose가 참조하는 serving 설정 |
| `infra/docker/docs/` | 5 | P | 네트워크·Langflow·n8n·DB 주제는 기존 공개 문서와 스택 런북으로 통합 |
| `infra/docker/images/` | 16 | F | 이미지 정의·README. 실제 build 성공 주장 제외 |
| `infra/docker/scripts/` | 1 | F | 설치 보조 코드. 실행하지 않음 |
| `infra/docker/stacks/` 중 `.sourcebot/` 제외 | 71 | F | 서비스별 README·Compose·초기화·예시 설정. 스택 목록과 새 운영 런북으로 안내 |
| `infra/docker/stacks/devtools/sourcebot/.sourcebot/` | 2 | X | 비밀 저장 후보·Redis 상태 산출물. 내용 출력·복제 제외 |
| `infra/docker/templates/` | 4 | F | 스택 template과 예시 환경. 실행 값 아님 |
| `infra/docker/tests/` | 1 | F | 기존 검사 코드. 이번 작업에서 전체 스택을 실행하지 않음 |

### src 351개

| 상호 배타적 묶음 | 수 | 분류 | 처리 |
| --- | --- | --- | --- |
| `src/` 바로 아래 README·package 파일·screenshot 진입점 | 5 | F | 로컬 개발·QA 안내의 근거 |
| `src/automation/` | 21 | F | README와 모든 script 경로를 열거. 대표 실행문·parser·기본값을 읽고 자동화 경계 문서 작성 |
| `src/examples/` 바로 아래 README·review·LICENSE | 3 | F/A | 학습 목록·과거 리뷰·라이선스. 리뷰의 완성도 주장을 현재 결과로 재사용하지 않음 |
| `src/examples/architect-code/` 중 `docs/` 제외 | 202 | F | 풀이 200개·README·workflow. 모든 풀이의 테스트 성공을 주장하지 않음 |
| `src/examples/architect-code/docs/` | 5 | A | 별도 시각화 HTML·JS·CSS·데이터 산출물 |
| `src/examples/data-structures/` | 11 | F | BST 코드·언어별 README. 실행 계약 안내로 연결 |
| `src/examples/simulator/` | 24 | F | 주제별 구현·웹 UI·fixture. 지원 표와 실제 경로 구분 |
| `src/examples/templates/` | 51 | P/F | 알고리즘 Markdown 반복본과 변환 도구. 기존 공개 algorithm-architect 주제에 대응 |
| `src/examples/theory/` | 2 | N | 편집 거리·비트셋 DP를 각각 공개 문서로 복구 |
| `src/examples/competitive-programming/` | 4 | F | 표준 입력 계약과 독립 컴파일 경계 |
| `src/examples/c-lang/` | 2 | F | C 실행 예제; 별도 prose 복제 제외 |
| `src/examples/algorithmic-thinking/` | 1 | F | 문제 풀이 코드; 구현 목록으로 분류 |
| `src/examples/leetcode/` | 2 | A | 에디터 문제 목록 메타데이터 |
| `src/mcp/` 일반 파일 | 3 | X | 로컬 도구 실행 설정·runner. 환경·경로를 새 문서에 복제하지 않음 |
| `src/qa/` | 9 | F | 현재 문서·탐색·공개 설정·privacy 검사 근거 |
| `src/tools/` | 6 | F | Rust CLI·README·테스트·잠금 파일. 검사 범위 문서화 |

### docs-site 21개와 CI 1개

| `apps/docs-site/` 묶음 | 수 | 분류 | 처리 |
| --- | --- | --- | --- |
| 루트 config·Compose·requirements | 3 | F | 입력·출력·의존성 |
| `assets/` | 10 | A/F | 참조 사본. 실제 로드 목록과 구분 |
| `hooks/` | 4 | F | 본문·카탈로그·README 경로와 기존 테스트 |
| `overrides/` | 3 | F | 현재 셸·오류 페이지·robots 입력 |
| `scripts/` | 1 | F | 정본으로 인자를 전달하는 wrapper |

CI는 `.github/workflows/deploy-pages.yml` 1개다. 빌드·테스트·공개 변수 주입·extra 동기화·산출물 업로드·조건부 배포를 확인했다. 실제 호스팅 환경 변수·secret·DNS·원격 상태는 조회하지 않았다.

## 7. 마이그레이션·스냅샷 주장 경계

`MIGRATION_MAP.md`는 옛 경로와 현 경로를 대조하는 근거이며 실제 내용의 공개 적합성을 보증하지 않는다. 같은 `docs_dir` 상대 경로는 문서 route를 유지할 수 있고, 파일 자체 이동은 nav·링크·경로 기반 문서 ID에 영향을 준다.

`content/notes/source-snapshot-comparison-20260908.md:3`은 당시 압축본 462개를 비교해 동일 440·변경 22·누락 0이라고 기록한다. **이것은 이번의 1,084개 전체 집합과 다른 모집단**이다. 이번 작업은 해당 압축본을 다시 읽거나 새로 해시 비교하지 않았다. 따라서 그 기록을 오늘의 모든 원본 복구·동일성·백업 완전성 증거로 쓰지 않는다.

source/archive/prompts/research와 infra/src README의 역할을 대조할 때에는 다음 읽기 명령을 사용했다. 검색 결과는 원문 내용을 읽는 출발점이며 자동 분류의 최종 근거는 아니다.

```bash
rg --files --hidden --no-ignore content/archive content/rendered content/prompts content/research
rg --files --hidden --no-ignore infra src -g '*.md' -g '!**/node_modules/**' -g '!**/target/**'
rg -n 'docs_dir|site_dir|hooks|extra_javascript|nav' apps/docs-site/mkdocs.yml
rg -n 'sync_dir|sync_file|exclude' src/automation/site/sync-extra-assets.sh
```

## 8. 검증 기록

| 범위 | 수행 주체 | 결과 |
| --- | --- | --- |
| 새 공개 문서 35개 | 문서 담당 | 기존 Rust validator의 `--check all`: 35개 통과, 문서 링크 60개·Mermaid 1개·형식 검사 통과 |
| 이 감사 기록 | 문서 담당 | 기존 Rust validator의 `--check all`: 링크 35개·형식 검사 통과. 반복 명령의 집합별 digest 10개 모두 표와 일치 |
| nav와 공개 문서 집합 | 문서 담당 | Markdown 300개, 직접 nav 215개, 색인 경유 85개, 존재하지 않는 nav 대상 0개, 신규 문서의 nav 누락 0개 |
| nav diff 공백 검사 | 문서 담당 | `git diff --check -- apps/docs-site/mkdocs.yml` 통과. Git 상태 변경 없음 |
| 코드 예제 실행 확인 | 문서 담당 | `src/examples/architect-code/python/p001_two_sum.py`의 기존 assertion 5개 통과. 다른 모든 예제의 실행 성공으로 일반화하지 않음 |
| 이 감사 기록의 제한된 민감 정보 검사 | 문서 담당 | 계정·사설 식별 문자열, IPv4, 비밀 키 표식, credential literal 패턴 탐지 0건. 원본 전체의 비밀 부재를 뜻하지 않음 |
| 위 반복 명령 실행 | 문서 담당 | 최종 1121개, 공개 Markdown 300개, `content/source` 부재 확인. 집합별 경로 digest가 위 표와 일치 |
| 공개 문서 전체 | 통합 담당이 결과 전달 | 격리 출력 경로의 strict build 통과. 300개 문서·Mermaid 1464개·링크 746개 validator 통과 |
| 기존 검사 | 통합 담당이 결과 전달 | Rust validator 18개, hook 6개, 공개 설정 3개, Node QA 43개 통과 |
| 새 공개 문서의 민감 정보 검사 | 통합 담당이 결과 전달 | 새 35개 문서의 PII·credential 패턴 탐지 0건 |
| 통합 UI | 통합 담당이 결과 전달 | 20개 화면·3개 viewport·20개 기능 흐름 QA 통과. 별도 앱 구현·검증은 문서 담당 변경 범위 밖 |

통합 결과는 담당자가 전달한 실행 결과로 기록했고 동일한 전체 검사를 반복하지 않았다. 본 작업에서 배포·인프라 적용·원격 호출·Git stage/commit/push/branch/PR은 수행하지 않았다. 패턴 검사만으로 민감 정보가 전혀 없다고 보증하지 않는다.

## 9. 가정·잔여 공백

- N/P 분류의 단위는 독립 주제와 독자 작업이다. 원본의 모든 질문·예시·변형을 개별 새 페이지로 만드는 요청으로 해석하지 않았다. 연결 대상과 제외 이유를 각 행에 공개했다.
- H 8개는 미해결 증거 공백이다. 해당 장치·설치 버전·수정된 코드·출처가 확보되면 다시 심사한다. `critical-process-died`, 외부 이미지 stub, Kafka/HAProxy 백업 혼동, 소스 병합 메모 2개, 짧은 clone/Tomcat 메모 2개, 비 Docker Guacamole 설치가 해당한다.
- X/T/A 자료는 내용 부재가 아니라 공개 범위·정본 역할·근거 수준에 따른 의도적 제외다. 별도 프로젝트의 전체 내부 topology와 개인·팀·장치 정보를 새 문서에서 복원하지 않았다.
- **기존 raw 공개 경계는 별도 잔여 위험이다.** 현재 `sync-extra-assets.sh`는 archive·rendered·notes·prompts 등도 복사한다. 이 감사의 제외 표는 스크립트의 allowlist가 아니며, 기존 자료가 공개 안전하다는 인증도 아니다. 본 작업은 script·hook 변경과 raw 전체 정제를 수행하지 않았다. 전체 배포 전 산출물 검토는 통합 담당 범위다.
- AI의 fallback endpoint, Notebook 요청에 문서 발췌가 포함되는 동작, 전체 채팅 timeout 부재를 소스로 확인하고 운영 문서에 적었다. 외부 서비스의 CORS·모델·보존·과금·취소 보장은 검증하지 않았다.
- Compose·Terraform·Ansible·systemd·DB·하드웨어·Windows 명령은 실제 인프라에 적용하지 않았다. 문서의 성공 기준은 해야 할 검사이며 완료된 배포·복원 결과가 아니다.
- 외부 링크의 현재 응답과 보관본의 모든 버전별 문법을 검증하지 않았다. 권한이 불명확한 외부 HTML·강의·도서 내용은 전문 복사하지 않았다.
- 동시 작업자가 있으므로 파일 수와 증거 위치는 위 모집단·시점에만 적용된다. 이후 변경은 재현 명령과 새 분류로 갱신한다.
