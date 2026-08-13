# Windows 호스트의 Wake-on-LAN과 OpenSSH 준비

Wake-on-LAN(WOL)은 전원이 꺼지거나 절전 상태인 NIC가 매직 패킷을 수신해 시스템을 깨우는 기능입니다. 메인보드, NIC 드라이버, 전원 상태, 네트워크가 모두 지원해야 하며 인터넷을 통한 전달은 별도 라우팅·보안 설계가 필요합니다.

## WOL 전제 확인

1. BIOS/UEFI에서 Wake-on-LAN 또는 PCIe wake 기능을 활성화합니다.
2. Windows 장치 관리자에서 대상 NIC의 “매직 패킷으로 깨우기”와 전원 관리 설정을 확인합니다.
3. `ipconfig /all`에서 대상 NIC의 MAC 주소와 현재 서브넷을 기록합니다.
4. 같은 브로드캐스트 도메인의 다른 장치에서 먼저 시험합니다.

```python
import socket

def wake(mac: str, broadcast: str, port: int = 9) -> None:
    compact = mac.replace(":", "").replace("-", "")
    if len(compact) != 12:
        raise ValueError("MAC address must contain 12 hexadecimal digits")
    mac_bytes = bytes.fromhex(compact)
    packet = b"\xff" * 6 + mac_bytes * 16

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.sendto(packet, (broadcast, port))

wake("AA:AA:AA:AA:AA:88", "192.168.1.255")
```

브로드캐스트 주소는 실제 서브넷에서 계산합니다. UDP 포트 9는 관례적 기본값일 뿐이며 NIC는 패킷의 매직 바이트를 판정합니다. 라우터에서 무제한 directed broadcast나 포트 포워딩을 켜지 않습니다.

## Windows OpenSSH Server

OpenSSH Server는 WOL과 별도 기능입니다. Windows 선택적 기능에서 설치한 뒤 관리자 PowerShell에서 상태와 방화벽 규칙을 확인합니다.

```powershell
Get-Service sshd
Get-NetFirewallRule -Name OpenSSH-Server-In-TCP
sshd -t
Restart-Service sshd
```

사용자 공개 키의 기본 파일은 `C:\Users\<USER>\.ssh\authorized_keys`입니다. 관리자 계정은 Windows OpenSSH 정책에 따라 별도 경로를 사용할 수 있으므로 유효 설정과 서비스 로그를 확인합니다. 비밀번호 인증을 끄기 전에 새 터미널에서 공개 키 로그인이 성공하는지 확인하고, 기존 관리자 세션을 복구 경로로 유지합니다.

WOL 완료는 패킷 전송 함수가 끝나는 시점이 아니라 대상 호스트가 지정 시간 안에 켜지고, 예상 IP에서 SSH 또는 승인된 헬스 체크에 응답하는 시점입니다.
