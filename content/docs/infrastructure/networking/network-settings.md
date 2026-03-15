# NetworkManager를 사용한 Static IP 설정 방법

NetworkManager는 RHEL 7부터 도입된 네트워크를 모니터링하고 관리하는 데몬으로, 네트워크의 변경 사항을 탐지하고 설정해주는 역할을 수행합니다[1]. 다양한 리눅스 배포판에서 네트워크 관리를 위해 사용됩니다. 여기서는 NetworkManager를 통해 고정 IP(static IP)를 설정하는 다양한 방법을 알아보겠습니다.

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

Ubuntu 18.04부터는 netplan을 사용하여 네트워크를 설정합니다:

1. 이더넷 이름 확인: `ifconfig -a`
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
      gateway4: 192.168.59.1  # 게이트웨이 주소
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
2. 설정 후 네트워크를 재시작하거나 시스템을 재부팅해야 변경사항이 적용될 수 있습니다[3].
3. Ubuntu의 netplan 설정 파일에서는 띄어쓰기와 문장 간격이 매우 중요하므로 주의해야 합니다[7].

이 방법들을 사용하면 NetworkManager를 통해 리눅스 시스템에서 고정 IP를 설정할 수 있습니다.