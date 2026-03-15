# ADR-001: 저장소 레이아웃 재편

- **상태**: Accepted
- **날짜**: 2026-03-15
- **결정자**: nodove

## 맥락

저장소는 MkDocs 기반 문서 허브로 시작했으나, 시간이 지나며 출판용 문서, 렌더 파생 산출물, 실행 가능한 인프라 설정, 개발 코드, 자동화 스크립트가 루트에 혼재하게 됐습니다.

**확인된 문제**:

1. `docs/` 안에 MkDocs 콘텐츠와 JS/CSS 자산이 함께 존재 — 테마 코드와 콘텐츠가 구분되지 않음
2. `docker/`, `configs/`, `ansible/`이 문서 옆에 배치 — 배포 자산과 문서 자산의 경계 없음
3. `code/`, `scripts/`, `tools/`가 루트에 분산 — 실행 코드의 소유권 불명확
4. `project-docs/`, `legacy/`, `prompt/`, `memo/`, `research/`가 독립적으로 분산 — 문서의 편집 권한 규칙 없음
5. `site/`가 루트에 빌드 산출물로 존재 — gitignore는 했지만 명시적 dist 경계 없음

## 결정

루트를 **5개 최상위 도메인**으로 재편합니다:

```
apps/     — 실행 가능한 애플리케이션 (MkDocs 사이트 빌더)
content/  — 사람이 읽는 모든 문서
infra/    — 배포 및 운영 설정
src/      — 실행 가능한 코드와 스크립트
dist/     — 빌드 산출물 (gitignore 대상)
```

### 세부 매핑

`content/` 내부는 편집 권한으로 추가 분류합니다:

| 하위 경로 | 편집 권한 | 설명 |
|-----------|-----------|------|
| `content/docs/` | 자유 편집 | MkDocs 출판 소스 |
| `content/rendered/` | 원본만 수정 | 파생 산출물 |
| `content/archive/legacy/` | 편집 금지 | 보관 전용 |
| `content/prompts/` | 자유 편집 | AI 프롬프트 |
| `content/notes/` | 자유 편집 | 개인 메모 |
| `content/research/` | 자유 편집 | 리서치 문서 |

## 고려된 대안

### A. 기존 구조 유지 + README 보강
- 장점: 이동 비용 없음
- 단점: 근본적인 탐색 비용과 소유권 불명확 문제 해결 안됨
- **기각**

### B. 전면 일괄 이동 (모든 파일 즉시 이동)
- 장점: 구 경로 즉시 제거
- 단점: CI, 내부 링크, 스크립트가 한꺼번에 파손될 위험
- **기각** — 단계적 전환 채택

### C. 채택안: 복사 후 구 경로 단계적 제거
- 1단계: 새 위치로 복사 + 설정 파일 경로 업데이트
- 2단계: 빌드 검증
- 3단계: 구 경로 제거

## 결과

### 긍정적

- **소유권 명확화**: 파일 위치만으로 아티팩트 성격 파악 가능
- **CI 경로 의미 강화**: `apps/docs-site/`, `src/tools/`, `content/docs/`가 목적을 드러냄
- **빌드 격리**: `dist/site/`가 빌드 산출물 경계를 명시
- **컨트리뷰션 가이드 단순화**: "새 문서 → `content/docs/`", "새 스크립트 → `src/automation/`"

### 부정적

- **초기 이동 비용**: 수백 개 파일 복사, CI/mkdocs.yml/스크립트 경로 수정
- **외부 링크 파손 위험**: GitHub Raw URL, 직접 파일 링크 등이 영향 받을 수 있음
- **학습 곡선**: 기존 기여자가 새 구조에 적응 필요

## 검증 기준

- [ ] `cd apps/docs-site && mkdocs build --clean` 성공
- [ ] CI `deploy-pages.yml` 로컬 경로 검증 통과
- [ ] `src/automation/site/sync-extra-assets.sh` 정상 실행
- [ ] `cargo test --manifest-path src/tools/docs-validator-rs/Cargo.toml` 통과
