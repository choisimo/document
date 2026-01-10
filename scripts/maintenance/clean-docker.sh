#!/bin/bash

echo "🐳 Docker 전체 초기화를 시작합니다..."

# 1. 실행 중인 모든 컨테이너 중지
# (컨테이너가 없으면 에러가 날 수 있으므로 || true로 예외 처리)
if [ -n "$(docker ps -aq)" ]; then
    echo "1. 실행 중인 컨테이너 중지 중..."
    docker stop $(docker ps -aq)
else
    echo "1. 중지할 컨테이너가 없습니다."
fi

# 2. 모든 컨테이너 삭제
if [ -n "$(docker ps -aq)" ]; then
    echo "2. 컨테이너 삭제 중..."
    docker rm $(docker ps -aq)
else
    echo "2. 삭제할 컨테이너가 없습니다."
fi

# 3. 모든 이미지 삭제
if [ -n "$(docker images -q)" ]; then
    echo "3. 이미지 삭제 중..."
    docker rmi -f $(docker images -q)
else
    echo "3. 삭제할 이미지가 없습니다."
fi

# 4. 모든 볼륨 삭제 (데이터베이스 데이터 등 포함됨)
if [ -n "$(docker volume ls -q)" ]; then
    echo "4. 볼륨 삭제 중..."
    docker volume rm $(docker volume ls -q)
else
    echo "4. 삭제할 볼륨이 없습니다."
fi

# 5. 시스템 정리 (네트워크, 남은 캐시, 댕글링 이미지 등)
echo "5. 네트워크 및 빌드 캐시 정리 중..."
docker system prune -a --volumes -f

echo "✨ Docker가 완전히 초기화되었습니다."