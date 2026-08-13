# Stack Template

Use this as a starting point for new Docker stacks.

Before use, replace placeholders, pin images by immutable version or digest, and define exposure, health checks, data ownership, backup/restore, limits, secret injection, and upgrade rollback. Remove unused examples instead of deploying them unchanged.

## Quick Start

```bash
cp .env.example .env
docker compose config
docker compose up -d
# Completion requires service health and a representative request, not only running containers.
```

## Environment Variables

See `.env.example` for configuration options.
