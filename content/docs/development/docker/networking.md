# Docker 네트워킹 학습 및 기록 노트

Docker 네트워킹은 컨테이너가 서로 통신하고 외부에 노출되는 경로를 결정한다. `docker network create`는 단순히 이름 있는 네트워크를 만드는 명령이 아니라, 드라이버, 서브넷, 게이트웨이, 포트 바인딩, 격리 수준을 함께 정하는 경계 설정 도구다.

## 1. 왜 필요한가? (Pain Point & Motivation)

컨테이너 애플리케이션에서 네트워크 문제는 증상이 다양하다. 같은 Compose 안의 서비스 이름이 해석되지 않거나, 포트를 열었는데 외부에서 접근할 수 없거나, 데이터베이스가 의도치 않게 외부로 노출될 수 있다. 특히 `bridge`, `host`, `overlay`, `macvlan`은 겉으로는 모두 “네트워크 연결”처럼 보이지만 격리 모델이 다르다.

Docker 네트워크 문서의 목적은 옵션을 많이 외우는 것이 아니라, 컨테이너가 어느 경로로 통신하는지 설명하고 노출 범위를 의도적으로 제한하는 것이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Docker 네트워크 생성 옵션, 기본 네트워크 종류, 브리지 드라이버 세부 옵션을 여러 번 반복해서 설명했다.

- 한 파일 안에 `#` 최상위 제목이 여러 개 있다.
- 예시 명령 뒤에 `[1][7]` 같은 출처 표기가 명령 일부처럼 붙어 있다.
- 코드 블록 전후 공백이 깨져 Markdown 검사에서 실패한다.
- 옵션 목록은 많지만 “언제 어떤 드라이버를 선택해야 하는가”가 분리되어 있지 않다.

이 상태에서는 옵션을 훑어볼 수는 있지만, 실제 서비스 네트워크를 설계할 때 판단 기준으로 쓰기 어렵다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 기본 `bridge`와 사용자 정의 `bridge`의 차이를 이해한다.
- 컨테이너 간 통신, 호스트 포트 공개, 외부 네트워크 접근을 구분한다.
- `--subnet`, `--gateway`, `--ip-range`로 IPAM 범위를 의도적으로 정한다.
- `--internal`이 외부 접근 제한에 어떤 영향을 주는지 이해한다.
- `overlay`, `host`, `none`, `macvlan`, `ipvlan` 선택 기준을 설명할 수 있다.

## 4. 시스템 번역 (Data Flow)

일반적인 브리지 네트워크 흐름은 다음과 같다.

```text
container A
  -> Docker bridge network
  -> container B
```

외부 공개 포트가 있는 흐름은 다음처럼 바뀐다.

```text
client
  -> host IP:published port
  -> Docker port publishing
  -> container port
```

Compose나 사용자 정의 브리지에서는 컨테이너 이름 또는 서비스 이름이 내부 DNS 이름처럼 동작한다. 반면 호스트 외부에서 접근하려면 `--publish` 또는 Compose의 `ports` 설정처럼 명시적인 포트 공개가 필요하다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 대표 명령 |
| --- | --- | --- |
| `bridge` | 단일 호스트 컨테이너 간 통신 | `docker network create -d bridge app_net` |
| `host` | 호스트 네트워크 스택 공유 | `docker run --network host ...` |
| `none` | 루프백만 있는 격리 네트워크 | `docker run --network none ...` |
| `overlay` | 여러 Docker 호스트 간 네트워크 | `docker network create -d overlay ...` |
| `macvlan` | 컨테이너를 물리 네트워크에 직접 노출 | `docker network create -d macvlan ...` |
| `ipvlan` | L2/L3 주소 제어가 필요한 네트워크 | `docker network create -d ipvlan ...` |

`docker network create`의 핵심 옵션은 다음과 같다.

| 옵션 | 의미 |
| --- | --- |
| `-d`, `--driver` | 네트워크 드라이버 선택 |
| `--subnet` | CIDR 형식의 서브넷 지정 |
| `--gateway` | 서브넷 게이트웨이 지정 |
| `--ip-range` | 컨테이너 IP 할당 범위 제한 |
| `--internal` | 네트워크 외부 접근 제한 |
| `--attachable` | Swarm overlay에 일반 컨테이너 연결 허용 |
| `--ipv6` | IPv6 주소 할당 활성화 |
| `-o`, `--opt` | 드라이버별 고급 옵션 |
| `--label` | 네트워크 메타데이터 지정 |

브리지 드라이버에서 자주 쓰는 `--opt`는 다음과 같다.

| 옵션 | 의미 |
| --- | --- |
| `com.docker.network.bridge.name` | Linux bridge 인터페이스 이름 지정 |
| `com.docker.network.bridge.enable_ip_masquerade` | 외부 통신을 위한 IP masquerade 제어 |
| `com.docker.network.bridge.enable_icc` | 같은 브리지 안 컨테이너 간 통신 제어 |
| `com.docker.network.bridge.host_binding_ipv4` | 포트 공개 시 기본 바인딩 주소 지정 |
| `com.docker.network.driver.mtu` | 컨테이너 네트워크 MTU 지정 |

## 6. 상태 전이 (State Transition)

Docker 네트워크 설계는 다음 순서로 진행한다.

```text
통신 요구 확인
  -> 드라이버 선택
  -> IPAM 범위 결정
  -> 컨테이너 연결
  -> 포트 공개 여부 결정
  -> inspect와 실제 통신으로 검증
```

상태별 확인 질문은 다음과 같다.

- 통신 요구: 같은 호스트 안 통신인가, 여러 호스트 간 통신인가?
- 드라이버 선택: 기본 브리지로 충분한가, overlay나 macvlan이 필요한가?
- IPAM 결정: 기존 사내망이나 VPN 대역과 충돌하지 않는가?
- 연결: 컨테이너가 의도한 네트워크에 붙어 있는가?
- 공개: 외부 클라이언트가 접근해야 하는 포트만 열렸는가?
- 검증: `docker network inspect`와 컨테이너 내부 접속 테스트가 일치하는가?

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 외부에 공개할 포트는 `--publish`로 명시한다.
- 데이터베이스처럼 내부 전용 서비스는 공개 포트 없이 내부 네트워크에 둔다.
- 사용자 정의 브리지는 기본 `bridge`보다 서비스 이름 기반 통신과 격리 관리가 쉽다.
- `host` 네트워크는 포트 격리를 제거하므로 필요한 경우에만 사용한다.
- `macvlan`은 물리 네트워크 장비와 IP/MAC 정책을 확인한 뒤 사용한다.
- 서브넷은 호스트 네트워크, VPN, Kubernetes, 다른 Docker 네트워크와 충돌하지 않게 잡는다.
- `--internal`은 외부 접근 제한을 강화하지만, 전체 보안 정책을 대체하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 네트워크를 확인한다.

```bash
docker network ls
docker network inspect bridge
```

사용자 정의 브리지 네트워크를 만든다.

```bash
docker network create -d bridge app_net
docker run -dit --name app1 --network app_net alpine sh
docker run -dit --name app2 --network app_net alpine sh
docker exec app1 ping -c 2 app2
```

서브넷과 게이트웨이를 직접 지정한다.

```bash
docker network create \
  --driver bridge \
  --subnet 172.28.0.0/16 \
  --ip-range 172.28.5.0/24 \
  --gateway 172.28.5.254 \
  app_static_net
```

내부 전용 네트워크를 만든다.

```bash
docker network create --internal backend_net
```

포트를 호스트 루프백 주소에만 공개한다.

```bash
docker run --rm -p 127.0.0.1:8080:80 nginx:alpine
```

브리지 드라이버 옵션으로 기본 포트 바인딩 주소를 제한한다.

```bash
docker network create \
  -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
  local_only_net
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 `EXPOSE`와 `--publish`를 혼동하는 것이다. 이미지의 `EXPOSE`는 문서화 성격이 강하고, 실제 호스트 포트 공개는 `-p` 또는 Compose `ports`가 담당한다.

두 번째 실패는 `host` 네트워크를 편의상 사용하는 것이다. 포트 충돌과 격리 약화가 생기며, 같은 컨테이너 구성을 다른 환경으로 옮기기 어려워진다.

세 번째 실패는 서브넷 충돌이다. Docker 네트워크 대역이 VPN이나 사내망과 겹치면 외부 API, 데이터베이스, 사설 레지스트리 접근이 간헐적으로 실패할 수 있다.

네 번째 실패는 `macvlan`을 일반 브리지 대체처럼 쓰는 것이다. 물리 네트워크 장비가 여러 MAC 주소를 허용해야 하고, 호스트와 컨테이너 간 직접 통신도 별도 설계가 필요할 수 있다.

다섯 번째 실패는 `--internal`을 완전한 방화벽으로 오해하는 것이다. 내부 네트워크 안의 컨테이너 간 통신, 호스트 접근 가능성, 애플리케이션 인증은 별도로 확인해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

단일 개발 장비에서는 사용자 정의 `bridge`와 명시적인 `ports` 설정만으로 대부분 충분하다.

여러 Docker 호스트를 묶는 Swarm 환경에서는 `overlay` 네트워크와 `--attachable`, ingress 라우팅 메시를 함께 검토한다.

물리 네트워크에 컨테이너를 직접 붙여야 하는 레거시 시스템이나 네트워크 장비 테스트에서는 `macvlan` 또는 `ipvlan`을 검토한다. 이 경우 Docker 설정뿐 아니라 스위치, VLAN, IPAM 정책이 함께 맞아야 한다.

IPv6가 필요한 환경에서는 Docker daemon의 IPv6 설정, `--ipv6`, IPv6 서브넷, 방화벽 규칙을 한 세트로 확인한다.

공식 기준을 다시 확인할 때는 Docker의 `docker network create` CLI reference와 네트워크 드라이버 문서를 우선한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 컨테이너 간 통신과 외부 포트 공개를 구분했다.
- [ ] 네트워크 드라이버 선택 이유를 설명할 수 있다.
- [ ] 사용자 정의 브리지 네트워크를 만들고 컨테이너 이름으로 통신을 확인했다.
- [ ] `--subnet`, `--gateway`, `--ip-range`가 기존 네트워크와 충돌하지 않는다.
- [ ] 외부에 필요한 포트만 `--publish`로 열었다.
- [ ] 내부 전용 서비스는 공개 포트 없이 내부 네트워크에 배치했다.
- [ ] `docker network inspect`로 연결된 컨테이너와 IPAM 설정을 확인했다.
- [ ] `host`, `macvlan`, `overlay` 사용 시 격리와 운영 제약을 별도로 검토했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Docker 네트워크는 컨테이너가 “연결되는지”가 아니라 어디까지 `__________`되는지를 정하는 경계다. 내부 통신은 사용자 정의 `__________`, 외부 공개는 `__________`, 여러 호스트 통신은 `__________`를 기준으로 판단한다.
