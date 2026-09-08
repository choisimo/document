# QueryDSL JPA 커스텀 리포지토리 구현

이 문서는 QueryDSL의 JPA 모듈을 사용하는 패턴을 설명합니다. QueryDSL, Spring Data, Jakarta Persistence의 버전 조합과 생성된 Q 타입의 패키지를 먼저 확인합니다. `JPAQueryFactory`는 JPQL 쿼리 모델을 만들며, 최종 SQL과 실행 비용은 JPA 공급자와 데이터베이스가 결정합니다.

## 1. 기본 개념 및 용어 정의
- **QueryDSL JPA**: 엔티티 경로와 표현식을 자바 타입으로 구성해 JPQL 쿼리를 만드는 라이브러리. 경로·타입 오류 일부를 컴파일 시점에 찾지만 쿼리 의미나 성능까지 보장하지는 않음.
- **JPA (Java Persistence API)**: 자바 객체와 관계형 데이터베이스 매핑을 위한 표준 인터페이스.
- **Spring Data JPA**: JPA를 추상화하여 CRUD 작업을 간소화하는 프레임워크.
- **커스텀 리포지토리**: Spring Data JPA의 기본 메서드로 처리할 수 없는 복잡한 쿼리를 구현하기 위한 확장 패턴.

---

## 2. 비교할 구현 예시와 판단 기준
```java
// QuerydslRepositorySupport를 사용하는 선택지
public class UserRepositoryImpl extends QuerydslRepositorySupport implements UserRepositoryCustom {
    
    public UserRepositoryImpl() {
        super(User.class);  // EntityManager 주입 누락
    }
    
    @Override
    public List findUsersWithComplexCriteria(String firstName, Integer minAge) {
        QUser user = QUser.user;
        JPQLQuery query = from(user);
        
        if (firstName != null) {
            query.where(user.firstName.eq(firstName));
        }
        
        if (minAge != null) {
            query.where(user.age.gt(minAge));
        }
        
        return query.fetch();
    }
}
```

### 판단할 항목
1. **초기화 계약**: 실제 Spring Data 버전에서 `EntityManager`가 언제 설정되는지 확인합니다.
2. **동적 조건**: `if`, `BooleanBuilder`, null 표현식 중 팀이 읽기 쉽고 조합 테스트가 가능한 방식을 선택합니다. `if` 자체는 오류가 아닙니다.
3. **결과 SQL**: `QuerydslRepositorySupport`와 `JPAQueryFactory` 중 어느 API를 쓰든 생성 SQL과 실행 계획을 측정합니다.

---

#### 3. **올바른 구현 방식 및 최적화 전략**

##### 3.1 **JPAQueryFactory 사용**
```java
@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public UserRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);  // ✅ EntityManager 주입
    }

    @Override
    public List findUsersWithComplexCriteria(String firstName, Integer minAge) {
        QUser user = QUser.user;
        
        // ✅ BooleanBuilder로 동적 쿼리 구성
        BooleanBuilder builder = new BooleanBuilder();
        if (firstName != null) {
            builder.and(user.firstName.eq(firstName));
        }
        if (minAge != null) {
            builder.and(user.age.gt(minAge));
        }
        
        return queryFactory
            .selectFrom(user)
            .where(builder)
            .fetch();
    }
}
```

##### **개선된 점**
- **의존성 주입**: `EntityManager`를 통해 `JPAQueryFactory` 생성.
- **BooleanBuilder 활용**: 동적 쿼리 구성이 명확해지고 확장성 증가.
- **타입 안전성 강화**: `selectFrom()`을 사용한 컴파일 시점 검증.

---

##### 3. **Spring Data JPA 통합**
```java
// ✅ 기본 리포지토리 확장
public interface UserRepository 
    extends JpaRepository, UserRepositoryCustom {
}

// ✅ 설정 클래스에 JPAQueryFactory 빈 등록
@Configuration
public class QuerydslConfig {
    
    @Bean
    public JPAQueryFactory jpaQueryFactory(EntityManager em) {
        return new JPAQueryFactory(em);
    }
}
```

##### **중요 포인트**
- **구성 선택**: `JPAQueryFactory`는 설정에서 bean으로 공유하거나 리포지토리 생성자에서 `EntityManager`로 만들 수 있습니다. 프로젝트에서 한 방식을 일관되게 사용합니다.
- **커스텀 인터페이스 분리**: 비즈니스 로직과 기본 CRUD 작업을 명확히 분리.

---

#### 4. **성능 최적화 팁**
1. **컴파일된 쿼리 사용**: `QClass`가 `static final`로 선언되었는지 확인.
   ```java
   private static final QUser user = QUser.user;
   ```
2. **페이징 처리**: `offset()`, `limit()`을 활용한 페이지네이션.
   ```java
   .offset(pageable.getOffset())
   .limit(pageable.getPageSize())
   ```
3. **벌크 연산**: 벌크 쿼리는 영속성 컨텍스트의 엔티티 상태와 자동 동기화되지 않습니다. 필요한 변경을 먼저 flush하고 벌크 실행 뒤 clear할지 트랜잭션 경계에 맞춰 결정합니다.
   ```java
   em.flush();
   queryFactory.update(user).set(user.age, 30).where(...).execute();
   em.clear();
   ```

---

#### 5. **자주 묻는 질문 (FAQ)**
**Q.** `QuerydslRepositorySupport` vs `JPAQueryFactory` 어떤 것을 사용해야 하나요?  
**A.** 두 방식의 지원 API, 공통 페이징 기능, 테스트 방식, 기존 코드 일관성을 비교합니다. `JPAQueryFactory`는 조합을 직접 제어하기 쉽지만 그 사실만으로 유지보수성이 자동 향상되지는 않습니다.

**Q.** 동적 쿼리를 구현할 때 `BooleanBuilder` 외 다른 방법은?  
**A.** `WhereClause`와 람다를 결합한 **메서드 체이닝** 방식도 가능합니다.
```java
return queryFactory
    .selectFrom(user)
    .where(
        firstName == null ? null : user.firstName.eq(firstName),
        minAge == null ? null : user.age.gt(minAge)
    )
    .fetch();
```

**Q.** `fetch()` vs `fetchOne()` vs `fetchFirst()` 차이는?  
**A.** 
- `fetch()`: 전체 결과 리스트 반환
- `fetchOne()`: 단일 결과 반환 (결과 없거나 둘 이상이면 예외)
- `fetchFirst()`: 첫 번째 결과 반환 (결과 없으면 `null`)

---

### 📌 **심화 학습 제안**
**"QueryDSL에서 서브쿼리와 윈도우 함수를 효율적으로 사용하는 방법은 무엇인가요?"**  
윈도우 함수와 DBMS 고유 구문은 사용하는 QueryDSL 모듈과 JPA 공급자가 표현할 수 있는 범위를 먼저 확인합니다. 필요하면 네이티브 SQL이라는 경계를 명시하고, 같은 데이터·인덱스에서 실행 계획과 결과를 비교합니다.
