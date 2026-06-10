# Selenium

Selenium은 실제 브라우저를 조작해 웹 UI를 자동화하는 도구다. 단순 HTTP 요청으로는 확인하기 어려운 로그인, JavaScript 렌더링, 버튼 클릭, 파일 다운로드 같은 흐름을 검증할 때 사용한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

웹 화면은 HTML 응답만으로 끝나지 않는다. 로그인 후 동적으로 로딩되는 버튼, 모달, 무한 스크롤, 브라우저 저장소, 다운로드 동작은 실제 브라우저를 열어야 검증할 수 있다.

Selenium의 목적은 사용자가 보는 화면을 프로그램으로 반복 실행해 "이 흐름이 브라우저에서도 동작한다"는 증거를 만드는 것이다. 운영 자동화에 사용할 수도 있지만, 서버 API로 해결할 수 있는 작업이라면 API를 먼저 쓰는 편이 더 안정적이다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 Selenium을 검토한다.

- 로그인 이후의 웹 화면을 반복해서 확인해야 한다.
- JavaScript 렌더링이 끝난 뒤 나타나는 요소를 클릭해야 한다.
- 브라우저 다운로드, 파일 업로드, 팝업, 새 탭을 다뤄야 한다.
- 정기적으로 관리자 화면의 상태를 확인해야 한다.
- 단순 `curl`이나 `requests`로는 필요한 결과를 얻을 수 없다.

반대로 공개 API가 있고 토큰으로 접근할 수 있다면 브라우저 자동화보다 API 호출이 우선이다.

## 3. 도달하고 싶은 목표 (Target State)

운영 가능한 Selenium 자동화는 다음 상태를 만족해야 한다.

- 브라우저와 드라이버 버전 관리가 자동화되어 있다.
- Python 의존성은 가상환경 안에 격리되어 있다.
- 페이지 로딩은 `sleep`이 아니라 명시적 대기 조건으로 처리한다.
- 계정, 비밀번호, 쿠키, 토큰은 코드에 직접 쓰지 않는다.
- 실패 시 스크린샷과 로그를 남긴다.
- cron이나 systemd timer에서 실행해도 작업 디렉터리, 환경 변수, 출력 경로가 명확하다.
- 자동화 대상 사이트의 이용 약관과 rate limit을 확인한다.

## 4. 시스템 번역 (Data Flow)

Selenium 실행 흐름은 다음과 같다.

```text
스케줄러 또는 사용자
  -> Python 스크립트 실행
  -> Selenium WebDriver 생성
  -> 브라우저 실행
  -> 페이지 이동
  -> 명시적 대기
  -> 요소 조작
  -> 결과 저장
  -> 브라우저 종료
```

가장 중요한 경계는 WebDriver 종료다. 성공과 실패 모두에서 브라우저 프로세스가 닫히지 않으면 서버에 크롬 프로세스가 계속 쌓인다.

## 5. 핵심 구성요소 (Building Blocks)

- WebDriver: 코드와 브라우저 사이의 제어 인터페이스다.
- Browser: Chrome, Firefox 같은 실제 브라우저다.
- Selenium Manager: Selenium 4에서 브라우저 드라이버 탐색과 관리를 돕는 구성요소다.
- Options: headless 실행, 창 크기, 다운로드 경로, sandbox 옵션을 설정한다.
- Wait: 특정 요소가 나타나거나 클릭 가능해질 때까지 기다린다.
- Locator: `By.ID`, `By.CSS_SELECTOR`, `By.XPATH`처럼 요소를 찾는 방식이다.
- Screenshot: 실패 당시 화면을 저장해 원인 분석에 쓴다.
- Scheduler: cron, systemd timer, CI 등 주기 실행을 담당한다.

## 6. 상태 전이 (State Transition)

브라우저 자동화는 다음 상태를 지난다.

```text
idle
  -> driver_created
  -> page_loaded
  -> authenticated
  -> action_done
  -> evidence_saved
  -> closed
```

- `idle`: 아직 브라우저가 열리지 않은 상태다.
- `driver_created`: WebDriver와 브라우저가 연결됐다.
- `page_loaded`: 대상 URL로 이동했다.
- `authenticated`: 로그인이나 세션 복원이 끝났다.
- `action_done`: 클릭, 입력, 다운로드 같은 작업이 끝났다.
- `evidence_saved`: 결과 파일, 스크린샷, 로그가 저장됐다.
- `closed`: `driver.quit()`으로 브라우저가 종료됐다.

오류가 나도 `closed`로 이동해야 한다. 이를 위해 `try/finally` 구조를 사용한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `time.sleep()`만으로 페이지 준비를 판단하지 않는다.
- 로그인 비밀번호와 세션 쿠키를 코드나 문서에 직접 기록하지 않는다.
- headless 환경에서는 창 크기와 다운로드 경로를 명시한다.
- 자동화 실패 시 최소한 오류 로그와 스크린샷을 남긴다.
- 반복 실행 작업은 같은 파일명을 덮어쓰는지, 누적 저장하는지 명확히 정한다.
- `driver.quit()`은 성공 여부와 관계없이 실행한다.
- cron에서 실행할 때는 절대 경로를 사용한다.
- 크롤링이나 자동 제출은 대상 서비스의 정책을 확인한 뒤 제한적으로 수행한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Python 가상환경을 만든 뒤 Selenium을 설치한다.

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip selenium
```

가장 작은 headless 실행 예제는 다음과 같다.

```python
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

output_dir = Path("selenium-output")
output_dir.mkdir(exist_ok=True)

options = Options()
options.add_argument("--headless=new")
options.add_argument("--window-size=1280,900")

driver = webdriver.Chrome(options=options)

try:
    driver.get("https://example.com")
    heading = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "h1"))
    )
    print(heading.text)
    driver.save_screenshot(str(output_dir / "example.png"))
finally:
    driver.quit()
```

cron으로 실행한다면 작업 디렉터리와 로그 파일을 명시한다.

```cron
15 8 * * * cd /home/user/automation && .venv/bin/python check_page.py >> logs/check_page.log 2>&1
```

## 9. 실패 사례 (What could go wrong?)

- 브라우저는 설치되어 있지만 서버 환경에 필요한 라이브러리가 없어 실행되지 않는다.
- 요소가 늦게 나타나는데 `sleep(3)`만 사용해 간헐적으로 실패한다.
- CSS 클래스명이 빌드마다 바뀌는 프론트엔드를 클래스명으로만 찾는다.
- cron 실행 환경에는 필요한 환경 변수가 없어 로그인에 실패한다.
- 다운로드 경로가 상대 경로라 실행 위치에 따라 파일이 다른 곳에 저장된다.
- 실패한 테스트가 브라우저를 닫지 않아 프로세스와 메모리가 누적된다.
- 자동화 대상 사이트가 봇 탐지나 rate limit을 적용해 계정이 차단된다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 한 페이지를 열고 한 요소를 확인하는 스크립트로 시작한다. 이후 다음 순서로 확장한다.

- 로그인 흐름을 별도 함수로 분리한다.
- Locator를 상수나 Page Object로 정리한다.
- 실패 시 HTML, 스크린샷, 브라우저 로그를 함께 저장한다.
- 여러 브라우저가 필요하면 Selenium Grid나 CI 브라우저 환경을 검토한다.
- 정기 실행은 cron보다 systemd timer로 옮겨 실행 로그와 재시작 정책을 명확히 할 수 있다.
- 데이터 수집이 목적이라면 먼저 공식 API나 export 기능으로 대체 가능한지 확인한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Selenium과 브라우저 실행 환경을 가상환경 또는 컨테이너로 고정했다.
- [ ] 명시적 대기 조건을 사용했다.
- [ ] 비밀번호, 토큰, 쿠키를 코드에 직접 쓰지 않았다.
- [ ] 실패 시 스크린샷과 로그를 저장한다.
- [ ] `driver.quit()`이 항상 실행된다.
- [ ] cron 또는 timer의 작업 디렉터리와 로그 경로를 명시했다.
- [ ] 대상 서비스의 자동화 정책과 요청 빈도를 확인했다.
- [ ] API로 대체 가능한 작업인지 검토했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Selenium 자동화의 안정성은 `____` 대신 `____`를 쓰고, 실패해도 항상 `____`를 호출하는 데서 시작한다.
