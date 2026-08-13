# Git 삭제 취소 및 빈 브랜치 생성 방법

## 적용 범위와 복구 기준

- **범위:** 삭제가 working tree, index, commit, remote 중 어디에 반영됐는지와 Git 버전, 현재 `HEAD`, reflog·garbage-collection 상태를 먼저 확인합니다.
- **안전 전제:** untracked 파일과 미커밋 변경을 별도로 보존하고, restore 대상 tree와 path를 확인하기 전 파괴적 명령을 실행하지 않습니다.
- **사실과 추론:** orphan branch는 첫 commit에 parent가 없는 새 history를 만들 수 있지만 repository의 object database와 reflog까지 물리적으로 분리하는 것은 아닙니다.
- **실패·완료:** 예상 밖 파일 삭제, 잘못된 commit 복원과 remote history 불일치를 실패로 봅니다. file 내용·index·commit parent·remote ref가 의도한 상태인지 확인해야 완료입니다.

---

## Git 삭제 취소하는 방법

Git에서 실수로 파일을 삭제했을 때 복구하는 방법은 삭제 상황에 따라 다릅니다.

### 1. 작업 디렉토리와 스테이징 영역에서 모두 삭제된 경우 (`git rm `)

파일이 작업 디렉토리와 스테이징 영역 모두에서 삭제되었지만 아직 커밋하지 않은 경우:

```bash
# 상태 확인
git status

# HEAD에서 파일 복원
git checkout HEAD -- 
```

또는 간단히:
```bash
git restore --source=HEAD --staged --worktree 
```

### 2. 스테이징 영역에서만 삭제된 경우 (`git rm --cached `)

파일이 작업 디렉토리에는 남아있지만 스테이징 영역에서만 삭제된 경우:

```bash
# 파일을 다시 스테이징 영역에 추가
git add 
```

### 3. 이미 커밋한 경우

삭제를 이미 커밋한 경우에는 다음 방법을 사용할 수 있습니다:

```bash
# 삭제 커밋을 되돌리는 새 커밋 생성
git revert 

# 또는 삭제 전 커밋으로 강제 리셋 (원격 저장소에 푸시하지 않은 경우만)
git reset --hard 
```

### 4. 삭제된 지 오래된 파일 복구

파일이 언제 삭제되었는지 모를 경우:

```bash
# 삭제된 파일 찾기
git log --diff-filter=D --summary -- path/to/file.ts

# 찾은 커밋 해시를 사용하여 파일 복원
git restore --source=~1 --worktree -- path/to/file.ts
```

## 빈 브랜치 생성 방법

첫 commit에 기존 parent가 없는 orphan branch를 만드는 방법입니다. 생성 직후 working tree가 자동으로 비어 있다는 뜻은 아닙니다:

### 1. 고아 브랜치(Orphan Branch) 생성

orphan branch의 첫 commit은 기존 commit을 parent로 갖지 않지만 같은 repository의 object database와 reflog 안에서 작업합니다:

```bash
# 새 고아 브랜치 생성
git checkout --orphan 
```

### 2. 작업 디렉토리 정리

고아 브랜치를 생성하면 기존 파일들이 작업 디렉토리에 남아있으므로 이를 제거해야 합니다:

```bash
# 모든 파일 제거
git rm -rf .
```

### 3. 새 파일 추가 및 커밋

기존 tracked 파일을 의도대로 제거했는지 확인한 뒤 새 root commit에 포함할 파일을 추가합니다:

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
git push -u origin 
```

### 고아 브랜치 사용 시 고려사항

1. 고아 브랜치는 기존 브랜치와 히스토리를 공유하지 않으므로 일반적인 병합이 복잡해질 수 있습니다[7].
2. 필요한 경우 `--allow-unrelated-histories` 옵션을 사용하여 관련 없는 히스토리를 가진 브랜치를 병합할 수 있습니다[4][7].
   ```bash
   git merge  --allow-unrelated-histories
   ```
3. 별도 history가 필요한 콘텐츠에 사용할 수 있지만 repository 권한·용량·CI가 공유된다는 trade-off를 별도 repository와 비교합니다[4][6].

