# Spring IoC, DI, AOP와 Bean 생명주기

이 문서는 개념 설명용 예제를 사용합니다. 어노테이션 패키지, 프록시 방식, 순환 참조 허용 여부는 Spring과 Java 버전에 따라 달라지므로 실제 프로젝트의 의존성과 설정을 기준으로 판정합니다.

## 1.1 IoC/DI (Inversion of Control/Dependency Injection)

### IoC 개념
- **제어 역전**: 애플리케이션 객체의 생성·연결·생명주기 일부를 컨테이너가 호출하는 구조
- **직접 생성**: 구체 타입을 내부에서 선택하면 교체 경계가 좁아질 수 있음
- **의존성 주입**: 필요한 협력 객체를 외부에서 전달해 구성 결정과 사용 로직을 분리

```java
// ❌ IoC 미적용
public class UserService {
    private UserRepository repo = new UserRepository();
}

// ✅ IoC 적용
@Service
public class UserService {
    private final UserRepository repo;
    
    @Autowired  // 생성자 주입
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
}
```

### DI 구현 방식 비교
| 유형 | 장점 | 단점 | 사용 사례 |
|------|------|------|----------|
| **생성자** | 필수 의존성을 생성 시점에 고정, 단위 테스트에서 명시적 | 파라미터가 많으면 책임 과다 신호 | 필수 협력 객체 |
| **Setter** | 선택 의존성을 나중에 교체 가능 | 준비 전 불완전 상태 허용 가능 | 명시적으로 선택적인 의존성 |
| **필드** | 선언이 짧음 | 컨테이너 없는 생성과 테스트가 불명확 | 프레임워크 제약을 검토한 제한적 사용 |

### @ComponentScan 동작 원리
```java
@SpringBootApplication
@ComponentScan(basePackages = "com.example.custom")
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```
- **탐색 경로**: `com.example.custom` 패키지 내 `@Component` 계열 어노테이션 검색
- **실패 사례**: `com.example.module` 패키지의 컴포넌트 누락 시 `NoSuchBeanDefinitionException` 발생

## 1.2 AOP (Aspect-Oriented Programming)

### 주요 요소
```java
@Aspect
@Component
public class LoggingAspect {
    
    // 포인트컷: 서비스 계층의 모든 메서드
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void serviceLayer() {}
    
    // Around Advice: 메서드 실행 시간 측정
    @Around("serviceLayer()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        System.out.println("Execution time: " + (System.currentTimeMillis()-start) + "ms");
        return result;
    }
}
```

### AOP 프록시 생성 과정
1. **빈 생성**: 대상 객체 인스턴스화
2. **프록시 감싸기**: `BeanPostProcessor`가 Advice 적용
3. **메서드 호출**: 프록시 체인을 통해 Advice 실행

## 1.3 Bean Lifecycle 관리

### 생명주기 단계
```mermaid
graph TD
    A[컨테이너 시작] --> B[빈 생성]
    B --> C[의존성 주입]
    C --> D[@PostConstruct]
    D --> E[사용 가능]
    E --> F[@PreDestroy]
```

### @PostConstruct/PreDestroy 사용
```java
@Service 
public class DatabaseConnector {
    
    @PostConstruct
    public void init() {
        System.out.println("DB 연결 수립"); 
    }
    
    @PreDestroy 
    public void cleanup() {
        System.out.println("DB 연결 해제");  
    }
}
```

---

## 🛠 **헷갈리는 개념 정리**
### Q1: 필드 주입 vs 생성자 주입
```java
// ❌ 필드 주입: 프레임워크에 종속적
@Service
public class WrongService {
    @Autowired
    private UserRepository repo;
}

// ✅ 생성자 주입: 불변성 보장
@Service 
public class CorrectService {
    private final UserRepository repo;
    
    public CorrectService(UserRepository repo) {
        this.repo = repo;
    }
}
```

### Q2: ComponentScan 누락 사례
```java
// com.example.main 패키지
@SpringBootApplication  // 기본 스캔 범위: com.example.main
public class App {}

// com.example.util 패키지
@Component  // 스캔 대상 아님 → NoSuchBeanDefinitionException
public class Util {}
```

---

## 📝 **점검 문제**
### 문제 1: 다음 코드의 문제점은?
```java
@Service
public class OrderService {
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    public OrderService(UserService userService) {
        // paymentService 사용 불가
    }
}
```
**해설**: 필드 주입과 생성자 주입 혼용. 생성자에서 `paymentService`가 초기화되지 않아 NPE 발생 가능

### 문제 2: @PostConstruct가 호출되지 않는 이유?
```java
public class CacheManager {
    @PostConstruct
    void init() { ... }  
}
```
**해설**: 빈으로 등록되지 않았으므로 생명주기 콜백 적용 안 됨
