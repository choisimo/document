# DevOps 도구 실습 가이드

이 가이드는 Terraform, Ansible, Kafka, Kubernetes의 핵심 개념과 실습을 통해 현대적인 DevOps 파이프라인을 이해하는 것을 목표로 합니다.

## 📚 학습 목차

### 1. Terraform - 인프라스트럭처 as Code
- [기본 설정 및 첫 리소스 생성](terraform/01-basic-setup.md)
- [AWS EC2 실습 예제](terraform/02-aws-ec2-example.md)
- [상태 관리와 모듈화](terraform/03-state-management.md)
- [변수와 출력](terraform/04-variables-outputs.md)

### 2. Ansible - 자동화 및 설정 관리
- [설치 및 초기 설정](ansible/01-installation-setup.md)
- [Inventory 작성 방법](ansible/02-inventory-basics.md)
- [Playbook 작성 실습](ansible/03-playbook-examples.md)
- [Role과 재사용성](ansible/04-roles.md)

### 3. Kafka - 분산 이벤트 스트리밍
- [개념 및 아키텍처](kafka/01-concepts-architecture.md)
- [로컬 설치 및 실행](kafka/02-installation-setup.md)
- [Producer/Consumer 실습](kafka/03-producer-consumer.md)
- [토픽과 파티션 관리](kafka/04-topics-partitions.md)

### 4. Kubernetes - 컨테이너 오케스트레이션
- [클러스터 설정 (minikube)](kubernetes/01-cluster-setup.md)
- [Pod와 Deployment](kubernetes/02-pods-deployments.md)
- [Service와 네트워킹](kubernetes/03-services-networking.md)
- [ConfigMap과 Secret](kubernetes/04-configmap-secret.md)
- [StatefulSet과 영구 스토리지](kubernetes/05-statefulset-storage.md)

### 5. 통합 시나리오
- [전체 DevOps 파이프라인 구성](integration/01-devops-pipeline.md)
- [Terraform으로 K8s 클러스터 프로비저닝](integration/02-terraform-k8s.md)
- [Kubernetes에서 Kafka 운영](integration/03-k8s-kafka.md)
- [마이크로서비스 배포 시나리오](integration/04-microservices-deployment.md)

## 🚀 학습 순서 추천

### 초급: 개별 도구 이해
1. Terraform 기본 → AWS 리소스 생성 실습
2. Kubernetes 기본 → Pod, Deployment 실습
3. Ansible 기본 → 간단한 Playbook 실행

### 중급: 도구 조합
1. Terraform + Kubernetes 통합
2. Ansible로 서버 설정 자동화
3. Kubernetes에서 Kafka 배포

### 고급: 전체 파이프라인
1. 이벤트 기반 마이크로서비스 아키텍처
2. CI/CD 파이프라인 구축
3. 프로덕션 환경 모니터링

## 💡 실습 환경 요구사항

### 필수 설치 도구
- Docker Desktop (최신 버전)
- kubectl (Kubernetes CLI)
- minikube 또는 kind (로컬 K8s 클러스터)
- Terraform CLI
- Ansible

### 클라우드 계정 (선택사항)
- AWS Free Tier 계정
- Azure 또는 GCP 계정

### 시스템 요구사항
- CPU: 4코어 이상
- RAM: 8GB 이상
- 디스크: 20GB 여유 공간

## 📖 각 도구의 역할

| 도구 | 역할 | 사용 시점 |
|------|------|-----------|
| **Terraform** | 인프라 프로비저닝 | 클라우드 리소스, 네트워크, 스토리지 생성 |
| **Ansible** | 설정 관리 및 자동화 | 서버 설정, 패키지 설치, 파일 배포 |
| **Kubernetes** | 컨테이너 오케스트레이션 | 애플리케이션 배포, 스케일링, 관리 |
| **Kafka** | 이벤트 스트리밍 | 마이크로서비스 간 비동기 통신 |

## 🎯 학습 목표

이 가이드를 완료하면 다음을 할 수 있게 됩니다:

- ✅ 코드로 인프라스트럭처를 정의하고 관리
- ✅ 서버 설정을 자동화하여 일관성 유지
- ✅ 컨테이너 기반 애플리케이션을 안정적으로 배포
- ✅ 이벤트 기반 아키텍처로 확장 가능한 시스템 구축
- ✅ 네 가지 도구를 조합하여 완전한 DevOps 파이프라인 구성

## 📝 학습 방법

각 섹션은 다음 구조로 구성됩니다:

1. **개념 설명**: 핵심 개념과 아키텍처
2. **실습 예제**: 직접 실행해볼 수 있는 코드
3. **패턴 분석**: 실무에서 사용되는 베스트 프랙티스
4. **트러블슈팅**: 자주 발생하는 문제와 해결 방법

## 🤝 기여하기

이 가이드는 계속 발전합니다. 개선 사항이나 추가할 내용이 있다면 PR을 보내주세요!

---

**시작하기**: [Terraform 기본 설정](terraform/01-basic-setup.md)부터 시작하세요!
