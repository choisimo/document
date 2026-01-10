#!/bin/bash

echo "--------------------------------------------"
echo "# config 파일 작성 예시"
echo "--------------------------------------------"
echo "# 소스 디렉토리 경로"
echo "SOURCE_DIR=/data/servers/www"
echo "# SSH 키 파일 경로"
echo "SSH_KEY_PATH=/home/user/.ssh/id_rsa"
echo "# 타겟 서버 목록 (user@server:/path/ 형식)"
echo "TARGET_SERVERS=(user@server1:/data/servers/www user@server2:/data/servers/www)"
echo "--------------------------------------------"


# 관리자 권한으로 실행되었는지 확인
if [[ $EUID -ne 0 ]]; then
    echo "이 스크립트는 관리자 권한으로 실행해야 합니다."
    exit 1
fi

# 설정 파일 경로
CONFIG_FILE="/data/servers/conf.d/sync_config.conf"
LOG_FILE="/data/servers/logs/sync.log"

echo "설정 파일 경로 : $CONFIG_FILE"
echo "로그 파일 경로 : $LOG_FILE"

# 설정 파일이 저장될 디렉토리가 없으면 생성
if [[ ! -d $(dirname "$CONFIG_FILE") ]]; then
    mkdir -p $(dirname "$CONFIG_FILE")
fi

# 디렉토리 생성
if [[ ! -d $(dirname "$CONFIG_FILE") ]]; then
    mkdir -p $(dirname "$CONFIG_FILE")
fi

if [[ ! -d $(dirname "$LOG_FILE") ]]; then
    mkdir -p $(dirname "$LOG_FILE")
fi

# inotifywait 설치 확인
if ! command -v inotifywait &> /dev/null; then
    echo "inotify-tools 패키지가 설치되지 않았습니다. 설치 후 다시 실행하세요."
    exit 1
fi

# 설정 파일 로드 또는 새로 입력
if [[ -f "$CONFIG_FILE" ]]; then
    echo "이전에 저장된 설정을 불러옵니다..."
    source "$CONFIG_FILE"
    echo "소스 디렉토리: $SOURCE_DIR"
    echo "타겟 서버 목록:"
    for TARGET in "${TARGET_SERVERS[@]}"; do
        echo "- $TARGET"
    done
else
    echo "저장된 설정이 없습니다. 새로 입력하세요."
    # 사용자로부터 소스 디렉토리 및 타겟 서버 정보 입력받기
    echo "소스 디렉토리 입력 예제 : /data/servers/www"
    read -p "소스 디렉토리를 입력하세요 (기본값: 현재 디렉토리): " SOURCE_DIR
    SOURCE_DIR=${SOURCE_DIR:-$(pwd)}


    # 디렉토리 내용 출력
    echo "소스 디렉토리에 포함된 파일/디렉토리 목록:"
    if [[ -d "$SOURCE_DIR" ]]; then
        ls -la "$SOURCE_DIR"
    else
        echo "소스 디렉토리가 유효하지 않습니다. 경로를 확인하세요."
        exit 1
    fi


    # SSH 키 파일 경로 입력
    echo "SSH 키 파일 경로 입력 예제 : /home/user/.ssh/id_rsa"
    read -p "SSH 키 파일 경로를 입력하세요: " SSH_KEY_PATH

    # 키 파일 존재 여부 확인
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        echo "입력한 SSH 키 파일이 존재하지 않습니다. 경로를 확인하세요."
        exit 1
    fi


    declare -a TARGET_SERVERS
    while true; do
        echo "타겟 서버 주소 및 경로 입력 예제 : user@server:/path/"
        read -p "동기화할 원격 서버 주소 및 경로를 입력하세요 (예: user@server:/path/), 종료하려면 'done' 입력: " TARGET
        if [[ "$TARGET" == "done" ]]; then
            break
        fi
        if [[ ! "$TARGET" =~ ^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:/.*$ ]]; then
            echo "잘못된 서버 주소 형식입니다. 다시 입력하세요."
            continue
        fi
        TARGET_SERVERS+=("$TARGET")
    done


    # 입력 값들 저장
    echo "설정을 저장합니다..."
    echo "SOURCE_DIR=$SOURCE_DIR" > "$CONFIG_FILE"
    echo "SSH_KEY_PATH=$SSH_KEY_PATH" >> "$CONFIG_FILE"
    echo "TARGET_SERVERS=(${TARGET_SERVERS[@]})" >> "$CONFIG_FILE"
    echo "설정이 저장되었습니다."
fi

# SSH 옵션
SSH_OPTIONS="-o StrictHostKeyChecking=no -i $SSH_KEY_PATH"

# 원격 서버 연결 테스트
echo "원격 서버 연결 테스트 중..."
for TARGET in "${TARGET_SERVERS[@]}"; do
    SERVER=$(echo "$TARGET" | awk -F':' '{print $1}')
    ssh $SSH_OPTIONS -q "$SERVER" exit
    if [[ $? -ne 0 ]]; then
        echo "서버 '$SERVER'에 연결할 수 없습니다. 동기화를 중단합니다."
        exit 1
    else
        echo "서버 '$SERVER' 연결 성공!"
    fi
done

# 기존 동기화 프로세스 종료 방지
if pgrep -f "inotifywait -m -r -e modify,create,delete $SOURCE_DIR" > /dev/null; then
    echo "이미 동기화 프로세스가 실행 중입니다. 중단 후 다시 실행하세요." | tee -a "$LOG_FILE"
    exit 1
fi

# 동기화 작업
echo "동기화를 시작합니다..."
inotifywait -m -r -e modify,create,delete "${SOURCE_DIR}" | while read path action file; do
    for TARGET in "${TARGET_SERVERS[@]}"; do
        rsync -e "ssh $SSH_OPTIONS" -avz --delete "${SOURCE_DIR}" "${TARGET}" >> "$LOG_FILE" 2>&1
        if [[ $? -eq 0 ]]; then
            echo "[$(date)] ${SOURCE_DIR} => ${TARGET} 동기화 완료" | tee -a "$LOG_FILE"
        else
            echo "[$(date)] ${TARGET} 동기화 실패" | tee -a "$LOG_FILE"
        fi
    done
done
