# Gluetun + qBittorrent VPN Stack

qBittorrent routing through a Gluetun VPN container, subject to verified network mode, kill-switch and leak tests.

## Privacy and Network Contract

Pin Gluetun and qBittorrent images, VPN provider/protocol, credentials, server region, Docker network mode, firewall/kill-switch, DNS and IPv6 policy. Routing through a VPN container is a configuration claim, not proof that every egress path is tunneled. Verify public IP, DNS/IPv6 leaks, port forwarding, tunnel-drop behavior and qBittorrent bind interface; rotate version-dependent default credentials and follow provider, network and content-use policies.

---

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

- Intended qBittorrent traffic shares the Gluetun network path; verify no alternate interface, DNS or IPv6 egress
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

qBittorrent initial credential is image/version dependent. Inspect startup logs or configured secret, then rotate it before exposing the WebUI.
