# MariaDB Docker 실행 메모

## Docker 버전 확인

```bash
docker --version
```

## MariaDB 이미지 실행

```bash
docker pull mariadb
docker run --name mariadb1 -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mariadb
```

## 컨테이너 상태 확인

```bash
docker ps
```

## 컨테이너 접속

```bash
docker exec -it mariadb1 mysql -uroot -p
```
