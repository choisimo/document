# Docker 네트워크 생성 옵션 종합 분석

Docker의 `docker network create` 명령어는 컨테이너 간 통신 및 네트워크 격리를 제어하는 핵심 도구로, 다양한 옵션을 통해 네트워크 토폴로지를 세밀하게 구성할 수 있습니다[5][7]. 본 분석에서는 모든 주요 옵션의 기능, 사용 사례, 실제 적용 예시를 체계적으로 설명합니다.

---

## 네트워크 드라이버 관련 옵션

### 1. `--driver` / `-d`
- **기능**: 네트워크 드라이버 유형 지정
- **기본값**: `bridge`
- **지원 드라이버**: 
  - `bridge`: 단일 호스트 내 컨테이너 통신(기본값)[5]
  - `overlay`: 멀티호스트 환경(Swarm 클러스터) 지원[1][7]
  - `macvlan`: 물리 네트워크에 직접 연결(MAC 주소 할당)[2][5]
  - `ipvlan`: L2/L3 네트워크 세분화[5]
  - `host`: 호스트 네트워크 스택 공유[3][5]
  - `none`: 네트워크 격리[3][5]

**예시**:
```bash
# 오버레이 네트워크 생성
docker network create -d overlay --attachable my_overlay[1][7]
```

---

## IP 주소 관리 옵션

### 2. `--subnet`
- **기능**: CIDR 표기법으로 네트워크 서브넷 지정
- **중요성**: IP 충돌 방지 및 예측 가능한 주소 할당[3][6]
- **예시**:
  ```bash
  docker network create --subnet 192.168.100.0/24 custom_net[3][7]
  ```

### 3. `--gateway`
- **기능**: 서브넷의 게이트웨이 IP 지정
- **기본값**: 서브넷 첫 번째 주소(예: 192.168.100.1)
- **예시**:
  ```bash
  docker network create --subnet 10.1.0.0/16 --gateway 10.1.255.254 corp_net[7]
  ```

### 4. `--ip-range`
- **기능**: 컨테이너 IP 할당 범위 제한
- **사용 사례**: 특정 IP 대역 예약[3][7]
- **예시**:
  ```bash
  docker network create --subnet 172.21.0.0/16 --ip-range 172.21.5.0/24 dev_net[7]
  ```

### 5. `--aux-address`
- **기능**: MACVLAN/IPVLAN에서 예약 IP 지정[2][7]
- **사용 사례**: 라우터, NAS 등 고정 IP 장비와의 충돌 방지
- **예시**:
  ```bash
  docker network create -d macvlan \
    --subnet 192.168.50.0/24 \
    --aux-address="router=192.168.50.1" \
    macvlan_net[2][7]
  ```

---

## 네트워크 연결성 제어 옵션

### 6. `--attachable`
- **기능**: 수동 컨테이너 연결 허용(주로 오버레이 네트워크)[1][7][8]
- **기본 동작**: Swarm 서비스만 허용
- **예시**:
  ```bash
  # Swarm 서비스와 일반 컨테이너 공용 네트워크
  docker network create -d overlay --attachable shared_net[1][8]
  ```

### 7. `--internal`
- **기능**: 외부 네트워크 접근 차단
- **사용 사례**: 내부 전용 서비스 격리[7]
- **예시**:
  ```bash
  docker network create --internal secure_backend[7]
  ```

### 8. `--ingress`
- **기능**: Swarm 라우팅 메시 네트워크 생성[7]
- **특징**: 
  - Load Balancing 및 서비스 디스커버리 제공
  - 단일 인그레스 네트워크만 허용
- **예시**:
  ```bash
  docker network create --ingress --driver overlay ingress_net[7]
  ```

---

## 고급 구성 옵션

### 9. `--opt` / `-o`
- **기능**: 드라이버별 고급 설정[3][7]
- **주요 매개변수**:
  - `com.docker.network.bridge.name`: 브리지 이름 지정
  - `com.docker.network.bridge.enable_ip_masquerade`: IP 마스커레이딩 활성화[3][7]
  - `com.docker.network.driver.mtu`: 네트워크 MTU 설정
- **예시**:
  ```bash
  docker network create -o "com.docker.network.bridge.name"="br0" custom_br[3][7]
  ```

### 10. `--ipam-driver`
- **기능**: IPAM(IP Address Management) 드라이버 지정[7]
- **기본값**: `default`
- **확장 사용**: DHCP 서버 연동 시 활용

### 11. `--ipam-opt`
- **기능**: IPAM 드라이버별 옵션 설정[7]
- **예시**:
  ```bash
  docker network create --ipam-driver=dhcp \
    --ipam-opt dhcp_lease_time=24h \
    dhcp_net[7]
  ```

---

## 네트워크 범위 및 구성 관리

### 12. `--scope`
- **기능**: 네트워크 가시성 영역 제어[7]
- **값**:
  - `swarm`: 클러스터 전체 적용
  - `local`: 단일 노드 한정
- **예시**:
  ```bash
  docker network create --scope swarm --driver overlay cluster_net[7]
  ```

### 13. `--config-from`
- **기능**: 기존 네트워크 구성 복제(API 1.30+)[7]
- **사용 사례**: 표준 네트워크 템플릿 활용
- **예시**:
  ```bash
  docker network create --config-from template_net new_net[7]
  ```

### 14. `--config-only`
- **기능**: 구성 정보만 저장(실제 네트워크 생성 X)[7]
- **용도**: 멀티호스트 환경에서 노드별 설정 템플릿
- **예시**:
  ```bash
  docker network create --config-only --subnet 10.50.0.0/24 config_net[7]
  ```

---

## 프로토콜 및 메타데이터 옵션

### 15. `--ipv4` / `--ipv6`
- **기능**: IPv4/IPv6 활성화 여부 지정[7]
- **기본값**: IPv4 활성화
- **예시**:
  ```bash
  docker network create --ipv6 --subnet 2001:db8::/64 ipv6_net[7]
  ```

### 16. `--label`
- **기능**: 네트워크 메타데이터 추가[7]
- **용도**: 환경 분류, 비용 할당 태깅
- **예시**:
  ```bash
  docker network create --label env=production prod_net[7]
  ```

---

## 실제 적용 시나리오

### 멀티티어 아키텍처 구성
```bash
# 프론트엔드 네트워크
docker network create \
  --driver=overlay \
  --subnet=10.1.0.0/24 \
  --attachable \
  frontend_net[1][7]

# 백엔드 데이터베이스 네트워크  
docker network create \
  --driver=overlay \
  --subnet=10.2.0.0/24 \
  --internal \
  backend_net[7]
```

### 하이브리드 클라우드 환경
```bash
# 물리 네트워크 통합 MACVLAN
docker network create -d macvlan \
  --subnet=192.168.100.0/24 \
  --gateway=192.168.100.1 \
  --aux-address="nas=192.168.100.50" \
  --opt parent=eth0 \
  physical_net[2][5][7]
```

---

## 옵션 상호작용 주의사항

1. **오버레이 네트워크**:
   - `--attachable` 없이는 Swarm 서비스만 연결 가능[1][8]
   - 멀티호스트 구성 시 `--subnet` 필수[7]

2. **MACVLAN/IPVLAN**:
   - 물리 네트워크 인터페이스(`--opt parent=`) 지정 필요[2][5]
   - 호스트 네트워크 정책과 충돌 가능성 검토

3. **브리지 네트워크**:
   - 단일 서브넷만 허용[3][7]
   - `--ip-range`와 `--gateway`는 `--subnet`과 함께 사용

4. **구성 전용 네트워크**:
   - `--config-only`는 실제 트래픽 처리 불가[7]
   - Swarm 범위 네트워크에서만 활용



# Docker 네트워크 설정 방법

Docker에서는 컨테이너 간 통신 및 외부 네트워크와의 연결을 위해 다양한 네트워크 설정 방법을 제공합니다. 아래에서 Docker 네트워크의 기본 개념부터 설정 방법까지 상세히 알아보겠습니다.

## 기본 네트워크 종류

Docker를 설치하면 기본적으로 세 가지 네트워크가 생성됩니다[2][5]:

- **bridge**: 기본 네트워크 드라이버로, 별도 지정이 없으면 컨테이너는 이 네트워크에 연결됩니다
- **host**: 컨테이너와 Docker 호스트 간의 네트워크 격리를 제거합니다
- **none**: 컨테이너를 호스트 및 다른 컨테이너로부터 완전히 격리합니다

현재 네트워크 목록은 다음 명령어로 확인할 수 있습니다:

```
docker network ls
```

## 사용자 정의 네트워크 생성

새로운 Docker 네트워크는 `docker network create` 명령어로 생성할 수 있습니다[4][5]:

```
docker network create [옵션] 네트워크명
```

### 주요 옵션

- `--driver`, `-d`: 네트워크 드라이버 유형 지정 (기본값: bridge)[7]
- `--subnet`: 서브넷을 CIDR 형식으로 지정 (예: 172.72.0.0/16)[7]
- `--gateway`: 게이트웨이 IP 주소 지정[7]
- `--ip-range`: 컨테이너에 할당할 IP 주소 범위 지정[7]
- `--ipv6`: IPv6 네트워크 활성화 여부(true/false)[7]

### 예시

```
docker network create --driver bridge --subnet 172.72.0.0/16 --gateway 172.72.0.1 mybridge
```

이 명령어는 "mybridge"라는 이름의 bridge 네트워크를 생성하고, 서브넷과 게이트웨이를 지정합니다[1].

## 네트워크 드라이버 유형

Docker는 다양한 사용 사례에 맞는 여러 네트워크 드라이버를 제공합니다[3]:

**bridge**: 기본 네트워크 드라이버로 동일한 Docker 호스트에서 실행 중인 컨테이너 간 통신에 사용됩니다[3].

**host**: 컨테이너가 호스트의 네트워크를 직접 사용하여 네트워크 격리를 제거합니다[3].

**none**: 네트워크 기능이 없으며 루프백 인터페이스만 존재합니다[3][7].

**overlay**: 여러 Docker 데몬을 연결하는 데 사용되며, Swarm 서비스에 적합합니다[3].

**ipvlan**: IPv4 및 IPv6 주소 지정에 대한 완전한 제어를 제공합니다[3].

**macvlan**: 컨테이너에 MAC 주소를 할당하여 물리적 디바이스처럼 네트워크에 나타나게 합니다[3].

## 컨테이너 실행 시 네트워크 설정

컨테이너를 실행할 때 다양한 네트워크 옵션을 지정할 수 있습니다[1][7]:

```
docker container run [네트워크 옵션] 이미지명[:태그명] [인수]
```

### 주요 네트워크 옵션

- `--network=네트워크명`: 컨테이너가 연결될 네트워크 지정[3]
- `--add-host=[호스트명:IP주소]`: 컨테이너의 /etc/hosts에 호스트명과 IP 주소 추가[1][7]
- `--dns=[IP주소]`: 컨테이너용 DNS 서버 IP 주소 지정[1][7]
- `--expose`: 지정한 범위의 포트 번호 할당[1][7]
- `--mac-address=[MAC주소]`: 컨테이너의 MAC 주소 지정[1][7]
- `--hostname`, `-h`: 컨테이너의 호스트명 지정[1][7]
- `--publish`, `-p [호스트포트]:[컨테이너포트]`: 호스트와 컨테이너 간 포트 매핑[1][7]
- `--publish-all`, `-P`: 호스트의 임의 포트를 컨테이너에 할당[1][7]

### 예시

특정 네트워크에 컨테이너 연결:
```
docker run -dit --name test2 --network mybridge centos:latest
```

호스트 네트워크 사용:
```
docker run -it --name test3 --network host centos:latest
```

## 네트워크 상세 정보 확인

특정 네트워크의 상세 정보는 다음 명령어로 확인할 수 있습니다[5]:

```
docker network inspect 네트워크명
```

이 명령어를 통해 네트워크의 서브넷, 게이트웨이, 연결된 컨테이너 등 상세 정보를 확인할 수 있습니다[5].

## 브리지 네트워크 드라이버 고급 옵션

브리지 네트워크 생성 시 다음과 같은 추가 옵션을 사용할 수 있습니다[6]:

- `com.docker.network.bridge.name`: 리눅스 브리지 생성 시 사용할 이름
- `com.docker.network.bridge.enable_ip_masquerade`: IP 마스커레이딩 활성화
- `com.docker.network.bridge.enable_icc`: 컨테이너 간 연결 활성화/비활성화
- `com.docker.network.bridge.host_binding_ipv4`: 컨테이너 포트 바인딩 시 기본 IP

이러한 옵션은 `-o` 또는 `--opt` 플래그를 사용하여 지정할 수 있습니다[6].

Docker 네트워크를 적절히 구성하면 컨테이너 간 안전한 통신과 외부 네트워크와의 원활한 연결이 가능해집니다.



# Docker 네트워크 생성 옵션 심층 분석

Docker 네트워크 구성은 컨테이너 간 통신 및 외부 연결을 제어하는 핵심 메커니즘으로, 다양한 생성 옵션을 통해 네트워크 동작을 세밀하게 조정할 수 있습니다. 본 분석에서는 주요 옵션들의 상호작용과 실제 적용 사례를 체계적으로 설명합니다.

## 브리지 드라이버 전용 옵션

### 1. `com.docker.network.bridge.name`
- **기능**: 리눅스 브리지 인터페이스 이름 지정
- **기본값**: 자동 생성(`br-`)
- **사용 사례**: 네트워크 관리 도구와의 통합
- **예시**:
  ```bash
  docker network create -o com.docker.network.bridge.name=mybr0 custom_net[1][7]
  ```
  ```bash
  $ ifconfig mybr0
  mybr0: flags=4163  mtu 1500
          inet 172.19.0.1  netmask 255.255.0.0  broadcast 172.19.255.255[2][7]
  ```

### 2. `com.docker.network.bridge.enable_ip_masquerade`
- **기능**: IP 마스커레이딩 활성화
- **기본값**: `true`
- **작동 원리**: NAT를 통해 컨테이너의 외부 통신을 호스트 IP로 변환
- **비활성화 시 영향**:
  ```bash
  # 외부 네트워크 접근 불가
  docker network create -o com.docker.network.bridge.enable_ip_masquerade=false isolated_net[1][3]
  ```

### 3. `com.docker.network.bridge.enable_icc`
- **기능**: 컨테이너 간 통신 제어
- **기본값**: `true`
- **보안 적용 사례**:
  ```bash
  docker network create -o com.docker.network.bridge.enable_icc=false secure_net[1][3]
  ```
  ```bash
  # 컨테이너 간 ping 실패
  $ docker exec -it container1 ping 172.20.0.3
  connect: Network is unreachable[3]
  ```

### 4. `com.docker.network.bridge.host_binding_ipv4`
- **기능**: 포트 바인딩 기본 IP 지정
- **기본값**: `0.0.0.0`
- **특정 IP 제한 사례**:
  ```bash
  docker network create -o com.docker.network.bridge.host_binding_ipv4=192.168.0.100 restricted_net[1][3]
  ```
  ```bash
  # 192.168.0.100 에서만 접근 가능
  $ netstat -tuln | grep 80
  tcp6   0   0 192.168.0.100:80     :::*     LISTEN[3]
  ```

### 5. `com.docker.network.driver.mtu`
- **기능**: 네트워크 MTU 값 설정
- **기본값**: 호스트 네트워크 MTU
- **VXLAN 오버레이 적용 사례**:
  ```bash
  docker network create -d overlay -o com.docker.network.driver.mtu=1450 vxlan_net[1][5]
  ```
  ```bash
  $ docker exec container ip link show eth0
  4: eth0@if5:  mtu 1450 qdisc noqueue[1]
  ```

### 6. `com.docker.network.container_iface_prefix`
- **기능**: 컨테이너 인터페이스 이름 접두사 지정
- **기본값**: `eth`
- **네트워크 모니터링 용이화**:
  ```bash
  docker network create -o com.docker.network.container_iface_prefix=netif custom_net[1][7]
  ```
  ```bash
  $ docker exec container ip link show
  1: lo:  ...
  2: netif0@if3:  ...[7]
  ```

## 범용 네트워크 옵션

### 7. `--gateway`
- **기능**: 서브넷 기본 게이트웨이 지정
- **CIDR 호환성**: 서브넷 범위 내 유효 IP 필수
- **다중 게이트웨이 사례**:
  ```bash
  docker network create \
    --subnet 10.0.0.0/24 --gateway 10.0.0.254 \
    --subnet 2001:db8::/64 --gateway 2001:db8::ffff \
    dualstack_net[1][5]
  ```

### 8. `--ip-range`
- **기능**: IP 할당 범위 제한
- **서브넷 세분화 전략**:
  ```bash
  docker network create \
    --subnet 172.21.0.0/16 \
    --ip-range 172.21.128.0/17 \
    large_net[1][7]
  ```
  ```bash
  # 컨테이너 IP: 172.21.128.2 ~ 172.21.255.254
  $ docker inspect --format '{{.NetworkSettings.IPAddress}}' container
  172.21.128.2[3][7]
  ```

### 9. `--internal`
- **기능**: 외부 네트워크 격리
- **iptables 규칙 분석**:
  ```bash
  $ iptables -L DOCKER-ISOLATION
  Chain DOCKER-ISOLATION (1 references)
  target     prot opt source      destination
  DROP       all  --  anywhere   anywhere[3][7]
  ```
- **데이터베이스 격리 사례**:
  ```bash
  docker network create --internal db_net[1][7]
  ```

### 10. `--ipv4`/`--ipv6`
- **이중 스택 구현**:
  ```bash
  docker network create \
    --ipv6 \
    --subnet 2001:db8:1::/64 \
    --subnet 192.168.100.0/24 \
    dual_net[5][7]
  ```
  ```bash
  $ docker inspect network dual_net | jq '.[].IPAM.Config'
  [
    {"Subnet": "192.168.100.0/24", "Gateway": "192.168.100.1"},
    {"Subnet": "2001:db8:1::/64", "Gateway": "2001:db8:1::1"}
  ][5]
  ```

### 11. `--subnet`
- **CIDR 설계 전략**:
  ```bash
  # /28 서브넷(14개 호스트 지원)
  docker network create --subnet 10.20.30.0/28 small_net[1][7]
  ```
  ```bash
  # 사용 가능 IP: 10.20.30.1 ~ 10.20.30.14
  $ docker network inspect small_net | jq '.[].IPAM.Config[].Subnet'
  "10.20.30.0/28"[7]
  ```

## 옵션 상호작용 시나리오

### 보안 게이트웨이 구성
```bash
docker network create \
  -o com.docker.network.bridge.name=sec_gw \
  -o com.docker.network.bridge.enable_icc=false \
  --subnet 172.22.0.0/24 \
  --ip-range 172.22.0.128/25 \
  --internal \
  secure_gateway[1][3][7]
```
- **특징**:
  - 수동 브리지 이름 지정(`sec_gw`)
  - 컨테이너 간 통신 차단
  - 상위 128개 IP만 할당
  - 외부 네트워크 격리

### 다중 계층 네트워크 아키텍처
```bash
# 프론트엔드 네트워크
docker network create \
  --driver=overlay \
  --subnet=10.100.0.0/24 \
  --attachable \
  front-tier[1][7]

# 백엔드 데이터 계층
docker network create \
  --driver=bridge \
  --subnet=192.168.200.0/24 \
  --internal \
  -o com.docker.network.bridge.enable_ip_masquerade=false \
  data-tier[1][3][7]
```
- **트래픽 흐름**:
  ```
  Client → front-tier (공개 접근) → API Gateway → data-tier (내부 전용)[3][7]
  ```