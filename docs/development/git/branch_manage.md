# GitHub 원격 저장소와 로컬 브랜치 이름 불일치 해결 방법

GitHub에서 로컬 브랜치와 원격 브랜치의 이름이 일치하지 않으면 push할 때마다 새로운 브랜치가 생성되는 문제가 발생할 수 있습니다. 이 문제를 해결하고 일관성을 유지하기 위한 여러 방법을 알아보겠습니다.

## 업스트림 브랜치 설정하기

로컬 브랜치와 원격 브랜치를 명시적으로 연결하면 이름이 달라도 올바른 위치로 push할 수 있습니다.

### 기존 브랜치 연결하기

```bash
git branch --set-upstream-to=origin/원격브랜치명 로컬브랜치명
```

예를 들어, 로컬 브랜치 이름이 'feature'이고 원격 브랜치 이름이 'new-feature'인 경우:

```bash
git branch --set-upstream-to=origin/new-feature feature
```

이 명령어를 실행하면 로컬 브랜치 'feature'가 원격 브랜치 'new-feature'를 추적하게 됩니다[8].

## 브랜치 이름 일치시키기

문제의 근본 원인인 이름 불일치를 해결하는 방법입니다.

### 로컬 브랜치 이름 변경하기

```bash
git branch -m 기존브랜치명 바꿀이름
```

원격 브랜치와 동일한 이름으로 변경하여 일관성을 유지할 수 있습니다[10].

## 명시적 Push 방법 사용하기

매번 push할 때 명시적으로 원격 브랜치를 지정할 수 있습니다.

```bash
git push origin 로컬브랜치명:원격브랜치명
```

이 방법은 한 번만 사용하는 경우에 적합하며, 매번 긴 명령어를 입력해야 하는 단점이 있습니다[10].

## Git 설정 변경하기

### 자동 업스트림 설정 활성화 (Git 2.37 이상)

```bash
git config --global push.autoSetupRemote true
```

이 설정을 활성화하면 처음 push할 때 자동으로 upstream 브랜치를 설정해줍니다. 이후부터는 단순히 `git push`만 실행해도 올바른 원격 브랜치로 push됩니다[6].

### push.default 설정 변경하기

```bash
git config --global push.default current
```

이 설정은 로컬 브랜치 이름과 일치하는 원격 브랜치로 push하도록 합니다[20].

## 첫 Push시 업스트림 설정하기

처음 원격 저장소에 push할 때 -u 옵션을 사용하면 이후 push는 간단해집니다.

```bash
git push -u origin 원격브랜치명
```

이 명령어는 현재 로컬 브랜치를 원격 브랜치와 연결하고 push합니다. 이후부터는 간단히 `git push`만 실행하면 됩니다[19].

## branch.autoSetupMerge 설정하기

새 브랜치를 만들 때 자동으로 추적 관계를 설정하도록 구성할 수 있습니다.

```bash
git config --global branch.autoSetupMerge always
```

이 설정을 활성화하면 `git checkout -b` 또는 `git switch -c`로 새 브랜치를 만들 때 자동으로 추적 관계가 설정됩니다[20].

## 결론

원격 브랜치와 로컬 브랜치의 이름 불일치 문제는 위의 방법들을 통해 해결할 수 있습니다. 가장 권장되는 방법은:

1. 브랜치 이름을 일치시키거나
2. 업스트림 브랜치를 명시적으로 설정하거나
3. Git 2.37 이상을 사용 중이라면 `push.autoSetupRemote true` 설정을 활성화하는 것입니다
