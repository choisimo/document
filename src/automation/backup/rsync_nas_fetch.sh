#!/bin/bash

echo "Sync started at $(date +'%Y-%m-%d %H:%M:%S')"
echo "----------------------------------------"

# 시놀로지 NAS 사용자 및 주소 설정
NAS_USER="user"
NAS_HOST="host"
NAS_PATH="directory"

# 우분투 서버의 백업 대상 경로
LOCAL_DEST="/path/to/ubuntu/destination"
LOG_PATH="/path/to/ubuntu/log"

# 로그 파일 경로
LOG_FILE="$(LOG_PATH)$(date +'%Y%m%d').log"
echo "Log file: $LOG_FILE"

# NAS에서 @로 시작하지 않는 디렉토리 찾기
ssh ${NAS_USER}@${NAS_HOST} "find ${NAS_PATH} -maxdepth 1 -type d ! -name '@*'" | while read dir; do
    # 디렉토리 이름 가져오기
    DIR_NAME=$(basename "$dir")

    # rsync로 디렉토리 동기화
    echo "$(date +'%Y-%m-%d %H:%M:%S') - Syncing $DIR_NAME from NAS to ${LOCAL_DEST}/${DIR_NAME}..." >> ${LOG_FILE}
    rsync -av ${NAS_USER}@${NAS_HOST}:"${dir}/" "${LOCAL_DEST}/${DIR_NAME}/" >> ${LOG_FILE} 2>&1
done

echo "$(date +'%Y-%m-%d %H:%M:%S') - Sync completed." >> ${LOG_FILE}

echo "----------------------------------------"
echo "----------------------------------------"
echo "----------------------------------------"



#!/bin/bash

# 시놀로지 NAS 사용자 및 주소 설정
NAS_USER="nodove_admin"
NAS_HOST="nas.nodove.com"
NAS_PATH="/volume2"

# 우분투 서버의 백업 대상 경로
LOCAL_DEST="/drive/backup/12tb"
KEY_DIR="/home/nodove/.ssh/id_rsa"

# NAS에서 @로 시작하지 않는 디렉토리 찾기
ssh -i ${KEY_DIR} ${NAS_USER}@${NAS_HOST} "find ${NAS_PATH} -maxdepth 1 -type d ! -name '@*'" | while read dir; do
    # 디렉토리 이름 가져오기
    DIR_NAME=$(basename "$dir")

    # rsync로 디렉토리 동기화
    echo "Syncing $DIR_NAME from NAS to ${LOCAL_DEST}/${DIR_NAME}..."
    rsync -av -e "ssh -i ${KEY_DIR}" ${NAS_USER}@${NAS_HOST}:"${dir}/" "${LOCAL_DEST}/${DIR_NAME}/"
done

echo "Sync completed."