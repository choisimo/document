# GNU Stow

GNU Stow는 디렉터리 안에 모아 둔 설정 파일을 대상 위치에 심볼릭 링크로 배치하는 도구다. dotfiles 저장소를 만들 때 특히 유용하다. 핵심은 파일을 복사하지 않고 링크로 연결해 Git 저장소의 파일이 실제 설정 파일처럼 보이게 만드는 것이다.

## 적용 범위와 안전 기준

- **범위:** GNU Stow version, stow directory, target directory, shell expansion, filesystem와 existing symlink·file 상태를 기록합니다. 다른 symlink manager의 semantics와 혼용하지 않습니다.
- **전제:** package tree와 target의 상대 경로를 먼저 계산하고 기존 dotfile, secret, generated file와 host-specific setting을 분리합니다. Git에 secret을 포함하지 않습니다.
- **사실과 추론:** dry-run 결과, symlink target과 conflict message는 근거이고, “깔끔함·효율성·이식성”은 repository 구조와 host 차이에 따른 설계 판단입니다.
- **실패·완료:** 기존 file 덮어쓰기, dangling/link loop, 잘못된 target, permission과 unstow 후 잔존 link를 시험합니다. link가 예상 source로 해석되고 application이 읽으며 unstow·rollback이 성공할 때 완료입니다.

---

## 1. 왜 필요한가? (Pain Point & Motivation)

설정 파일을 홈 디렉터리에 직접 두면 어떤 파일을 Git으로 관리하는지 알기 어렵다. 새 장비를 세팅할 때마다 `.zshrc`, `.gitconfig`, `.tmux.conf`, `~/.config/nvim`을 손으로 복사하면 누락과 덮어쓰기 사고가 생긴다.

Stow의 목적은 설정 파일의 실제 위치와 버전 관리 위치를 분리하는 것이다. 저장소 안에는 패키지별 디렉터리를 두고, 홈 디렉터리에는 그 파일을 가리키는 심볼릭 링크만 만든다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 Stow를 도입할 가치가 있다.

- dotfiles가 홈 디렉터리와 여러 `.config` 하위 디렉터리에 흩어져 있다.
- 새 장비를 세팅할 때 설정 파일을 수동으로 복사한다.
- 어떤 설정이 Git으로 추적되는지 불명확하다.
- 기존 파일과 새 설정 파일이 충돌할 때 덮어쓰기가 두렵다.
- 로컬 전용 설정과 공유 설정을 분리하고 싶다.

## 3. 도달하고 싶은 목표 (Target State)

잘 관리되는 Stow 기반 dotfiles는 다음 상태를 만족한다.

- 패키지 하나가 애플리케이션 하나의 설정을 담당한다.
- 저장소 내부 경로는 대상 홈 디렉터리 경로와 같은 구조를 가진다.
- 적용 전에는 `stow -n -v`로 dry run을 실행한다.
- 기존 파일은 백업하거나 `--adopt`의 의미를 이해한 뒤 처리한다.
- 링크 제거는 파일 삭제가 아니라 `stow -D`로 수행한다.
- 민감 정보는 dotfiles 저장소에 넣지 않는다.

## 4. 시스템 번역 (Data Flow)

Stow의 동작은 다음처럼 해석할 수 있다.

```text
dotfiles 저장소
  -> 패키지 디렉터리 선택
  -> 대상 디렉터리 계산
  -> 같은 상대 경로에 심볼릭 링크 생성
  -> 기존 파일과 충돌하면 중단
```

예를 들어 다음 구조가 있다.

```text
~/dotfiles/
  git/
    .gitconfig
  tmux/
    .tmux.conf
```

`~/dotfiles`에서 `stow git tmux`를 실행하면 기본 대상은 부모 디렉터리인 `~`가 된다. 결과는 `~/.gitconfig`와 `~/.tmux.conf`가 저장소 안의 파일을 가리키는 링크가 된다.

## 5. 핵심 구성요소 (Building Blocks)

- Stow directory: `~/dotfiles`처럼 패키지를 담는 루트 디렉터리다.
- Package: `git`, `tmux`, `nvim`처럼 하나의 설정 묶음이다.
- Target directory: 링크가 생성될 위치다. dotfiles에서는 보통 홈 디렉터리다.
- Symlink: 실제 설정 파일 위치에 만들어지는 링크다.
- Dry run: `stow -n -v`로 실제 변경 없이 계획을 확인한다.
- Delete mode: `stow -D`로 해당 패키지의 링크를 제거한다.
- Restow mode: `stow -R`로 링크를 제거한 뒤 다시 만든다.
- Adopt mode: 기존 대상 파일을 패키지 안으로 가져오는 위험한 충돌 해결 모드다.

## 6. 상태 전이 (State Transition)

설정 파일은 다음 상태를 지난다.

```text
unmanaged
  -> backed_up
  -> moved_into_package
  -> linked
  -> restowed
  -> unstowed
```

- `unmanaged`: 홈 디렉터리에 직접 있는 기존 설정 파일이다.
- `backed_up`: 덮어쓰기 전에 별도 위치에 보관했다.
- `moved_into_package`: dotfiles 패키지 안으로 옮겼다.
- `linked`: Stow가 대상 위치에 심볼릭 링크를 만들었다.
- `restowed`: 링크를 재생성했다.
- `unstowed`: `stow -D`로 링크를 제거했다.

충돌이 발생하면 Stow는 기본적으로 멈춘다. 이 동작은 안전장치다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Stow 실행 전 대상 파일이 일반 파일인지 심볼릭 링크인지 확인한다.
- `stow -n -v <package>`로 변경 계획을 먼저 본다.
- 기존 설정 파일은 백업 없이 삭제하지 않는다.
- `--adopt`는 기존 파일을 저장소 패키지 안으로 이동시킬 수 있으므로 실행 후 `git diff`를 반드시 확인한다.
- 비밀번호, 토큰, SSH 개인키는 dotfiles 저장소에 넣지 않는다.
- 홈 디렉터리 전체를 하나의 패키지로 만들지 않는다.
- 링크 제거는 `rm`보다 `stow -D`를 우선한다.
- 팀이나 공개 저장소에 올릴 설정과 로컬 전용 설정을 분리한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

실제 홈을 옮기기 전에는 기존 일반 파일·symlink·패키지 파일을 확인하고 서로 다른 경로에 backup한다. 이미 있는 package나 backup을 cp/mv로 덮어쓰지 않는다. 가장 작은 학습 예제는 임시 target에서 실행해 실제 홈 설정을 건드리지 않는다.

```bash
(
  set -eu
  stow_demo_root=$(mktemp -d)
  mkdir -p "$stow_demo_root/dotfiles/git" "$stow_demo_root/target"
  printf '[core]\n    editor = vim\n' > "$stow_demo_root/dotfiles/git/.gitconfig"
  stow --dir "$stow_demo_root/dotfiles" --target "$stow_demo_root/target" -n -v git
  stow --dir "$stow_demo_root/dotfiles" --target "$stow_demo_root/target" git
  readlink "$stow_demo_root/target/.gitconfig"
  stow --dir "$stow_demo_root/dotfiles" --target "$stow_demo_root/target" -D git
  test ! -L "$stow_demo_root/target/.gitconfig"
  printf 'review demo source at: %s\n' "$stow_demo_root"
)
```

Neovim처럼 `~/.config` 아래에 있는 설정은 저장소 안에서도 같은 상대 경로를 만든다.

```text
~/dotfiles/
  nvim/
    .config/
      nvim/
        init.lua
```

적용과 제거는 다음 명령으로 한다.

```bash
cd ~/dotfiles
stow -n -v nvim
stow nvim
stow -D nvim
stow -R nvim
```

대상 디렉터리를 명시해야 할 때는 `-t`를 사용한다.

```bash
stow -n -v -t "$HOME" git
stow -t "$HOME" git
```

## 9. 실패 사례 (What could go wrong?)

- 기존 `.zshrc`를 백업하지 않고 삭제해 셸 설정을 잃는다.
- 저장소 구조와 홈 디렉터리 구조가 달라 엉뚱한 위치에 링크가 생긴다.
- `--adopt`를 이해하지 못하고 실행해 기존 로컬 설정이 저장소 파일로 들어간다.
- 공개 dotfiles 저장소에 업무용 이메일, 내부 호스트명, 토큰이 포함된다.
- 수동으로 심볼릭 링크를 삭제한 뒤 Stow 상태를 혼동한다.
- `stow */`로 모든 디렉터리를 적용하면서 원하지 않는 패키지까지 링크한다.
- OS별 설정 차이를 분리하지 않아 다른 장비에서 설정이 깨진다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 `git`, `tmux`, `vim`처럼 작은 패키지부터 시작한다. 이후 다음 순서로 확장한다.

- `common`, `linux`, `macos`, `work`, `personal`처럼 환경별 패키지를 분리한다.
- `.stow-local-ignore`로 README, 라이선스, 스크립트 같은 비설정 파일을 제외한다.
- 설치 스크립트는 `stow -n -v` 결과를 먼저 보여주도록 만든다.
- 민감 정보는 별도 secret manager나 로컬 전용 파일로 분리한다.
- 새 장비 부트스트랩 절차에 패키지 설치, 저장소 clone, Stow 적용, 검증을 순서대로 둔다.

Stow는 설정 배포 도구이지 패키지 설치 도구가 아니다. 프로그램 설치와 설정 링크 생성은 분리해서 관리한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 패키지 디렉터리 구조가 대상 홈 디렉터리 구조와 일치한다.
- [ ] 기존 설정 파일을 백업했다.
- [ ] `stow -n -v`로 적용 계획을 확인했다.
- [ ] 충돌이 발생한 파일을 수동으로 확인했다.
- [ ] `--adopt`를 썼다면 즉시 `git diff`를 확인했다.
- [ ] 민감 정보가 저장소에 들어가지 않았다.
- [ ] 제거 절차로 `stow -D`를 문서화했다.
- [ ] 새 장비에서 적용 후 링크 경로를 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Stow는 설정 파일을 복사하는 도구가 아니라, 저장소 안의 `____` 구조를 대상 디렉터리의 `____`로 연결하고 충돌 전에는 `____`로 확인하게 만드는 도구다.
