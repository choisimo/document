# MariaDB/MySQL 사용자 생성 및 권한 부여

## 실행 범위와 완료 증거

아래 명령은 `${username}`, `${password}`, `${schema}`를 실제 대상에 맞게 치환한 뒤 실행한다. `'%'` 호스트와 `ALL PRIVILEGES`는 접속 범위와 권한을 크게 넓히므로 요구된 최소 호스트·권한인지 먼저 확인한다. 권한 부여 완료는 명령 성공 메시지만이 아니라 `SHOW GRANTS` 결과가 의도한 스키마와 권한만 포함하는지 확인해 판정한다.

## create user
    CREATE USER '${username}'@'%' IDENTIFIED BY '${password}';
## grant set
    GRANT ALL PRIVILEGES ON ${schema}.* TO '${username}'@'%';
    FLUSH PRIVILEGES;

    SHOW GRANTS FOR '${username}'@'%';
