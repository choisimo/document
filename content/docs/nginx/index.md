# Nginx 문서

이 섹션은 Nginx를 정적 파일 서버, reverse proxy, load balancer, container workload, Nginx Proxy Manager로 운영할 때 필요한 문서를 묶는다. 목표는 설정 예제를 복사하는 것이 아니라 요청이 어느 server block, location, upstream, backend로 흐르는지 검증하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Nginx는 설정 한 줄이 routing, TLS, cache, header, backend 연결에 직접 영향을 준다. `nginx -t` 없이 reload하거나, `proxy_pass` URI 규칙을 모른 채 설정하면 서비스 장애가 쉽게 발생한다.

상위 인덱스는 Nginx를 어디에서 쓰는지에 따라 읽을 문서를 분리해야 한다. bare-metal 설정, Docker/Kubernetes 배포, GUI 기반 Nginx Proxy Manager는 운영 경계가 다르다.

## 2. 현재 나의 상태 (Baseline)

현재 Nginx 섹션에는 다음 문서가 있다.

- [Nginx 설정](configuration.md)
- [Nginx Docker와 Kubernetes 배포](docker-k8s-deployment.md)
- [Nginx Proxy Manager](proxy-manager.md)

기존 인덱스는 카드형 목록과 간단한 예제를 제공하지만, 설정 변경 전후 검증과 각 문서의 책임 경계가 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 문서별로 나눠 처리하는 것이다.

- `configuration.md`에서 Nginx 설정 파일, server block, location, reverse proxy, TLS, cache, log를 이해한다.
- `docker-k8s-deployment.md`에서 image, ConfigMap, Deployment, Service, Ingress의 책임을 구분한다.
- `proxy-manager.md`에서 Nginx Proxy Manager의 UI, certificate, backup, admin port 보안을 다룬다.
- 모든 변경은 config test, reload, log 확인으로 검증한다.

## 4. 시스템 번역 (Data Flow)

일반 Nginx 요청 흐름은 다음과 같다.

```text
client request
  -> listen socket
  -> server_name selection
  -> location selection
  -> static file or proxy_pass
  -> upstream response
  -> access and error logs
```

Container와 Kubernetes에서는 이 앞뒤에 image, Pod, Service, Ingress Controller 계층이 추가된다.

## 5. 핵심 구성요소 (Building Blocks)

`nginx.conf`는 main, events, http context를 포함한다.

`server` block은 listen address와 server name을 기준으로 virtual host를 정의한다.

`location` block은 URI별 처리 규칙을 정한다.

`upstream` block은 backend pool과 load balancing 정책을 정의한다.

`proxy_pass`는 backend로 request를 전달한다. trailing slash 여부가 URI 재작성에 영향을 준다.

Access log와 error log는 운영 검증의 기본 근거다.

Nginx Proxy Manager는 이 설정을 UI와 database로 관리하는 wrapper다.

## 6. 상태 전이 (State Transition)

설정 변경은 다음 순서로 진행한다.

```text
config edited
  -> nginx -t
  -> reload
  -> curl verification
  -> access log check
  -> error log check
```

장애 대응은 다음 순서로 좁힌다.

```text
client error
  -> DNS and port
  -> Nginx server block
  -> location match
  -> upstream reachability
  -> backend application log
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- `nginx -t` 없이 reload하지 않는다.
- Reload와 restart의 차이를 이해한다. 설정 반영은 보통 reload로 충분하다.
- TLS private key와 certificate path 권한을 확인한다.
- Admin UI나 status endpoint는 public으로 열지 않는다.
- `proxy_set_header X-Forwarded-For`와 `X-Forwarded-Proto`를 backend 계약에 맞춘다.
- `proxy_pass` trailing slash 동작을 테스트한다.
- Container image는 `latest` 대신 의도한 tag로 pin한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

설정을 테스트한다.

```bash
sudo nginx -t
sudo systemctl reload nginx
systemctl status nginx
```

요청과 log를 확인한다.

```bash
curl -I http://example.com
tail -n 100 /var/log/nginx/access.log
tail -n 100 /var/log/nginx/error.log
```

Listening port를 확인한다.

```bash
ss -tulpen | rg ':80|:443'
```

하위 문서를 선택한다.

```text
manual nginx config
  -> configuration.md
container or Kubernetes
  -> docker-k8s-deployment.md
GUI reverse proxy management
  -> proxy-manager.md
```

## 9. 실패 사례 (What could go wrong?)

Default server block이 예상과 달라서 다른 domain 설정이 응답할 수 있다.

`alias`와 `root`를 혼동하면 file path가 잘못 매핑된다.

Backend가 `X-Forwarded-Proto`를 믿는데 Nginx가 값을 넘기지 않으면 redirect loop가 생길 수 있다.

Nginx Proxy Manager admin port를 인터넷에 열어두면 관리 UI가 공격면이 된다.

Kubernetes Ingress만 만들고 Ingress Controller가 없으면 아무 traffic도 처리되지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

Nginx는 web server이면서 reverse proxy, cache, load balancer, TCP/UDP stream proxy로도 쓰인다. 기능이 많을수록 설정 파일을 작게 분리하고 변경 검증을 자동화해야 한다.

운영 규모가 커지면 access log 구조화, upstream latency metric, certificate expiry monitoring, config deployment pipeline이 필요하다.

공식 문서는 directive 동작과 Ingress Controller 배포 방식을 계속 갱신한다.

- Nginx documentation: <https://nginx.org/en/docs/>
- Nginx load balancing: <https://nginx.org/en/docs/http/load_balancing.html>
- NGINX Ingress Controller documentation: <https://docs.nginx.com/nginx-ingress-controller/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 실제 하위 문서 3개와 링크가 일치한다.
- [ ] 수동 설정, container/Kubernetes, Proxy Manager의 책임을 구분한다.
- [ ] 설정 변경 전후 `nginx -t`, reload, curl, log 확인 순서를 알고 있다.
- [ ] Admin UI와 status endpoint를 public으로 열지 않는다.
- [ ] `proxy_pass`, `root`, `alias`, `location`의 위험 지점을 알고 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Nginx 운영의 핵심은 요청이 어떤 server block과 location을 지나 backend나 static file로 가는지 검증하는 것이다. 설정은 반드시 test, reload, log 확인까지 하나의 변경 단위로 다룬다.
