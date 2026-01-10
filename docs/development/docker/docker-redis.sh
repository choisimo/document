#!/bin/bash

# SUDO 권한 확인
if [ "$(id -u)" != "0" ]; then
    echo "SUDO 권한으로 실행해주세요."
    exit 1
fi  # fi 누락된 부분 추가

# 설정값
REDIS_VERSION="7.0.2"
CONTAINER_NAME="redis"
HOST_REDIS_DIR="/server/redis"
HOST_REDIS_CONF="${HOST_REDIS_DIR}/redis.conf"
HOST_REDIS_DATA="${HOST_REDIS_DIR}/redis_data"
REDIS_PORT=6379
TIMEZONE="Asia/Seoul"

# Redis 인증 비밀번호
echo -n "Enter Redis password for authentication: "
read -s REDIS_PASSWORD
echo

# 1. Redis 디렉터리 존재 여부 확인 및 생성
if [ ! -d "$HOST_REDIS_DIR" ]; then
    echo "Redis base directory does not exist. Creating $HOST_REDIS_DIR..."
    mkdir -p $HOST_REDIS_DIR
else
    echo "Redis base directory already exists: $HOST_REDIS_DIR"
fi

# 데이터 디렉터리 생성
if [ ! -d "$HOST_REDIS_DATA" ]; then
    echo "Creating Redis data directory: $HOST_REDIS_DATA"
    mkdir -p $HOST_REDIS_DATA
fi

# 2. Redis 설정 파일 생성
echo "Creating Redis configuration file with authentication..."
cat <<EOL > $HOST_REDIS_CONF
# Redis 기본 설정
bind 0.0.0.0
protected-mode no
port $REDIS_PORT
timeout 0
tcp-keepalive 300
databases 16
save 900 1
save 300 10
save 60 10000
dir /data
logfile ""
daemonize no
# Redis Auth 설정
requirepass $REDIS_PASSWORD
EOL

# 3. 기존 Redis 컨테이너 종료 및 삭제
echo "Stopping and removing existing Redis container if it exists..."
docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
docker rm $CONTAINER_NAME >/dev/null 2>&1 || true

# 4. Redis 컨테이너 실행
echo "Starting new Redis container with authentication..."
docker run \
    -d \
    --restart=always \
    --name=$CONTAINER_NAME \
    -p $REDIS_PORT:$REDIS_PORT \
    -e TZ=$TIMEZONE \
    -v $HOST_REDIS_CONF:/etc/redis/redis.conf \
    -v $HOST_REDIS_DATA:/data \
    redis:$REDIS_VERSION redis-server /etc/redis/redis.conf

# 5. Redis 컨테이너 상태 확인
echo "Checking Redis container status..."
docker ps | grep $CONTAINER_NAME && echo "Redis container with authentication is running successfully!"
