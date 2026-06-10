Spring Boot와 React 애플리케이션을 백그라운드에서 실행하고, 로그를 각각 `/server/log/backend.log`와 `/server/log/front.log`에 저장하도록 **Linux 시스템 서비스**로 설정하는 절차다.

---

## 1. **Spring Boot 서비스 설정**

### (1) **Spring Boot 애플리케이션 로그 파일 설정**
Spring Boot의 로그를 파일로 저장하도록 설정합니다.

#### `logback-spring.xml` 설정 (Spring Boot)
`src/main/resources/logback-spring.xml` 파일에 다음 내용을 추가:

```xml
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>/server/log/backend.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>/server/log/backend-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="info">
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

#### `log4j2.xml` 설정 (Spring Boot)
`src/main/resources/log4j2.xml` 파일에 다음 내용을 추가 : 
```xml
<Configuration status="WARN">
    <Appenders>
        <!-- 파일 로그 Appender -->
        <RollingFile name="FileAppender" fileName="/server/log/backend.log" filePattern="/server/log/backend-%d{yyyy-MM-dd}.log">
            <PatternLayout>
                <Pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%t] %-5level %logger{36} - %msg%n</Pattern>
                <Charset>UTF-8</Charset>
            </PatternLayout>
            <Policies>
                <TimeBasedTriggeringPolicy />
            </Policies>
        </RollingFile>

        <!-- 콘솔 로그 Appender -->
        <Console name="ConsoleAppender" target="SYSTEM_OUT">
            <PatternLayout>
                <Pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%t] %-5level %logger{36} - %msg%n</Pattern>
            </PatternLayout>
        </Console>
    </Appenders>

    <Loggers>
        <!-- Root Logger -->
        <Root level="info">
            <AppenderRef ref="ConsoleAppender" />
            <AppenderRef ref="FileAppender" />
        </Root>
    </Loggers>
</Configuration>
```


위 설정은 `/server/log/backend.log`에 로그를 기록하며, 30일치의 로그 파일을 유지합니다.

---

### (2) **Spring Boot 실행 스크립트 생성**
Spring Boot 애플리케이션을 실행하는 스크립트를 만듭니다.

- 파일명: `/server/start-backend.sh`
- 내용:
  ```bash
  #!/bin/bash
  java -jar /path/to/spring-boot-app.jar > /server/log/backend.log 2>&1 &
  ```

- 실행 권한 부여:
  ```bash
  chmod +x /server/start-backend.sh
  ```

---

### (3) **Spring Boot 서비스 파일 작성**
`/etc/systemd/system/spring-boot.service` 파일을 생성합니다.

```bash
sudo nano /etc/systemd/system/spring-boot.service
```

내용:
```ini
[Unit]
Description=Spring Boot Application
After=network.target

[Service]
User=app-user
ExecStart=/server/start-backend.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 2. **React 서비스 설정**

### (1) **React 실행 스크립트 생성**
React 애플리케이션 실행을 위한 스크립트를 만듭니다.

- 파일명: `/server/start-frontend.sh`
- 내용:
  ```bash
  #!/bin/bash
  cd /path/to/react-app
  npm start > /server/log/front.log 2>&1 &
  ```

- 실행 권한 부여:
  ```bash
  chmod +x /server/start-frontend.sh
  ```

---

### (2) **React 서비스 파일 작성**
`/etc/systemd/system/react-frontend.service` 파일을 생성합니다.

```bash
sudo nano /etc/systemd/system/react-frontend.service
```

내용:
```ini
[Unit]
Description=React Frontend Application
After=network.target

[Service]
User=app-user
WorkingDirectory=/path/to/react-app
ExecStart=/server/start-frontend.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 3. **서비스 활성화 및 실행**

### (1) **서비스 리로드**
서비스 파일을 작성한 후 시스템 데몬을 리로드합니다.
```bash
sudo systemctl daemon-reload
```

---

### (2) **서비스 활성화**
서비스를 부팅 시 자동으로 시작하도록 활성화합니다.

#### Spring Boot 서비스 활성화:
```bash
sudo systemctl enable spring-boot
```

#### React 서비스 활성화:
```bash
sudo systemctl enable react-frontend
```

---

### (3) **서비스 시작**
두 서비스를 실행합니다.

#### Spring Boot 서비스 시작:
```bash
sudo systemctl start spring-boot
```

#### React 서비스 시작:
```bash
sudo systemctl start react-frontend
```

---

### (4) **서비스 상태 확인**
두 서비스가 정상적으로 실행 중인지 확인합니다.

#### Spring Boot 서비스 상태 확인:
```bash
sudo systemctl status spring-boot
```

#### React 서비스 상태 확인:
```bash
sudo systemctl status react-frontend
```

---

## 4. **로그 확인**
로그는 아래 경로에서 확인할 수 있습니다:

- Spring Boot 로그: `/server/log/backend.log`
- React 로그: `/server/log/front.log`

리얼타임으로 확인하려면:
```bash
tail -f /server/log/backend.log
tail -f /server/log/front.log
```

---

위 과정을 완료하면 Spring Boot와 React 애플리케이션이 서비스로 실행되며, 로그가 지정된 경로에 저장된다.
