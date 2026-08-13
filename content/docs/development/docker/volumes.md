# Docker Volumes

> Practical guide to persistent storage options for Docker containers

---

## Scope and Data-Safety Contract

- **Scope:** Pin Docker Engine/Desktop, host OS, filesystem, volume driver, container user, SELinux/AppArmor mode, and backup mechanism. Named volumes and bind mounts differ across platforms.
- **Assumptions:** Define data ownership, permissions, consistency during backup, capacity and inode limits, encryption, retention, and what happens when a container, volume, host, or driver is removed.
- **Facts and inference:** Persistence across a container replacement is narrower than durability. Performance, portability, and safety claims require filesystem and workload evidence.
- **Failure and completion:** Test permission errors, full disk, abrupt stop, concurrent writes, migration, accidental deletion, and restore on an independent target. Completion requires verified data and application consistency after that restore.

---

## Overview

Docker volumes normally outlive an individual container, but they do not survive explicit volume deletion, host loss, driver failure, or unverified backup corruption by themselves. Named volumes are often suitable for container-managed data; bind mounts remain appropriate when controlled host-path access is required.

```mermaid
flowchart LR
    subgraph Host
        A[Docker Volume]
        B[Bind Mount]
    end
    
    subgraph Container
        C[/app/data]
        D[/app/config]
    end
    
    A -->|volume| C
    B -->|bind| D
```

---

## Volume Types Comparison

| Type | Location | Management | Use Case |
|------|----------|------------|----------|
| **Named Volume** | `/var/lib/docker/volumes/` | Docker CLI | Production data |
| **Anonymous Volume** | `/var/lib/docker/volumes/` | Automatic | Temporary data |
| **Bind Mount** | Anywhere on host | Manual | Development, configs |
| **tmpfs** | Memory only | Automatic | Sensitive data |

---

## Named Volumes

### Create Volume

```bash
# Create a named volume
docker volume create my-data

# List all volumes
docker volume ls

# Inspect volume details
docker volume inspect my-data
```

### Use Volume in Container

```bash
# Mount volume to container
docker run -v my-data:/app/data \
  --name my-container \
  nginx:latest

# Using --mount (more explicit)
docker run --mount source=my-data,target=/app/data \
  --name my-container \
  nginx:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data
      
volumes:
  postgres-data:
    driver: local
```

---

## Bind Mounts

Mount host directory directly into container:

```bash
# Basic bind mount
docker run -v /host/path:/container/path \
  --name my-container \
  nginx:latest

# Read-only bind mount
docker run -v /host/path:/container/path:ro \
  --name my-container \
  nginx:latest
```

### Development Example

```bash
# Mount source code for development
docker run -v $(pwd)/src:/app/src \
  -v $(pwd)/config:/app/config:ro \
  --name dev-container \
  node:18
```

---

## Volume Management

### List Volumes

```bash
# List all volumes
docker volume ls

# Filter by name
docker volume ls --filter name=my-

# Show only dangling volumes
docker volume ls --filter dangling=true
```

### Remove Volumes

```bash
# Remove specific volume
docker volume rm my-data

# Remove container and its volume
docker rm -v my-container

# Remove all unused volumes
docker volume prune

# Remove all unused volumes (force)
docker volume prune -f
```

### Backup Volume

```bash
# Backup volume to tar file
docker run --rm \
  -v my-data:/source:ro \
  -v $(pwd):/backup \
  alpine tar cvf /backup/my-data-backup.tar /source

# Restore from backup
docker run --rm \
  -v my-data:/target \
  -v $(pwd):/backup \
  alpine tar xvf /backup/my-data-backup.tar -C /target --strip 1
```

---

## Volume vs Bind Mount

### When to Use Volumes

✅ Production environments
✅ Data that needs to persist
✅ Sharing data between containers
✅ Backup and migration requirements
✅ Cross-platform compatibility

### When to Use Bind Mounts

✅ Development (live code reload)
✅ Configuration files
✅ Specific host file access needed
✅ Build contexts

---

## Volume Drivers

### Local Driver Options

```bash
# Create volume with specific options
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \
  --opt device=:/path/to/share \
  nfs-volume
```

### External Storage

```yaml
# Docker Compose with external volume
volumes:
  external-data:
    external: true
    name: production-data
```

---

## Best Practices

1. **Use named volumes** for important data
2. **Set appropriate permissions** on bind mounts
3. **Backup volumes regularly** for critical data
4. **Clean up unused volumes** with `docker volume prune`
5. **Use read-only** mounts when possible (`:ro`)

---

## Troubleshooting

### Permission Issues

```bash
# Check volume permissions
docker run --rm -v my-data:/data alpine ls -la /data

# Fix permissions
docker run --rm -v my-data:/data alpine chown -R 1000:1000 /data
```

### Volume Not Found

```bash
# Ensure volume exists
docker volume ls | grep my-data

# Create if missing
docker volume create my-data
```

---

## Related Documentation

- [Docker Installation](installation.md)
- [Docker Commands](commands.md)
- [Docker Networking](networking.md)
