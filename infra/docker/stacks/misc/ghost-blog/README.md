# Ghost Blog Stack

Self-hosted blogging platform with Caddy reverse proxy and automated backups.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings

# Create required directories
mkdir -p caddy/{conf,site,data,config}
mkdir -p ghost/content
mkdir -p ghost-mysql/{db,config,mysql-init}
mkdir -p ghost-backup/{content,db,backups}

# Set MySQL permissions
sudo chown -R 999:999 ghost-mysql/db

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

## Environment Variables

See `.env.example` for all configuration options.
