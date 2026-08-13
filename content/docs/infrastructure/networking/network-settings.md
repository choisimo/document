# NetworkManager를 사용한 Static IP 설정 방법

NetworkManager가 실제 렌더러인 Linux 호스트에서 고정 IPv4 주소를 설정하는 방법입니다. RHEL 7 계열부터 기본 관리자로 널리 쓰였지만 Ubuntu의 netplan은 NetworkManager 또는 `systemd-networkd`를 선택할 수 있습니다.

!!! danger "원격 변경 전제"
    주소·게이트웨이 변경은 현재 SSH 경로를 끊을 수 있습니다. 콘솔이나 별도 관리망, 이전 프로파일, 주소 충돌 검사, 자동 롤백 수단을 확보하고 설치된 NetworkManager/netplan 버전을 기록하세요.

## nmcli를 이용한 고정 IP 설정

nmcli는 NetworkManager의 명령줄 도구로, 다음과 같이 사용할 수 있습니다:

**1. 네트워크 인터페이스 확인**
```
nmcli con show
```
이 명령어를 통해 사용 가능한 네트워크 연결 목록을 확인할 수 있습니다[4].

**2. 네트워크 연결 수정하기**
```
nmcli con mod "네트워크 이름" ipv4.method manual ipv4.addresses "IP주소/넷마스크" ipv4.gateway "게이트웨이 주소" ipv4.dns "DNS 서버 주소"
```
예:
```
nmcli con mod "Wired connection 1" ipv4.method manual ipv4.addresses 192.168.1.10/24 ipv4.gateway 192.168.1.1 ipv4.dns 8.8.8.8
```
이 명령어는 기존 연결을 고정 IP로 수정합니다[3][4][6].

**3. 변경된 설정 적용**
```
nmcli con up "네트워크 이름"
```
이 명령으로 변경된 설정을 적용합니다[4].

## nmtui를 이용한 고정 IP 설정

nmtui는 터미널에서 제공하는 텍스트 기반 GUI 도구입니다:

**1. nmtui 실행**
```
nmtui
```
이 명령어를 입력하면 네트워크 관리를 위한 텍스트 기반 인터페이스가 표시됩니다[4].

**2. 네트워크 연결 편집**
- "Edit a connection" 선택
- 목록에서 수정할 네트워크 인터페이스 선택
- "Edit" 버튼을 통해 편집 모드 진입
- IPv4 CONFIGURATION을 "Automatic"에서 "Manual"로 변경
- 고정 IP 주소, 게이트웨이, DNS 서버 등을 입력[4]

**3. 변경사항 적용**
- 설정 완료 후 최초 화면으로 돌아가기
- "Activate a connection"에서 수정한 인터페이스 선택
- 이미 활성화되어 있을 경우 비활성화 후 다시 활성화[4]

## 배포판별 특이사항

### Ubuntu 18.04 이상

Ubuntu 18.04 이후 설치에서는 netplan 구성이 일반적이지만 실제 렌더러와 파일명은 이미지·설치 방식에 따라 다릅니다:

1. 인터페이스와 실제 관리자를 확인: `ip link`, `networkctl status`, `nmcli device status`
2. netplan 설정 파일 수정:
```
sudo nano /etc/netplan/01-network-manager-all.yaml
```

3. YAML 파일을 다음과 같이 수정:
```yaml
network:
  version: 2
  renderer: NetworkManager
  ethernets:
    ens33:  # 네트워크 인터페이스 이름
      dhcp4: no
      addresses: [192.168.59.100/24]  # 고정 IP 주소/서브넷 마스크
      routes:
        - to: default
          via: 192.168.59.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]  # DNS 서버
```

4. 변경사항 적용:
```
sudo netplan apply
```


### Rocky Linux/CentOS 8 이상

Rocky Linux에서는 NetworkManager를 사용하며, nmcli 또는 nmtui를 통해 설정할 수 있습니다. 기존 CentOS 7에서 사용하던 network-scripts는 더 이상 사용되지 않습니다[4].

### Clear Linux

Clear Linux에서는 NetworkManager나 systemd-networkd 중 하나를 사용하여 네트워크를 관리합니다:

1. 어떤 서비스가 네트워크 인터페이스를 관리하는지 확인:
```
nmcli device
networkctl list
```

2. NetworkManager가 관리하는 경우, 위에서 설명한 nmcli 방법을 사용합니다[6].

## 주의사항

1. IP 주소를 할당하지 않고 ipv4.method를 manual로 변경하면 에러가 발생합니다[1].
2. 활성 연결을 다시 올리면 대개 적용되며, 재부팅은 일반적인 첫 조치가 아닙니다. 원격 시스템에서는 전체 네트워크 서비스 재시작을 피하세요.
3. Ubuntu의 netplan 설정 파일에서는 띄어쓰기와 문장 간격이 매우 중요하므로 주의해야 합니다[7].

이 방법들을 사용하면 NetworkManager를 통해 리눅스 시스템에서 고정 IP를 설정할 수 있습니다.
## 완료 및 롤백 증거

`ip address`, `ip route`, `resolvectl status` 또는 `nmcli device show`로 적용값을 확인하고 게이트웨이, DNS, 관리 엔드포인트를 각각 시험합니다. 재부팅 후에도 같은 프로파일과 경로가 유지되어야 완료입니다. 실패하면 콘솔에서 이전 프로파일이나 백업한 netplan 파일을 복원합니다.
