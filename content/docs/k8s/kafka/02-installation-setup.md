# Kafka 로컬 설치 및 실행

## 로컬 실습 경계

- 아래 ZooKeeper 기반 Compose는 역사적 학습 예시입니다. 현재 Kafka의 KRaft 구성, 이미지 변수와 지원 버전은 공식 릴리스 문서에서 확인합니다.
- 단일 호스트·평문 listener·예시 자격 증명은 프로덕션에 사용하지 않습니다. 외부 공개, TLS/SASL, 권한, persistent volume과 복제 장애는 별도 범위입니다.
- 다운로드와 이미지는 버전과 checksum/digest를 고정하고, `down -v`와 로그 디렉터리 삭제가 지우는 데이터를 먼저 확인합니다.
- 완료 기준은 broker process가 아니라 topic 생성, produce/consume, consumer group 상태, 재시작 후 데이터와 의도한 정리 결과입니다.

## 📖 개요

로컬 환경에서 Kafka를 설치하고 실행하는 방법을 학습합니다. Docker와 네이티브 설치 두 가지 방법을 모두 다룹니다.

## 🎯 학습 목표

- Kafka 로컬 환경 구성
- Topic 생성 및 관리
- 기본 명령어 실습
- 모니터링 도구 사용

## 📦 방법 1: ZooKeeper 기반 Docker Compose 학습 예시

### 전체 구성 파일

`docker-compose.yml` 파일 생성:

```yaml
version: '3.8'

services:
  # ZooKeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data
      - zookeeper-logs:/var/lib/zookeeper/log

  # Kafka Broker 1
  kafka1:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka1
    container_name: kafka1
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka1:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
      KAFKA_LOG_RETENTION_HOURS: 168
    volumes:
      - kafka1-data:/var/lib/kafka/data

  # Kafka Broker 2
  kafka2:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka2
    container_name: kafka2
    depends_on:
      - zookeeper
    ports:
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka2:29093,PLAINTEXT_HOST://localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
    volumes:
      - kafka2-data:/var/lib/kafka/data

  # Kafka Broker 3
  kafka3:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka3
    container_name: kafka3
    depends_on:
      - zookeeper
    ports:
      - "9094:9094"
    environment:
      KAFKA_BROKER_ID: 3
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka3:29094,PLAINTEXT_HOST://localhost:9094
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
    volumes:
      - kafka3-data:/var/lib/kafka/data

  # Kafka UI (모니터링 도구)
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka1
      - kafka2
      - kafka3
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka1:29092,kafka2:29093,kafka3:29094
      KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181

volumes:
  zookeeper-data:
  zookeeper-logs:
  kafka1-data:
  kafka2-data:
  kafka3-data:
```

### 실행 및 확인

```bash
# 클러스터 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f kafka1

# 컨테이너 상태 확인
docker-compose ps

# 클러스터 중지
docker-compose down

# 데이터 포함 완전 삭제
docker-compose down -v
```

### 단일 Broker 구성 (간단 테스트용)

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

## 📦 방법 2: 네이티브 설치

### Linux/macOS 설치

```bash
# 문서와 호환되는 Kafka 버전을 고정하고 checksum을 확인
wget https://downloads.apache.org/kafka/3.6.0/kafka_2.13-3.6.0.tgz

# 압축 해제
tar -xzf kafka_2.13-3.6.0.tgz
cd kafka_2.13-3.6.0

# 환경변수 설정 (선택)
echo 'export KAFKA_HOME=~/kafka_2.13-3.6.0' >> ~/.bashrc
echo 'export PATH=$PATH:$KAFKA_HOME/bin' >> ~/.bashrc
source ~/.bashrc
```

### ZooKeeper 시작

```bash
# ZooKeeper 시작 (터미널 1)
bin/zookeeper-server-start.sh config/zookeeper.properties

# 백그라운드 실행
bin/zookeeper-server-start.sh -daemon config/zookeeper.properties
```

### Kafka Broker 시작

```bash
# Kafka 시작 (터미널 2)
bin/kafka-server-start.sh config/server.properties

# 백그라운드 실행
bin/kafka-server-start.sh -daemon config/server.properties
```

### 다중 Broker 클러스터 구성

```bash
# server.properties 복사
cp config/server.properties config/server-1.properties
cp config/server.properties config/server-2.properties

# server-1.properties 수정
broker.id=1
listeners=PLAINTEXT://:9093
log.dirs=/tmp/kafka-logs-1

# server-2.properties 수정
broker.id=2
listeners=PLAINTEXT://:9094
log.dirs=/tmp/kafka-logs-2

# 각 Broker 시작
bin/kafka-server-start.sh -daemon config/server-1.properties
bin/kafka-server-start.sh -daemon config/server-2.properties
```

## 🔧 기본 명령어

### Topic 관리

```bash
# Topic 생성
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --partitions 3 \
  --replication-factor 3

# Topic 목록 조회
kafka-topics --list \
  --bootstrap-server localhost:9092

# Topic 상세 정보
kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# Topic 삭제
kafka-topics --delete \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# Partition 수 증가 (감소는 불가능)
kafka-topics --alter \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --partitions 5
```

### Console Producer

```bash
# 메시지 전송 (Enter로 구분)
kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# Key:Value 형식으로 전송
kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --property "parse.key=true" \
  --property "key.separator=:"

# 사용 예시:
# user1:Hello from user1
# user2:Hello from user2
```

### Console Consumer

```bash
# 최신 메시지부터 소비
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# 처음부터 모든 메시지 소비
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --from-beginning

# Key도 함께 출력
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --from-beginning \
  --property print.key=true \
  --property key.separator=":"

# Consumer Group 지정
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --group my-group \
  --from-beginning
```

### Consumer Group 관리

```bash
# Consumer Group 목록
kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list

# Consumer Group 상태 확인
kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group my-group \
  --describe

# Offset 리셋 (주의: Consumer 중지 상태에서만)
kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group my-group \
  --reset-offsets \
  --to-earliest \
  --topic my-topic \
  --execute

# 특정 Offset으로 리셋
kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group my-group \
  --reset-offsets \
  --to-offset 100 \
  --topic my-topic:0 \
  --execute
```

## 🔍 클러스터 상태 확인

### Broker 정보

```bash
# Broker 목록
kafka-broker-api-versions \
  --bootstrap-server localhost:9092

# 클러스터 ID 확인
kafka-cluster --cluster-id \
  --bootstrap-server localhost:9092
```

### Topic 메시지 수 확인

```bash
# Partition별 Offset 확인
kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic my-topic

# 출력 예시:
# my-topic:0:1234
# my-topic:1:2345
# my-topic:2:3456
```

### 로그 디렉토리 확인

```bash
# Docker 환경
docker exec kafka1 ls -la /var/lib/kafka/data

# 네이티브 환경
ls -la /tmp/kafka-logs
```

## 🖥️ Kafka UI 사용

브라우저에서 `http://localhost:8080` 접속

**주요 기능:**
- Topic 목록 및 상세 정보 확인
- 메시지 검색 및 조회
- Consumer Group 모니터링
- Broker 상태 확인
- 메시지 발행 (Producer)

## 📊 성능 테스트

### Producer 성능 테스트

```bash
kafka-producer-perf-test \
  --topic perf-test \
  --num-records 1000000 \
  --record-size 1024 \
  --throughput -1 \
  --producer-props \
    bootstrap.servers=localhost:9092 \
    acks=all
```

### Consumer 성능 테스트

```bash
kafka-consumer-perf-test \
  --broker-list localhost:9092 \
  --topic perf-test \
  --messages 1000000 \
  --threads 1
```

## 💡 실습 과제

### 과제 1: 주문 시스템 Topic 생성

```bash
# 1. orders Topic 생성 (3 Partition, RF=3)
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 3

# 2. 메시지 발행
kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic orders

# 3. 메시지 소비 (별도 터미널)
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning
```

### 과제 2: Consumer Group 동작 확인

```bash
# 터미널 1: Consumer 1
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --group order-processors

# 터미널 2: Consumer 2 (같은 그룹)
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --group order-processors

# 터미널 3: Producer
kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic orders

# 메시지가 두 Consumer에 분산되는지 확인
```

### 과제 3: Replication 테스트

```bash
# 1. Topic 상세 정보 확인
kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic orders

# 2. Leader Broker 중지
docker stop kafka1

# 3. 다시 상세 정보 확인 (Leader 변경 확인)
kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic orders

# 4. Broker 재시작
docker start kafka1
```

## 🐛 트러블슈팅

### 문제 1: "Connection to node -1 could not be established"
**원인**: Kafka Broker가 실행되지 않음
**해결:**
```bash
# Docker
docker-compose ps
docker-compose logs kafka1

# 네이티브
ps aux | grep kafka
tail -f logs/server.log
```

### 문제 2: Topic 생성 실패 "Timeout"
**원인**: ZooKeeper 연결 문제
**해결:**
```bash
# ZooKeeper 상태 확인
echo stat | nc localhost 2181
```

### 문제 3: "Replication factor: 3 larger than available brokers: 1"
**원인**: Broker 수보다 큰 Replication Factor
**해결:** 
```bash
# Broker 수에 맞게 RF 조정
--replication-factor 1
```

### 문제 4: 디스크 공간 부족
**해결:**
```bash
# 오래된 로그 삭제 (주의!)
# config/server.properties
log.retention.hours=24
log.retention.bytes=1073741824  # 1GB
```

## 🧹 환경 정리

```bash
# Docker 환경
docker-compose down -v

# 네이티브 환경
bin/kafka-server-stop.sh
bin/zookeeper-server-stop.sh
rm -rf /tmp/kafka-logs*
rm -rf /tmp/zookeeper
```

## 📚 다음 단계

- [Producer/Consumer 실습](03-producer-consumer.md)
- [토픽과 파티션 관리](04-topics-partitions.md)

## 🔗 참고 자료

- [Kafka Quickstart](https://kafka.apache.org/quickstart)
- [Kafka Docker 이미지](https://hub.docker.com/r/confluentinc/cp-kafka)
- [Kafka UI](https://github.com/provectus/kafka-ui)
