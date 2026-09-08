# Proxmox 환경 WireGuard VPN

이 문서는 Proxmox 환경에서 WireGuard VPN을 운영할 때 `wg-easy`를 별도 VM 또는 LXC에 배치하는 기준을 정리한다. 목표는 VPN 터널 포트와 관리 UI 포트를 분리하고, Proxmox host 방화벽과 guest 방화벽의 책임을 혼동하지 않는 것이다.

## 적용 범위와 보안 검증 기준

- **범위:** Ubuntu, Docker/Compose, WG-Easy image version 또는 digest, WireGuard, UFW, host network interface와 client platform을 고정합니다. environment 변수, password 형식과 port 기본값은 WG-Easy release별로 확인합니다.
- **보안 전제:** 관리 UI는 public Internet에 직접 노출하지 않고 trusted source, VPN 또는 별도 authenticated proxy로 제한합니다. secret은 Compose file·shell history·log에서 분리하고 SSH와 기존 firewall 접근을 보존합니다.
- **route 전제:** 선택한 WG-Easy release의 endpoint 설정, 실제 Compose port mapping, client AllowedIPs, server forwarding, 좁은 firewall route rule, NAT egress interface와 DNS를 한 흐름으로 확인합니다. legacy WG_HOST 변수를 v15 setup 방식에 그대로 이식하지 않습니다.
- **실패·완료:** remote lockout, UI 노출, handshake만 되고 traffic 없음, DNS·IPv6 leak, MTU 단편화, route 충돌과 container restart를 시험합니다. 양방향 route, 의도한 egress IP, DNS, latency·throughput 기준과 rollback이 확인될 때 완료입니다.

---

WG-Easy는 Docker를 기반으로 동작하며, 직관적인 웹 UI를 통해 WireGuard 서버와 클라이언트(피어)를 매우 쉽게 관리할 수 있게 해주는 도구입니다.

## 1. 왜 필요한가? (Pain Point & Motivation)

WireGuard는 설정이 단순하지만 routing, forwarding, NAT, firewall이 조금만 어긋나도 “연결은 된 것 같은데 통신이 안 되는” 상태가 된다. `wg-easy`는 peer 생성과 QR code 관리가 편하지만 관리 UI를 인터넷에 그대로 노출하면 공격면이 커진다.

Proxmox host에 직접 VPN stack을 얹으면 가상화 host의 네트워크와 방화벽을 건드리게 된다. 가능하면 전용 VM 또는 LXC에 넣어 책임 경계를 분리하는 편이 안전하다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Ubuntu 서버에 Docker와 `wg-easy`를 설치하고 TCP/UDP 51821을 모두 여는 흐름을 설명한다. 보완해야 할 점은 다음과 같다.

- `wg-easy` v15의 setup 방식과 오래된 environment 방식이 섞일 수 있다.
- Web UI port를 public으로 여는 전제가 위험하다.
- WireGuard tunnel UDP port와 UI TCP port가 같은 번호로 섞여 있다.
- NAT와 forwarding을 UFW에 직접 넣는 방식이 Docker network와 충돌할 수 있다.
- Proxmox host와 VPN guest의 책임 경계가 분명하지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태를 만드는 것이다.

- Proxmox host가 아니라 전용 Linux VM 또는 LXC에서 `wg-easy`를 실행한다.
- WireGuard UDP port만 외부에 노출한다.
- 관리 UI는 localhost bind, SSH tunnel, 또는 HTTPS reverse proxy 뒤에 둔다.
- `wg-easy` setup 화면에서 host와 port를 명시한다.
- Peer를 생성하고 client에서 handshake를 확인한다.
- Client routing, DNS, allowed IPs를 의도적으로 설정한다.
- Backup 대상에 `/etc/wireguard` volume을 포함한다.

## 4. 시스템 번역 (Data Flow)

VPN 연결 흐름은 다음과 같다.

```text
client WireGuard interface
  -> UDP endpoint on public IP or domain
  -> wg-easy container
  -> WireGuard interface inside container
  -> Docker and host forwarding
  -> target network or internet
```

관리 흐름은 별도다.

```text
admin browser
  -> SSH tunnel or HTTPS reverse proxy
  -> wg-easy web UI
  -> peer configuration
  -> downloaded client config
```

터널 데이터 경로와 관리 UI 경로를 같은 보안 수준으로 취급하면 안 된다.

## 5. 핵심 구성요소 (Building Blocks)

WireGuard UDP port는 실제 VPN packet이 들어오는 endpoint다. 기본 예시는 `51820/udp`를 사용한다.

`wg-easy` Web UI는 peer 생성, QR code, config download를 제공한다. 인터넷에 직접 노출하지 않는 것이 기본이다.

Docker Compose는 container, capability, sysctl, volume, network를 선언한다.

`/etc/wireguard` volume은 peer와 server 설정을 담는 핵심 데이터다. 이 volume을 잃으면 peer 정보를 잃는다.

Proxmox firewall은 host, VM, datacenter level에 규칙이 있을 수 있다. VM 내부 UFW와 Proxmox firewall을 모두 확인해야 한다.

AllowedIPs는 peer별 송신 대상 선택과 수신 source 허용 범위를 정의하며 wg-quick 같은 도구가 이를 route로 반영한다. 0.0.0.0/0은 IPv4 full tunnel이며 IPv6의 ::/0, DNS와 다른 route 정책은 별도로 정한다.

## 6. 상태 전이 (State Transition)

서버 준비 상태는 다음과 같다.

```text
VM or LXC created
  -> Docker installed
  -> compose file written
  -> UDP firewall opened
  -> wg-easy setup completed
  -> peer created
  -> client connected
```

Client 연결 상태는 다음처럼 확인한다.

```text
config imported
  -> wg-quick installs interface and routes
  -> traffic sent toward a tunnel destination
  -> handshake and packet counters checked
  -> DNS works
  -> target service reachable
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Proxmox host 자체에 설치하기보다 전용 VM 또는 LXC를 우선한다.
- Web UI를 public internet에 평문 HTTP로 열지 않는다.
- WireGuard UDP port와 Web UI TCP port를 혼동하지 않는다.
- `wg-easy` image tag와 문서 version을 맞춘다.
- `/etc/wireguard` volume을 backup 대상에 포함한다.
- Full tunnel은 IPv4·IPv6 AllowedIPs, routing policy와 DNS 설정을 함께 정한다. WireGuard 자체가 DNS를 자동 구성하는 것은 아니다.
- Proxmox firewall과 guest firewall을 모두 확인한다.
- Peer config는 secret으로 취급한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

최소 예제는 전용 Ubuntu VM을 대상으로 한다. LXC는 Proxmox host kernel을 공유하며 capability·module·Docker nesting 조건이 달라 이 Compose를 그대로 적용하는 대안으로 가정하지 않는다.

```bash
docker version
docker compose version
```

Compose directory를 만든다.

```bash
sudo mkdir -p /opt/wg-easy
cd /opt/wg-easy
```

`docker-compose.yml`을 작성한다. Web UI는 guest의 localhost에만 publish하고 SSH tunnel로 접근한다. 이 제한된 HTTP 경로에는 `INSECURE: "true"`가 필요하다([v15.1 공식 설정](https://wg-easy.github.io/wg-easy/v15.1/advanced/config/optional-config/)). 외부 관리 접속은 HTTPS로 구성하며, 이 HTTP 예제를 public interface에 publish하지 않는다.

```yaml
volumes:
  etc_wireguard:

networks:
  wg:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
      - subnet: 10.42.42.0/24
      - subnet: fdcc:ad94:bacf:61a3::/64

services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy:15
    container_name: wg-easy
    environment:
      INSECURE: "true"
    networks:
      wg:
        ipv4_address: 10.42.42.42
        ipv6_address: fdcc:ad94:bacf:61a3::2a
    volumes:
    - etc_wireguard:/etc/wireguard
    - /lib/modules:/lib/modules:ro
    ports:
    - "51820:51820/udp"
    - "127.0.0.1:51821:51821/tcp"
    restart: unless-stopped
    cap_add:
    - NET_ADMIN
    - SYS_MODULE
    sysctls:
    - net.ipv4.ip_forward=1
    - net.ipv4.conf.all.src_valid_mark=1
    - net.ipv6.conf.all.disable_ipv6=0
    - net.ipv6.conf.all.forwarding=1
    - net.ipv6.conf.default.forwarding=1
```

실행한다.

```bash
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=100
```

Guest에서 필요한 WireGuard UDP 경로를 검토한다. Docker publish 트래픽은 일반 UFW INPUT 허용/차단과 다른 forwarding 경로를 지날 수 있으므로 Proxmox·guest·Docker의 실제 nftables/iptables rule과 packet 경로를 함께 확인한다. 기존 SSH 허용과 rollback 경로를 유지한다.

```bash
sudo ufw allow 51820/udp
sudo ufw status verbose
```

관리 UI는 SSH tunnel로 접속한다.

```bash
ssh -L 51821:127.0.0.1:51821 user@vpn.example.com
```

브라우저에서 다음 주소로 접속해 초기 setup을 진행한다.

```text
http://127.0.0.1:51821
```

Setup 화면에서는 username, password, server host, server port를 지정한다. Host는 client가 접속할 public IP 또는 domain이고, port는 WireGuard UDP port다.

Client Linux host에서 peer config를 가져와 연결한다.

```bash
sudo apt install wireguard-tools
sudo install -D -m 600 peer.conf /etc/wireguard/wg0.conf
sudo wg-quick up wg0
sudo wg show
ip route
```

연결을 끊는다.

```bash
sudo wg-quick down wg0
```

Volume 위치를 조회한다. 다음 inspect는 backup 생성이나 복원 시험이 아니므로 별도로 일관된 volume backup을 외부에 보관하고 복원한 설정·peer 동작을 검증한다.

```bash
sudo docker volume ls
sudo docker volume inspect wg-easy_etc_wireguard
```

## 9. 실패 사례 (What could go wrong?)

Web UI를 `0.0.0.0:51821`로 열면 인터넷에서 로그인 화면에 접근할 수 있다. SSH tunnel, VPN 내부 접근, 또는 HTTPS reverse proxy를 사용한다.

UDP port가 router, Proxmox firewall, guest firewall 중 하나에서 막히면 peer config가 맞아도 handshake가 생기지 않는다.

`WG_HOST` 같은 오래된 environment 예제를 v15 문서에 그대로 적용하면 setup 방식이 맞지 않을 수 있다. image tag와 문서 version을 맞춘다.

Client AllowedIPs의 0.0.0.0/0은 IPv4 트래픽에 대한 full-tunnel 경로다. IPv6, DNS·policy routing과 server forwarding/NAT가 별도로 맞아야 의도한 egress가 되며 handshake만으로 이를 증명하지 못한다.

Docker volume을 삭제하면 peer 정보와 server key를 잃는다. Container 재생성과 volume 삭제는 다르다.

외부 UDP 도달 실패는 router, Proxmox firewall, guest forwarding과 Docker publish 경로의 실제 규칙·counter로 확인한다. UFW status만 보고 container port가 차단 또는 허용되었다고 단정하지 않는다.

## 10. 뇌 확장하기 (Evolution & Variants)

관리 UI를 외부에서 써야 한다면 Caddy, Traefik, Nginx 같은 reverse proxy 뒤에 HTTPS와 접근 제한을 둔다. 가능하면 WireGuard로 먼저 접속한 사용자만 UI에 접근하게 만든다.

Site-to-site VPN은 단일 client full tunnel과 다르다. 양쪽 subnet route, NAT 여부, AllowedIPs, firewall policy를 함께 설계해야 한다.

Proxmox cluster에서는 VPN VM을 어느 node에 둘지, node 장애 시 어떻게 복구할지, backup과 restore가 어떤 storage에 있는지 정해야 한다.

공식 wg-easy 문서는 versioned documentation을 제공하므로 image tag와 문서 version을 맞춘다.

- wg-easy documentation: <https://wg-easy.github.io/wg-easy/latest/>
- wg-easy basic installation: <https://wg-easy.github.io/wg-easy/latest/examples/tutorials/basic-installation/>
- wg-easy setup guide: <https://wg-easy.github.io/wg-easy/latest/guides/setup/>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Proxmox host가 아니라 전용 VM 또는 LXC에 배치했다.
- [ ] `wg-easy` image tag와 문서 version을 확인했다.
- [ ] UDP 51820 또는 선택한 WireGuard port만 외부에 열었다.
- [ ] Web UI는 localhost, VPN 내부, 또는 HTTPS reverse proxy 뒤에 있다.
- [ ] Setup에서 public host와 port를 정확히 입력했다.
- [ ] Peer config를 secret으로 취급했다.
- [ ] Client에서 handshake와 route를 확인했다.
- [ ] Proxmox firewall과 guest firewall을 모두 확인했다.
- [ ] `/etc/wireguard` volume backup 경로를 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxmox에서 WireGuard를 운영할 때 핵심은 터널 UDP endpoint와 관리 UI를 분리하는 것이다. VPN은 전용 guest에 두고, UI는 공개하지 않으며, peer 설정과 `/etc/wireguard` volume을 secret으로 백업한다.
