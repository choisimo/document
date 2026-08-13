# ChangeDetection.io Stack

Website change-monitoring stack with Playwright rendering support; target access, rate, false-change behavior and browser isolation require validation.

## Deployment and Collection Contract

Pin ChangeDetection and Playwright images, browser sandbox, storage, notification providers and published ports. Treat monitored URLs and rendered content as untrusted: constrain private-network access, downloads, credentials, request rate and retention. Test JavaScript rendering, false positive/negative changes, target outage, notification failure, restart, backup/restore and rollback before completion.

---

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
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
