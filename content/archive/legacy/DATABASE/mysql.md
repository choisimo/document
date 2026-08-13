# Docker로 MySQL 실행

## 실행 범위와 완료 기준

이 명령은 `mysql-container` 컨테이너, `mysql-data` 볼륨, 호스트 포트 `3306`을 사용하는 예제다. `yourpassword`는 실제 비밀번호가 아닌 자리표시자이며, `mysql:latest`는 실행 시점에 따라 이미지가 달라질 수 있으므로 재현이 필요하면 명시적 버전 태그를 정한다. 완료는 컨테이너 실행 상태와 MySQL 접속 결과를 확인해 판정한다.

```
docker run --name mysql-container -e MYSQL_ROOT_PASSWORD=yourpassword -p 3306:3306 -v mysql-data:/var/lib/mysql -d mysql:latest
```
