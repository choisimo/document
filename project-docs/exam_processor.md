# 시험지 AI 분석 및 해결 에이전트 설계: OCR부터 지능형 솔루션까지

시험지를 자동으로 분석하고 맞춤형 해결책을 제공하는 AI 에이전트 시스템을 설계해보겠습니다. 이 시스템은 이미지 파일로부터 문제를 추출하고, 분류하며, 사용자의 목표에 맞는 중간 유도 과정을 설계하고 검증하는 엔드투엔드 솔루션입니다.

## 시스템 아키텍처 개요

이 시스템은 다음과 같은 주요 모듈로 구성됩니다:

1. **입력 처리 및 OCR 모듈**: PDF/이미지에서 텍스트 추출
2. **문제 분류 모듈**: 추출된 문제를 유형별로 분류하고 태그 부여
3. **AI 추론 모듈**: 목표 달성을 위한 중간 유도 과정 설계
4. **검증 모듈**: 설계된 해결 방안 검증
5. **데이터베이스 관리 모듈**: 결과 저장 및 캐싱
6. **사용자 인터페이스**: 문제 필터링 및 결과 조회

### 데이터 흐름

1. 사용자가 시험지 이미지(PDF/JPG) 업로드
2. OCR을 통해 텍스트 추출 및 문제 인식
3. 문제 분류 및 태그 부여
4. 사용자가 목표 설정
5. AI 에이전트가 중간 유도 과정 설계
6. 설계된 과정 검증 및 필요시 개선
7. 결과 저장 및 캐싱
8. 사용자에게 결과 제공

## 상세 모듈 설계

### 1. 입력 처리 및 OCR 모듈

OCR 처리를 위해 네이버 클로바 OCR이나 Tesseract를 활용하여 한글 텍스트 인식을 최적화합니다[2].

```python
import fitz  # PyMuPDF
import cv2
import requests
import base64
import uuid
import time

class DocumentProcessor:
    def __init__(self, ocr_api_key):
        self.ocr_api_key = ocr_api_key
        
    def convert_pdf_to_images(self, pdf_path):
        """PDF를 이미지로 변환"""
        doc = fitz.open(pdf_path)
        images = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap()
            img_path = f"temp_{i}.png"
            pix.save(img_path)
            images.append(img_path)
        return images
    
    def perform_ocr(self, image_path):
        """네이버 클로바 OCR로 텍스트 추출"""
        # 이미지 전처리
        img = cv2.imread(image_path)
        # 그레이스케일 변환 및 노이즈 제거 로직
        
        # OCR API 호출 및 결과 파싱
        # ...
        
        return extracted_text
```

### 2. 문제 분류 모듈

문제를 자동으로 분류하고 태그를 부여하는 모듈입니다[5].

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import openai

class ProblemClassifier:
    def __init__(self, ai_api_key):
        self.ai_api_key = ai_api_key
        self.vectorizer = TfidfVectorizer()
        
    def cluster_problems(self, problems, n_clusters=5):
        """문제 클러스터링"""
        features = self.vectorizer.fit_transform([p['content'] for p in problems])
        kmeans = KMeans(n_clusters=n_clusters)
        clusters = kmeans.fit_predict(features)
        
        for i, problem in enumerate(problems):
            problem['cluster'] = int(clusters[i])
        
        return problems
    
    def assign_tags_with_ai(self, problems):
        """AI를 사용하여 문제에 태그 부여"""
        openai.api_key = self.ai_api_key
        
        for problem in problems:
            prompt = f"다음 문제의 주제와 유형을 3개의 태그로 분류해주세요:\n\n{problem['content']}"
            
            # API 호출 및 태그 추출
            # ...
            
            problem['tags'] = tags
        
        return problems
```

### 3. AI 추론 모듈

목표에 맞는 중간 유도 과정을 설계하는 모듈입니다[1][13].

```python
import openai
import json
import time

class AIReasoningAgent:
    def __init__(self, api_key):
        self.api_key = api_key
        openai.api_key = api_key
        
    def design_solution_process(self, problem, goal):
        """목표에 맞는 중간 유도 과정 설계"""
        prompt = f"""
        문제: {problem['content']}
        목표: {goal}
        위 문제에서 목표를 달성하기 위한 중간 유도 과정을 단계별로 설계해주세요.
        """
        
        # ChatGPT API 호출 및 결과 파싱
        # ...
        
        return solution_process
    
    def validate_solution(self, problem, goal, solution_process):
        """설계된 해결 과정 검증"""
        prompt = f"""
        문제: {problem['content']}
        목표: {goal}
        제안된 해결 과정: {json.dumps(solution_process)}
        위의 해결 과정이 목표 달성에 적합한지 검증해주세요.
        """
        
        # API 호출 및 검증 결과 파싱
        # ...
        
        return validation_result
```

### 4. 데이터베이스 관리 모듈

MariaDB를 사용하여 결과를 저장하고 캐싱 전략을 구현합니다[6].

```python
import pymysql
import hashlib
import json
import redis

class DatabaseManager:
    def __init__(self, db_config, redis_config=None):
        self.db_config = db_config
        self.redis_config = redis_config
        self.conn = None
        self.redis_client = None
        self.connect_db()
        
        if redis_config:
            self.connect_redis()
    
    def save_solution(self, problem_id, goal, solution_process, execution_time, validation_result):
        """해결 과정 저장"""
        with self.conn.cursor() as cursor:
            sql = """
            INSERT INTO solutions 
            (problem_id, goal, intermediary_steps, final_result, execution_time, validation_result)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                problem_id,
                goal,
                json.dumps(solution_process['steps']),
                solution_process.get('final_result', ''),
                execution_time,
                json.dumps(validation_result)
            ))
            solution_id = cursor.lastrowid
        
        self.conn.commit()
        return solution_id
    
    def get_cached_solution(self, problem, goal):
        """캐시된 해결 과정 조회"""
        problem_hash = hashlib.sha256(problem['content'].encode()).hexdigest()
        goal_hash = hashlib.sha256(goal.encode()).hexdigest()
        
        # Redis 및 DB 조회 로직
        # ...
        
        return cached_solution
```

## 데이터베이스 스키마

### 주요 엔티티 및 속성

1. **Problem 테이블**
   - id (PK): 문제 고유 ID
   - content: 문제 텍스트
   - image_path: 원본 이미지 경로
   - problem_type: 문제 유형
   - difficulty: 난이도
   - tags: 태그 목록 (JSON)
   - created_at: 생성 시간

2. **Solution 테이블**
   - id (PK): 솔루션 고유 ID
   - problem_id (FK): 연결된 문제 ID
   - goal: 설정된 목표
   - intermediary_steps: 중간 유도 과정 (JSON)
   - final_result: 최종 결과
   - execution_time: 수행 시간
   - validation_result: 검증 결과 (JSON)
   - created_at: 생성 시간

3. **Cache 테이블**
   - id (PK): 캐시 고유 ID
   - problem_hash: 문제 해시값
   - goal_hash: 목표 해시값
   - solution_id (FK): 솔루션 ID
   - created_at: 생성 시간
   - last_used: 마지막 사용 시간

## 메인 애플리케이션 클래스

전체 시스템을 통합하는 메인 클래스입니다:

```python
class ExamProcessingAgent:
    def __init__(self, ocr_api_key, ai_api_key, db_config, redis_config=None):
        self.document_processor = DocumentProcessor(ocr_api_key)
        self.problem_classifier = ProblemClassifier(ai_api_key)
        self.ai_agent = AIReasoningAgent(ai_api_key)
        self.db_manager = DatabaseManager(db_config, redis_config)
    
    def process_exam(self, file_path):
        """시험지 처리 및 문제 추출"""
        # 파일 처리, OCR, 문제 추출 로직
        # ...
        
        return problems
    
    def solve_problem(self, problem, goal):
        """문제에 대한 목표 달성 과정 설계 및 검증"""
        # 캐싱 확인, 중간 유도 과정 설계, 검증 로직
        # ...
        
        return result
    
    def filter_problems(self, tags=None, difficulty=None):
        """태그와 난이도로 문제 필터링"""
        return self.db_manager.get_problems_by_tags_and_difficulty(tags, difficulty)
```

## 구현 전략

### 1. OCR 전략

네이버 클로바 OCR은 한글 인식에 뛰어난 성능을 보이며, 특히 스캔된 시험지와 같은 이미지에서 텍스트를 추출하는 데 적합합니다[2]. 전처리 과정에서 이미지 품질을 향상시켜 OCR 정확도를 높일 수 있습니다[20].

### 2. 문제 분류 전략

텍스트 기반 분류를 위해 TF-IDF와 K-means 클러스터링을 사용하고, 더 정교한 태그 부여를 위해 LLM을 활용합니다[5]. 이는 비슷한 유형의 문제를 효과적으로 그룹화할 수 있게 해줍니다.

### 3. AI 추론 전략

다음과 같은 에이전트 패턴을 적용합니다[13]:
- **반성(Reflection) 패턴**: AI가 자신의 출력을 비판적으로 검토하고 수정
- **도구(Tool) 패턴**: 외부 API나 계산 도구를 활용
- **계획(Planning) 패턴**: 여러 단계를 계획하여 논리적으로 문제 해결

### 4. 캐싱 전략

효율적인 캐싱을 위해 두 가지 방식을 사용합니다[6]:
- **정확 키 캐싱**: 동일한, 정확히 같은 문제와 목표에 대한 빠른 조회
- **의미론적 캐싱**: 유사한 문제와 목표에 대한 대응

## 프로젝트 실행 흐름

1. **초기 설정**
   ```python
   # 설정
   ocr_api_key = "YOUR_NAVER_CLOVA_OCR_API_KEY"
   ai_api_key = "YOUR_OPENAI_API_KEY"
   
   db_config = {
       'host': 'localhost',
       'user': 'root',
       'password': 'password',
       'db': 'exam_processing'
   }
   
   # 에이전트 초기화
   agent = ExamProcessingAgent(ocr_api_key, ai_api_key, db_config)
   ```

2. **시험지 처리**
   ```python
   file_path = "sample_exam.pdf"
   problems = agent.process_exam(file_path)
   
   for problem in problems:
       print(f"문제: {problem['content'][:50]}...")
       print(f"태그: {problem['tags']}")
       print(f"난이도: {problem['difficulty']}")
   ```

3. **문제 해결**
   ```python
   problem = problems[0]
   goal = "이 미분 방정식의 일반해 구하기"
   
   solution = agent.solve_problem(problem, goal)
   
   print(f"중간 단계:")
   for step in solution['intermediary_steps']:
       print(f"  단계 {step['step']}: {step['description']}")
   print(f"최종 결과: {solution['final_result']}")
   ```

4. **문제 필터링**
   ```python
   # 특정 태그와 난이도로 문제 필터링
   calculus_problems = agent.filter_problems(tags=["미분", "적분"], difficulty="중급")
   ```

## 추가 고려사항 및 개선점

1. **OCR 엔진 다양화**
   - 다양한 OCR 엔진을 통합하여 정확도 향상[19]
   - 수식과 같은 특수 형태의 텍스트를 위한 전문 OCR 엔진 추가[3]

2. **다국어 지원**
   - 영어, 한국어 외 다양한 언어의 시험지 처리 가능하도록 확장

3. **AI 성능 최적화**
   - 반성(Reflection) 패턴과 계획(Planning) 패턴을 결합하여 더 정교한 해결책 개발[13]
   - 에이전트가 자체 성능을 평가하고 개선하는 메커니즘 구현

4. **성능 최적화**
   - 병렬 처리를 통한 대규모 시험지 일괄 처리 기능
   - 분산 컴퓨팅 및 비동기 처리로 처리 속도 향상

5. **보안 및 사용자 관리**
   - 사용자 인증 및 권한 관리 기능 추가
   - 데이터 암호화 및 개인정보 보호 강화

6. **사용자 피드백 시스템**
   - 사용자 피드백을 통한 AI 모델 지속적 개선
   - 잘못된 OCR 결과나 부정확한 문제 해결에 대한 피드백 수집

7. **캐싱 전략 고도화**
   - 유사 문제에 대한 의미론적 캐싱 구현[6]
   - 자주 사용되는, 접근 패턴을 고려한 캐시 관리 전략

8. **시각적 분석 도구**
   - 해결 과정을 시각화하는 도구 추가
   - 문제 유형별, 난이도별 통계 분석 기능

## 결론

이 시스템은 OCR, NLP, 그리고 LLM을 결합하여 시험지를 자동으로 분석하고 맞춤형 해결책을 제공하는 종합적인 솔루션입니다. 파이썬 백엔드와 MariaDB를 기반으로 하며, 효율적인 캐싱 전략을 통해 반복 계산을 최소화합니다. 이러한 접근 방식은 교육 분야에서 학생 및 교사를 지원하는 강력한 도구가 될 수 있으며, 지속적인 개선과 확장을 통해 더욱 정교한 시스템으로 발전할 수 있습니다.
