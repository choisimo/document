# Ghost Blog Stack

Self-hosted blogging platform with Caddy reverse proxy and automated backups.

> Scope: deployment example, not evidence of a supported production stack. Pin Ghost, MySQL, Caddy, and backup image versions or digests and review their migration paths before deployment.
> Safety: keep database and SMTP credentials out of Git, restrict published ports, and confirm DNS plus inbound 80/443 access before relying on certificate issuance. Container startup does not prove TLS, mail, backup, or restore works.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
docker compose config  # inspect images, ports, volumes, and variable substitution

# Create required directories
mkdir -p caddy/{conf,site,data,config}
mkdir -p ghost/content
mkdir -p ghost-mysql/{db,config,mysql-init}
mkdir -p ghost-backup/{content,db,backups}

# Set ownership only after confirming the UID/GID used by the pinned MySQL image.
# Do not copy this numeric owner onto an existing database directory blindly.

# Create Caddyfile (see below)
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Caddy | 80, 443 | Reverse proxy with auto SSL |
| Ghost | 2368 | Blogging platform |
| MySQL | 3306 | Database |
| Backup | - | Automated backup service |

## Caddyfile Example

Create `caddy/conf/Caddyfile`:
```
https://blog.example.com {
  reverse_proxy ghost:2368
  tls {
    protocols tls1.2 tls1.3
  }
}
```

## Features

- Automatic SSL via Caddy
- SMTP email support
- Automated daily backups
- 7-day backup retention

These are intended settings. Record a scheduled run, retained artifact, integrity check, and isolated restore before marking backup coverage complete.

## Environment Variables

See `.env.example` for all configuration options.
