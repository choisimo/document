# Git 삭제 취소 및 빈 브랜치 생성 방법

## 복구 전 상태 가드

먼저 삭제가 작업 트리만의 변경인지, index에 staged됐는지, 이미 커밋·공유됐는지 구분한다. `<path>`, `<deletion_commit>`, `<new_branch>` 자리표시자를 실제 식별자로 치환하고 `git status`와 대상 commit을 확인한 뒤 해당 경우의 명령 하나만 실행한다. `git reset --hard`와 `git rm -rf .`는 미커밋 작업을 제거할 수 있으므로 백업 또는 commit·stash가 확인되지 않으면 실행하지 않는다. 공유 이력은 강제 reset보다 복구 내용을 새 commit으로 남기는 방식을 우선한다.

## Git 삭제 취소하는 방법

Git에서 실수로 파일을 삭제했을 때 복구하는 방법은 삭제 상황에 따라 다릅니다.

### 1. 작업 디렉토리와 스테이징 영역에서 모두 삭제된 경우 (`git rm `)

파일이 작업 디렉토리와 스테이징 영역 모두에서 삭제되었지만 아직 커밋하지 않은 경우:

```bash
# 상태 확인
git status

# HEAD에서 파일 복원
git checkout HEAD -- <path>
```

또는 간단히:
```bash
git restore --source=HEAD --staged --worktree <path>
```

### 2. 스테이징 영역에서만 삭제된 경우 (`git rm --cached `)

파일이 작업 디렉토리에는 남아있지만 스테이징 영역에서만 삭제된 경우:

```bash
# 파일을 다시 스테이징 영역에 추가
git add <path>
```

### 3. 이미 커밋한 경우

삭제를 이미 커밋한 경우에는 다음 방법을 사용할 수 있습니다:

```bash
# 삭제 커밋을 되돌리는 새 커밋 생성
git revert <deletion_commit>

# 또는 삭제 전 커밋으로 강제 리셋 (원격 저장소에 푸시하지 않은 경우만)
git reset --hard <commit>
```

### 4. 삭제된 지 오래된 파일 복구

파일이 언제 삭제되었는지 모를 경우:

```bash
# 삭제된 파일 찾기
git log --diff-filter=D --summary -- path/to/file.ts

# 찾은 커밋 해시를 사용하여 파일 복원
git restore --source=<deletion_commit>^ --worktree -- path/to/file.ts
```

## 빈 브랜치 생성 방법

완전히 새로운 히스토리를 가진 빈 브랜치(다른 타입의 내용을 저장하기 위한)를 생성하는 방법:

### 1. 고아 브랜치(Orphan Branch) 생성

고아 브랜치는 기존 히스토리와 전혀 관련이 없는 완전히 새로운 브랜치입니다:

```bash
# 새 고아 브랜치 생성
git checkout --orphan <new_branch>
```

### 2. 작업 디렉토리 정리

고아 브랜치를 생성하면 기존 파일들이 작업 디렉토리에 남아있으므로 이를 제거해야 합니다:

```bash
# 모든 파일 제거
git rm -rf .
```

### 3. 새 파일 추가 및 커밋

이제 완전히 빈 상태에서 새로운 파일을 추가하고 커밋할 수 있습니다:

```bash
# 새 파일 추가
touch README.md
git add README.md

# 첫 커밋 생성
git commit -m "Initial commit on orphan branch"
```

### 4. 원격 저장소에 푸시

새 브랜치를 원격 저장소에 푸시합니다:

```bash
git push -u origin <new_branch>
```

### 고아 브랜치 사용 시 고려사항

1. 고아 브랜치는 기존 브랜치와 히스토리를 공유하지 않으므로 일반적인 병합이 복잡해질 수 있습니다[7].
2. 필요한 경우 `--allow-unrelated-histories` 옵션을 사용하여 관련 없는 히스토리를 가진 브랜치를 병합할 수 있습니다[4][7].
   ```bash
   git merge <branch> --allow-unrelated-histories
   ```
3. 이 방식은 완전히 다른 타입의 프로젝트를 동일한 저장소에서 관리할 때 유용합니다[4][6].

