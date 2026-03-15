# SSH 구성 파일 상세 설명 및 옵션 치트 시트

## 구성 파일 섹션별 의미 설명

### Subsystem sftp internal-sftp
이 설정은 SFTP 서브시스템을 정의합니다. `internal-sftp`는 외부 바이너리 대신 SSH 데몬(sshd) 내부에 내장된 SFTP 서버를 사용하도록 지시합니다. 이 방식은 별도의 프로세스를 실행할 필요가 없어 성능상 이점이 있습니다[1][6].

### Match LocalPort 22 / ForceCommand none
이 블록은 포트 22(표준 SSH 포트)로 들어오는 연결에 적용됩니다. `ForceCommand none`은 특정 명령어를 강제하지 않도록 설정하여 일반적인 SSH 셸 접근을 허용합니다. 이는 이전 설정에서 발생했던 문제를 해결하는 중요한 설정입니다[2].

### Match User nodove LocalPort 22
이 블록은 포트 22를 통해 접속하는 'nodove' 사용자에게 특정 설정을 적용합니다:
- `X11Forwarding yes`: X11 그래픽 애플리케이션 포워딩을 허용합니다[3][4]
- `PubKeyAuthentication yes`: 공개키 인증 방식을 허용합니다
- `AllowTcpForwarding yes`: TCP 포트 포워딩을 허용합니다[4]
- `PermitTTY yes`: 터미널 할당을 허용합니다[3]

### Match LocalPort 2723
이 블록은 포트 2723으로 들어오는 모든 연결에 적용됩니다:
- `ForceCommand internal-sftp`: 모든 접속을 SFTP 프로토콜로 강제합니다[5][6]
- `ChrootDirectory /workspace`: 사용자를 /workspace 디렉토리로 제한(jail)합니다[1][5]
- `AllowTcpForwarding no`: 보안을 위해 TCP 포워딩을 비활성화합니다[5]
- `X11Forwarding no`: 보안을 위해 X11 포워딩을 비활성화합니다[5]

## SSH 구성 옵션 치트 시트

### 기본 설정 옵션

| 옵션 | 설명 |
|------|------|
| Port | SSH 데몬이 리스닝할 포트 번호 (기본값: 22) |
| ListenAddress | SSH 데몬이 리스닝할 IP 주소 |
| Protocol | 사용할 SSH 프로토콜 버전 (2 권장) |
| HostKey | 호스트 키 파일 경로 |
| ServerKeyBits | 서버 키 비트 수 |
| LoginGraceTime | 로그인 유예 시간(초) |
| PermitRootLogin | root 계정 로그인 허용 여부 (yes/no/prohibit-password) |
| StrictModes | 사용자 파일 권한 검사 여부 |
| MaxAuthTries | 최대 인증 시도 횟수 |
| MaxSessions | 최대 세션 수 |

### 인증 옵션

| 옵션 | 설명 |
|------|------|
| PubkeyAuthentication | 공개키 인증 허용 여부 |
| PasswordAuthentication | 비밀번호 인증 허용 여부 |
| PermitEmptyPasswords | 빈 비밀번호 허용 여부 |
| AuthorizedKeysFile | 인증된 키 파일 경로 (.ssh/authorized_keys) |
| ChallengeResponseAuthentication | 챌린지-응답 인증 허용 여부 |
| UsePAM | PAM 인증 사용 여부 |
| KerberosAuthentication | 커버로스 인증 허용 여부 |
| GSSAPIAuthentication | GSSAPI 인증 허용 여부 |

### 접근 제어 옵션

| 옵션 | 설명 |
|------|------|
| AllowUsers | 접속 허용할 사용자 목록 |
| AllowGroups | 접속 허용할 그룹 목록 |
| DenyUsers | 접속 거부할 사용자 목록 |
| DenyGroups | 접속 거부할 그룹 목록 |
| Match | 특정 조건(사용자, 그룹, 호스트, 포트 등)에 대한 설정 블록 정의 |

### 포워딩 옵션

| 옵션 | 설명 |
|------|------|
| AllowTcpForwarding | TCP 포트 포워딩 허용 여부 |
| GatewayPorts | 원격 호스트가 포워딩된 포트에 연결 허용 여부 |
| X11Forwarding | X11 그래픽 애플리케이션 포워딩 허용 여부 |
| X11DisplayOffset | X11 디스플레이 번호 오프셋 |
| X11UseLocalhost | X11 포워딩을 localhost로 제한 여부 |
| PermitTunnel | 터널링 허용 여부 |

### 세션 옵션

| 옵션 | 설명 |
|------|------|
| Banner | 로그인 전 표시할 배너 파일 경로 |
| PrintMotd | 로그인 시 motd(message of the day) 표시 여부 |
| PrintLastLog | 마지막 로그인 정보 표시 여부 |
| PermitTTY | TTY 할당 허용 여부 |
| PermitUserEnvironment | 사용자 환경 변수 허용 여부 |
| ClientAliveInterval | 클라이언트 활성 확인 간격(초) |
| ClientAliveCountMax | 클라이언트 응답 없을 시 최대 메시지 전송 횟수 |
| TCPKeepAlive | TCP KeepAlive 메시지 전송 여부 |

### SFTP 옵션

| 옵션 | 설명 |
|------|------|
| Subsystem sftp | SFTP 서브시스템 정의 (external 또는 internal-sftp) |
| ForceCommand | 모든 SSH 세션에서 강제로 실행할 명령어 |
| ChrootDirectory | 사용자를 제한할 디렉토리(jail) |
| AllowAgentForwarding | SSH 에이전트 포워딩 허용 여부 |

### 보안 옵션

| 옵션 | 설명 |
|------|------|
| IgnoreRhosts | .rhosts 파일 무시 여부 |
| IgnoreUserKnownHosts | 사용자 known_hosts 파일 무시 여부 |
| PermitUserRC | 사용자 RC 파일 실행 허용 여부 |
| Ciphers | 허용할 암호화 알고리즘 목록 |
| MACs | 허용할 메시지 인증 코드 알고리즘 목록 |
| KexAlgorithms | 허용할 키 교환 알고리즘 목록 |
| LogLevel | 로그 레벨 (INFO, VERBOSE, DEBUG 등) |
| SyslogFacility | 시스템 로그 시설 코드 (AUTH 등) |

이 구성으로 포트 22는 SSH 접속용, 포트 2723은 SFTP 전용으로 설정되어 있어 각각의 프로토콜을 분리하여 관리할 수 있습니다.
