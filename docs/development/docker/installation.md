# Docker Installation Guide

> Complete Docker installation guide for various Linux distributions

---

## Prerequisites

- 64-bit Linux kernel (3.10+)
- sudo/root access
- Internet connection

---

## Ubuntu Installation

### 1. Update & Install Dependencies

```bash
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common
```

### 2. Add Docker GPG Key

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

### 3. Add Repository

```bash
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 4. Install Docker

```bash
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io
```

### 5. Start & Enable Service

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### 6. Add User to Docker Group

```bash
# Replace 'username' with your actual username
sudo usermod -aG docker username

# Apply group changes (or logout/login)
newgrp docker
```

---

## Debian Installation

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg

# Add GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

## Arch Linux Installation

```bash
sudo pacman -S docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

---

## Verification

```bash
# Check Docker version
docker --version

# Verify installation
docker run hello-world

# Check service status
sudo systemctl status docker
```

---

## Post-Installation

### Docker Compose (v2)

Docker Compose is now included as a Docker plugin:

```bash
docker compose version
```

### Configure Docker Daemon

Create `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

---

## Troubleshooting

### Permission Denied

```bash
# Ensure user is in docker group
groups $USER

# Re-login or use newgrp
newgrp docker
```

### Cannot Connect to Docker Daemon

```bash
# Start Docker service
sudo systemctl start docker

# Check Docker socket permissions
ls -la /var/run/docker.sock
```

---

## Related Documentation

- [Docker Commands](commands.md)
- [Docker Networking](networking.md)
- [Docker Volumes](volumes.md)
