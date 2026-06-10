# Supabase Stack

PostgreSQL with pgvector extension and PostgREST API for vector database operations.

## Quick Start

```bash
cp .env.example .env
# Edit .env with environment-specific settings
docker network create nodove-net  # If not exists
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database with pgvector |
| PostgREST | 3000 | REST API |

## Features

- pgvector extension for vector similarity search
- PostgREST for automatic REST API generation
- JWT authentication support

## Environment Variables

See `.env.example` for all available configuration options.

## JWT Secret Generation

```bash
openssl rand -base64 32
```

## Network

Uses external `nodove-net` network. Create if not exists:
```bash
docker network create nodove-net
```
