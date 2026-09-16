---
title: SQL 문장과 조인 결과 읽기
description: DDL·DML·권한·트랜잭션 문장을 구분하고 작은 공개 예시로 조인과 NULL 결과를 확인합니다.
---

# SQL 문장과 조인 결과 읽기

보관된 SQL 파일에는 테이블 생성·삭제, 권한 조회, 개인 예시 데이터가 섞여 있다. 전체 파일을 실제 DB에 실행하는 대신, 필요한 개념을 분리하고 소유한 실습 데이터로 결과를 확인한다.

| 분류 | 대표 문장 | 별도 확인 |
| --- | --- | --- |
| DDL | `CREATE`, `ALTER`, `DROP` | DBMS별 트랜잭션·암시적 커밋, 데이터 손실 |
| 데이터 조회·변경 | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | 대상 행, 조건, 제약, 영향 행 수 |
| 권한 | `GRANT`, `REVOKE` | 실제 계정·호스트·객체 범위와 최소 권한 |
| 트랜잭션 | `COMMIT`, `ROLLBACK` | 연결의 자동 커밋, 시작 지점, 외부 부작용 |

이 분류는 학습용이다. 실제 문법과 역할·권한 이름은 선택한 DBMS와 버전의 계약이다.

## 작은 조인 예시

아래 테이블은 **설명용 데이터**이며 사람이나 실제 계정 정보를 포함하지 않는다.

```text
Product                       Line
product_id | label             line_id | product_id
1          | Item A            10      | 1
2          | Item B            11      | 1
```

```sql
SELECT p.product_id, p.label, l.line_id
FROM Product AS p
LEFT JOIN Line AS l ON l.product_id = p.product_id
ORDER BY p.product_id, l.line_id;
```

논리적 결과는 `(1, Item A, 10)`, `(1, Item A, 11)`, `(2, Item B, NULL)`이다. 왼쪽 테이블의 한 행이 여러 오른쪽 행과 매칭되면 결과도 여러 행이 된다. `INNER JOIN`은 이 예시에서 매칭이 없는 상품 2를 제외한다.

오른쪽 컬럼에 대한 필터를 `WHERE`에 두면 NULL로 확장된 행이 제거될 수 있다. `ON`은 매칭 조건, `WHERE`는 매칭 후 결과 조건이라는 차이를 먼저 설명한다. NULL은 일반 값과 같은 방식으로 `=` 비교하지 않고 `IS NULL` 같은 조건을 사용한다.

## 변경 문장을 확인하는 방법

같은 조건의 조회로 대상 행을 확인하고, 수정 후 영향 행 수와 제약·결과를 확인한다. 조회와 수정 사이의 동시 변경은 별도 격리·잠금 문제다. 조회해 봤다는 이유만으로 실행 안전성이 확보되는 것은 아니다.

실습은 분리된 DB 또는 schema에서 한다. DBMS가 허용하는 범위에서 명시적 트랜잭션과 rollback을 시험하되 모든 DDL이 rollback된다고 가정하지 않는다. [트랜잭션 안내](transactions.md)와 함께 읽는다.

근거: `content/archive/legacy/DATABASE/sql/DDL/DDL.sql`, `DML/DML.sql`, `DCL/DCL.sql`, `TCL/TCL.sql`; `DATABASE/개념/JOIN.md`. 위 데이터와 결과는 원본의 개인 데이터를 대체한 독립 예시다.
