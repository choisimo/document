# Docker로 MariaDB 실행

## 실행 상태와 완료 기준

이 예제는 로컬 Docker에서 `mariadb1` 컨테이너를 생성해 접속하는 최소 흐름이다. `password`는 예시 값이므로 실제 환경에서는 노출되지 않는 비밀값으로 대체한다. 완료는 Docker 설치 확인, 이미지 가져오기, 컨테이너 실행 상태 확인, MariaDB 접속 성공을 각각 확인한 경우로 한정한다.

## docker version
    docker --version
## docker install
    docker pull mariadb
    docker run --name mariadb1 -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mariadb
## status
    docker ps
## exec 
    docker exec -it mariadb1 mysql -uroot -p