# PostgreSQL 주요 명령어 및 활용 가이드

PostgreSQL 사용 시 자주 사용하는 `psql` 메타 커맨드와 SQL 문법을 정리한 가이드입니다. 실무에서 유용한 고급 예제들을 포함하고 있습니다.

---

## 적용 범위와 검증 기준

- **범위:** PostgreSQL 서버와 `psql`의 버전, 접속 데이터베이스, schema, role, locale와 extension을 기록합니다. 메타 명령과 SQL 기능은 버전에 따라 달라질 수 있습니다.
- **전제:** 예제는 권한과 transaction 상태를 확인한 비프로덕션 환경에서 먼저 실행합니다. DDL·대량 DML 전에는 영향 행, lock, WAL, 복제 지연과 rollback 방법을 정합니다.
- **사실과 추론:** 명령 결과와 `EXPLAIN (ANALYZE, BUFFERS)` 관측은 근거이고, index 선택이나 병목 설명은 계획과 통계 확인 전까지 추론입니다.
- **실패·완료:** SQL 오류, lock timeout, 부분 적용, 제약 위반과 복제 지연을 실패 조건으로 두고, 기대 행 수·schema·권한·성능과 복구 절차를 확인해야 작업 완료로 판정합니다.

---

## 1. psql 터미널 주요 명령어 (메타 커맨드)

`psql` 클라이언트 접속 상태에서 사용하는 명령어입니다. (세미콜론 `;` 불필요)

| 명령어 | 설명 | 비고 |
| :--- | :--- | :--- |
| `\l` | 전체 데이터베이스 목록 조회 | List databases |
| `\c [DB명]` | 특정 데이터베이스로 접속(이동) | Connect to DB |
| `\dt` | 현재 DB의 테이블 목록 조회 | List tables (대표적인 조회 명령) |
| `\dt+` | 테이블 목록과 **크기(Size)** 조회 | 상세 정보 포함 |
| `\d [테이블명]` | 테이블 구조(컬럼, 인덱스) 상세 확인 | Describe table |
| `\du` | 사용자(Role) 목록 및 권한 조회 | List users |
| `\dn` | 스키마(Schema) 목록 조회 | List schemas |
| `\conninfo` | 현재 접속 정보 확인 | 포트, IP, 소켓 정보 |
| `\x` | 쿼리 결과 세로 보기 토글 | Expanded display (긴 컬럼 볼 때 유용) |
| `\q` | psql 종료 | Quit |
| `\! [명령어]` | 쉘 명령어 실행 | 예: `\! clear`, `\! ls` |

---

## 2. 데이터 조회 및 조작 (DML)

### 기본 조회 (SELECT)
```sql
-- 모든 컬럼 조회
SELECT * FROM users;

-- 조건부 조회 + 정렬 + 제한
SELECT id, name, email 
FROM users 
WHERE age >= 20 AND is_active = true
ORDER BY created_at DESC 
LIMIT 10;

-- NULL 체크
SELECT * FROM users WHERE phone IS NULL;

-- 패턴 매칭 (LIKE, ILIKE)
SELECT * FROM users WHERE name LIKE '김%';      -- '김'으로 시작 (대소문자 구분)
SELECT * FROM users WHERE email ILIKE '%@gmail.com'; -- 대소문자 무시 검색
```

### 고급 조회 (JOIN, 집계)
```sql
-- INNER JOIN (교집합)
SELECT u.name, o.order_date, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.amount > 10000;

-- GROUP BY & HAVING (그룹핑 및 조건)
SELECT department, COUNT(*) as emp_count, AVG(salary) as avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) >= 50000;

-- Subquery (서브쿼리)
SELECT * FROM products 
WHERE price > (SELECT AVG(price) FROM products);
```

### 데이터 변경 (INSERT, UPDATE, DELETE)
```sql
-- 데이터 삽입 (RETURNING으로 삽입된 ID 반환)
INSERT INTO users (name, email, age) 
VALUES ('홍길동', 'hong@test.com', 25)
RETURNING id;

-- 대량 삽입 (Bulk Insert)
INSERT INTO users (name, email) VALUES 
('김철수', 'kim@test.com'),
('이영희', 'lee@test.com');

-- 데이터 수정
UPDATE users 
SET status = 'inactive', updated_at = NOW() 
WHERE last_login < '2023-01-01';

-- 데이터 삭제
DELETE FROM users WHERE id = 10;
```

---

## 3. 테이블 및 구조 관리 (DDL)

### 테이블 생성 및 인덱스
```sql
-- 테이블 생성
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INT CHECK (age >= 0),  -- 제약조건 추가
    meta_data JSONB,           -- JSON 타입 활용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_name ON users(name);

-- 복합 인덱스
CREATE INDEX idx_users_email_age ON users(email, age);
```

### 테이블 수정 (ALTER)
```sql
-- 컬럼 추가
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- 컬럼 타입 변경
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(100);

-- 기본값 설정
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;

-- 테이블 삭제
DROP TABLE IF EXISTS users CASCADE; -- CASCADE: 연관된 뷰/제약조건도 삭제
```

---

## 4. PostgreSQL 고급 기능

### 트랜잭션 (Transaction)
transaction은 여러 statement의 원자적 commit·rollback 경계를 제공하지만, 데이터 무결성은 constraint, isolation, application invariant와 오류 처리까지 함께 충족해야 합니다.
```sql
BEGIN;

UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;

-- 문제 없으면 저장
COMMIT;
-- 문제 발생 시 되돌리기
-- ROLLBACK;
```

### JSONB 활용
PostgreSQL은 강력한 NoSQL 기능(JSON)을 지원합니다.
```sql
-- JSON 데이터 삽입
INSERT INTO books (info) VALUES ('{"title": "Postgres Guide", "tags": ["db", "sql"]}');

-- JSON 필드 조회 (->> : 텍스트로 반환)
SELECT info->>'title' FROM books;

-- JSON 내 배열 검색 (특정 태그 포함 여부)
SELECT * FROM books WHERE info->'tags' ? 'db';
```

### 뷰 (View)
복잡한 쿼리를 가상 테이블로 저장하여 재사용합니다.
```sql
CREATE VIEW active_users_orders AS
SELECT u.name, o.amount, o.created_at
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- 뷰 조회
SELECT * FROM active_users_orders;
```

---

## 5. 유용한 팁

*   **히스토리 조회:** 터미널에서 `↑` 화살표를 누르면 이전 명령어가 나옵니다.
*   **화면 지우기:** `Ctrl + L` 또는 `\! clear`
*   **쿼리 실행 시간 확인:** `\timing` 명령어를 입력하면 쿼리 실행 시간이 표시됩니다.
*   **설정 파일 위치 확인:** `SHOW config_file;`
