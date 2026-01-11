# Gluetun + qBittorrent VPN Stack

Secure torrent downloading through VPN tunnel using Gluetun.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your VPN credentials
mkdir -p gluetun qbittorrent/config downloads
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Gluetun | - | VPN tunnel (NordVPN, etc.) |
| qBittorrent | 8090 | Torrent client WebUI |

## Features

- All traffic routed through VPN
- Supports multiple VPN providers (NordVPN, Mullvad, etc.)
- Kill switch (no VPN = no internet)
- Health checks for VPN connectivity

## Environment Variables

See `.env.example` for configuration options.

## Supported VPN Providers

- NordVPN
- Mullvad
- Surfshark
- PIA (Private Internet Access)
- And many more...

## Default Credentials

qBittorrent default login: admin / adminadmin
