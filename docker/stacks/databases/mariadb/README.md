# MariaDB Stack

MariaDB 데이터베이스와 백업 서비스, Adminer 관리 도구를 포함한 스택입니다.

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

See `.env.example` for all available configuration options.

## Network

Uses a dedicated bridge network with static IP support for inter-container communication.
