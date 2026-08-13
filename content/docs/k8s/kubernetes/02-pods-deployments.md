# Kubernetes Pod와 Deployment

## 실습 계약과 완료 증거

- 매 명령 전에 context와 namespace를 확인하고, 예제 label이 다른 리소스를 선택하지 않는지 검토합니다.
- `Running`, `Ready`, rollout 완료와 사용자 요청 성공은 서로 다른 상태입니다. Events, container 상태, probe와 Service 경로를 함께 확인합니다.
- Deployment 업데이트는 무중단을 자동 보장하지 않습니다. replica 수, `maxUnavailable`, readiness, 종료 유예, PDB 적용 범위와 애플리케이션 호환성을 시험합니다.
- 롤백 완료는 이전 ReplicaSet 선택만이 아니라 이미지·설정·데이터 스키마가 호환되고 요청 오류율이 회복된 상태입니다.

## 📖 개요

Pod는 Kubernetes의 최소 배포 단위이며, Deployment는 Pod를 관리하는 상위 리소스입니다. 이 문서에서는 두 개념을 실습을 통해 학습합니다.

## 🎯 학습 목표

- Pod의 개념과 생명주기 이해
- Deployment를 통한 Pod 관리
- 롤링 업데이트와 롤백
- 레이블과 셀렉터 활용

## 🏗️ Pod 개념

### Pod란?

```
Pod
├── Container 1 (Main Application)
├── Container 2 (Sidecar: Logging)
└── Shared: Network, Storage
```

**특징:**
- 하나 이상의 컨테이너 그룹
- 같은 네트워크 네임스페이스 공유 (localhost 통신 가능)
- 같은 스토리지 볼륨 공유
- 한 Pod 수명 동안 컨테이너는 같은 노드에 함께 배치되며, 대체 Pod는 다른 노드에 생성될 수 있음
- 배포의 최소 단위

### Pod 생명주기

```
Pending → Running → Succeeded/Failed
                  ↓
                Terminating
```

**상태:**
- `Pending`: 스케줄링 대기 또는 이미지 다운로드 중
- `Running`: 실행 중
- `Succeeded`: 성공적으로 완료 (Job/CronJob)
- `Failed`: 실패로 종료
- `Unknown`: 상태 불명

## 📝 실습 1: 기본 Pod 생성

### 명령형 방식

```bash
# Nginx Pod 생성
kubectl run nginx-pod --image=nginx:latest

# 상태 확인
kubectl get pods

# 상세 정보
kubectl describe pod nginx-pod

# 로그 확인
kubectl logs nginx-pod

# Pod 접속
kubectl exec -it nginx-pod -- /bin/bash

# Pod 삭제
kubectl delete pod nginx-pod
```

### 선언적 방식 (YAML)

`pod-nginx.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    env: development
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
      protocol: TCP
    env:
    - name: NGINX_HOST
      value: "example.com"
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

```bash
# Pod 생성
kubectl apply -f pod-nginx.yaml

# 확인
kubectl get pod nginx-pod -o wide
```

## 📝 실습 2: 멀티 컨테이너 Pod

`pod-multi-container.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
  # 메인 애플리케이션
  - name: app
    image: nginx:latest
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  
  # 로그 수집 사이드카
  - name: log-collector
    image: busybox
    command: ['sh', '-c', 'tail -f /logs/access.log']
    volumeMounts:
    - name: shared-logs
      mountPath: /logs
  
  volumes:
  - name: shared-logs
    emptyDir: {}
```

```bash
# Pod 생성
kubectl apply -f pod-multi-container.yaml

# 각 컨테이너 로그 확인
kubectl logs multi-container-pod -c app
kubectl logs multi-container-pod -c log-collector

# 특정 컨테이너 접속
kubectl exec -it multi-container-pod -c app -- /bin/bash
```

## 🚀 Deployment 개념

### Deployment란?

```
Deployment
   ↓ 관리
ReplicaSet (revision 2) ← 현재 활성
   ↓ 유지
Pod 1, Pod 2, Pod 3

ReplicaSet (revision 1) ← 이전 버전 (롤백용)
   (Pod 없음)
```

**특징:**
- ReplicaSet을 통해 Pod 복제본 관리
- 선언적 업데이트 (롤링 업데이트)
- 자동 복구 (Self-healing)
- 스케일링
- 롤백 가능

## 📝 실습 3: Deployment 생성

### 명령형 방식

```bash
# Deployment 생성
kubectl create deployment nginx-deploy --image=nginx:1.21 --replicas=3

# 확인
kubectl get deployments
kubectl get replicasets
kubectl get pods

# 스케일링
kubectl scale deployment nginx-deploy --replicas=5

# 이미지 업데이트
kubectl set image deployment/nginx-deploy nginx=nginx:1.22

# 롤아웃 상태 확인
kubectl rollout status deployment/nginx-deploy

# 롤아웃 히스토리
kubectl rollout history deployment/nginx-deploy

# 롤백
kubectl rollout undo deployment/nginx-deploy
```

### 선언적 방식 (YAML)

`deployment-nginx.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

```bash
# Deployment 생성
kubectl apply -f deployment-nginx.yaml

# 상태 확인
kubectl get deployment nginx-deployment
kubectl describe deployment nginx-deployment
```

## 🔄 롤링 업데이트

### 업데이트 전략 설정

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # 동시에 추가 생성 가능한 Pod 수
      maxUnavailable: 1  # 동시에 사용 불가능한 Pod 수
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
        version: v1
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

### 업데이트 실행

```bash
# 이미지 업데이트
kubectl set image deployment/nginx-deployment nginx=nginx:1.22

# 실시간 확인
kubectl rollout status deployment/nginx-deployment

# 다른 터미널에서 Pod 변화 관찰
kubectl get pods -l app=nginx -w

# 업데이트 일시 중지
kubectl rollout pause deployment/nginx-deployment

# 업데이트 재개
kubectl rollout resume deployment/nginx-deployment
```

### 롤백

```bash
# 히스토리 확인
kubectl rollout history deployment/nginx-deployment

# 특정 revision 상세 정보
kubectl rollout history deployment/nginx-deployment --revision=2

# 이전 버전으로 롤백
kubectl rollout undo deployment/nginx-deployment

# 특정 버전으로 롤백
kubectl rollout undo deployment/nginx-deployment --to-revision=1
```

## 🏷️ 레이블과 셀렉터

### 레이블 추가

```yaml
metadata:
  labels:
    app: nginx
    env: production
    tier: frontend
    version: v1.0
```

```bash
# 명령형으로 레이블 추가
kubectl label pod nginx-pod env=staging

# 레이블 업데이트
kubectl label pod nginx-pod env=production --overwrite

# 레이블 삭제
kubectl label pod nginx-pod env-
```

### 셀렉터로 검색

```bash
# 단일 레이블
kubectl get pods -l app=nginx

# AND 조건
kubectl get pods -l app=nginx,env=production

# OR 조건 (set-based)
kubectl get pods -l 'env in (production,staging)'

# NOT
kubectl get pods -l 'env notin (development)'

# 존재 여부
kubectl get pods -l app
kubectl get pods -l '!env'
```

### Deployment 셀렉터

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  selector:
    matchLabels:
      app: web
      tier: frontend
    matchExpressions:
    - key: env
      operator: In
      values:
      - production
      - staging
  template:
    metadata:
      labels:
        app: web
        tier: frontend
        env: production
    spec:
      containers:
      - name: nginx
        image: nginx:latest
```

## 🔍 헬스 체크

### Liveness Probe (생존 확인)

Pod가 정상 실행 중인지 확인, 실패 시 재시작

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30  # 첫 체크까지 대기 시간
      periodSeconds: 10        # 체크 주기
      timeoutSeconds: 5        # 타임아웃
      failureThreshold: 3      # 실패 횟수
```

### Readiness Probe (준비 상태 확인)

트래픽 받을 준비가 되었는지 확인, 실패 시 Service에서 제외

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Startup Probe (시작 확인)

느리게 시작하는 앱을 위한 초기 체크

```yaml
spec:
  containers:
  - name: app
    image: slow-app:1.0
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      failureThreshold: 30
      periodSeconds: 10
```

### Probe 유형

```yaml
# HTTP GET
livenessProbe:
  httpGet:
    path: /health
    port: 8080
    httpHeaders:
    - name: Custom-Header
      value: Awesome

# TCP Socket
livenessProbe:
  tcpSocket:
    port: 8080

# 명령 실행
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
```

## 💡 실습 과제

### 과제 1: Blue-Green 배포 시뮬레이션

```bash
# Blue 버전 배포
kubectl create deployment blue --image=nginx:1.21
kubectl label deployment blue version=blue
kubectl scale deployment blue --replicas=3

# Green 버전 배포
kubectl create deployment green --image=nginx:1.22
kubectl label deployment green version=green
kubectl scale deployment green --replicas=3

# Service는 blue를 가리킴 (다음 챕터에서 학습)
# kubectl expose deployment blue --port=80 --selector=version=blue

# 전환 테스트 완료 후
kubectl scale deployment blue --replicas=0
```

### 과제 2: 자동 복구 테스트

```bash
# Deployment 생성
kubectl create deployment resilient-app --image=nginx --replicas=3

# Pod 목록 확인
kubectl get pods -l app=resilient-app

# Pod 하나 강제 삭제
kubectl delete pod <pod-name>

# 자동으로 새 Pod 생성 확인
kubectl get pods -l app=resilient-app -w
```

### 과제 3: 리소스 제한 테스트

`deployment-limited.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-test
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: stress
        image: polinux/stress
        command: ["stress"]
        args: ["--cpu", "1", "--vm", "1", "--vm-bytes", "50M"]
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

```bash
kubectl apply -f deployment-limited.yaml

# 리소스 사용량 확인
kubectl top pods -l app=test
```

## 🐛 트러블슈팅

### ImagePullBackOff

```bash
# 원인 확인
kubectl describe pod <pod-name>

# 이미지 이름 확인
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].image}'

# 수정
kubectl set image deployment/<name> <container>=<correct-image>
```

### CrashLoopBackOff

```bash
# 로그 확인
kubectl logs <pod-name> --previous

# 이벤트 확인
kubectl describe pod <pod-name>

# 디버깅 모드로 실행
kubectl run debug --image=busybox -it --rm -- sh
```

### Pending 상태

```bash
# 원인 확인
kubectl describe pod <pod-name>

# 노드 리소스 확인
kubectl top nodes

# 스케줄링 불가능한 Pod 찾기
kubectl get pods --field-selector=status.phase=Pending
```

## 🧹 정리

```bash
# Deployment 삭제 (Pod도 함께 삭제됨)
kubectl delete deployment nginx-deployment

# 레이블로 일괄 삭제
kubectl delete pods -l app=nginx

# 네임스페이스 전체 삭제
kubectl delete namespace <namespace-name>
```

## 📚 다음 단계

- [Service와 네트워킹](03-services-networking.md)
- [ConfigMap과 Secret](04-configmap-secret.md)

## 🔗 참고 자료

- [Pod 공식 문서](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Deployment 공식 문서](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [롤링 업데이트](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/)
