# Document Repository

This repository contains organized documentation, scripts, and configuration files for infrastructure, development, and operations.

## Directory Structure

### 📚 `/docs` - Documentation
Comprehensive guides and documentation organized by topic:

- **`ai-ml/`** - AI/ML related documentation and research
  - NLP embedding and similarity guides
  - Multimodal recommendation system research
  
- **`databases/`** - Database setup and management
  - Database installation guides
  - Redis configuration and usage
  - SpringBoot JPA documentation
  
- **`development/`** - Development tools and practices
  - VSCode and code-server setup
  - Git workflows and best practices
  - Docker guides
  - Java, GCC, and Tomcat setup
  
- **`infrastructure/`** - Server and network infrastructure
  - Proxmox cluster configuration
  - Network settings and disk management
  - Email and monitoring setup
  - SSH/SSHFS configuration
  - Rsync usage and port configuration
  
- **`security/`** - Security and access control
  - SSH configuration and key management
  - ACL and user management
  - Cloudflare Zero Trust
  - VPN solutions (WireGuard, Tailscale)
  
- **`tools/`** - Tool-specific guides
  - Tmux, Vim usage
  - Guacamole server setup
  - Selenium automation
  - Change detection and monitoring tools
  - MCP (Model Context Protocol) usage

### 🔧 `/scripts` - Automation Scripts
Organized automation scripts:

- **`backup/`** - Backup and sync scripts
  - NAS synchronization
  - Directory backup utilities
  
- **`deployment/`** - Deployment automation
  - Node.js deployment
  - Load balancer synchronization
  
- **`maintenance/`** - System maintenance
  - Docker cleanup scripts
  
- **`utilities/`** - General utilities
  - Password encryption
  - Project summary generation
  - File renaming tools
  - Schedule management

### ⚙️ `/configs` - Configuration Files
Service configuration files:

- **`haproxy/`** - HAProxy load balancer configs
- **`nginx/`** - Nginx web server configs
- **`monitoring/`** - Loki, Prometheus, Grafana configs

## Quick Navigation

### Common Tasks
- **Setting up a new server**: See `docs/infrastructure/`
- **Database configuration**: See `docs/databases/`
- **Security setup**: See `docs/security/`
- **Development environment**: See `docs/development/`
- **Running backups**: See `scripts/backup/`

### Key Documentation
- Infrastructure setup: `docs/infrastructure/proxmox_cluster.md`
- Network configuration: `docs/infrastructure/linux_network_setting.md`
- Security best practices: `docs/security/user_ACL_management.md`
- Database setup: `docs/databases/database_install.md`

## Organization Principles

1. **Clear categorization** - Files grouped by purpose and domain
2. **No duplicates** - Single source of truth for each document
3. **Intuitive naming** - English names with clear, descriptive titles
4. **Logical hierarchy** - Related content grouped together
5. **Easy navigation** - README files in key directories

## Contributing

When adding new content:
- Place documentation in appropriate `/docs` subdirectory
- Put scripts in categorized `/scripts` subdirectory
- Store configs in `/configs` with service-specific folders
- Use clear, descriptive filenames
- Update relevant README files
