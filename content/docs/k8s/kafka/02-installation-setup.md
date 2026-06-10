# Kafka 로컬 설치와 실행

이 문서는 Kafka를 로컬에서 실행하고 topic, producer, consumer, consumer group을 확인하는 최소 실습 기준을 정리한다. 신규 실습은 ZooKeeper가 아니라 KRaft 기반 Kafka를 기본으로 둔다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Kafka 개념은 topic과 partition을 읽는 것만으로는 잘 익혀지지 않는다. 직접 broker를 띄우고 event를 쓰고 읽고 offset을 확인해야 producer/consumer 흐름이 선명해진다.

기존 ZooKeeper 기반 예제를 그대로 사용하면 최신 Kafka 학습 경로와 어긋난다. Apache Kafka 공식 quickstart도 KRaft 기반 standalone format과 `apache/kafka` Docker image 실행 흐름을 안내한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Confluent ZooKeeper compose, 3 broker compose, native ZooKeeper 실행, topic/producer/consumer 명령을 제공한다.

보완해야 할 점은 다음과 같다.

- ZooKeeper compose를 기본값으로 둔다.
- Kafka 3.6.0 같은 오래된 예제 버전을 고정한다.
- replication factor 3 예제가 단일 broker 실습과 섞여 실패하기 쉽다.
- 다음 단계 링크가 repository에 없는 문서를 가리킨다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 로컬 Kafka에서 다음 작업을 검증하는 것이다.

- Broker가 KRaft 모드로 실행된다.
- Topic을 생성하고 describe할 수 있다.
- Console producer로 event를 쓸 수 있다.
- Console consumer로 event를 읽을 수 있다.
- Consumer group offset과 lag를 확인할 수 있다.
- 실습 후 데이터와 container를 정리할 수 있다.

## 4. 시스템 번역 (Data Flow)

로컬 실습 흐름은 다음과 같다.

```text
Kafka broker start
  -> topic create
  -> console producer writes records
  -> broker stores records in log
  -> console consumer reads records
  -> consumer group commits offsets
  -> cleanup
```

단일 broker 실습은 Kafka 동작을 배우기 위한 환경이다. production 내구성, rolling upgrade, multi-broker replication을 검증하는 환경이 아니다.

## 5. 핵심 구성요소 (Building Blocks)

Docker 실행은 가장 빠른 로컬 실습 경로다. `apache/kafka` image는 별도 ZooKeeper 없이 실행할 수 있다.

Native 실행은 Kafka tarball을 내려받아 `kafka-storage.sh`로 KRaft log directory를 format한 뒤 `kafka-server-start.sh`를 실행한다.

`kafka-topics.sh`는 topic 생성, 목록, 상세 조회, partition 증가에 사용한다.

`kafka-console-producer.sh`는 표준 입력의 줄을 record로 보낸다.

`kafka-console-consumer.sh`는 topic에서 record를 읽는다.

`kafka-consumer-groups.sh`는 consumer group offset, current offset, log end offset, lag를 확인한다.

## 6. 상태 전이 (State Transition)

실습 환경은 다음 상태로 진행한다.

```text
runtime available
  -> broker running
  -> topic exists
  -> records produced
  -> records consumed
  -> group offset visible
  -> environment stopped
```

Native KRaft 실행은 추가로 다음 상태가 필요하다.

```text
Kafka archive extracted
  -> cluster UUID generated
  -> log directories formatted
  -> broker started
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 단일 broker 실습에서는 replication factor를 1로 둔다.
- ZooKeeper 설정을 신규 KRaft 실습에 섞지 않는다.
- Topic을 삭제하거나 volume을 지우기 전 필요한 event가 없는지 확인한다.
- Kafka image와 tarball 버전은 공식 download/quickstart 기준으로 확인하고 pin한다.
- Localhost advertised listener 문제를 먼저 의심한다.
- Consumer group offset reset은 consumer를 중지한 상태에서 의도적으로 수행한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Docker로 단일 broker를 실행한다. 버전은 공식 quickstart의 현재 예시를 확인하고 pin한다.

```bash
docker run -d --name kafka-quickstart -p 9092:9092 apache/kafka:4.3.0
docker logs -f kafka-quickstart
```

Topic을 만든다.

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic quickstart-events \
  --bootstrap-server localhost:9092
```

Topic을 확인한다.

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-topics.sh \
  --describe \
  --topic quickstart-events \
  --bootstrap-server localhost:9092
```

Producer를 실행해 몇 줄을 입력한다.

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-console-producer.sh \
  --topic quickstart-events \
  --bootstrap-server localhost:9092
```

Consumer로 처음부터 읽는다.

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-console-consumer.sh \
  --topic quickstart-events \
  --from-beginning \
  --bootstrap-server localhost:9092
```

Consumer group을 지정해 읽은 뒤 상태를 확인한다.

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-console-consumer.sh \
  --topic quickstart-events \
  --group quickstart-group \
  --from-beginning \
  --bootstrap-server localhost:9092
```

```bash
docker exec -it kafka-quickstart /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group quickstart-group \
  --describe
```

정리한다.

```bash
docker rm -f kafka-quickstart
```

Native 실행은 Java 17 이상이 필요하다.

```bash
tar -xzf kafka_2.13-4.3.0.tgz
cd kafka_2.13-4.3.0
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
bin/kafka-storage.sh format --standalone -t "$KAFKA_CLUSTER_ID" -c config/server.properties
bin/kafka-server-start.sh config/server.properties
```

## 9. 실패 사례 (What could go wrong?)

`Connection to node -1 could not be established`는 broker가 아직 ready가 아니거나 advertised listener가 client에서 접근 불가능할 때 자주 나온다. Docker log와 port mapping을 먼저 확인한다.

`Replication factor larger than available brokers`는 broker 수보다 큰 replication factor로 topic을 만들 때 발생한다. 단일 broker 실습은 replication factor 1을 사용한다.

Consumer가 메시지를 못 읽는 것처럼 보여도 이미 group offset이 끝까지 commit된 상태일 수 있다. `--from-beginning`은 새 group이거나 offset이 없는 경우에 의미가 있다.

Container를 지워도 volume이나 bind mount를 따로 둔 경우 data가 남을 수 있다. 실습 정리 범위를 명확히 확인한다.

Kafka UI를 붙이면 편하지만 UI가 보여주는 상태와 CLI 결과를 함께 확인해야 한다. UI가 broker 문제를 해결해주지는 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

Multi-broker 실습은 listener, controller quorum, broker id, volume, replication factor가 모두 맞아야 한다. 단일 broker 실습을 통과한 뒤 별도 compose로 분리해서 다룬다.

Kubernetes에서 Kafka를 실행하려면 단순 StatefulSet보다 operator를 검토한다. Broker identity, storage, rolling update, TLS, topic/user 관리를 직접 작성하기 어렵기 때문이다.

Production Kafka는 PLAINTEXT localhost가 아니다. TLS, SASL, ACL, rack awareness, monitoring, backup, capacity planning이 함께 필요하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Kafka image 또는 tarball 버전을 공식 문서 기준으로 확인했다.
- [ ] Broker가 KRaft 모드로 실행된다.
- [ ] Topic 생성과 describe가 성공했다.
- [ ] Producer로 event를 기록했다.
- [ ] Consumer로 event를 읽었다.
- [ ] Consumer group lag를 확인했다.
- [ ] 단일 broker에서는 replication factor 1을 사용했다.
- [ ] 실습 후 container와 local data를 정리했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Kafka 로컬 실습은 broker를 띄우고 topic에 event를 쓰고 consumer group offset을 확인하는 흐름이다. 신규 실습은 ZooKeeper가 아니라 KRaft 기준으로 시작하고, 단일 broker에서는 replication factor를 1로 둔다.
