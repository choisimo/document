# src/

소스코드, 자동화 스크립트, 개발 도구 후보를 모은 디렉터리입니다. 아래 트리와 명령은 현재 revision의 경로·의존성·실행 성공을 보장하지 않으므로 대상 파일과 하위 README를 먼저 확인합니다.

> 자동화·스크린샷·동기화 명령은 파일 생성, 외부 요청 또는 덮어쓰기를 수행할 수 있습니다. 입력·출력 경로와 환경 변수를 검토하고 제한된 대상으로 시작하며, exit code와 예상 산출물을 별도로 확인합니다.

> **규칙**: 이 디렉터리에는 코드와 스크립트만 둡니다.  
> 설명 문서(`.md`)는 각 하위 디렉터리 README에 최소화하거나 `content/docs/`를 참조하세요.

## 디렉터리 구조

```
src/
├── examples/       # 알고리즘, 자료구조 구현 코드 (Python, Java, JS, Rust, C)
│   ├── architect-code/      # 알고리즘 100제 (Python)
│   ├── data-structures/     # BST, 힙, 해시테이블 구현
│   ├── simulator/           # 자료구조 인터랙티브 시뮬레이터
│   ├── templates/           # 알고리즘 템플릿 문서
│   └── c-lang/              # C 언어 예제
├── automation/     # 배포, 백업, 유틸리티 셸/파이썬 스크립트
│   ├── backup/             # rsync 백업
│   ├── deployment/         # 배포 자동화
│   ├── maintenance/        # 시스템 유지보수
│   ├── site/               # 문서 사이트 빌드 보조 스크립트
│   └── utilities/          # 범용 유틸리티
├── tools/          # 개발 도구 (Rust CLI 등)
│   └── docs-validator-rs/  # Mermaid/링크/포맷 검증기 (Rust)
├── screenshot-pages.js     # Playwright 페이지 스크린샷
├── screenshot-retry.js     # 스크린샷 재시도 유틸리티
└── package.json            # Node.js 의존성
```

## 주요 명령

```bash
# 알고리즘 코드 실행 (Python)
python src/examples/architect-code/python/p001_two_sum.py

# 문서 유효성 검사
cargo run --manifest-path src/tools/docs-validator-rs/Cargo.toml

# 스크린샷 생성
node src/screenshot-pages.js

# 빌드 후 extra 자산 동기화
bash src/automation/site/sync-extra-assets.sh
```
