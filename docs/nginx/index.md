# Nginx Documentation

> Nginx web server configuration, optimization, and proxy management

---

## Topics

<div class="grid cards" markdown>

-   :material-cog:{ .lg .middle } **Configuration**

    ---

    Comprehensive Nginx configuration guide including virtual hosts, SSL, and optimization.

    [:octicons-arrow-right-24: View Guide](configuration.md)

-   :material-arrow-decision:{ .lg .middle } **Proxy Manager**

    ---

    Nginx Proxy Manager setup and usage for easy reverse proxy management.

    [:octicons-arrow-right-24: View Guide](proxy-manager.md)

</div>

---

## Nginx Architecture

```mermaid
flowchart LR
    subgraph Internet
        A[Clients]
    end
    
    subgraph Nginx
        B[Listener :80/:443]
        C{Router}
    end
    
    subgraph Backend
        D[Static Files]
        E[App Server 1]
        F[App Server 2]
        G[API Server]
    end
    
    A --> B
    B --> C
    C -->|/static| D
    C -->|/app| E
    C -->|/app| F
    C -->|/api| G
```

---

## Common Use Cases

| Use Case | Description | Config Section |
|----------|-------------|----------------|
| **Static Hosting** | Serve HTML, CSS, JS files | `root`, `index` |
| **Reverse Proxy** | Forward to backend servers | `proxy_pass` |
| **Load Balancing** | Distribute traffic | `upstream` |
| **SSL Termination** | Handle HTTPS | `ssl_certificate` |
| **Caching** | Cache static content | `proxy_cache` |

---

## Quick Reference

### Basic Server Block

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Load Balancer

```nginx
upstream backend {
    server 192.168.1.10:8080 weight=3;
    server 192.168.1.11:8080 weight=2;
    server 192.168.1.12:8080 backup;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

---

## Essential Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Related Documentation

- [Docker Networking](../development/docker/networking.md)
- [SSL/TLS Configuration](../security/ssh/configuration.md)
- [HAProxy Configuration](../../configs/haproxy/)
