# [역할]
너는 숙련된 소프트웨어 아키텍트이자 테크니컬 라이터(Technical Writer)야. 내가 제공하는 프로젝트 컨텍스트와 각 섹션의 요구사항에 따라, 매우 상세하고 체계적인 기술 문서를 작성해야 해.

# [목표]
소프트웨어 프로젝트의 전체 구조, 설계, 구현 세부사항을 포함하는 포괄적인 기술 문서를 생성한다. 이 문서는 신규 참여자가 프로젝트를 빠르게 이해하고, 기존 참여자가 유지보수 및 기능 확장을 용이하게 할 수 있도록 돕는 것을 목표로 한다.

# [PROJECT CONTEXT] - 이 부분을 먼저 채워주세요!
* **프로젝트 이름:** `[예: 커리어 관리형 블로그 플랫폼]`
* **프로젝트 한 줄 요약:** `[예: 개발자들의 학습 및 이직 과정을 기록하고 공유하는 웹 서비스]`
* **주요 기술 스택:**
    * **Backend Language & Framework:** `[예: Java 17, Spring Boot 3.1]`
    * **Frontend Language & Framework:** `[예: TypeScript, React, Next.js]`
    * **상태 관리 (Frontend):** `[예: Jotai, Recoil, Redux Toolkit]`
    * **라우팅 (Frontend):** `[예: React Router, Next.js App Router]`
    * **Relational Database (RDBMS):** `[예: MariaDB 10.6]`
    * **NoSQL Database:** `[예: MongoDB, Redis (캐싱 및 특정 데이터 저장용)]`
    * **검색 엔진:** `[예: Elasticsearch]`
    * **빌드 및 배포:** `[예: Gradle, Docker, Jenkins, Kubernetes]`
    * **주요 라이브러리 및 외부 서비스:** `[예: Spring Security, JPA, QueryDSL, AWS S3, Google OAuth2]`

# [문서화 지침]
* 아래에 정의된 "문서 구조"를 섹션별로 순서대로 따라야 한다.
* `[PROJECT CONTEXT]`에 명시된 기술 스택의 용어와 특성을 정확하게 반영하여 설명해야 한다.
* 설명이 필요한 곳에는 `[예: ...]`와 같이 구체적인 예시를 포함시켜야 한다.
* 코드 조각은 마크다운 코드 블록으로 감싸고, 언어 종류를 명시해야 한다.
* 엔티티 관계, 아키텍처, 플로우 차트 등은 Mermaid.js 문법을 사용하여 다이어그램으로 시각화하는 것을 권장한다.

---

## 문서 구조 (Table of Contents)

### Section 1: 프로젝트 개요 및 구조

1.1. **High-Level Architecture:**
    * 프로젝트의 주요 구성요소(Frontend, Backend, Databases, 외부 서비스 등)와 그들 간의 상호작용을 설명하는 다이어그램과 텍스트를 작성하라.
1.2. **모듈 상세 (특히 Backend):**
    * 최상위 패키지(`[예: com.example.project]`)와 그 하위 패키지(controller, service, repository, domain, config, util 등)의 역할과 목적을 상세히 설명하라.
    * 검색 엔진, 메시징 큐 등 주요 기술별 패키지가 있다면 그것도 포함하라.
1.3. **Technology Stack:**
    * `[PROJECT CONTEXT]`에 명시된 모든 기술, 프레임워크, 라이브러리를 나열하고, 각 기술이 프로젝트에서 어떤 역할을 담당하는지 구체적인 버전과 함께 설명하라.
1.4. **빌드 & 배포 (Build & Deployment):**
    * 빌드 도구(`[예: Gradle, Maven, Webpack]`)를 사용한 빌드 프로세스 개요를 설명하라.
    * 배포 전략(e.g., Docker 이미징, CI/CD 파이프라인)을 요약하여 설명하라.
1.5. **주요 환경 설정 파일:**
    * `application.yml` (or `.properties`), `database.properties`, `jwt.secret` 등 중요한 설정 파일의 위치와 주요 설정 항목에 대해 설명하라.

### Section 2: API 명세 (Controller Layer)

*참고: 가능하다면 Swagger/OpenAPI 문서의 링크를 포함하고, 이 섹션은 주요 흐름을 보완하는 서사적 설명으로 구성하라.*

각 주요 Controller (`[예: PostController, AuthController, CommentController...]`)에 대해 다음을 반복하라:
2.x.1. **Controller 목적:** 이 컨트롤러의 전반적인 책임과 역할을 설명하라.
2.x.2. **Base Path:** 이 컨트롤러의 기본 API 경로를 명시하라. (예: `/api/posts`)

각 API Endpoint에 대해 다음을 상세히 기술하라:
* **Method & Full Path:** 예: `POST /api/posts`
* **설명:** 이 엔드포인트가 수행하는 작업에 대한 명확한 설명.
* **경로 변수 (Path Variables), 쿼리 파라미터 (Query Parameters):** 이름, 타입, 필수/선택 여부, 설명을 포함하여 목록화.
* **Request Body (DTO):**
    * 사용되는 DTO 클래스 이름 (예: `PostCreateRequestDto`).
    * 각 필드에 대한 설명: 필드명, 타입, 제약 조건 (예: `@NotNull`, `@Size(max=50)`), 그리고 예시 JSON.
* **Response Body (DTO - 성공):**
    * 성공 시(HTTP 200, 201) 반환되는 DTO 클래스 이름 (예: `PostDetailResponseDto`, `List<PostSummaryResponseDto>`).
    * 각 필드에 대한 설명과 예시 JSON.
* **주요 에러 응답:**
    * 일반적인 HTTP 상태 코드(400, 401, 403, 404, 500)가 어떤 상황에서 발생하는지 설명.
    * 표준 에러 응답 DTO(`[예: ErrorResponseDto(timestamp, status, errorCode, message)]`)의 구조를 설명.
    * 이 엔드포인트와 관련된 특정 `errorCode` 문자열과 그 의미를 나열.
* **보안 및 권한:** 필요한 역할/권한을 명시 (예: `USER`, `ADMIN`, `PUBLIC`).
* **호출되는 주요 서비스 메서드:** 이 엔드포인트가 주로 호출하는 서비스 계층의 메서드를 명시하라 (예: `postService.createPost(...)`).
* **기타:** 속도 제한(Rate Limiting), 특이 동작 등 관련 정보가 있다면 기재.

### Section 3: 백엔드 - 서비스 레이어

각 주요 Service 클래스 (`[예: PostService, UserService, NotificationService...]`)에 대해 다음을 반복하라:
3.x.1. **서비스 목적:** 이 서비스의 전반적인 책임과 비즈니스 로직 처리 역할을 설명하라.
3.x.2. **주요 Public 메서드:**

각 주요 메서드에 대해 다음을 상세히 기술하라:
* **메서드 시그니처:** `[예: public Post createPost(PostCreateRequestDto dto, Long userId)]`
* **로직 상세 설명:** 수행하는 비즈니스 규칙, 알고리즘, 데이터 처리 과정을 단계별로 설명.
* **다른 서비스/리포지토리와의 상호작용:** 어떤 다른 서비스의 메서드나 리포지토리의 메서드를 호출하는지 설명.
* **트랜잭션(`@Transactional`) 동작:** 트랜잭션의 전파 레벨(propagation), 격리 수준(isolation), 읽기 전용(read-only) 여부, 롤백 규칙 등 중요하거나 기본값이 아닌 설정을 설명.
* **주요 부수 효과 (Side Effects):** 이메일 발송, SSE 이벤트 발생, 메시지 큐에 메시지 전송 등 외부 시스템에 영향을 주는 동작이 있다면 명시.

### Section 4: 백엔드 - 데이터 접근 레이어 (Repositories)

각 Repository 인터페이스 (`[ORM/데이터 매퍼]` 및 `[NoSQL 데이터베이스]` 용)에 대해 다음을 반복하라:
4.x.1. **목적 및 관리 대상 엔티티/도큐먼트:** 이 리포지토리가 어떤 엔티티 또는 도큐먼트를 관리하는지 명시.
4.x.2. **Custom Query 메서드:**
    * 표준 CRUD(e.g., `findById`, `save`)를 넘어서는 커스텀 쿼리 메서드 목록을 작성.
    * JPA의 Derived Query, `@Query` 어노테이션 메서드 등을 포함.
    * 각 커스텀 쿼리의 목적과 사용 이유를 설명.
    * 복잡한 JPQL/SQL 또는 NoSQL 쿼리의 경우, 쿼리 문자열 전체와 그에 대한 상세한 설명을 포함.

### Section 5: 백엔드 - 도메인 모델 (Entities & Documents)

각 `[ORM/데이터 매퍼]` 엔티티에 대해 다음을 기술하라:
5.x.1. **클래스명 및 매핑된 테이블:**
5.x.2. **목적:** 이 엔티티가 표현하는 비즈니스 도메인 개념을 설명.
5.x.3. **필드:** 각 필드의 이름, Java 타입, DB 컬럼명/타입, 제약조건(`@Column` 속성 등).
5.x.4. **관계 (`@ManyToOne`, `@OneToMany` 등):**
    * 다른 엔티티와의 관계를 명시.
    * 상대 엔티티, fetch 타입, cascade 옵션, join column, 소유권(ownership) 등을 상세히 설명.
5.x.5. **기본 키 (Primary Key):** 생성 전략(`GenerationType`)을 설명. 복합 키의 경우 상세히 설명.
5.x.6. **인덱스 (Indexes):** 성능에 중요한 영향을 미치는 데이터베이스 인덱스를 설명.
5.x.7. **Named Entity Graphs:** 정의된 엔티티 그래프가 있다면 그 목적과 정의를 설명.

각 `[NoSQL 데이터베이스]` 도큐먼트에 대해 다음을 기술하라:
5.y.1. **클래스명 및 매핑된 컬렉션:**
5.y.2. **목적:** 이 도큐먼트가 저장하는 데이터의 목적을 설명.
5.y.3. **필드:** 각 필드의 이름, Java 타입, `@Field` 어노테이션, 데이터 구조.
5.y.4. **인덱스 (Indexes):** 쿼리 성능을 위해 생성된 중요한 MongoDB 인덱스를 설명.

### Section 6: 공통 관심사 (Cross-Cutting Concerns)

6.1. **보안 설정 (`SecurityConfig.java` 등):**
    * Filter chain, authentication manager, CSRF/CORS 설정, 세션 관리, 경로 기반 인가 규칙에 대한 상세 설명.
    * **JWT/OAuth2:** 관련 유틸리티 클래스, 토큰 구조, 생성/검증/재발급 로직을 설명. OAuth2 흐름(provider, `oauth2Service`)을 설명.
6.2. **전역 예외 처리 (`GlobalExceptionHandler.java` 등):**
    * 특정 예외들이 어떻게 공통 에러 응답(`ErrorResponse.java`)으로 매핑되어 HTTP 응답으로 변환되는지 설명.
6.3. **캐싱 (`[예: Redis]`):**
    * 캐싱 설정 클래스(`[예: RedisConfig.java]`)와 캐싱 서비스(`[예: RedisService.java]`)를 설명.
    * 무엇이 캐시되는지, 캐싱 전략(e.g., Write-Around, Write-Through), TTLs.
6.4. **비동기 처리/메시징 (존재시):**
    * `@Async` 사용, SSE, 메시지 큐(Kafka, RabbitMQ) 등 비동기 작업의 종류와 목적을 설명.
6.5. **로깅 전략:**
    * 로깅의 핵심 측면, 중요한 로그 형식/마커(marker), 로그 레벨 정책 등을 설명.
6.6. **스케줄링된 작업 (존재시):**
    * `@Scheduled` 등을 이용한 배치 작업이 있다면, 그 목적과 실행 주기를 설명.

### Section 7: 주요 기능 플로우 (시각화)

*Mermaid.js와 같은 도구를 사용하여 순서 다이어그램(sequence diagram), 활동 다이어그램(activity diagram)으로 시각화하라.*

7.1. **사용자 인증 흐름:**
    * 회원가입 (이메일 인증 포함 시 그 과정 포함)
    * 로그인 (JWT 발급 과정)
    * 토큰 재발급
    * OAuth2 로그인
7.2. **핵심 기능 흐름:**
    * 게시글 생성 (파일 업로드, 해시태그 처리, 카테고리 연결, 알림 생성 포함)
    * 게시글 피드 조회 (메인, 태그별, 사용자별 등 다양한 조건에서의 데이터 취합 과정)
    * 댓글 생성 (알림 생성 포함)
    * 사용자 프로필 조회 및 수정
7.3. **실시간 알림 흐름 (SSE 등):**
    * 이벤트 트리거부터 클라이언트에게 전달되기까지의 전체 흐름.

### Section 8: 트랜잭션 플로우 다이어그램 (Backend)

*데이터 일관성이 매우 중요한 핵심적인 데이터 변경 서비스 메서드에 대해 작성.*
(예: `postService.postWriteSave`, `userService.join`, `postService.updatePostByPostId`)

* 트랜잭션 경계를 명시한 다이어그램.
* 트랜잭션 내의 주요 작업 순서 (엔티티 조작, 리포지토리 호출).
* 영향을 받는 데이터베이스 테이블.
* 핵심적인 커밋/롤백 지점 및 조건.

### Section 9: 프론트엔드 개요 (High-Level)

9.1. **아키텍처:** `[프론트엔드 프레임워크]` 기반의 아키텍처, `[상태 관리 라이브러리]`를 사용한 상태 관리 패턴, `[라우팅 라이브러리]`를 사용한 라우팅 전략을 설명.
9.2. **프로젝트 구조:** `src` 폴더 내의 핵심 디렉토리(components, pages/views, api, store/hooks, utils 등)와 그 역할을 설명.
9.3. **핵심 컴포넌트/페이지:** 재사용 가능한 주요 UI 컴포넌트와 핵심 페이지들을 간략히 설명.
9.4. **API 연동:** 백엔드 API를 호출하고 인증 토큰을 처리하는 일반적인 접근 방식(e.g., Axios instance, React Query/SWR)을 설명.
9.5. **빌드 프로세스:** `npm run build` 또는 `yarn build` 시 발생하는 주요 과정 (Transpiling, Bundling, Minifying)을 설명.

### Section 10: SEO 컴포넌트 개요 (해당 시)

10.1. **아키텍처:** Node.js 기반의 SSR/SSG 목적과 구현 방식을 설명. (예: Next.js)
10.2. **상호작용:** 이 SEO 컴포넌트가 메인 프론트엔드 및 백엔드와 어떻게 통합되고 데이터를 주고받는지 설명.

### Section 11: 데이터베이스 스키마

11.1. **관계형 데이터베이스 (RDBMS):**
    * ERD(Entity-Relationship Diagram). (Mermaid.js로 표현 가능)
    * SQL을 통해 생성된 각 테이블의 정의(DDL).
11.2. **NoSQL 데이터베이스:**
    * 주요 컬렉션의 스키마 설계.
    * 필드, 데이터 타입, 예상되는 데이터 형태를 보여주는 예시 도큐먼트(JSON).

### Section 12: 부록 (Appendix)

12.1. **용어집 (Glossary):** 프로젝트 고유의 용어나 약어를 정의.
12.2. **신규 개발자 환경 설정 가이드:** 로컬 개발 환경을 설정하기 위한 간결하고 명확한 단계별 가이드 (필요한 소프트웨어 설치, 코드 클론, 환경 변수 설정, 빌드 및 실행 명령어 등).
