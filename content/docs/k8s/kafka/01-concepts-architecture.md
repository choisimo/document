# Kafka 개념 및 아키텍처

## 적용 범위와 보장 경계

- 이 문서는 Kafka의 논리 개념을 설명합니다. controller 모드, group protocol, 기본 설정과 도구 명령은 배포 버전에서 다시 확인합니다.
- 순서는 partition 안에서 기록된 순서이며, key가 같은 partition에 남는지는 partitioner와 partition 수가 유지되는 동안의 계약입니다.
- producer acknowledgement, 복제 commit, consumer visibility, 애플리케이션 처리와 offset commit은 서로 다른 완료 상태입니다.
- 전달 보장은 재시도, transaction, isolation level과 외부 부작용의 멱등성까지 고정하고 장애 시험으로 확인합니다.

## 📖 개요

Apache Kafka는 LinkedIn에서 개발한 분산 이벤트 스트리밍 플랫폼으로, 실시간 데이터 파이프라인과 스트리밍 애플리케이션을 구축하는 데 사용됩니다.

## 🎯 학습 목표

- Kafka의 핵심 개념 이해
- 아키텍처 구성 요소 파악
- 메시지 흐름 및 저장 메커니즘 학습
- 사용 사례 및 패턴 이해

## 🏗️ Kafka 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Kafka Cluster                         │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Broker 1   │  │  Broker 2   │  │  Broker 3   │     │
│  │             │  │             │  │             │     │
│  │ Topic-A-P0  │  │ Topic-A-P1  │  │ Topic-A-P2  │     │
│  │ Topic-B-P0  │  │ Topic-B-P1  │  │ Topic-B-P2  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         ↑                ↑                ↑             │
└─────────┼────────────────┼────────────────┼─────────────┘
          │                │                │
          │                │                │
    ┌─────┴────────────────┴────────────────┴─────┐
    │                                               │
┌───↓─────┐                               ┌────────↓────┐
│Producer │                               │ Consumer    │
│         │                               │ Group       │
└─────────┘                               └─────────────┘
```

## 🔑 핵심 개념

### 1. Topic (토픽)

메시지가 저장되는 논리적 카테고리입니다.

```
Topic: user-events
├── Event 1: {"userId": 123, "action": "login"}
├── Event 2: {"userId": 456, "action": "purchase"}
└── Event 3: {"userId": 789, "action": "logout"}
```

**특징:**
- 이름으로 식별 (예: `orders`, `logs`, `user-activity`)
- 여러 Producer와 Consumer가 동일한 Topic에 접근 가능
- 메시지는 시간 순서대로 추가 (append-only)
- 설정된 보관 기간(retention) 동안 메시지 유지

### 2. Partition (파티션)

Topic을 나누는 물리적 단위로 병렬 처리를 가능하게 합니다.

```
Topic: orders (3개 파티션)

Partition 0: [msg0] [msg3] [msg6] [msg9]
Partition 1: [msg1] [msg4] [msg7] [msg10]
Partition 2: [msg2] [msg5] [msg8] [msg11]
```

**특징:**
- 각 Partition은 순서를 보장 (Partition 내에서만)
- Partition 번호는 0부터 시작
- 같은 partitioner와 partition 수가 유지되는 동안 key 기반 라우팅으로 같은 key를 같은 partition에 배치 가능
- Partition 수는 병렬 처리의 최대 단위

**Partition 선택 알고리즘:**
```
Key가 있으면:
  partition = hash(key) % num_partitions
  
Key가 없으면:
  Round-robin 또는 Sticky partitioning
```

### 3. Broker (브로커)

Kafka 서버 인스턴스입니다.

```
Cluster
├── Broker 1 (Leader for P0, Follower for P1, P2)
├── Broker 2 (Leader for P1, Follower for P0, P2)
└── Broker 3 (Leader for P2, Follower for P0, P1)
```

**역할:**
- 메시지 저장 및 전달
- Producer와 Consumer 간 중개
- Partition의 Leader 또는 Follower 역할
- ZooKeeper 또는 KRaft를 통한 클러스터 조정

### 4. Replication (복제)

데이터의 고가용성을 위한 복제 메커니즘입니다.

```
Topic: orders (3 Partitions, Replication Factor: 3)

Partition 0:
  Leader:    Broker 1 ← 읽기/쓰기
  Follower:  Broker 2 ← 복제
  Follower:  Broker 3 ← 복제

Partition 1:
  Leader:    Broker 2
  Follower:  Broker 1
  Follower:  Broker 3
```

**ISR (In-Sync Replica):**
- Leader와 동기화 상태를 유지하는 Replica
- Leader 장애 시 ISR 중에서 새로운 Leader 선출
- `min.insync.replicas` 설정으로 최소 ISR 개수 보장

### 5. Producer (프로듀서)

메시지를 Topic에 발행하는 클라이언트입니다.

```java
// Producer 예시
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

Producer<String, String> producer = new KafkaProducer<>(props);

ProducerRecord<String, String> record = 
    new ProducerRecord<>("orders", "user123", "{\"item\":\"laptop\"}");
    
producer.send(record);
```

**전송 보장 수준 (acks):**
- `acks=0`: 전송만 하고 확인 안함 (빠르지만 손실 가능)
- `acks=1`: Leader가 저장하면 확인 (기본값)
- `acks=all`: ISR과 `min.insync.replicas` 조건에 따라 확인하며 가용성과 내구성의 설정 경계를 함께 검토

### 6. Consumer (컨슈머)

Topic에서 메시지를 읽는 클라이언트입니다.

```java
// Consumer 예시
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "order-processing-group");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        System.out.printf("offset=%d, key=%s, value=%s%n", 
            record.offset(), record.key(), record.value());
    }
}
```

### 7. Consumer Group (컨슈머 그룹)

여러 Consumer가 협력하여 메시지를 처리하는 단위입니다.

```
Topic: orders (4 Partitions)

Consumer Group: order-processors
├── Consumer 1 → Partition 0, 1
└── Consumer 2 → Partition 2, 3

Consumer Group: analytics
├── Consumer 1 → Partition 0, 1, 2
└── Consumer 2 → Partition 3
```

**특징:**
- 같은 Group 내에서 각 Partition은 하나의 Consumer에만 할당
- 다른 Group은 독립적으로 메시지 소비
- Consumer 추가/제거 시 자동 리밸런싱

**Rebalancing (리밸런싱):**
```
초기 상태 (Consumer 2개, Partition 4개):
  Consumer 1: P0, P1
  Consumer 2: P2, P3

Consumer 3 추가 후:
  Consumer 1: P0, P1
  Consumer 2: P2
  Consumer 3: P3
```

## 📊 메시지 구조

### Message (Record)

```
┌─────────────────────────────────────────────┐
│ Offset: 12345                               │
│ Timestamp: 2024-01-15T10:30:00Z            │
│ Key: "user-123"                             │
│ Value: {"action": "purchase", "amount": 99} │
│ Headers: [{"traceId": "abc-123"}]          │
└─────────────────────────────────────────────┘
```

**구성 요소:**
- **Offset**: Partition 내 메시지의 고유 순번 (0부터 증가)
- **Timestamp**: 메시지 생성 또는 저장 시간
- **Key**: 선택적, Partition 라우팅에 사용
- **Value**: 실제 메시지 내용 (바이트 배열)
- **Headers**: 메타데이터 (Key-Value 쌍)

### Offset 관리

```
Topic: user-events, Partition 0

Offset:  0    1    2    3    4    5    6    7
Data:   [A]  [B]  [C]  [D]  [E]  [F]  [G]  [H]
        ───────────────────────► 
        (Consumer가 읽은 위치: offset 5)

Consumer는 마지막 읽은 offset을 __consumer_offsets 토픽에 커밋
```

**Offset 커밋 전략:**
- **Auto Commit**: 자동으로 주기적 커밋 (간단하지만 중복/손실 가능)
- **Manual Commit Sync**: 처리 완료 후 동기 커밋 (안전하지만 느림)
- **Manual Commit Async**: 커밋 응답을 기다리지 않아 처리 경로를 줄일 수 있지만, 콜백 순서와 실패 재시도 시 이전 offset으로 덮어쓰지 않도록 관리 필요

## 🔄 데이터 흐름

### Write Path (Producer → Broker)

```
1. Producer
   ↓ (key를 기반으로 Partition 선택)
2. Partition Leader (Broker 1)
   ↓ (Replication Factor만큼 복제)
3. Followers (Broker 2, 3)
   ↓ (acks 설정에 따라 응답)
4. Producer에게 성공 응답
```

### Read Path (Broker → Consumer)

```
1. Consumer가 Partition에서 Fetch 요청
   ↓
2. Broker가 현재 offset부터 메시지 배치 반환
   ↓
3. Consumer가 메시지 처리
   ↓
4. Offset 커밋 (자동 또는 수동)
```

## 🎯 사용 사례

### 1. 메시징 시스템
```
주문 서비스 → [orders 토픽] → 결제 서비스
                            → 배송 서비스
                            → 알림 서비스
```

### 2. 로그 수집
```
App Server 1 ┐
App Server 2 ├→ [logs 토픽] → ElasticSearch
App Server 3 ┘                → S3 Archive
```

### 3. 이벤트 소싱
```
사용자 액션 → [user-events 토픽] → 실시간 분석
                                 → ML 모델 학습
                                 → 데이터 웨어하우스
```

### 4. 스트림 처리
```
원본 데이터 → [raw 토픽] → Kafka Streams → [processed 토픽]
                                          ↓
                                      실시간 대시보드
```

## ⚙️ 주요 설정

### Topic 설정

| 설정 | 설명 | 기본값 | 권장값 |
|------|------|--------|--------|
| `num.partitions` | Partition 개수 | 1 | Consumer 수 고려 |
| `replication.factor` | 복제 계수 | 1 | 3 (프로덕션) |
| `retention.ms` | 메시지 보관 시간 | 7일 | 용도에 따라 |
| `retention.bytes` | 최대 저장 용량 | -1 (무제한) | 디스크 용량 고려 |
| `compression.type` | 압축 방식 | producer | snappy, lz4 |

### Producer 설정

```properties
# 성능
batch.size=16384              # 배치 크기
linger.ms=10                  # 배치 대기 시간
buffer.memory=33554432        # 버퍼 메모리

# 신뢰성
acks=all                      # 모든 ISR 확인
retries=2147483647           # 재시도 횟수
max.in.flight.requests.per.connection=5

# 압축
compression.type=snappy       # 압축 알고리즘
```

### Consumer 설정

```properties
# 성능
fetch.min.bytes=1            # 최소 Fetch 크기
fetch.max.wait.ms=500        # 최대 대기 시간
max.partition.fetch.bytes=1048576

# Offset 관리
enable.auto.commit=true      # 자동 커밋
auto.commit.interval.ms=5000 # 커밋 주기
auto.offset.reset=latest     # earliest, latest, none
```

## 🔍 Kafka vs. 전통적 메시지 큐

| 특징 | Kafka | RabbitMQ/ActiveMQ |
|------|-------|-------------------|
| **메시지 저장** | 디스크 (영구 저장) | 메모리 (휘발성) |
| **처리량** | 매우 높음 (수백만 msg/s) | 중간 |
| **메시지 순서** | Partition 내 보장 | 제한적 |
| **재처리** | 가능 (Offset 조정) | 어려움 |
| **확장성** | 수평 확장 우수 | 제한적 |
| **사용 사례** | 이벤트 스트리밍, 로그 | 태스크 큐, RPC |

## 💡 설계 원칙

### 1. Partition 수 결정

```
Partition 수 = max(예상 처리량 / Consumer 처리량, 최대 Consumer 수)

예시:
- 초당 10,000 메시지 입력
- Consumer 하나가 초당 1,000 메시지 처리
- 최소 Partition 수 = 10,000 / 1,000 = 10개
```

### 2. Replication Factor 선택

```
프로덕션: RF=3 (2개 Broker 장애 허용)
개발/테스트: RF=1
중요 데이터: RF=3, min.insync.replicas=2
```

### 3. Key 설계

```java
// 좋은 예: 같은 사용자의 이벤트는 순서 보장
record.key = userId

// 나쁜 예: 모든 메시지가 하나의 Partition으로
record.key = "constant-value"
```

## 📚 다음 단계

- [로컬 설치 및 실행](02-installation-setup.md)
- [Producer/Consumer 실습](03-producer-consumer.md)

## 🔗 참고 자료

- [Kafka 공식 문서](https://kafka.apache.org/documentation/)
- [Kafka 소개 (Confluent)](https://docs.confluent.io/platform/current/kafka/introduction.html)
- [Kafka 내부 구조](https://kafka.apache.org/documentation/#design)
