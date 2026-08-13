# MariaDB Stack

MariaDB, scheduled-backup container와 Adminer를 함께 정의한 example stack입니다. Backup service 존재만으로 consistent restore를 보장하지 않습니다.

## Deployment Contract

Pin MariaDB, backup image and Adminer versions, charset/collation, storage, user privileges and published ports. A running backup container does not prove a consistent or restorable backup. Keep Adminer off untrusted networks, store secrets outside tracked files, and test database health, transaction durability, scheduled backup, independent restore, upgrade and rollback before completion.

---

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
mkdir -p data/mysql backups
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| MariaDB | 3306 | Database server |
| Backup | - | Automated backup service |
| Adminer | 3090 | Database management UI |

## Environment Variables

See `.env.example` for the configuration options documented by this repository; image and server options may be broader or version-specific.

## Network

Uses a dedicated bridge network with static IP support for inter-container communication.
