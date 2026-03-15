# Kimai Stack

Open-source time tracking application.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
mkdir -p kimai/db/mysql kimai/host/data kimai/host/plugins
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Kimai | 8001 | Time tracking web UI |
| MySQL | 3306 | Database server |

## Features

- Project and activity tracking
- Team management
- Reporting and exports
- API access

## Environment Variables

See `.env.example` for configuration options.

## Initial Setup

After first start, access the web UI and create your admin account with the credentials from `.env`.
