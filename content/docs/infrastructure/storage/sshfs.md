# 우분투 24.04 LTS에서 원격 디렉토리 마운팅 설정하기

Ubuntu 24.04 LTS에서 SSHFS 또는 NFS로 원격 디렉터리를 마운트하는 예시입니다. 패키지·FUSE·OpenSSH·NFS 버전과 서버 정책을 확인하고 네트워크 단절·캐시 의미를 허용하는 워크로드에만 사용하세요. 데이터베이스나 VM 디스크는 별도 지원 여부가 필요합니다.

## SSHFS를 이용한 원격 디렉토리 마운팅

SSHFS는 SSH의 SFTP 기능과 로컬 FUSE를 사용합니다. SSH 로그인만으로 충분하지 않으며 서버 SFTP subsystem, 사용자 권한, FUSE 정책이 허용되어야 합니다. `allow_other`는 `user_allow_other`와 로컬 접근 범위를 함께 검토합니다.

### 설치 및 기본 설정

1. **SSHFS 패키지 설치**:
   ```
   sudo apt install sshfs
   ```

2. **마운트 포인트 생성**:
   ```
   sudo mkdir -p /mnt/external/rasp
   ```

3. **기본 마운팅 명령**:
   ```
   sshfs 사용자명@원격서버주소:/원격/디렉토리/경로 /mnt/external/rasp
   ```

### 부팅 시 자동 마운팅 설정

#### 방법 1: /etc/fstab 사용

1. fstab 파일 편집:
   ```
   sudo nano /etc/fstab
   ```

2. 다음 내용 추가:
   ```
   사용자명@원격서버주소:/원격/디렉토리 /mnt/external/rasp fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/사용자/.ssh/id_rsa,allow_other,default_permissions 0 0
   ```
   
이 설정은 부팅 시 자동으로 네트워크가 연결된 후에 원격 디렉토리를 마운트합니다[2].

#### 방법 2: AutoFS 사용

1. AutoFS 설치:
   ```
   sudo apt install autofs
   ```

2. `/etc/auto.master` 파일 편집:
   ```
   sudo nano /etc/auto.master
   ```
   
   다음 줄 추가:
   ```
   /- /etc/auto.sshfs --timeout=30
   ```

3. `/etc/auto.sshfs` 파일 생성 및 편집:
   ```
   sudo nano /etc/auto.sshfs
   ```
   
   다음 내용 추가:
   ```
   /mnt/external/rasp -fstype=fuse,allow_other,IdentityFile=/home/사용자/.ssh/id_rsa :sshfs\#사용자명@원격서버주소\:/원격/디렉토리
   ```

4. AutoFS 서비스 시작:
   ```
   sudo service autofs restart
   ```

AutoFS는 디렉토리에 접근할 때만 마운트를 활성화하므로 시스템 리소스를 절약할 수 있습니다[4].

### SSH 키 인증 설정 (비밀번호 없이 연결)

1. SSH 키 생성:
   ```
   ssh-keygen -t rsa
   ```

2. 공개 키를 원격 서버에 복사:
   ```
   ssh-copy-id -i ~/.ssh/id_rsa.pub 사용자명@원격서버주소
   ```

이 설정을 통해 비밀번호 없이 원격 서버에 연결할 수 있습니다[4].

## NFS를 이용한 원격 디렉토리 마운팅

NFS(Network File System)는 네트워크를 통해 디렉토리를 공유하는 프로토콜입니다. SSHFS보다 설정이 복잡하지만 성능이 더 좋을 수 있습니다.

### 원격 서버(NFS 서버) 설정

1. NFS 서버 패키지 설치:
   ```
   sudo apt install nfs-kernel-server -y
   ```

2. 공유 디렉토리 생성 및 권한 설정:
   ```
   sudo mkdir -p /mnt/nfs_share
   sudo chown <service-user>:<service-group> /mnt/nfs_share
   sudo chmod 0750 /mnt/nfs_share
   ```

3. `/etc/exports` 파일 편집:
   ```
   sudo nano /etc/exports
   ```
   
   다음 내용 추가:
   ```
   /mnt/nfs_share 클라이언트IP(rw,sync,no_subtree_check)
   ```

4. 공유 디렉토리 내보내기 및 서버 재시작:
   ```
   sudo exportfs -a
   sudo systemctl restart nfs-kernel-server
   ```

5. 방화벽 설정:
   ```
   sudo ufw allow from [클라이언트IP] to any port nfs
   ```

### 클라이언트(우분투 24.04) 설정

1. NFS 클라이언트 패키지 설치:
   ```
   sudo apt install nfs-common
   ```

2. 마운트 포인트 생성:
   ```
   sudo mkdir -p /mnt/external/rasp
   ```

3. 임시 마운트:
   ```
   sudo mount 서버IP:/mnt/nfs_share /mnt/external/rasp
   ```

4. 부팅 시 자동 마운트 설정 (/etc/fstab 편집):
   ```
   sudo nano /etc/fstab
   ```
   
   다음 내용 추가:
   ```
   서버IP:/mnt/nfs_share /mnt/external/rasp nfs defaults 0 0
   ```

NFS가 더 높은 처리량을 보일 수 있지만 파일 크기, RTT, 암호화, 캐시, NFS 버전과 스토리지에 따라 달라집니다. 동일 부하로 측정하고 export 제한, ID mapping, root squashing을 검토합니다.

## 마운트 확인

마운트가 성공적으로 이루어졌는지 확인하려면 다음 명령을 사용하세요:
```
df -h
```

`df` 목록만으로 읽기·쓰기 성공을 증명할 수 없습니다. `findmnt`와 서비스 계정의 테스트 파일, 원격 측 확인, 연결 단절 후 복구를 시험합니다.

적절한 설정을 통해 원격 서버의 디렉토리를 로컬 시스템의 `/mnt/external/rasp`와 같은 경로에 마운트하여 로컬 디렉토리처럼 사용할 수 있습니다.


---

### trouble-shooting

---

# fstab에서 SSHFS 마운트 오류 해결하기

## 문제 분석

오류 메시지 "fuse -o \ ~~ 알 수 없는 옵션입니다"는 `/etc/fstab` 파일의 구문에 문제가 있음을 나타냅니다. 주된 문제점은 다음과 같습니다:

1. **백슬래시(`\`) 사용**: fstab은 각 마운트 항목이 한 줄에 완전히 작성되어야 합니다. 백슬래시를 사용한 줄바꿈은 쉘 스크립트에서는 작동하지만 fstab에서는 지원되지 않습니다.

2. **주석 위치**: 각 항목 사이에 `#`로 시작하는 주석은 별도의 줄에 있어야 합니다.

## 해결 방법

### 1. fstab 파일 형식 수정

다음과 같이 fstab 파일을 수정하세요:

```
# nano_pi
sshfs#nodove@nano_pi:/mnt/share/nodove /mnt/external/nano_pi fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions 0 0

# rasp
sshfs#nodove@rasp:/mnt/drive /mnt/external/rasp/ssh fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/rasp_rsa,allow_other,default_permissions 0 0

# jcloud
sshfs#nodove@jcloud:/workspace /mnt/external/jcloud fuse.sshfs noauto,x-systemd.automount,_netdev,reconnect,identityfile=/home/nodove/.ssh/jcloud_rsa,allow_other,default_permissions 0 0
```

주요 변경사항:
- 백슬래시(`\`)와 줄바꿈 제거
- `fuse` → `fuse.sshfs`로 타입 변경 (더 명확한 인식을 위해)

### 2. 필수 사항 확인

수정 후에도 문제가 지속된다면 다음 사항을 확인하세요:

1. **필요한 디렉토리 생성**:
   ```
   sudo mkdir -p /mnt/external/nano_pi
   sudo mkdir -p /mnt/external/rasp/ssh
   sudo mkdir -p /mnt/external/jcloud
   ```

2. **SSHFS 패키지 설치 확인**:
   ```
   sudo apt install sshfs
   ```

3. **SSH 키 파일 권한 설정**:
   ```
   chmod 600 ~/.ssh/nano_rsa
   chmod 600 ~/.ssh/rasp_rsa
   chmod 600 ~/.ssh/jcloud_rsa
   ```

### 3. 개별 마운트 테스트

각 연결을 개별적으로 테스트하여 정확한 오류 지점을 파악할 수 있습니다:

```
sudo sshfs -o identityfile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions nodove@nano_pi:/mnt/share/nodove /mnt/external/nano_pi
```

이 방법으로 테스트하면 어떤 연결에 문제가 있는지 확인할 수 있습니다.

### 4. systemd 마운트 유닛 사용 (대안)

fstab 대신 systemd 마운트 유닛을 사용하는 방법도 있습니다:

1. `/etc/systemd/system/mnt-external-nano_pi.mount` 파일 생성:
   ```
   [Unit]
   Description=Mount SSHFS nano_pi
   After=network-online.target
   Wants=network-online.target

   [Mount]
   What=nodove@nano_pi:/mnt/share/nodove
   Where=/mnt/external/nano_pi
   Type=fuse.sshfs
   Options=_netdev,reconnect,identityfile=/home/nodove/.ssh/nano_rsa,allow_other,default_permissions
   
   [Install]
   WantedBy=multi-user.target
   ```

2. 각 서버마다 비슷한 파일을 생성하고 활성화:
   ```
   sudo systemctl enable --now mnt-external-nano_pi.mount
   ```

systemd 단위는 의존성과 journal을 명시할 수 있지만 원격 준비 상태를 자동 보장하지 않습니다.

## 완료 및 롤백 기준

SSH/SFTP 또는 NFS export 접근, `findmnt`의 소스·타입·옵션, 서비스 계정 읽기·쓰기, 단절 중 오류와 재연결 뒤 일관성을 확인합니다. 자동 마운트는 재부팅 후 첫 접근 제한 시간도 시험합니다. 실패하면 해당 단위를 중지하고 fstab/AutoFS 항목을 복원한 뒤 사용 프로세스를 확인하고 안전하게 unmount합니다.
