Spring Boot 프로젝트의 디렉토리 구조는 기본적으로 자유도가 높지만, 팀 규모나 프로젝트 복잡도에 따라 일관적이고 가독성 높은 구조를 갖추는 것이 장기적으로 유지보수 및 확장성에 큰 도움이 됩니다. 전통적으로 많이 사용되는 패턴은 “레이어드 아키텍처(Layered Architecture)” 형태를 취하면서, 점차 도메인 중심의 패키지 구조로 정리하는 것이 대중적이며 편리합니다.

아래는 대표적인 디렉토리 구조 예시와 그에 대한 설명입니다.

```
src
 └─ main
     ├─ java
     │   └─ com.example.project
     │       ├─ config
     │       │   └─ (전역 설정, Security, WebMvcConfigurer, DB 설정 등)
     │       ├─ domain
     │       │   ├─ model         // 엔티티(또는 도메인 객체), VO, DTO 등
     │       │   ├─ repository    // JPA Repository, MyBatis Mapper 등 영속성 계층
     │       │   ├─ service       // 비즈니스 로직 처리
     │       │   └─ exception     // 도메인 관련 예외 클래스
     │       └─ presentation
     │           ├─ controller    // REST Controller, Web Controller
     │           └─ advice        // Exception Handler 등 Cross-cutting Concern
     └─ resources
         ├─ application.yml        // 환경설정 파일
         └─ static / templates     // 정적 리소스(css, js) 및 템플릿 파일(Thymeleaf 등)
```

### 주요 포인트

1. **config 패키지**:  
   - WebMvcConfigurer, SecurityConfig, SwaggerConfig, DataSourceConfig 등 프로젝트 전반적으로 공통적으로 적용되는 설정들을 이곳에 모읍니다.
   - 설정 클래스를 한 곳에 모으는 것은 환경 설정 변경에 유용하고, 관리 포인트를 명확하게 해줍니다.

2. **domain 패키지**:  
   - **model(또는 entity, dto, vo)**: 비즈니스 도메인 핵심 객체를 정의하는 부분입니다. JPA Entity, DTO, VO 등을 목적에 따라 명확히 구분하는 것이 유지보수성에 좋습니다.
   - **repository**: 데이터베이스 접근 계층. JPA의 Repository 인터페이스나 MyBatis Mapper 인터페이스가 위치합니다.
   - **service**: 비즈니스 로직을 구현하는 계층으로, Controller와 Repository 사이를 중재하며 트랜잭션, 비즈니스 규칙 등을 처리합니다.
   - **exception**: 도메인 혹은 서비스 로직 실행 중 발생하는 커스텀 예외를 별도로 관리하여 예외처리에 체계성을 부여합니다.

3. **presentation 패키지(또는 controller)**:  
   - **controller**: 클라이언트(웹, API)와 직접적으로 소통하는 계층으로, 요청을 받고 응답을 반환하는 역할을 담당합니다.
   - **advice**: 전역적으로 예외를 처리하거나 Controller 전반에 걸쳐 적용되는 AOP 기반의 처리기(ControllerAdvice)나 ResponseEntityExceptionHandler 등을 통해 공통 로직을 분리합니다.

4. **resource 디렉토리**:  
   - `application.yml`과 같은 환경 설정 파일을 모아두고, 프로파일(profile)별로 다른 yml 파일을 둘 수도 있습니다.  
   - 정적 리소스(static), 템플릿(templates) 디렉토리는 Spring Boot가 기본적으로 제공하는 경로 구조를 그대로 사용합니다.

### 확장 방안

- **도메인별 패키지 구성**: 프로젝트가 커지고 도메인이 복잡해진다면, 단순히 레이어 기준으로 나누기보다, 도메인 단위로 패키지를 나누는 방법(예: `com.example.project.user.domain`, `com.example.project.user.service`, `com.example.project.order.domain` 등)을 고려할 수 있습니다. 이는 도메인 단위로 팀원들이 작업할 때 서로 간섭을 최소화하고, 추후 마이크로서비스로 분리할 때 유리한 구조를 갖게 합니다.
  
- **DDD(Domain Driven Design) 적용**: 더 나아가면 도메인 주도 설계를 접목하여 애그리거트(Aggregate) 단위로 패키지를 재구성하고, 도메인 서비스, 도메인 이벤트 등을 구조적으로 배치할 수도 있습니다.

정리하자면, 기본적으로 Controller - Service - Repository로 이어지는 전통적인 레이어드 아키텍처를 탑재한 뒤, 프로젝트 규모에 따라 도메인 중심으로 패키징을 세분화하는 전략이 가장 대중적이고 편리한 Spring Boot 프로젝트 구조라고 할 수 있습니다.