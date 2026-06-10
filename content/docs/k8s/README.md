# DevOps 도구 실습 문서

이 섹션은 Terraform, Ansible, Kafka, Kubernetes를 하나의 운영 흐름으로 학습하기 위한 문서 묶음이다. 목표는 도구별 명령을 외우는 것이 아니라 “인프라 생성, 서버 설정, 애플리케이션 배포, 이벤트 흐름”의 경계를 이해하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

현대 DevOps 환경에서는 하나의 도구로 전체 배포를 끝내기 어렵다. Terraform은 클라우드 리소스를 만들고, Ansible은 서버 설정을 맞추고, Kubernetes는 컨테이너를 배포하고, Kafka는 서비스 간 이벤트 흐름을 담당한다.

이 도구들의 경계를 모르면 Terraform으로 애플리케이션 설정까지 밀어 넣거나, Ansible로 Kubernetes 선언형 상태를 반복 적용하거나, Kafka를 단순 queue처럼 잘못 운영하게 된다.

## 2. 현재 나의 상태 (Baseline)

기존 README는 Terraform, Ansible, Kafka, Kubernetes, 통합 시나리오를 넓게 소개한다. 하지만 실제 repository에는 다음 문서만 존재한다.

- [Terraform 기본 설정](terraform/01-basic-setup.md)
- [AWS EC2 예제](terraform/02-aws-ec2-example.md)
- [Ansible 설치 및 설정](ansible/01-installation-setup.md)
- [Kafka 개념과 아키텍처](kafka/01-concepts-architecture.md)
- [Kafka 설치와 실행](kafka/02-installation-setup.md)
- [Kubernetes 클러스터 설정](kubernetes/01-cluster-setup.md)
- [Pod와 Deployment](kubernetes/02-pods-deployments.md)
- [DevOps 파이프라인 통합](integration/01-devops-pipeline.md)

존재하지 않는 링크는 제거하고, 현재 있는 문서 기준으로 학습 경로를 잡아야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 각 도구의 책임을 분리한 뒤 하나의 배포 흐름으로 연결하는 것이다.

- Terraform으로 cloud/network/compute resource를 선언한다.
- Ansible로 host package, config, service 상태를 맞춘다.
- Kubernetes로 container workload의 desired state를 관리한다.
- Kafka로 비동기 event stream과 consumer group 흐름을 이해한다.
- 통합 문서에서 CI/CD와 운영 검증 경계를 연결한다.

## 4. 시스템 번역 (Data Flow)

이 문서 묶음의 전체 흐름은 다음과 같다.

```text
Terraform
  -> infrastructure resources
  -> Ansible inventory or host targets
  -> configured runtime nodes
  -> Kubernetes cluster
  -> workloads and services
  -> Kafka topics and consumers
  -> CI/CD feedback
```

모든 도구가 모든 일을 하지 않는다. 중요한 것은 “어떤 상태를 누가 소유하는가”를 정하는 것이다.

## 5. 핵심 구성요소 (Building Blocks)

Terraform은 provider API를 통해 인프라 리소스를 생성하고 state로 추적한다.

Ansible은 inventory에 있는 host에 SSH로 접속해 package, file, service 상태를 idempotent하게 맞춘다.

Kubernetes는 API server에 선언한 desired state를 controller가 계속 reconcile하는 구조다.

Kafka는 topic partition에 event를 저장하고 consumer group이 offset을 관리하는 분산 로그다.

CI/CD는 build, test, image publish, deploy, rollback을 연결하는 자동화 흐름이다.

## 6. 상태 전이 (State Transition)

학습 순서는 다음 상태로 진행한다.

```text
local tools installed
  -> Terraform basics
  -> Ansible basics
  -> Kubernetes local cluster
  -> Pod and Deployment
  -> Kafka concepts
  -> Kafka local run
  -> integrated pipeline
```

운영 관점에서는 다음 상태를 목표로 한다.

```text
manual setup
  -> reproducible infrastructure
  -> repeatable configuration
  -> declarative deployment
  -> observable event flow
  -> automated delivery
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Terraform state는 민감 정보와 drift 위험을 가진 운영 자산이다.
- Ansible playbook은 반복 실행해도 결과가 안정적이어야 한다.
- Kubernetes manifest는 현재 cluster API version과 맞아야 한다.
- Kafka topic partition과 retention은 나중에 쉽게 바꾸기 어려운 운영 계약이다.
- Secret은 Git에 평문으로 넣지 않는다.
- 실습 명령은 local과 cloud 비용 경계를 구분해서 실행한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

로컬 도구 버전을 확인한다.

```bash
terraform version
ansible --version
kubectl version --client
docker version
```

Kubernetes local cluster를 확인한다.

```bash
kubectl cluster-info
kubectl get nodes
```

Kafka나 cloud 실습은 비용과 리소스 정리 절차를 먼저 확인한 뒤 실행한다.

```text
plan
  -> apply
  -> verify
  -> destroy or cleanup
```

## 9. 실패 사례 (What could go wrong?)

Terraform으로 만든 리소스를 콘솔에서 직접 수정하면 state와 실제 인프라가 drift된다.

Ansible task가 매번 changed로 표시되면 idempotency가 깨진 것이다. 운영 자동화에서는 변경 여부가 신뢰 가능한 신호여야 한다.

Kubernetes manifest의 `apiVersion`이 cluster에서 지원되지 않으면 apply가 실패한다. 실습 전 cluster version과 공식 API 문서를 확인한다.

Kafka를 단일 broker로만 실습하고 production 감각으로 옮기면 replication, ISR, retention, consumer lag 문제를 놓친다.

Cloud 실습 후 destroy를 하지 않으면 비용이 계속 발생할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

Terraform과 Ansible은 겹치는 영역이 있지만 책임을 분리하는 편이 유지보수에 유리하다. Terraform은 인프라 생명주기, Ansible은 OS와 서비스 설정에 집중한다.

Kubernetes는 application desired state를 관리하지만, cluster 자체 provisioning은 Terraform, Cluster API, managed service 도구가 담당할 수 있다.

Kafka는 Kubernetes 위에서 운영할 수도 있지만 stateful workload이므로 storage, broker identity, rolling update, backup, monitoring을 더 엄격히 설계해야 한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 현재 README의 링크가 실제 파일과 일치한다.
- [ ] Terraform, Ansible, Kubernetes, Kafka의 책임을 구분한다.
- [ ] local 실습과 cloud 실습의 비용 경계를 알고 있다.
- [ ] 각 도구의 상태 저장 위치를 알고 있다.
- [ ] Secret을 Git에 넣지 않는 원칙을 세웠다.
- [ ] 실습 후 cleanup 또는 destroy 절차를 확인했다.
- [ ] 통합 파이프라인 문서로 다음 학습 흐름을 이어갈 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

DevOps 도구 묶음의 핵심은 “모든 도구로 모든 일을 하기”가 아니라 상태 소유권을 나누는 것이다. Terraform은 인프라, Ansible은 설정, Kubernetes는 workload, Kafka는 event stream을 담당한다.
