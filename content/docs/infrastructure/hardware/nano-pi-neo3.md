# NanoPi NEO3 초기 로그인, 고정 IP와 SSH 키 진단

이 문서는 서로 독립적인 세 절차를 다룹니다. 먼저 플래싱한 이미지의 배포처·파일명·버전·체크섬을 기록한 뒤 해당 이미지의 공식 초기화 절차를 우선합니다.

## 적용 범위와 안전 기준

- 아래 기본 계정은 과거 이미지에서 사용된 사례이며 현재 이미지의 자격 증명을 보장하지 않습니다. 장치를 인터넷에 연결하기 전에 공식 릴리스 노트를 확인합니다.
- 로그인 조합을 반복 대입하지 않습니다. 첫 부팅 완료, 콘솔 출력, DHCP 주소와 SSH 서비스 상태를 순서대로 확인합니다.
- 네트워크 변경 전 기존 연결 프로필과 콘솔 복구 수단을 확보하고, 적용 후 같은 LAN과 원격 경로를 각각 검증합니다.
- SSH 키 오류는 공개 키, 개인 키, 형식, 권한과 로그를 분리해 진단하며 개인 키 내용을 출력하거나 전송하지 않습니다.

## 절차 A: 이미지별 초기 로그인 확인

## 기본 로그인 정보

다음 값은 역사적 예시입니다. 현재 이미지가 첫 로그인에서 암호 변경이나 사용자 생성을 요구할 수 있으므로 배포처 문서와 콘솔 메시지가 우선합니다.

### 우분투 이미지 (FriendlyElec 공식)
- **사용자명**: root
- **비밀번호**: fa

### Armbian 이미지
- **사용자명**: root
- **비밀번호**: 1234

### DietPi 이미지
- **사용자명**: root
- **비밀번호**: dietpi

### 일반 우분투 이미지
- **사용자명**: ubuntu
- **비밀번호**: ubuntu

## 로그인 문제 해결 방법

### 1. 초기 부팅 대기

첫 부팅 시에는 시스템 초기화(cloud-init + SSH 키 생성) 작업이 완료될 때까지 기다려야 합니다. 이 과정에서는 로그인 화면이 표시되더라도 실제로 로그인이 불가능할 수 있습니다. 이 작업은 NanoPi Neo3의 사양에, 따라 몇 분 정도 소요될 수 있습니다.

### 2. 네트워크 연결 확인

SSH로 접속을 시도하는 경우, 장치가 네트워크에 제대로 연결되어 있는지 확인해야 합니다. 직접 이더넷 케이블로 컴퓨터와 연결한 경우, 양쪽의 IP 주소가 같은 서브넷에 있어야 합니다.

### 3. 이미지 메타데이터와 콘솔 확인

다운로드한 이미지 이름과 버전, 체크섬, 릴리스 노트를 확인합니다. 문서에 없는 기본 암호나 빈 암호를 반복 시도하지 말고 시리얼 콘솔의 초기화 안내와 인증 실패 로그를 확인합니다.

### 4. 시리얼 콘솔 접속

문제가 지속되면 시리얼 콘솔을 사용합니다. baud rate와 전압 레벨, 핀 배열은 보드 리비전과 이미지의 공식 하드웨어 문서에서 확인한 뒤 연결합니다.

### 5. 이미지 재설치

이미지 식별과 콘솔 진단 후에도 부팅이 실패하면 SD 카드 데이터를 보존한 뒤 검증된 체크섬의 지원 이미지를 다시 플래싱합니다. "최신"이라는 이유만으로 선택하지 말고 보드 리비전 지원 여부를 확인합니다.

## 이미지 설치 방법

1. 이미지 다운로드: FriendlyElec 공식 이미지나 Armbian 이미지를 다운로드합니다.
2. balenaEtcher와 같은 도구를 사용하여 SD 카드에 이미지를 플래싱합니다.
3. SD 카드를 NanoPi Neo3에 삽입하고 전원을 연결합니다.
4. 장치 IP 주소 확인: 라우터 DHCP 목록이나 네트워크 스캔 도구를 사용하여 장치의 IP 주소를 찾습니다.
5. SSH로 연결: 릴리스 노트가 지정한 초기 사용자를 사용해 `ssh <user>@<device-ip>`로 연결합니다.

## SSH 연결 후 첫 설정

성공적으로 로그인한 후에는 다음과 같은 기본 설정을 수행하는 것이 좋습니다:

1. 비밀번호 변경: `passwd` 명령을 사용하여 보안을 위해 기본 비밀번호를 변경합니다.
2. 시스템 업데이트: `sudo apt-get update && sudo apt-get upgrade`를 실행하여 시스템을 업데이트합니다.
3. 타임존 설정: 한국 시간대로 설정하려면 `sudo timedatectl set-timezone Asia/Seoul`을 실행합니다.

로그인 문제가 계속된다면 어떤 이미지를 사용하셨는지, 시도한 로그인 정보는 무엇인지 추가 정보를 주시면 더 구체적인 도움을 드릴 수 있습니다.

---

## 절차 B: NetworkManager 고정 IP 설정

다음 절은 NetworkManager가 실제 renderer인 Ubuntu 계열 이미지를 대상으로 합니다. `systemctl is-active NetworkManager`, `nmcli connection show`, Netplan renderer를 확인하고 다른 네트워크 관리자를 쓰는 이미지에는 적용하지 않습니다.

### 1. NetworkManager 서비스 개요
NetworkManager는 현대 리눅스 배포판에서 표준으로 채택된 네트워크 구성 관리 도구로, 유선/무선 네트워크 관리, 자동 연결 전환, 복잡한 네트워크 프로파일 관리 등의 기능을 제공합니다. NanoPi Neo3의 우분투 이미지 대부분이 기본적으로 NetworkManager를 사용하도록 구성되어 있으며, 이는 `/etc/netplan/` 디렉토리 내 YAML 설정 파일에서 `renderer: NetworkManager`로 확인할 수 있습니다.

```bash
$ cat /etc/netplan/01-network-manager-all.yaml
network:
  version: 2
  renderer: NetworkManager
```

### 2. nmcli를 이용한 CLI 설정
### 2.1 현재 네트워크 연결 상태 확인
```bash
$ nmcli device status
DEVICE  TYPE      STATE      CONNECTION 
eth0    ethernet  connected  Wired connection 1
lo      loopback  unmanaged  --
```

### 2.2 연결 프로파일 수정
```bash
$ sudo nmcli con mod "Wired connection 1" \
  ipv4.addresses 192.168.0.100/24 \
  ipv4.gateway 192.168.0.1 \
  ipv4.dns "8.8.8.8 1.1.1.1" \
  ipv4.method manual
```

### 2.3 변경 사항 적용
```bash
$ sudo nmcli con down "Wired connection 1"
$ sudo nmcli con up "Wired connection 1"
```

### 2.4 설정 검증
```bash
$ ip -4 addr show eth0
2: eth0:  mtu 1500 qdisc mq state UP group default qlen 1000
    inet 192.168.0.100/24 brd 192.168.0.255 scope global eth0
       valid_lft forever preferred_lft forever
```

### 3. nmtui를 활용한 TUI 설정
```bash
$ sudo nmtui
```
1. **Edit a connection** 선택
2. 대상 이더넷 연결 선택
3. IPv4 구성에서 Manual 설정
4. IP 주소/게이트웨이/DNS 입력
5. **OK**로 저장 후 종료

### 4. Netplan과의 연동 구조
NetworkManager를 렌더러로 사용할 경우 Netplan 설정은 단순히 NetworkManager에 구성을 위임합니다. `/etc/netplan/` 디렉토리의 YAML 파일은 다음과 같은 최소 구성을 유지해야 합니다:

```yaml
network:
  version: 2
  renderer: NetworkManager
```

### 5. 고급 구성 시나리오
### 5.1 다중 IP 할당
```bash
$ sudo nmcli con mod "Wired connection 1" \
  +ipv4.addresses 192.168.0.101/24
```

### 5.2 VLAN 구성
```bash
$ sudo nmcli con add type vlan \
  dev eth0 id 10 \
  ip4 192.168.10.100/24 \
  gw4 192.168.10.1
```

### 5.3 Bonding 인터페이스
```bash
$ sudo nmcli con add type bond \
  con-name bond0 \
  bond.options "mode=active-backup,primary=eth0"
```

### 6. 문제 해결 체크리스트
1. **서비스 상태 확인**: `systemctl status NetworkManager`
2. **저장소 동기화**: `nmcli con reload`
3. **로그 분석**: `journalctl -u NetworkManager -f`
4. **DNS 캐시 초기화**: `sudo resolvectl flush-caches`
5. **라우팅 테이블 점검**: `ip route show`

### 7. 성능 측정과 조정
- **MTU 튜닝**: `sudo nmcli con mod "Wired connection 1" 802-3-ethernet.mtu 9000`
- **TCP 버퍼 크기 조정**: 
  ```bash
  $ sudo sysctl -w net.core.rmem_max=16777216
  $ sudo sysctl -w net.core.wmem_max=16777216
  ```
- **IRQ 밸런싱**: `sudo ethtool -X eth0 weight 6 2`

### 8. 보안 강화 방안
1. **MAC 주소 랜덤화**: 
   ```bash
   $ sudo nmcli con mod "Wired connection 1" \
     wifi.cloned-mac-address random
   ```
2. **ARP 필터링 활성화**:
   ```bash
   $ sudo sysctl -w net.ipv4.conf.all.arp_filter=1
   ```
3. **IPv6 비활성화**:
   ```bash
   $ sudo nmcli con mod "Wired connection 1" \
     ipv6.method disabled
   ```

### 9. 자동화 스크립트 예제
```bash
#!/bin/bash
CONN_NAME="Industrial-Net"
IP_ADDR="192.168.10.50/24"
GW_ADDR="192.168.10.1"
DNS_SERVERS="10.10.10.10 10.10.10.20"

nmcli con add type ethernet \
  con-name "$CONN_NAME" \
  ifname eth0 \
  ipv4.method manual \
  ipv4.addresses "$IP_ADDR" \
  ipv4.gateway "$GW_ADDR" \
  ipv4.dns "$DNS_SERVERS" \
  ipv4.dns-search "plant.local" \
  connection.autoconnect yes
```

### 10. 주의사항 및 완료 증거
1. **주소 충돌 방지**: 정적 주소를 DHCP 풀 밖에 두거나 DHCP 예약과 일관되게 관리
2. **이중화 구성 시**: 커널·NetworkManager가 지원하는 bonding 등 후보를 스위치 구성과 함께 검증
3. **업데이트 관리**: `network-manager` 패키지 정기 업데이트
4. **백업 전략**: `/etc/NetworkManager/system-connections/` 디렉토리 정기 백업
5. **모니터링 도구**: `nmtui-connect` 및 `nmtui-hostname` 활용

완료 증거는 재부팅 후 주소·기본 경로·DNS가 의도대로 유지되고, 동일 LAN과 필요한 원격 관리 경로에서 접속되며, 콘솔에서 이전 프로필로 되돌릴 수 있는 상태입니다.


---

## 절차 C: SSH 키와 `error in libcrypto` 진단

이 오류는 클라이언트가 읽는 개인 키의 형식·줄바꿈·암호화·권한 또는 라이브러리 조합에서 발생할 수 있습니다. `.pub` 파일 생성 여부만으로 개인 키의 정상 여부를 확정하지 않습니다.

### 공개 키 사용 시 문제될 수 있는 점
1. **잘못된 키 파일 참조**:
   - SSH 클라이언트가 `.pub` 파일(공개 키)을 잘못 참조하여 인증을 시도할 경우 오류가 발생합니다. 공개 키는 서버의 `~/.ssh/authorized_keys`에 저장되어야 하며, 클라이언트는 **개인 키**를 사용해 인증해야 합니다.

2. **파일 형식 문제**:
   - 공개 키 파일이 손상되었거나 잘못된 형식으로 저장된 경우, 서버에서 인증을 거부할 수 있습니다. `ssh-keygen -l -f ` 명령으로 공개 키의 유효성을 확인할 수 있습니다.

3. **권한 설정 문제**:
   - 공개 키를 서버의 `authorized_keys` 파일에 추가할 때, 해당 파일 및 상위 디렉토리의 권한이 적절하지 않으면 인증이 실패할 수 있습니다. 예를 들어, `~/.ssh/authorized_keys`는 권한이 600이어야 하고, `~/.ssh` 디렉토리는 700이어야 합니다.

4. **libcrypto 관련 버그**:
   - OpenSSL 라이브러리(`libcrypto`)와 관련된 버그로 인해 인증 과정에서 오류가 발생할 수 있습니다. 특히 OpenSSL 버전과 SSH 버전 간 호환성 문제가 있는 경우 이러한 오류가 나타날 수 있습니다.

### 문제 해결 방법
#### 1. 개인 키와 공개 키 역할 확인
- SSH 클라이언트는 개인 키를 사용하여 서버에 연결하며, 서버는 공개 키를 `authorized_keys`에 저장하여 인증합니다.
- 클라이언트 설정에서 `.pub` 파일을 참조하지 않도록 확인합니다:
  ```bash
  ssh -i ~/.ssh/id_rsa <user>@<host>
  ```

#### 2. 공개 키 유효성 확인
- 공개 키 파일이 올바르게 생성되었는지 확인합니다:
  ```bash
  ssh-keygen -l -f ~/.ssh/id_rsa.pub
  ```
- 출력 결과가 정상적으로 표시되면 공개 키는 유효합니다.

#### 3. 권한 설정 수정
- 서버에서 다음 명령으로 권한을 수정합니다:
  ```bash
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  ```

#### 4. OpenSSL 및 SSH 버전 확인
- 재현 정보로 클라이언트와 서버의 OpenSSL 및 OpenSSH 버전을 기록합니다:
  ```bash
  openssl version
  ssh -V
  ```

#### 5. 서버 로그 분석
- 서버에서 인증 실패 원인을 파악하기 위해 로그를 확인합니다:
  ```bash
  tail -f /var/log/auth.log | grep sshd
  ```

#### 추가 진단
- `ssh-keygen -y -f <private-key>`가 공개 키를 파생할 수 있는지 확인하되 개인 키 출력이나 업로드는 하지 않습니다.
- `ssh -vvv` 로그에서 실패가 로컬 키 로딩 단계인지 서버 인증 거부 단계인지 구분합니다. 패키지 재설치는 원인이 손상된 패키지로 확인된 경우에만 수행합니다.
  ```bash
  eval "$(ssh-agent -s)"
  ```

`.pub` 키 자체는 문제가 없더라도, 이와 연관된 개인 키 또는 환경 설정 문제로 인해 인증 실패가 발생할 수 있습니다. 위 단계를 통해 문제를 해결할 수 있을 것입니다.
