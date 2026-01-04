# @MapsId 어노테이션의 중요성과 활용법

`@MapsId` 어노테이션은 JPA에서 엔티티 간의 관계에서 기본 키를 공유할 때 매우 중요한 역할을 합니다.

특히 `@OneToOne`이나 `@ManyToOne` 관계에서 연관 엔티티의 기본 키를 참조 엔티티의 기본 키로 사용할 때 유용합니다.

## @MapsId의 명시적 선언이 필요한 이유

`@MapsId`를 명시적으로 선언하는 것은 중요합니다. 이 어노테이션을 사용하면 다음과 같은 이점이 있습니다:

1. 외래 키와 기본 키를 동일하게 유지할 수 있음
2. 별도의 키 생성 전략이 필요하지 않음
3. 데이터 일관성 유지 
4. 조인 쿼리 성능 향상

## 코드 비교: @MapsId 사용 vs 미사용

### 1️⃣ @MapsId 없이 구현한 경우

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String username;
    
    // getter, setter 생략
}

@Entity
public class UserProfile {
    @Id
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    private String bio;
    
    // id를 수동으로 설정해야 함
    public void setUser(User user) {
        this.user = user;
        this.id = user.getId(); // 수동으로 ID 동기화 필요
    }
    
    // getter, setter 생략
}
```

이 방식의 문제점:
- ID 값을 수동으로 동기화해야 함
- 실수로 인한 불일치 가능성
- 코드가 더 복잡해짐

### 2️⃣ @MapsId를 명시적으로 선언한 경우

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String username;
    
    // getter, setter 생략
}

@Entity
public class UserProfile {
    @Id
    private Long id;
    
    @OneToOne
    @MapsId  // 명시적 선언
    @JoinColumn(name = "user_id")
    private User user;
    
    private String bio;
    
    // 더 이상 ID 동기화 코드가 필요 없음
    
    // getter, setter 생략
}
```

이 방식의 장점:
- JPA가 자동으로 User의 ID를 UserProfile의 ID로 사용
- 수동 동기화 코드 불필요
- 실수 가능성 감소
- 더 간결하고 유지보수하기 쉬운 코드

## 복합 키를 사용하는 경우

복합 키(Composite Key)를 사용하는 경우 `@MapsId`의 값으로 특정 필드 이름을 지정할 수 있습니다:

```java
@Entity
public class OrderItem {
    @EmbeddedId
    private OrderItemId id;
    
    @ManyToOne
    @MapsId("orderId")  // 복합 키의 특정 필드에 매핑
    @JoinColumn(name = "order_id")
    private Order order;
    
    @ManyToOne
    @MapsId("productId")  // 복합 키의 특정 필드에 매핑
    @JoinColumn(name = "product_id")
    private Product product;
    
    private int quantity;
    
    // getter, setter 생략
}

@Embeddable
public class OrderItemId implements Serializable {
    private Long orderId;
    private Long productId;
    
    // equals, hashCode, getter, setter 생략
}
```

## 결론

`@MapsId` 어노테이션을 명시적으로 선언하는 것은 JPA에서 엔티티 간의 관계에서 기본 키를 공유할 때 매우 중요합니다. 이 어노테이션을 사용하면 코드가 더 간결해지고, 실수 가능성이 줄어들며, 유지보수가 쉬워집니다. 특히 `@OneToOne`이나 `@ManyToOne` 관계에서 외래 키를 기본 키로 사용하는 경우 `@MapsId`를 명시적으로 선언하는 것이 좋은 관행입니다.

---

# 복합 키(Composite Key)에서 @MapsId와 @IdClass의 차이점과 활용 방법

JPA에서 복합 키를 다루는 방법으로 주로 @IdClass와 @EmbeddedId/@MapsId 두 가지 방식이 사용됩니다. 각 방식의 차이점과 적합한 사용 상황을 코드 예시와 함께 살펴보겠습니다.

## @IdClass와 @MapsId/@EmbeddedId의 핵심 차이점

### 구조적 차이

**@IdClass 방식**
- 복합키를 구성하는 필드를 엔티티 클래스와 ID 클래스 양쪽에 모두 정의해야 함[5][6]
- 엔티티 필드에 직접 @Id 어노테이션을 사용[2]
- 관계 매핑 시 보다 직관적인 형태로 코드 작성 가능[6]

**@EmbeddedId/@MapsId 방식**
- 복합키 클래스를 @Embeddable로 정의하고, 엔티티에서는 해당 클래스만 참조[5][9]
- @MapsId를 통해 @OneToOne이나 @ManyToOne 관계와 ID를 연결[3][11]
- 보다 객체지향적인 접근 방식[2]

### JPQL 쿼리 작성 차이

**@IdClass 사용 시**:
```java
// 단순하게 속성 접근 가능
SELECT o.orderId, o.productId FROM OrderRecord o
```

**@EmbeddedId 사용 시**:
```java
// id 객체를 통해 한 단계 더 들어가야 함
SELECT o.id.orderId, o.id.productId FROM OrderRecord o
```

## 코드 비교를 통한 이해

### @IdClass 사용 예시

**복합키 클래스**:
```java
public class OrderRecordId implements Serializable {
    private Integer orderId;
    private Integer productId;
    
    // 기본 생성자
    public OrderRecordId() {}
    
    // 모든 필드 생성자
    public OrderRecordId(Integer orderId, Integer productId) {
        this.orderId = orderId;
        this.productId = productId;
    }
    
    // equals & hashCode 구현
    @Override
    public boolean equals(Object o) {/* 구현 */}
    
    @Override
    public int hashCode() {/* 구현 */}
}
```

**엔티티 클래스**:
```java
@Entity
@Table(name = "order_record")
@IdClass(OrderRecordId.class)
public class OrderRecord {
    @Id
    @Column(name = "order_id")
    private Integer orderId;
    
    @Id
    @Column(name = "product_id")
    private Integer productId;
    
    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
    private Integer quantity;
    
    // getters & setters
}
```

### @EmbeddedId와 @MapsId 사용 예시

**복합키 클래스**:
```java
@Embeddable
public class OrderRecordId implements Serializable {
    @Column(name = "order_id")
    private Integer orderId;
    
    @Column(name = "product_id")
    private Integer productId;
    
    // 기본 생성자
    public OrderRecordId() {}
    
    // 모든 필드 생성자
    public OrderRecordId(Integer orderId, Integer productId) {
        this.orderId = orderId;
        this.productId = productId;
    }
    
    // equals & hashCode 구현
    @Override
    public boolean equals(Object o) {/* 구현 */}
    
    @Override
    public int hashCode() {/* 구현 */}
}
```

**엔티티 클래스**:
```java
@Entity
@Table(name = "order_record")
public class OrderRecord {
    @EmbeddedId
    private OrderRecordId id;
    
    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
    private Integer quantity;
    
    // getters & setters
}
```

## 관계 매핑에서의 차이점

### 일대다 관계에서 @IdClass 사용

```java
@Entity
@IdClass(EmployeePhoneId.class)
public class EmployeePhone {
    @Id
    @ManyToOne
    @JoinColumn(name = "employee_id")
    private Employee employee;
    
    @Id
    private String phone;
    
    private String phoneType;
    
    // getters & setters
}
```

### 일대다 관계에서 @EmbeddedId/@MapsId 사용

```java
@Entity
public class EmployeePhone {
    @EmbeddedId
    private EmployeePhoneId id;
    
    @ManyToOne
    @MapsId("employeeId")  // EmployeePhoneId 클래스의 employeeId 필드와 매핑
    @JoinColumn(name = "employee_id")
    private Employee employee;
    
    private String phoneType;
    
    // getters & setters
}

@Embeddable
public class EmployeePhoneId implements Serializable {
    private Long employeeId;
    private String phone;
    
    // constructors, equals, hashCode
}
```

## 언제 무엇을 선택해야 할까?

### @IdClass가 더 적합한 경우

1. **복합키 클래스 접근이 어려운 경우**
   - 레거시 코드나 다른 모듈에서 제공하는 복합키 클래스를 사용할 때[2]
   
2. **FK가 포함된 복합키 사용 시**
   - 외래 키를 포함한 복합키를 사용할 때 더 직관적임[2]
   
3. **더 단순한 JPQL 쿼리를 원할 때**
   - 필드에 직접 접근하는 형태로 쿼리를 작성하고 싶을 때[5]

### @EmbeddedId/@MapsId가 더 적합한 경우

1. **객체지향적 접근을 선호할 때**
   - 복합키를 하나의 객체로 취급하고 싶을 때[2][9]
   
2. **조인 테이블에 추가 컬럼이 있는 경우**
   - 복잡한 조인 테이블 구조에서 더 유연하게 매핑 가능[2]
   
3. **HQL에서 IN 절 사용 시**
   - IN 절을 사용하는 쿼리에서 더 효율적임[2]

## 관계대수별 JPA+QueryDSL 코드 예시

### 1. 선택(Selection) 연산

**@IdClass 사용 시 QueryDSL:**
```java
// orderId가 100인 주문 검색
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List orders = queryFactory
    .selectFrom(orderRecord)
    .where(orderRecord.orderId.eq(100))
    .fetch();
```

**@EmbeddedId 사용 시 QueryDSL:**
```java
// orderId가 100인 주문 검색
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List orders = queryFactory
    .selectFrom(orderRecord)
    .where(orderRecord.id.orderId.eq(100))
    .fetch();
```

### 2. 투영(Projection) 연산

**@IdClass 사용 시 QueryDSL:**
```java
// 주문 ID와 수량만 선택
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List results = queryFactory
    .select(orderRecord.orderId, orderRecord.quantity)
    .from(orderRecord)
    .fetch();
```

**@EmbeddedId 사용 시 QueryDSL:**
```java
// 주문 ID와 수량만 선택
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List results = queryFactory
    .select(orderRecord.id.orderId, orderRecord.quantity)
    .from(orderRecord)
    .fetch();
```

### 3. 조인(Join) 연산

**@IdClass 사용 시 QueryDSL:**
```java
// 주문과 고객 조인
QOrderRecord orderRecord = QOrderRecord.orderRecord;
QCustomer customer = QCustomer.customer;
List orders = queryFactory
    .selectFrom(orderRecord)
    .join(orderRecord.customer, customer)
    .where(customer.name.eq("홍길동"))
    .fetch();
```

**@EmbeddedId 사용 시 QueryDSL:**
```java
// 주문과 고객 조인
QOrderRecord orderRecord = QOrderRecord.orderRecord;
QCustomer customer = QCustomer.customer;
List orders = queryFactory
    .selectFrom(orderRecord)
    .join(orderRecord.customer, customer)
    .where(customer.name.eq("홍길동"))
    .fetch();
```

### 4. 집합(Aggregation) 연산

**@IdClass 사용 시 QueryDSL:**
```java
// 상품별 주문 수량 합계
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List results = queryFactory
    .select(orderRecord.productId, orderRecord.quantity.sum())
    .from(orderRecord)
    .groupBy(orderRecord.productId)
    .fetch();
```

**@EmbeddedId 사용 시 QueryDSL:**
```java
// 상품별 주문 수량 합계
QOrderRecord orderRecord = QOrderRecord.orderRecord;
List results = queryFactory
    .select(orderRecord.id.productId, orderRecord.quantity.sum())
    .from(orderRecord)
    .groupBy(orderRecord.id.productId)
    .fetch();
```

## 결론

복합 키를 사용할 때 @IdClass와 @EmbeddedId/@MapsId는 각각 장단점이 있습니다. @IdClass는 보다 직관적이고 단순한 쿼리를 작성할 수 있지만, 동일한 필드를 두 번 정의해야 하는 중복이 발생합니다. 반면 @EmbeddedId/@MapsId는 객체지향적이고 필드 중복을 줄일 수 있지만, 쿼리 작성 시 한 단계 더 들어가야 하는 복잡함이 있습니다.

실제 프로젝트에서는 팀의 코딩 컨벤션, 기존 코드베이스의 일관성, 그리고 특정 사용 사례에 따라 적절한 방식을 선택하는 것이 중요합니다. 복잡한 관계 매핑이 많은 경우 @EmbeddedId/@MapsId가 유지보수성 측면에서 유리할 수 있으며, 단순한 관계와 직관적인 쿼리를 중시하는 경우 @IdClass가 더 적합할 수 있습니다.