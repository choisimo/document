# Configuration Files

Service configuration files organized by service type.

## 📁 Directory Structure

### `haproxy/` - HAProxy Load Balancer
HAProxy configuration files for load balancing and reverse proxy:
- **`haproxy.cfg`** - Main HAProxy configuration
- **`git_branch_name_and_haproxymd.md`** - Git branch routing documentation

### `nginx/` - Nginx Web Server
Nginx configuration files and documentation:
- **`git_separate.md`** - Git-based deployment separation

### `monitoring/` - Monitoring & Logging
Configuration for monitoring and logging services:
- **`Loki_config.yml`** - Loki log aggregation configuration
- **`Prometheus_Loki_Grafana.md`** - Complete monitoring stack setup

## Configuration Management

### Best Practices

1. **Version Control**: Keep configs in git
2. **Backup**: Backup before changes
3. **Testing**: Test in staging first
4. **Documentation**: Document custom settings
5. **Security**: Never commit secrets

### Common Tasks

**Deploy HAProxy config:**
```bash
# Backup current config
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup

# Copy new config
cp configs/haproxy/haproxy.cfg /etc/haproxy/

# Test config
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload if valid
systemctl reload haproxy
```

**Deploy Nginx config:**
```bash
# Test config
nginx -t

# Reload if valid
systemctl reload nginx
```

**Deploy monitoring config:**
```bash
# Loki
cp configs/monitoring/Loki_config.yml /etc/loki/
systemctl restart loki
```

### Configuration Files Location

**System locations:**
- HAProxy: `/etc/haproxy/haproxy.cfg`
- Nginx: `/etc/nginx/nginx.conf` and `/etc/nginx/sites-available/`
- Loki: `/etc/loki/loki-config.yml`
- Prometheus: `/etc/prometheus/prometheus.yml`
- Grafana: `/etc/grafana/grafana.ini`

### Security Considerations

- Review configs for sensitive data before committing
- Use environment variables for secrets
- Restrict file permissions (600 or 640)
- Use separate configs for dev/staging/prod
- Regular security audits

### Related Documentation

- HAProxy setup: `../docs/infrastructure/kafka_haproxy.md`
- Monitoring stack: `../docs/infrastructure/Prometheus_Loki_Grafana.md`
- Nginx configuration: `../docs/development/`
