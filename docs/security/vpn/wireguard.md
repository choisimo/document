# WireGuard VPN Setup

> Modern, fast, and secure VPN using WireGuard with Docker

---

## Overview

WireGuard is a modern VPN protocol that is faster and simpler than IPSec and OpenVPN.

```mermaid
flowchart LR
    subgraph Internet
        A[Remote Client]
    end
    
    subgraph VPN Server
        B[WireGuard :51820]
        C[Internal Network<br/>10.8.0.0/24]
    end
    
    subgraph Home Network
        D[192.168.1.0/24]
    end
    
    A -->|Encrypted Tunnel| B
    B --> C
    C --> D
```

---

## Quick Setup with Docker

### Docker Compose (wg-easy)

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  wg-easy:
    image: weejewel/wg-easy
    container_name: wg-easy
    environment:
      # Required: Your public hostname or IP
      - WG_HOST=vpn.example.com
      
      # Optional settings
      - PASSWORD_HASH=${PASSWORD_HASH}  # Use hash for security
      - WG_PORT=51820
      - WG_DEFAULT_ADDRESS=10.8.0.x
      - WG_DEFAULT_DNS=1.1.1.1
      - WG_MTU=1420
      - WG_ALLOWED_IPS=192.168.1.0/24, 10.8.0.0/24, 0.0.0.0/0
      - WG_PERSISTENT_KEEPALIVE=25
      
    volumes:
      - ./wireguard:/etc/wireguard
    ports:
      - "51820:51820/udp"  # WireGuard
      - "51821:51821/tcp"  # Web UI
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
```

### Generate Password Hash

```bash
# Create .env file with hashed password
echo "PASSWORD_HASH=$(docker run --rm -it ghcr.io/wg-easy/wg-easy wgpw 'your-password')" > .env
```

### Start the Server

```bash
docker compose up -d
```

Access web UI at: `http://your-server:51821`

---

## Manual Installation

### Install WireGuard

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install wireguard

# Arch Linux
sudo pacman -S wireguard-tools

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Generate Keys

```bash
# Generate server keys
wg genkey | tee server_private.key | wg pubkey > server_public.key

# Generate client keys
wg genkey | tee client_private.key | wg pubkey > client_public.key
```

### Server Configuration

Create `/etc/wireguard/wg0.conf`:

```ini
[Interface]
PrivateKey = <server_private_key>
Address = 10.8.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Client 1
PublicKey = <client_public_key>
AllowedIPs = 10.8.0.2/32
```

### Client Configuration

Create `client.conf`:

```ini
[Interface]
PrivateKey = <client_private_key>
Address = 10.8.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = <server_public_key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0  # Route all traffic through VPN
PersistentKeepalive = 25
```

### Start WireGuard

```bash
# Start interface
sudo wg-quick up wg0

# Enable on boot
sudo systemctl enable wg-quick@wg0

# Check status
sudo wg show
```

---

## Configuration Options

| Option | Description | Example |
|--------|-------------|---------|
| `WG_HOST` | Public hostname/IP | `vpn.example.com` |
| `WG_PORT` | UDP listen port | `51820` |
| `WG_DEFAULT_ADDRESS` | Client IP range | `10.8.0.x` |
| `WG_DEFAULT_DNS` | DNS for clients | `1.1.1.1` |
| `WG_MTU` | Maximum transmission unit | `1420` |
| `WG_ALLOWED_IPS` | Networks accessible via VPN | `0.0.0.0/0` |

### AllowedIPs Scenarios

| Use Case | AllowedIPs |
|----------|------------|
| Full tunnel (all traffic) | `0.0.0.0/0` |
| Split tunnel (VPN only) | `10.8.0.0/24` |
| Access home network | `192.168.1.0/24, 10.8.0.0/24` |

---

## Firewall Configuration

### UFW

```bash
sudo ufw allow 51820/udp
sudo ufw reload
```

### iptables

```bash
sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

---

## Client Setup

### Mobile (iOS/Android)

1. Install WireGuard app
2. Scan QR code from wg-easy web UI
3. Or import `.conf` file

### Desktop (Windows/macOS/Linux)

1. Install WireGuard client
2. Import configuration file
3. Activate tunnel

### Linux CLI

```bash
# Install
sudo apt install wireguard

# Place config
sudo cp client.conf /etc/wireguard/wg0.conf

# Connect
sudo wg-quick up wg0

# Disconnect
sudo wg-quick down wg0
```

---

## Troubleshooting

### Check Connection Status

```bash
# Server
sudo wg show

# Check if port is open
sudo netstat -ulnp | grep 51820
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Connection timeout | Check firewall, port forwarding |
| Handshake fails | Verify keys match, check endpoint |
| No internet after connect | Check IP forwarding, NAT rules |
| DNS not working | Verify DNS setting in client config |

### Debug Logs

```bash
# Enable verbose logging
sudo modprobe wireguard
dmesg | grep wireguard
```

---

## Related Documentation

- [Tailscale VPN](tailscale.md)
- [Network Configuration](../../infrastructure/networking/network-settings.md)
