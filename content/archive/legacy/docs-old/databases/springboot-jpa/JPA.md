# JPA 복합 키와 `@MapsId` 매핑

이 예시는 `alarm_reads` 조인 엔티티의 기본 키가 `(alarm_id, user_id)`이고, 두 열이 각각 연관 엔티티의 외래 키이기도 한 경우를 다룹니다. Jakarta 또는 Javax 패키지는 프로젝트의 JPA 버전에 맞춰 선택합니다.

## 복합 키 값 객체

```java
@Embeddable
public class AlarmReadId implements Serializable {
    @Column(name = "alarm_id")
    private Long alarmId;

    @Column(name = "user_id")
    private Long userId;

    protected AlarmReadId() {}

    public AlarmReadId(Long alarmId, Long userId) {
        this.alarmId = alarmId;
        this.userId = userId;
    }

    // 두 키 필드를 기준으로 equals와 hashCode를 구현해야 한다.
}
```

복합 키 클래스는 직렬화 가능해야 하고, 키 값 기준의 `equals`와 `hashCode`가 필요합니다. 예제에서는 메서드 본문을 생략했으므로 그대로 컴파일 가능한 완성 코드가 아닙니다.

## 조인 엔티티

```java
@Entity
@Table(name = "alarm_reads")
public class AlarmRead {
    @EmbeddedId
    private AlarmReadId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @MapsId("alarmId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alarm_id", nullable = false)
    private Alarm alarm;

    @CreationTimestamp
    @Column(name = "read_at", nullable = false, updatable = false)
    private Instant readAt;

    protected AlarmRead() {}

    public AlarmRead(User user, Alarm alarm) {
        this.user = Objects.requireNonNull(user);
        this.alarm = Objects.requireNonNull(alarm);
        this.id = new AlarmReadId(alarm.getId(), user.getId());
    }
}
```

`@MapsId("userId")`와 `@MapsId("alarmId")`의 값은 `AlarmReadId`의 속성 이름과 정확히 일치해야 합니다. 연관 객체와 ID 중 한쪽만 설정하면 메모리 상태가 불완전해질 수 있으므로 생성 경로에서 함께 설정합니다.

## 저장과 확인

```java
@Transactional
public AlarmRead markAsRead(User user, Alarm alarm) {
    return alarmReadRepository.save(new AlarmRead(user, alarm));
}
```

완료 조건은 `save` 호출이 반환되는 것만이 아닙니다. 트랜잭션 flush 뒤 `(alarm_id, user_id)`의 유일성, 두 외래 키, `read_at` 값이 데이터베이스에서 기대한 상태인지 확인합니다. 동시 삽입이 가능한 경우에는 데이터베이스 기본 키 또는 유일 제약 위반을 어떤 응답으로 변환할지도 정의해야 합니다.
