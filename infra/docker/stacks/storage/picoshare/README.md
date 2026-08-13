# PicoShare Stack

Minimal file sharing service with expiration support.

> Scope: deployment example only. Pin the image digest and verify authentication, upload limits, expiration semantics, and database migration behavior for that release.
> Data boundary: expiration is not secure erasure or backup retention. Treat share URLs as credentials, limit ingress and file size, and test SQLite plus uploaded-file restore together.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
mkdir -p data
docker compose config
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
