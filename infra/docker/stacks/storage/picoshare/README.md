# PicoShare Stack

Minimal file sharing service with expiration support.

## Quick Start

```bash
cp .env.example .env
# Edit .env with environment-specific settings
mkdir -p data
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| PicoShare | 4001 | File sharing web UI |

## Features

- Simple, minimal file sharing
- Expiration support for shared files
- SQLite database storage

## Environment Variables

See `.env.example` for configuration options.
