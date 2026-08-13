# Droppy Stack

Self-hosted file storage server with web interface.

> Scope: deployment example only. Confirm the selected image is maintained, pin its digest, and review authentication and migration behavior before storing data.
> Data boundary: a web file manager is not a backup or synchronization guarantee. Restrict exposure, apply per-user authorization, and back up `config` and `files` with a tested restore.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
mkdir -p config files
docker compose config
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Droppy | 8989 | File storage web UI |

## Features

- Modern web interface
- Browser-based file operations; confirm any synchronization behavior against the pinned release
- Multi-user support

## Environment Variables

See `.env.example` for configuration options.
