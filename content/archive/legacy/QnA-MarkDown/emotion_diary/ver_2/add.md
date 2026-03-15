# 감정 일기장 분석기 시스템 흐름도 및 구조 설계

감정 일기장 분석기 프로젝트를 위한 시스템 흐름도와 함께 실제 구현에 필요한 프레임 구조 및 데이터베이스 설계안을 제시합니다. 또한 유사 서비스들의 구조를 비교 분석하여 최적의 설계 방향을 제안합니다.

## 시스템 흐름도 (Mermaid 코드)

아래는 감정 일기장 분석기의 주요 프로세스 흐름을 Mermaid 형식으로 표현한 코드입니다.

```mermaid
flowchart TD
    A[감정 기록 (일기 작성)] --> B[AI 감정 분석]
    B -->|긍정적 감정 우세| C[맞춤 활동 추천]
    C --> D{활동 수행 여부?}
    D -->|Yes| E[커뮤니티 경험 공유]
    D -->|No| F[대체 활동 추천]
    F --> G[감정 변화 추적]
    E --> G
    B -->|부정적 감정 우세| H[위기 개입 평가]
    H --> I{심각도 평가}
    I -->|심각도 높음| J[전문가 연결 안내]
    I -->|심각도 낮음| K[인지행동분석 모듈]
    K --> L[부정적 사고 패턴 식별]
    L --> M[사고 재구성 가이드]
    M --> N[대안적 사고 제시]
    N --> O[행동 활성화 전략]
    O --> P[자가 관리 가이드]
    P --> G
    J --> G
```

이 흐름도는 감정 일기 입력부터 AI 분석, 감정 유형별 대응 경로, 그리고 인지행동치료(CBT) 모듈까지의 전체 프로세스를 보여줍니다.

## 시스템 아키텍처 구조

### 전체 아키텍처 프레임

감정 일기장 분석기는 다음과 같은 주요 컴포넌트로 구성됩니다:

```mermaid
flowchart TD
    subgraph "Frontend"
        UI[사용자 인터페이스]
        VIS[데이터 시각화]
        EDI[일기 에디터]
    end
    
    subgraph "Backend"
        API[REST API]
        AUTH[인증/인가]
        BL[비즈니스 로직]
        CACHE[캐싱 시스템]
    end
    
    subgraph "AI Module"
        NLP[텍스트 처리]
        EA[감정 분석]
        CBT[인지행동치료 엔진]
        REC[추천 시스템]
    end
    
    subgraph "Database"
        RDB[관계형 DB]
        NOSQL[NoSQL DB]
        REDIS[Redis 캐시]
    end
    
    UI --> API
    VIS --> API
    EDI --> API
    API --> AUTH
    AUTH --> BL
    BL --> NLP
    BL --> CACHE
    NLP --> EA
    EA --> CBT
    EA --> REC
    BL --> RDB
    BL --> NOSQL
    CACHE --> REDIS
```

### 기술 스택 구성요소

#### 1. Frontend 프레임

```mermaid
flowchart TD
    subgraph "Frontend Framework"
        NEXT[Next.js]
        REACT[React]
        REDUX[Redux]
        TAILWIND[Tailwind CSS]
    end
    
    subgraph "UI Components"
        MUI[Material-UI]
        EDITOR[Rich Text Editor]
        CHARTS[Chart.js/D3.js]
    end
    
    subgraph "Communications"
        AXIOS[Axios]
        WS[WebSocket]
    end
    
    NEXT --> REACT
    REACT --> REDUX
    REACT --> TAILWIND
    REACT --> MUI
    REACT --> EDITOR
    REACT --> CHARTS
    REACT --> AXIOS
    REACT --> WS
```

#### 2. Backend 프레임

```mermaid
flowchart TD
    subgraph "Backend Framework"
        SPRING[Spring Boot]
        SECURITY[Spring Security]
        JPA[Spring Data JPA]
    end
    
    subgraph "API Layer"
        REST[REST Controllers]
        SWAGGER[Swagger]
        JWT[JWT Auth]
    end
    
    subgraph "Service Layer"
        BL[Business Logic]
        INTEG[AI Integration]
        CACHE[Cache Manager]
    end
    
    SPRING --> SECURITY
    SPRING --> JPA
    SPRING --> REST
    REST --> SWAGGER
    SECURITY --> JWT
    REST --> BL
    BL --> INTEG
    BL --> CACHE
```

#### 3. AI 모듈 프레임

```mermaid
flowchart TD
    subgraph "AI Core"
        GPT[OpenAI GPT API]
        NLP[NLP Processors]
        EMO[감정 분석 엔진]
    end
    
    subgraph "CBT Module"
        PAT[패턴 인식기]
        RES[사고 재구성]
        ACT[행동 활성화]
    end
    
    subgraph "API Layer"
        FLASK[Flask/FastAPI]
        INFER[추론 엔진]
    end
    
    GPT --> NLP
    NLP --> EMO
    EMO --> PAT
    PAT --> RES
    RES --> ACT
    EMO --> INFER
    PAT --> INFER
    INFER --> FLASK
```

## 데이터베이스 스키마 설계

### 관계형 데이터베이스 (PostgreSQL/MariaDB)

```mermaid
erDiagram
    USERS ||--o{ JOURNALS : writes
    USERS ||--o{ ACTIVITIES : performs
    JOURNALS ||--o{ EMOTION_ANALYSES : has
    EMOTION_ANALYSES ||--o{ RECOMMENDATIONS : generates
    EMOTION_ANALYSES ||--|{ COGNITIVE_PATTERNS : identifies
    
    USERS {
        int user_id PK
        string username
        string email
        string password_hash
        date created_at
        date last_login
        json preferences
    }
    
    JOURNALS {
        int journal_id PK
        int user_id FK
        datetime created_at
        text content
        json metadata
        boolean is_deleted
    }
    
    EMOTION_ANALYSES {
        int analysis_id PK
        int journal_id FK
        json emotion_scores
        boolean is_negative
        int severity_level
        datetime created_at
        json raw_analysis
    }
    
    COGNITIVE_PATTERNS {
        int pattern_id PK
        int analysis_id FK
        string pattern_type
        text distortion_content
        json alternatives
        int confidence_score
    }
    
    RECOMMENDATIONS {
        int recommendation_id PK
        int analysis_id FK
        string rec_type
        text content
        boolean is_completed
        datetime created_at
    }
    
    ACTIVITIES {
        int activity_id PK
        int user_id FK
        int recommendation_id FK
        string status
        datetime started_at
        datetime completed_at
        text feedback
    }
```

### NoSQL 데이터베이스 (MongoDB)

NoSQL 데이터베이스는 다음과 같은 컬렉션으로 구성됩니다:

1. `users` - 사용자 프로필 정보
2. `journals` - 일기 전체 내용과 메타데이터
3. `emotions` - 감정 분석 결과와 시계열 데이터
4. `cbt_sessions` - 인지행동치료 세션 정보와 진행 상태
5. `recommendations` - 사용자별 추천 활동 히스토리

## 인지행동치료(CBT) 모듈 상세 설계

### 인지행동 분석 모듈 구조

```mermaid
flowchart TD
    subgraph "CBT 모듈 활성화 조건"
        ND[부정적 감정 감지]
        SE[심각도 평가]
        SE -->|심각도 낮음| AC[CBT 모듈 활성화]
        SE -->|심각도 높음| PR[전문가 연결]
    end
    
    subgraph "인지적 왜곡 식별"
        PAT1[흑백논리 탐지]
        PAT2[과잉일반화 탐지]
        PAT3[재앙화 탐지]
        PAT4[감정적 추론 탐지]
        PAT5[마음읽기 탐지]
    end
    
    subgraph "사고 재구성"
        QUES[소크라테스식 질문 생성]
        ALT[대안적 해석 제시]
        EVID[증거 검토 가이드]
    end
    
    subgraph "행동 활성화"
        ACT1[단계적 과제 설계]
        ACT2[즐거운 활동 스케줄링]
        ACT3[성취감 경험 유도]
    end
    
    ND --> SE
    AC --> PAT1
    AC --> PAT2
    AC --> PAT3
    AC --> PAT4
    AC --> PAT5
    PAT1 --> QUES
    PAT2 --> QUES
    PAT3 --> QUES
    PAT4 --> QUES
    PAT5 --> QUES
    QUES --> ALT
    QUES --> EVID
    ALT --> ACT1
    EVID --> ACT1
    ACT1 --> ACT2
    ACT2 --> ACT3
```

## 유사 감정 분석 서비스와의 데이터베이스 구조 비교

### 1. 감정 분석 데이터셋 접근법 비교

현재 감정 분석 관련 데이터셋들은 다양한 방식으로 구조화되어 있습니다:

```mermaid
flowchart LR
    subgraph "우리 시스템"
        OUR1[6가지 기본 감정]
        OUR2[강도 측정(1-10)]
        OUR3[인지왜곡 유형 분류]
    end
    
    subgraph "EMOTIC 데이터셋"
        EMO1[26가지 감정 카테고리]
        EMO2[Valence-Arousal-Dominance]
    end
    
    subgraph "EmoBank"
        EB1[VAD 표현 방식]
        EB2[다중 장르 균형]
    end
    
    subgraph "ExpW 데이터셋"
        EX1[7가지 기본 표정 인식]
        EX2[91,793 얼굴 이미지]
    end
```

비교 분석 결과, 우리 시스템은 텍스트 기반 감정 분석에 초점을 맞추고 있으며, 인지왜곡 유형까지 분류하는 차별화된 접근법을 제공합니다.

### 2. 감정 분석 API 아키텍처 비교

현재 시장에 있는 감정 분석 API들과 우리 시스템의 비교:

```mermaid
flowchart TD
    subgraph "우리 시스템"
        OUR_A[OpenAI GPT 기반]
        OUR_B[인지행동치료 통합]
        OUR_C[맞춤형 활동 추천]
    end
    
    subgraph "IBM Watson NLU"
        IBM_A[5가지 감정 분류]
        IBM_B[감정 점수 제공]
    end
    
    subgraph "ParallelDots"
        PD_A[6가지 감정 분류]
        PD_B[신뢰도 점수]
    end
    
    subgraph "Symanto - Ekman"
        SE_A[기본 6가지 감정]
        SE_B[소셜 미디어 특화]
    end
```

## 프로젝트 구현 프레임워크

### 애자일 개발 방법론 적용

이 프로젝트는 애자일 방법론을 적용하여 8개의 스프린트로 개발됩니다:

```mermaid
gantt
    title 감정 일기장 분석기 개발 타임라인
    dateFormat  YYYY-MM-DD
    section 준비 단계
    스프린트 0 (요구사항/환경) :2025-04-15, 2w
    section 핵심 기능
    스프린트 1-2 (MVP 핵심) :2025-04-29, 4w
    section 기능 확장
    스프린트 3-4 (주요 기능) :2025-05-27, 4w
    section 분석 시스템
    스프린트 5-6 (분석/추천) :2025-06-24, 4w
    section 통합/완성
    스프린트 7-8 (정교화/통합) :2025-07-22, 4w
    section 출시
    베타 릴리스 :2025-08-19, 2w
    정식 출시 :2025-09-02, 2w
```

## 결론

감정 일기장 분석기는 현대인의 정신 건강 관리를 위한 혁신적인 솔루션입니다. 제시된 Mermaid 다이어그램과 시스템 설계는 이 서비스의 개발 방향을 명확히 하고, 특히 인지행동치료(CBT) 모듈을 통합함으로써 부정적 감정 감지 시 전문적인 개입이 가능한 차별화된 서비스를 구축할 수 있는 청사진을 제공합니다.

이 프로젝트는 사용자 중심의 AI 기반 정신 건강 관리 서비스로, 감정 데이터베이스 구축 및 패턴 인식을 통해 사용자의 정신 건강 증진에 기여할 것입니다.