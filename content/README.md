# content/

사람이 읽는 모든 문서 자산 모음입니다.

## 디렉터리 역할과 판정 기준

`content/`는 문서의 상태에 따라 출판 정본, 파생 산출물, 보관 자료를 분리한다. 새 내용은 목적에 맞는 하위 경로에 작성하고, `rendered` 자료는 생성 원본에서 갱신하며 직접 편집하지 않는다. `archive/legacy` 자료는 과거 기록과 학습 참고용이므로 현재 동작을 주장할 때는 제품·언어 버전과 실행 근거를 추가한다.

## 디렉터리 구조

```
content/
├── docs/           # 정식 문서 (MkDocs로 출판)
│   ├── ai/
│   ├── algorithms/
│   ├── books/
│   ├── compiler/
│   ├── databases/
│   ├── development/
│   ├── extra/
│   ├── infrastructure/
│   ├── java/
│   ├── k8s/            # Kubernetes/Ansible/Kafka 학습 가이드
│   ├── linux/
│   ├── linux-extra/    # 심화 Linux 문서
│   ├── nginx/
│   ├── os/
│   ├── projects/
│   ├── prompts/
│   ├── proxmox/        # Proxmox VE 상세 가이드
│   ├── security/
│   └── tools/
├── rendered/       # 프로젝트 산출물 문서 (코드/원본에서 파생, 직접 편집 금지)
│   ├── CBT-*.md/html   # CBT 시스템 요구사항/흐름도
│   └── *.md/html/pdf   # 기타 프로젝트 문서
├── archive/        # 보관용 구버전 문서 (편집 금지)
│   └── legacy/
├── prompts/        # AI 프롬프트 템플릿, 시스템 프롬프트
├── notes/          # 개인 메모, 아이디어 초안
│   └── ideas/
└── research/       # 기술 리서치 문서
    └── proxmox-rocky10-platform/
```

## 규칙

| 디렉터리 | 편집 권한 | 설명 |
|----------|-----------|------|
| `docs/` | ✅ 자유 편집 | MkDocs 출판 대상, PR 리뷰 권장 |
| `rendered/` | ⚠️ 원본만 수정 | 생성 파이프라인 결과물 |
| `archive/legacy/` | ❌ 편집 금지 | 참조 전용 보관소 |
| `prompts/` | ✅ 자유 편집 | AI 프롬프트 |
| `notes/` | ✅ 자유 편집 | 개인 메모 |
| `research/` | ✅ 자유 편집 | 리서치 문서 |

## MkDocs 빌드

문서 사이트 빌드는 `apps/docs-site/`에서 수행합니다:

```bash
cd apps/docs-site
mkdocs build
# 또는
docker compose -f docker-compose.docs.yml up docs
```

출판 결과물은 `dist/site/`에 생성됩니다.
