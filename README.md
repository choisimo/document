# Documentation Hub

A comprehensive documentation repository for infrastructure, development, and operations.

## 🚀 Quick Start

### View Documentation Locally

```bash
# Start documentation server with Docker
docker compose -f docker-compose.docs.yml up docs

# Open in browser
open http://localhost:8000
```

### Build for Production

```bash
# Build static site
docker compose -f docker-compose.docs.yml --profile build up docs-build

# Serve with nginx
docker compose -f docker-compose.docs.yml --profile production up nginx
```

## 📁 Directory Structure

```
.
├── docs/                    # Documentation source (MkDocs)
│   ├── algorithms/          # Algorithm & data structure guides
│   ├── compiler/            # Compiler theory documentation
│   ├── databases/           # Database setup & JPA guides
│   ├── development/         # Docker, Git, IDE setup
│   ├── infrastructure/      # Server, network, storage
│   ├── java/                # Java language guides
│   ├── linux/               # Linux & Arch Linux guides
│   ├── nginx/               # Nginx configuration
│   ├── os/                  # Operating system concepts
│   ├── projects/            # Project documentation
│   ├── prompts/             # AI prompt templates
│   ├── security/            # SSH, VPN, Zero Trust
│   └── tools/               # Terminal, automation tools
├── configs/                 # Service configuration files
│   ├── haproxy/             # HAProxy configs
│   ├── nginx/               # Nginx configs
│   └── monitoring/          # Loki, Prometheus configs
├── scripts/                 # Automation scripts
│   ├── backup/              # Backup utilities
│   ├── deployment/          # Deployment scripts
│   ├── maintenance/         # System maintenance
│   └── utilities/           # General utilities
├── docker/                  # Docker configurations
├── legacy/                  # Archived old documentation
├── mkdocs.yml               # MkDocs configuration
└── docker-compose.docs.yml  # Documentation Docker setup
```

## 📚 Key Documentation

### Infrastructure
- [Proxmox Cluster Setup](docs/infrastructure/proxmox/cluster.md)
- [Network Configuration](docs/infrastructure/networking/network-settings.md)
- [Monitoring Stack](docs/infrastructure/monitoring/prometheus-grafana-loki.md)

### Security
- [SSH Configuration](docs/security/ssh/configuration.md)
- [Tailscale VPN](docs/security/vpn/tailscale.md)
- [Cloudflare Zero Trust](docs/security/zerotrust/cloudflare.md)

### Development
- [Docker Installation](docs/development/docker/installation.md)
- [Git Branch Management](docs/development/git/branch-management.md)
- [VS Code Setup](docs/development/ide/vscode-plugins.md)

### Tools
- [Linux Commands](docs/tools/terminal/linux-commands.md)
- [Tmux Guide](docs/tools/terminal/tmux.md)

## 🛠️ Technology Stack

- **Documentation**: [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)

## 📝 Contributing

1. Place documentation in appropriate `docs/` subdirectory
2. Follow existing markdown formatting conventions
3. Use mermaid diagrams for visualizations where helpful
4. Update `mkdocs.yml` navigation if adding new pages

## 📄 License

This documentation is for personal/internal use.
