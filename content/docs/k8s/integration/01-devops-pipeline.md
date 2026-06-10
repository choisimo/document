# DevOps 파이프라인 통합 기준

이 문서는 Terraform, Ansible, Kubernetes, Kafka를 하나의 파이프라인으로 연결할 때의 책임 경계와 검증 순서를 정리한다. 목표는 모든 예제 코드를 한 파일에 넣는 것이 아니라 각 단계의 입력, 출력, 실패 조건을 명확히 하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

DevOps 파이프라인은 여러 도구가 이어진 체인이다. Terraform state가 잘못되면 Ansible inventory가 틀리고, Ansible 설정이 불완전하면 Kubernetes node가 준비되지 않으며, Kubernetes 배포가 불안정하면 Kafka consumer lag와 서비스 장애가 뒤따른다.

도구를 한 번에 묶으면 자동화된 것처럼 보이지만, 각 단계의 완료 조건이 없으면 실패 지점을 찾기 어렵다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 AWS VPC/EC2, Ansible kubeadm 설정, Kubernetes Kafka StatefulSet, 마이크로서비스 배포, CI/CD까지 하나의 긴 실습으로 작성되어 있다.

보완해야 할 점은 다음과 같다.

- Terraform, Ansible, Kubernetes가 소유하는 상태가 명확하지 않다.
- Ansible로 kubeadm cluster를 만드는 예제가 join token, CNI, container runtime, cgroup driver 검증을 생략한다.
- Kafka 예제가 ZooKeeper 기반이다. Apache Kafka는 KRaft 모드에서 ZooKeeper 의존성을 제거했으며, 신규 Kafka 4.x 계열에서는 ZooKeeper 모드를 전제로 설계하면 안 된다.
- cleanup과 비용 중단 조건이 뒤쪽에 묻혀 있다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 단계별로 검증 가능한 통합 파이프라인이다.

- Terraform은 network, compute, IAM/security group 같은 cloud resource를 만든다.
- Terraform output은 Ansible inventory 또는 cluster bootstrap 입력으로 전달된다.
- Ansible은 OS package, container runtime, kubeadm prerequisite 같은 host 상태를 맞춘다.
- Kubernetes는 workload, service, config, secret, storage desired state를 관리한다.
- Kafka는 KRaft 기반 또는 operator 기반으로 배포하고, topic/consumer lag를 관측한다.
- 각 단계에는 verify와 rollback/cleanup이 있다.

## 4. 시스템 번역 (Data Flow)

통합 흐름은 다음과 같다.

```text
Git commit
  -> Terraform plan and apply
  -> infrastructure outputs
  -> Ansible inventory
  -> host bootstrap
  -> Kubernetes API
  -> application manifests
  -> Kafka topics and consumers
  -> monitoring and rollback signal
```

중요한 것은 output contract다. Terraform output이 바뀌면 Ansible inventory가 바뀌고, Kubernetes endpoint가 바뀌면 애플리케이션 배포 변수가 바뀐다.

## 5. 핵심 구성요소 (Building Blocks)

Terraform plan은 cloud 변경 전 검토 지점이다. `apply` 전에 resource 생성, 변경, 삭제를 확인한다.

Terraform state는 인프라의 source of truth다. remote backend, lock, secret 노출 정책을 정해야 한다.

Ansible inventory는 host 접속 정보와 group 역할을 표현한다. Terraform output에서 생성할 수 있지만, 생성 후 검증은 별도다.

Kubernetes API server는 workload desired state를 받는다. `kubectl apply` 성공은 readiness 성공과 다르다.

Kafka는 event log다. 신규 구성에서는 ZooKeeper 기반 예제보다 KRaft 또는 검증된 Kubernetes operator를 우선 검토한다.

CI/CD runner는 credential, network access, artifact, deployment 권한을 가진다. 가장 강한 권한 경계 중 하나다.

## 6. 상태 전이 (State Transition)

파이프라인은 다음 상태로 진행한다.

```text
code reviewed
  -> terraform plan approved
  -> infrastructure applied
  -> host inventory generated
  -> ansible ping passed
  -> bootstrap playbook converged
  -> kubernetes nodes ready
  -> workloads ready
  -> kafka health verified
  -> smoke test passed
```

각 상태는 다음 단계의 입력 조건이다. 예를 들어 `nodes ready` 전에는 workload 배포를 진행하지 않는다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Terraform state와 cloud console 수동 변경을 동시에 source of truth로 두지 않는다.
- Ansible playbook은 반복 실행해도 불필요한 변경을 만들지 않는다.
- Kubernetes manifest에는 secret을 평문으로 넣지 않는다.
- `kubectl apply` 성공만으로 배포 성공으로 판단하지 않는다.
- Kafka는 topic replication, retention, partition, consumer group lag를 함께 본다.
- cloud 실습은 cleanup 조건과 비용 중단 절차를 포함한다.
- CI/CD credential은 최소 권한과 rotation 기준을 가져야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Terraform 단계는 plan부터 시작한다.

```bash
terraform init
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

Terraform output에서 inventory를 만든 뒤 Ansible 연결을 검증한다.

```bash
ansible all -i inventory/hosts.ini -m ping
ansible all -i inventory/hosts.ini -m ansible.builtin.command -a "uname -a"
```

host bootstrap은 check mode와 실제 실행을 분리한다.

```bash
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --check --diff
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml
```

Kubernetes 상태를 확인한다.

```bash
kubectl get nodes
kubectl get pods --all-namespaces
kubectl get events --sort-by=.lastTimestamp
```

workload 배포 후 rollout을 기다린다.

```bash
kubectl apply -f kubernetes/
kubectl rollout status deployment/order-service
kubectl rollout status deployment/payment-service
```

Kafka는 배포 방식에 맞는 health check를 둔다.

```text
broker ready
  -> controller quorum ready
  -> topic exists
  -> producer smoke test
  -> consumer group lag checked
```

cleanup은 별도 단계로 명시한다.

```bash
kubectl delete -f kubernetes/
terraform destroy
```

## 9. 실패 사례 (What could go wrong?)

Terraform apply 후 output을 수동으로 복사해 inventory를 만들면 IP 변경이나 resource 재생성 때 drift가 발생한다. output 생성 자동화와 검증을 분리한다.

Ansible이 Docker를 설치했지만 Kubernetes가 쓰는 container runtime endpoint가 맞지 않으면 kubelet이 올라오지 않는다. Kubernetes 공식 문서는 kubeadm cluster에서 container runtime과 kubelet cgroup driver 일치가 중요하다고 설명한다.

Kubernetes pod가 `Running`이어도 readiness probe가 실패하면 service traffic을 받으면 안 된다. rollout status와 readiness를 같이 본다.

Kafka를 ZooKeeper 기반으로 새로 설계하면 Kafka 4.x 이후 운영 경로와 충돌한다. 신규 학습은 KRaft 또는 operator 문서를 기준으로 잡는다.

Cloud 실습에서 `terraform destroy`를 빼먹으면 EC2, NAT Gateway, EBS, load balancer 비용이 계속 발생할 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

Managed Kubernetes(EKS/GKE/AKS)를 쓰면 Ansible이 kubeadm을 직접 구성하는 영역이 줄어든다. 대신 IAM, node group, add-on, CNI, ingress controller가 Terraform 또는 platform 설정으로 이동한다.

Kafka on Kubernetes는 직접 StatefulSet보다 Strimzi 같은 operator를 쓰는 편이 운영 계약을 더 명확히 만들 수 있다. broker identity, storage, rolling update, TLS, user/topic 관리를 operator가 reconcile한다.

GitOps를 도입하면 `kubectl apply` 단계는 Argo CD나 Flux가 맡는다. CI는 image build와 manifest update까지 하고, cluster 배포는 GitOps controller가 담당한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Terraform plan이 리뷰되었다.
- [ ] Terraform state backend와 lock 정책이 있다.
- [ ] Terraform output에서 inventory 입력을 생성하거나 검증한다.
- [ ] Ansible ping과 bootstrap playbook이 성공한다.
- [ ] Kubernetes node와 system pod가 ready다.
- [ ] workload rollout과 readiness가 성공한다.
- [ ] Kafka topic, broker, consumer lag를 확인했다.
- [ ] cleanup/destroy 절차를 실행하거나 예약했다.
- [ ] CI/CD credential 범위와 secret 저장소를 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

DevOps 파이프라인은 도구를 길게 이어 붙이는 것이 아니라 단계별 상태 계약을 넘기는 시스템이다. Terraform output, Ansible convergence, Kubernetes readiness, Kafka lag가 각각 다음 단계의 문이다.
