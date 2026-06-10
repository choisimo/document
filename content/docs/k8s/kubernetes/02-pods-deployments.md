# Kubernetes Pod와 Deployment

이 문서는 Pod와 Deployment를 “컨테이너 실행 단위”와 “반복적으로 원하는 개수를 유지하는 controller 계약”으로 이해하기 위한 실습 문서다. 목표는 YAML을 외우는 것이 아니라 selector, template label, rollout, probe가 어떤 상태 전이를 만드는지 설명할 수 있게 되는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Kubernetes에서 container image를 실행하는 최소 단위는 Pod지만, 운영자는 Pod를 직접 오래 관리하지 않는다. Pod는 재생성될 수 있고 이름도 바뀐다. 안정적인 배포 단위는 Pod template과 replica 수를 선언하는 Deployment다.

Pod와 Deployment의 경계를 모르면 장애가 났을 때 `kubectl delete pod`만 반복하게 된다. 실제로는 Deployment, ReplicaSet, Pod, container 상태를 순서대로 추적해야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Pod, multi-container Pod, Deployment, rolling update, probe 예제를 다룬다. 보완해야 할 점은 다음과 같다.

- `latest` image 사용 예제가 많아 재현성이 약하다.
- Deployment selector와 Pod template label의 불변식이 충분히 강조되지 않았다.
- readiness probe와 liveness probe의 목적이 섞일 수 있다.
- 다음 단계 링크가 repository에 없는 문서를 가리킨다.
- rollout 실패 시 어떤 리소스를 봐야 하는지 흐름이 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안정적으로 수행하는 것이다.

- Pod가 어떤 공유 경계를 가지는지 설명한다.
- Deployment가 ReplicaSet을 만들고 Pod 개수를 유지하는 흐름을 확인한다.
- selector와 template label을 일치시킨다.
- resource request와 limit을 선언한다.
- readiness, liveness, startup probe를 구분한다.
- rolling update와 rollback을 실행하고 상태를 확인한다.
- 장애 상태를 `describe`, `logs`, `rollout status`로 추적한다.

## 4. 시스템 번역 (Data Flow)

Deployment 적용 흐름은 다음과 같다.

```text
kubectl apply
  -> API server stores Deployment
  -> Deployment controller creates ReplicaSet
  -> ReplicaSet controller creates Pods
  -> scheduler assigns Pods to Nodes
  -> kubelet starts containers
  -> probes update Pod readiness
  -> Service routes only to ready endpoints
```

사용자는 Deployment를 수정하지만 실제 container는 Pod 안에서 실행된다. Deployment는 직접 container를 실행하지 않고 controller chain을 통해 desired state를 유지한다.

## 5. 핵심 구성요소 (Building Blocks)

Pod는 하나 이상의 container가 network namespace와 volume을 공유하는 단위다. 같은 Pod 안의 container는 `localhost`로 서로 접근할 수 있다.

Deployment는 Pod template과 replica 수를 선언한다. 변경이 생기면 새 ReplicaSet을 만들고 rolling update를 진행한다.

ReplicaSet은 selector에 맞는 Pod 개수를 유지한다. 보통 직접 만들기보다 Deployment가 관리하게 둔다.

Label은 리소스를 선택하기 위한 key-value metadata다. Deployment selector는 template label과 반드시 맞아야 한다.

Readiness probe는 traffic을 받을 준비가 되었는지 판단한다. 실패하면 Pod는 Service endpoint에서 제외된다.

Liveness probe는 process가 복구 불가능하게 멈췄는지 판단한다. 실패하면 kubelet이 container를 재시작한다.

Startup probe는 느리게 시작하는 애플리케이션이 liveness probe에 의해 너무 빨리 죽는 것을 막는다.

Resource requests는 scheduling 기준이고, limits는 runtime 제한이다.

## 6. 상태 전이 (State Transition)

Pod의 일반적인 상태 전이는 다음과 같다.

```text
Pending
  -> ContainerCreating
  -> Running
  -> Succeeded or Failed
  -> Terminating
```

장애 상태는 다음처럼 분기된다.

```text
ImagePullBackOff
CrashLoopBackOff
CreateContainerConfigError
OOMKilled
Pending due to insufficient resources
```

Deployment rollout은 다음 상태를 가진다.

```text
old ReplicaSet active
  -> new ReplicaSet created
  -> new Pods become Ready
  -> old Pods scaled down
  -> rollout complete
```

Rollback은 새 ReplicaSet으로 가던 흐름을 이전 revision으로 되돌린다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Deployment `.spec.selector`는 template label과 일치해야 한다.
- 운영 배포에서는 mutable image tag보다 고정 tag 또는 digest를 사용한다.
- readiness probe는 downstream 장애를 무조건 liveness 재시작으로 바꾸지 않는다.
- liveness probe는 너무 공격적으로 설정하지 않는다.
- requests가 없으면 scheduler와 autoscaler 판단이 부정확해진다.
- limit이 너무 낮으면 `OOMKilled`나 throttling이 발생할 수 있다.
- Deployment로 관리되는 Pod를 직접 수정하지 않는다. Pod template을 수정한다.
- rollout 전후에는 `kubectl rollout status`와 `kubectl get pods -o wide`를 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

실습 namespace를 준비한다.

```bash
kubectl create namespace workload-lab
kubectl config set-context --current --namespace=workload-lab
```

Deployment manifest를 작성한다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 2
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.27-alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 128Mi
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 3
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 10
```

적용하고 controller 관계를 확인한다.

```bash
kubectl apply -f deployment-web.yaml
kubectl rollout status deployment/web
kubectl get deployment,replicaset,pod -l app=web
kubectl describe deployment web
```

Service를 만들고 local port로 확인한다.

```bash
kubectl expose deployment web --port=80 --target-port=80
kubectl get service web
kubectl port-forward service/web 8080:80
```

다른 터미널에서 호출한다.

```bash
curl http://127.0.0.1:8080
```

Scale out을 확인한다.

```bash
kubectl scale deployment web --replicas=4
kubectl rollout status deployment/web
kubectl get pods -l app=web -o wide
```

Rolling update를 실행한다.

```bash
kubectl set image deployment/web nginx=nginx:1.28-alpine
kubectl rollout status deployment/web
kubectl rollout history deployment/web
```

문제가 있으면 rollback한다.

```bash
kubectl rollout undo deployment/web
kubectl rollout status deployment/web
```

정리한다.

```bash
kubectl delete service web
kubectl delete deployment web
kubectl delete namespace workload-lab
```

## 9. 실패 사례 (What could go wrong?)

`selector does not match template labels`는 Deployment selector와 Pod template label이 다를 때 발생한다. selector는 생성 후 바꾸기 어렵기 때문에 처음부터 명확히 정한다.

`ImagePullBackOff`는 image 이름, tag, registry 인증, 네트워크 문제다. `kubectl describe pod <pod-name>`의 Events를 먼저 본다.

`CrashLoopBackOff`는 container process가 반복 종료되는 상태다. `kubectl logs <pod-name> --previous`로 직전 실행 로그를 확인한다.

`OOMKilled`는 memory limit을 넘었을 때 발생한다. limit만 높이기 전에 실제 메모리 사용량과 request 기준을 함께 조정한다.

Readiness probe가 없으면 시작 중인 Pod도 Service traffic을 받을 수 있다. 반대로 readiness가 너무 엄격하면 rollout이 끝나지 않는다.

Liveness probe가 dependency 장애를 체크하면 외부 DB나 API가 느릴 때 모든 Pod가 재시작될 수 있다. liveness는 process 자체의 회복 불가능 상태에 가깝게 둔다.

## 10. 뇌 확장하기 (Evolution & Variants)

Pod 하나에 여러 container를 넣는 sidecar 패턴은 logging, proxy, certificate refresh처럼 같은 lifecycle과 network namespace가 필요한 경우에 적합하다. 단순히 관련 있는 서비스라는 이유만으로 한 Pod에 묶으면 scale과 장애 격리가 어려워진다.

Deployment는 stateless workload에 적합하다. 고정 identity와 persistent storage가 필요한 workload는 StatefulSet을 검토한다.

운영 배포에서는 Deployment만으로 충분하지 않다. Service, Ingress, ConfigMap, Secret, HPA, PDB, NetworkPolicy, observability가 함께 필요하다.

공식 문서는 Pod, Deployment, rolling update의 세부 동작을 계속 갱신한다.

- Pod 개념: <https://kubernetes.io/docs/concepts/workloads/pods/>
- Deployment 개념: <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/>
- Rolling update: <https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Pod와 Deployment의 책임 차이를 설명할 수 있다.
- [ ] Deployment selector와 template label이 일치한다.
- [ ] image tag가 의도적으로 고정되어 있다.
- [ ] requests와 limits를 선언했다.
- [ ] readiness와 liveness probe 목적을 구분했다.
- [ ] rollout status와 rollout history를 확인했다.
- [ ] 장애 시 `describe`, `logs --previous`, Events를 확인할 수 있다.
- [ ] 실습 Service, Deployment, namespace를 정리했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Pod는 container가 실행되는 최소 단위이고 Deployment는 Pod template과 replica 수를 계속 맞추는 controller 계약이다. 안전한 Deployment는 selector, label, probe, resource, rollout 상태가 함께 맞아야 한다.
