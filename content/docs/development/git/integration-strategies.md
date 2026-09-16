---
title: Git 이력 통합 정책 읽기
description: merge·rebase·fast-forward 정책의 결과를 구분하고 읽기 전용 명령으로 현재 설정 출처를 확인합니다.
---

# Git 이력 통합 정책 읽기

보관된 pull 설정 메모의 핵심은 서로 다른 정책을 연속된 설정 단계처럼 실행하지 않는 것이다. 이 페이지는 정책을 설명하며 Git 이력을 변경하는 명령을 실행하지 않는다.

| 정책 | 이력이 갈라졌을 때의 의미 | 확인할 영향 |
| --- | --- | --- |
| Merge | 두 이력을 병합한 결과를 표현 | 병합 결과와 충돌 해결의 정확성 |
| Rebase | 로컬 변경을 다른 기준 위에 다시 적용 | 재작성되는 commit ID와 이미 공유한 이력 |
| Fast-forward only | 현재 tip을 그대로 전진할 수 없으면 거부 | 거부를 데이터 손실이나 통합 완료로 오해하지 않음 |

`pull.rebase`와 `pull.ff`는 저장소·전역·시스템 설정과 명령 옵션의 영향을 받는다. 설정값 하나만 보고 실제 동작을 추정하지 않는다. 특히 공유된 이력 재작성은 다른 소비자에게 영향을 준다.

## 읽기 전용 확인

```bash
git status --short
git config --show-origin --get pull.rebase
git config --show-origin --get pull.ff
git log --oneline --graph -n 15
```

설정이 없으면 `git config --get`은 값을 출력하지 않고 0이 아닌 상태로 끝날 수 있다. 이를 저장소 손상으로 판단하지 않는다. 출력의 원격 경로·계정·개인 메시지는 공개 기록에서 제외한다.

통합 정책을 적용하는 별도 작업에서는 변경 전 tip, 작업 트리 상태, 기준 이력과 충돌 해결 결과를 기록한다. 자동으로 merge·rebase를 선택하거나 실패 뒤 강제 갱신을 이어 붙이지 않는다. 현재 작업의 권한이 읽기 전용이면 설정 변경도 하지 않는다.

근거: `content/archive/legacy/docs-old/development/git/git_pull_types.md`의 설정 범위와 세 정책; 관련 문서 [브랜치 연결](branch-management.md), [삭제 복구](restore-deletion.md).
