# Nginx Docker & Kubernetes 배포 가이드

이 문서는 Docker 및 Kubernetes 환경에서 Nginx를 배포하고 운용하기 위한 설정 방법(Dockerfile, YAML 매니페스트 등)을 다룹니다.

## 적용 범위와 배포 완료 기준

- **범위:** Nginx image digest/version, Docker build platform, Kubernetes·API version, namespace, Ingress controller, CNI와 cluster policy를 기록합니다.
- **전제:** immutable image, non-root filesystem·user, resource request/limit, health probe, ConfigMap 반영 방식, Service·Ingress의 실제 controller와 TLS 종료 지점을 정합니다.
- **사실과 추론:** rendered manifest, admitted object, image digest, Pod event·log와 endpoint 응답은 근거이고, 가용성·확장성·성능은 rollout 및 부하 시험 전까지 추론입니다.
- **실패·완료:** image pull, invalid config, probe 실패, unavailable replica, ConfigMap 불일치, routing·TLS 오류와 rollback을 시험합니다. desired replica, endpoint, SLO, security context와 이전 revision 복구가 확인될 때 완료입니다.

---

## 1. Dockerfile을 이용한 Nginx 이미지 구성

Nginx 애플리케이션을 컨테이너로 패키징하기 위해 `Dockerfile`을 작성합니다.

*   **기본 이미지 지정:** 실험 예시에서 `nginx:latest`를 볼 수 있지만 재현 가능한 배포에는 검증한 version 또는 digest를 고정하고 update 절차를 둡니다.
*   **컨텐츠 수정:** `RUN` 명령어로 정적 파일을 수정하거나 설정할 수 있습니다.
*   **포트 메타데이터:** `EXPOSE 80`은 image가 사용하는 port를 문서화할 뿐 host나 cluster에 port를 publish하지 않습니다.

**작성 예시:**
```dockerfile
# Nginx 이미지를 기본 이미지로 사용
FROM nginx:latest

# index.html의 내용을 "hello world"로 교체
RUN echo "hello world" > /usr/share/nginx/html/index.html

# 컨테이너의 80번 포트 외부 노출 허용
EXPOSE 80
```
`docker build -t hello .` 명령어로 이미지를 빌드합니다.

## 2. Kubernetes Deployment 설정 (YAML)

Kubernetes에서 Nginx를 배포하고 관리하기 위해 `Deployment` 리소스를 정의합니다.

*   **replicas:** 파드 개수 설정.
*   **selector:** 관리할 파드 식별.
*   **template:** 파드 명세 (이미지, 리소스 등).

**작성 예시:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
          limits:
            cpu: 100m
            memory: 200Mi
```
`kubectl create -f <filename>.yaml` 명령어로 생성합니다.

## 3. Kubernetes Service 설정 (네트워크 노출)

배포된 Nginx 파드에 접근하기 위해 `Service`를 설정합니다.

*   **selector:** `app: nginx` 등을 지정하여 트래픽 전달 대상 파드 선택.
*   **ports:** 서비스 포트와 타겟 포트 매핑.
*   **type:** `ClusterIP`, `NodePort`, `LoadBalancer` 중 선택.

**작성 예시:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  ports:
  - name: service0
    targetPort: 80   # 파드 포트
    port: 8080       # 서비스 접근 포트
    protocol: TCP
  type: ClusterIP
```
클러스터 내부에서 `nginx:8080`으로 접근 가능합니다.

## 4. Kubernetes Ingress 설정 (HTTP 라우팅)

외부 도메인이나 경로를 통해 접근하려면 `Ingress`를 사용합니다.

*   **rules:** 호스트와 경로를 정의하고 백엔드 서비스로 라우팅.

**작성 예시:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  rules:
    - host: www.example.com
      http:
        paths:
          - path: /
            pathType: ImplementationSpecific
            backend:
              service:
                name: nginx
                port:
                  number: 8080
```
`www.example.com` 트래픽을 `nginx` 서비스의 8080 포트로 전달합니다.

## 5. ConfigMap을 활용한 설정 관리

설정 파일(`nginx.conf` 등)을 이미지와 분리하여 `ConfigMap`으로 관리할 수 있습니다.

*   **활용:** ConfigMap을 생성하고 파드 볼륨으로 마운트하여 설정 파일처럼 사용합니다.
*   **장점:** 이미지를 다시 빌드하지 않고도 설정을 변경할 수 있습니다.
