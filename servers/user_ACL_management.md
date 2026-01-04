# 사용자별 기본 디렉토리 설정 방법

Linux 시스템에서 사용자별 기본 디렉토리(홈 디렉토리)를 설정하는 다양한 방법을 자세히 설명해 드리겠습니다.

## 새 사용자 생성 시 홈 디렉토리 지정

**useradd 명령어로 홈 디렉토리 지정:**
```bash
sudo useradd -m -d /custom/home/path username
```

여기서:
- `-m`: 홈 디렉토리를 생성합니다
- `-d`: 홈 디렉토리의 경로를 지정합니다

예시:
```bash
sudo useradd -m -d /data/users/john john
```

이 명령은 `/data/users/john` 디렉토리를 생성하고 john 사용자의 홈 디렉토리로 설정합니다.

**adduser 명령어 사용 (Debian/Ubuntu):**
```bash
sudo adduser --home /custom/home/path username
```

이 명령어는 대화형으로 사용자 생성 과정을 안내합니다.

## 기존 사용자의 홈 디렉토리 변경

**홈 디렉토리만 변경 (파일 이동 없음):**
```bash
sudo usermod -d /new/home/path username
```

**홈 디렉토리 변경 및 기존 파일 이동:**
```bash
sudo usermod -m -d /new/home/path username
```

`-m` 옵션은 기존 파일을 새 위치로 이동시킵니다. 파일을 이동하지 않으면 사용자가 로그인 시 빈 홈 디렉토리를 갖게 됩니다.

## 기본 홈 디렉토리 경로 설정

시스템 차원에서 새 사용자의 기본 홈 디렉토리 경로를 변경할 수 있습니다:

**1. /etc/default/useradd 파일 수정:**
```bash
sudo nano /etc/default/useradd
```

다음 줄을 찾아 변경합니다:
```
HOME=/home
```

예를 들어 `/users`로 변경:
```
HOME=/users
```

**2. useradd 기본 설정 변경:**
```bash
sudo useradd -D -b /custom/home
```

이 명령은 기본 홈 디렉토리 베이스 경로를 `/custom/home`으로 변경합니다.

## /etc/passwd 파일을 통한 홈 디렉토리 관리

각 사용자의 홈 디렉토리는 `/etc/passwd` 파일에서 직접 확인하고 관리할 수 있습니다:

```bash
cat /etc/passwd | grep username
```

출력 예시:
```
username:x:1001:1001:User Full Name:/home/username:/bin/bash
```

여기서 `/home/username` 부분이 홈 디렉토리 경로입니다.

**vipw 명령어로 안전하게 수정:**
```bash
sudo vipw
```

이 명령어는 `/etc/passwd` 파일을 안전하게 편집할 수 있게 해줍니다.

## 템플릿 디렉토리 구성

모든 새 사용자는 `/etc/skel` 디렉토리의 내용을 기본으로 홈 디렉토리에 복사받습니다:

**1. 템플릿 수정:**
```bash
sudo ls -la /etc/skel
```

**2. 템플릿에 파일 추가:**
```bash
sudo cp /path/to/template/file /etc/skel/
```

**3. 디렉토리 구조 생성:**
```bash
sudo mkdir -p /etc/skel/Documents /etc/skel/Downloads
```

이렇게 하면 모든 새 사용자가 Documents와 Downloads 디렉토리를 기본으로 갖게 됩니다.

## 홈 디렉토리 권한 및 소유권 설정

홈 디렉토리 생성 후 적절한 권한 설정이 중요합니다:

**소유권 설정:**
```bash
sudo chown -R username:username /home/username
```

**권한 설정:**
```bash
sudo chmod 700 /home/username
```

권한 700은 소유자만 읽기/쓰기/실행이 가능하고 다른 사용자는 접근할 수 없도록 합니다.

## 대량 사용자 생성 시 홈 디렉토리 설정

**CSV 파일을 사용한 대량 사용자 생성 스크립트 예시:**
```bash
#!/bin/bash
while IFS=, read -r username fullname homedir
do
  sudo useradd -m -d "$homedir" -c "$fullname" "$username"
  sudo chown -R "$username":"$username" "$homedir"
  sudo chmod 700 "$homedir"
done < users.csv
```

CSV 파일 형식 예시:
```
john,John Smith,/custom/home/john
jane,Jane Doe,/custom/home/jane
```

## 사용자 홈 디렉토리 쿼터 설정

디스크 쿼터를 설정하여 사용자별 홈 디렉토리 크기를 제한할 수 있습니다:

**1. 쿼터 패키지 설치:**
```bash
sudo apt-get install quota
```

**2. /etc/fstab 파일 수정:**
```
/dev/sda1 /home ext4 defaults,usrquota,grpquota 0 1
```

**3. 파일시스템 다시 마운트:**
```bash
sudo mount -o remount /home
```

**4. 쿼터 데이터베이스 초기화:**
```bash
sudo quotacheck -cum /home
```

**5. 사용자별 쿼터 설정:**
```bash
sudo setquota -u username 5G 6G 0 0 /home
```

이 명령은 username 사용자의 소프트 한도를 5GB, 하드 한도를 6GB로 설정합니다.

# Linux SSH 및 PAM 구성 가이드

SSH(Secure Shell)는 리눅스 서버 관리에 가장 널리 사용되는 원격 접속 도구입니다. 이 가이드에서는 SSH 접속 명령어, PAM 설정, 사용자별 디렉토리 구성 및 보안 설정에 대해 자세히 설명드리겠습니다.

## SSH 접속 명령어 및 옵션

**기본 SSH 접속 명령어:**

```bash
ssh username@hostname
```

예를 들어, `example.com` 서버에 `john` 사용자로 접속하려면:
```bash
ssh john@example.com
```

**포트 지정 접속:**
```bash
ssh -p 포트번호 username@hostname
```

기본적으로 SSH는 22번 포트를 사용하지만, 서버가 다른 포트를 사용하는 경우 `-p` 옵션으로 지정할 수 있습니다[4].
```bash
ssh -p 2222 john@example.com
```

**원격 명령어 실행:**
```bash
ssh username@hostname 명령어
```

원격 서버에 접속하여 바로 명령어를 실행하고 싶을 때 사용합니다[4].
```bash
ssh john@example.com ls
```

**추가 옵션 지정:**
```bash
ssh -o "옵션=값" username@hostname
```

여러 옵션을 지정할 수 있습니다[6].
```bash
ssh -o "User=apollo" -o "Port=4567" -o "HostName=example.com"
```

## SSH 설정 파일 구성

### 클라이언트 설정 파일

사용자별 SSH 설정 파일 위치: `~/.ssh/config`

이 파일에서 호스트별로 다양한 연결 옵션을 지정할 수 있습니다[6].

**설정 파일 예시:**
```
Host dev
    HostName dev.example.com
    User john
    Port 2322
```

위와 같이 설정하면 `ssh dev` 명령어만으로 복잡한 연결 정보를 간편하게 사용할 수 있습니다[10].

**설정 파일 구조:**

```
Host 별칭
    옵션1 값1
    옵션2 값2
```

호스트 설정은 가장 구체적인 설정이 먼저 오고, 그 다음에 일반적인 설정이 와야 합니다[6].

**설정 파일 무시하기:**
```bash
ssh -F /dev/null user@example.com
```

설정 파일에 지정된 모든 옵션을 무시하고 접속할 때 사용합니다[10].

### 서버 SSH 설정 파일

서버 설정 파일 위치: `/etc/ssh/sshd_config`

**SSH 포트 변경:**
```
Port 8088
```

변경 후 서비스 재시작이 필요합니다[3].
```bash
systemctl restart sshd
```

## 사용자별 기본 디렉토리 설정

### 새 사용자 생성 시 홈 디렉토리 지정

```bash
sudo useradd -m -d /home/newowner homeowner
```

`-m` 옵션은 홈 디렉토리를 생성하고, `-d` 옵션은 디렉토리 경로를 지정합니다[5][9].

### 기존 사용자의 홈 디렉토리 변경

```bash
sudo usermod -d /usr/baeldung baeldung
```

이 명령어는 사용자의 홈 디렉토리 경로만 변경하고 파일은 이동하지 않습니다[9].

### 기존 파일을 새 홈 디렉토리로 이동

```bash
sudo usermod -m -d /usr/baeldung baeldung
```

`-m` 옵션을 추가하면 기존 파일들이 새 홈 디렉토리로 이동됩니다[9].

### 홈 디렉토리 권한 설정

```bash
sudo chown -R homeowner:homeowner /home/newowner
```

새 홈 디렉토리에 대한 소유권을 사용자에게 부여합니다[5].

## PAM(Pluggable Authentication Modules) 설정

PAM은 리눅스에서 인증을 관리하는 중요한 프레임워크입니다.

### PAM 설정 파일 위치

SSH PAM 설정 파일: `/etc/pam.d/sshd`[1][2]

### PAM 설정 구조

PAM 설정은 일반적으로 네 가지 모듈 유형으로 구성됩니다[2]:
- `auth`: 사용자 인증 처리
- `account`: 계정 유효성 검사
- `password`: 비밀번호 변경 관련
- `session`: 세션 설정 및 관리

**기본 PAM 구성 예시:**
```
auth    required    pam_unix2.so
auth    required    pam_nologin.so
auth    required    pam_env.so
account required    pam_unix2.so
account required    pam_nologin.so
```

### 다중 인증(MFA) 설정

Google Authenticator를 사용한 OTP 설정 예시[1]:
```
auth required pam_google_authenticator.so nullok
```

`nullok` 옵션은 설정되지 않은 사용자도 로그인할 수 있게 해줍니다[1].

### root 사용자 SSH 접근 제한

```
auth required pam_listfile.so onerr=succeed item=user sense=deny file=/etc/ssh/deniedusers
```

이 설정은 특정 사용자(위 예시에서는 `/etc/ssh/deniedusers` 파일에 나열된 사용자)의 접근을 거부합니다[8].

## SSH 보안 설정

### 사용자 접근 제어

**특정 사용자만 SSH 접속 허용:**
```
AllowUsers user1 user2
```

`/etc/ssh/sshd_config` 파일에 추가하여 지정된 사용자만 SSH 접속을 허용합니다[7][11].

**그룹별 SSH 접속 허용:**
```
AllowGroups sshusers
```

특정 그룹의 모든 멤버에게 SSH 접속을 허용합니다[7][13].

**사용자 그룹 생성 및 관리:**
```bash
# SSH 사용자 그룹 생성
groupadd -r sshusers

# 사용자를 그룹에 추가
usermod -a -G sshusers user1
```

### SSH 보안 강화 설정

**root 로그인 비활성화:**
```
PermitRootLogin no
```

root 계정으로의 직접 SSH 접속을 차단합니다[12].

**SSH 프로토콜 1 비활성화:**
```
Protocol 2
```

더 안전한 SSH 프로토콜 2만 사용하도록 설정합니다[12].

**호스트 기반 인증 비활성화:**
```
HostBasedAuthentication no
IgnoreRHosts yes
```

호스트 기반 인증 대신 키 기반 인증을 사용하도록 설정합니다[12].

**인증 방식 설정:**
```
AuthenticationMethods publickey,keyboard-interactive password,keyboard-interactive
```

사용자가 공개키 인증과 OTP를 모두 사용하거나, 비밀번호와 OTP를 모두 사용하도록 설정할 수 있습니다[1].

