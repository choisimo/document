# ChangeDetection.io Stack

Website change monitoring with Playwright browser support.

## Quick Start

```bash
cp .env.example .env
# Edit .env with environment-specific settings
mkdir -p datastore
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| ChangeDetection | 5000 | Change monitoring web UI |
| Playwright-Chrome | 3000 | Headless browser for JS rendering |

## Features

- Website change detection and alerts
- JavaScript rendering support via Playwright
- Visual diff comparison
- Multiple notification channels

## Environment Variables

See `.env.example` for configuration options.
