# 통합 실습: DevOps 파이프라인의 최소 연결 경로

## 실습 경계와 완료 조건

- 이 예제는 Terraform, Ansible, Kubernetes와 Kafka의 연결 순서를 학습하기 위한 단일 환경 경로입니다. 프로덕션 참조 아키텍처나 완전 자동화가 아닙니다.
- AWS 비용, IAM 최소 권한, 이미지 registry, DNS/TLS, 비밀, state backend, Kafka 보안·내구성, 애플리케이션 데이터 일관성은 별도 설계가 필요합니다.
- 각 단계는 이전 단계의 출력값을 명시적으로 받아야 하며, 부분 실패 후 재실행·정리와 Terraform state 소유자를 정합니다.
- 완료 증거는 인프라 상태, 노드 구성의 idempotency, Kubernetes readiness, Kafka produce/consume, 애플리케이션 결과와 전체 정리 후 잔여 비용 확인입니다.

## 📖 개요

Terraform, Ansible, Kubernetes, Kafka를 순서대로 연결해 최소 주문 이벤트 경로를 구성하는 실습입니다.

## 🎯 학습 목표

- 4가지 도구의 연계 방법 이해
- 이벤트 기반 마이크로서비스 구축
- 예제 인프라 프로비저닝과 구성 흐름 자동화
- 프로덕션 전환 시 빠진 보안·복구·관측 요구 식별

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│ 1단계: Terraform (인프라 프로비저닝)                         │
│   - AWS VPC, Subnets                                         │
│   - EC2 Instances for K8s Nodes                              │
│   - Security Groups                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2단계: Ansible (시스템 설정)                                 │
│   - Docker 설치                                              │
│   - Kubernetes 구성                                          │
│   - 모니터링 도구 설치                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3단계: Kubernetes (애플리케이션 배포)                        │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ Kafka Cluster (StatefulSet)                           │ │
│   │   - 3 Brokers                                         │ │
│   │   - ZooKeeper Ensemble                                │ │
│   └───────────────────────────────────────────────────────┘ │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ Microservices                                         │ │
│   │   - Order Service → [orders 토픽]                     │ │
│   │   - Payment Service ← [orders 토픽]                   │ │
│   │   - Notification Service ← [payments 토픽]            │ │
│   └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 프로젝트 구조

```
devops-pipeline/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── vpc/
│       ├── ec2/
│       └── security/
├── ansible/
│   ├── inventory/
│   │   └── hosts.yml
│   ├── playbooks/
│   │   ├── docker-install.yml
│   │   ├── k8s-setup.yml
│   │   └── monitoring.yml
│   └── roles/
│       ├── docker/
│       ├── kubernetes/
│       └── monitoring/
├── kubernetes/
│   ├── kafka/
│   │   ├── namespace.yaml
│   │   ├── zookeeper-statefulset.yaml
│   │   ├── kafka-statefulset.yaml
│   │   └── kafka-service.yaml
│   ├── microservices/
│   │   ├── order-service.yaml
│   │   ├── payment-service.yaml
│   │   └── notification-service.yaml
│   └── monitoring/
│       ├── prometheus.yaml
│       └── grafana.yaml
└── apps/
    ├── order-service/
    │   ├── Dockerfile
    │   └── app.py
    ├── payment-service/
    │   ├── Dockerfile
    │   └── app.py
    └── notification-service/
        ├── Dockerfile
        └── app.py
```

## 🚀 실습 시나리오: E-Commerce 주문 처리 시스템

### 시나리오 설명

1. **Order Service**: 고객 주문 접수 → Kafka `orders` 토픽에 발행
2. **Payment Service**: `orders` 토픽 구독 → 결제 처리 → `payments` 토픽에 발행
3. **Notification Service**: `payments` 토픽 구독 → 고객에게 알림 전송

## 단계 1: Terraform으로 인프라 구성

### terraform/main.tf

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "./modules/vpc"
  
  vpc_cidr     = "10.0.0.0/16"
  cluster_name = var.cluster_name
}

# K8s 노드용 EC2
module "k8s_nodes" {
  source = "./modules/ec2"
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  instance_count  = 3
  instance_type   = "t3.medium"
  cluster_name    = var.cluster_name
}

# Bastion Host
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnet_ids[0]
  
  key_name               = var.key_name
  vpc_security_group_ids = [module.vpc.bastion_sg_id]
  
  tags = {
    Name = "${var.cluster_name}-bastion"
  }
}

# 출력
output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "k8s_node_private_ips" {
  value = module.k8s_nodes.private_ips
}
```

### terraform/variables.tf

```hcl
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "cluster_name" {
  description = "클러스터 이름"
  type        = string
  default     = "devops-demo"
}

variable "key_name" {
  description = "SSH 키 페어 이름"
  type        = string
}
```

### 실행

```bash
cd terraform

# 초기화
terraform init

# 계획 확인
terraform plan -var="key_name=my-key"

# 적용
terraform apply -var="key_name=my-key" -auto-approve

# 출력 확인
terraform output
```

## 단계 2: Ansible로 시스템 설정

### ansible/inventory/hosts.yml

```yaml
all:
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: ~/.ssh/my-key.pem
    
  children:
    k8s_masters:
      hosts:
        master01:
          ansible_host: 10.0.1.10
    
    k8s_workers:
      hosts:
        worker01:
          ansible_host: 10.0.1.11
        worker02:
          ansible_host: 10.0.1.12
    
    bastion:
      hosts:
        bastion01:
          ansible_host: <BASTION_PUBLIC_IP>
```

### ansible/playbooks/full-setup.yml

```yaml
---
- name: 전체 시스템 설정
  hosts: all
  become: yes
  
  tasks:
    - name: 시스템 업데이트
      apt:
        update_cache: yes
        upgrade: dist
    
    - name: 필수 패키지 설치
      apt:
        name:
          - curl
          - wget
          - vim
          - git
        state: present

- name: Docker 설치
  hosts: all
  become: yes
  roles:
    - docker

- name: Kubernetes 설치
  hosts: k8s_masters:k8s_workers
  become: yes
  roles:
    - kubernetes

- name: Kubernetes 클러스터 초기화
  hosts: k8s_masters
  become: yes
  tasks:
    - name: kubeadm init
      shell: |
        kubeadm init --pod-network-cidr=10.244.0.0/16
      args:
        creates: /etc/kubernetes/admin.conf
    
    - name: kubeconfig 복사
      fetch:
        src: /etc/kubernetes/admin.conf
        dest: ~/.kube/config
        flat: yes

- name: Worker 노드 Join
  hosts: k8s_workers
  become: yes
  tasks:
    - name: Join 명령 실행
      shell: |
        {{ hostvars['master01']['join_command'] }}
```

### ansible/roles/docker/tasks/main.yml

```yaml
---
- name: Docker GPG 키 추가
  apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present

- name: Docker 저장소 추가
  apt_repository:
    repo: deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable
    state: present

- name: Docker 설치
  apt:
    name:
      - docker-ce
      - docker-ce-cli
      - containerd.io
    state: present
    update_cache: yes

- name: 사용자를 docker 그룹에 추가
  user:
    name: "{{ ansible_user }}"
    groups: docker
    append: yes

- name: Docker 서비스 시작
  systemd:
    name: docker
    state: started
    enabled: yes
```

### 실행

```bash
cd ansible

# 연결 테스트
ansible all -i inventory/hosts.yml -m ping

# Playbook 실행
ansible-playbook -i inventory/hosts.yml playbooks/full-setup.yml
```

## 단계 3: Kubernetes에 Kafka 배포

### kubernetes/kafka/namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kafka
```

### kubernetes/kafka/zookeeper-statefulset.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
  namespace: kafka
spec:
  ports:
  - port: 2181
    name: client
  - port: 2888
    name: peer
  - port: 3888
    name: leader-election
  clusterIP: None
  selector:
    app: zookeeper
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
  namespace: kafka
spec:
  serviceName: zookeeper
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: confluentinc/cp-zookeeper:7.5.0
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: peer
        - containerPort: 3888
          name: leader-election
        env:
        - name: ZOOKEEPER_SERVER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ZOOKEEPER_CLIENT_PORT
          value: "2181"
        - name: ZOOKEEPER_TICK_TIME
          value: "2000"
        - name: ZOOKEEPER_SERVERS
          value: "zookeeper-0.zookeeper:2888:3888;zookeeper-1.zookeeper:2888:3888;zookeeper-2.zookeeper:2888:3888"
        volumeMounts:
        - name: datadir
          mountPath: /var/lib/zookeeper/data
  volumeClaimTemplates:
  - metadata:
      name: datadir
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### kubernetes/kafka/kafka-statefulset.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kafka
  namespace: kafka
spec:
  ports:
  - port: 9092
    name: client
  clusterIP: None
  selector:
    app: kafka
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kafka
  namespace: kafka
spec:
  serviceName: kafka
  replicas: 3
  selector:
    matchLabels:
      app: kafka
  template:
    metadata:
      labels:
        app: kafka
    spec:
      containers:
      - name: kafka
        image: confluentinc/cp-kafka:7.5.0
        ports:
        - containerPort: 9092
          name: client
        env:
        - name: KAFKA_BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181"
        - name: KAFKA_ADVERTISED_LISTENERS
          value: "PLAINTEXT://$(POD_NAME).kafka:9092"
        - name: KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR
          value: "3"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: datadir
          mountPath: /var/lib/kafka/data
  volumeClaimTemplates:
  - metadata:
      name: datadir
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
```

### 배포

```bash
# Namespace 생성
kubectl apply -f kubernetes/kafka/namespace.yaml

# ZooKeeper 배포
kubectl apply -f kubernetes/kafka/zookeeper-statefulset.yaml

# 준비 확인 (Running만이 아니라 readiness와 로그 확인)
kubectl get pods -n kafka -l app=zookeeper

# Kafka 배포
kubectl apply -f kubernetes/kafka/kafka-statefulset.yaml

# 준비 확인
kubectl get pods -n kafka -l app=kafka

# Topic 생성
kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --create \
  --bootstrap-server kafka-0.kafka:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 3

kubectl exec -it kafka-0 -n kafka -- kafka-topics \
  --create \
  --bootstrap-server kafka-0.kafka:9092 \
  --topic payments \
  --partitions 3 \
  --replication-factor 3
```

## 단계 4: 마이크로서비스 배포

### apps/order-service/app.py

```python
from flask import Flask, request, jsonify
from kafka import KafkaProducer
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

producer = KafkaProducer(
    bootstrap_servers=['kafka-0.kafka.kafka.svc.cluster.local:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

@app.route('/orders', methods=['POST'])
def create_order():
    order = request.json
    order_id = order.get('id')
    
    logging.info(f"Creating order: {order_id}")
    
    # Kafka에 발행
    producer.send('orders', value=order)
    producer.flush()
    
    return jsonify({"status": "success", "order_id": order_id}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### apps/payment-service/app.py

```python
from kafka import KafkaConsumer, KafkaProducer
import json
import logging

logging.basicConfig(level=logging.INFO)

consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['kafka-0.kafka.kafka.svc.cluster.local:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    group_id='payment-service'
)

producer = KafkaProducer(
    bootstrap_servers=['kafka-0.kafka.kafka.svc.cluster.local:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

logging.info("Payment Service started")

for message in consumer:
    order = message.value
    logging.info(f"Processing payment for order: {order['id']}")
    
    # 결제 처리 로직
    payment = {
        "order_id": order['id'],
        "amount": order['amount'],
        "status": "completed"
    }
    
    # Kafka에 결과 발행
    producer.send('payments', value=payment)
    producer.flush()
    
    logging.info(f"Payment completed: {payment}")
```

### kubernetes/microservices/order-service.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: kafka
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:v1
        ports:
        - containerPort: 8080
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka-0.kafka:9092"
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: kafka
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: order-service
```

### 배포

```bash
# 이미지 빌드 및 푸시 (Docker registry 필요)
docker build -t myregistry/order-service:v1 apps/order-service/
docker push myregistry/order-service:v1

docker build -t myregistry/payment-service:v1 apps/payment-service/
docker push myregistry/payment-service:v1

# 배포
kubectl apply -f kubernetes/microservices/
```

## 🧪 시스템 테스트

```bash
# Order Service 엔드포인트 확인
ORDER_SERVICE_URL=$(kubectl get svc order-service -n kafka -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# 주문 생성
curl -X POST http://$ORDER_SERVICE_URL/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "order-001",
    "customer": "John Doe",
    "amount": 99.99,
    "items": ["laptop", "mouse"]
  }'

# Payment Service 로그 확인
kubectl logs -f deployment/payment-service -n kafka

# Notification Service 로그 확인
kubectl logs -f deployment/notification-service -n kafka

# Kafka 토픽 메시지 확인
kubectl exec -it kafka-0 -n kafka -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning

kubectl exec -it kafka-0 -n kafka -- kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic payments \
  --from-beginning
```

## 📊 모니터링

### Prometheus 배포

```yaml
# kubernetes/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: kafka
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
```

## 🧹 전체 정리

```bash
# Kubernetes 리소스 삭제
kubectl delete namespace kafka

# Ansible로 시스템 정리 (선택사항)
ansible all -i inventory/hosts.yml -m shell -a "kubeadm reset -f" --become

# Terraform으로 인프라 삭제
cd terraform
terraform destroy -var="key_name=my-key" -auto-approve
```

## 📚 다음 단계

- CI/CD 파이프라인 구축 (Jenkins, ArgoCD)
- 로그 수집 (ELK Stack)
- 보안 강화 (네트워크 정책, RBAC)
- 고가용성 구성

## 🔗 참고 자료

- [Terraform AWS 모듈](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)
- [Ansible Kubernetes 모듈](https://docs.ansible.com/ansible/latest/collections/kubernetes/core/index.html)
- [Kafka on Kubernetes](https://strimzi.io/)
- [Kubernetes 패턴](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/)
