## 복합키

### table alarm_reads
```java
@Entity
@NoArgsConstructor
@Table(name = "alarm_reads")
public class alarm_reads {

    @EmbeddedId
    private alarmReadsId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id", nullable = false)
    private users user;

    @MapsId("alarmId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="alarm_id", nullable = false)
    private alarms alarm;

    @CreationTimestamp
    @Column(name="read_at")
    private Timestamp readAt;

}

```
### table alarmsReadsId
```java
@Embeddable
@NoArgsConstructor
public class alarmReadsId implements Serializable {

    @Column(name="alarm_id")
    private Long alarmId;
    @Column(name="user_id")
    private Long userId;

    public alarmReadsId(Long alarmId, Long userId) {
        this.alarmId = alarmId;
        this.userId = userId;
    }
}
```
```java
- 복합키 객체 생성
alarmsReadsId id = new alarmsReadsId(alarmId, userId);

- alarm_reads entity 생성
alarm_reads alarmRead = new alarm_reads();
alarmRead.setId(id);

alarmReadsRepository.save(alarmRead);
```

