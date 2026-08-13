# Supabase Stack

Focused PostgreSQL + pgvector + PostgREST stack for vector-data API experiments; it is not the complete Supabase service set.

## Deployment Contract

This stack is a focused PostgreSQL + pgvector + PostgREST subset, not the full managed Supabase platform. Pin images/extensions, schema migrations, JWT claims, PostgREST roles, RLS, TLS termination, storage and published ports. Test unauthorized and cross-tenant access, vector schema compatibility, backup/restore, secret rotation, upgrade and rollback before completion.

---

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
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

See `.env.example` for repository-documented settings; database, extension and PostgREST options remain version-specific.

## JWT Secret Generation

```bash
openssl rand -base64 32
```

## Network

Uses external `nodove-net` network. Create if not exists:
```bash
docker network create nodove-net
```
