##springboot timezone 설정 방법

@SpringBootApplication 내부에 해당 코드 추가 


	@PostConstruct
	void start_time_zone() {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		log.info("<<< springboot server 시작 >>>");
		log.info("timezone : " + LocalDateTime.now());
	}


##SLF4J logging timezone

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
