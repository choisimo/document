## create user
    CREATE USER '${username}'@'%' IDENTIFIED BY '${password}';
## grant set
    GRANT ALL PRIVILEGES ON ${schema}.* TO '${username}'@'%';
    FLUSH PRIVILEGES;

    SHOW GRANTS FOR '${username}'@'%';
