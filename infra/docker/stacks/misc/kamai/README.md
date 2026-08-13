# Kimai Stack

Open-source time tracking application.

> Scope: deployment example only. Pin Kimai and database image versions, read the matching upgrade notes, and back up database plus persistent application data before changing versions.
> Security: generate unique secrets outside Git, place the UI behind a trusted interface or authenticated reverse proxy, and do not publish the database port.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
mkdir -p kimai/db/mysql kimai/host/data kimai/host/plugins
docker compose config
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

After first start, follow the initialization flow supported by the pinned image. Confirm the administrator account, authentication, timezone, database migration status, and a representative time-entry export; do not treat `.env.example` values as usable credentials.
