# Kubernetes 클러스터 설정

## 로컬 클러스터 범위와 안전 조건

- minikube, kind와 Docker Desktop은 서로 다른 로컬 구현입니다. 하나를 선택하고 Kubernetes·kubectl 버전 호환성과 필요한 CPU·메모리를 기록합니다.
- 다운로드 URL을 실행 시점의 `stable`에 맡기지 말고 수업/프로젝트 버전을 고정해 checksum 또는 패키지 서명을 확인합니다.
- `kubectl` 변경 명령 전 현재 context, cluster, namespace와 대상 label을 출력합니다. 개인 kubeconfig와 운영 context를 실습에서 분리합니다.
- 완료 기준은 API 응답뿐 아니라 노드 `Ready`, DNS, 기본 Pod scheduling/networking, 로그 조회와 클러스터 삭제 후 잔여 자원 확인입니다.

## 📖 개요

로컬 환경에서 Kubernetes 클러스터를 설정하고 기본 명령어를 학습합니다. minikube, kind, Docker Desktop 세 가지 방법을 다룹니다.

## 🎯 학습 목표

- Kubernetes 로컬 클러스터 설치
- kubectl 명령어 기초
- 네임스페이스와 컨텍스트 관리
- 클러스터 상태 확인

## 📦 kubectl 설치

### Linux
```bash
# 프로젝트가 고정한 버전을 다운로드하고 checksum 검증
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# 실행 권한 부여
chmod +x kubectl

# 시스템 경로로 이동
sudo mv kubectl /usr/local/bin/

# 설치 확인
kubectl version --client
```

### macOS
```bash
# Homebrew 사용
brew install kubectl

# 또는 직접 다운로드
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

### Windows (PowerShell)
```powershell
# Chocolatey
choco install kubernetes-cli

# 또는 직접 다운로드
curl -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
```

## 🔧 로컬 클러스터 옵션

### 옵션 1: minikube (권장)

**장점**: 가장 많이 사용되며 문서가 풍부

```bash
# Linux 설치
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# macOS 설치
brew install minikube

# 클러스터 시작 (Docker 드라이버)
minikube start --driver=docker

# 멀티노드 클러스터
minikube start --nodes 3 --driver=docker

# 리소스 지정
minikube start --cpus=4 --memory=8192 --disk-size=20g

# 상태 확인
minikube status

# 대시보드 실행
minikube dashboard

# 클러스터 중지
minikube stop

# 클러스터 삭제
minikube delete
```

### 옵션 2: kind (Kubernetes in Docker)

**장점**: 가볍고 빠름, CI/CD에 적합

```bash
# Linux 설치
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# macOS 설치
brew install kind

# 단일 노드 클러스터
kind create cluster --name my-cluster

# 멀티노드 클러스터 (config 파일 사용)
cat <<EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
EOF

kind create cluster --config kind-config.yaml --name multi-node

# 클러스터 목록
kind get clusters

# 클러스터 삭제
kind delete cluster --name my-cluster
```

### 옵션 3: Docker Desktop

**장점**: 설치 가장 간단, Windows/macOS에서 GUI 제공

1. Docker Desktop 설치
2. Settings → Kubernetes → Enable Kubernetes 체크
3. Apply & Restart

## 🎮 kubectl 기본 명령어

### 클러스터 정보

```bash
# 클러스터 정보
kubectl cluster-info

# 노드 목록
kubectl get nodes

# 노드 상세 정보
kubectl describe node <node-name>

# API 리소스 목록
kubectl api-resources

# API 버전 확인
kubectl api-versions
```

### 컨텍스트 및 구성

```bash
# 현재 컨텍스트 확인
kubectl config current-context

# 컨텍스트 목록
kubectl config get-contexts

# 컨텍스트 전환
kubectl config use-context minikube

# 구성 파일 위치
cat ~/.kube/config

# 여러 클러스터 관리 예시
kubectl config set-context prod --cluster=prod-cluster --user=admin
kubectl config set-context dev --cluster=dev-cluster --user=developer
```

### 네임스페이스

```bash
# 네임스페이스 목록
kubectl get namespaces
kubectl get ns

# 네임스페이스 생성
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace production

# 기본 네임스페이스 설정
kubectl config set-context --current --namespace=dev

# 특정 네임스페이스의 리소스 조회
kubectl get pods -n kube-system

# 모든 네임스페이스의 리소스 조회
kubectl get pods --all-namespaces
kubectl get pods -A
```

### 리소스 조회

```bash
# 기본 형식
kubectl get <resource-type>

# 예시
kubectl get pods
kubectl get services
kubectl get deployments
kubectl get nodes

# 상세 출력
kubectl get pods -o wide

# YAML 형식
kubectl get pod my-pod -o yaml

# JSON 형식
kubectl get pod my-pod -o json

# 특정 필드만 출력 (JSONPath)
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# 레이블로 필터링
kubectl get pods -l app=nginx
kubectl get pods --selector=env=production
```

### 리소스 설명

```bash
# 상세 정보 확인
kubectl describe pod <pod-name>
kubectl describe node <node-name>
kubectl describe service <service-name>

# 이벤트 확인
kubectl get events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### 로그 확인

```bash
# Pod 로그 조회
kubectl logs <pod-name>

# 실시간 로그 (tail -f)
kubectl logs -f <pod-name>

# 특정 컨테이너 로그 (Pod에 여러 컨테이너가 있을 때)
kubectl logs <pod-name> -c <container-name>

# 이전 컨테이너 로그 (재시작된 경우)
kubectl logs <pod-name> --previous

# 마지막 N줄만 조회
kubectl logs <pod-name> --tail=100
```

### 리소스 생성

```bash
# 명령형 방식
kubectl create deployment nginx --image=nginx
kubectl create service clusterip my-service --tcp=80:80

# 선언적 방식 (YAML 파일)
kubectl apply -f deployment.yaml
kubectl apply -f https://example.com/manifest.yaml

# 여러 파일 적용
kubectl apply -f ./configs/
kubectl apply -f deployment.yaml -f service.yaml

# Dry-run (실제 생성 안함)
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml
```

### 리소스 수정

```bash
# 직접 편집
kubectl edit deployment nginx

# 이미지 업데이트
kubectl set image deployment/nginx nginx=nginx:1.19

# 스케일 조정
kubectl scale deployment nginx --replicas=5

# 리소스 업데이트
kubectl apply -f deployment.yaml

# Patch (부분 수정)
kubectl patch deployment nginx -p '{"spec":{"replicas":3}}'
```

### 리소스 삭제

```bash
# 단일 리소스 삭제
kubectl delete pod <pod-name>
kubectl delete deployment <deployment-name>

# 파일 기반 삭제
kubectl delete -f deployment.yaml

# 레이블 기반 삭제
kubectl delete pods -l app=nginx

# 네임스페이스 전체 삭제 (주의!)
kubectl delete namespace dev

# 강제 삭제
kubectl delete pod <pod-name> --force --grace-period=0
```

## 🔍 클러스터 탐색

### 시스템 Pod 확인

```bash
# kube-system 네임스페이스의 Pod
kubectl get pods -n kube-system

# 주요 시스템 컴포넌트:
# - kube-apiserver: API 서버
# - kube-scheduler: 스케줄러
# - kube-controller-manager: 컨트롤러 매니저
# - etcd: 클러스터 데이터 저장소
# - coredns: DNS 서버
# - kube-proxy: 네트워크 프록시
```

### 리소스 사용량 확인

```bash
# Metrics Server 설치 (minikube)
minikube addons enable metrics-server

# 노드 리소스 사용량
kubectl top nodes

# Pod 리소스 사용량
kubectl top pods

# 특정 네임스페이스
kubectl top pods -n kube-system
```

## 📝 첫 번째 실습: Nginx 배포

### Step 1: Deployment 생성

```bash
# 명령형
kubectl create deployment nginx --image=nginx:latest

# 확인
kubectl get deployments
kubectl get pods
```

### Step 2: Deployment YAML 확인

```bash
# YAML 출력
kubectl get deployment nginx -o yaml > nginx-deployment.yaml

# 편집
kubectl edit deployment nginx
```

### Step 3: Service 생성

```bash
# ClusterIP 서비스
kubectl expose deployment nginx --port=80 --target-port=80

# NodePort 서비스로 외부 접근
kubectl expose deployment nginx --type=NodePort --port=80

# 서비스 확인
kubectl get services
```

### Step 4: 애플리케이션 접근

```bash
# minikube 환경
minikube service nginx --url

# 브라우저 자동 열기
minikube service nginx

# Port-forward 사용
kubectl port-forward deployment/nginx 8080:80

# 브라우저에서 http://localhost:8080 접속
```

### Step 5: 스케일링

```bash
# 5개로 증가
kubectl scale deployment nginx --replicas=5

# 확인
kubectl get pods -w  # watch 모드
```

### Step 6: 정리

```bash
kubectl delete service nginx
kubectl delete deployment nginx
```

## 💡 유용한 명령어 조합

### 별칭 설정

```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
alias k='kubectl'
alias kg='kubectl get'
alias kd='kubectl describe'
alias kdel='kubectl delete'
alias kl='kubectl logs'
alias kex='kubectl exec -it'

# 적용
source ~/.bashrc
```

### kubectl 자동완성

```bash
# Bash
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -o default -F __start_kubectl k' >> ~/.bashrc

# Zsh
echo 'source <(kubectl completion zsh)' >> ~/.zshrc
echo 'alias k=kubectl' >> ~/.zshrc
echo 'compdef __start_kubectl k' >> ~/.zshrc
```

### 자주 사용하는 One-liner

```bash
# 모든 Pod의 이름만 출력
kubectl get pods -o name

# 실행 중이 아닌 Pod 찾기
kubectl get pods --field-selector=status.phase!=Running

# 최근 생성된 Pod 5개
kubectl get pods --sort-by=.metadata.creationTimestamp | tail -5

# 특정 노드의 모든 Pod
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=node1

# 이미지별 Pod 개수
kubectl get pods -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | sort | uniq -c

# 모든 네임스페이스의 리소스 사용량
kubectl top pods --all-namespaces --sort-by=memory
```

## 🛠️ 실습 과제

### 과제 1: 멀티노드 클러스터 구성

```bash
# 3개 노드 클러스터 생성
minikube start --nodes 3 --driver=docker

# 노드 확인
kubectl get nodes

# 각 노드에 Pod 배포 확인
kubectl create deployment test --image=nginx --replicas=3
kubectl get pods -o wide
```

### 과제 2: 네임스페이스별 환경 구성

```bash
# 네임스페이스 생성
kubectl create namespace development
kubectl create namespace staging
kubectl create namespace production

# 각 환경에 애플리케이션 배포
kubectl create deployment app --image=nginx -n development
kubectl create deployment app --image=nginx -n staging
kubectl create deployment app --image=nginx -n production

# 전체 확인
kubectl get deployments --all-namespaces
```

### 과제 3: 리소스 모니터링

```bash
# Metrics Server 활성화
minikube addons enable metrics-server

# 5분 대기 후 확인
kubectl top nodes
kubectl top pods --all-namespaces

# 리소스 많이 사용하는 Pod Top 10
kubectl top pods -A --sort-by=memory | head -10
```

## 🐛 트러블슈팅

### 문제 1: "connection refused"
**원인**: 클러스터가 실행되지 않음
**해결:**
```bash
minikube status
minikube start
```

### 문제 2: "Unable to connect to the server"
**원인**: kubeconfig 설정 오류
**해결:**
```bash
kubectl config view
kubectl config use-context minikube
```

### 문제 3: Pod이 Pending 상태
**원인**: 리소스 부족
**해결:**
```bash
kubectl describe pod <pod-name>
# "Insufficient cpu" 또는 "Insufficient memory" 메시지 확인

# minikube 재시작 (리소스 증가)
minikube delete
minikube start --cpus=4 --memory=8192
```

### 문제 4: ImagePullBackOff
**원인**: 이미지 다운로드 실패
**해결:**
```bash
kubectl describe pod <pod-name>
# "Failed to pull image" 메시지 확인

# 이미지 이름 확인
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].image}'
```

## 🧹 환경 정리

```bash
# minikube
minikube stop
minikube delete --all

# kind
kind delete cluster --name my-cluster

# Docker Desktop: Settings → Kubernetes → Reset Kubernetes Cluster
```

## 📚 다음 단계

- [Pod와 Deployment](02-pods-deployments.md)
- [Service와 네트워킹](03-services-networking.md)

## 🔗 참고 자료

- [Kubernetes 공식 문서](https://kubernetes.io/docs/home/)
- [kubectl 치트 시트](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [minikube 문서](https://minikube.sigs.k8s.io/docs/)
- [kind 문서](https://kind.sigs.k8s.io/)
