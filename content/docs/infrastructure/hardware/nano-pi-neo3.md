# NanoPi Neo3 우분투 설치 후 로그인 방법 가이드

우분투를 NanoPi Neo3에 설치한 후 로그인 문제를 겪고 계신 것 같습니다. 검색 결과를 분석한 결과, OS 이미지 종류와 버전에 따라 기본 로그인 정보가 다르다는 것을 알 수 있었습니다.

## 기본 로그인 정보

NanoPi Neo3에 사용되는 OS별 기본 로그인 정보는 다음과 같습니다:

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

### 3. 다양한 로그인 조합 시도

다음과 같은 일반적인 조합을 시도해 보세요:
- root / fa
- root / 1234
- ubuntu / ubuntu
- dietpi / dietpi
- root / (비밀번호 없음)

### 4. 시리얼 콘솔 접속

문제가 지속된다면 시리얼 콘솔을 통해 접속을 시도할 수 있습니다. NanoPi Neo3의 시리얼 디버그 포트는 기본적으로 1500000bps 속도로 설정되어 있습니다.

### 5. 이미지 재설치

모든 방법이 실패할 경우, SD 카드를 다시 포맷하고 이미지를 새로 설치하는 것도 고려해 볼 수 있습니다. FriendlyElec 공식 이미지나 최신 Armbian 이미지를 사용하시는 것이 좋습니다.

## 이미지 설치 방법

1. 이미지 다운로드: FriendlyElec 공식 이미지나 Armbian 이미지를 다운로드합니다.
2. balenaEtcher와 같은 도구를 사용하여 SD 카드에 이미지를 플래싱합니다.
3. SD 카드를 NanoPi Neo3에 삽입하고 전원을 연결합니다.
4. 장치 IP 주소 확인: 라우터 DHCP 목록이나 네트워크 스캔 도구를 사용하여 장치의 IP 주소를 찾습니다.
5. SSH로 연결: `ssh root@IP주소` 명령을 사용하여 연결(FriendlyElec 이미지의 경우 비밀번호는 'fa'입니다).

## SSH 연결 후 첫 설정

성공적으로 로그인한 후에는 다음과 같은 기본 설정을 수행하는 것이 좋습니다:

1. 비밀번호 변경: `passwd` 명령을 사용하여 보안을 위해 기본 비밀번호를 변경합니다.
2. 시스템 업데이트: `sudo apt-get update && sudo apt-get upgrade`를 실행하여 시스템을 업데이트합니다.
3. 타임존 설정: 한국 시간대로 설정하려면 `sudo timedatectl set-timezone Asia/Seoul`을 실행합니다.

로그인 문제가 계속된다면 어떤 이미지를 사용하셨는지, 시도한 로그인 정보는 무엇인지 추가 정보를 주시면 더 구체적인 도움을 드릴 수 있습니다.

--

# NanoPi Neo3 우분투 고정 IP 설정: NetworkManager를 활용한 체계적인 가이드

NanoPi Neo3에 우분투를 설치한 후 NetworkManager 서비스를 통해 고정 IP를 설정하는 방법에 대해 체계적으로 분석합니다. 본 가이드는 2025년 4월 기준 최신 네트워크 관리 방식을 반영하며, CLI와 TUI 환경에서의 설정 방법을 상세히 설명합니다.

## 1. NetworkManager 서비스 개요
NetworkManager는 현대 리눅스 배포판에서 표준으로 채택된 네트워크 구성 관리 도구로, 유선/무선 네트워크 관리, 자동 연결 전환, 복잡한 네트워크 프로파일 관리 등의 기능을 제공합니다. NanoPi Neo3의 우분투 이미지 대부분이 기본적으로 NetworkManager를 사용하도록 구성되어 있으며, 이는 `/etc/netplan/` 디렉토리 내 YAML 설정 파일에서 `renderer: NetworkManager`로 확인할 수 있습니다.

```bash
$ cat /etc/netplan/01-network-manager-all.yaml
network:
  version: 2
  renderer: NetworkManager
```

## 2. nmcli를 이용한 CLI 설정
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

## 3. nmtui를 활용한 TUI 설정
```bash
$ sudo nmtui
```
1. **Edit a connection** 선택
2. 대상 이더넷 연결 선택
3. IPv4 구성에서 Manual 설정
4. IP 주소/게이트웨이/DNS 입력
5. **OK**로 저장 후 종료

## 4. Netplan과의 연동 구조
NetworkManager를 렌더러로 사용할 경우 Netplan 설정은 단순히 NetworkManager에 구성을 위임합니다. `/etc/netplan/` 디렉토리의 YAML 파일은 다음과 같은 최소 구성을 유지해야 합니다:

```yaml
network:
  version: 2
  renderer: NetworkManager
```

## 5. 고급 구성 시나리오
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

## 6. 문제 해결 체크리스트
1. **서비스 상태 확인**: `systemctl status NetworkManager`
2. **저장소 동기화**: `nmcli con reload`
3. **로그 분석**: `journalctl -u NetworkManager -f`
4. **DNS 캐시 초기화**: `sudo resolvectl flush-caches`
5. **라우팅 테이블 점검**: `ip route show`

## 7. 성능 최적화 기법
- **MTU 튜닝**: `sudo nmcli con mod "Wired connection 1" 802-3-ethernet.mtu 9000`
- **TCP 버퍼 크기 조정**: 
  ```bash
  $ sudo sysctl -w net.core.rmem_max=16777216
  $ sudo sysctl -w net.core.wmem_max=16777216
  ```
- **IRQ 밸런싱**: `sudo ethtool -X eth0 weight 6 2`

## 8. 보안 강화 방안
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

## 9. 자동화 스크립트 예제
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

## 10. 주의사항 및 모범 사례
1. **DHCP 예약 충돌 방지**: 라우터 측에서 IP 주소 예약 설정 필수
2. **이중화 구성 시**: bonding 대신 teamd 사용 권장
3. **업데이트 관리**: `network-manager` 패키지 정기 업데이트
4. **백업 전략**: `/etc/NetworkManager/system-connections/` 디렉토리 정기 백업
5. **모니터링 도구**: `nmtui-connect` 및 `nmtui-hostname` 활용

본 가이드에서 제시한 방법론은 NanoPi Neo3의 하드웨어 특성과 우분투 24.04 LTS의 네트워크 스택을 고려하여 최적화되었습니다. 실제 환경 적용 전 테스트 베드에서의 검증을 권장하며, 특히 산업용 제어 환경에서는 네트워크 구성 변경 시 다운타임 계획 수립이 필수적입니다.


--

`error in libcrypto` 오류가 발생하는 상황에서 `.pub` 키가 생성되었다면, 해당 공개 키를 사용할 때 문제가 될 가능성은 낮습니다. 그러나 몇 가지 확인해야 할 사항이 있습니다.

## **공개 키 사용 시 문제될 수 있는 점**
1. **잘못된 키 파일 참조**:
   - SSH 클라이언트가 `.pub` 파일(공개 키)을 잘못 참조하여 인증을 시도할 경우 오류가 발생합니다. 공개 키는 서버의 `~/.ssh/authorized_keys`에 저장되어야 하며, 클라이언트는 **개인 키**를 사용해 인증해야 합니다.

2. **파일 형식 문제**:
   - 공개 키 파일이 손상되었거나 잘못된 형식으로 저장된 경우, 서버에서 인증을 거부할 수 있습니다. `ssh-keygen -l -f ` 명령으로 공개 키의 유효성을 확인할 수 있습니다.

3. **권한 설정 문제**:
   - 공개 키를 서버의 `authorized_keys` 파일에 추가할 때, 해당 파일 및 상위 디렉토리의 권한이 적절하지 않으면 인증이 실패할 수 있습니다. 예를 들어, `~/.ssh/authorized_keys`는 권한이 600이어야 하고, `~/.ssh` 디렉토리는 700이어야 합니다.

4. **libcrypto 관련 버그**:
   - OpenSSL 라이브러리(`libcrypto`)와 관련된 버그로 인해 인증 과정에서 오류가 발생할 수 있습니다. 특히 OpenSSL 버전과 SSH 버전 간 호환성 문제가 있는 경우 이러한 오류가 나타날 수 있습니다.

## **문제 해결 방법**
### 1. 개인 키와 공개 키 역할 확인
- SSH 클라이언트는 개인 키를 사용하여 서버에 연결하며, 서버는 공개 키를 `authorized_keys`에 저장하여 인증합니다.
- 클라이언트 설정에서 `.pub` 파일을 참조하지 않도록 확인합니다:
  ```bash
  ssh -i ~/.ssh/id_rsa @
  ```

### 2. 공개 키 유효성 확인
- 공개 키 파일이 올바르게 생성되었는지 확인합니다:
  ```bash
  ssh-keygen -l -f ~/.ssh/id_rsa.pub
  ```
- 출력 결과가 정상적으로 표시되면 공개 키는 유효합니다.

### 3. 권한 설정 수정
- 서버에서 다음 명령으로 권한을 수정합니다:
  ```bash
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  ```

### 4. OpenSSL 및 SSH 버전 확인
- 서버와 클라이언트 모두 최신 버전의 OpenSSL 및 OpenSSH를 사용하는지 확인합니다:
  ```bash
  openssl version
  ssh -V
  ```

### 5. 서버 로그 분석
- 서버에서 인증 실패 원인을 파악하기 위해 로그를 확인합니다:
  ```bash
  tail -f /var/log/auth.log | grep sshd
  ```

### 추가 팁: libcrypto 오류 회피
- 개인 키 파일 형식이 PEM 또는 DER로 저장되어야 하며, 암호화된 개인 키를 사용하는 경우 비밀번호를 제공해야 합니다.
- 문제가 지속된다면 SSH 에이전트를 재시작하거나 OpenSSL 라이브러리를 재설치합니다:
  ```bash
  eval "$(ssh-agent -s)"
  sudo apt-get install --reinstall openssl
  ```

`.pub` 키 자체는 문제가 없더라도, 이와 연관된 개인 키 또는 환경 설정 문제로 인해 인증 실패가 발생할 수 있습니다. 위 단계를 통해 문제를 해결할 수 있을 것입니다.

