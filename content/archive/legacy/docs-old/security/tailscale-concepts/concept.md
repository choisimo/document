# Tailscale CLI 작업별 가이드

Tailscale CLI의 플래그와 기본 동작은 버전과 관리 정책에 따라 달라질 수 있습니다. 먼저 로컬 버전과 해당 하위 명령 도움말을 확인합니다.

```bash
tailscale version
tailscale help
tailscale <SUBCOMMAND> --help
```

## 연결 상태

```bash
tailscale up
tailscale status
tailscale ip -4
tailscale netcheck
tailscale ping <PEER_NAME_OR_IP>
tailscale down
```

- `up`은 장치를 tailnet 설정에 연결하거나 기존 설정을 갱신합니다.
- `status`는 제어 평면이 아는 피어와 현재 연결 정보를 보여 줍니다.
- `netcheck`는 NAT와 DERP 연결 같은 네트워크 조건을 관찰합니다.
- `ping`은 Tailscale 경로를 진단하며 일반 ICMP 도구와 같은 계약으로 가정하지 않습니다.
- `down`은 이 장치의 Tailscale 연결을 내리지만 장치 등록 삭제와 같지 않습니다.

연결 완료는 `up`의 종료 상태만이 아니라 대상 피어에 대한 정책 허용, `tailscale ping`, 실제 애플리케이션 포트 연결로 판정합니다.

## 장치 설정 변경

```bash
tailscale set --hostname=<HOSTNAME>
tailscale set --accept-routes=true
tailscale set --accept-dns=false
```

변경 전 `tailscale set --help`에서 현재 버전의 플래그를 확인합니다. DNS나 경로 수락을 바꾸면 기존 이름 해석과 기본 라우팅이 달라질 수 있으므로 변경 전후 라우팅 표와 DNS 결과를 기록합니다.

## 서브넷 라우터

1. 운영체제에서 IPv4 또는 IPv6 forwarding을 영구 설정합니다.
2. `tailscale up --advertise-routes=<CIDR_LIST>`로 정확한 CIDR만 광고합니다.
3. 관리 콘솔 또는 정책 파일에서 광고 경로를 승인합니다.
4. 다른 피어가 경로를 수락하는지 확인합니다.
5. 허용된 출발지와 목적지만 통신하고 나머지는 거부되는지 테스트합니다.

임의의 `iptables MASQUERADE` 규칙을 먼저 추가하지 않습니다. SNAT 필요성, 인터페이스 이름, 방화벽 백엔드는 OS와 Tailscale 설정을 확인한 뒤 결정합니다.

## Exit node

```bash
tailscale up --exit-node=<EXIT_NODE>
```

Exit node 사용 전 대상 장치의 광고·승인 상태와 로컬 LAN 접근 정책을 확인합니다. 완료 조건은 공인 출구 주소뿐 아니라 DNS, 내부 경로, IPv4·IPv6 누출 여부가 기대와 같은 것입니다.

## Tailscale SSH

```bash
tailscale set --ssh=true
tailscale ssh <USER>@<PEER>
```

명령 지원 여부는 로컬 도움말로 확인합니다. SSH 활성화만으로 접근이 허용되지는 않으며 tailnet의 SSH 정책과 운영체제 사용자가 함께 일치해야 합니다.

## 자동 등록과 비밀값

인증 키를 명령 예시나 셸 기록에 직접 쓰지 않습니다. 일회성·만료·preauthorized·태그 속성을 필요한 최소 범위로 발급하고 배포 시스템의 비밀 주입 기능을 사용합니다. 등록 뒤 장치 이름, 태그, 키 만료, 정책 적용을 관리 콘솔에서 재확인합니다.

## 공개 서비스

Serve와 Funnel은 로컬 서비스를 tailnet 또는 공개 인터넷에 노출할 수 있습니다. 사용 중인 버전의 `tailscale serve --help`와 `tailscale funnel --help`를 기준으로 구문을 선택하고, 공개 범위·TLS 종단·인증 부재·로그·중단 명령을 배포 전에 정의합니다.

공개 완료는 URL이 한 번 열리는 상태가 아니라 허용 경로의 응답, 금지 경로의 거부, 재시작 후 설정, 외부 스캔 결과, 종료 후 비노출을 모두 확인한 상태입니다.
