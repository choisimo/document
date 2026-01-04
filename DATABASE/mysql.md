```
docker run --name mysql-container -e MYSQL_ROOT_PASSWORD=yourpassword -p 3306:3306 -v mysql-data:/var/lib/mysql -d mysql:latest
```
