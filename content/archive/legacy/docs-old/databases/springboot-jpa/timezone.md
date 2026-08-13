# Spring Boot 시간대 설정

## 시간대 계층과 검증 대상

`TimeZone.setDefault(...)`는 JVM 프로세스의 기본 시간대를 바꾸며 애플리케이션 전체에 영향을 준다. Logback의 `%d{..., Asia/Seoul}` 설정은 로그 출력 형식만 바꾸고, 데이터베이스 세션·저장 값·JSON 직렬화의 시간대를 자동으로 통일하지 않는다. 완료 여부는 JVM 기본 시간대, 로그 시각, JDBC/데이터베이스 세션, API 응답을 서로 다른 항목으로 확인한다.

## Spring Boot 기본 시간대 설정

@SpringBootApplication 내부에 해당 코드 추가 


	@PostConstruct
	void start_time_zone() {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		log.info("<<< springboot server 시작 >>>");
		log.info("timezone : " + LocalDateTime.now());
	}


## SLF4J 로그 출력 시간대

	resources 밑에 logback-spring.xml 생성 후 
	<configuration>
		<appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
			<encoder>
				<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS, Asia/Seoul} [%thread] %-5level %logger{36} - %msg%n</pattern>
			</encoder>
		</appender>

		<root level="info">
			<appender-ref ref="STDOUT"/>
		</root>
	</configuration>
