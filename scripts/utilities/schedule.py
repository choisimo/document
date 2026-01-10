import schedule_db
import os
import subprocess
import datetime
import time
import random

def execute_bat_file():
    bat_file_path = "C:/workspace/attendance.bat"
    print("bat_file 실행")
    process = subprocess.Popen(bat_file_path, shell=True, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    print("bat  파일 실행 완료")
    #execute_bat_file2()

    
def execute_bat_file2():
    bat_file_path = "C:/workspace/schedule.bat"
    print("bat_file 실행")
    process = subprocess.Popen(bat_file_path, shell=True, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    print("bat  파일 실행 완료")


print("프로그램 실행")
print("DATABASE 실행")
connection = schedule_db.databaseConnection()

#  현재 시간 가지고 오기
now = datetime.datetime.now()
print("현재 시간 : ", now)
randtime1 = random.randrange(1,10)
randtime2 = random.randrange(1,59)
# 자동 실행 시킬 시간
#target_time = datetime.time(8,randtime1, randtime2) 
target_time = datetime.time(19, 10, 20)
print("target_time : ", target_time)

while True:
    if now.strftime("%H:%M") == target_time.strftime("%H:%M"):
        execute_bat_file()
        schedule_db.alertInsertion("attendance", str(now), connection)
        target_time = datetime.time(8, randtime1, randtime2)
        print("새로운 시작 시간 : ", target_time)
    else:
        time.sleep(10) # 10초마다 체크하기
        now = datetime.datetime.now()
        print("실시간 동작 중..", now)
        schedule_db.logInsertion("log", str(now), connection)
