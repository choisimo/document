# Pet (CLI Snippet Manager) 설치 가이드

Pet은 자주 사용하는 긴 명령어를 관리하고 빠르게 검색하여 실행할 수 있게 해주는 CLI 도구입니다. 이 문서는 `pet`의 특정 버전(v1.0.1) 설치와 필수 의존성인 `fzf`의 설치 방법을 다룹니다.

## 설치 방법

### 1. Pet 설치 (v1.0.1)

GitHub 릴리즈에서 v1.0.1 버전의 RPM 패키지를 다운로드하여 설치합니다.

```bash
sudo rpm -ivh https://github.com/knqyf263/pet/releases/download/v1.0.1/pet_1.0.1_linux_amd64.rpm
```

> **참고:** 최신 버전이나 다른 OS 설치 방법은 [공식 저장소](https://github.com/knqyf263/pet)를 참조하세요.

### 2. fzf 설치 (필수 의존성)

Pet의 강력한 검색 기능을 활용하기 위해서는 퍼지 검색 도구인 `fzf`가 필요합니다. `git`을 통해 최신 버전을 설치하는 방법을 권장합니다.

```bash
# fzf 저장소 클론 (depth 1로 최신 커밋만 가져옴)
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf

# 설치 스크립트 실행
~/.fzf/install
```

설치 스크립트 실행 시 쉘 설정 파일(`.bashrc` 또는 `.zshrc`)에 경로 추가 여부를 묻는 질문이 나오면 `y`를 입력하여 자동 설정을 진행하는 것이 좋습니다.

> **참고:** `fzf`에 대한 더 자세한 정보는 [공식 저장소](https://github.com/junegunn/fzf)에서 확인할 수 있습니다.

## 사용법 (간단 요약)

*   `pet new`: 새로운 스니펫 추가
*   `pet search`: 스니펫 검색 및 실행 (fzf UI 사용)
*   `pet list`: 등록된 스니펫 목록 확인
*   `pet edit`: 스니펫 편집 (설정된 에디터 사용)
*   `pet sync`: Gist 등을 통한 스니펫 동기화 (설정 필요)

## 참고 자료

*   [pet.toml snippets 파일 링크](https://gist.github.com/choisimo/d79c088223050ba40c115b875b241612)
