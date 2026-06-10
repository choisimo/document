# MySQL Docker 실행 예시

```
docker run --name mysql-container -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -v mysql-data:/var/lib/mysql -d mysql:latest
```
