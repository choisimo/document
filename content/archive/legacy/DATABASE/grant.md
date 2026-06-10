# MariaDB/MySQL 사용자 생성과 권한 부여

## 사용자 생성

```sql
CREATE USER '${username}'@'%' IDENTIFIED BY '${password}';
```

## 권한 부여와 확인

```sql
GRANT ALL PRIVILEGES ON ${schema}.* TO '${username}'@'%';
FLUSH PRIVILEGES;

SHOW GRANTS FOR '${username}'@'%';
```
