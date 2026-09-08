# Selenium·Chrome 자동화 환경 구성 메모

## 문서 상태: 혼합 예제 실행 금지

이 문서는 Chrome 96 패키지와 ChromeDriver 109를 함께 설치하고, Python options를 정의하기 전에 사용하며, Python 블록에 `//` 주석과 잘못된 메서드 이름이 포함돼 있어 그대로 실행할 수 없다. crontab 절은 C 예제와 shell 명령이 혼합돼 문자열이 닫히지 않았고, `crontab -r`은 현재 사용자의 모든 등록 작업을 제거한다. 대상 OS·CPU, Chrome, driver, Selenium, Python 버전을 하나의 호환 조합으로 정하고 가상환경에서 재작성한다. 기존 crontab을 백업한 뒤 특정 항목만 추가하며, 완료는 브라우저 기동·페이지 조회·종료 처리와 예약 작업 한 건의 실행 로그로 판정한다.

## install chrome
    sudo apt-get update 
    sudo apt-get install wget

#### need to set same version of google-chrome and chromedriver
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    wget https://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_96.0.4664.45-1_amd64.deb
    sudo dpkg -i google-chrome-stable_96.0.4664.45-1_amd64.deb
    sudo apt-get install -f 
    google-chrome --version

    sudo apt install ./google-chrome-stable_current_amd64.deb

    #### download link
    https://chromedriver.com/download
    wget https://chromedriver.storage.googleapis.com/109.0.5414.74/chromedriver_linux64.zip
    
    unzip chromedriver_linux64.zip
    sudo mv chromedriver /usr/bin/chromedriver
    sudo chmod +x /usr/bin/chromedriver
    
## install python3
    sudo apt-get install python3
    export PATH=/usr/local/bin/python3:$PATH 
    sudo apt-get install pip

## install selenium
    sudo pip install xlrd
    sudo apt-get install xvfb
    sudo pip install pyvirtualdisplay
    sudo pip install selenium

## selenium 
    from selenium import webdriver
    from pyvirtualdisplay import Display // for cli environment

    display = Display(visible=0, size=(1920, 1080))
    display.start()
    webdriver.Chrome(executable_path='/path/to/chromedriver', options=chrome_options)

    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options_add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
## crontab
    #include <stdio.h>
    #include <stdlib.h>
    
    int main(int argc, char* argv){
    
            printf("argc %d", argc);
    
            system("crontab -l > temp.txt");
    
            // 1분. 2시.  3일.  4월.   5요일
            
            system("echo '2 8 * * * /usr/bin/python3 /home/usr/documents/hello.py");
    
            system("crontab temp.txt");
    
            system("rm temp.txt");
    
            printf("new crontab setted");
    
            return 0;
    }
#### crontab command
    crontab -l //search exist crontabs
    crontab -r //remove all exist crontabs

## no-display example
![스크린샷 2024-04-11 025618](https://github.com/choisimo/cli-commands/assets/150008602/16ac1405-414d-4805-baf4-1ad7942db1ae)

