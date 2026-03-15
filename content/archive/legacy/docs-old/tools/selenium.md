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

