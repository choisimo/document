# Selenium Chrome 자동화 운영 가이드

Ubuntu 또는 Debian 계열 호스트에서 Python과 Selenium 4를 사용해 Chrome 또는 Chromium을 자동화하는 기본 절차입니다. 패키지 이름과 브라우저 지원 범위는 배포판, CPU 아키텍처, Python, Selenium과 브라우저 버전에 따라 달라집니다.

## 적용 범위와 증거 상태

Selenium 4.6 이상은 일반적으로 Selenium Manager를 통해 호환 드라이버를 탐색하거나 내려받을 수 있으므로 임의의 ChromeDriver 사이트에서 서로 다른 버전을 수동 조합하지 않습니다. 폐쇄망이나 고정 빌드에서는 승인된 브라우저와 드라이버 artifact의 출처, checksum과 호환 표를 별도로 관리합니다.

- 브라우저 자동 업데이트 여부와 실제 버전을 기록합니다.
- 전용 비권한 서비스 계정과 작업 디렉토리를 사용합니다.
- 로그인 정보, 쿠키, 다운로드와 스크린샷의 보존 및 접근 정책을 정합니다.
- 대상 사이트의 이용약관, robots 정책, 요청 빈도와 개인정보 처리를 검토합니다.

## Python 환경 구성

시스템 Python에 sudo pip를 사용하지 않고 프로젝트 가상환경을 만듭니다.

    sudo apt update
    sudo apt install python3 python3-venv
    python3 -m venv .venv
    . .venv/bin/activate
    python -m pip install --upgrade pip
    python -m pip install "selenium>=4.6,<5"

재현 가능한 운영 배포에서는 시험한 정확한 버전을 lockfile 또는 requirements 파일에 고정합니다. Chrome 또는 Chromium은 배포판이나 공급자의 서명된 저장소를 사용해 설치하고, 설치 경로와 버전을 기록합니다.

## 최소 headless 예제

    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(options=options)
    try:
        driver.set_page_load_timeout(30)
        driver.get("https://example.com")
        print(driver.title)
    finally:
        driver.quit()

현대 headless Chrome에는 보통 Xvfb와 pyvirtualdisplay가 필요하지 않습니다. 레거시 GUI 동작 때문에 Xvfb가 필요할 때만 해당 의존성을 고정하고 디스플레이 종료를 finally에서 보장합니다. --no-sandbox는 브라우저 격리를 약화하므로 일반 호스트에서 사용하지 않습니다. 제한된 컨테이너에서 필요하다면 위협 모델과 대체 격리를 문서화합니다.

## 예약 실행

crontab 전체를 삭제하거나 임시 파일로 덮어쓰지 않습니다. 현재 설정을 백업하고 crontab -e로 한 항목만 추가합니다.

    crontab -l > "$HOME/crontab.backup"
    crontab -e

예시 항목은 매일 08:02에 전용 가상환경의 Python을 실행하고 stdout과 stderr를 로그로 보냅니다.

    2 8 * * * cd /home/USER/automation && .venv/bin/python job.py >> logs/job.log 2>&1

절대 경로, timezone, PATH, 중복 실행 방지와 로그 회전을 명시합니다. 작업이 이전 실행과 겹칠 수 있으면 flock 또는 스케줄러의 동시성 제어를 사용하고, 쓰기 작업에는 idempotency 기준을 둡니다.

## 실패와 재시도

브라우저 시작 실패, DNS 또는 TLS, page load timeout, 요소 탐색 실패, 인증 만료와 대상 사이트의 429 또는 5xx를 구분합니다. 일시 오류만 상한이 있는 backoff로 재시도하고 잘못된 selector와 인증 실패는 자동 반복하지 않습니다. 실패 screenshot과 HTML에는 개인정보가 포함될 수 있으므로 제한된 저장소와 짧은 보존 기간을 사용합니다.

## 완료 조건

- 고정된 환경에서 브라우저와 Selenium 버전, 드라이버 해석 경로가 기록됩니다.
- 정상 페이지, timeout, 존재하지 않는 요소와 인증 실패가 서로 다른 종료 코드와 로그로 판정됩니다.
- driver 프로세스가 성공과 실패 모두에서 종료되고 임시 profile이 정리됩니다.
- 예약 작업이 정해진 timezone에 한 번 실행되며 중복 실행과 로그 증가가 통제됩니다.
- 브라우저 업데이트 후 대표 흐름을 재시험하고 이전 artifact로 되돌릴 수 있습니다.
