## set magic packet
    - motherboard bios -> Wake On Lan enable
    - devmgmt.msc -> NIC -> woake on magic packet enable
## ssh server 설치
    선택적 기능 -> OpenSSH Server install
## ipv4, mac
    ipconfig /all
## 24hours server .py code
```
import socket, struct
def WOL(macAddr):
  sep = macAddr[2]
  macAddr = macAddr.replace(sep, '')

  data = b'FFFFFFFFFFFF' + (macAddr * 16).encode()
  send_data = b''

  for i in range(0, len(data), 2):
    send_data += struct.pack('B', int(data[i: i + 2], 16))

  sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
  sock.sendto(send_data, ('192.168.1.255', 2304)) 

WOL('AA:AA:AA:AA:AA:88')
```

## windows ssh 
    Get-NetFirewallRule -Name OpenSSH-Server-In-TCP (check Enabled TRUE)
 
    C:\ProgramData\ssh\sshd_config
    PubkeyAuthentication yes
    PasswordAuthentication no

## create ssh-key
    open cmd && ssh-keygen
    change id_rsa.pub to authorized_keys
`public_key path` C:\users\user_name\.ssh\authorized_keys 

## restart sshd service
`Restart-Service -Force -Name sshd` or in desktop manager

