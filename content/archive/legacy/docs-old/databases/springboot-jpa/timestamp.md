# JPA 엔티티 생성·수정 시각 기록

## 생성·수정 시각의 적용 경계

`@CreationTimestamp`와 `@UpdateTimestamp`는 Hibernate가 엔티티 생명주기에 맞춰 값을 채우는 애너테이션이다. 데이터베이스의 `DEFAULT`, 트리거, 감사 열과 같은 서버 측 규칙을 대신한다고 가정하지 않는다. 적용 여부는 엔티티 저장과 수정 후 flush·재조회한 값으로 각각 확인하고, 애플리케이션·JVM·데이터베이스 시간대가 다를 때의 표현 기준을 별도로 정한다.

## 엔티티 생성 시각
    @CreationTimestamp
## 엔티티 수정 시각 
    @UpdateTimestamp
