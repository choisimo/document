# Bean Lifecycle 관리의 중요점

## 생명주기 관리의 핵심 가치

Bean 생명주기를 효과적으로 관리하는 것은 Spring 애플리케이션에서 여러 중요한 이점을 제공합니다:

### 1. **자원 관리 최적화**
- **목적**: 리소스의 안전한 할당과 해제
- **중요성**: 메모리 누수, 연결 고갈 방지에 필수적
- **예시**: 데이터베이스 커넥션, 파일 핸들러, 네트워크 소켓 관리

```java
@Component
public class DatabaseManager {
    private Connection connection;
    
    @PostConstruct
    public void initializeConnection() {
        try {
            connection = DriverManager.getConnection("jdbc:mysql://localhost:3306/db", "user", "pass");
            System.out.println("DB 연결 성공");
        } catch (SQLException e) {
            throw new RuntimeException("DB 연결 실패", e);
        }
    }
    
    @PreDestroy
    public void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                System.out.println("DB 연결 종료");
            }
        } catch (SQLException e) {
            System.err.println("DB 연결 종료 중 오류: " + e.getMessage());
        }
    }
}
```

### 2. **초기화 순서 보장**
- **목적**: 의존성이 있는 빈들 간의 초기화 순서 관리
- **중요성**: 의존성 역전 원칙(DIP)의 실질적 구현
- **메커니즘**: `@DependsOn`, `@Order`, `SmartLifecycle`

```java
@Component
@DependsOn("securityManager")  // securityManager 빈 초기화 후 실행
public class UserService {
    
    @Autowired
    private SecurityManager securityManager;
    
    @PostConstruct
    public void init() {
        // securityManager이 완전히 초기화된 상태에서 시작
        System.out.println("UserService 초기화: " + securityManager.getClass());
    }
}
```

### 3. **애플리케이션 상태 제어**
- **목적**: 애플리케이션 구성 요소의 상태 일관성 유지
- **중요성**: 오류 복구 및 우아한 종료 처리
- **구현 방식**: `SmartLifecycle` 인터페이스

```java
@Component
public class ApplicationMonitor implements SmartLifecycle {
    private boolean running = false;
    
    @Override
    public void start() {
        System.out.println("애플리케이션 모니터링 시작");
        running = true;
    }
    
    @Override
    public void stop() {
        System.out.println("애플리케이션 모니터링 종료");
        running = false;
    }
    
    @Override
    public boolean isRunning() {
        return running;
    }
    
    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;  // 마지막에 시작, 첫번째로 종료
    }
    
    @Override
    public boolean isAutoStartup() {
        return true;
    }
    
    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();  // 정지 완료 후 콜백 실행
    }
}
```

## 생명주기 관리 방법 비교

| 방식 | 특징 | 사용 상황 |
|------|------|----------|
| **@PostConstruct/@PreDestroy** | 표준 JSR-250 어노테이션, 코드 직관성 | 대부분의 상황 (권장) |
| **InitializingBean/DisposableBean** | 인터페이스 기반, 스프링에 강하게 결합 | 레거시 코드 |
| **@Bean(initMethod/destroyMethod)** | XML 구성에서 전환, 서드파티 클래스 관리 | 외부 라이브러리 통합 시 |

## 주의할 점과 모범 사례

1. **Lazy 초기화 영향**
   ```java
   @Component
   @Lazy  // 실제 사용 시점까지 초기화 지연
   public class ExpensiveService {
       @PostConstruct
       public void init() {
           // 지연된 시점에 실행됨
       }
   }
   ```

2. **초기화 중 예외 처리**
   ```java
   @PostConstruct
   public void init() {
       try {
           // 리소스 초기화
       } catch (Exception e) {
           // 오류 로깅
           logger.error("초기화 실패", e);
           // 대체 초기화 또는 정상 상태 유지 전략
       }
   }
   ```

3. **비동기 초기화 패턴**
   ```java
   @Component
   public class AsyncInitService {
       @Autowired
       private TaskExecutor taskExecutor;
       
       @PostConstruct
       public void init() {
           taskExecutor.execute(() -> {
               // 시간 소요 작업 비동기 수행
           });
       }
   }
   ```

## 자주 발생하는 실수

```java
// ❌ 잘못된 접근법
@Component
public class WrongService {
    @PostConstruct
    private void init() {  // private은 작동하지만 권장되지 않음
        // 초기화 코드
    }
    
    // ❌ 다음 메서드는 호출되지 않음
    public void manualInit() {
        // @PostConstruct 없음
    }
}

// ✅ 올바른 접근법
@Component
public class CorrectService {
    @PostConstruct
    public void init() {
        // 초기화 코드
    }
    
    // 외부에서 직접 호출
    public void reset() {
        cleanup();  // 내부 정리
        init();     // 재초기화
    }
    
    @PreDestroy
    public void cleanup() {
        // 정리 코드
    }
}
```

## 📝 점검 문제

### 문제: 다음 코드의 문제점을 찾으세요
```java
@Component
public class CacheService {
    @Autowired
    private DataSource dataSource;
    
    @PostConstruct
    public void initialize() {
        try {
            Connection conn = dataSource.getConnection();
            // 데이터 로드 작업...
            conn.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
```

**해설**: 이 코드의 주요 문제는 `@PostConstruct` 메서드에서 예외를 적절히 처리하지 않는 점입니다. `printStackTrace()`만 호출하고 계속 진행되면 애플리케이션이 손상된 상태로 실행될 수 있습니다. 초기화에 실패했을 때 적절한 오류 보고와 함께 애플리케이션 시작을 중단하거나, 대체 초기화 로직을 수행해야 합니다. 또한 try-with-resources를 사용하여 연결을 보다 안전하게 관리해야 합니다.
