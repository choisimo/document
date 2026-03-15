#!/bin/bash

# Stop script on error
set -e

# Variables
docker_compose_file="docker-compose.yml"
env_file=".env"
password_hash=""

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
    echo "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
    echo "Docker Compose is not installed. Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d '"' -f 4)/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Prompt for public address
read -p "Enter your public address (e.g., example.com or IP): " public_address

# Generate a hashed password for the .env file
read -sp "Enter a password for the WireGuard admin interface: " password
echo
password_hash=$(echo -n "$password" | sha256sum | cut -d ' ' -f 1)

# Create .env file
echo "Creating .env file..."
cat > $env_file <<EOF
PASSWORD=$password_hash
EOF

# Create Docker Compose file
echo "Creating Docker Compose file..."
cat > $docker_compose_file <<EOF
version: "3.3"
services:
  wg-easy:
    environment:
      - WG_HOST=$public_address
      - PASSWORD=\${PASSWORD}
      - WG_PORT=51820
      - WG_DEFAULT_ADDRESS=10.8.0.x
      - WG_DEFAULT_DNS=1.1.1.1
      - WG_MTU=1420
      - WG_ALLOWED_IPS=192.168.1.0/24, 10.8.0.0/24, 0.0.0.0/0
    image: weejewel/wg-easy
    container_name: wg-easy
    volumes:
      - /wg-easy/data:/etc/wireguard
    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
EOF

# Start Docker Compose
echo "Starting WireGuard VPN with Docker Compose..."
docker-compose up -d

# Output success message
echo "WireGuard VPN is now running!"
echo "Admin interface is accessible via your public address at port 51821."