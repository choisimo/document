# React 애플리케이션 빌드와 정적 배포

이 문서는 Node.js 기반 React 프로젝트의 일반 절차를 설명합니다. Create React App, Vite, Next.js처럼 빌드 도구마다 명령과 산출물 디렉터리가 다르므로 `package.json`의 scripts와 lockfile을 정본으로 사용합니다.

## 1. 환경 확인

프로젝트가 요구하는 Node.js와 패키지 관리자 버전을 `.nvmrc`, `engines`, CI 설정에서 확인합니다.

```bash
node --version
npm --version
npm run
```

NVM, 운영체제 패키지, NodeSource 설치를 한 절차에서 섞지 않습니다. 팀이 선택한 공급 경로 하나를 사용하고 CI와 같은 major 버전을 설치합니다.

## 2. 의존성 재현

lockfile이 있는 npm 프로젝트에서는 다음 명령으로 고정된 의존성을 설치합니다.

```bash
npm ci
```

새 프로젝트 생성이 목적이라면 현재 조직이 지원하는 스캐폴딩 도구와 템플릿 버전을 별도로 정합니다. 기존 프로젝트 빌드 절차에서 `create-react-app`을 다시 실행하지 않습니다.

## 3. 빌드

```bash
npm run build
```

빌드가 끝나면 `package.json`과 빌드 도구 설정에서 산출물 경로를 확인합니다. 흔한 경로는 `build/` 또는 `dist/`이지만 이름만 보고 가정하지 않습니다.

## 4. 로컬 정적 파일 점검

`serve`는 산출물을 임시 확인하는 선택지입니다. 프로젝트 전역 설치 대신 실행 버전이 드러나는 방식을 사용합니다.

```bash
npx --yes serve@<APPROVED_VERSION> -s <OUTPUT_DIR> -l 3000
```

운영 배포에서는 지원되는 웹 서버, systemd 또는 컨테이너 정책을 따릅니다. 셸의 `&`와 단일 로그 파일만으로 재시작, 준비 상태, 로그 회전, 권한 경계가 보장되지 않습니다.

## 완료 기준

1. 깨끗한 작업 디렉터리 또는 CI에서 lockfile 기반 설치와 빌드가 성공합니다.
2. 산출물 디렉터리와 빌드 revision을 기록합니다.
3. 루트 URL과 클라이언트 라우트 새로고침이 예상 상태를 반환합니다.
4. 정적 자산 URL, 캐시 헤더, 오류 페이지를 확인합니다.
5. 이전 산출물로 되돌리는 절차가 준비돼 있습니다.
