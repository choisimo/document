---
description: nmcli를 사용한 Linux 네트워크 설정 및 고정 IP 구성 가이드
---

# nmcli 네트워크 설정 가이드

NetworkManager가 해당 인터페이스를 관리하는 Linux에서 `nmcli`로 연결 프로파일을 구성하는 방법입니다. 속성 지원과 재적용 가능 여부는 NetworkManager 및 배포판 버전에 따라 다릅니다.

!!! danger "원격 변경 안전 조건"
    현재 SSH 경로를 바꾸기 전에 콘솔·별도 관리망, 이전 프로파일, 주소 충돌 검사와 자동 롤백 수단을 확보하세요.

## 기본 명령어

### 네트워크 상태 확인

```bash
# 전체 연결 목록 확인
nmcli connection show

# 활성화된 연결만 보기
nmcli connection show --active

# 디바이스 상태 확인
nmcli device status

# 상세 디바이스 정보
nmcli device show
```

**출력 예시:**
```
NAME                UUID                                  TYPE      DEVICE
Wired connection 1  56d89f7a-1234-5678-90ab-cdef12345678  ethernet  ens33
```

!!! tip "연결 이름 vs 디바이스 이름"
    - **연결 이름(NAME)**: `Wired connection 1` - nmcli 명령어에서 사용
    - **디바이스 이름(DEVICE)**: `ens33` - 물리적 인터페이스 이름

---

## 고정 IP 설정 (Static IP)

### 1단계: 연결 이름 확인

```bash
nmcli con show
```

### 2단계: 고정 IP 설정

```bash
sudo nmcli connection modify "연결이름" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8 8.8.4.4" \
  ipv4.method manual
```

| 옵션 | 설명 | 예시 |
|------|------|------|
| `ipv4.addresses` | IP 주소/서브넷 마스크 | `192.168.1.100/24` |
| `ipv4.gateway` | 기본 게이트웨이 | `192.168.1.1` |
| `ipv4.dns` | DNS 서버 (공백으로 구분) | `"8.8.8.8 8.8.4.4"` |
| `ipv4.method` | 설정 방식 | `manual` (고정) / `auto` (DHCP) |

### 3단계: 변경사항 적용

```bash
# 연결 재시작
sudo nmcli connection down "Wired connection 1"
sudo nmcli connection up "Wired connection 1"

# 일부 재적용 가능한 속성만 활성 연결에 반영
sudo nmcli device reapply ens33
```

!!! warning "SSH 접속 중 주의"
    IP가 변경되면 기존 SSH 연결이 끊어집니다. 새 IP로 재접속하세요.

### 4단계: 설정 확인

```bash
# IP 주소 확인
ip addr show ens33

# nmcli로 확인
nmcli connection show "Wired connection 1" | grep ipv4

# 게이트웨이 연결 테스트
ping -c 3 192.168.1.1
```

---

## DHCP로 되돌리기

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.addresses "" \
  ipv4.gateway "" \
  ipv4.dns "" \
  ipv4.method auto

sudo nmcli connection up "Wired connection 1"
```

---

## 새 연결 프로파일 생성

기존 연결을 수정하는 대신 새로 만들 수도 있습니다.

```bash
# 이더넷 연결 생성
sudo nmcli connection add \
  type ethernet \
  con-name "Static-LAN" \
  ifname ens33 \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual \
  autoconnect yes

# 활성화
sudo nmcli connection up "Static-LAN"
```

---

## Wi-Fi 연결 설정

### Wi-Fi 네트워크 검색

```bash
# Wi-Fi 활성화
nmcli radio wifi on

# 주변 네트워크 검색
nmcli device wifi list
```

### Wi-Fi 연결

```bash
# 기본 연결 (DHCP)
sudo nmcli --ask device wifi connect "SSID명"

# 고정 IP로 Wi-Fi 연결
sudo nmcli connection add \
  type wifi \
  con-name "Home-WiFi" \
  ssid "SSID명" \
  wifi-sec.key-mgmt wpa-psk \
  wifi-sec.psk "비밀번호" \
  ipv4.addresses 192.168.1.150/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual
```

---

## 유용한 추가 설정

### MTU 변경

```bash
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000
```

### MAC 주소 변경 (스푸핑)

```bash
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.cloned-mac-address "AA:BB:CC:DD:EE:FF"
```

### DNS 검색 도메인 설정

```bash
sudo nmcli connection modify "Wired connection 1" ipv4.dns-search "example.com,internal.local"
```

### 연결 자동 시작 설정

```bash
# 자동 연결 활성화
sudo nmcli connection modify "Wired connection 1" connection.autoconnect yes

# 자동 연결 비활성화
sudo nmcli connection modify "Wired connection 1" connection.autoconnect no
```

---

## 연결 프로파일 관리

### 연결 삭제

```bash
sudo nmcli connection delete "연결이름"
```

### 연결 이름 변경

```bash
sudo nmcli connection modify "Wired connection 1" connection.id "LAN-Static"
```

### 설정 파일 직접 확인

```bash
# NetworkManager 설정 파일 위치
ls /etc/NetworkManager/system-connections/

# 설정 파일 내용 확인
sudo cat /etc/NetworkManager/system-connections/"Wired connection 1.nmconnection"
```

---

## 전체 설정 예시 (복사용)

### 서버용 고정 IP 설정

```bash
# 연결 이름 확인
nmcli con show

# 고정 IP 설정 (한 줄)
sudo nmcli con mod "Wired connection 1" ipv4.addr 192.168.1.100/24 ipv4.gw 192.168.1.1 ipv4.dns "8.8.8.8 8.8.4.4" ipv4.method manual

# 적용
sudo nmcli con up "Wired connection 1"

# 확인
ip addr show && ip route show
```

### 듀얼 스택 (IPv4 + IPv6)

```bash
sudo nmcli connection modify "Wired connection 1" \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual \
  ipv6.addresses "2001:db8::100/64" \
  ipv6.gateway "2001:db8::1" \
  ipv6.method manual
```

---

## 트러블슈팅

### 변경사항이 적용되지 않을 때

대상 프로파일과 journal을 먼저 확인합니다. NetworkManager 재시작이나 `nmcli networking off`는 모든 관리 연결을 끊을 수 있으므로 콘솔이 확보된 마지막 복구 단계에서만 사용합니다.

```bash
sudo nmcli connection up "연결이름"
journalctl -u NetworkManager --since "-10 min"
```

### DNS가 작동하지 않을 때

```bash
# /etc/resolv.conf 확인
cat /etc/resolv.conf

# DNS 서버 재설정
sudo nmcli connection modify "Wired connection 1" ipv4.ignore-auto-dns yes
sudo nmcli connection modify "Wired connection 1" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection up "Wired connection 1"
```

### 연결 상태 디버깅

```bash
# 상세 로그 확인
journalctl -u NetworkManager -f

# 연결 상세 정보
nmcli -p connection show "Wired connection 1"
```

---

## 완료 및 실패 판정

`nmcli connection show --active`, `ip address`, `ip route get <관리서버IP>`로 프로파일과 실제 송신 경로를 확인하고 DNS와 관리 서비스를 별도로 시험합니다. 재부팅 후 자동 연결까지 유지되어야 완료이며, 실패하면 기존 프로파일을 다시 올립니다. 기존 프로파일 삭제는 검증 후 수행합니다.

## 참고 자료

- [RHEL NetworkManager 문서](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/)
- [nmcli 매뉴얼](https://networkmanager.dev/docs/api/latest/nmcli.html)
