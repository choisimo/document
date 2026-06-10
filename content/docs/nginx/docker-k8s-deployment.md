# Nginx Docker와 Kubernetes 배포

이 문서는 Nginx를 Docker image와 Kubernetes workload로 배포할 때 필요한 최소 구성을 정리한다. 목표는 Nginx 설정을 image에 넣을지, ConfigMap으로 분리할지, Service와 Ingress가 어떤 트래픽 경계를 담당하는지 구분하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Nginx는 단일 binary처럼 보이지만 container와 Kubernetes에서는 image, config, volume, port, health check, Service, Ingress가 함께 맞아야 한다. `nginx:latest`로 빨리 띄우면 재현성과 rollback 기준이 약해진다.

Kubernetes에서는 Nginx Pod를 만드는 것과 외부 HTTP 요청을 받는 것이 다른 문제다. Deployment, Service, Ingress, Ingress Controller를 분리해서 봐야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Dockerfile, Deployment, Service, Ingress, ConfigMap을 간단히 보여준다. 보완해야 할 점은 다음과 같다.

- `nginx:latest`를 사용한다.
- ConfigMap mount와 Nginx 설정 검증이 약하다.
- Service와 Ingress Controller의 차이가 충분히 설명되지 않는다.
- Readiness와 liveness probe가 없다.
- `kubectl create`보다 선언형 `kubectl apply` 흐름이 적합하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 검증하는 것이다.

- Nginx image tag가 고정되어 있다.
- 정적 파일과 Nginx config가 의도한 위치에 있다.
- Docker container에서 config test와 HTTP 응답이 성공한다.
- Kubernetes Deployment가 ready 상태다.
- Service가 Pod endpoint를 가진다.
- Ingress는 Ingress Controller가 있을 때만 외부 요청을 처리한다.
- Rollout과 rollback이 가능하다.

## 4. 시스템 번역 (Data Flow)

Docker 흐름은 다음과 같다.

```text
Dockerfile
  -> image build
  -> container starts nginx
  -> host port maps to container port
  -> curl verifies response
```

Kubernetes 흐름은 다음과 같다.

```text
ConfigMap and Deployment
  -> Pod runs nginx
  -> Service selects Pod endpoints
  -> Ingress rule routes host and path
  -> Ingress Controller programs actual Nginx or proxy
```

Ingress resource만으로는 외부 트래픽이 처리되지 않는다. Controller가 별도로 실행 중이어야 한다.

## 5. 핵심 구성요소 (Building Blocks)

Dockerfile은 정적 파일과 기본 config를 image에 포함할 때 사용한다.

Bind mount 또는 Docker volume은 config를 image 밖에서 주입할 때 사용한다.

ConfigMap은 Kubernetes에서 Nginx config를 Pod에 주입하는 기본 방법이다.

Deployment는 Pod replica와 rollout을 관리한다.

Service는 Pod IP 변화와 무관하게 안정적인 cluster endpoint를 제공한다.

Ingress는 HTTP host/path routing 규칙이다.

Ingress Controller는 Ingress resource를 실제 proxy 설정으로 반영하는 controller다.

## 6. 상태 전이 (State Transition)

Docker 배포 상태는 다음과 같다.

```text
image built
  -> container running
  -> nginx config valid
  -> port reachable
  -> logs clean
```

Kubernetes 배포 상태는 다음과 같다.

```text
manifest applied
  -> ReplicaSet created
  -> Pods ready
  -> Service endpoints populated
  -> Ingress accepted by controller
  -> external request succeeds
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 운영 image는 `latest`가 아니라 테스트한 tag 또는 digest로 고정한다.
- Config 변경 후 `nginx -t` 또는 container startup log를 확인한다.
- Kubernetes Service selector는 Pod label과 일치해야 한다.
- Ingress를 쓰려면 Ingress Controller가 설치되어 있어야 한다.
- Readiness probe가 실패하는 Pod로 traffic을 보내지 않는다.
- ConfigMap 변경만으로 Pod가 항상 자동 reload되는 것은 아니다.
- Secret인 TLS key는 ConfigMap에 넣지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

정적 파일 image를 만든다.

```dockerfile
FROM nginx:1.29-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY default.conf /etc/nginx/conf.d/default.conf
```

기본 server config는 다음과 같다.

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Docker로 검증한다.

```bash
docker build -t local/nginx-static:1.0.0 .
docker run --rm -p 8080:80 local/nginx-static:1.0.0 nginx -t
docker run --rm -d --name nginx-static -p 8080:80 local/nginx-static:1.0.0
curl -I http://127.0.0.1:8080
docker logs nginx-static
docker rm -f nginx-static
```

Kubernetes ConfigMap을 만든다.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  default.conf: |
    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ =404;
        }
    }
```

Deployment를 만든다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
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
        image: nginx:1.29-alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d/default.conf
          subPath: default.conf
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
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 250m
            memory: 128Mi
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-config
```

Service를 만든다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
  - name: http
    port: 80
    targetPort: 80
```

Ingress를 만든다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx
spec:
  ingressClassName: nginx
  rules:
  - host: nginx.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx
            port:
              number: 80
```

적용하고 검증한다.

```bash
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl rollout status deployment/nginx
kubectl get pods -l app=nginx -o wide
kubectl get endpoints nginx
kubectl describe ingress nginx
```

Cluster 내부에서 확인한다.

```bash
kubectl run curl --rm -it --image=curlimages/curl:8.10.1 -- curl -I http://nginx.default.svc.cluster.local
```

로컬 port-forward로 확인한다.

```bash
kubectl port-forward service/nginx 8080:80
curl -I http://127.0.0.1:8080
```

## 9. 실패 사례 (What could go wrong?)

Service selector와 Pod label이 다르면 Service endpoint가 비어 있다. `kubectl get endpoints nginx`로 확인한다.

Ingress Controller가 없으면 Ingress object는 있어도 외부 요청이 처리되지 않는다.

ConfigMap을 수정해도 Nginx가 자동 reload되지 않을 수 있다. Deployment rollout restart 또는 sidecar/reloader 전략이 필요하다.

`subPath`로 ConfigMap file을 mount하면 ConfigMap update 반영 방식이 더 제한적일 수 있다.

`latest` tag를 쓰면 cluster node마다 pull 시점에 다른 image가 배포될 수 있다.

Readiness probe가 `/`만 확인하면 실제 reverse proxy backend 장애를 놓칠 수 있다. 목적에 맞는 health endpoint를 설계한다.

## 10. 뇌 확장하기 (Evolution & Variants)

정적 파일 Nginx와 Ingress Controller는 다른 역할이다. 정적 파일 Nginx는 application Pod이고, Ingress Controller는 cluster ingress plane이다.

운영에서는 Helm chart, Kustomize, GitOps를 사용해 ConfigMap, Deployment, Service, Ingress를 함께 versioning한다.

TLS는 Ingress secret 또는 cert-manager로 관리하는 편이 일반적이다. Private key를 ConfigMap에 넣지 않는다.

공식 문서는 NGINX Ingress Controller 배포 방식과 image version을 계속 갱신한다.

- NGINX Ingress Controller install: <https://docs.nginx.com/nginx-ingress-controller/install/manifests/>
- NGINX Ingress Controller docs: <https://docs.nginx.com/nginx-ingress-controller/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Nginx image tag를 pin했다.
- [ ] Docker container에서 `nginx -t`와 HTTP 응답을 확인했다.
- [ ] ConfigMap과 Deployment mount 경로가 맞다.
- [ ] Deployment rollout이 완료되었다.
- [ ] Service selector와 endpoint가 일치한다.
- [ ] Ingress Controller가 설치되어 있다.
- [ ] Port-forward 또는 cluster 내부 curl로 응답을 확인했다.
- [ ] Config 변경 시 reload 또는 rollout 전략을 정했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Nginx를 container와 Kubernetes에 올리는 핵심은 image, config, Pod, Service, Ingress, Controller의 책임을 분리하는 것이다. Pod가 떠 있는 것과 외부 HTTP 요청이 성공하는 것은 다른 상태다.
