# SSH Match 지시어 활용 예시 및 설명

SSH 서버 구성 파일(sshd_config)의 Match 지시어는 특정 조건에 따라 다양한 SSH 설정을 적용할 수 있게 해주는 강력한 기능입니다. 여러 상황에 맞게 활용할 수 있는 다양한 예시들을 살펴보겠습니다.

## 예시 1: SFTP 전용 사용자 설정

```
Match User sftp_user
    ChrootDirectory /home/sftp_user
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
    PasswordAuthentication no
    PubkeyAuthentication yes
```

이 설정은 'sftp_user'라는 사용자에게만 적용되는 규칙으로, 사용자를 SFTP 전용 계정으로 제한합니다[1][3]. 사용자는 지정된 디렉토리(/home/sftp_user)에 격리(chroot)되며, 일반 SSH 셸 접근이 불가능하고 SFTP 작업만 허용됩니다. 또한 비밀번호 인증을 비활성화하고 공개키 인증만 허용하여 보안을 강화합니다.

## 예시 2: 특정 IP 범위에서의 관리자 접근 허용

```
Match User adminuser Address 10.10.10.5
    PermitRootLogin yes
    AllowTcpForwarding yes
    X11Forwarding yes
    PasswordAuthentication no
```

이 설정은 'adminuser'가 특정 IP 주소(10.10.10.5)에서 접속할 때만 root 로그인 및 추가 기능을 허용합니다[1][2]. 이는 관리자 작업을 특정 신뢰할 수 있는 위치로 제한함으로써 보안을 강화합니다. 지정된 IP에서만 확장된 기능을 사용할 수 있어 관리 작업의 효율성과 보안의 균형을 맞출 수 있습니다.

## 예시 3: 그룹 및 네트워크 기반 SFTP 접근 제어

```
Match Group sftpusers Address 192.168.1.0/24
    ChrootDirectory /data/sftp
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
    Banner /etc/ssh/sftp-welcome.txt
```

이 예시는 'sftpusers' 그룹에 속한 사용자가 특정 네트워크(192.168.1.0/24)에서 접속할 때만 적용됩니다[3]. 이 설정은 그룹 멤버십과 클라이언트 IP 주소라는 두 가지 조건이 모두 충족될 때만 활성화되며, SFTP 접근만 허용하고 기타 SSH 기능은 제한합니다. 또한 접속 시 환영 메시지를 표시하는 Banner 설정도 포함됩니다.

## 예시 4: 복합 조건을 이용한 세밀한 접근 제어

```
Match User dataoperator Group dataadmins Address 192.168.5.* LocalPort 2222
    PasswordAuthentication yes
    PubkeyAuthentication yes
    PermitTTY yes
    X11Forwarding yes
    AllowTcpForwarding yes
    ForwardAgent yes
    PermitLocalCommand yes
    LocalCommand logger "Data admin access: %h by %u"
```

이 예시는 네 가지 조건(사용자, 그룹, IP 주소 범위, 로컬 포트)을 모두 만족할 때만 적용되는 복합 설정입니다[2][3]. 'dataoperator' 사용자가 'dataadmins' 그룹에 속해 있고, 192.168.5.* 네트워크에서 2222 포트로 접속할 때만 확장된 접근 권한이 부여됩니다. 이 접근이 발생할 때마다 로컬 명령을 통해 로그를 남기도록 구성되어 있어 감사(audit) 목적으로도 유용합니다.

## 예시 5: 프로토콜 및 암호화 알고리즘 지정 구성

```
Match Address !192.168.0.0/16,* User *,!root
    Protocol 2
    Ciphers aes256-ctr,aes256-gcm@openssh.com,chacha20-poly1305@openssh.com
    MACs hmac-sha2-512,hmac-sha2-256
    KexAlgorithms curve25519-sha256,diffie-hellman-group16-sha512
    PermitRootLogin no
    MaxAuthTries 3
    AllowAgentForwarding no
    PasswordAuthentication no
```

이 복합적인 예시는 내부 네트워크(192.168.0.0/16) 외부에서 접속하는 모든 비루트 사용자에게 적용됩니다[5][7]. 부정 연산자(!)를 사용하여 특정 네트워크나 사용자를 제외시키는 방식입니다. 이 구성은 SSH 프로토콜 버전을 2로 제한하고, 특정 고강도 암호화 알고리즘과 MAC(메시지 인증 코드) 알고리즘만 허용합니다. 또한 키 교환 알고리즘도 강력한 보안을 제공하는 알고리즘으로 제한하며, 비밀번호 인증을 비활성화하고 인증 시도 횟수를 제한하여 외부에서의 접속에 대한 보안을 강화합니다.

## 예시 6: 환경별 설정 조합

```
# 기본 설정
PermitRootLogin no
X11Forwarding no

# 개발 환경용 설정
Match Host *-dev
    X11Forwarding yes
    PasswordAuthentication yes
    PermitLocalCommand yes
    
# 테스트 환경용 설정
Match Host *-test Address 192.168.0.0/16
    X11Forwarding yes
    PasswordAuthentication no
    
# 프로덕션 환경용 보안 강화 설정
Match Host *-prod
    PasswordAuthentication no
    PubkeyAuthentication yes
    AllowTcpForwarding no
    MaxAuthTries 2
    ClientAliveInterval 300
    ClientAliveCountMax 2
```

이 예시는 환경별(개발, 테스트, 프로덕션)로 다른 보안 정책을 적용하는 설정입니다[9]. 호스트 이름 패턴을 기반으로 각 환경에 적합한 접근 제어와 보안 설정을 지정하고 있습니다. 개발 환경에서는 편의성을 위해 X11 포워딩과 비밀번호 인증을 허용하는 반면, 프로덕션 환경에서는 공개키 인증만 허용하고 추가 보안 제한을 적용합니다.

## 예시 7: 프로토콜 및 서비스별 최적화 구성

```
# SSH 서비스 기본 설정
Protocol 2
AllowUsers *

# 데이터베이스 서버용 설정
Match User db-* Address 10.0.0.0/8
    AllowTcpForwarding yes
    X11Forwarding no
    PermitTTY yes
    ForceCommand /usr/local/bin/db-session-wrapper
    
# 웹 서버용 설정
Match User web-* Address 10.0.0.0/8
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY yes
    ForceCommand /usr/local/bin/web-session-wrapper
    
# 모니터링 시스템용 설정
Match User monitoring-* Address 10.0.0.0/8
    PermitTTY no
    ForceCommand /usr/local/bin/monitoring-command-only
    ClientAliveInterval 30
    ClientAliveCountMax 3
```

이 예시는 서비스 유형별로 맞춤형 SSH 설정을 적용하는 복합 구성입니다[9]. 사용자 이름 패턴과 IP 주소 범위를 기반으로 데이터베이스 서버, 웹 서버, 모니터링 시스템에 각각 다른 접근 제어 규칙을 적용합니다. 각 서비스 유형에 맞게 ForceCommand를 사용하여 특정 스크립트나 명령만 실행할 수 있도록 제한하고, 서비스 특성에 따라 필요한 SSH 기능만 선택적으로 활성화합니다.

## 결론

SSH Match 지시어는 사용자, 그룹, 호스트, IP 주소 등 다양한 조건을 기반으로 세밀한 접근 제어를 구현할 수 있는 강력한 도구입니다. 이러한 예시를 응용하여 자신의 환경에 맞는 보안 정책을 구현할 수 있습니다. 설정 변경 후에는 항상 SSH 서비스를 재시작하여 변경 사항을 적용해야 하며, 설정 오류로 인한 접근 문제를 방지하기 위해 변경 전 테스트를 권장합니다.


<hr/>
# SSH Match 지시어의 조건 키워드 차이점 및 상세 사용법

SSH 서버 구성 파일(sshd_config)에서 Match 지시어는 다양한 조건 키워드를 통해 세밀한 접근 제어를 가능하게 합니다. 각 키워드는 서로 다른 접근 특성을 평가하며, 이를 조합하여 정교한 보안 정책을 구현할 수 있습니다.

## 주요 조건 키워드 비교

### User

**정의**: 접속을 시도하는 사용자 이름을 기준으로 조건을 평가합니다.

**특징**:
- 사용자 단위의 가장 기본적인 접근 제어 방법
- 와일드카드(*) 및 부정(!) 연산자 지원
- 여러 사용자를 쉼표로 구분하여 지정 가능

**예시 코드**:
```
# 단일 사용자에 적용
Match User admin
    PasswordAuthentication no
    PubkeyAuthentication yes

# 여러 사용자에 적용
Match User dev1,dev2,dev3
    X11Forwarding yes
    AllowTcpForwarding yes

# 와일드카드 패턴 사용
Match User backup*
    ForceCommand /usr/local/bin/backup-only.sh
```

### Group

**정의**: 사용자가 속한 시스템 그룹을 기준으로 조건을 평가합니다.

**특징**:
- 사용자 개별 설정 없이 그룹 단위로 접근 제어 가능
- 시스템의 그룹 구조를 활용한 관리 효율성
- 여러 그룹을 쉼표로 구분하여 지정 가능

**예시 코드**:
```
# 개발자 그룹에 적용
Match Group developers
    X11Forwarding yes
    PermitTunnel yes

# 다중 그룹 조건
Match Group admins,operators
    PasswordAuthentication yes
    PermitRootLogin yes

# 그룹 제외 패턴
Match Group *,!guests
    AllowTcpForwarding yes
```

### Host

**정의**: 클라이언트가 접속 요청 시 지정한 대상 호스트명(서버의 FQDN 또는 hostname)을 기준으로 조건을 평가합니다.

**특징**:
- SSH 클라이언트가 접속 시 지정한 호스트 이름 기준
- DNS 이름 패턴 매칭 가능
- 내부적으로 환경에 따라 다른 설정 적용 시 유용

**예시 코드**:
```
# 개발 서버에 적용
Match Host dev.example.com
    PasswordAuthentication yes
    X11Forwarding yes

# 프로덕션 서버에 적용
Match Host prod.example.com,prod-*.example.com
    PasswordAuthentication no
    MaxAuthTries 3

# 와일드카드로 도메인 패턴 지정
Match Host *.internal.net
    AllowAgentForwarding yes
```

### Address

**정의**: 클라이언트의 IP 주소를 기준으로 조건을 평가합니다.

**특징**:
- 클라이언트의 원격 IP 주소 기반 접근 제어
- CIDR 표기법(192.168.1.0/24) 지원
- 와일드카드 및 부정 연산자 지원

**예시 코드**:
```
# 사내 네트워크에 적용
Match Address 10.0.0.0/8
    PasswordAuthentication yes
    X11Forwarding yes

# 특정 IP 제외
Match Address *,!192.168.1.100
    MaxAuthTries 3

# 다중 네트워크 범위 지정
Match Address 192.168.1.0/24,172.16.0.0/16
    AllowTcpForwarding yes
```

### LocalAddress

**정의**: SSH 서버의 로컬 IP 주소(서버에 구성된 IP 중 연결이 들어온 인터페이스의 IP)를 기준으로 조건을 평가합니다.

**특징**:
- 서버의 다중 네트워크 인터페이스 환경에서 유용
- 내부/외부 네트워크 인터페이스별 다른 정책 적용 가능
- CIDR 표기법 지원

**예시 코드**:
```
# 내부 네트워크 인터페이스에 적용
Match LocalAddress 10.0.0.1
    PasswordAuthentication yes
    X11Forwarding yes

# 공개 인터페이스에 적용
Match LocalAddress 203.0.113.10
    PasswordAuthentication no
    PubkeyAuthentication yes
    MaxAuthTries 2
```

### LocalPort

**정의**: SSH 서버가 수신 대기하는 포트 번호를 기준으로 조건을 평가합니다.

**특징**:
- 다중 포트로 SSH 서비스 운영 시 포트별 정책 적용 가능
- 표준 포트(22)와 대체 포트 운영 시 유용
- 여러 포트를 쉼표로 구분하여 지정 가능

**예시 코드**:
```
# 표준 포트에 적용
Match LocalPort 22
    PasswordAuthentication no
    MaxAuthTries 3

# 관리용 대체 포트에 적용
Match LocalPort 2222
    PasswordAuthentication yes
    AllowTcpForwarding yes
    
# 여러 포트에 적용
Match LocalPort 22,2222,2022
    MaxSessions 10
```

## 복합 조건 사용 예시

키워드들을 조합하여 더욱 정교한 접근 제어가 가능합니다:

### 사용자와 그룹 조합

```
# 개발자 그룹의 특정 사용자에게만 적용
Match User lead-dev Group developers
    X11Forwarding yes
    PermitTTY yes
    AllowTcpForwarding yes
```

이 설정은 'lead-dev' 사용자가 'developers' 그룹에 속할 때만 적용됩니다. 두 조건이 AND 논리로 결합되어 둘 다 충족해야 합니다.

### 네트워크와 사용자 조합

```
# 내부 네트워크에서 접속하는 관리자에게 적용
Match User admin Address 10.0.0.0/8
    PasswordAuthentication yes
    PermitRootLogin yes
    
# 외부 네트워크에서 접속하는 관리자에게 적용
Match User admin Address !10.0.0.0/8,*
    PasswordAuthentication no
    PubkeyAuthentication yes
    PermitRootLogin no
```

이 예시는 같은 사용자(admin)에게도 접속 위치에 따라 다른 정책을 적용합니다. 내부 네트워크에서는 더 관대한 정책을, 외부에서는 더 엄격한 정책을 적용합니다.

### 호스트와 포트 조합

```
# 개발 서버의 관리 포트에 적용
Match Host dev.example.com LocalPort 2222
    PasswordAuthentication yes
    X11Forwarding yes
    
# 프로덕션 서버의 관리 포트에 적용
Match Host prod.example.com LocalPort 2222
    PasswordAuthentication no
    PubkeyAuthentication yes
    AllowAgentForwarding no
```

이 설정은 같은 포트(2222)에 대해서도 호스트명에 따라 다른 보안 정책을 적용합니다.

### 다중 조건 종합 구성

```
# 기본 정책
PermitRootLogin no
PasswordAuthentication no

# 내부 개발자 특별 권한
Match User dev* Group developers Address 10.0.0.0/8
    PasswordAuthentication yes
    X11Forwarding yes
    AllowTcpForwarding yes
    
# 원격 관리자 제한적 권한
Match User admin* Group admins Address !10.0.0.0/8,*
    PubkeyAuthentication yes
    PermitTTY yes
    ForceCommand /usr/local/bin/admin-menu.sh
    
# 모니터링 시스템 전용 접근
Match User monitor Address 192.168.5.0/24 LocalPort 22
    PubkeyAuthentication yes
    PermitTTY no
    ForceCommand /usr/local/bin/monitoring-only.sh
```

이 종합 구성은 사용자, 그룹, 네트워크 위치에 따라 세 가지 서로 다른 접근 정책을 정의합니다. 각 Match 블록은 모든 지정된 조건이 충족될 때만 적용됩니다.

## 조건 키워드 평가 순서와 중요 사항

1. 조건 평가는 구성 파일에 나타나는 순서대로 이루어집니다.
2. 일치하는 첫 번째 Match 블록이 적용됩니다.
3. 여러 Match 블록이 일치할 수 있는 경우, 가장 구체적인 조건을 먼저 배치하는 것이 좋습니다.
4. `Match All` 키워드는 모든 연결에 적용되며, 일반적으로 파일 끝에 배치하여 기본 설정으로 돌아갈 때 사용합니다.

각 키워드는 SSH 연결의 서로 다른 측면을 평가하므로, 상황과 보안 요구 사항에 따라 가장 적합한 조건 키워드와 조합을 선택하는 것이 중요합니다.


<hr/>

# SSH Match 지시어에서 다중값 지정하기

SSH 서버 설정 파일(sshd_config)에서 Match 지시어는 다양한 조건에 따라 특정 구성을 적용할 수 있는 강력한 기능을 제공합니다. 여러 사용자, 주소 등 다중 값을 지정하는 방법은 다음과 같습니다.

## 다중 사용자 지정 방법

Match User 지시어에서 여러 사용자를 지정할 때는 쉼표(,)로 구분하여 나열합니다:

```
Match User user1,user2,user3
    ForceCommand internal-sftp
    ChrootDirectory /home/%u/
    X11Forwarding no
    AllowTcpForwarding no
```

이 설정은 user1, user2, user3 세 사용자 모두에게 적용됩니다[3][4].

**중요 주의사항**: 
- 쉼표 사이에 공백을 넣지 않아야 합니다[3]
- `Match User user1, user2, user3`와 같이 공백이 있으면 구문 오류가 발생합니다

## 다중 IP 주소 지정 방법

IP 주소도 유사하게 쉼표로 구분하여 여러 주소를 지정할 수 있습니다:

```
Match Address 192.168.1.0/24,10.0.0.0/8
    PasswordAuthentication yes
    X11Forwarding yes
```

CIDR 표기법을 사용하여 IP 주소 범위를 지정할 수도 있습니다(192.168.1.0/24 형식)[2].

## 여러 조건 조합하기

다양한 Match 조건을 조합하여 더 세밀한 접근 제어가 가능합니다:

```
Match User adminuser Address 10.10.10.5
    PermitRootLogin yes
    AllowTcpForwarding no
```

이 예시에서는 adminuser가 특정 IP 주소(10.10.10.5)에서 접속할 때만 설정이 적용됩니다[5].

## 부정 연산자 사용하기

부정 연산자(!)를 사용하여 특정 값을 제외할 수도 있습니다:

```
Match User *,!root Address 192.168.1.*
    PasswordAuthentication yes
```

이 설정은 root를 제외한 모든 사용자가 192.168.1.* 범위의 IP에서 접속할 때 비밀번호 인증을 허용합니다[2].

## 실제 예시: 여러 사용자에 대한 SFTP 설정

다음은 여러 사용자에게 서로 다른 chroot 디렉토리를 지정하는 예시입니다:

```
# User A, B를 위한 설정
Match User usera,userb
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    ChrootDirectory /mnt/shared/user_a_b

# User C를 위한 설정
Match User userc
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    ChrootDirectory /mnt/shared/user_c
```

이 설정에서는 usera와 userb는 같은 chroot 디렉토리를 공유하고, userc는 다른 디렉토리를 사용합니다[6].

## 주의사항 및 문제해결

1. **권한 문제**: chroot 디렉토리를 사용할 경우 해당 디렉토리는 특정 권한 요구사항을 충족해야 합니다. 일반적으로 root 소유이며 그룹 쓰기 권한이 없어야 합니다[6].

2. **설정 확인**: 변경사항 적용 전에 `sudo /usr/sbin/sshd -t` 명령으로 구문 오류를 확인하는 것이 좋습니다[4].

3. **우선순위 처리**: 여러 Match 블록이 일치할 경우, 특정 키워드에 대해서는 첫 번째로 발견된 인스턴스만 적용됩니다[1][2].

4. **AllowGroups와의 상호작용**: 복잡한 설정에서는 AllowGroups 지시어와 Match 블록의 상호작용을 주의해야 합니다[1].

SSH Match 지시어의 다중값 지정 기능을 활용하면 서버 접근 정책을 사용자, 주소, 포트 등의 다양한 조건에 따라 세밀하게 제어할 수 있습니다.


<hr/>

# SSH Match 지시어를 활용한 특정 프로토콜 제한 구성

SSH 서버에서 특정 프로토콜만 허용하는 설정은 보안을 강화하기 위한 중요한 방법입니다. Match 지시어를 사용하여 다양한 프로토콜 제한을 구현하는 방법을 상세히 알아보겠습니다.

## SSH 프로토콜 버전 제한

SSH 프로토콜은 버전 1과 2가 있으며, 보안상의 이유로 버전 2만 사용하도록 제한하는 것이 일반적입니다.

```
# 기본적으로 모든 연결에 SSHv2만 허용
Protocol 2

# 특정 내부 네트워크에 대해서만 설정
Match Address 192.168.1.0/24
    Protocol 2
```

## SFTP 전용 접근 설정

특정 사용자가 SFTP 프로토콜만 사용할 수 있도록 제한하는 설정:

```
Match User sftp-user1,sftp-user2
    ForceCommand internal-sftp
    ChrootDirectory /home/%u
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
```

이 설정은 sftp-user1과 sftp-user2 사용자가 SFTP만 사용할 수 있도록 제한하며, 일반 SSH 셸 접근이나 TCP 포워딩 같은 다른 기능은 차단합니다.

## SCP 전용 접근 설정

SCP만 허용하고 셸 접근은 제한하는 설정:

```
Match User scp-user
    ForceCommand /usr/bin/scp -t ${SSH_ORIGINAL_COMMAND#scp -f}
    PermitTTY no
    X11Forwarding no
    AllowTcpForwarding no
```

이 설정은 scp-user에게 SCP 명령만 실행할 수 있는 권한을 부여합니다.

## 암호화 알고리즘 제한

특정 사용자나 IP 주소 범위에 대해 더 강력한 암호화 알고리즘만 허용:

```
Match Address !10.0.0.0/8,*
    Ciphers aes256-ctr,aes256-gcm@openssh.com,chacha20-poly1305@openssh.com
    MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
    KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
```

이 설정은 내부 네트워크(10.0.0.0/8) 외부에서 오는 모든 연결에 대해 고강도 암호화 알고리즘, MAC 알고리즘, 키 교환 알고리즘만 허용합니다.

## SSH와 SFTP를 그룹별로 분리

사용자 그룹에 따라 서로 다른 프로토콜 접근 권한 부여:

```
# 관리자 그룹은 모든 SSH 기능 사용 가능
Match Group admins
    AllowTcpForwarding yes
    X11Forwarding yes
    PermitTTY yes
    
# 개발자 그룹은 제한된 SSH 기능만 사용 가능
Match Group developers
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY yes
    
# 데이터 업로드 그룹은 SFTP만 사용 가능
Match Group uploaders
    ForceCommand internal-sftp
    ChrootDirectory /data/uploads
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY no
```

이 설정은 서로 다른 그룹에 속한 사용자들에게 각기 다른 수준의 SSH 프로토콜 접근 권한을 부여합니다.

## 클라이언트 버전 기반 접근 제어

특정 SSH 클라이언트 버전에 대한 설정을 구현할 수도 있습니다. 이는 Match 직접 지원하지는 않지만, 스크립트와 조합하여 구현할 수 있습니다:

```
Match User apiuser
    ForceCommand /usr/local/bin/version_check.sh
```

여기서 version_check.sh 스크립트는 클라이언트 버전을 확인하고 조건에 따라 접근을 허용하거나 거부합니다:

```bash
#!/bin/bash
# SSH_CLIENT_VERSION 환경 변수 확인
if [[ "$SSH_CLIENT_VERSION" == *"OpenSSH_8"* ]]; then
    # 원본 명령 실행
    eval $SSH_ORIGINAL_COMMAND
else
    echo "지원되지 않는 SSH 클라이언트 버전입니다. OpenSSH 8 이상이 필요합니다."
    exit 1
fi
```

## 고급: 인증 방법에 따른 프로토콜 제한

인증 방법(공개키 vs 비밀번호)에 따라 다른 프로토콜 접근 권한 부여:

```
# 공개키 인증 사용자에게 더 많은 권한 부여
Match User poweruser AuthenticationMethods publickey
    AllowTcpForwarding yes
    PermitTunnel yes
    X11Forwarding yes

# 비밀번호 인증 사용자에게는 제한된 권한만 부여
Match User poweruser AuthenticationMethods password
    AllowTcpForwarding no
    PermitTunnel no
    X11Forwarding no
```

이 설정은 같은 사용자라도 인증 방법에 따라 다른 권한을 부여합니다.

## 복합 조건을 활용한 세밀한 프로토콜 제어

여러 조건을 조합하여 세밀한 프로토콜 제어를 구현할 수 있습니다:

```
# 내부 네트워크의 개발자에게는 SSH 전체 기능 허용
Match Group developers Address 10.0.0.0/8
    AllowTcpForwarding yes
    X11Forwarding yes
    PermitTTY yes
    
# 외부 네트워크의 개발자에게는 제한된 SSH 기능만 허용
Match Group developers Address !10.0.0.0/8,*
    AllowTcpForwarding no
    X11Forwarding no
    PermitTTY yes
    ForceCommand /usr/local/bin/restricted_shell.sh
```

이 설정은 같은 개발자 그룹이라도 접속 위치에 따라 서로 다른
프로토콜 제한을 적용합니다.

## 주의사항

1. Match 블록 내에서 허용되지 않는 지시어가 있습니다. 예를 들어 `Protocol` 지시어는 전역으로만 설정할 수 있습니다.

2. 설정 변경 후에는 반드시 구문 검사를 수행하고 SSH 서비스를 재시작해야 합니다:
   ```
   sudo sshd -t
   sudo systemctl restart sshd
   ```

3. 너무 제한적인 설정은 정상적인 작업을 방해할 수 있으므로, 사용자 요구와 보안 정책 사이의 균형을 고려해야 합니다.

다양한 Match 조건과 SSH 구성 지시어를 조합하면 사용자, 그룹, IP 주소 등에 따라 세밀하게 프로토콜 접근을 제어할 수 있습니다.
