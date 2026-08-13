# Pet (CLI Snippet Manager) 설치 가이드

Pet은 자주 사용하는 긴 명령어를 관리하고 빠르게 검색하여 실행할 수 있게 해주는 CLI 도구입니다. 이 문서는 `pet`의 특정 버전(v1.0.1) 설치와 검색 workflow에 함께 사용하는 `fzf`의 설치 예시을 다룹니다.

## 적용 범위와 설치 검증

- **범위:** 이 문서는 Pet v1.0.1 RPM과 특정 Linux 설치 예시입니다. architecture, distribution, package format, Pet·fzf release와 upstream installation 문서를 확인합니다.
- **신뢰 전제:** download URL, release asset, checksum/signature와 package source를 검증합니다. `git` 또는 install script의 “최신” 상태는 재현 가능한 version 고정이 아닙니다.
- **사용 전제:** snippet은 임의 shell command를 실행할 수 있으므로 secret, destructive command, quoting, current directory와 selected entry를 실행 전에 검토합니다.
- **실패·완료:** PATH·shell integration·fzf 연동, config 위치, snippet 검색과 취소, 잘못된 command 선택을 시험합니다. pinned version과 checksum을 기록하고 test snippet만 의도대로 실행될 때 완료입니다.

---

## 설치 방법

### 1. Pet 설치 (v1.0.1)

GitHub 릴리즈에서 v1.0.1 버전의 RPM 패키지를 다운로드하여 설치합니다.

```bash
sudo rpm -ivh https://github.com/knqyf263/pet/releases/download/v1.0.1/pet_1.0.1_linux_amd64.rpm
```

> **참고:** 최신 버전이나 다른 OS 설치 방법은 [공식 저장소](https://github.com/knqyf263/pet)를 참조하세요.

### 2. fzf 설치 (검색 연동 예시)

Pet의 강력한 검색 기능을 활용하기 위해서는 퍼지 검색 도구인 `fzf`가 필요합니다. `git` 기반 installer는 한 선택지이지만 재현성과 공급망 검토를 위해 tag·commit과 script 내용을 고정·검증합니다.

```bash
# fzf 저장소 클론 (depth 1로 최신 커밋만 가져옴)
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf

# 설치 스크립트 실행
~/.fzf/install
```

설치 스크립트 실행 시 쉘 설정 파일(`.bashrc` 또는 `.zshrc`)에 경로 추가 여부를 묻는 질문이 나오면 변경될 shell startup file과 기존 설정을 확인한 뒤 자동 수정 또는 수동 PATH 설정 중 하나를 선택합니다.

> **참고:** `fzf`에 대한 더 자세한 정보는 [공식 저장소](https://github.com/junegunn/fzf)에서 확인할 수 있습니다.

## 사용법 (간단 요약)

*   `pet new`: 새로운 스니펫 추가
*   `pet search`: 스니펫 검색 및 실행 (fzf UI 사용)
*   `pet list`: 등록된 스니펫 목록 확인
*   `pet edit`: 스니펫 편집 (설정된 에디터 사용)
*   `pet sync`: Gist 등을 통한 스니펫 동기화 (설정 필요)

## 참고 자료

*   [pet.toml snippets 파일 링크](https://gist.github.com/choisimo/d79c088223050ba40c115b875b241612)
