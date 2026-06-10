# Kafka 개념과 아키텍처

Apache Kafka는 메시지를 즉시 소비하고 삭제하는 단순 queue라기보다, partitioned log에 event를 append하고 consumer group이 offset으로 읽기 위치를 관리하는 분산 이벤트 스트리밍 플랫폼이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

마이크로서비스가 늘어나면 동기 HTTP 호출만으로는 주문, 결제, 알림, 분석, 로그 수집 같은 흐름을 느슨하게 연결하기 어렵다. 한 서비스 장애가 다른 서비스의 요청 지연으로 번지고, 같은 이벤트를 여러 시스템에서 재사용하기도 힘들다.

Kafka는 event를 topic에 저장하고 여러 consumer group이 독립적으로 읽게 해준다. 이 덕분에 생산자와 소비자를 분리하고, 재처리와 fan-out을 설계할 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 topic, partition, broker, replication, producer, consumer, consumer group을 소개한다.

보완해야 할 점은 다음과 같다.

- Kafka를 전통적 message queue와 비교하면서 RabbitMQ/ActiveMQ를 휘발성 메모리 중심처럼 단정한다.
- Broker 조정 방식에서 ZooKeeper와 KRaft를 나란히 두지만, 신규 Kafka 계열에서는 KRaft 기준으로 이해해야 한다.
- offset commit과 처리 보장 사이의 관계가 더 명확해야 한다.
- partition key 설계가 ordering과 hot partition을 동시에 만든다는 trade-off가 부족하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Kafka 설계에서 다음 질문에 답하는 것이다.

- 어떤 이벤트를 어떤 topic에 저장할 것인가?
- event key는 어떤 ordering boundary를 만들 것인가?
- partition 수와 consumer group 크기는 어떤 병렬성을 제공하는가?
- replication factor와 `min.insync.replicas`는 어떤 내구성 계약을 만드는가?
- offset commit은 처리 완료 시점과 어떻게 연결되는가?
- KRaft controller quorum과 broker 역할을 어떻게 구분할 것인가?

## 4. 시스템 번역 (Data Flow)

Kafka의 기본 데이터 흐름은 다음과 같다.

```text
producer
  -> topic
  -> partition leader
  -> replicated log
  -> consumer group assignment
  -> consumer poll
  -> process event
  -> commit offset
```

Kafka는 event를 consumer에게 “밀어주는” 시스템이 아니라 consumer가 partition에서 offset 기준으로 읽어 가는 시스템이다. 이 차이가 재처리, lag, 중복 처리 설계의 핵심이다.

## 5. 핵심 구성요소 (Building Blocks)

Topic은 event가 저장되는 논리 이름이다. 예를 들어 `orders`, `payments`, `user-events` 같은 이름을 가진다.

Partition은 topic의 물리적 log shard다. 순서는 partition 안에서만 보장된다.

Offset은 partition 내부의 증가하는 위치 값이다. Consumer group은 어디까지 처리했는지 offset을 commit한다.

Broker는 partition log를 저장하고 producer/consumer 요청을 처리하는 Kafka server다.

Replication은 partition의 leader/follower replica를 여러 broker에 둬 장애 시 data availability를 높인다.

Producer는 key와 value를 serialize해 topic에 전송한다. Key가 있으면 보통 같은 key가 같은 partition으로 라우팅되어 key 단위 순서를 유지한다.

Consumer group은 여러 consumer가 partition을 나눠 읽는 단위다. 같은 group 안에서는 하나의 partition이 동시에 여러 consumer에게 할당되지 않는다.

KRaft는 Kafka metadata quorum이다. Apache Kafka 공식 문서는 KRaft 모드에서 Kafka가 ZooKeeper 의존성을 제거하고 control plane 기능을 Kafka 자체에 통합한다고 설명한다.

## 6. 상태 전이 (State Transition)

Event는 다음 상태를 거친다.

```text
created by producer
  -> serialized
  -> appended to partition
  -> replicated to ISR
  -> visible to consumers
  -> processed
  -> offset committed
  -> retained until retention policy removes it
```

Consumer group은 다음 상태를 반복한다.

```text
members join
  -> partitions assigned
  -> records polled
  -> records processed
  -> offsets committed
  -> rebalance on membership or partition change
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Kafka ordering은 topic 전체가 아니라 partition 단위다.
- 같은 key에 대한 순서가 중요하면 key 설계를 먼저 정한다.
- `acks=all`은 `min.insync.replicas`와 함께 봐야 내구성 의미가 생긴다.
- Consumer는 중복 처리를 견딜 수 있게 idempotent하게 설계한다.
- Offset commit은 처리 완료 이후에 해야 at-least-once 의미를 지킨다.
- Partition 수 증가는 key-to-partition mapping을 바꿀 수 있다.
- Kafka 4.x 신규 설계는 ZooKeeper가 아니라 KRaft 기준으로 잡는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

주문 이벤트 topic을 설계한다.

```text
topic: orders
key: orderId
value: OrderCreated event
partitions: 6
replication.factor: 3
min.insync.replicas: 2
retention: 7 days
```

Producer의 핵심 설정은 다음 계약을 만든다.

```properties
acks=all
enable.idempotence=true
compression.type=lz4
linger.ms=10
```

Consumer는 처리 후 offset을 commit한다.

```text
poll records
  -> validate event
  -> write side effect
  -> commit offset
```

Consumer group별 의미는 독립적이다.

```text
orders topic
  -> payment-service group
  -> inventory-service group
  -> analytics-service group
```

각 group은 같은 event stream을 자기 속도와 offset으로 읽는다.

## 9. 실패 사례 (What could go wrong?)

모든 event key를 같은 값으로 보내면 하나의 partition만 뜨거워진다. 처리량은 partition 수가 아니라 hot key 분포에 묶인다.

Consumer가 DB write 전에 offset을 commit하면 장애 시 event를 잃은 것처럼 보일 수 있다. 반대로 DB write 후 commit 전에 죽으면 중복 처리가 발생한다.

Replication factor가 3이어도 `min.insync.replicas=1`과 부적절한 producer ack를 쓰면 기대한 내구성을 얻지 못한다.

Consumer 수가 partition 수보다 많으면 초과 consumer는 할당받을 partition이 없어 놀게 된다.

Topic retention을 너무 짧게 두면 장애 consumer가 복구 전에 읽어야 할 event를 잃을 수 있다. 너무 길게 두면 storage capacity가 병목이 된다.

## 10. 뇌 확장하기 (Evolution & Variants)

Kafka Streams는 Kafka topic을 입력과 출력으로 사용하는 stream processing library다. Stateful processing을 하면 changelog topic과 local state store까지 함께 이해해야 한다.

Kafka Connect는 외부 시스템과 Kafka를 연결하는 connector runtime이다. Database CDC, object storage sink, search index sink 같은 데이터 파이프라인에 적합하다.

Kubernetes에서 Kafka를 운영할 때는 직접 StatefulSet보다 operator를 검토한다. Broker identity, persistent volume, rolling restart, TLS, user/topic reconciliation이 운영 핵심이기 때문이다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Topic 이름과 event schema 책임을 정했다.
- [ ] Key가 보장해야 할 ordering boundary를 설명할 수 있다.
- [ ] Partition 수와 consumer group 병렬성을 계산했다.
- [ ] Replication factor와 `min.insync.replicas`를 함께 설정했다.
- [ ] Offset commit 시점과 side effect 순서를 정했다.
- [ ] Consumer가 중복 처리에 견딜 수 있다.
- [ ] Retention이 장애 복구 시간보다 충분하다.
- [ ] KRaft 기준 운영 모델을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Kafka는 topic에 event를 append하고 consumer group이 offset으로 읽는 분산 로그다. 순서는 partition 안에서만 보장되며, reliability는 producer ack, ISR, offset commit, idempotent consumer가 함께 만든다.
