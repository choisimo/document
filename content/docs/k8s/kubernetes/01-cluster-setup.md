# Kubernetes 로컬 클러스터 설정

이 문서는 `kubectl`, kubeconfig, namespace, local cluster driver를 기준으로 Kubernetes 실습 환경을 안전하게 만드는 절차를 정리한다. 목표는 명령어를 많이 외우는 것이 아니라 “내가 지금 어느 cluster와 namespace에 명령을 보내는가”를 항상 확인하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Kubernetes 실습은 `kubectl apply` 한 줄로 시작하기 쉽지만, cluster context와 namespace를 잘못 잡으면 의도하지 않은 환경에 리소스를 만들 수 있다. 로컬 실습이라도 kubeconfig가 여러 cluster를 가리키면 같은 명령이 전혀 다른 결과를 만든다.

클러스터 설정 문서는 설치 명령보다 상태 확인 순서가 중요하다. `kubectl` client, cluster API server, current-context, namespace, node 상태가 맞아야 Pod와 Deployment 실습이 재현된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `kubectl`, minikube, kind, Docker Desktop, 기본 명령어를 넓게 다룬다. 보완해야 할 점은 다음과 같다.

- 일부 설치 예제가 특정 과거 버전을 고정한다.
- `kubectl` client와 cluster version 호환성 검증이 약하다.
- context와 namespace를 확인하는 절차가 실습 앞에 충분히 배치되지 않았다.
- 존재하지 않는 다음 문서 링크가 포함되어 있다.
- local cluster와 production cluster의 위험 경계가 분리되어 있지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 직접 확인할 수 있는 로컬 Kubernetes 환경이다.

- `kubectl` client가 설치되어 있다.
- 로컬 cluster가 실행 중이다.
- kubeconfig current-context가 실습 cluster를 가리킨다.
- 실습 namespace가 분리되어 있다.
- node, system Pod, sample Deployment 상태를 조회할 수 있다.
- 실습 후 service, deployment, cluster를 정리할 수 있다.

## 4. 시스템 번역 (Data Flow)

명령 흐름은 다음과 같다.

```text
kubectl command
  -> kubeconfig current-context
  -> Kubernetes API server
  -> etcd and controllers
  -> scheduler assigns Pods
  -> kubelet starts containers
  -> kubectl reads status back
```

`kubectl`은 container를 직접 실행하지 않는다. API server에 desired state를 보내고, controller와 kubelet이 실제 상태를 맞춘다.

## 5. 핵심 구성요소 (Building Blocks)

`kubectl`은 Kubernetes API server와 통신하는 CLI다. 공식 문서는 client version이 cluster control plane과 한 minor version 이내여야 한다고 안내한다.

`kubeconfig`는 cluster, user, context 정보를 담는다. `current-context`가 어디인지 확인하지 않고 apply하는 것은 위험하다.

`context`는 cluster와 user, 기본 namespace 조합이다. 여러 cluster를 다룰수록 context 이름을 명확히 관리해야 한다.

`namespace`는 리소스를 논리적으로 나누는 범위다. 실습은 `default` 대신 별도 namespace에서 진행하는 편이 정리하기 쉽다.

minikube는 로컬 개발과 학습에 적합한 단일 또는 다중 node cluster를 제공한다.

kind는 Docker container 안에 Kubernetes node를 띄우므로 빠르고 CI 실습에 적합하다.

Docker Desktop Kubernetes는 Windows와 macOS에서 GUI로 쉽게 켤 수 있지만, kubeconfig context가 자동으로 바뀔 수 있으므로 확인이 필요하다.

## 6. 상태 전이 (State Transition)

로컬 클러스터 준비 상태는 다음과 같이 진행한다.

```text
container runtime available
  -> kubectl installed
  -> local cluster created
  -> kubeconfig context selected
  -> namespace selected
  -> sample workload deployed
  -> workload verified
  -> workload and cluster cleaned up
```

문제가 생기면 바로 다음 단계로 넘어가지 말고 현재 상태를 먼저 조회한다.

```text
command failed
  -> current-context check
  -> namespace check
  -> event check
  -> pod or node describe
  -> fix or recreate local cluster
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `kubectl config current-context`를 확인하지 않은 상태에서 apply하지 않는다.
- 실습 namespace를 만들고 그 namespace 안에서 리소스를 생성한다.
- `kubectl` client는 cluster control plane과 호환되는 minor version을 사용한다.
- local cluster는 production HA 검증 환경이 아니다.
- `--force --grace-period=0` 삭제는 최후 수단으로만 사용한다.
- `kube-system` 리소스는 원인을 이해하기 전 임의로 삭제하지 않는다.
- 실습 후 service와 deployment를 지우고, 필요 없어진 local cluster를 중지하거나 삭제한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Linux에서 `kubectl` binary를 직접 설치할 때는 공식 release와 checksum을 함께 확인한다.

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check
chmod +x kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client=true
```

minikube로 로컬 cluster를 만든다.

```bash
minikube start --driver=docker --cpus=4 --memory=8192
kubectl config current-context
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

kind를 사용할 때는 cluster 이름이 context 이름에 반영된다.

```bash
kind create cluster --name lab
kubectl config use-context kind-lab
kubectl get nodes -o wide
```

다중 node kind cluster가 필요하면 별도 config로 만든다.

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
```

```bash
kind create cluster --name multi-node --config kind-config.yaml
kubectl config use-context kind-multi-node
kubectl get nodes -o wide
```

실습 namespace를 만들고 기본 namespace로 지정한다.

```bash
kubectl create namespace lab
kubectl config set-context --current --namespace=lab
kubectl config view --minify
```

가장 작은 Deployment와 Service를 만든다.

```bash
kubectl create deployment nginx --image=nginx:1.27-alpine --replicas=2
kubectl expose deployment nginx --port=80 --target-port=80
kubectl get deployment,replicaset,pod,service
kubectl port-forward service/nginx 8080:80
```

다른 터미널에서 응답을 확인한다.

```bash
curl http://127.0.0.1:8080
```

실습 리소스를 정리한다.

```bash
kubectl delete service nginx
kubectl delete deployment nginx
kubectl delete namespace lab
```

클러스터 자체를 정리한다.

```bash
minikube stop
minikube delete
kind delete cluster --name lab
kind delete cluster --name multi-node
```

## 9. 실패 사례 (What could go wrong?)

`Unable to connect to the server`는 cluster가 꺼졌거나 kubeconfig context가 깨졌을 때 자주 발생한다. `kubectl config current-context`, `kubectl cluster-info`, local cluster status를 순서대로 확인한다.

Pod가 `Pending`이면 scheduler가 node를 찾지 못한 것이다. `kubectl describe pod <pod-name>`에서 CPU, memory, taint, volume 이벤트를 확인한다.

`ImagePullBackOff`는 image 이름, tag, registry 인증, 네트워크 문제를 의심한다. `kubectl describe pod <pod-name>`의 Events가 가장 빠른 단서다.

`CrashLoopBackOff`는 container process가 반복 종료되는 상태다. `kubectl logs <pod-name> --previous`로 직전 종료 로그를 먼저 본다.

`kubectl top`이 동작하지 않으면 metrics-server가 없거나 아직 ready가 아니다. local cluster addon 상태와 `kube-system` Pod 상태를 확인한다.

## 10. 뇌 확장하기 (Evolution & Variants)

minikube는 addon, dashboard, local image loading 등 학습 편의 기능이 많다. kind는 빠른 cluster 생성과 삭제가 장점이어서 테스트 자동화에 자주 사용된다.

실제 운영 cluster는 local cluster와 다르다. API server 인증, RBAC, audit log, CNI, CSI, ingress, load balancer, upgrade, backup 정책이 별도로 필요하다.

공식 문서는 설치 명령이 바뀔 수 있으므로 실습 전 확인한다. 특히 `kubectl` 설치, minikube driver, kind release는 현재 환경에 맞게 선택해야 한다.

- Kubernetes kubectl 설치: <https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/>
- minikube 시작: <https://minikube.sigs.k8s.io/docs/start/>
- kind Quick Start: <https://kind.sigs.k8s.io/docs/user/quick-start/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `kubectl version --client=true`가 성공한다.
- [ ] local cluster가 실행 중이다.
- [ ] `kubectl config current-context`가 실습 cluster를 가리킨다.
- [ ] 실습 namespace를 만들고 현재 context에 지정했다.
- [ ] `kubectl get nodes`와 `kubectl get pods -n kube-system`이 성공한다.
- [ ] sample Deployment와 Service를 만들고 응답을 확인했다.
- [ ] `describe`, `logs`, `events`로 장애 단서를 확인할 수 있다.
- [ ] 실습 리소스와 local cluster 정리 절차를 수행했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Kubernetes 클러스터 설정의 핵심은 설치가 아니라 현재 context와 namespace를 검증하는 것이다. `kubectl`은 API server에 desired state를 보내고, controller와 kubelet이 실제 container 상태를 맞춘다.
