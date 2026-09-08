## 3. 기술 스택

아래 목록은 동시에 도입할 확정 스택이 아니라 후보군입니다. `또는`, `or`, `?`로 표시된 항목은 결정되지 않았으며, 한 계층에서 중복 역할을 하는 도구는 운영 주체와 전환 비용을 비교해 하나의 기본값을 선택해야 합니다.

### 3.1 Frontend

- **핵심 프레임워크**: React + Next.js, Flutter
- **상태 관리**: Redux 또는 Context API
- **스타일링**: Tailwind CSS, Emotion
- **데이터 시각화**: Chart.js, D3.js
- **UI 컴포넌트**: Material-UI 또는 Chakra UI
- **HTTP 클라이언트**: Axios


### 3.2 Backend

- **핵심 프레임워크**: Spring Boot
- **API 문서화**: Swagger
- **인증/인가**: Spring Security, OAuth, JWT 
- **테스트**: JUnit, Mockito
- **로깅**: Logback, ELK Stack
- **API 게이트웨이 후보**: Spring Cloud Gateway 또는 GraphQL Gateway
    - REST 라우팅·인증·레이트 리밋이 중심이면 Spring Cloud Gateway, 클라이언트별 질의 조합이 필수이면 GraphQL을 검토
    - 외부 API 계약과 장애 격리 방식이 정해질 때까지 결정 보류

### 3.3 AI Module

- **자연어 처리**: OpenAI GPT API
- **감정 분석**: VADER, TextBlob
- **머신러닝 프레임워크**: TensorFlow, PyTorch
- **데이터 처리**: Pandas, NumPy
- **API 서빙**: Flask 또는 FastAPI


### 3.4 Database

- **관계형 데이터베이스 후보**: PostgreSQL, MariaDB, MySQL 중 하나
    - 사용자 정보, 메타데이터 등 구조화된 데이터 저장
- **NoSQL 데이터베이스**: MongoDB
    - 일기 내용, 분석 결과 등 비정형 데이터 저장
- **캐싱**: Redis
    - 성능 최적화 및 세션 관리


### 3.5 DevOps

- **컨테이너화**: Docker
- **CI/CD**: GitHub Actions, Jenkins, Ansible
- **모니터링**: Prometheus, Grafana
- **클라우드 인프라 후보**: JCloud(정확한 제품·서비스 범위 확인 필요)

### 3.6 선정 완료 기준

기술 선택은 이름을 나열하는 것으로 완료되지 않습니다. 각 계층별로 담당자, 지원 버전, 라이선스·비용, 배포 방식, 장애 시 대체 경로를 기록하고 최소 기능 검증 결과를 남긴 뒤 `선정` 상태로 변경합니다. React/Next.js와 Flutter처럼 플랫폼 범위가 다른 후보는 대상 클라이언트를 먼저 확정합니다.
