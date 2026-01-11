## docker version
    docker --version
## docker install
    docker pull mariadb
    docker run --name mariadb1 -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mariadb
## status
    docker ps
## exec 
    docker exec -it mariadb1 mysql -uroot -p